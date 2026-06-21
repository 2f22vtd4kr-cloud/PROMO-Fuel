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
import sqlite3
from datetime import datetime, timedelta

import aiosqlite

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")

_scheduler_task: asyncio.Task | None = None
_vacuum_task:    asyncio.Task | None = None

VACUUM_INTERVAL_SECONDS = 86_400  # run once every 24 hours


# ─────────────────────────────────────────────────────────────────────────────
# Daily VACUUM + WAL checkpoint
# ─────────────────────────────────────────────────────────────────────────────

def _vacuum_db_sync(db_file: str) -> None:
    """Synchronous VACUUM + WAL checkpoint — must run outside a transaction.

    SQLite's VACUUM rewrites the entire DB into a fresh file, reclaiming all
    fragmented free pages.  WAL checkpoint(TRUNCATE) shrinks the write-ahead
    log to zero bytes so the WAL file doesn't grow unboundedly on write-heavy
    workloads.

    isolation_level=None puts the connection in autocommit mode, which is
    required for VACUUM (it cannot execute inside a BEGIN block).
    """
    conn = sqlite3.connect(db_file, timeout=120)
    conn.isolation_level = None          # autocommit — required for VACUUM
    conn.execute("PRAGMA busy_timeout=120000")
    try:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        logger.info("[vacuum] WAL checkpoint(TRUNCATE) done on %s", db_file)
        conn.execute("VACUUM")
        logger.info("[vacuum] VACUUM done on %s", db_file)
    finally:
        conn.close()


async def _vacuum_databases() -> None:
    """Vacuum all known SQLite DB files — runs in a thread-pool executor so the
    event loop is not blocked during what can be a multi-second I/O operation."""
    # Deduplicate: tasks table lives in campaigns.db; TASKS_DB_PATH lets
    # operators override if they ever split the DBs.
    db_files: list[str] = list(dict.fromkeys([
        DB_PATH,
        os.getenv("TASKS_DB_PATH", "tasks.db"),
    ]))

    loop = asyncio.get_event_loop()
    for db_file in db_files:
        if not os.path.exists(db_file):
            logger.debug("[vacuum] %s not found — skipping", db_file)
            continue
        try:
            logger.info("[vacuum] Starting VACUUM + WAL checkpoint on %s …", db_file)
            await loop.run_in_executor(None, _vacuum_db_sync, db_file)
            logger.info("[vacuum] ✓ %s defragmented successfully", db_file)
        except Exception as exc:
            logger.error("[vacuum] %s failed: %s", db_file, exc, exc_info=True)


async def _vacuum_loop() -> None:
    """Daily vacuum loop — initial 60-second delay lets startup I/O settle,
    then vacuums every VACUUM_INTERVAL_SECONDS (default 24 h)."""
    await asyncio.sleep(60)
    while True:
        await _vacuum_databases()
        await asyncio.sleep(VACUUM_INTERVAL_SECONDS)


async def _aio_conn(path: str = DB_PATH) -> aiosqlite.Connection:
    """Open an aiosqlite connection with all three mandatory concurrency pragmas."""
    conn = await aiosqlite.connect(path)
    await conn.execute("PRAGMA journal_mode=WAL")
    await conn.execute("PRAGMA synchronous=NORMAL")
    await conn.execute("PRAGMA busy_timeout=30000")
    await conn.execute("PRAGMA foreign_keys=ON")
    return conn


async def _get_due_group_campaigns() -> list[dict]:
    """Return running group campaigns whose next_send_at is due."""
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA busy_timeout=30000")
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
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA busy_timeout=30000")
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
    """Launch the scheduler and daily vacuum as background asyncio tasks."""
    global _scheduler_task, _vacuum_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("[broadcastscheduler] Background scheduler task created")
    else:
        logger.debug("[broadcastscheduler] Scheduler already running")

    if _vacuum_task is None or _vacuum_task.done():
        _vacuum_task = asyncio.create_task(_vacuum_loop())
        logger.info("[broadcastscheduler] Daily vacuum task created (interval=%ds)", VACUUM_INTERVAL_SECONDS)
    else:
        logger.debug("[broadcastscheduler] Vacuum already running")


def stop_broadcast_scheduler() -> None:
    global _scheduler_task, _vacuum_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
        logger.info("[broadcastscheduler] Scheduler stopped")
    if _vacuum_task and not _vacuum_task.done():
        _vacuum_task.cancel()
        _vacuum_task = None
        logger.info("[broadcastscheduler] Vacuum task stopped")


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
