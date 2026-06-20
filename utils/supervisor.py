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
SUPERVISOR_POLL      = int(os.getenv("SUPERVISOR_POLL",       "10"))   # seconds
SIGKILL_TIMEOUT      = int(os.getenv("SIGKILL_TIMEOUT",       "15"))   # secs after SIGTERM


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
    __slots__ = (
        "worker_id", "proc", "restart_count", "last_restart_ts",
        "backoff", "sigterm_sent_at",
    )

    def __init__(self, worker_id: str):
        self.worker_id         = worker_id
        self.proc:             subprocess.Popen | None = None
        self.restart_count     = 0
        self.last_restart_ts   = 0.0
        self.backoff           = 5.0   # seconds, doubles on each restart
        self.sigterm_sent_at   = 0.0   # monotonic time when last SIGTERM was sent


class WorkerSupervisor:
    """Spawns N worker subprocesses and restarts them if they crash.

    Crash handling:
      - Exponential back-off (5s → 10s → 20s … capped at 5 min)
      - SIGKILL fallback: if a worker doesn't exit within SIGKILL_TIMEOUT
        seconds after SIGTERM, it is force-killed
      - Heartbeat zombie detection: if a worker process is "alive" (poll()
        returns None) but its DB heartbeat is stale for >2×WORKER_DEAD_TIMEOUT,
        it is treated as a zombie and SIGKILL'd

    Respawn rate limiting:
      - If a worker restarts more than `max_respawns_per_window` times within
        `respawn_window_seconds`, a CRITICAL alert is logged and a Telegram
        notification is sent.
    """

    def __init__(
        self,
        worker_count: int = 2,
        db_path: str = DB_PATH,
        worker_ids: list[str] | None = None,
        max_respawns_per_window: int = 5,
        respawn_window_seconds: int = 600,
    ):
        if worker_ids:
            ids = worker_ids
        else:
            ids = [f"worker-{i+1}" for i in range(worker_count)]

        self._slots                  = [_WorkerSlot(wid) for wid in ids]
        self._db_path                = db_path
        self._stop_evt               = threading.Event()
        self._thread:  threading.Thread | None = None
        self._max_respawns           = max_respawns_per_window
        self._respawn_window         = respawn_window_seconds
        self._respawn_history: dict[str, list[float]] = {wid: [] for wid in ids}

    # ── Public API ────────────────────────────────────────────────────────────

    def start(self) -> None:
        logger.info(f"[supervisor] Starting {len(self._slots)} worker(s)")
        for slot in self._slots:
            self._spawn(slot)
        self._thread = threading.Thread(
            target=self._monitor_loop, name="worker-supervisor", daemon=True
        )
        self._thread.start()

    def stop(self, timeout: float = 15.0) -> None:
        """Signal all workers to stop; SIGKILL any that don't respond in time."""
        logger.info("[supervisor] Stopping all workers...")
        self._stop_evt.set()

        # Send SIGTERM to all running workers
        for slot in self._slots:
            if slot.proc and slot.proc.poll() is None:
                try:
                    slot.proc.send_signal(signal.SIGTERM)
                    slot.sigterm_sent_at = time.monotonic()
                except Exception:
                    pass

        # Wait up to timeout, then SIGKILL stragglers
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
        return sum(1 for s in self._slots if s.proc and s.proc.poll() is None)

    # ── Internal ──────────────────────────────────────────────────────────────

    def _send_critical_alert(self, worker_id: str, count: int) -> None:
        token    = os.getenv("TELEGRAM_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", ""))
        chat_ids = [
            x for x in os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",")
            if x.strip().lstrip("-").isdigit()
        ]
        if not token or not chat_ids:
            return
        try:
            import urllib.request, urllib.parse
            text = (
                f"🚨 CRITICAL — crash loop detected\n"
                f"Worker: {worker_id}\n"
                f"Restarted {count}× in {self._respawn_window}s\n"
                f"Check logs immediately."
            )
            data = urllib.parse.urlencode({
                "chat_id": chat_ids[0],
                "text":    text,
            }).encode()
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{token}/sendMessage",
                data=data, method="POST",
            )
            urllib.request.urlopen(req, timeout=8)
        except Exception:
            pass

    def _spawn(self, slot: _WorkerSlot) -> None:
        try:
            cmd = [
                sys.executable, "worker.py", slot.worker_id,
                "--db", self._db_path,
            ]
            proc = subprocess.Popen(
                cmd,
                stdout=None,
                stderr=None,
                cwd=os.getcwd(),
                env=os.environ.copy(),
            )
            slot.proc            = proc
            slot.last_restart_ts = time.monotonic()
            slot.sigterm_sent_at = 0.0
            logger.info(
                "[supervisor] Spawned %r (pid=%d, restart #%d)",
                slot.worker_id, proc.pid, slot.restart_count,
            )
        except Exception as e:
            logger.error("[supervisor] Failed to spawn %r: %s", slot.worker_id, e)
            slot.proc = None

    def _check_zombie(self, slot: _WorkerSlot) -> bool:
        """Return True if process is "alive" but heartbeat is stale — zombie check."""
        if not slot.proc or slot.proc.poll() is not None:
            return False
        try:
            conn = _get_conn(self._db_path)
            row  = conn.execute("""
                SELECT CAST(strftime('%s','now') AS INTEGER)
                     - CAST(strftime('%s', last_heartbeat) AS INTEGER) AS age
                FROM broadcast_workers
                WHERE worker_id=?
            """, (slot.worker_id,)).fetchone()
            conn.close()
            if row and row["age"] is not None and row["age"] > (WORKER_DEAD_TIMEOUT * 2):
                logger.warning(
                    "[supervisor] %r looks zombie (proc alive but hb stale %ds)",
                    slot.worker_id, row["age"],
                )
                return True
        except Exception:
            pass
        return False

    def _kill_slot(self, slot: _WorkerSlot) -> None:
        """Send SIGTERM, then SIGKILL after SIGKILL_TIMEOUT if still alive."""
        if not slot.proc or slot.proc.poll() is not None:
            return
        try:
            slot.proc.send_signal(signal.SIGTERM)
            slot.sigterm_sent_at = time.monotonic()
        except Exception:
            pass

    def _maybe_sigkill(self, slot: _WorkerSlot) -> None:
        """If SIGTERM was sent long ago and process is still alive, SIGKILL."""
        if (
            slot.sigterm_sent_at > 0
            and slot.proc
            and slot.proc.poll() is None
            and time.monotonic() - slot.sigterm_sent_at > SIGKILL_TIMEOUT
        ):
            logger.warning(
                "[supervisor] %r did not exit %ds after SIGTERM — sending SIGKILL",
                slot.worker_id, SIGKILL_TIMEOUT,
            )
            try:
                slot.proc.kill()
            except Exception:
                pass
            slot.sigterm_sent_at = 0.0

    def _monitor_loop(self) -> None:
        while not self._stop_evt.wait(SUPERVISOR_POLL):
            for slot in self._slots:
                if self._stop_evt.is_set():
                    break

                # Escalate SIGTERM → SIGKILL if needed
                self._maybe_sigkill(slot)

                # Zombie check — kill and let the next iteration respawn
                if self._check_zombie(slot):
                    self._kill_slot(slot)
                    continue

                proc = slot.proc
                if proc is None or proc.poll() is not None:
                    exit_code = proc.returncode if proc else None
                    if exit_code is not None:
                        logger.warning(
                            "[supervisor] %r exited (code=%s)",
                            slot.worker_id, exit_code,
                        )

                    if slot.restart_count >= _MAX_RESTARTS:
                        logger.error(
                            "[supervisor] %r exceeded max restarts (%d), giving up",
                            slot.worker_id, _MAX_RESTARTS,
                        )
                        continue

                    # Exponential back-off — use event.wait() so SIGTERM is
                    # handled promptly instead of blocking with time.sleep()
                    now    = time.monotonic()
                    waited = now - slot.last_restart_ts
                    if waited < slot.backoff:
                        remaining = slot.backoff - waited
                        logger.info(
                            "[supervisor] %r back-off %.0fs before restart",
                            slot.worker_id, remaining,
                        )
                        self._stop_evt.wait(remaining)
                        if self._stop_evt.is_set():
                            break

                    slot.restart_count += 1
                    slot.backoff = min(slot.backoff * 2, _MAX_RESTART_BACKOFF)

                    # Rolling respawn rate check
                    now_ts  = time.monotonic()
                    history = self._respawn_history.get(slot.worker_id, [])
                    history = [t for t in history if now_ts - t <= self._respawn_window]
                    history.append(now_ts)
                    self._respawn_history[slot.worker_id] = history

                    if len(history) >= self._max_respawns:
                        logger.critical(
                            "[supervisor] 🚨 CRITICAL: Worker %r restarted %d× in "
                            "the last %.0fs — possible runaway crash loop!",
                            slot.worker_id, len(history), self._respawn_window,
                        )
                        self._send_critical_alert(slot.worker_id, len(history))

                    self._spawn(slot)
                else:
                    # Process is alive — reset back-off on sustained health
                    uptime = time.monotonic() - slot.last_restart_ts
                    if uptime > 120:
                        slot.restart_count = max(0, slot.restart_count - 1)
                        slot.backoff       = max(5.0, slot.backoff / 2)
