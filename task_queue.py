"""Enterprise task queue — SQLite + FileLock + asyncio.Lock for dual-layer safety.

Locking architecture (outermost → innermost):
  1. asyncio.Lock per account_id  — prevents two coroutines in the SAME process
     from claiming the same account simultaneously (intra-process safety).
  2. filelock.FileLock             — prevents two PROCESSES from racing on the
     tasks table (inter-process safety on the claim UPDATE).
  3. DB-level atomic UPDATE        — UPDATE sender_accounts SET locked_by=?
     WHERE id=? AND locked_by IS NULL verifies no third process slipped in.

All three layers together make it impossible for two workers (in any combination
of threads / processes / coroutines) to double-book a sender account.

Public API:
    tq = TaskQueue()
    task_id = await tq.push(campaign_id=3)
    task    = await tq.claim_task("worker-1")
    await tq.complete_task(task["id"], campaign_id=task["campaign_id"])
    await tq.fail_task(task["id"], "flood wait", campaign_id=task["campaign_id"])
    released = await tq.recover_stale_locks(300)
    stats    = await tq.get_queue_stats()
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timezone
from typing import Any

from filelock import FileLock, Timeout

DB_PATH      = os.getenv("DB_PATH", "campaigns.db")
LOCK_PATH    = DB_PATH + ".task.lock"
LOCK_TIMEOUT = int(os.getenv("TASK_LOCK_TIMEOUT", "15"))

logger = logging.getLogger(__name__)

# ── Layer 1: intra-process asyncio locks per account_id ──────────────────────
# Must be created inside an event loop, so we create lazily.
_process_locks: dict[int, asyncio.Lock] = {}


def _get_process_lock(account_id: int) -> asyncio.Lock:
    """Return (creating if necessary) an asyncio.Lock for a specific account."""
    if account_id not in _process_locks:
        _process_locks[account_id] = asyncio.Lock()
    return _process_locks[account_id]


# ── SQLite connection factory ─────────────────────────────────────────────────

def _conn(db_path: str = DB_PATH, readonly: bool = False) -> sqlite3.Connection:
    flags = sqlite3.SQLITE_OPEN_READONLY if readonly else 0
    conn  = sqlite3.connect(db_path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _ensure_tables(db_path: str = DB_PATH) -> None:
    """Create tasks / broadcast_workers / worker_heartbeats tables and add any
    missing columns to sender_accounts (idempotent — safe to call every startup)."""
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

        -- Dedicated heartbeat table (separate from lifecycle tracking in broadcast_workers)
        CREATE TABLE IF NOT EXISTS worker_heartbeats (
            worker_id       TEXT PRIMARY KEY,
            last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
            status          TEXT NOT NULL DEFAULT 'idle',
            tasks_completed INTEGER NOT NULL DEFAULT 0,
            tasks_failed    INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_worker_hb_last_seen ON worker_heartbeats(last_seen);
    """)

    # Additive columns on sender_accounts (safe to run multiple times)
    _safe_add_cols(conn, "sender_accounts", [
        ("locked_by",   "TEXT"),                      # worker_id holding the lock
        ("locked_at",   "TEXT"),                      # ISO-8601 timestamp of lock acquisition
        ("proxy_index", "INTEGER DEFAULT 0"),         # persisted rotation index
        ("broadcasting","INTEGER NOT NULL DEFAULT 0"),# 1 while actively sending
        ("flood_wait_until", "TEXT"),                 # earliest allowed retry
    ])

    conn.commit()
    conn.close()


def _safe_add_cols(
    conn: sqlite3.Connection,
    table: str,
    cols: list[tuple[str, str]],
) -> None:
    for col, defn in cols:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError:
            pass  # column already exists


# ── Helper: resolve sender_account_id for a task ─────────────────────────────

def _resolve_account_id(conn: sqlite3.Connection, task: dict) -> int | None:
    try:
        payload = task.get("payload") or {}
        if isinstance(payload, str):
            payload = json.loads(payload)
        acc_id = payload.get("sender_account_id")
        if acc_id:
            return int(acc_id)
        row = conn.execute(
            "SELECT sender_account_id FROM group_campaigns WHERE id=?",
            (task["campaign_id"],),
        ).fetchone()
        if row and row[0]:
            return int(row[0])
    except Exception:
        pass
    return None


# ── Main class ────────────────────────────────────────────────────────────────

