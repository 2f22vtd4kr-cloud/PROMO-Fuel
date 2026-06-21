"""Standalone group-broadcast worker process.

Usage:
    python worker.py worker-1
    python worker.py worker-2 --db /path/to/campaigns.db
    python worker.py worker-3 --poll 3 --idle-sleep 8

Main loop
---------
  1. Force-release any account locks / claimed tasks left by a previous crash
     of this same worker_id (idempotent startup cleanup).
  2. Recover globally stale locks (from other crashed workers, if any).
  3. Wait for the heartbeat daemon to register in broadcast_workers.
  4. Enter the claim → execute → report cycle:
       a. Claim one pending task via TaskQueue.claim_task().  The claim atomically
          sets the sender account's auth_status to 'broadcasting' in the DB.
       b. Run it through groupbroadcaster.run_group_campaign_task().
       c. On FloodWaitError (if it escapes the broadcaster): write flood_wait_until
          to the DB and sleep the indicated time without failing the task.
       d. On success → complete_task + notify owner.
          On error    → fail_task  + notify owner.
  5. Repeat until SIGTERM / KeyboardInterrupt.

Self-restart
  On unhandled exception the worker sleeps (exponential back-off starting at 5s,
  capped at 120s) then re-runs main_loop().  After MAX_CRASHES consecutive crashes
  it writes status='dead' to broadcast_workers and exits with code 1.

SIGTERM handler
  Cancels the currently running asyncio Task so the event loop exits cleanly,
  then calls force_release_worker_sync() to release all locked accounts and
  re-queue all claimed tasks before the process terminates.
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

# ── CLI args parsed before any expensive module imports ───────────────────────
import logging.handlers as _log_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)

# ── Rotating file handler — prevents worker.log from exhausting disk space ────
os.makedirs("logs", exist_ok=True)
_worker_fh = _log_handlers.RotatingFileHandler(
    "logs/worker.log",
    maxBytes=5_000_000,   # 5 MB per file
    backupCount=3,        # keep worker.log, worker.log.1, .2, .3
    encoding="utf-8",
)
_worker_fh.setFormatter(
    logging.Formatter("%(asctime)s [%(name)s] %(levelname)s %(message)s")
)
logging.getLogger().addHandler(_worker_fh)

logger = logging.getLogger("worker")

_parser = argparse.ArgumentParser(description="PROMO-Fuel Group Broadcast Worker")
_parser.add_argument("worker_id",    nargs="?", default=None)
_parser.add_argument("--db",         default=None, help="Path to campaigns.db")
_parser.add_argument("--poll",       type=float, default=5.0,  help="Claim poll interval (s)")
_parser.add_argument("--idle-sleep", type=float, default=10.0, help="Idle sleep interval (s)")
_args, _ = _parser.parse_known_args()

WORKER_ID = _args.worker_id or os.getenv("WORKER_ID", f"worker-{os.getpid()}")
if _args.db:
    os.environ["DB_PATH"] = _args.db

# ── All downstream imports happen AFTER DB_PATH is set ───────────────────────
from dbmigrations   import run_migrations           # noqa: E402
from task_queue     import TaskQueue                # noqa: E402
from groupbroadcaster import run_group_campaign_task  # noqa: E402
from utils.supervisor import WorkerHeartbeat        # noqa: E402
from utils.alert_cooldown import CrashAlertCooldown  # noqa: E402
from campaign_db    import reset_daily_counts, account_flood_wait  # noqa: E402

# One cooldown instance per worker process.  15-minute window per worker_id.
# Initialised after DB_PATH is set (done above via _args / env before these imports).
_crash_cooldown = CrashAlertCooldown(default_window=900)

try:
    from telethon.errors import FloodWaitError as TelethonFloodWait
except ImportError:
    TelethonFloodWait = None  # type: ignore[assignment,misc]

# ── Configuration ─────────────────────────────────────────────────────────────
DB_PATH              = os.getenv("DB_PATH", "campaigns.db")
POLL_INTERVAL        = _args.poll
IDLE_SLEEP           = _args.idle_sleep
STUCK_RESET_INTERVAL = 300    # seconds between periodic stale-lock sweeps
MAX_CRASHES          = 5      # consecutive crash limit before marking dead
BOT_TOKEN            = os.getenv("TELEGRAM_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", ""))
OWNER_IDS            = [
    int(x) for x in
    os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",")
    if x.strip().lstrip("-").isdigit()
]

# ── Global mutable state (guarded by asyncio event loop in all async paths) ───
_running:     bool                    = True
_main_task:   asyncio.Task | None     = None
_heartbeat:   WorkerHeartbeat | None  = None
_task_queue:  TaskQueue | None        = None


# ─────────────────────────────────────────────────────────────────────────────
# SIGTERM / SIGINT handler
# ─────────────────────────────────────────────────────────────────────────────

def _handle_signal(sig, frame) -> None:  # noqa: ANN001
    """Signal handler: cancel the main asyncio task for a clean shutdown.

    Cancelling the Task causes main_loop()'s while-loop to break via
    asyncio.CancelledError, which triggers the finally block that releases
    all DB locks before the event loop stops.  We also call
    _release_resources_sync() here as a belt-and-suspenders measure in case
    the loop is already stopped (e.g., we receive SIGTERM during startup).
    """
    global _running
    logger.info("[%s] Signal %s — shutting down cleanly", WORKER_ID, signal.Signals(sig).name)
    _running = False

    # Cancel the asyncio task if the loop is running
    if _main_task is not None and not _main_task.done():
        try:
            loop = _main_task.get_loop()
            loop.call_soon_threadsafe(_main_task.cancel)
        except Exception:
            pass

    # Belt-and-suspenders: also release resources synchronously right now
    # in case the event loop never gets to run the CancelledError path.
    _release_resources_sync()


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers (synchronous, used in signal handler + startup/shutdown)
# ─────────────────────────────────────────────────────────────────────────────

def _db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def _update_heartbeat_table(
    status:          str = "idle",
    tasks_completed: int = 0,
    tasks_failed:    int = 0,
) -> None:
    """Write a row to worker_heartbeats (the lightweight API-queryable table)."""
    try:
        conn = _db_conn()
        now  = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT INTO worker_heartbeats
                (worker_id, last_seen, status, tasks_completed, tasks_failed)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(worker_id) DO UPDATE SET
                last_seen       = excluded.last_seen,
                status          = excluded.status,
                tasks_completed = excluded.tasks_completed,
                tasks_failed    = excluded.tasks_failed
        """, (WORKER_ID, now, status, tasks_completed, tasks_failed))
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.debug("[%s] Heartbeat table write failed: %s", WORKER_ID, exc)


