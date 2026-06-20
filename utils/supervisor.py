"""Heartbeat and auto-restart supervisor utilities.

Worker processes call heartbeat() periodically to write to the broadcast_workers table.
The supervisor thread (or main process) calls check_dead_workers() to detect stale workers
and mark them offline.

Usage (in worker.py):
    from utils.supervisor import WorkerHeartbeat
    hb = WorkerHeartbeat(worker_id="worker-1", db_path="campaigns.db")
    hb.start()          # starts background daemon thread
    ...
    hb.stop()           # on graceful shutdown

Usage (in main/API to monitor):
    from utils.supervisor import get_worker_statuses, reap_dead_workers
    statuses = await get_worker_statuses()
"""
import asyncio
import logging
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")
HEARTBEAT_INTERVAL   = int(os.getenv("HEARTBEAT_INTERVAL",   "20"))   # seconds between beats
WORKER_DEAD_TIMEOUT  = int(os.getenv("WORKER_DEAD_TIMEOUT",  "90"))   # seconds before marking dead


def _get_conn(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def ensure_worker_table(db_path: str = DB_PATH) -> None:
    """Create broadcast_workers table if it doesn't exist."""
    conn = _get_conn(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS broadcast_workers (
            worker_id      TEXT PRIMARY KEY,
            pid            INTEGER,
            status         TEXT NOT NULL DEFAULT 'idle',
            current_task   INTEGER,
            tasks_done     INTEGER NOT NULL DEFAULT 0,
            tasks_failed   INTEGER NOT NULL DEFAULT 0,
            started_at     TEXT NOT NULL DEFAULT (datetime('now')),
            last_heartbeat TEXT NOT NULL DEFAULT (datetime('now')),
            last_error     TEXT
        )
    """)
    conn.commit()
    conn.close()


class WorkerHeartbeat:
    """Sends regular heartbeats for a worker to the broadcast_workers table."""

    def __init__(self, worker_id: str, db_path: str = DB_PATH,
                 interval: int = HEARTBEAT_INTERVAL):
        self.worker_id = worker_id
        self.db_path   = db_path
        self.interval  = interval
        self._stop_evt = threading.Event()
        self._thread:  threading.Thread | None = None
        self._status   = "idle"
        self._current_task: int | None = None
        self._tasks_done   = 0
        self._tasks_failed = 0

    # ── Public API ──────────────────────────────────────────────────────────

    def start(self) -> None:
        ensure_worker_table(self.db_path)
        self._register()
        self._thread = threading.Thread(
            target=self._loop, name=f"hb-{self.worker_id}", daemon=True
        )
        self._thread.start()
        logger.info(f"[heartbeat] Worker {self.worker_id!r} registered (pid={os.getpid()})")

    def stop(self) -> None:
        self._stop_evt.set()
        self._update_status("stopped")
        if self._thread:
            self._thread.join(timeout=5)

    def set_status(self, status: str, task_id: int | None = None) -> None:
        self._status = status
        self._current_task = task_id
        self._beat()

    def record_done(self) -> None:
        self._tasks_done += 1
        self._status = "idle"
        self._current_task = None
        self._beat()

    def record_failed(self, error: str | None = None) -> None:
        self._tasks_failed += 1
        self._status = "idle"
        self._current_task = None
        self._beat(last_error=error)

    # ── Internal ────────────────────────────────────────────────────────────

    def _register(self) -> None:
        conn = _get_conn(self.db_path)
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT INTO broadcast_workers
                (worker_id, pid, status, current_task, tasks_done, tasks_failed, started_at, last_heartbeat)
            VALUES (?, ?, 'idle', NULL, 0, 0, ?, ?)
            ON CONFLICT(worker_id) DO UPDATE SET
                pid = excluded.pid,
                status = 'idle',
                current_task = NULL,
                started_at = excluded.started_at,
                last_heartbeat = excluded.last_heartbeat
        """, (self.worker_id, os.getpid(), now, now))
        conn.commit()
        conn.close()

    def _beat(self, last_error: str | None = None) -> None:
        try:
            conn = _get_conn(self.db_path)
            now = datetime.now(timezone.utc).isoformat()
            params: list = [
                self._status,
                self._current_task,
                self._tasks_done,
                self._tasks_failed,
                now,
                self.worker_id,
            ]
            sql = """
                UPDATE broadcast_workers
                SET status=?, current_task=?, tasks_done=?, tasks_failed=?,
                    last_heartbeat=?{}
                WHERE worker_id=?
            """.format(", last_error=?" if last_error else "")
            if last_error:
                params.insert(-1, last_error[:300])
            conn.execute(sql, params)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"[heartbeat] Beat failed for {self.worker_id}: {e}")

    def _update_status(self, status: str) -> None:
        self._status = status
        self._beat()

    def _loop(self) -> None:
        while not self._stop_evt.wait(self.interval):
            self._beat()


# ── Async helpers for API / main process ────────────────────────────────────

async def get_worker_statuses(db_path: str = DB_PATH) -> list[dict]:
    """Return all worker rows from broadcast_workers table."""
    def _sync():
        ensure_worker_table(db_path)
        conn = _get_conn(db_path)
        rows = conn.execute(
            "SELECT * FROM broadcast_workers ORDER BY started_at DESC"
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    return await asyncio.get_event_loop().run_in_executor(None, _sync)


async def reap_dead_workers(
    db_path: str = DB_PATH,
    timeout: int = WORKER_DEAD_TIMEOUT
) -> int:
    """Mark workers whose last_heartbeat is older than `timeout` seconds as 'dead'.

    Returns the number of workers reaped.
    """
    def _sync():
        conn = _get_conn(db_path)
        cur = conn.execute("""
            UPDATE broadcast_workers
            SET status = 'dead'
            WHERE status NOT IN ('dead', 'stopped')
              AND (
                CAST(strftime('%s','now') AS INTEGER)
                - CAST(strftime('%s', last_heartbeat) AS INTEGER)
              ) > ?
        """, (timeout,))
        count = cur.rowcount
        conn.commit()
        conn.close()
        return count
    count = await asyncio.get_event_loop().run_in_executor(None, _sync)
    if count:
        logger.warning(f"[supervisor] Reaped {count} dead worker(s)")
    return count
