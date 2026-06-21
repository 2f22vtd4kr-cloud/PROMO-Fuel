#!/usr/bin/env python3
"""PROMO-Fuel unified production supervisor.

Replaces ``python3 main.py`` as the single entry point for production.

Start order
-----------
  Phase 0 — DB schema migrations + environment state validation
  Phase 1 — FastAPI control plane  (apiserver.py)   via subprocess.Popen
  Phase 2 — Broadcast worker cluster (worker-1..N)  via subprocess.Popen
  Phase 3 — PTB bot main loop      (main.py:main()) in the calling process
             └─ post_init: broadcastscheduler runs as an asyncio.Task inside
                the bot's own event loop, acting purely as a producer pushing
                JSON task blocks into TaskQueue.

Subprocess management
---------------------
  ProcessManager runs in a daemon thread and monitors all child processes.
  Crashed processes are automatically restarted with exponential back-off
  (5s → 10s → 20s → … capped at 120s).  After MAX_CRASHES crashes inside
  CRASH_WINDOW_SECONDS the process is marked *dead* and not restarted.

  On SIGTERM / SIGINT the manager sends SIGTERM to every child, waits up to
  SIGTERM_TIMEOUT seconds, then delivers SIGKILL to stragglers, and finally
  lets the PTB bot's own shutdown logic finish cleanly.

Usage
-----
  python3 supervisor.py                          # defaults: 2 workers
  python3 supervisor.py --workers 4
  python3 supervisor.py --workers 0 --no-api    # bot-only (dev mode)
  WORKER_COUNT=3 python3 supervisor.py          # env-var override
"""
from __future__ import annotations

import argparse
import dataclasses
import logging
import os
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime
from typing import Optional, Sequence

# ── Logging ───────────────────────────────────────────────────────────────────
# Set up logging early; main.py re-configures basicConfig but that call is
# idempotent (the first call wins), so we format consistently.

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("supervisor")


# ── Constants ─────────────────────────────────────────────────────────────────

MAX_CRASHES          = 5      # crashes within window before marking dead
CRASH_WINDOW_SECONDS = 600    # rolling window for crash counting
BACKOFF_BASE         = 5.0    # seconds; doubles on each crash
BACKOFF_CAP          = 120.0  # maximum back-off sleep
POLL_INTERVAL        = 3.0    # seconds between process health polls
SIGTERM_TIMEOUT      = 20     # seconds to wait for graceful child shutdown

# ── Telegram owner notifications ───────────────────────────────────────────────

_BOT_TOKEN  = os.getenv("TELEGRAM_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", ""))
_OWNER_IDS  = [
    int(x) for x in
    os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",")
    if x.strip().lstrip("-").isdigit()
]
_NOTIFY_LOCK = threading.Lock()
_NOTIFIED_DEAD: set[str] = set()   # process names already notified as dead


def _notify_owner_sync(text: str) -> None:
    """Fire-and-forget Telegram message to all owner IDs (synchronous, stdlib only)."""
    if not _BOT_TOKEN or not _OWNER_IDS:
        return
    import json as _json
    import urllib.request as _req
    url = f"https://api.telegram.org/bot{_BOT_TOKEN}/sendMessage"
    for uid in _OWNER_IDS:
        try:
            body = _json.dumps({"chat_id": uid, "text": text, "parse_mode": "Markdown"}).encode()
            req  = _req.Request(url, data=body, headers={"Content-Type": "application/json"})
            with _req.urlopen(req, timeout=10):
                pass
        except Exception:
            pass


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="PROMO-Fuel production supervisor",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument(
        "--workers", "-w",
        type=int,
        default=int(os.getenv("WORKER_COUNT", "2")),
        help="Number of broadcast worker processes to spawn",
    )
    p.add_argument(
        "--no-api",
        action="store_true",
        default=False,
        help="Skip launching apiserver.py (useful for local dev)",
    )
    p.add_argument(
        "--db",
        default=os.getenv("DB_PATH", "campaigns.db"),
        help="Path to campaigns.db",
    )
    p.add_argument(
        "--api-port",
        type=int,
        default=int(os.getenv("API_SERVER_PORT", "8083")),
        help="Port for the FastAPI control plane",
    )
    p.add_argument(
        "--poll",
        type=float,
        default=float(os.getenv("WORKER_POLL", "5.0")),
        help="Worker task-claim poll interval in seconds",
    )
    return p.parse_args()


