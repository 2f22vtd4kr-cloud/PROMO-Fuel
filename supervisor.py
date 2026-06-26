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
import sqlite3
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
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


# ── Daily summary notification ─────────────────────────────────────────────────

_DAILY_SUMMARY_HOUR = int(os.getenv("DAILY_SUMMARY_HOUR", "9"))    # 09:00 UTC by default
_DAILY_SUMMARY_MIN  = int(os.getenv("DAILY_SUMMARY_MIN",  "0"))


def _collect_daily_stats(db_path: str) -> dict:
    """Query SQLite for stats used in the daily digest."""
    stats: dict = {
        "total_users": 0,
        "dm_sent_today": 0,
        "group_sent_today": 0,
        "active_campaigns": 0,
        "active_group_campaigns": 0,
        "workers_alive": 0,
        "workers_total": 0,
        "tasks_done": 0,
        "tasks_failed": 0,
    }
    try:
        conn = sqlite3.connect(db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with conn:
            r = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()
            stats["total_users"] = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM sends WHERE status='ok' AND sent_at LIKE ?",
                (f"{today}%",)
            ).fetchone()
            stats["dm_sent_today"] = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM group_send_logs WHERE status='ok' AND sent_at LIKE ?",
                (f"{today}%",)
            ).fetchone()
            stats["group_sent_today"] = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM campaigns WHERE status='running'"
            ).fetchone()
            stats["active_campaigns"] = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM group_campaigns WHERE status='running'"
            ).fetchone()
            stats["active_group_campaigns"] = r["n"] if r else 0

            rows = conn.execute(
                "SELECT worker_id, last_seen, tasks_completed, tasks_failed FROM worker_heartbeats"
            ).fetchall()
            now_utc = datetime.now(timezone.utc)
            stats["workers_total"] = len(rows)
            alive = 0
            for r in rows:
                try:
                    ls = r["last_seen"]
                    if ls:
                        ts = datetime.fromisoformat(ls)
                        if ts.tzinfo is None:
                            ts = ts.replace(tzinfo=timezone.utc)
                        if (now_utc - ts).total_seconds() <= 60:
                            alive += 1
                except Exception:
                    pass
            stats["workers_alive"] = alive
            stats["tasks_done"]    = sum(r["tasks_completed"] or 0 for r in rows)
            stats["tasks_failed"]  = sum(r["tasks_failed"]    or 0 for r in rows)
        conn.close()
    except Exception as exc:
        logger.warning("[daily-summary] DB query error: %s", exc)
    return stats


def _format_daily_summary(stats: dict) -> str:
    today = datetime.now(timezone.utc).strftime("%d.%m.%Y")
    total_sent = stats["dm_sent_today"] + stats["group_sent_today"]
    workers_line = (
        f"{stats['workers_alive']} из {stats['workers_total']} активных"
        if stats["workers_total"] else "нет данных"
    )
    return (
        f"📊 *Ежедневный отчёт — {today}*\n\n"
        f"📨 Отправлено сегодня:\n"
        f"   • Личные сообщения: *{stats['dm_sent_today']}*\n"
        f"   • Группы: *{stats['group_sent_today']}*\n"
        f"   • Итого: *{total_sent}*\n\n"
        f"🔥 Активных кампаний: *{stats['active_campaigns']}*\n"
        f"📡 Групповых рассылок: *{stats['active_group_campaigns']}*\n"
        f"👥 Пользователей в базе: *{stats['total_users']}*\n\n"
        f"⚙️ Воркеры: *{workers_line}*\n"
        f"✅ Задач выполнено: *{stats['tasks_done']}*\n"
        f"❌ Задач с ошибкой: *{stats['tasks_failed']}*"
    )


_WEEKLY_SUMMARY_WEEKDAY    = int(os.getenv("WEEKLY_SUMMARY_WEEKDAY", "6"))  # 6 = Sunday
_WEEKLY_SUMMARY_HOUR       = int(os.getenv("WEEKLY_SUMMARY_HOUR", "19"))    # 19:00 UTC
_REVALIDATE_INTERVAL_HOURS = int(os.getenv("REVALIDATE_INTERVAL_HOURS", "6"))
_REVALIDATE_MAX_BATCH      = int(os.getenv("REVALIDATE_MAX_BATCH", "20"))


