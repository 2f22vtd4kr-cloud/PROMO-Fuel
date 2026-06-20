"""Standalone broadcast worker process.

Usage:
    python worker.py worker-1          # uses DB_PATH env var or campaigns.db
    python worker.py worker-2 --db /path/to/campaigns.db

The worker runs an infinite loop:
  1. Reset any stuck tasks from previous crashes
  2. Claim the next pending task from the task queue
  3. Execute it via groupbroadcaster.run_group_campaign_task()
  4. Report done / failed
  5. Send heartbeat every HEARTBEAT_INTERVAL seconds
  6. Sleep briefly and repeat

Multiple workers can run in parallel — FileLock ensures no race conditions.
"""
import argparse
import asyncio
import logging
import os
import signal
import sys
from datetime import datetime

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("worker")

# ── Parse args early so DB_PATH is set before imports ────────────────────────
parser = argparse.ArgumentParser(description="PROMO-Fuel Group Broadcast Worker")
parser.add_argument("worker_id", nargs="?", default=None, help="Unique worker identifier (e.g. worker-1)")
parser.add_argument("--db", default=None, help="Path to SQLite database")
parser.add_argument("--poll", type=float, default=5.0, help="Poll interval in seconds (default: 5)")
parser.add_argument("--idle-sleep", type=float, default=10.0, help="Sleep when no tasks are available")
args, _ = parser.parse_known_args()

WORKER_ID = args.worker_id or os.getenv("WORKER_ID", f"worker-{os.getpid()}")
if args.db:
    os.environ["DB_PATH"] = args.db

from dbmigrations import run_migrations
from task_queue import TaskQueue
from groupbroadcaster import run_group_campaign_task
from utils.supervisor import WorkerHeartbeat
from campaign_db import reset_daily_counts

DB_PATH      = os.getenv("DB_PATH", "campaigns.db")
POLL_INTERVAL = args.poll
IDLE_SLEEP    = args.idle_sleep
STUCK_RESET_INTERVAL = 300   # reset stuck tasks every 5 minutes

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OWNER_IDS  = [int(x) for x in os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",") if x.strip().lstrip("-").isdigit()]


async def _notify_owner(text: str) -> None:
    """Send a notification to all owners via Telegram Bot API (fire-and-forget)."""
    if not BOT_TOKEN or not OWNER_IDS:
        return
    try:
        import aiohttp
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        async with aiohttp.ClientSession() as session:
            for uid in OWNER_IDS:
                try:
                    await session.post(url, json={"chat_id": uid, "text": text, "parse_mode": "Markdown"}, timeout=aiohttp.ClientTimeout(total=10))
                except Exception:
                    pass
    except Exception:
        pass

# ── Globals ───────────────────────────────────────────────────────────────────
_running = True
_heartbeat: WorkerHeartbeat | None = None
_task_queue: TaskQueue | None = None


def _handle_signal(sig, frame):
    global _running
    logger.info(f"[{WORKER_ID}] Signal {sig} received — shutting down gracefully...")
    _running = False


# ── Main async loop ───────────────────────────────────────────────────────────

async def main_loop() -> None:
    global _heartbeat, _task_queue

    logger.info(f"[{WORKER_ID}] Starting (pid={os.getpid()}, db={DB_PATH})")

    # Run migrations to ensure schema is up-to-date
    run_migrations(DB_PATH)

    _task_queue = TaskQueue(db_path=DB_PATH)
    _heartbeat  = WorkerHeartbeat(WORKER_ID, db_path=DB_PATH)
    _heartbeat.start()

    # Reset any tasks that were left 'claimed' (e.g. from a previous crash)
    reset_count = await _task_queue.reset_stuck(older_than_seconds=120)
    if reset_count:
        logger.info(f"[{WORKER_ID}] Reset {reset_count} stuck task(s) on startup")

    last_stuck_reset = datetime.now().timestamp()
    consecutive_idle = 0
    last_reset_date  = datetime.now().date()

    logger.info(f"[{WORKER_ID}] Ready — polling every {POLL_INTERVAL}s")

    while _running:
        try:
            today = datetime.now().date()
            if today != last_reset_date:
                try:
                    await reset_daily_counts()
                    logger.info(f"[{WORKER_ID}] Daily sent_today counters reset for {today}")
                except Exception as exc:
                    logger.warning(f"[{WORKER_ID}] Daily reset failed: {exc}")
                last_reset_date = today

            # Periodically reset stuck tasks from other workers that died
            now_ts = datetime.now().timestamp()
            if now_ts - last_stuck_reset > STUCK_RESET_INTERVAL:
                await _task_queue.reset_stuck(older_than_seconds=300)
                last_stuck_reset = now_ts

            # Claim a task
            task = await _task_queue.claim_task(WORKER_ID)

            if task is None:
                consecutive_idle += 1
                if consecutive_idle % 12 == 0:  # log every ~2min of idle
                    logger.debug(f"[{WORKER_ID}] No tasks available, sleeping...")
                await asyncio.sleep(IDLE_SLEEP if consecutive_idle > 2 else POLL_INTERVAL)
                continue

            consecutive_idle = 0
            task_id     = task["id"]
            campaign_id = task["campaign_id"]
            logger.info(f"[{WORKER_ID}] ▶ Task #{task_id} — campaign {campaign_id}")

            _heartbeat.set_status("working", task_id=task_id)

            try:
                result = await run_group_campaign_task(task, worker_id=WORKER_ID)

                sent_n   = result.get("sent", 0)
                failed_n = result.get("failed", 0)

                if result.get("ok") or sent_n > 0:
                    await _task_queue.complete_task(task_id, campaign_id)
                    _heartbeat.record_done()
                    logger.info(
                        f"[{WORKER_ID}] ✓ Task #{task_id} done — "
                        f"sent={sent_n} failed={failed_n}"
                    )
                    asyncio.create_task(_notify_owner(
                        f"✅ *Рассылка завершена*\n"
                        f"Кампания #{campaign_id} · Задача #{task_id}\n"
                        f"📨 Отправлено: {sent_n}  ❌ Ошибок: {failed_n}"
                    ))
                else:
                    errors = "; ".join(result.get("errors", []))[:300]
                    await _task_queue.fail_task(task_id, error=errors, campaign_id=campaign_id)
                    _heartbeat.record_failed(errors)
                    logger.warning(f"[{WORKER_ID}] ✗ Task #{task_id} failed: {errors}")
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
                logger.error(f"[{WORKER_ID}] ✗ Task #{task_id} unhandled error: {err_str}", exc_info=True)
                await _task_queue.fail_task(task_id, err_str, campaign_id)
                _heartbeat.record_failed(err_str)
                asyncio.create_task(_notify_owner(
                    f"💥 *Критическая ошибка воркера*\n"
                    f"Воркер: `{WORKER_ID}`\n"
                    f"Задача #{task_id} · Кампания #{campaign_id}\n"
                    f"`{err_str}`"
                ))

            # Brief pause between tasks
            await asyncio.sleep(POLL_INTERVAL)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[{WORKER_ID}] Outer loop error: {e}", exc_info=True)
            await asyncio.sleep(POLL_INTERVAL * 2)

    # Graceful shutdown
    if _heartbeat:
        _heartbeat.stop()
    logger.info(f"[{WORKER_ID}] Stopped.")


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT,  _handle_signal)

    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logger.info(f"[{WORKER_ID}] KeyboardInterrupt — exiting.")
    except Exception as e:
        logger.critical(f"[{WORKER_ID}] Fatal: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
