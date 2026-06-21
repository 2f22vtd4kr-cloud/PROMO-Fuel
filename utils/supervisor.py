"""Worker heartbeat daemon + multi-process supervisor.

WorkerHeartbeat
    Runs *inside* each worker process.  Writes a heartbeat row to
    broadcast_workers on a background thread every HEARTBEAT_INTERVAL seconds.
    The row tracks: status, current_task, tasks_done, tasks_failed, last_error.

WorkerSupervisor
    Runs in the *parent* process (main.py / orchestrator).  Spawns N
    worker subprocesses via subprocess.Popen, monitors their health every
    SUPERVISOR_POLL seconds, and:
      - Detects crashes (poll() returns non-None exit code).
      - Detects zombie processes (OS-alive but heartbeat stale).
      - Calls TaskQueue.force_release_worker_sync() on the dead worker BEFORE
        respawning, so its leased sender accounts return to 'idle' and its
        claimed tasks return to 'pending' immediately.
      - Applies exponential back-off between restarts (5s → 10s → 20s … 5 min).
      - Sends a Telegram CRITICAL alert when restart rate exceeds the threshold.
      - Escalates SIGTERM → SIGKILL after SIGKILL_TIMEOUT seconds.

Usage (in main.py):
    from utils.supervisor import WorkerSupervisor
    sup = WorkerSupervisor(worker_count=2)
    sup.start()   # non-blocking background thread
    ...
    sup.stop()    # graceful shutdown of all children

Usage (in worker.py):
    from utils.supervisor import WorkerHeartbeat
    hb = WorkerHeartbeat("worker-1")
    hb.start()
    hb.set_status("working", task_id=42)
    hb.record_done()
    hb.record_failed("FloodWait 60s")
    hb.stop()

Async helpers (for API routes):
    statuses = await get_worker_statuses()
    reaped   = await reap_dead_workers()
"""
from __future__ import annotations

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

DB_PATH             = os.getenv("DB_PATH", "campaigns.db")
HEARTBEAT_INTERVAL  = int(os.getenv("HEARTBEAT_INTERVAL",  "20"))  # seconds
WORKER_DEAD_TIMEOUT = int(os.getenv("WORKER_DEAD_TIMEOUT", "90"))  # seconds
SUPERVISOR_POLL     = int(os.getenv("SUPERVISOR_POLL",      "10"))  # seconds
SIGKILL_TIMEOUT     = int(os.getenv("SIGKILL_TIMEOUT",      "15"))  # secs after SIGTERM

