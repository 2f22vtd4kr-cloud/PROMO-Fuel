"""Standalone broadcast worker process.

Usage:
    python worker.py worker-1          # uses DB_PATH env or campaigns.db
    python worker.py worker-2 --db /path/to/campaigns.db
    python worker.py worker-3 --poll 3 --idle-sleep 8

Main loop:
  1. Force-release any account locks / claimed tasks left by a previous crash
  2. Reset stuck tasks / recover stale locks on startup
  3. Claim next pending task from the task queue
  4. Execute via groupbroadcaster.run_group_campaign_task()
  5. Report done / failed + update heartbeat
  6. Repeat — self-restart up to MAX_CRASHES times on unhandled exceptions

Self-restart:  On crash, the worker sleeps (exponential back-off) then re-runs
               main_loop(). After MAX_CRASHES consecutive crashes it marks itself
               dead in worker_heartbeats and exits.

SIGTERM:       Force-releases all locked accounts + claimed tasks held by this
               worker before exiting (ensures no orphaned locks on graceful stop).
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import signal
import sqlite3
import sys
import time
from datetime import datetime, timezone

# ── Parse args early so DB_PATH is set before module-level imports ────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("worker")

parser = argparse.ArgumentParser(description="PROMO-Fuel Group Broadcast Worker")
parser.add_argument("worker_id",    nargs="?", default=None)
parser.add_argument("--db",         default=None, help="SQLite DB path")
parser.add_argument("--poll",       type=float, default=5.0)
parser.add_argument("--idle-sleep", type=float, default=10.0)
args, _ = parser.parse_known_args()

WORKER_ID = args.worker_id or os.getenv("WORKER_ID", f"worker-{os.getpid()}")
if args.db:
    os.environ["DB_PATH"] = args.db

from dbmigrations import run_migrations
from task_queue   import TaskQueue
from groupbroadcaster import run_group_campaign_task
from utils.supervisor import WorkerHeartbeat
from campaign_db  import reset_daily_counts

DB_PATH              = os.getenv("DB_PATH", "campaigns.db")
POLL_INTERVAL        = args.poll
IDLE_SLEEP           = args.idle_sleep
STUCK_RESET_INTERVAL = 300       # seconds between periodic stuck-task sweeps
MAX_CRASHES          = 5         # self-restart limit before marking dead
BOT_TOKEN            = os.getenv("TELEGRAM_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", ""))
OWNER_IDS            = [
    int(x) for x in
    os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",")
    if x.strip().lstrip("-").isdigit()
]

# ── Global state ──────────────────────────────────────────────────────────────
_running    = True
_should_die = False
_heartbeat: WorkerHeartbeat | None = None
_task_queue: TaskQueue | None      = None


# ── Signal handling ───────────────────────────────────────────────────────────

def _handle_signal(sig, frame):
    global _running
    logger.info("[%s] Signal %s received — shutting down...", WORKER_ID, sig)
    _running = False


# ── Notification helper ───────────────────────────────────────────────────────

async def _notify_owner(text: str) -> None:
    if not BOT_TOKEN or not OWNER_IDS:
        return
    try:
        import aiohttp
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        async with aiohttp.ClientSession() as session:
            for uid in OWNER_IDS:
                try:
                    await session.post(
                        url,
                        json={"chat_id": uid, "text": text, "parse_mode": "Markdown"},
                        timeout=aiohttp.ClientTimeout(total=10),
                    )
                except Exception:
                    pass
    except Exception:
        pass


# ── Release all locked accounts + claimed tasks on shutdown ──────────────────

def _release_worker_resources() -> dict[str, int]:
    """On SIGTERM or crash: release all accounts + re-queue claimed tasks."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        # Release account locks
        acct_cur = conn.execute(
            "UPDATE sender_accounts SET locked_by=NULL, locked_at=NULL, "
            "broadcasting=0, status='idle' WHERE locked_by=?",
            (WORKER_ID,),
        )
        # Re-queue claimed tasks (roll back attempt counter so they get retried)
        task_cur = conn.execute("""
            UPDATE tasks
            SET status='pending', worker_id=NULL, claimed_at=NULL,
                attempts=MAX(0, attempts-1)
            WHERE worker_id=? AND status='claimed'
        """, (WORKER_ID,))
        conn.commit()
        accounts = acct_cur.rowcount
        tasks    = task_cur.rowcount
        conn.close()
        if accounts or tasks:
            logger.info(
                "[%s] Released %d account lock(s), reset %d task(s) on exit",
                WORKER_ID, accounts, tasks,
            )
        return {"accounts": accounts, "tasks": tasks}
    except Exception as e:
        logger.warning("[%s] Could not release resources on exit: %s", WORKER_ID, e)
        return {"accounts": 0, "tasks": 0}