# ── Environment validation ────────────────────────────────────────────────────

@dataclasses.dataclass
class EnvState:
    telegram_token: str
    db_path:        str
    api_port:       int
    worker_count:   int
    miniapp_url:    str
    owner_ids:      str
    warnings:       list[str] = dataclasses.field(default_factory=list)

    @classmethod
    def load_and_validate(cls, args: argparse.Namespace) -> "EnvState":
        warnings: list[str] = []

        token = os.getenv("TELEGRAM_TOKEN", "")
        if not token:
            warnings.append(
                "TELEGRAM_TOKEN is not set — PTB bot will start in no-op mode"
            )

        db_path = args.db
        if not os.path.exists(db_path):
            warnings.append(
                f"DB_PATH={db_path!r} does not exist yet — "
                "dbmigrations will create it now"
            )

        miniapp_url = os.getenv("MINIAPP_URL", "")
        if not miniapp_url:
            warnings.append(
                "MINIAPP_URL is not set — Mini App button won't appear for admin"
            )

        owner_ids = os.getenv("VITE_OWNER_IDS", os.getenv("OWNER_IDS", ""))
        if not owner_ids:
            warnings.append(
                "VITE_OWNER_IDS / OWNER_IDS not set — "
                "Mini App will default to owner view for all users"
            )

        for var in ("TELETHON_API_ID", "TELETHON_API_HASH", "TELETHON_PHONE"):
            if not os.getenv(var):
                warnings.append(
                    f"{var} is not set — legacy Telethon integration disabled"
                )

        return cls(
            telegram_token=token,
            db_path=db_path,
            api_port=args.api_port,
            worker_count=args.workers,
            miniapp_url=miniapp_url,
            owner_ids=owner_ids,
            warnings=warnings,
        )

    def log_report(self) -> None:
        logger.info("─" * 60)
        logger.info("PROMO-Fuel Supervisor — Environment Report")
        logger.info("─" * 60)
        logger.info("  DB_PATH          = %s", self.db_path)
        logger.info("  API_SERVER_PORT  = %d", self.api_port)
        logger.info("  WORKER_COUNT     = %d", self.worker_count)
        logger.info("  MINIAPP_URL      = %s", self.miniapp_url or "(not set)")
        logger.info("  TELEGRAM_TOKEN   = %s", "✓ set" if self.telegram_token else "✗ NOT SET")
        if self.warnings:
            logger.info("─" * 60)
            logger.info("  Warnings (%d):", len(self.warnings))
            for w in self.warnings:
                logger.warning("    ⚠  %s", w)
        logger.info("─" * 60)


# ── Phase 0: DB migrations ────────────────────────────────────────────────────

def _run_migrations(db_path: str) -> None:
    """Run all schema migrations synchronously before anything else starts."""
    logger.info("[phase0] Running DB migrations against %s", db_path)
    try:
        from dbmigrations import run_migrations
        run_migrations(db_path)
        logger.info("[phase0] ✓ Schema up to date")
    except Exception:
        logger.exception("[phase0] ✗ Migration failed — aborting")
        sys.exit(1)


def _recover_stale_locks_sync(db_path: str, timeout: int = 120) -> None:
    """Release any account locks left by crashed workers from a previous run."""
    try:
        from task_queue import TaskQueue
        tq = TaskQueue(db_path=db_path)
        released = tq.recover_stale_locks_sync(timeout_seconds=timeout)
        if released:
            logger.info("[phase0] 🔓 Released %d stale account lock(s) from prior run", released)
    except Exception as exc:
        logger.warning("[phase0] Stale-lock recovery skipped: %s", exc)


def _reset_stuck_campaigns(db_path: str) -> None:
    """Reset any direct campaigns stuck in 'running' due to a prior crash."""
    import sqlite3
    try:
        conn = sqlite3.connect(db_path, timeout=10)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=10000")
        cur = conn.execute(
            "UPDATE campaigns SET status = 'draft' WHERE status = 'running'"
        )
        conn.commit()
        conn.close()
        if cur.rowcount:
            logger.info("[phase0] Reset %d stuck campaign(s) → draft", cur.rowcount)
    except Exception as exc:
        logger.warning("[phase0] Stuck-campaign reset skipped: %s", exc)