_MAX_RESTART_BACKOFF = 300   # cap on back-off delay (5 minutes)
_MAX_RESTARTS        = 20    # give up after this many restarts per worker slot


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_conn(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def ensure_worker_table(db_path: str = DB_PATH) -> None:
    """Create broadcast_workers and worker_heartbeats tables if absent (idempotent)."""
    conn = _get_conn(db_path)
    conn.executescript("""
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

        CREATE TABLE IF NOT EXISTS worker_heartbeats (
            worker_id       TEXT PRIMARY KEY,
            last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
            status          TEXT NOT NULL DEFAULT 'idle',
            tasks_completed INTEGER NOT NULL DEFAULT 0,
            tasks_failed    INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_wh_last_seen ON worker_heartbeats(last_seen);
    """)
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# WorkerHeartbeat — lives inside each worker process
# ─────────────────────────────────────────────────────────────────────────────

class WorkerHeartbeat:
    """Sends regular heartbeat writes for a worker process to the DB.

    Runs on a daemon background thread so it never blocks the asyncio loop.
    The heartbeat is written to BOTH broadcast_workers (supervisor table) and
    worker_heartbeats (lightweight API table) so either can be queried.

    Thread safety: _status / _current_task / _tasks_done / _tasks_failed are
    updated and read under self._lock to prevent torn reads across threads.
    """

    def __init__(
        self,
        worker_id: str,
        db_path:   str = DB_PATH,
        interval:  int = HEARTBEAT_INTERVAL,
    ) -> None:
        self.worker_id = worker_id
        self.db_path   = db_path
        self.interval  = interval

        self._stop_evt     = threading.Event()
        self._thread:  threading.Thread | None = None
        self._lock         = threading.Lock()

        # Protected state (mutated via set_status / record_done / record_failed)
        self._status:        str           = "idle"
        self._current_task:  int | None    = None
        self._tasks_done:    int           = 0
        self._tasks_failed:  int           = 0
        self._last_error:    str | None    = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def start(self) -> None:
        """Register in the DB and start the background heartbeat thread."""
        ensure_worker_table(self.db_path)
        self._register()
        self._thread = threading.Thread(
            target=self._loop,
            name=f"hb-{self.worker_id}",
            daemon=True,
        )
        self._thread.start()
        logger.info("[heartbeat] %r registered (pid=%d)", self.worker_id, os.getpid())

    def stop(self) -> None:
        """Write a final 'stopped' heartbeat and shut down the background thread."""
        self._stop_evt.set()
        with self._lock:
            self._status = "stopped"
        self._beat()
        if self._thread:
            self._thread.join(timeout=5)

    # ── State transitions (called from the async worker loop) ─────────────────

    def set_status(self, status: str, task_id: int | None = None) -> None:
        """Update status and current task; triggers an immediate heartbeat."""
        with self._lock:
            self._status       = status
            self._current_task = task_id
        self._beat()

    def record_done(self) -> None:
        """Increment tasks_done counter and reset status to idle."""
        with self._lock:
            self._tasks_done  += 1
            self._status       = "idle"
            self._current_task = None
        self._beat()

    def record_failed(self, error: str | None = None) -> None:
        """Increment tasks_failed counter; optionally record the error message."""
        with self._lock:
            self._tasks_failed += 1
            self._status        = "idle"
            self._current_task  = None
            self._last_error    = (error or "")[:300] if error else None
        self._beat()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _register(self) -> None:
        """Upsert the worker's row in broadcast_workers on startup."""
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

    def _beat(self, *, override_error: str | None = None) -> None:
        """Write the current state to broadcast_workers and worker_heartbeats."""
        with self._lock:
            status        = self._status
            current_task  = self._current_task
            tasks_done    = self._tasks_done
            tasks_failed  = self._tasks_failed
            last_error    = override_error or self._last_error

        now = datetime.now(timezone.utc).isoformat()
        try:
            conn = _get_conn(self.db_path)
            # Primary registry row
            conn.execute("""
                UPDATE broadcast_workers
                SET status         = ?,
                    current_task   = ?,
                    tasks_done     = ?,
                    tasks_failed   = ?,
                    last_heartbeat = ?,
                    last_error     = COALESCE(?, last_error)
                WHERE worker_id = ?
            """, (status, current_task, tasks_done, tasks_failed, now, last_error, self.worker_id))

            # Lightweight heartbeat table (queried by the API)
            conn.execute("""
                INSERT INTO worker_heartbeats
                    (worker_id, last_seen, status, tasks_completed, tasks_failed)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(worker_id) DO UPDATE SET
                    last_seen       = excluded.last_seen,
                    status          = excluded.status,
                    tasks_completed = excluded.tasks_completed,
                    tasks_failed    = excluded.tasks_failed
            """, (self.worker_id, now, status, tasks_done, tasks_failed))

            conn.commit()
            conn.close()
        except Exception as exc:
            logger.warning("[heartbeat] %r beat failed: %s", self.worker_id, exc)

    def _loop(self) -> None:
        """Background thread: write heartbeat every self.interval seconds."""
        while not self._stop_evt.wait(self.interval):
            self._beat()


# ─────────────────────────────────────────────────────────────────────────────
# Async helpers for API routes / monitoring
# ─────────────────────────────────────────────────────────────────────────────

async def get_worker_statuses(db_path: str = DB_PATH) -> list[dict]:
    """Return all rows from broadcast_workers, newest started first."""
    def _sync() -> list[dict]:
        ensure_worker_table(db_path)
        conn = _get_conn(db_path)
        rows = conn.execute(
            "SELECT * FROM broadcast_workers ORDER BY started_at DESC"
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    return await asyncio.get_event_loop().run_in_executor(None, _sync)


async def reap_dead_workers(
    db_path:  str = DB_PATH,
    timeout:  int = WORKER_DEAD_TIMEOUT,
) -> int:
    """Mark workers whose heartbeat is stale as 'dead' and release their locks.

    This is the async counterpart to the supervisor's synchronous zombie reaper.
    Call it from API routes or scheduled tasks.

    For each dead worker found:
      1. Mark broadcast_workers.status = 'dead'.
      2. Call TaskQueue.force_release_worker_sync() to release account locks
         and re-queue claimed tasks.

    Returns the number of workers reaped.
    """
    def _sync() -> int:
        # Import here to avoid circular imports at module level
        from task_queue import TaskQueue  # noqa: PLC0415

        conn = _get_conn(db_path)
        dead_rows = conn.execute("""
            SELECT worker_id FROM broadcast_workers
            WHERE status NOT IN ('dead', 'stopped')
              AND (CAST(strftime('%s','now') AS INTEGER)
                   - CAST(strftime('%s', last_heartbeat) AS INTEGER)) > ?
        """, (timeout,)).fetchall()

        reaped = 0
        for row in dead_rows:
            wid = row[0]
            conn.execute(
                "UPDATE broadcast_workers SET status = 'dead' WHERE worker_id = ?",
                (wid,),
            )
            conn.commit()
            # Release stale locks for this dead worker using the FileLock-protected path
            try:
                tq = TaskQueue(db_path=db_path)
                result = tq.force_release_worker_sync(wid)
                logger.warning(
                    "[supervisor] Reaped dead worker %r — released %d accounts, "
                    "re-queued %d tasks",
                    wid, result["accounts"], result["tasks"],
                )
            except Exception as exc:
                logger.error("[supervisor] Lock release failed for dead worker %r: %s", wid, exc)
            reaped += 1

        conn.close()
        return reaped

    count = await asyncio.get_event_loop().run_in_executor(None, _sync)
    return count


# ─────────────────────────────────────────────────────────────────────────────
# _WorkerSlot — internal bookkeeping for one named worker process
# ─────────────────────────────────────────────────────────────────────────────

class _WorkerSlot:
    """Tracks one logical worker slot (name + subprocess handle + back-off state)."""
    __slots__ = (
        "worker_id", "proc", "restart_count", "last_spawn_ts",
        "backoff", "sigterm_sent_at",
    )

    def __init__(self, worker_id: str) -> None:
        self.worker_id:       str                        = worker_id
        self.proc:            subprocess.Popen | None    = None
        self.restart_count:   int                        = 0
        self.last_spawn_ts:   float                      = 0.0
        self.backoff:         float                      = 5.0   # initial back-off seconds
        self.sigterm_sent_at: float                      = 0.0   # monotonic ts of last SIGTERM


# ─────────────────────────────────────────────────────────────────────────────
# WorkerSupervisor — parent-process process manager
# ─────────────────────────────────────────────────────────────────────────────

class WorkerSupervisor:
    """Spawns and monitors N worker subprocesses.

    Dead-worker cleanup
    -------------------
    When the supervisor detects that a worker process has exited or become a
    zombie (OS-alive but heartbeat stale), it calls
    TaskQueue.force_release_worker_sync(worker_id) BEFORE spawning a replacement.

    This single call:
      - Unlocks all sender_accounts held by that worker (status/auth_status → 'idle').
      - Re-queues all tasks that were in 'claimed' state for that worker.

    Without this step those accounts and tasks would stay locked until either
    the next periodic recover_stale_locks sweep or a manual admin action.

    Crash-loop protection
    ---------------------
    If a worker restarts more than *max_respawns_per_window* times within
    *respawn_window_seconds*, a CRITICAL log entry is emitted and a Telegram
    message is sent to OWNER_IDS.

    Graceful shutdown
    -----------------
    stop() sends SIGTERM to all workers.  Any that don't exit within *timeout*
    seconds receive SIGKILL.
    """

    def __init__(
        self,
        worker_count:            int         = 2,
        db_path:                 str         = DB_PATH,
        worker_ids:              list[str] | None = None,
        max_respawns_per_window: int         = 5,
        respawn_window_seconds:  int         = 600,
    ) -> None:
        ids = worker_ids or [f"worker-{i+1}" for i in range(worker_count)]

        self._slots:           list[_WorkerSlot]          = [_WorkerSlot(wid) for wid in ids]
        self._db_path:         str                        = db_path
        self._stop_evt:        threading.Event            = threading.Event()
        self._thread:          threading.Thread | None    = None
        self._max_respawns:    int                        = max_respawns_per_window
        self._respawn_window:  int                        = respawn_window_seconds
        self._respawn_history: dict[str, list[float]]     = {wid: [] for wid in ids}

    # ── Public API ────────────────────────────────────────────────────────────

    def start(self) -> None:
        """Spawn all workers and begin monitoring in a background thread."""
        logger.info("[supervisor] Starting %d worker(s): %s",
                    len(self._slots), [s.worker_id for s in self._slots])
        for slot in self._slots:
            self._spawn(slot)
        self._thread = threading.Thread(
            target=self._monitor_loop,
            name="worker-supervisor",
            daemon=True,
        )
        self._thread.start()

    def stop(self, timeout: float = 15.0) -> None:
        """Gracefully stop all workers; SIGKILL any that don't respond in time."""
        logger.info("[supervisor] Stopping all workers...")
        self._stop_evt.set()

        for slot in self._slots:
            if slot.proc and slot.proc.poll() is None:
                try:
                    slot.proc.send_signal(signal.SIGTERM)
                    slot.sigterm_sent_at = time.monotonic()
                except Exception:
                    pass

        deadline = time.monotonic() + timeout
        for slot in self._slots:
            if not slot.proc:
                continue
            remaining = max(0.1, deadline - time.monotonic())
            try:
                slot.proc.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                logger.warning(
                    "[supervisor] %r did not exit in %.0fs — sending SIGKILL",
                    slot.worker_id, timeout,
                )
                try:
                    slot.proc.kill()
                    slot.proc.wait(timeout=5)
                except Exception:
                    pass

        if self._thread:
            self._thread.join(timeout=5)
        logger.info("[supervisor] All workers stopped")

    def alive_count(self) -> int:
        """Return the number of worker slots that currently have a live process."""
        return sum(1 for s in self._slots if s.proc and s.proc.poll() is None)

    # ── Internal: spawn ───────────────────────────────────────────────────────

    def _spawn(self, slot: _WorkerSlot) -> None:
        """Launch a fresh worker.py subprocess for the given slot."""
        try:
            cmd = [sys.executable, "worker.py", slot.worker_id, "--db", self._db_path]
            proc = subprocess.Popen(
                cmd,
                stdout=None,
                stderr=None,
                cwd=os.getcwd(),
                env=os.environ.copy(),
            )
            slot.proc           = proc
            slot.last_spawn_ts  = time.monotonic()
            slot.sigterm_sent_at = 0.0
            logger.info(
                "[supervisor] Spawned %r  pid=%d  restart=#%d",
                slot.worker_id, proc.pid, slot.restart_count,
            )
        except Exception as exc:
            logger.error("[supervisor] Failed to spawn %r: %s", slot.worker_id, exc)
            slot.proc = None

    # ── Internal: dead-worker cleanup ─────────────────────────────────────────

    def _release_dead_worker(self, worker_id: str) -> None:
        """Release DB locks held by a dead worker before respawning its slot.

        Imports TaskQueue locally to avoid a circular-import at module level
        (supervisor → task_queue is fine; task_queue does not import supervisor).

        The force_release_worker_sync call:
          - Sets sender_accounts.locked_by = NULL, auth_status = 'idle',
            broadcasting = 0  for every account owned by worker_id.
          - Resets tasks to 'pending' (attempts-1) for every claimed task
            owned by worker_id.

        This must complete before _spawn() so that the replacement worker
        can immediately claim the freed accounts and tasks.
        """
        try:
            from task_queue import TaskQueue  # noqa: PLC0415
            tq     = TaskQueue(db_path=self._db_path)
            result = tq.force_release_worker_sync(worker_id)
            if result["accounts"] or result["tasks"]:
                logger.info(
                    "[supervisor] Released dead worker %r: "
                    "accounts=%d  tasks=%d",
                    worker_id, result["accounts"], result["tasks"],
                )
        except Exception as exc:
            logger.error(
                "[supervisor] Could not release locks for dead worker %r: %s",
                worker_id, exc,
            )

    # ── Internal: zombie detection ────────────────────────────────────────────

    def _is_zombie(self, slot: _WorkerSlot) -> bool:
        """Return True if the process appears alive but its DB heartbeat is stale.

        A zombie happens when a worker's asyncio loop is deadlocked (e.g., a
        coroutine hung in a blocking Telethon call) but the OS process is still
        running.  We detect it by comparing now with the last heartbeat in the
        broadcast_workers table.
        """
        if not slot.proc or slot.proc.poll() is not None:
            return False
        try:
            conn = _get_conn(self._db_path)
            row  = conn.execute("""
                SELECT CAST(strftime('%s','now') AS INTEGER)
                     - CAST(strftime('%s', last_heartbeat) AS INTEGER) AS age_s
                FROM broadcast_workers
                WHERE worker_id = ?
            """, (slot.worker_id,)).fetchone()
            conn.close()
            if row and row["age_s"] is not None and row["age_s"] > (WORKER_DEAD_TIMEOUT * 2):
                logger.warning(
                    "[supervisor] %r looks like zombie — proc alive but heartbeat "
                    "is %ds old (threshold=%ds)",
                    slot.worker_id, row["age_s"], WORKER_DEAD_TIMEOUT * 2,
                )
                return True
        except Exception:
            pass
        return False

    # ── Internal: SIGTERM / SIGKILL ───────────────────────────────────────────

    def _kill_slot(self, slot: _WorkerSlot) -> None:
        """Send SIGTERM to a process; _maybe_sigkill escalates later if needed."""
        if not slot.proc or slot.proc.poll() is not None:
            return
        try:
            slot.proc.send_signal(signal.SIGTERM)
            slot.sigterm_sent_at = time.monotonic()
        except Exception:
            pass

    def _maybe_sigkill(self, slot: _WorkerSlot) -> None:
        """Escalate to SIGKILL if SIGTERM was sent SIGKILL_TIMEOUT seconds ago."""
        if (
            slot.sigterm_sent_at > 0
            and slot.proc
            and slot.proc.poll() is None
            and time.monotonic() - slot.sigterm_sent_at > SIGKILL_TIMEOUT
        ):
            logger.warning(
                "[supervisor] %r did not exit %ds after SIGTERM — SIGKILL",
                slot.worker_id, SIGKILL_TIMEOUT,
            )
            try:
                slot.proc.kill()
            except Exception:
                pass
            slot.sigterm_sent_at = 0.0

    # ── Internal: crash-loop alert ────────────────────────────────────────────

    def _send_critical_alert(self, worker_id: str, count: int) -> None:
        token    = os.getenv("TELEGRAM_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", ""))
        chat_ids = [
            x for x in
            os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",")
            if x.strip().lstrip("-").isdigit()
        ]
        if not token or not chat_ids:
            return

        raw_text = (
            f"🚨 CRITICAL — crash loop detected\n"
            f"Worker: {worker_id}\n"
            f"Restarted {count}× in the last {self._respawn_window}s\n"
            f"Check logs immediately."
        )

        # Rate-limit crash-loop alerts: at most one per worker per 30 minutes.
        # Any alerts fired during the cooldown window are counted and surfaced
        # in the next message as a suppression note.
        try:
            from utils.alert_cooldown import CrashAlertCooldown  # noqa: PLC0415
            decision = CrashAlertCooldown(
                db_path        = self._db_path,
                default_window = 1800,   # 30 minutes
            ).check("crash_loop", worker_id, raw_text)
            if not decision.should_fire:
                return
            text = decision.message
        except Exception:
            # Fail-open: if the cooldown module fails, still send the alert.
            text = raw_text

        try:
            import urllib.request, urllib.parse  # noqa: PLC0415
            data = urllib.parse.urlencode({"chat_id": chat_ids[0], "text": text}).encode()
            req  = urllib.request.Request(
                f"https://api.telegram.org/bot{token}/sendMessage",
                data=data, method="POST",
            )
            urllib.request.urlopen(req, timeout=8)
        except Exception:
            pass

    # ── Internal: main monitoring loop ────────────────────────────────────────

    def _monitor_loop(self) -> None:
        """Background thread: inspect every worker slot every SUPERVISOR_POLL seconds.

        For each slot the loop performs these checks in order:
          1. Escalate SIGTERM → SIGKILL if needed.
          2. Zombie check — SIGTERM and skip to let the next iteration respawn.
          3. Dead-process check (poll() returns exit code):
             a. Release stale DB locks via force_release_worker_sync().
             b. Apply exponential back-off.
             c. Check crash-loop threshold.
             d. Spawn a replacement.
          4. Healthy process — decay back-off on long uptime.
        """
        while not self._stop_evt.wait(SUPERVISOR_POLL):
            for slot in self._slots:
                if self._stop_evt.is_set():
                    return

                # 1. Escalate SIGTERM → SIGKILL if process is lingering
                self._maybe_sigkill(slot)

                # 2. Zombie detection
                if self._is_zombie(slot):
                    self._kill_slot(slot)
                    # Don't release DB locks yet — wait for the process to actually
                    # exit so poll() != None, then release in the dead-process branch.
                    continue

                proc = slot.proc
                is_dead = proc is None or proc.poll() is not None

                if is_dead:
                    exit_code = proc.returncode if proc is not None else None
                    if exit_code is not None:
                        logger.warning(
                            "[supervisor] %r exited (code=%s)", slot.worker_id, exit_code
                        )

                    # ── 3a. Release stale DB locks BEFORE respawning ──────────
                    self._release_dead_worker(slot.worker_id)

                    if slot.restart_count >= _MAX_RESTARTS:
                        logger.error(
                            "[supervisor] %r exceeded max restarts (%d), giving up",
                            slot.worker_id, _MAX_RESTARTS,
                        )
                        continue

                    # ── 3b. Exponential back-off ──────────────────────────────
                    elapsed = time.monotonic() - slot.last_spawn_ts
                    if elapsed < slot.backoff:
                        wait = slot.backoff - elapsed
                        logger.info(
                            "[supervisor] %r back-off %.0fs before restart",
                            slot.worker_id, wait,
                        )
                        self._stop_evt.wait(wait)   # interruptible by stop()
                        if self._stop_evt.is_set():
                            return

                    slot.restart_count += 1
                    slot.backoff        = min(slot.backoff * 2, _MAX_RESTART_BACKOFF)

                    # ── 3c. Crash-loop threshold check ────────────────────────
                    now_ts   = time.monotonic()
                    history  = self._respawn_history.get(slot.worker_id, [])
                    history  = [t for t in history if now_ts - t <= self._respawn_window]
                    history.append(now_ts)
                    self._respawn_history[slot.worker_id] = history

                    if len(history) >= self._max_respawns:
                        logger.critical(
                            "[supervisor] 🚨 %r restarted %d× in %.0fs — crash loop!",
                            slot.worker_id, len(history), self._respawn_window,
                        )
                        self._send_critical_alert(slot.worker_id, len(history))

                    # ── 3d. Spawn replacement ─────────────────────────────────
                    self._spawn(slot)

                else:
                    # 4. Process is healthy — decay back-off after sustained uptime
                    uptime = time.monotonic() - slot.last_spawn_ts
                    if uptime > 120 and slot.backoff > 5.0:
                        slot.backoff = max(5.0, slot.backoff / 2)