# ── Write heartbeat to worker_heartbeats table ────────────────────────────────

def _update_heartbeat_table(
    status: str = "idle",
    tasks_completed: int = 0,
    tasks_failed: int = 0,
) -> None:
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        now  = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT INTO worker_heartbeats (worker_id, last_seen, status, tasks_completed, tasks_failed)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(worker_id) DO UPDATE SET
                last_seen       = excluded.last_seen,
                status          = excluded.status,
                tasks_completed = excluded.tasks_completed,
                tasks_failed    = excluded.tasks_failed
        """, (WORKER_ID, now, status, tasks_completed, tasks_failed))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.debug("[%s] Heartbeat table write failed: %s", WORKER_ID, e)


def _mark_self_dead() -> None:
    _update_heartbeat_table(status="dead")
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute(
            "UPDATE broadcast_workers SET status='dead' WHERE worker_id=?",
            (WORKER_ID,),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    logger.critical("[%s] Marked dead after %d crashes", WORKER_ID, MAX_CRASHES)


# ── Main async loop ───────────────────────────────────────────────────────────

async def main_loop(
    tasks_completed: int = 0,
    tasks_failed: int = 0,
) -> tuple[int, int]:
    """One run of the worker loop.

    Returns (tasks_completed, tasks_failed) so they accumulate across restarts.
    """
    global _heartbeat, _task_queue

    logger.info("[%s] Starting (pid=%d, db=%s)", WORKER_ID, os.getpid(), DB_PATH)
    run_migrations(DB_PATH)

    _task_queue = TaskQueue(db_path=DB_PATH)
    _heartbeat  = WorkerHeartbeat(WORKER_ID, db_path=DB_PATH)
    _heartbeat.start()

    # ── Startup cleanup: force-release any residue from our previous crash ────
    cleanup = _task_queue.force_release_worker_sync(WORKER_ID)
    if cleanup["accounts"] or cleanup["tasks"]:
        logger.info(
            "[%s] Startup cleanup: released %d account(s), re-queued %d task(s)",
            WORKER_ID, cleanup["accounts"], cleanup["tasks"],
        )

    # ── Also recover any globally stale locks (from other crashed workers) ────
    recovered = _task_queue.recover_stale_locks_sync(timeout_seconds=120)
    if recovered:
        logger.info("[%s] Recovered %d stale account lock(s)", WORKER_ID, recovered)

    last_stuck_reset = time.monotonic()
    last_reset_date  = datetime.now().date()
    consecutive_idle = 0

    logger.info("[%s] Ready — polling every %.1fs", WORKER_ID, POLL_INTERVAL)
    _update_heartbeat_table("idle", tasks_completed, tasks_failed)

    while _running:
        try:
            # Daily counter reset
            today = datetime.now().date()
            if today != last_reset_date:
                try:
                    await reset_daily_counts()
                    logger.info("[%s] Daily sent_today counters reset", WORKER_ID)
                except Exception as e:
                    logger.warning("[%s] Daily reset failed: %s", WORKER_ID, e)
                last_reset_date = today

            # Periodic stuck-task sweep
            if time.monotonic() - last_stuck_reset > STUCK_RESET_INTERVAL:
                _task_queue.recover_stale_locks_sync(300)
                last_stuck_reset = time.monotonic()

            # Claim a task
            task = await _task_queue.claim_task(WORKER_ID)

            if task is None:
                consecutive_idle += 1
                if consecutive_idle % 12 == 0:
                    logger.debug("[%s] No tasks available", WORKER_ID)
                _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                await asyncio.sleep(IDLE_SLEEP if consecutive_idle > 2 else POLL_INTERVAL)
                continue

            consecutive_idle = 0
            task_id     = task["id"]
            campaign_id = task["campaign_id"]
            logger.info("[%s] ▶ Task #%d — campaign %d", WORKER_ID, task_id, campaign_id)

            _heartbeat.set_status("working", task_id=task_id)
            _update_heartbeat_table("working", tasks_completed, tasks_failed)

            try:
                result   = await run_group_campaign_task(task, worker_id=WORKER_ID)
                sent_n   = result.get("sent", 0)
                failed_n = result.get("failed", 0)

                if result.get("ok") or sent_n > 0:
                    await _task_queue.complete_task(task_id, campaign_id)
                    tasks_completed += 1
                    _heartbeat.record_done()
                    _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                    logger.info(
                        "[%s] ✓ Task #%d done — sent=%d failed=%d",
                        WORKER_ID, task_id, sent_n, failed_n,
                    )
                    asyncio.create_task(_notify_owner(
                        f"✅ *Рассылка завершена*\n"
                        f"Кампания #{campaign_id} · Задача #{task_id}\n"
                        f"📨 Отправлено: {sent_n}  ❌ Ошибок: {failed_n}"
                    ))
                else:
                    errors = "; ".join(result.get("errors", []))[:300]
                    await _task_queue.fail_task(task_id, error=errors, campaign_id=campaign_id)
                    tasks_failed += 1
                    _heartbeat.record_failed(errors)
                    _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                    logger.warning("[%s] ✗ Task #%d failed: %s", WORKER_ID, task_id, errors)
                    asyncio.create_task(_notify_owner(
                        f"❌ *Рассылка не выполнена*\n"
                        f"Кампания #{campaign_id} · Задача #{task_id}\n"
                        f"Ошибка: {errors[:200]}"
                    ))

            except asyncio.CancelledError:
                await _task_queue.fail_task(task_id, "Worker cancelled", campaign_id)
                raise
            except Exception as exc:
                err_str = str(exc)[:300]
                logger.error(
                    "[%s] ✗ Task #%d unhandled error: %s",
                    WORKER_ID, task_id, err_str, exc_info=True,
                )
                await _task_queue.fail_task(task_id, err_str, campaign_id)
                tasks_failed += 1
                _heartbeat.record_failed(err_str)
                _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                asyncio.create_task(_notify_owner(
                    f"💥 *Критическая ошибка воркера*\n"
                    f"Воркер: `{WORKER_ID}`\n"
                    f"Задача #{task_id} · Кампания #{campaign_id}\n"
                    f"`{err_str}`"
                ))

            await asyncio.sleep(POLL_INTERVAL)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("[%s] Outer loop error: %s", WORKER_ID, e, exc_info=True)
            await asyncio.sleep(POLL_INTERVAL * 2)

    # Graceful shutdown
    if _heartbeat:
        _heartbeat.stop()
    _update_heartbeat_table("stopped", tasks_completed, tasks_failed)
    logger.info("[%s] Stopped (completed=%d failed=%d)", WORKER_ID, tasks_completed, tasks_failed)
    return tasks_completed, tasks_failed


# ── Entry point with self-restart ─────────────────────────────────────────────

def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT,  _handle_signal)

    crash_count     = 0
    backoff         = 5.0
    tasks_completed = 0
    tasks_failed    = 0

    while crash_count < MAX_CRASHES:
        try:
            completed, failed = asyncio.run(main_loop(tasks_completed, tasks_failed))
            tasks_completed   = completed
            tasks_failed      = failed
            # Clean exit (SIGTERM / _running = False) → don't restart
            break

        except KeyboardInterrupt:
            logger.info("[%s] KeyboardInterrupt — exiting cleanly", WORKER_ID)
            break

        except Exception as e:
            crash_count += 1
            logger.critical(
                "[%s] Crash #%d/%d: %s",
                WORKER_ID, crash_count, MAX_CRASHES, e, exc_info=True,
            )
            if crash_count < MAX_CRASHES:
                sleep_for = min(backoff * (2 ** (crash_count - 1)), 120)
                logger.info("[%s] Restarting in %.0fs...", WORKER_ID, sleep_for)
                time.sleep(sleep_for)
            else:
                _mark_self_dead()
                # Release resources one final time before hard exit
                _release_worker_resources()
                sys.exit(1)

    # Always release account locks + re-queue tasks on any exit path
    _release_worker_resources()


if __name__ == "__main__":
    main()