# ── Managed process ────────────────────────────────────────────────────────────

@dataclasses.dataclass
class ManagedProcess:
    """Tracks a single supervised subprocess with its restart metadata."""

    name:       str                            # human label, e.g. "worker-2"
    cmd:        list[str]                      # argv passed to Popen
    env:        dict[str, str]                 # environment for this process
    proc:       Optional[subprocess.Popen]     # live handle (None when dead/not yet started)
    crash_times: list[float]                   # timestamps of recent crashes
    backoff:    float                          # current restart delay in seconds
    dead:       bool                           # permanently stopped after too many crashes
    restart_no: int                            # total restart count

    @classmethod
    def make(cls, name: str, cmd: Sequence[str], env: dict[str, str]) -> "ManagedProcess":
        return cls(
            name=name,
            cmd=list(cmd),
            env=env,
            proc=None,
            crash_times=[],
            backoff=0.0,          # 0 → launch immediately on first start
            dead=False,
            restart_no=0,
        )

    def spawn(self) -> None:
        """Fork a new subprocess and update the handle."""
        logger.info(
            "[supervisor] ▶ Spawning %s (restart #%d): %s",
            self.name, self.restart_no, " ".join(self.cmd),
        )
        self.proc = subprocess.Popen(
            self.cmd,
            env=self.env,
            # Inherit parent's stdout/stderr so logs flow to the same stream.
            stdout=None,
            stderr=None,
        )
        self.restart_no += 1
        logger.info("[supervisor] ✓ %s running (pid=%d)", self.name, self.proc.pid)

    def poll_crashed(self) -> bool:
        """Return True if the process has exited (any exit code)."""
        if self.proc is None:
            return False
        return self.proc.poll() is not None

    def exit_code(self) -> Optional[int]:
        if self.proc is None:
            return None
        return self.proc.returncode

    def _prune_crash_window(self) -> None:
        cutoff = time.monotonic() - CRASH_WINDOW_SECONDS
        self.crash_times = [t for t in self.crash_times if t >= cutoff]

    def record_crash(self) -> None:
        """Record a crash event and update the back-off delay."""
        now = time.monotonic()
        self.crash_times.append(now)
        self._prune_crash_window()

        n = len(self.crash_times)
        if n >= MAX_CRASHES:
            self.dead = True
            logger.error(
                "[supervisor] 💀 %s crashed %d times in %ds — marking DEAD, not restarting",
                self.name, n, CRASH_WINDOW_SECONDS,
            )
            with _NOTIFY_LOCK:
                if self.name not in _NOTIFIED_DEAD:
                    _NOTIFIED_DEAD.add(self.name)
                    threading.Thread(
                        target=_notify_owner_sync,
                        args=(
                            f"☠️ *Воркер упал насмерть*\n"
                            f"Процесс: `{self.name}`\n"
                            f"Упал {n} раз за {CRASH_WINDOW_SECONDS//60} мин — перезапуск остановлен.\n"
                            f"Код выхода: `{self.exit_code()}`",
                        ),
                        daemon=True,
                    ).start()
            return

        # Exponential back-off: 5s, 10s, 20s, 40s, 80s → cap 120s
        self.backoff = min(BACKOFF_CAP, BACKOFF_BASE * (2 ** (n - 1)))
        logger.warning(
            "[supervisor] ⚠  %s crashed (rc=%s, crash #%d in window) — "
            "restarting in %.0fs",
            self.name, self.exit_code(), n, self.backoff,
        )
        if n == 1:
            threading.Thread(
                target=_notify_owner_sync,
                args=(
                    f"⚠️ *Воркер упал*\n"
                    f"Процесс: `{self.name}`\n"
                    f"Падение #{n} — перезапуск через {self.backoff:.0f}с.\n"
                    f"Код выхода: `{self.exit_code()}`",
                ),
                daemon=True,
            ).start()

    def terminate(self, timeout: float = SIGTERM_TIMEOUT) -> None:
        """Send SIGTERM; escalate to SIGKILL if the process won't stop."""
        if self.proc is None or self.proc.poll() is not None:
            return
        try:
            logger.info("[supervisor] ↓ Sending SIGTERM to %s (pid=%d)", self.name, self.proc.pid)
            self.proc.terminate()
            try:
                self.proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                logger.warning(
                    "[supervisor] ⚡ %s did not exit in %.0fs — sending SIGKILL",
                    self.name, timeout,
                )
                self.proc.kill()
                self.proc.wait(timeout=5)
        except ProcessLookupError:
            pass  # already gone
        except Exception as exc:
            logger.warning("[supervisor] terminate(%s) error: %s", self.name, exc)


