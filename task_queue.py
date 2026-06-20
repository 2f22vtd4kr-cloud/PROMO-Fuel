"""Enterprise task queue backed by SQLite with FileLock for safe multi-process access.

Design:
  - WAL mode for concurrency
  - filelock.FileLock for exclusive write operations (claim/complete/fail)
  - Atomic claim_task: UPDATE ... WHERE id=(SELECT id ... LIMIT 1) to avoid races
  - account locking: sender_accounts.status set to 'broadcasting' while a task is active

Usage:
    from task_queue import TaskQueue
    tq = TaskQueue()
    task_id = await tq.push(campaign_id=3, payload={"groups": [...]})
    task    = await tq.claim_task(worker_id="worker-1")
    await tq.complete_task(task["id"])
    await tq.fail_task(task["id"], error="flood wait")
"""
import asyncio
import json
import logging
import os
import sqlite3
import threading
import time
from datetime import datetime
from typing import Any

from filelock import FileLock, Timeout

DB_PATH   = os.getenv("DB_PATH", "campaigns.db")
LOCK_PATH = DB_PATH + ".task.lock"
LOCK_TIMEOUT = int(os.getenv("TASK_LOCK_TIMEOUT", "15"))

logger = logging.getLogger(__name__)


def _conn(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _ensure_tables(db_path: str = DB_PATH) -> None:
    """Create tasks and broadcast_workers tables if absent."""
    conn = _conn(db_path)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            task_type     TEXT    NOT NULL DEFAULT 'group_broadcast',
            campaign_id   INTEGER NOT NULL,
            payload       TEXT    NOT NULL DEFAULT '{}',
            status        TEXT    NOT NULL DEFAULT 'pending',
            priority      INTEGER NOT NULL DEFAULT 5,
            worker_id     TEXT,
            claimed_at    TEXT,
            started_at    TEXT,
            finished_at   TEXT,
            attempts      INTEGER NOT NULL DEFAULT 0,
            max_attempts  INTEGER NOT NULL DEFAULT 3,
            error         TEXT,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            scheduled_at  TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_campaign  ON tasks(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_at);

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
        );
    """)
    conn.commit()
    conn.close()


class TaskQueue:
    """Multi-process-safe SQLite task queue.

    All write operations are protected by a FileLock to prevent race conditions
    between multiple worker processes.
    """

    def __init__(self, db_path: str = DB_PATH, lock_path: str | None = None):
        self.db_path   = db_path
        self.lock_path = lock_path or (db_path + ".task.lock")
        self._flock    = FileLock(self.lock_path, timeout=LOCK_TIMEOUT)
        _ensure_tables(db_path)

    # ── Push ────────────────────────────────────────────────────────────────

    def push_sync(
        self,
        campaign_id: int,
        payload: dict | None = None,
        task_type: str = "group_broadcast",
        priority: int = 5,
        scheduled_at: str | None = None,
        max_attempts: int = 3,
    ) -> int:
        """Push a new task and return its ID (sync)."""
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now().isoformat()
            cur  = conn.execute("""
                INSERT INTO tasks
                    (task_type, campaign_id, payload, status, priority,
                     scheduled_at, max_attempts, created_at)
                VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
            """, (
                task_type,
                campaign_id,
                json.dumps(payload or {}, ensure_ascii=False),
                priority,
                scheduled_at,
                max_attempts,
                now,
            ))
            conn.commit()
            task_id = cur.lastrowid
            conn.close()
        logger.info(f"[queue] Pushed task #{task_id} for campaign {campaign_id}")
        return task_id

    async def push(
        self,
        campaign_id: int,
        payload: dict | None = None,
        task_type: str = "group_broadcast",
        priority: int = 5,
        scheduled_at: str | None = None,
        max_attempts: int = 3,
    ) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.push_sync(
            campaign_id=campaign_id,
            payload=payload,
            task_type=task_type,
            priority=priority,
            scheduled_at=scheduled_at,
            max_attempts=max_attempts,
        ))

    # ── Claim ────────────────────────────────────────────────────────────────

    def claim_task_sync(self, worker_id: str) -> dict | None:
        """Atomically claim the highest-priority pending task.

        Also locks the campaign's sender account (status → 'broadcasting').
        Returns the task row as a dict, or None if nothing is available.
        """
        try:
            with self._flock:
                conn = _conn(self.db_path)
                now  = datetime.now().isoformat()

                # Find the best available task: pending (or failed with retries left),
                # scheduled_at is either null or in the past
                row = conn.execute("""
                    SELECT t.* FROM tasks t
                    WHERE t.status IN ('pending', 'failed')
                      AND t.attempts < t.max_attempts
                      AND (t.scheduled_at IS NULL OR t.scheduled_at <= ?)
                    ORDER BY t.priority ASC, t.created_at ASC
                    LIMIT 1
                """, (now,)).fetchone()

                if not row:
                    conn.close()
                    return None

                task = dict(row)

                # Claim it atomically — only succeeds if still 'pending'/'failed'
                updated = conn.execute("""
                    UPDATE tasks
                    SET status='claimed', worker_id=?, claimed_at=?, attempts=attempts+1
                    WHERE id=? AND status IN ('pending','failed') AND attempts < max_attempts
                """, (worker_id, now, task["id"])).rowcount

                if updated == 0:
                    conn.close()
                    return None  # another worker won the race

                # Lock the sender account if the campaign has one
                try:
                    payload = json.loads(task.get("payload") or "{}")
                    acc_id  = payload.get("sender_account_id")
                    if not acc_id:
                        camp = conn.execute(
                            "SELECT sender_account_id FROM group_campaigns WHERE id=?",
                            (task["campaign_id"],)
                        ).fetchone()
                        if camp:
                            acc_id = camp[0]
                    if acc_id:
                        conn.execute(
                            "UPDATE sender_accounts SET status='broadcasting' WHERE id=? AND is_banned=0 AND is_active=1",
                            (acc_id,)
                        )
                except Exception as e:
                    logger.debug(f"[queue] Account lock skipped: {e}")

                conn.commit()
                conn.close()

                task["payload"] = json.loads(task.get("payload") or "{}")
                logger.info(f"[queue] Worker {worker_id!r} claimed task #{task['id']} (campaign {task['campaign_id']})")
                return task

        except Timeout:
            logger.warning(f"[queue] FileLock timeout claiming task for {worker_id!r}")
            return None

    async def claim_task(self, worker_id: str) -> dict | None:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.claim_task_sync(worker_id))

    # ── Complete / Fail ──────────────────────────────────────────────────────

    def complete_task_sync(self, task_id: int, campaign_id: int | None = None) -> None:
        """Mark a task as done and release the sender account lock."""
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now().isoformat()
            conn.execute(
                "UPDATE tasks SET status='done', finished_at=? WHERE id=?",
                (now, task_id)
            )
            if campaign_id:
                self._release_account_lock(conn, campaign_id)
            conn.commit()
            conn.close()
        logger.info(f"[queue] Task #{task_id} marked done")

    async def complete_task(self, task_id: int, campaign_id: int | None = None) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: self.complete_task_sync(task_id, campaign_id))

    def fail_task_sync(
        self, task_id: int, error: str = "", campaign_id: int | None = None
    ) -> None:
        """Mark a task as failed. If attempts < max_attempts it becomes retryable."""
        with self._flock:
            conn  = _conn(self.db_path)
            now   = datetime.now().isoformat()
            row   = conn.execute(
                "SELECT attempts, max_attempts FROM tasks WHERE id=?", (task_id,)
            ).fetchone()
            if row:
                final_status = "failed" if row[0] < row[1] else "dead"
            else:
                final_status = "dead"
            conn.execute(
                "UPDATE tasks SET status=?, finished_at=?, error=? WHERE id=?",
                (final_status, now, error[:400] if error else "", task_id)
            )
            if campaign_id:
                self._release_account_lock(conn, campaign_id)
            conn.commit()
            conn.close()
        logger.warning(f"[queue] Task #{task_id} → {final_status}: {error[:80]}")

    async def fail_task(
        self, task_id: int, error: str = "", campaign_id: int | None = None
    ) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: self.fail_task_sync(task_id, error, campaign_id))

    # ── Reset stuck tasks ────────────────────────────────────────────────────

    def reset_stuck_sync(self, older_than_seconds: int = 300) -> int:
        """Re-queue tasks that were claimed but never completed (crashed workers)."""
        with self._flock:
            conn = _conn(self.db_path)
            cur  = conn.execute("""
                UPDATE tasks
                SET status='pending', worker_id=NULL, claimed_at=NULL
                WHERE status='claimed'
                  AND (
                    CAST(strftime('%s','now') AS INTEGER)
                    - CAST(strftime('%s', claimed_at) AS INTEGER)
                  ) > ?
                  AND attempts < max_attempts
            """, (older_than_seconds,))
            count = cur.rowcount
            conn.commit()
            conn.close()
        if count:
            logger.info(f"[queue] Reset {count} stuck task(s) to pending")
        return count

    async def reset_stuck(self, older_than_seconds: int = 300) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.reset_stuck_sync(older_than_seconds)
        )

    # ── Queries ──────────────────────────────────────────────────────────────

    def list_tasks_sync(
        self,
        status: str | None = None,
        campaign_id: int | None = None,
        limit: int = 100,
    ) -> list[dict]:
        conn = _conn(self.db_path)
        clauses, params = [], []
        if status:
            clauses.append("status = ?"); params.append(status)
        if campaign_id:
            clauses.append("campaign_id = ?"); params.append(campaign_id)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows  = conn.execute(
            f"SELECT * FROM tasks {where} ORDER BY created_at DESC LIMIT ?",
            params + [limit]
        ).fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["payload"] = json.loads(d.get("payload") or "{}")
            except Exception:
                pass
            result.append(d)
        return result

    async def list_tasks(
        self,
        status: str | None = None,
        campaign_id: int | None = None,
        limit: int = 100,
    ) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.list_tasks_sync(status, campaign_id, limit)
        )

    # ── Internal ─────────────────────────────────────────────────────────────

    @staticmethod
    def _release_account_lock(conn: sqlite3.Connection, campaign_id: int) -> None:
        try:
            row = conn.execute(
                "SELECT sender_account_id FROM group_campaigns WHERE id=?",
                (campaign_id,)
            ).fetchone()
            if row and row[0]:
                conn.execute(
                    "UPDATE sender_accounts SET status='idle' WHERE id=? AND status='broadcasting'",
                    (row[0],)
                )
        except Exception as e:
            logger.debug(f"[queue] Account unlock skipped: {e}")


# ── Module-level default instance ────────────────────────────────────────────

default_queue = TaskQueue()