def _format_weekly_summary(stats: dict, db_path: str) -> str:
    """Build a 7-day aggregated report for Sunday evenings."""
    today = datetime.now(timezone.utc).strftime("%d.%m.%Y")
    try:
        conn = sqlite3.connect(db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        t7   = (datetime.now(timezone.utc).date().isoformat()) + "T00:00:00"
        t_start = datetime.now(timezone.utc)
        t_start = t_start.replace(hour=0, minute=0, second=0, microsecond=0)
        t7_str  = (t_start.replace(day=t_start.day - 6) if t_start.day > 6 else t_start).isoformat()

        from datetime import timedelta as _td
        week_ago = (datetime.now(timezone.utc) - _td(days=7)).isoformat()
        now_iso  = datetime.now(timezone.utc).isoformat()

        with conn:
            r = conn.execute(
                "SELECT COUNT(*) AS n FROM sends WHERE status='ok' AND sent_at >= ?",
                (week_ago,)
            ).fetchone()
            dm_week = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM group_send_logs WHERE status='ok' AND sent_at >= ?",
                (week_ago,)
            ).fetchone()
            group_week = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM sends WHERE status='error' AND sent_at >= ?",
                (week_ago,)
            ).fetchone()
            dm_errors = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM group_send_logs WHERE status='error' AND sent_at >= ?",
                (week_ago,)
            ).fetchone()
            group_errors = r["n"] if r else 0

            r = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()
            total_users = r["n"] if r else 0

            r = conn.execute(
                "SELECT COUNT(*) AS n FROM users WHERE first_seen >= ?",
                (week_ago,)
            ).fetchone()
            new_users = r["n"] if r else 0
        conn.close()
    except Exception as exc:
        logger.warning("[weekly-summary] DB error: %s", exc)
        return f"📈 *Еженедельный отчёт — {today}*\n\n❌ Ошибка сбора данных: {exc}"

    total_sent  = dm_week + group_week
    total_err   = dm_errors + group_errors
    success_pct = round(total_sent / (total_sent + total_err) * 100, 1) if (total_sent + total_err) > 0 else 100.0

    w_alive = stats.get("workers_alive", 0)
    w_total = stats.get("workers_total", 0)
    w_line  = f"{w_alive} из {w_total} активных" if w_total else "нет данных"

    return (
        f"📈 *Еженедельный отчёт — {today}*\n\n"
        f"📨 Отправлено за 7 дней:\n"
        f"   • Личные сообщения: *{dm_week}*\n"
        f"   • Группы: *{group_week}*\n"
        f"   • Итого: *{total_sent}*\n"
        f"   • Ошибок: *{total_err}* ({success_pct}% успешно)\n\n"
        f"👥 Пользователей в базе: *{total_users}*\n"
        f"🆕 Новых за 7 дней: *{new_users}*\n\n"
        f"⚙️ Воркеры: *{w_line}*\n"
        f"✅ Задач выполнено: *{stats.get('tasks_done', 0)}*\n"
        f"❌ Задач с ошибкой: *{stats.get('tasks_failed', 0)}*"
    )