# ── Process manager thread ─────────────────────────────────────────────────────

class ProcessManager(threading.Thread):
    """Background daemon thread that monitors and auto-restarts all subprocesses."""

    def __init__(self) -> None:
        super().__init__(name="process-manager", daemon=True)
        self._procs:    list[ManagedProcess] = []
        self._lock:     threading.Lock        = threading.Lock()
        self._stop_evt: threading.Event       = threading.Event()

    # ── Public API ─────────────────────────────────────────────────────────

    def add(self, mp: ManagedProcess) -> None:
        with self._lock:
            self._procs.append(mp)

    def start_all(self) -> None:
        """Immediately spawn all registered processes (called once before run())."""
        with self._lock:
            for mp in self._procs:
                if not mp.dead:
                    mp.spawn()

    def stop_all(self) -> None:
        """Signal every child process to stop; block until all have exited."""
        self._stop_evt.set()
        with self._lock:
            procs = list(self._procs)
        for mp in procs:
            mp.terminate(timeout=SIGTERM_TIMEOUT)
        logger.info("[supervisor] All child processes stopped")

    @property
    def all_dead(self) -> bool:
        with self._lock:
            return all(mp.dead for mp in self._procs)

    # ── Thread body ────────────────────────────────────────────────────────

    def run(self) -> None:  # noqa: C901
        logger.info("[supervisor] ProcessManager started")
        pending_restarts: dict[str, float] = {}   # name → restart_after_monotonic

        while not self._stop_evt.is_set():
            now = time.monotonic()

            with self._lock:
                snapshot = list(self._procs)

            for mp in snapshot:
                if mp.dead:
                    continue

                # ── Pending restart: wait until back-off expires ────────
                if mp.name in pending_restarts:
                    if now < pending_restarts[mp.name]:
                        continue
                    del pending_restarts[mp.name]
                    mp.spawn()
                    continue

                # ── Check if the running process crashed ────────────────
                if mp.proc is not None and mp.poll_crashed():
                    mp.record_crash()
                    if not mp.dead:
                        pending_restarts[mp.name] = now + mp.backoff

                # ── Process not yet started (shouldn't happen after start_all) ─
                elif mp.proc is None:
                    mp.spawn()

            self._stop_evt.wait(timeout=POLL_INTERVAL)

        logger.info("[supervisor] ProcessManager exiting")


# ── Process factory helpers ────────────────────────────────────────────────────

def _child_env(db_path: str, api_port: int) -> dict[str, str]:
    """Build the env dict for child processes (inherits parent env + overrides)."""
    env = os.environ.copy()
    env["DB_PATH"]          = db_path
    env["API_SERVER_PORT"]  = str(api_port)
    # Children must not try to spawn their own worker supervisors
    env["WORKER_COUNT"]     = "0"
    return env


def _make_apiserver(env: dict[str, str]) -> ManagedProcess:
    python = sys.executable
    return ManagedProcess.make(
        name="apiserver",
        cmd=[python, "-u", "apiserver.py"],
        env=env,
    )


def _make_worker(index: int, db_path: str, poll: float, env: dict[str, str]) -> ManagedProcess:
    python  = sys.executable
    wid     = f"worker-{index}"
    return ManagedProcess.make(
        name=wid,
        cmd=[
            python, "-u", "worker.py", wid,
            "--db",   db_path,
            "--poll", str(poll),
        ],
        env=env,
    )


# ── Shutdown coordination ──────────────────────────────────────────────────────

_manager:       Optional[ProcessManager] = None
_shutdown_event: threading.Event         = threading.Event()


def _shutdown_signal_handler(signum: int, _frame) -> None:
    """Handle SIGTERM/SIGINT: propagate to all children then let PTB exit."""
    sig_name = signal.Signals(signum).name
    logger.info("[supervisor] Received %s — initiating clean shutdown", sig_name)
    _shutdown_event.set()

    # Stop all managed subprocesses
    if _manager is not None:
        _manager.stop_all()

    # Re-raise SIGINT so PTB's own signal handler also fires (stops run_polling)
    if signum == signal.SIGINT:
        signal.raise_signal(signal.SIGINT)


