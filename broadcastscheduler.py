"""Broadcast scheduler — watches group_campaigns and pushes tasks to the TaskQueue.

Runs inside the main process. Uses APScheduler to poll for due campaigns every 30s.
When a group campaign's next_send_at is due, a task is pushed to the queue and
next_send_at is advanced by interval_seconds.

Usage (called from main.py post_init):
    from broadcastscheduler import start_broadcast_scheduler
    start_broadcast_scheduler()

Or standalone (for testing):
    python broadcastscheduler.py
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timedelta

import aiosqlite

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")

_scheduler_task: asyncio.Task | None = None


async def _get_due_group_campaigns() -> list[dict]:
    """Return running group campaigns whose next_send_at is due."""
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("""
            SELECT * FROM group_campaigns
            WHERE status = 'running'
              AND (next_send_at IS NULL OR next_send_at <= ?)
        """, (now,)) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def _advance_next_send(campaign_id: int, interval_seconds: int) -> None:
    """Set next_send_at = now + interval_seconds to prevent duplicate fires."""
    next_send = (datetime.now() + timedelta(seconds=interval_seconds)).isoformat()
    now       = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("""
            UPDATE group_campaigns
            SET next_send_at = ?, updated_at = ?
            WHERE id = ?
        """, (next_send, now, campaign_id))
        await conn.commit()


async def _scheduler_loop() -> None:
    """Main scheduler loop — fires every 30 seconds."""
    from task_queue import TaskQueue
    tq = TaskQueue(db_path=DB_PATH)

    # Ensure tables exist
    from dbmigrations import run_migrations
    run_migrations(DB_PATH)

    logger.info("[broadcastscheduler] Started — polling every 30s")

    while True:
        try:
            due = await _get_due_group_campaigns()
            for campaign in due:
                cid              = campaign["id"]
                interval         = int(campaign.get("interval_seconds") or 86400)
                sender_account   = campaign.get("sender_account_id")
                selected_groups  = json.loads(campaign.get("selected_groups") or "[]")

                if not selected_groups:
                    logger.warning(f"[broadcastscheduler] Campaign {cid} has no groups, skipping")
                    await _advance_next_send(cid, interval)
                    continue

                if not sender_account:
                    logger.warning(f"[broadcastscheduler] Campaign {cid} has no sender account, skipping")
                    await _advance_next_send(cid, interval)
                    continue

                # Advance next_send_at BEFORE pushing (prevents duplicate pushes if push fails)
                await _advance_next_send(cid, interval)

                payload = {
                    "sender_account_id": sender_account,
                    "selected_groups":   selected_groups,
                }
                task_id = await tq.push(campaign_id=cid, payload=payload)
                logger.info(
                    f"[broadcastscheduler] Campaign {cid} due → pushed task #{task_id} "
                    f"({len(selected_groups)} groups, next in {interval}s)"
                )

        except Exception as e:
            logger.error(f"[broadcastscheduler] Loop error: {e}", exc_info=True)

        await asyncio.sleep(30)


def start_broadcast_scheduler() -> None:
    """Launch the scheduler as a background asyncio task."""
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("[broadcastscheduler] Background task created")
    else:
        logger.debug("[broadcastscheduler] Already running")


def stop_broadcast_scheduler() -> None:
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
        logger.info("[broadcastscheduler] Stopped")


# ── Standalone entry point ────────────────────────────────────────────────────

if __name__ == "__main__":
    import signal

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    )

    async def _run():
        from dbmigrations import run_migrations
        run_migrations(DB_PATH)
        await _scheduler_loop()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, loop.stop)

    try:
        loop.run_until_complete(_run())
    finally:
        loop.close()
        logger.info("[broadcastscheduler] Exited.")