def _check_slow_sends(db_path: str, last_hour_key: str) -> str:
    """Return an alert message if active campaigns sent 0 in the last hour, else ''."""
    try:
        conn = sqlite3.connect(db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        now = datetime.now(timezone.utc)
        hour_ago = (now.replace(minute=0, second=0, microsecond=0)).isoformat()

        r = conn.execute("SELECT COUNT(*) AS n FROM campaigns WHERE status='running'").fetchone()
        active_dm = r["n"] if r else 0
        r = conn.execute("SELECT COUNT(*) AS n FROM group_campaigns WHERE status='running'").fetchone()
        active_grp = r["n"] if r else 0
        conn.close()

        if active_dm + active_grp == 0:
            return ""  # no active campaigns — nothing to check

        # Check if any sends happened in the last hour
        conn = sqlite3.connect(db_path, timeout=5)
        r = conn.execute(
            "SELECT COUNT(*) AS n FROM sends WHERE status='ok' AND sent_at >= ?",
            (hour_ago,)
        ).fetchone()
        dm_recent = r["n"] if r else 0
        try:
            r = conn.execute(
                "SELECT COUNT(*) AS n FROM group_send_logs WHERE status='ok' AND sent_at >= ?",
                (hour_ago,)
            ).fetchone()
            grp_recent = r["n"] if r else 0
        except Exception:
            grp_recent = 0
        conn.close()

        cur_hour = now.strftime("%Y-%m-%dT%H")
        if cur_hour == last_hour_key:
            return ""  # already alerted this hour

        if dm_recent + grp_recent == 0:
            return (
                f"🐢 *Тихий час* — нет отправок за последний час\n\n"
                f"Активных DM-кампаний: *{active_dm}*\n"
                f"Активных групповых: *{active_grp}*\n\n"
                f"Проверь воркеры и аккаунты."
            )
    except Exception as exc:
        logger.debug("[slow-sends] Check failed: %s", exc)
    return ""


_quota_warned_accounts: set[int]  = set()   # IDs already warned today
_campaign_was_running:  set[int]  = set()   # campaign IDs seen as running last poll


def _check_campaign_completions(db_path: str) -> None:
    """Alert when a running DM or group campaign just became 'done'."""
    global _campaign_was_running
    try:
        conn = sqlite3.connect(db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        dm_rows  = conn.execute("SELECT id, name, status, sent_count, target_count FROM campaigns").fetchall()
        grp_rows = conn.execute("SELECT id, name, status FROM group_campaigns").fetchall()
        conn.close()

        current_running: set[int] = set()
        newly_done: list[str] = []

        for r in dm_rows:
            rid = f"dm_{r['id']}"
            if r["status"] in ("running", "sending"):
                current_running.add(rid)  # type: ignore[arg-type]
            elif r["status"] == "done" and rid in _campaign_was_running:
                pct = (round(r["sent_count"] / r["target_count"] * 100)
                       if r["target_count"] and r["target_count"] > 0 else 100)
                newly_done.append(f"📨 `{r['name']}` — {r['sent_count']} отправлено ({pct}%)")

        for r in grp_rows:
            rid = f"grp_{r['id']}"
            if r["status"] == "running":
                current_running.add(rid)  # type: ignore[arg-type]
            elif r["status"] in ("done", "completed") and rid in _campaign_was_running:
                newly_done.append(f"📡 `{r['name']}` (групп.) — завершено")

        for nd in newly_done:
            _notify_owner_sync(f"✅ *Кампания завершена*\n\n{nd}")

        _campaign_was_running = current_running
    except Exception as exc:
        logger.debug("[campaign-done] Check failed: %s", exc)


def _check_quota_warnings(db_path: str) -> None:
    """Alert if any account is ≥ 90% of its daily send limit (once per account per day)."""
    try:
        conn = sqlite3.connect(db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, phone, sent_today, daily_limit FROM sender_accounts "
            "WHERE daily_limit > 0 AND sent_today >= daily_limit * 0.9 AND is_active = 1"
        ).fetchall()
        conn.close()
        new_warnings = [r for r in rows if r["id"] not in _quota_warned_accounts]
        if not new_warnings:
            return
        lines = "\n".join(
            f"   • `{r['phone']}` — {r['sent_today']}/{r['daily_limit']} ({round(r['sent_today']/r['daily_limit']*100)}%)"
            for r in new_warnings[:10]
        )
        _notify_owner_sync(
            f"📊 *Ліміт відправок* — {len(new_warnings)} акаунт(а) на 90%+\n\n"
            f"{lines}\n\nЛіміт скинеться о опівночі UTC."
        )
        for r in new_warnings:
            _quota_warned_accounts.add(r["id"])
        logger.info("[quota-warning] Alerted for %d account(s)", len(new_warnings))
    except Exception as exc:
        logger.debug("[quota-warning] Check failed: %s", exc)


def _run_revalidation(db_path: str) -> None:
    """One pass: validate every active account that has a session file."""
    import json as _json
    import subprocess as _subp

    try:
        conn = sqlite3.connect(db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, phone, status FROM sender_accounts "
            "WHERE session_file IS NOT NULL AND session_file != '' AND is_active = 1 "
            "ORDER BY id"
        ).fetchall()
        conn.close()

        if not rows:
            logger.info("[revalidator] No accounts with session files — skipping")
            return

        batch = list(rows[:_REVALIDATE_MAX_BATCH])
        ids   = [str(r["id"]) for r in batch]
        prev  = {int(r["id"]): r["status"] for r in batch}

        logger.info("[revalidator] Checking %d account(s)…", len(ids))

        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "validate_sessions.py")
        python = "/home/runner/workspace/.pythonlibs/bin/python3"

        res = _subp.run(
            [python, script, db_path] + ids,
            capture_output=True, text=True, timeout=600,
        )
        if not res.stdout.strip():
            logger.warning("[revalidator] Script produced no output; stderr: %s", res.stderr[:300])
            return

        data    = _json.loads(res.stdout)
        results = data.get("results", [])

        newly_invalid: list[str] = []
        newly_authed:  list[str] = []
        for r in results:
            p = prev.get(int(r["id"]))
            c = r["status"]
            if p == "authorized" and c == "session_invalid":
                newly_invalid.append(r["phone"])
            elif p in ("session_invalid", "idle") and c == "authorized":
                newly_authed.append(r["phone"])

        logger.info(
            "[revalidator] Done — %d checked, %d newly invalid, %d recovered",
            len(results), len(newly_invalid), len(newly_authed),
        )

        if newly_invalid:
            phones = "\n".join(f"   • `{p}`" for p in newly_invalid[:10])
            extra  = "\n   _(и ещё…)_" if len(newly_invalid) > 10 else ""
            _notify_owner_sync(
                f"🔑 *Сессии истекли* — {len(newly_invalid)} аккаунт(а)\n\n"
                f"{phones}{extra}\n\n"
                "Перейди в Аккаунты → повторно авторизуй."
            )

        if newly_authed:
            logger.info("[revalidator] Recovered: %s", ", ".join(newly_authed))

    except Exception as exc:
        logger.warning("[revalidator] Error during revalidation pass: %s", exc)


def _revalidation_thread(db_path: str, shutdown_event: threading.Event) -> None:
    """Background thread: re-validates sessions every REVALIDATE_INTERVAL_HOURS hours."""
    interval = _REVALIDATE_INTERVAL_HOURS * 3600
    logger.info(
        "[revalidator] Started — interval=%dh, max_batch=%d",
        _REVALIDATE_INTERVAL_HOURS, _REVALIDATE_MAX_BATCH,
    )
    # Brief startup delay so the system fully boots before hitting Telegram
    shutdown_event.wait(90)
    while not shutdown_event.is_set():
        _run_revalidation(db_path)
        shutdown_event.wait(interval)


def _daily_summary_thread(db_path: str, shutdown_event: threading.Event) -> None:
    """Background thread: fires daily digest + Sunday weekly digest + slow-sends alert."""
    logger.info(
        "[daily-summary] Scheduler started — daily at %02d:%02d UTC, weekly on weekday %d at %02d:00 UTC",
        _DAILY_SUMMARY_HOUR, _DAILY_SUMMARY_MIN,
        _WEEKLY_SUMMARY_WEEKDAY, _WEEKLY_SUMMARY_HOUR,
    )
    _last_sent_date: str = ""
    _last_sent_week: str = ""
    _slow_sends_alerted_hour: str = ""
    _slow_sends_check_interval = 30 * 60  # 30 minutes
    _last_slow_check = 0.0

    while not shutdown_event.is_set():
        now = datetime.now(timezone.utc)
        date_key = now.strftime("%Y-%m-%d")
        week_key = now.strftime("%Y-W%W")

        if (now.hour == _DAILY_SUMMARY_HOUR and now.minute == _DAILY_SUMMARY_MIN
                and date_key != _last_sent_date):
            try:
                stats = _collect_daily_stats(db_path)
                text  = _format_daily_summary(stats)
                _notify_owner_sync(text)
                _last_sent_date = date_key
                logger.info("[daily-summary] Daily digest sent for %s", date_key)
            except Exception as exc:
                logger.warning("[daily-summary] Failed to send daily digest: %s", exc)
            shutdown_event.wait(61)
            continue

        if (now.weekday() == _WEEKLY_SUMMARY_WEEKDAY
                and now.hour == _WEEKLY_SUMMARY_HOUR
                and now.minute < 5
                and week_key != _last_sent_week):
            try:
                stats = _collect_daily_stats(db_path)
                text  = _format_weekly_summary(stats, db_path)
                _notify_owner_sync(text)
                _last_sent_week = week_key
                logger.info("[weekly-summary] Weekly digest sent for %s", week_key)
            except Exception as exc:
                logger.warning("[weekly-summary] Failed to send weekly digest: %s", exc)
            shutdown_event.wait(61)
            continue

        # ── Midnight quota-reset: set sent_today = 0 for all accounts ────────
        if now.hour == 0 and now.minute < 2 and date_key != _last_sent_date:
            try:
                conn = sqlite3.connect(db_path, timeout=10)
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("UPDATE sender_accounts SET sent_today = 0")
                conn.commit()
                conn.close()
                logger.info("[daily-summary] Midnight quota reset: sent_today → 0 for all accounts")
                _quota_warned_accounts.clear()   # reset quota-warn set for the new day
            except Exception as exc:
                logger.warning("[daily-summary] Midnight quota reset failed: %s", exc)

        # Slow-sends alert — check every 30 min during business hours (06:00–22:00 UTC)
        if 6 <= now.hour <= 22 and time.monotonic() - _last_slow_check >= _slow_sends_check_interval:
            try:
                alert = _check_slow_sends(db_path, _slow_sends_alerted_hour)
                if alert:
                    _notify_owner_sync(alert)
                    _slow_sends_alerted_hour = now.strftime("%Y-%m-%dT%H")
                    logger.info("[slow-sends] Alert sent for hour %s", _slow_sends_alerted_hour)
            except Exception as exc:
                logger.debug("[slow-sends] Error: %s", exc)

            # Quota warning: alert if any account is ≥90% of daily limit
            try:
                _check_quota_warnings(db_path)
            except Exception as exc:
                logger.debug("[quota-warning] Error: %s", exc)

            # Campaign completion: alert when running → done
            try:
                _check_campaign_completions(db_path)
            except Exception as exc:
                logger.debug("[campaign-done] Skipped: %s", exc)

            _last_slow_check = time.monotonic()

        shutdown_event.wait(30)


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


# ── Phase 0: Persistent data directory setup ─────────────────────────────────

def _ensure_persistent_db(db_path: str) -> None:
    """Create data/ + data/backups/ dirs, migrate root DB if needed, take startup backup."""
    import shutil

    db_file    = os.path.abspath(db_path)
    data_dir   = os.path.dirname(db_file)
    backup_dir = os.path.join(data_dir, "backups")

    os.makedirs(data_dir,   exist_ok=True)
    os.makedirs(backup_dir, exist_ok=True)

    # One-time migration: if data/campaigns.db doesn't exist yet but the legacy
    # root-level campaigns.db does, copy it over so no data is lost.
    root_db = os.path.normpath(os.path.join(data_dir, "..", "campaigns.db"))
    if not os.path.exists(db_file) and os.path.exists(root_db):
        try:
            shutil.copy2(root_db, db_file)
            logger.info("[ensure_db] ✓ Migrated campaigns.db → %s", db_file)
        except Exception as exc:
            logger.warning("[ensure_db] Root→data migration failed: %s", exc)

    # Startup backup — taken before migrations, so the pre-migration state is
    # preserved even if something goes wrong with an additive schema change.
    if os.path.exists(db_file):
        try:
            stamp       = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_path = os.path.join(backup_dir, f"campaigns_{stamp}.db")
            shutil.copy2(db_file, backup_path)
            logger.info("[ensure_db] ✓ Startup backup → %s", backup_path)

            # Prune: keep only the 10 most recent backups
            all_backups = sorted(
                [f for f in os.listdir(backup_dir)
                 if f.startswith("campaigns_") and f.endswith(".db")],
                reverse=True,
            )
            for old in all_backups[10:]:
                try:
                    os.remove(os.path.join(backup_dir, old))
                except Exception:
                    pass
        except Exception as exc:
            logger.warning("[ensure_db] Startup backup failed (non-fatal): %s", exc)


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
    # Ensure .pythonlibs packages are visible to child processes
    pythonlibs = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".pythonlibs", "lib", "python3.12", "site-packages")
    existing = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{pythonlibs}:{existing}" if existing else pythonlibs
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

    # ── Ensure data/ directory, migrate root DB if needed, startup backup ──
    _ensure_persistent_db(env_state.db_path)

    # ── PG restore — must run BEFORE migrations so the schema is created
    #    against the restored data, not an empty DB.
    try:
        import db_sync as _dbs
        _dbs.restore_if_fresh(env_state.db_path)
    except Exception as _e:
        logger.warning("[phase0] db_sync restore skipped: %s", _e)

    # Migrations must run before any subprocess or import that touches the DB.
    _run_migrations(env_state.db_path)
    _recover_stale_locks_sync(env_state.db_path)
    _reset_stuck_campaigns(env_state.db_path)

    # ── PG snapshot — save current state + start periodic sync thread
    try:
        import db_sync as _dbs
        _dbs.save_snapshot(env_state.db_path)
        _dbs.start_sync_thread(env_state.db_path)
    except Exception as _e:
        logger.warning("[phase0] db_sync start skipped: %s", _e)

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

    # ── Daily summary digest thread ────────────────────────────────────────
    _daily_t = threading.Thread(
        target=_daily_summary_thread,
        args=(env_state.db_path, _shutdown_event),
        name="daily-summary",
        daemon=True,
    )
    _daily_t.start()

    _reval_t = threading.Thread(
        target=_revalidation_thread,
        args=(env_state.db_path, _shutdown_event),
        name="session-revalidator",
        daemon=True,
    )
    _reval_t.start()
    logger.info(
        "[supervisor] Session revalidator started — interval=%dh, max_batch=%d",
        _REVALIDATE_INTERVAL_HOURS, _REVALIDATE_MAX_BATCH,
    )

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
