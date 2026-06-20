"""Worker heartbeat + multi-process supervisor.

WorkerHeartbeat — used inside worker.py to write regular heartbeats to the DB.

WorkerSupervisor — used in main.py to spawn N worker subprocesses, monitor
them, and automatically restart any that crash, with exponential back-off.

Usage (in main.py):
    from utils.supervisor import WorkerSupervisor
    sup = WorkerSupervisor(worker_count=2, db_path="campaigns.db")
    sup.start()   # non-blocking — runs in a background thread
    ...
    sup.stop()    # graceful shutdown of all child workers

Usage (in worker.py):
    from utils.supervisor import WorkerHeartbeat
    hb = WorkerHeartbeat("worker-1")
    hb.start()
    ...
    hb.stop()
"""
import asyncio
import logging
import os
import signal
import sqlite3
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DB_PATH              = os.getenv("DB_PATH", "campaigns.db")
HEARTBEAT_INTERVAL   = int(os.getenv("HEARTBEAT_INTERVAL",   "20"))   # seconds
WORKER_DEAD_TIMEOUT  = int(os.getenv("WORKER_DEAD_TIMEOUT",  "90"))   # seconds
SUPERVISOR_POLL      = int(os.getenv("SUPERVISOR_POLL",       "15"))   # seconds


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_conn(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def ensure_worker_table(db_path: str = DB_PATH) -> None:
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


# ─────────────────────────────────────────────────────────────────────────────
# WorkerHeartbeat — runs inside each worker process
# ─────────────────────────────────────────────────────────────────────────────

class WorkerHeartbeat:
    """Sends regular heartbeats for a worker to the broadcast_workers table."""

    def __init__(self, worker_id: str, db_path: str = DB_PATH,
                 interval: int = HEARTBEAT_INTERVAL):
        self.worker_id = worker_id
        self.db_path   = db_path
        self.interval  = interval
        self._stop_evt = threading.Event()
        self._thread:  threading.Thread | None = None
        self._status        = "idle"
        self._current_task: int | None = None
        self._tasks_done    = 0
        self._tasks_failed  = 0

    # ── Public API ────────────────────────────────────────────────────────────

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
        self._update_db("stopped")
        if self._thread:
            self._thread.join(timeout=5)

    def set_status(self, status: str, task_id: int | None = None) -> None:
        self._status       = status
        self._current_task = task_id
        self._beat()

    def record_done(self) -> None:
        self._tasks_done  += 1
        self._status       = "idle"
        self._current_task = None
        self._beat()

    def record_failed(self, error: str | None = None) -> None:
        self._tasks_failed += 1
        self._status        = "idle"
        self._current_task  = None
        self._beat(last_error=error)

    # ── Internal ──────────────────────────────────────────────────────────────

    def _register(self) -> None:
        conn = _get_conn(self.db_path)
        now  = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT INTO broadcast_workers
                (worker_id, pid, status, current_task, tasks_done, tasks_failed,
                 started_at, last_heartbeat)
            VALUES (?, ?, 'idle', NULL, 0, 0, ?, ?)
            ON CONFLICT(worker_id) DO UPDATE SET
                pid            = excluded.pid,
                status         = 'idle',
                current_task   = NULL,
                started_at     = excluded.started_at,
                last_heartbeat = excluded.last_heartbeat
        """, (self.worker_id, os.getpid(), now, now))
        conn.commit()
        conn.close()

    def _beat(self, last_error: str | None = None) -> None:
        try:
            conn = _get_conn(self.db_path)
            now  = datetime.now(timezone.utc).isoformat()
            extra_col = ", last_error=?" if last_error else ""
            params: list = [
                self._status, self._current_task,
                self._tasks_done, self._tasks_failed, now,
            ]
            if last_error:
                params.append(last_error[:300])
            params.append(self.worker_id)
            conn.execute(f"""
                UPDATE broadcast_workers
                SET status=?, current_task=?, tasks_done=?, tasks_failed=?,
                    last_heartbeat=?{extra_col}
                WHERE worker_id=?
            """, params)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"[heartbeat] Beat failed for {self.worker_id}: {e}")

    def _update_db(self, status: str) -> None:
        self._status = status
        self._beat()

    def _loop(self) -> None:
        while not self._stop_evt.wait(self.interval):
            self._beat()


# ─────────────────────────────────────────────────────────────────────────────
# Async helpers for API / monitoring
# ─────────────────────────────────────────────────────────────────────────────

async def get_worker_statuses(db_path: str = DB_PATH) -> list[dict]:
    def _sync():
        ensure_worker_table(db_path)
        conn  = _get_conn(db_path)
        rows  = conn.execute(
            "SELECT * FROM broadcast_workers ORDER BY started_at DESC"
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    return await asyncio.get_event_loop().run_in_executor(None, _sync)


async def reap_dead_workers(
    db_path: str = DB_PATH,
    timeout: int = WORKER_DEAD_TIMEOUT,
) -> int:
    """Mark workers whose last_heartbeat is older than `timeout` seconds as 'dead'."""
    def _sync():
        conn = _get_conn(db_path)
        cur  = conn.execute("""
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


# ─────────────────────────────────────────────────────────────────────────────
# WorkerSupervisor — spawns and monitors worker subprocesses
# ─────────────────────────────────────────────────────────────────────────────

_MAX_RESTART_BACKOFF = 300   # max seconds between restarts (5 min)
_MAX_RESTARTS        = 20    # give up after this many restarts per worker slot


class _WorkerSlot:
    """Tracks one logical worker slot (name + subprocess handle)."""
    __slots__ = ("worker_id", "proc", "restart_count", "last_restart_ts", "backoff")

    def __init__(self, worker_id: str):
        self.worker_id       = worker_id
        self.proc:           subprocess.Popen | None = None
        self.restart_count   = 0
        self.last_restart_ts = 0.0
        self.backoff         = 5.0  # seconds, doubles on each restart


class WorkerSupervisor:
    """Spawns N worker subprocesses and restarts them if they crash.

    Uses exponential back-off (5s → 10s → 20s … capped at 5 min).
    Stops restarting a slot after _MAX_RESTARTS consecutive crashes.

    Args:
        worker_count: Number of worker processes to maintain.
        db_path:      Path to the SQLite database.
        worker_ids:   Optional explicit list of worker IDs.
                      Defaults to ["worker-1", "worker-2", ...].
    """

    def __init__(
        self,
        worker_count: int = 2,
        db_path: str = DB_PATH,
        worker_ids: list[str] | None = None,
    ):
        if worker_ids:
            ids = worker_ids
        else:
            ids = [f"worker-{i+1}" for i in range(worker_count)]

        self._slots    = [_WorkerSlot(wid) for wid in ids]
        self._db_path  = db_path
        self._stop_evt = threading.Event()
        self._thread:  threading.Thread | None = None

    # ── Public API ────────────────────────────────────────────────────────────

    def start(self) -> None:
        """Start all workers and begin monitoring in a daemon thread."""
        logger.info(f"[supervisor] Starting {len(self._slots)} worker(s)")
        for slot in self._slots:
            self._spawn(slot)
        self._thread = threading.Thread(
            target=self._monitor_loop, name="worker-supervisor", daemon=True
        )
        self._thread.start()

    def stop(self, timeout: float = 10.0) -> None:
        """Signal all workers to stop and wait for them."""
        logger.info("[supervisor] Stopping all workers...")
        self._stop_evt.set()
        for slot in self._slots:
            if slot.proc and slot.proc.poll() is None:
                try:
                    slot.proc.send_signal(signal.SIGTERM)
                except Exception:
                    pass
        # Wait for processes to exit
        deadline = time.monotonic() + timeout
        for slot in self._slots:
            if slot.proc:
                remaining = max(0.0, deadline - time.monotonic())
                try:
                    slot.proc.wait(timeout=remaining)
                except subprocess.TimeoutExpired:
                    try:
                        slot.proc.kill()
                    except Exception:
                        pass
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("[supervisor] All workers stopped")

    def alive_count(self) -> int:
        return sum(1 for s in self._slots if s.proc and s.proc.poll() is None)

    # ── Internal ──────────────────────────────────────────────────────────────

    def _spawn(self, slot: _WorkerSlot) -> None:
        """Launch a worker subprocess for the given slot."""
        try:
            cmd = [
                sys.executable, "worker.py", slot.worker_id,
                "--db", self._db_path,
            ]
            proc = subprocess.Popen(
                cmd,
                stdout=None,   # inherit — worker logs to stdout
                stderr=None,
                cwd=os.getcwd(),
                env=os.environ.copy(),
            )
            slot.proc            = proc
            slot.last_restart_ts = time.monotonic()
            logger.info(f"[supervisor] Spawned {slot.worker_id!r} (pid={proc.pid}, "
                        f"restart #{slot.restart_count})")
        except Exception as e:
            logger.error(f"[supervisor] Failed to spawn {slot.worker_id!r}: {e}")
            slot.proc = None

    def _monitor_loop(self) -> None:
        while not self._stop_evt.wait(SUPERVISOR_POLL):
            for slot in self._slots:
                if self._stop_evt.is_set():
                    break

                proc = slot.proc
                if proc is None or proc.poll() is not None:
                    # Process exited or never started
                    exit_code = proc.returncode if proc else None
                    if exit_code is not None:
                        logger.warning(
                            f"[supervisor] {slot.worker_id!r} exited (code={exit_code})"
                        )

                    if slot.restart_count >= _MAX_RESTARTS:
                        logger.error(
                            f"[supervisor] {slot.worker_id!r} exceeded max restarts "
                            f"({_MAX_RESTARTS}), giving up"
                        )
                        continue

                    # Exponential back-off
                    now    = time.monotonic()
                    waited = now - slot.last_restart_ts
                    if waited < slot.backoff:
                        remaining = slot.backoff - waited
                        logger.info(
                            f"[supervisor] {slot.worker_id!r} back-off {remaining:.0f}s "
                            f"before restart"
                        )
                        time.sleep(remaining)

                    slot.restart_count += 1
                    slot.backoff = min(slot.backoff * 2, _MAX_RESTART_BACKOFF)
                    self._spawn(slot)
                else:
                    # Process is alive — reset back-off on sustained health
                    uptime = time.monotonic() - slot.last_restart_ts
                    if uptime > 120:   # running for 2+ min → considered healthy
                        slot.restart_count = max(0, slot.restart_count - 1)
                        slot.backoff       = max(5.0, slot.backoff / 2)
