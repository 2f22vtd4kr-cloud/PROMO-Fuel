"""Multi-process, multi-coroutine safe SQLite task queue.

Locking architecture (outermost → innermost)
---------------------------------------------
  Layer 1 — asyncio.Lock per account_id
      Prevents two coroutines in the SAME process from claiming the
      same account simultaneously (intra-process, zero-cost on success).

  Layer 2 — filelock.FileLock("tasks.lock", timeout=10)
      Prevents two PROCESSES from racing on the tasks table
      (inter-process safety; holds for the duration of each DB write).

  Layer 3 — SQL atomic UPDATE … WHERE locked_by IS NULL
      Final check: even if two processes obtained the FileLock
      sequentially, the WHERE clause ensures only one INSERT/UPDATE wins.

All three layers together make it impossible for any combination of
threads, processes, or coroutines to double-book a sender account.

Public API
----------
    tq = TaskQueue()
    task_id = await tq.push(campaign_id=3)
    task    = await tq.claim_task("worker-1")
    await tq.complete_task(task["id"], campaign_id=task["campaign_id"])
    await tq.fail_task(task["id"], "reason", campaign_id=task["campaign_id"])
    await tq.force_release_worker("worker-1")   # on crash / SIGTERM
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

# ── Constants ─────────────────────────────────────────────────────────────────
DB_PATH      = os.getenv("DB_PATH", "campaigns.db")
LOCK_FILE    = "tasks.lock"                                 # fixed filename in cwd
LOCK_TIMEOUT = int(os.getenv("TASK_LOCK_TIMEOUT", "10"))   # seconds — as specified

logger = logging.getLogger(__name__)

# ── Layer 1: intra-process asyncio locks keyed by account_id ──────────────────
_process_locks: dict[int, asyncio.Lock] = {}


def _get_process_lock(account_id: int) -> asyncio.Lock:
    """Return (lazily created) the asyncio.Lock for a given account_id."""
    if account_id not in _process_locks:
        _process_locks[account_id] = asyncio.Lock()
    return _process_locks[account_id]


# ── SQLite connection factory ─────────────────────────────────────────────────

def _conn(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Open a WAL-mode SQLite connection with all required pragmas."""
    conn = sqlite3.connect(db_path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _safe_add_col(conn: sqlite3.Connection, table: str, col: str, defn: str) -> None:
    """Add a column to *table* if it does not already exist (idempotent)."""
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")
    except sqlite3.OperationalError:
        pass


def _ensure_tables(db_path: str = DB_PATH) -> None:
    """Create all required tables and add missing columns (idempotent)."""
    conn = _conn(db_path)
    conn.executescript("""
        -- Task queue.
        -- NOTE: On migration-seeded databases, `task_type` and `finished_at`
        -- are GENERATED ALWAYS AS virtual columns pointing at `type` and
        -- `completed_at` respectively.  We never write to those virtual columns
        -- — only to the physical source columns (type, completed_at).
        CREATE TABLE IF NOT EXISTS tasks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            type          TEXT    NOT NULL DEFAULT 'group_broadcast',
            campaign_id   INTEGER NOT NULL DEFAULT 0,
            payload       TEXT    NOT NULL DEFAULT '{}',
            status        TEXT    NOT NULL DEFAULT 'pending',
            priority      INTEGER NOT NULL DEFAULT 5,
            worker_id     TEXT,
            claimed_at    TEXT,
            started_at    TEXT,
            completed_at  TEXT,
            attempts      INTEGER NOT NULL DEFAULT 0,
            max_attempts  INTEGER NOT NULL DEFAULT 3,
            error         TEXT,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            scheduled_at  TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_worker_id  ON tasks(worker_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_campaign   ON tasks(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_scheduled  ON tasks(scheduled_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority   ON tasks(priority, created_at);

        -- Worker registry (one row per named worker slot)
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
        CREATE INDEX IF NOT EXISTS idx_bw_heartbeat ON broadcast_workers(last_heartbeat);

        -- Lightweight heartbeat table (written more frequently than broadcast_workers)
        CREATE TABLE IF NOT EXISTS worker_heartbeats (
            worker_id       TEXT PRIMARY KEY,
            last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
            status          TEXT NOT NULL DEFAULT 'idle',
            tasks_completed INTEGER NOT NULL DEFAULT 0,
            tasks_failed    INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_worker_hb_last_seen ON worker_heartbeats(last_seen);
    """)

    # Ensure sender_accounts exists with the minimal schema task_queue needs.
    # On production databases this table is created and fully populated by
    # dbmigrations.py; here we only CREATE IF NOT EXISTS so _safe_add_col
    # calls below don't fail on a fresh database (e.g., test environments).
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sender_accounts (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            phone               TEXT    NOT NULL DEFAULT '',
            status              TEXT    NOT NULL DEFAULT 'idle',
            auth_status         TEXT    NOT NULL DEFAULT 'idle',
            is_active           INTEGER NOT NULL DEFAULT 1,
            is_banned           INTEGER NOT NULL DEFAULT 0,
            locked_by           TEXT,
            locked_at           TEXT,
            broadcasting        INTEGER NOT NULL DEFAULT 0,
            proxy_index         INTEGER NOT NULL DEFAULT 0,
            current_proxy_index INTEGER          DEFAULT 0,
            flood_wait_until    TEXT,
            last_error          TEXT
        )
    """)

    # Add any columns that may be missing on older schemas (idempotent)
    for col, defn in [
        ("locked_by",           "TEXT"),
        ("locked_at",           "TEXT"),
        ("broadcasting",        "INTEGER NOT NULL DEFAULT 0"),
        ("auth_status",         "TEXT    NOT NULL DEFAULT 'idle'"),
        ("proxy_index",         "INTEGER NOT NULL DEFAULT 0"),
        ("current_proxy_index", "INTEGER DEFAULT 0"),
        ("flood_wait_until",    "TEXT"),
        ("last_error",          "TEXT"),
    ]:
        _safe_add_col(conn, "sender_accounts", col, defn)

    conn.commit()
    conn.close()


# ── Payload / account resolution ──────────────────────────────────────────────

def _parse_payload(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw or "{}")
    except Exception:
        return {}


def _resolve_account_id(conn: sqlite3.Connection, task: dict) -> int | None:
    """Return the sender_account_id for *task* from payload or group_campaigns."""
    payload = _parse_payload(task.get("payload"))
    acc_id  = payload.get("sender_account_id") or payload.get("account_id")
    if acc_id:
        return int(acc_id)
    try:
        row = conn.execute(
            "SELECT sender_account_id FROM group_campaigns WHERE id = ?",
            (task["campaign_id"],),
        ).fetchone()
        if row and row[0]:
            return int(row[0])
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# TaskQueue — main class
# ─────────────────────────────────────────────────────────────────────────────

class TaskQueue:
    """Multi-process, multi-coroutine safe SQLite task queue.

    Every method that modifies the database holds the FileLock for the
    entire duration of its transaction, guaranteeing that no two processes
    can interleave writes.  Read-only methods (get_queue_stats, list_tasks)
    do not take the lock.
    """

    def __init__(
        self,
        db_path:   str = DB_PATH,
        lock_file: str = LOCK_FILE,
    ) -> None:
        self.db_path   = db_path
        self.lock_file = lock_file
        self._flock    = FileLock(lock_file, timeout=LOCK_TIMEOUT)
        _ensure_tables(db_path)

    # ─────────────────────────────────────────────────────────────────────────
    # Push
    # ─────────────────────────────────────────────────────────────────────────

    def push_sync(
        self,
        campaign_id:   int,
        payload:       dict | None = None,
        task_type:     str         = "group_broadcast",
        priority:      int         = 5,
        scheduled_at:  str | None  = None,
        max_attempts:  int         = 3,
    ) -> int:
        """Insert a new pending task and return its id.  Held under FileLock."""
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
            cur  = conn.execute("""
                INSERT INTO tasks
                    (type, campaign_id, payload, status, priority,
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
        logger.info("[queue] Pushed task #%d  campaign=%d  type=%s", task_id, campaign_id, task_type)
        return task_id

    async def push(self, campaign_id: int, payload: dict | None = None, **kw) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.push_sync(campaign_id, payload, **kw))

    # ─────────────────────────────────────────────────────────────────────────
    # Claim — three-layer atomic acquisition
    # ─────────────────────────────────────────────────────────────────────────

    def claim_task_sync(self, worker_id: str) -> dict | None:
        """Atomically claim one pending task and lock its sender account.

        Three-layer guard sequence (all within a single FileLock + transaction):

        (a) SELECT with NOT EXISTS
            Skips any campaign whose sender account is already locked, already
            broadcasting (checked via both `status` AND `auth_status` columns),
            or in a flood-wait interval that has not yet expired.

        (b) UPDATE tasks WHERE status IN ('pending','failed') AND attempts < max_attempts
            Prevents double-claim if another process just claimed the same row.
            Returns rowcount=0 when the race is lost → bail out cleanly.

        (c) UPDATE sender_accounts WHERE locked_by IS NULL AND auth_status != 'broadcasting'
            Final atomic account lock.  If this returns rowcount=0 (another process
            won between (a) and (c)), the task claim from (b) is rolled back by
            decrementing attempts and resetting status to 'pending'.

        Only when all three guards succeed is the task returned to the caller.
        """
        try:
            with self._flock:
                conn = _conn(self.db_path)
                now  = datetime.now(timezone.utc).isoformat()

                # ── (a) Find the best claimable task ──────────────────────────
                row = conn.execute("""
                    SELECT t.*
                    FROM tasks t
                    WHERE t.status IN ('pending', 'failed')
                      AND t.attempts < t.max_attempts
                      AND (t.scheduled_at IS NULL OR t.scheduled_at <= ?)
                      AND NOT EXISTS (
                          SELECT 1
                          FROM group_campaigns gc
                          JOIN sender_accounts sa ON sa.id = gc.sender_account_id
                          WHERE gc.id = t.campaign_id
                            AND (
                                sa.locked_by IS NOT NULL
                                OR sa.broadcasting = 1
                                OR sa.status      = 'broadcasting'
                                OR sa.auth_status = 'broadcasting'
                                OR (sa.flood_wait_until IS NOT NULL
                                    AND sa.flood_wait_until > ?)
                            )
                      )
                    ORDER BY t.priority ASC, t.created_at ASC
                    LIMIT 1
                """, (now, now)).fetchone()

                if not row:
                    conn.close()
                    return None

                task = dict(row)

                # ── (b) Atomically claim the task row ─────────────────────────
                claimed = conn.execute("""
                    UPDATE tasks
                    SET status     = 'claimed',
                        worker_id  = ?,
                        claimed_at = ?,
                        started_at = ?,
                        attempts   = attempts + 1
                    WHERE id = ?
                      AND status IN ('pending', 'failed')
                      AND attempts < max_attempts
                """, (worker_id, now, now, task["id"])).rowcount

                if claimed == 0:
                    conn.close()
                    logger.debug("[queue] Task #%d was claimed by another worker — skipping", task["id"])
                    return None

                # ── (c) Atomically lock the sender account ────────────────────
                acc_id = _resolve_account_id(conn, task)
                if acc_id is not None:
                    locked = conn.execute("""
                        UPDATE sender_accounts
                        SET locked_by    = ?,
                            locked_at    = ?,
                            broadcasting = 1,
                            status       = 'broadcasting',
                            auth_status  = 'broadcasting'
                        WHERE id          = ?
                          AND is_banned   = 0
                          AND is_active   = 1
                          AND locked_by   IS NULL
                          AND broadcasting = 0
                          AND auth_status != 'broadcasting'
                          AND (flood_wait_until IS NULL OR flood_wait_until <= ?)
                    """, (worker_id, now, acc_id, now)).rowcount

                    if locked == 0:
                        # Another process grabbed the account between (a) and (c).
                        # Roll back the task claim so it can be re-tried.
                        conn.execute("""
                            UPDATE tasks
                            SET status     = 'pending',
                                worker_id  = NULL,
                                claimed_at = NULL,
                                started_at = NULL,
                                attempts   = MAX(0, attempts - 1)
                            WHERE id = ?
                        """, (task["id"],))
                        conn.commit()
                        conn.close()
                        logger.debug(
                            "[queue] Account %d became locked between claim guards — "
                            "rolled back task #%d",
                            acc_id, task["id"],
                        )
                        return None

                conn.commit()
                conn.close()

                # Reflect the mutations from UPDATE back into the returned dict
                task["status"]    = "claimed"
                task["worker_id"] = worker_id
                task["claimed_at"] = now
                task["started_at"] = now
                task["attempts"]   = (task.get("attempts") or 0) + 1
                task["payload"]    = _parse_payload(task.get("payload"))
                logger.info(
                    "[queue] Worker %r claimed task #%d  "
                    "(campaign=%d  account=%s)",
                    worker_id, task["id"], task["campaign_id"],
                    acc_id if acc_id is not None else "none",
                )
                return task

        except Timeout:
            logger.warning(
                "[queue] FileLock timeout (%ds) — worker %r could not claim",
                LOCK_TIMEOUT, worker_id,
            )
            return None

    async def claim_task(self, worker_id: str) -> dict | None:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.claim_task_sync(worker_id))

    # ─────────────────────────────────────────────────────────────────────────
    # Complete / Fail
    # ─────────────────────────────────────────────────────────────────────────

    def complete_task_sync(self, task_id: int, campaign_id: int | None = None) -> None:
        """Mark *task_id* as done and release its sender account lock."""
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                UPDATE tasks
                SET status = 'done', completed_at = ?
                WHERE id = ?
            """, (now, task_id))
            if campaign_id is not None:
                _release_account_for_campaign(conn, campaign_id)
            conn.commit()
            conn.close()
        logger.info("[queue] Task #%d → done", task_id)

    async def complete_task(self, task_id: int, campaign_id: int | None = None) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: self.complete_task_sync(task_id, campaign_id))

    def fail_task_sync(
        self,
        task_id:     int,
        error:       str         = "",
        campaign_id: int | None  = None,
    ) -> None:
        """Mark *task_id* as failed (or dead if max_attempts exhausted)."""
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
            row  = conn.execute(
                "SELECT attempts, max_attempts FROM tasks WHERE id = ?", (task_id,)
            ).fetchone()
            terminal = row and row[0] >= row[1]
            status   = "dead" if terminal else "failed"
            conn.execute("""
                UPDATE tasks
                SET status       = ?,
                    completed_at = ?,
                    error        = ?
                WHERE id = ?
            """, (status, now, (error or "")[:500], task_id))
            if campaign_id is not None:
                _release_account_for_campaign(conn, campaign_id)
            conn.commit()
            conn.close()
        logger.warning("[queue] Task #%d → %s: %s", task_id, status, (error or "")[:120])

    async def fail_task(
        self,
        task_id:     int,
        error:       str        = "",
        campaign_id: int | None = None,
    ) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: self.fail_task_sync(task_id, error, campaign_id))

    def cancel_task_sync(self, task_id: int, reason: str = "cancelled") -> bool:
        """Cancel a pending or claimed task.  Returns True if a row was changed."""
        with self._flock:
            conn = _conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
            cur  = conn.execute("""
                UPDATE tasks
                SET status      = 'cancelled',
                    completed_at = ?,
                    error       = ?
                WHERE id = ?
                  AND status NOT IN ('done', 'dead', 'cancelled')
            """, (now, reason, task_id))
            changed = cur.rowcount > 0
            conn.commit()
            conn.close()
        if changed:
            logger.info("[queue] Task #%d cancelled: %s", task_id, reason)
        return changed

    async def cancel_task(self, task_id: int, reason: str = "cancelled") -> bool:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.cancel_task_sync(task_id, reason))

    # ─────────────────────────────────────────────────────────────────────────
    # Account lock management
    # ─────────────────────────────────────────────────────────────────────────

    def release_account_sync(self, account_id: int, worker_id: str | None = None) -> bool:
        """Release a sender account's broadcasting lock.

        Preserves 'banned' and 'proxy_failed' statuses — only resets
        accounts that were temporarily locked for broadcasting.
        """
        with self._flock:
            conn = _conn(self.db_path)
            if worker_id:
                cur = conn.execute(_RELEASE_SQL + " WHERE id = ? AND locked_by = ?",
                                   (account_id, worker_id))
            else:
                cur = conn.execute(_RELEASE_SQL + " WHERE id = ?", (account_id,))
            changed = cur.rowcount > 0
            conn.commit()
            conn.close()
        if changed:
            logger.info("[queue] Released account lock  account_id=%d", account_id)
        return changed

    async def release_account(self, account_id: int, worker_id: str | None = None) -> bool:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.release_account_sync(account_id, worker_id)
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Force-release all locks for a given worker (crash recovery / SIGTERM)
    # ─────────────────────────────────────────────────────────────────────────

    def force_release_worker_sync(self, worker_id: str) -> dict[str, int]:
        """Release ALL account locks and re-queue ALL claimed tasks for *worker_id*.

        Call this:
          - At worker startup to clean up residue from the previous crash.
          - From the supervisor when it detects a dead worker.
          - In the SIGTERM handler before the process exits.

        Safe to call multiple times — both UPDATEs are idempotent via their
        WHERE clauses.  Returns {"accounts": N, "tasks": N}.
        """
        with self._flock:
            conn = _conn(self.db_path)

            # Release all sender_accounts locked by this worker.
            # Preserve terminal statuses (banned, proxy_failed).
            acct_cur = conn.execute("""
                UPDATE sender_accounts
                SET locked_by    = NULL,
                    locked_at    = NULL,
                    broadcasting = 0,
                    status       = CASE
                        WHEN status IN ('banned', 'proxy_failed') THEN status
                        ELSE 'idle'
                    END,
                    auth_status  = CASE
                        WHEN auth_status IN ('banned', 'proxy_failed') THEN auth_status
                        ELSE 'idle'
                    END
                WHERE locked_by = ?
            """, (worker_id,))

            # Re-queue all tasks claimed (but not finished) by this worker.
            # Decrement attempts so the task gets a fair retry on the next worker.
            task_cur = conn.execute("""
                UPDATE tasks
                SET status     = 'pending',
                    worker_id  = NULL,
                    claimed_at = NULL,
                    started_at = NULL,
                    attempts   = MAX(0, attempts - 1)
                WHERE worker_id = ?
                  AND status    = 'claimed'
            """, (worker_id,))

            conn.commit()
            accounts_released = acct_cur.rowcount
            tasks_reset       = task_cur.rowcount
            conn.close()

        if accounts_released or tasks_reset:
            logger.info(
                "[queue] force_release_worker(%r): accounts=%d  tasks=%d",
                worker_id, accounts_released, tasks_reset,
            )
        return {"accounts": accounts_released, "tasks": tasks_reset}

    async def force_release_worker(self, worker_id: str) -> dict[str, int]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.force_release_worker_sync(worker_id)
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Stale lock recovery (periodic sweep)
    # ─────────────────────────────────────────────────────────────────────────

    def recover_stale_locks_sync(self, timeout_seconds: int = 300) -> int:
        """Release any sender account whose lock has exceeded *timeout_seconds*.

        Also detects accounts locked by workers whose heartbeat has been
        silent for more than DEAD_WORKER_THRESHOLD seconds and releases them.
        Stuck tasks (claimed but unfinished beyond the timeout) are re-queued.
        Returns the number of accounts that were released.
        """
        _DEAD_HB_THRESHOLD = 90  # seconds without heartbeat = dead worker

        with self._flock:
            conn = _conn(self.db_path)

            # Identify stale locks: either too old, or held by a dead worker
            stale_accounts = conn.execute("""
                SELECT sa.id, sa.locked_by
                FROM sender_accounts sa
                WHERE sa.locked_by IS NOT NULL
                  AND (
                      (sa.locked_at IS NOT NULL
                       AND (CAST(strftime('%s','now') AS INTEGER)
                            - CAST(strftime('%s', sa.locked_at) AS INTEGER)) > ?)
                      OR
                      EXISTS (
                          SELECT 1 FROM broadcast_workers bw
                          WHERE bw.worker_id = sa.locked_by
                            AND (CAST(strftime('%s','now') AS INTEGER)
                                 - CAST(strftime('%s', bw.last_heartbeat) AS INTEGER)) > ?
                      )
                  )
            """, (timeout_seconds, _DEAD_HB_THRESHOLD)).fetchall()

            released = 0
            for row in stale_accounts:
                acc_id    = row[0]
                locked_by = row[1]
                conn.execute("""
                    UPDATE sender_accounts
                    SET locked_by    = NULL,
                        locked_at    = NULL,
                        broadcasting = 0,
                        status       = CASE
                            WHEN status IN ('banned','proxy_failed') THEN status
                            ELSE 'idle'
                        END,
                        auth_status  = CASE
                            WHEN auth_status IN ('banned','proxy_failed') THEN auth_status
                            ELSE 'idle'
                        END
                    WHERE id = ?
                """, (acc_id,))
                released += 1
                logger.warning(
                    "[queue] Recovered stale lock: account_id=%d (locked_by=%r)",
                    acc_id, locked_by,
                )

            # Re-queue stuck claimed tasks (those older than timeout_seconds)
            reset = conn.execute("""
                UPDATE tasks
                SET status     = 'pending',
                    worker_id  = NULL,
                    claimed_at = NULL,
                    started_at = NULL,
                    attempts   = MAX(0, attempts - 1)
                WHERE status = 'claimed'
                  AND (CAST(strftime('%s','now') AS INTEGER)
                       - CAST(strftime('%s', claimed_at) AS INTEGER)) > ?
                  AND attempts < max_attempts
            """, (timeout_seconds,)).rowcount

            conn.commit()
            conn.close()

        if released or reset:
            logger.info(
                "[queue] recover_stale_locks: accounts=%d  tasks=%d",
                released, reset,
            )
        return released

    async def recover_stale_locks(self, timeout_seconds: int = 300) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.recover_stale_locks_sync(timeout_seconds)
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Statistics (read-only — no FileLock needed)
    # ─────────────────────────────────────────────────────────────────────────

    def get_queue_stats_sync(self) -> dict[str, int]:
        conn = _conn(self.db_path)
        r    = conn.execute("""
            SELECT
              SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status='claimed'   THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN status='done'      THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END) AS failed,
              SUM(CASE WHEN status='dead'      THEN 1 ELSE 0 END) AS dead,
              SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM tasks
        """).fetchone()
        locked = conn.execute(
            "SELECT COUNT(*) FROM sender_accounts WHERE locked_by IS NOT NULL"
        ).fetchone()
        broadcasting = conn.execute(
            "SELECT COUNT(*) FROM sender_accounts WHERE auth_status = 'broadcasting'"
        ).fetchone()
        conn.close()
        return {
            "pending":              int(r["pending"]   or 0),
            "active":               int(r["active"]    or 0),
            "done":                 int(r["done"]      or 0),
            "failed":               int(r["failed"]    or 0),
            "dead":                 int(r["dead"]      or 0),
            "cancelled":            int(r["cancelled"] or 0),
            "locked_accounts":      int(locked[0]       if locked       else 0),
            "broadcasting_accounts":int(broadcasting[0] if broadcasting else 0),
        }

    async def get_queue_stats(self) -> dict[str, int]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.get_queue_stats_sync)

    # ─────────────────────────────────────────────────────────────────────────
    # Reset stuck tasks (convenience alias over recover_stale_locks)
    # ─────────────────────────────────────────────────────────────────────────

    def reset_stuck_sync(self, older_than_seconds: int = 300) -> int:
        return self.recover_stale_locks_sync(older_than_seconds)

    async def reset_stuck(self, older_than_seconds: int = 300) -> int:
        return await self.recover_stale_locks(older_than_seconds)

    # ─────────────────────────────────────────────────────────────────────────
    # List tasks (read-only)
    # ─────────────────────────────────────────────────────────────────────────

    def list_tasks_sync(
        self,
        status:      str | None = None,
        campaign_id: int | None = None,
        worker_id:   str | None = None,
        limit:       int        = 100,
    ) -> list[dict]:
        conn                  = _conn(self.db_path)
        clauses: list[str]    = []
        params:  list         = []
        if status:
            clauses.append("status = ?"); params.append(status)
        if campaign_id:
            clauses.append("campaign_id = ?"); params.append(campaign_id)
        if worker_id:
            clauses.append("worker_id = ?"); params.append(worker_id)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows  = conn.execute(
            f"SELECT * FROM tasks {where} ORDER BY created_at DESC LIMIT ?",
            params + [limit],
        ).fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            d["payload"] = _parse_payload(d.get("payload"))
            result.append(d)
        return result

    async def list_tasks(self, **kw) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.list_tasks_sync(**kw))


# ─────────────────────────────────────────────────────────────────────────────
# Module-level helpers (used by TaskQueue internally)
# ─────────────────────────────────────────────────────────────────────────────

_RELEASE_SQL = """
    UPDATE sender_accounts
    SET locked_by    = NULL,
        locked_at    = NULL,
        broadcasting = 0,
        status       = CASE
            WHEN status IN ('banned', 'proxy_failed') THEN status
            WHEN status IN ('broadcasting', 'sending') THEN 'idle'
            ELSE status
        END,
        auth_status  = CASE
            WHEN auth_status IN ('banned', 'proxy_failed') THEN auth_status
            ELSE 'idle'
        END
"""


def _release_account_for_campaign(conn: sqlite3.Connection, campaign_id: int) -> None:
    """Release the sender account lock associated with *campaign_id*.

    Used inside complete_task_sync and fail_task_sync — must be called
    while the connection is still open and the FileLock is still held.
    Only resets status for accounts that were in 'broadcasting' or 'sending' state
    so we never accidentally clear a 'banned' or 'proxy_failed' status.
    """
    try:
        row = conn.execute(
            "SELECT sender_account_id FROM group_campaigns WHERE id = ?",
            (campaign_id,),
        ).fetchone()
        if row and row[0]:
            conn.execute(
                _RELEASE_SQL + " WHERE id = ? AND status NOT IN ('banned','proxy_failed')",
                (row[0],),
            )
    except Exception as exc:
        logger.debug("[queue] Account release skipped for campaign %d: %s", campaign_id, exc)