# ── Main entry point ───────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> None:  # noqa: C901
    global _manager

    # ── Phase 0: Pre-flight ───────────────────────────────────────────────

    env_state = EnvState.load_and_validate(args)
    env_state.log_report()

    # Propagate resolved paths back to the environment so all imports
    # (campaign_db, task_queue, etc.) pick them up consistently.
    os.environ["DB_PATH"]         = env_state.db_path
    os.environ["API_SERVER_PORT"] = str(env_state.api_port)

    # Migrations must run before any subprocess or import that touches the DB.
    _run_migrations(env_state.db_path)
    _recover_stale_locks_sync(env_state.db_path)
    _reset_stuck_campaigns(env_state.db_path)

    # ── Phase 1 & 2: Subprocess fleet ────────────────────────────────────

    _manager = ProcessManager()
    child_env = _child_env(env_state.db_path, env_state.api_port)

    if not args.no_api:
        api_proc = _make_apiserver(child_env)
        _manager.add(api_proc)
        logger.info(
            "[phase1] FastAPI control plane registered (port %d)",
            env_state.api_port,
        )
    else:
        logger.info("[phase1] FastAPI control plane skipped (--no-api)")

    for i in range(1, env_state.worker_count + 1):
        wp = _make_worker(i, env_state.db_path, args.poll, child_env)
        _manager.add(wp)

    if env_state.worker_count > 0:
        logger.info(
            "[phase2] %d worker process(es) registered (worker-1..%d)",
            env_state.worker_count, env_state.worker_count,
        )
    else:
        logger.info("[phase2] No workers configured (--workers 0)")

    # Tell main.py's own post_init NOT to start its WorkerSupervisor
    # (we manage workers ourselves via subprocess.Popen above).
    os.environ["WORKER_COUNT"] = "0"

    # Spawn everything before the blocking PTB main loop takes over.
    _manager.start_all()
    _manager.start()

    logger.info(
        "[supervisor] Fleet launched: %d subprocess(es) running",
        (0 if args.no_api else 1) + env_state.worker_count,
    )

    # ── Signal handlers ───────────────────────────────────────────────────

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            signal.signal(sig, _shutdown_signal_handler)
        except (OSError, ValueError):
            pass  # e.g., SIGINT can't be replaced in some contexts

    # ── Phase 3: PTB bot + broadcast scheduler ────────────────────────────

    if not env_state.telegram_token:
        logger.warning(
            "[phase3] TELEGRAM_TOKEN not set — running in subprocess-only mode. "
            "Ctrl-C or SIGTERM will stop all workers."
        )
        # Block here so the manager thread keeps running
        try:
            _shutdown_event.wait()
        except KeyboardInterrupt:
            pass
        finally:
            if _manager:
                _manager.stop_all()
        return

    # Phase 3 delegates entirely to main.py:main().
    #
    # Why this is correct:
    #   • main.py's post_init already runs the broadcast scheduler as an
    #     asyncio.Task (broadcastscheduler.start_broadcast_scheduler), the
    #     DM-campaign scheduler (campaign_sender.start_scheduler), and stale-
    #     lock recovery — all hooked into the PTB Application event loop.
    #   • WORKER_COUNT=0 (set above) causes main.py's post_init to skip its
    #     own WorkerSupervisor; we own the worker lifecycle via ProcessManager.
    #   • All DB/env vars are already set; main.py reads them at import time.
    #
    logger.info("[phase3] Delegating to main.main() — PTB bot + broadcast scheduler")
    try:
        import main as _ptb_main
        _ptb_main.main()
    except KeyboardInterrupt:
        logger.info("[phase3] Keyboard interrupt received")
    except SystemExit as exc:
        logger.info("[phase3] PTB bot exited (code=%s)", exc.code)
    except Exception:
        logger.exception("[phase3] PTB main loop raised an unhandled exception")
    finally:
        logger.info("[supervisor] PTB loop exited — stopping subprocess fleet")
        if _manager:
            _manager.stop_all()
        logger.info("[supervisor] Shutdown complete")


def main() -> None:
    args = _parse_args()
    run(args)


if __name__ == "__main__":
    main()