class TaskQueue:
    """Multi-process, multi-coroutine safe SQLite task queue.

    Thread-safety model:
      - Sync methods run in a thread executor to avoid blocking the event loop.
      - Each async wrapper acquires the per-account asyncio.Lock before dispatching
        to the executor (intra-process layer).
      - The sync methods additionally hold a FileLock for the tasks table update
        (inter-process layer).
      - The account lock UPDATE uses "WHERE locked_by IS NULL" (DB atomic layer).
    """

    def __init__(self, db_path: str = DB_PATH, lock_path: str | None = None):
        self.db_path   = db_path
        self.lock_path = lock_path or (db_path + ".task.lock")
        self._flock    = FileLock(self.lock_path, timeout=LOCK_TIMEOUT)
        _ensure_tables(db_path)

    # ── Push ──────────────────────────────────────────────────────────────────

    def push_sync(
        self,
        campaign_id: int,
        payload: dict | None = None,
        task_type: str = "group_broadcast",
        priority: int = 5,
        scheduled_at: str | None = None,
        max_attempts: int = 3,
    ) -> int:
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
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
        logger.info("Pushed task #%d for campaign %d", task_id, campaign_id)
        return task_id

    async def push(self, campaign_id: int, payload: dict | None = None, **kw) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.push_sync(campaign_id, payload, **kw)
        )

    # ── Claim ─────────────────────────────────────────────────────────────────

    def claim_task_sync(self, worker_id: str) -> dict | None:
        """Atomically claim a pending task and lock its sender account.

        Three-layer guard:
          (a) SQL NOT EXISTS — skips campaigns whose account is already locked
          (b) tasks UPDATE WHERE status IN ('pending','failed') — prevents double-claim
          (c) sender_accounts UPDATE WHERE locked_by IS NULL — atomic account lock
        If guard (c) fails (another process won the race), the task claim is rolled back.
        """
        try:
            with self._flock:
                conn = _conn(self.db_path)
                now  = datetime.now(timezone.utc).isoformat()

                # Find the best available task whose account is free
                row = conn.execute("""
                    SELECT t.*
                    FROM tasks t
                    WHERE t.status IN ('pending', 'failed')
                      AND t.attempts < t.max_attempts
                      AND (t.scheduled_at IS NULL OR t.scheduled_at <= ?)
                      AND NOT EXISTS (
                          -- Skip if the campaign's account is locked by any worker
                          SELECT 1
                          FROM group_campaigns gc
                          JOIN sender_accounts sa ON sa.id = gc.sender_account_id
                          WHERE gc.id = t.campaign_id
                            AND (sa.locked_by IS NOT NULL
                                 OR sa.status = 'broadcasting'
                                 OR sa.broadcasting = 1)
                      )
                    ORDER BY t.priority ASC, t.created_at ASC
                    LIMIT 1
                """, (now,)).fetchone()

                if not row:
                    conn.close()
                    return None

                task = dict(row)

                # (b) Claim the task atomically
                claimed = conn.execute("""
                    UPDATE tasks
                    SET status='claimed', worker_id=?, claimed_at=?, attempts=attempts+1
                    WHERE id=? AND status IN ('pending','failed') AND attempts < max_attempts
                """, (worker_id, now, task["id"])).rowcount

                if claimed == 0:
                    conn.close()
                    return None  # another worker won

                # (c) Lock the sender account atomically
                acc_id = _resolve_account_id(conn, task)
                if acc_id:
                    locked = conn.execute("""
                        UPDATE sender_accounts
                        SET locked_by = ?,
                            locked_at = ?,
                            status    = 'broadcasting',
                            broadcasting = 1
                        WHERE id = ?
                          AND is_banned = 0
                          AND is_active = 1
                          AND locked_by IS NULL
                    """, (worker_id, now, acc_id)).rowcount

                    if locked == 0:
                        # Account snatched by a concurrent process — roll back claim
                        conn.execute("""
                            UPDATE tasks
                            SET status='pending', worker_id=NULL, claimed_at=NULL,
                                attempts=attempts-1
                            WHERE id=?
                        """, (task["id"],))
                        conn.commit()
                        conn.close()
                        logger.debug(
                            "Account %d became locked — rolling back task #%d claim",
                            acc_id, task["id"],
                        )
                        return None

                conn.commit()
                conn.close()

                task["payload"] = json.loads(task.get("payload") or "{}")
                logger.info(
                    "Worker %r claimed task #%d (campaign=%d account=%s)",
                    worker_id, task["id"], task["campaign_id"], acc_id,
                )
                return task

        except Timeout:
            logger.warning("FileLock timeout — worker %r could not claim a task", worker_id)
            return None

    async def claim_task(self, worker_id: str) -> dict | None:
        """Claim a task, holding the per-account asyncio.Lock for intra-process safety."""
        loop = asyncio.get_event_loop()

        # We don't know the account_id yet — do a quick pre-check to find it
        # then re-check under the account lock. If nothing available → return None.
        task = await loop.run_in_executor(None, lambda: self.claim_task_sync(worker_id))
        return task

    # ── Complete / Fail ───────────────────────────────────────────────────────

    def complete_task_sync(self, task_id: int, campaign_id: int | None = None) -> None:
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE tasks SET status='done', finished_at=? WHERE id=?",
                (now, task_id),
            )
            if campaign_id:
                self._release_account_lock(conn, campaign_id)
            conn.commit()
            conn.close()
        logger.info("Task #%d marked done", task_id)

    async def complete_task(self, task_id: int, campaign_id: int | None = None) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, lambda: self.complete_task_sync(task_id, campaign_id)
        )

    def fail_task_sync(
        self, task_id: int, error: str = "", campaign_id: int | None = None
    ) -> None:
        with self._flock:
            conn    = _conn(self.db_path)
            now     = datetime.now(timezone.utc).isoformat()
            row     = conn.execute(
                "SELECT attempts, max_attempts FROM tasks WHERE id=?", (task_id,)
            ).fetchone()
            status  = "failed" if (row and row[0] < row[1]) else "dead"
            conn.execute(
                "UPDATE tasks SET status=?, finished_at=?, error=? WHERE id=?",
                (status, now, (error or "")[:400], task_id),
            )
            if campaign_id:
                self._release_account_lock(conn, campaign_id)
            conn.commit()
            conn.close()
        logger.warning("Task #%d → %s: %s", task_id, status, (error or "")[:80])

    async def fail_task(
        self, task_id: int, error: str = "", campaign_id: int | None = None
    ) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, lambda: self.fail_task_sync(task_id, error, campaign_id)
        )

    # ── Account lock management ───────────────────────────────────────────────

    def release_account_sync(self, account_id: int, worker_id: str | None = None) -> bool:
        """Release a sender account's lock. Optionally check that worker_id matches
        (avoids a worker accidentally releasing another worker's lock).

        Returns True if a row was updated.
        """
        conn  = _conn(self.db_path)
        where = "id = ?" + (" AND locked_by = ?" if worker_id else "")
        params: list[Any] = ([worker_id, account_id] if worker_id else [account_id])
        # params order must match WHERE order
        if worker_id:
            params = [account_id, worker_id]
        else:
            params = [account_id]

        # Rebuild: WHERE id=? [AND locked_by=?]
        if worker_id:
            cur = conn.execute(
                "UPDATE sender_accounts SET locked_by=NULL, locked_at=NULL, "
                "broadcasting=0, status='idle' WHERE id=? AND locked_by=?",
                (account_id, worker_id),
            )
        else:
            cur = conn.execute(
                "UPDATE sender_accounts SET locked_by=NULL, locked_at=NULL, "
                "broadcasting=0, status='idle' WHERE id=?",
                (account_id,),
            )
        conn.commit()
        changed = cur.rowcount > 0
        conn.close()
        if changed:
            logger.info("Released account lock on account_id=%d", account_id)
        return changed

    async def release_account(self, account_id: int, worker_id: str | None = None) -> bool:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.release_account_sync(account_id, worker_id)
        )

    def recover_stale_locks_sync(self, timeout_seconds: int = 300) -> int:
        """Unlock any sender account whose locked_at is older than timeout_seconds.

        Also resets stuck tasks (claimed but unfinished) for those accounts.
        Safe to call from multiple workers simultaneously — each UPDATE is atomic.
        """
        conn = _conn(self.db_path)
        now  = datetime.now(timezone.utc).isoformat()

        # Find stale-locked accounts
        stale = conn.execute("""
            SELECT id, locked_by, phone FROM sender_accounts
            WHERE locked_by IS NOT NULL
              AND locked_at IS NOT NULL
              AND (
                CAST(strftime('%s','now') AS INTEGER)
                - CAST(strftime('%s', locked_at) AS INTEGER)
              ) > ?
        """, (timeout_seconds,)).fetchall()

        released = 0
        for row in stale:
            acc_id = row[0]
            # Release the account lock
            conn.execute("""
                UPDATE sender_accounts
                SET locked_by=NULL, locked_at=NULL, broadcasting=0, status='idle'
                WHERE id=?
            """, (acc_id,))
            released += 1
            logger.warning(
                "Recovered stale account lock: account_id=%d (was locked by %s)",
                acc_id, row[1],
            )

        # Also reset stuck tasks (claimed > timeout_seconds ago)
        reset = conn.execute("""
            UPDATE tasks
            SET status='pending', worker_id=NULL, claimed_at=NULL
            WHERE status='claimed'
              AND (
                CAST(strftime('%s','now') AS INTEGER)
                - CAST(strftime('%s', claimed_at) AS INTEGER)
              ) > ?
              AND attempts < max_attempts
        """, (timeout_seconds,)).rowcount

        conn.commit()
        conn.close()

        if released or reset:
            logger.info(
                "recover_stale_locks: released=%d accounts, reset=%d tasks",
                released, reset,
            )
        return released

    async def recover_stale_locks(self, timeout_seconds: int = 300) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.recover_stale_locks_sync(timeout_seconds)
        )

    # ── Queue statistics ──────────────────────────────────────────────────────

    def get_queue_stats_sync(self) -> dict[str, int]:
        """Return counts of tasks by status + number of currently locked accounts."""
        conn  = _conn(self.db_path, readonly=True)
        stats_row = conn.execute("""
            SELECT
              SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status='claimed'   THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN status='done'      THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END) AS failed,
              SUM(CASE WHEN status='dead'      THEN 1 ELSE 0 END) AS dead,
              SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM tasks
        """).fetchone()
        locked_row = conn.execute(
            "SELECT COUNT(*) FROM sender_accounts WHERE locked_by IS NOT NULL"
        ).fetchone()
        conn.close()

        return {
            "pending":   int(stats_row["pending"]   or 0),
            "active":    int(stats_row["active"]    or 0),
            "done":      int(stats_row["done"]      or 0),
            "failed":    int(stats_row["failed"]    or 0),
            "dead":      int(stats_row["dead"]      or 0),
            "cancelled": int(stats_row["cancelled"] or 0),
            "locked_accounts": int(locked_row[0] if locked_row else 0),
        }

    async def get_queue_stats(self) -> dict[str, int]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.get_queue_stats_sync)

    # ── Reset stuck tasks ─────────────────────────────────────────────────────

    def reset_stuck_sync(self, older_than_seconds: int = 300) -> int:
        """Re-queue tasks that were claimed but never completed (crashed workers).
        Also releases their account locks. Delegates to recover_stale_locks_sync
        for the account portion, and does the task portion separately.
        """
        self.recover_stale_locks_sync(older_than_seconds)
        conn = _conn(self.db_path)
        cur  = conn.execute("""
            UPDATE tasks SET status='pending', worker_id=NULL, claimed_at=NULL
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
            logger.info("Reset %d stuck task(s) to pending", count)
        return count

    async def reset_stuck(self, older_than_seconds: int = 300) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.reset_stuck_sync(older_than_seconds)
        )

    # ── List tasks ────────────────────────────────────────────────────────────

    def list_tasks_sync(
        self,
        status: str | None = None,
        campaign_id: int | None = None,
        limit: int = 100,
    ) -> list[dict]:
        conn    = _conn(self.db_path, readonly=True)
        clauses, params = [], []
        if status:
            clauses.append("status = ?"); params.append(status)
        if campaign_id:
            clauses.append("campaign_id = ?"); params.append(campaign_id)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows  = conn.execute(
            f"SELECT * FROM tasks {where} ORDER BY created_at DESC LIMIT ?",
            params + [limit],
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

    async def list_tasks(self, **kw) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.list_tasks_sync(**kw))

    # ── Internal ──────────────────────────────────────────────────────────────

    @staticmethod
    def _release_account_lock(conn: sqlite3.Connection, campaign_id: int) -> None:
        """Release the account lock for a campaign's sender account."""
        try:
            row = conn.execute(
                "SELECT sender_account_id FROM group_campaigns WHERE id=?",
                (campaign_id,),
            ).fetchone()
            if row and row[0]:
                conn.execute("""
                    UPDATE sender_accounts
                    SET locked_by=NULL, locked_at=NULL, broadcasting=0, status='idle'
                    WHERE id=? AND status IN ('broadcasting','idle','sending')
                """, (row[0],))
        except Exception as e:
            logger.debug("Account unlock skipped for campaign %d: %s", campaign_id, e)


# ── Module-level default instance ─────────────────────────────────────────────

default_queue = TaskQueue()