def _mark_self_dead() -> None:
    """Write status='dead' to both heartbeat tables so the supervisor sees it."""
    _update_heartbeat_table(status="dead")
    try:
        conn = _db_conn()
        conn.execute(
            "UPDATE broadcast_workers SET status='dead' WHERE worker_id=?", (WORKER_ID,)
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    logger.critical("[%s] Marked dead after %d consecutive crashes", WORKER_ID, MAX_CRASHES)


def _release_resources_sync() -> dict[str, int]:
    """Synchronously release all account locks + re-queue claimed tasks.

    Uses the TaskQueue FileLock path for correctness.  Falls back to a raw
    SQL statement if TaskQueue cannot be imported (e.g., during very early
    startup before migrations have run).

    Safe to call multiple times — both UPDATEs are idempotent via their
    WHERE locked_by = WORKER_ID clause.
    """
    try:
        tq     = TaskQueue(db_path=DB_PATH)
        result = tq.force_release_worker_sync(WORKER_ID)
        return result
    except Exception as exc:
        logger.warning("[%s] TaskQueue release failed, falling back to raw SQL: %s", WORKER_ID, exc)

    # Raw-SQL fallback (no FileLock — last-resort only)
    try:
        conn = _db_conn()
        acct = conn.execute(
            "UPDATE sender_accounts "
            "SET locked_by=NULL, locked_at=NULL, broadcasting=0, auth_status='idle', "
            "status=CASE WHEN status IN ('banned','proxy_failed') THEN status ELSE 'idle' END "
            "WHERE locked_by=?",
            (WORKER_ID,),
        ).rowcount
        tasks = conn.execute(
            "UPDATE tasks SET status='pending', worker_id=NULL, claimed_at=NULL, "
            "attempts=MAX(0,attempts-1) WHERE worker_id=? AND status='claimed'",
            (WORKER_ID,),
        ).rowcount
        conn.commit()
        conn.close()
        if acct or tasks:
            logger.info("[%s] Raw-SQL release: accounts=%d  tasks=%d", WORKER_ID, acct, tasks)
        return {"accounts": acct, "tasks": tasks}
    except Exception as exc2:
        logger.error("[%s] Raw-SQL release also failed: %s", WORKER_ID, exc2)
        return {"accounts": 0, "tasks": 0}


# ─────────────────────────────────────────────────────────────────────────────
# Owner notification (fire-and-forget)
# ─────────────────────────────────────────────────────────────────────────────

async def _notify_owner(text: str) -> None:
    if not BOT_TOKEN or not OWNER_IDS:
        return
    try:
        import aiohttp  # noqa: PLC0415
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


# ─────────────────────────────────────────────────────────────────────────────
# FloodWait handler (worker-level, for escaping FloodWaitErrors)
# ─────────────────────────────────────────────────────────────────────────────

async def _handle_flood_wait(
    exc:         Exception,
    task_id:     int,
    campaign_id: int,
    account_id:  int | None,
) -> None:
    """Handle a FloodWaitError that escaped from the broadcaster.

    When Telethon raises FloodWaitError, we:
      1. Write flood_wait_until to the sender account so the claim guard
         in TaskQueue skips this account until it is ready again.
      2. Re-queue the task (fail_task with attempts-1 so it gets retried).
      3. Sleep the indicated wait time before returning to the claim loop.

    This path is only reached if the broadcaster itself did not catch
    the exception — it is a safety net, not the primary handler.
    """
    wait_secs = getattr(exc, "seconds", 60)
    logger.warning(
        "[%s] ⏳ FloodWaitError(%ds) escaped broadcaster — "
        "writing flood_wait_until and re-queuing task #%d",
        WORKER_ID, wait_secs, task_id,
    )
    if account_id is not None:
        try:
            await account_flood_wait(account_id, wait_secs)
        except Exception as db_err:
            logger.debug("[%s] flood_wait DB write failed: %s", WORKER_ID, db_err)

    if _task_queue is not None:
        await _task_queue.fail_task(task_id, f"FloodWait {wait_secs}s", campaign_id)

    sleep_for = wait_secs + 10
    logger.info("[%s] Sleeping %ds for FloodWait", WORKER_ID, sleep_for)
    await asyncio.sleep(sleep_for)


# ─────────────────────────────────────────────────────────────────────────────
# Main async loop
# ─────────────────────────────────────────────────────────────────────────────

async def main_loop(
    tasks_completed: int = 0,
    tasks_failed:    int = 0,
) -> tuple[int, int]:
    """One execution of the worker event loop.

    Returns (tasks_completed, tasks_failed) so counters accumulate across
    self-restarts triggered by the outer synchronous wrapper.
    """
    global _heartbeat, _task_queue

    logger.info("[%s] Starting (pid=%d  db=%s)", WORKER_ID, os.getpid(), DB_PATH)

    # ── Migrations (idempotent) ────────────────────────────────────────────────
    run_migrations(DB_PATH)

    # ── Initialise queue and heartbeat ─────────────────────────────────────────
    _task_queue = TaskQueue(db_path=DB_PATH)
    _heartbeat  = WorkerHeartbeat(WORKER_ID, db_path=DB_PATH)
    _heartbeat.start()

    # ── Startup cleanup: release any residue from our previous crash ───────────
    cleanup = _task_queue.force_release_worker_sync(WORKER_ID)
    if cleanup["accounts"] or cleanup["tasks"]:
        logger.info(
            "[%s] Startup cleanup: accounts=%d  tasks=%d",
            WORKER_ID, cleanup["accounts"], cleanup["tasks"],
        )

    # ── Recover stale locks from other crashed workers ─────────────────────────
    recovered = _task_queue.recover_stale_locks_sync(timeout_seconds=120)
    if recovered:
        logger.info("[%s] Recovered %d stale account lock(s) from other workers", WORKER_ID, recovered)

    # ── State tracking ─────────────────────────────────────────────────────────
    last_stuck_reset  = time.monotonic()
    last_reset_date   = datetime.now().date()
    consecutive_idle  = 0

    logger.info("[%s] Ready — polling every %.1fs", WORKER_ID, POLL_INTERVAL)
    _update_heartbeat_table("idle", tasks_completed, tasks_failed)

    try:
        while _running:
            # ── Daily counter reset ────────────────────────────────────────────
            today = datetime.now().date()
            if today != last_reset_date:
                try:
                    await reset_daily_counts()
                    logger.info("[%s] Daily sent_today counters reset", WORKER_ID)
                except Exception as exc:
                    logger.warning("[%s] Daily reset failed: %s", WORKER_ID, exc)
                last_reset_date = today

            # ── Periodic stale-lock sweep ──────────────────────────────────────
            if time.monotonic() - last_stuck_reset > STUCK_RESET_INTERVAL:
                _task_queue.recover_stale_locks_sync(STUCK_RESET_INTERVAL)
                last_stuck_reset = time.monotonic()

            # ── Claim next task ────────────────────────────────────────────────
            task = await _task_queue.claim_task(WORKER_ID)

            if task is None:
                consecutive_idle += 1
                if consecutive_idle == 1 or consecutive_idle % 12 == 0:
                    logger.debug("[%s] No tasks available (idle=%d)", WORKER_ID, consecutive_idle)
                _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                await asyncio.sleep(IDLE_SLEEP if consecutive_idle > 2 else POLL_INTERVAL)
                continue

            consecutive_idle = 0
            task_id          = task["id"]
            campaign_id      = task["campaign_id"]
            account_id: int | None = None

            # Try to resolve account_id for FloodWait handling
            try:
                payload    = task.get("payload") or {}
                account_id = int(
                    payload.get("sender_account_id")
                    or payload.get("account_id")
                    or 0
                ) or None
            except Exception:
                pass

            logger.info("[%s] ▶ Task #%d — campaign=%d", WORKER_ID, task_id, campaign_id)
            _heartbeat.set_status("working", task_id=task_id)
            _update_heartbeat_table("working", tasks_completed, tasks_failed)

            # ── Execute task ───────────────────────────────────────────────────
            try:
                result   = await run_group_campaign_task(task, worker_id=WORKER_ID)
                sent_n    = result.get("sent",    0)
                failed_n  = result.get("failed",  0)
                resumed_n = result.get("resumed", 0)   # groups skipped via resume cursor

                if result.get("ok") or sent_n > 0 or resumed_n > 0:
                    await _task_queue.complete_task(task_id, campaign_id)
                    tasks_completed += 1
                    _heartbeat.record_done()
                    _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                    logger.info(
                        "[%s] ✓ Task #%d done — sent=%d  failed=%d  resumed=%d",
                        WORKER_ID, task_id, sent_n, failed_n, resumed_n,
                    )
                    resume_note = (
                        f"\n↩️ Пропущено (уже отправлено): {resumed_n}"
                        if resumed_n else ""
                    )
                    camp_name = result.get("campaign_name") or f"#{campaign_id}"
                    asyncio.create_task(_notify_owner(
                        f"✅ *Рассылка завершена*\n"
                        f"«{camp_name}» · Задача #{task_id}\n"
                        f"📨 Отправлено: {sent_n}  ❌ Ошибок: {failed_n}"
                        + resume_note
                    ))
                    # Successful task completion — clear the crash-alert cooldown
                    # so the next crash (if any) always fires an immediate alert.
                    _crash_cooldown.reset("task_crash", WORKER_ID)
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
                # SIGTERM path — release task cleanly and propagate cancellation
                logger.info("[%s] Task #%d cancelled via SIGTERM", WORKER_ID, task_id)
                await _task_queue.fail_task(task_id, "Worker cancelled (SIGTERM)", campaign_id)
                raise

            except Exception as exc:
                # ── FloodWaitError: handle gracefully without a crash ──────────
                if TelethonFloodWait is not None and isinstance(exc, TelethonFloodWait):
                    await _handle_flood_wait(exc, task_id, campaign_id, account_id)
                    _heartbeat.set_status("idle")
                    _update_heartbeat_table("idle", tasks_completed, tasks_failed)
                    continue

                # ── All other unhandled errors ─────────────────────────────────
                err_str = str(exc)[:400]
                logger.error(
                    "[%s] ✗ Task #%d unhandled error: %s",
                    WORKER_ID, task_id, err_str, exc_info=True,
                )
                await _task_queue.fail_task(task_id, err_str, campaign_id)
                tasks_failed += 1
                _heartbeat.record_failed(err_str)
                _update_heartbeat_table("idle", tasks_completed, tasks_failed)

                # ── Explicitly unlock the account so it is never permanently stuck ──
                # fail_task re-queues the task but does NOT reset the account row.
                # A crash mid-broadcast would leave auth_status='broadcasting' and
                # locked_by set, preventing any future worker from claiming this account.
                if account_id is not None:
                    try:
                        conn = _db_conn()
                        conn.execute(
                            "UPDATE sender_accounts "
                            "SET locked_by=NULL, locked_at=NULL, broadcasting=0, "
                            "auth_status='idle', "
                            "status=CASE WHEN status IN ('banned','proxy_failed') "
                            "           THEN status ELSE 'idle' END "
                            "WHERE id=? AND locked_by=?",
                            (account_id, WORKER_ID),
                        )
                        conn.commit()
                        conn.close()
                        logger.info(
                            "[%s] Account #%d forcibly unlocked after unhandled crash",
                            WORKER_ID, account_id,
                        )
                    except Exception as unlock_err:
                        logger.warning(
                            "[%s] Failed to unlock account #%d after crash: %s",
                            WORKER_ID, account_id, unlock_err,
                        )

                # Rate-limited crash alert: at most one message per 15 minutes
                # per worker.  Suppressed errors are counted and included as a
                # note in the next alert that fires when the window expires.
                _crash_raw = (
                    f"💥 *Критическая ошибка воркера*\n"
                    f"Воркер: `{WORKER_ID}`\n"
                    f"Задача #{task_id} · Кампания #{campaign_id}\n"
                    f"`{err_str}`"
                )
                _crash_decision = _crash_cooldown.check(
                    "task_crash", WORKER_ID, _crash_raw
                )
                if _crash_decision.should_fire:
                    asyncio.create_task(_notify_owner(_crash_decision.message))

            await asyncio.sleep(POLL_INTERVAL)

    except asyncio.CancelledError:
        logger.info("[%s] Main loop cancelled — cleaning up", WORKER_ID)

    finally:
        # ── Graceful shutdown: stop heartbeat and release all locks ───────────
        if _heartbeat:
            _heartbeat.stop()
        _update_heartbeat_table("stopped", tasks_completed, tasks_failed)
        released = _release_resources_sync()
        logger.info(
            "[%s] Stopped — completed=%d  failed=%d  released=%s",
            WORKER_ID, tasks_completed, tasks_failed, released,
        )

    return tasks_completed, tasks_failed


# ─────────────────────────────────────────────────────────────────────────────
# Entry point with self-restart and exponential back-off
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    global _main_task

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT,  _handle_signal)

    crash_count     = 0
    backoff         = 5.0
    tasks_completed = 0
    tasks_failed    = 0

    while crash_count < MAX_CRASHES:
        if not _running:
            break

        try:
            # Create a fresh event loop for each restart cycle
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            async def _guarded_run() -> tuple[int, int]:
                global _main_task
                _main_task = asyncio.current_task()
                return await main_loop(tasks_completed, tasks_failed)

            completed, failed = loop.run_until_complete(_guarded_run())
            loop.close()

            tasks_completed = completed
            tasks_failed    = failed

            # Clean exit (SIGTERM set _running = False) → do not restart
            break

        except KeyboardInterrupt:
            logger.info("[%s] KeyboardInterrupt — exiting cleanly", WORKER_ID)
            break

        except Exception as exc:
            crash_count += 1
            logger.critical(
                "[%s] Crash #%d/%d: %s",
                WORKER_ID, crash_count, MAX_CRASHES, exc, exc_info=True,
            )
            if crash_count < MAX_CRASHES:
                sleep_for = min(backoff * (2 ** (crash_count - 1)), 120.0)
                logger.info("[%s] Restarting in %.0fs...", WORKER_ID, sleep_for)
                time.sleep(sleep_for)
            else:
                _mark_self_dead()
                _release_resources_sync()
                sys.exit(1)

    # Final release on any clean exit path
    _release_resources_sync()


if __name__ == "__main__":
    main()
