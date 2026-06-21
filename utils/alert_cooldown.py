"""Rate-limiter for crash-alert Telegram notifications.

Prevents alert floods when workers crash repeatedly within a short window.
Uses a lightweight SQLite table (alert_cooldowns) that persists across process
restarts, so a worker self-restart never resets the cooldown window.

Public API
----------
    from utils.alert_cooldown import CrashAlertCooldown, AlertDecision

    _cooldown = CrashAlertCooldown(db_path="campaigns.db", default_window=900)

    decision = _cooldown.check(
        alert_type  = "task_crash",
        entity_id   = WORKER_ID,
        message     = "💥 Критическая ошибка...",
    )
    if decision.should_fire:
        await _notify_owner(decision.message)
    # If should_fire is False, the error is counted silently.
    # The next alert that fires includes a suppression note:
    #   "⚠️ 3 аналогичных ошибки подавлено за последние 15 мин"

Fail-open guarantee
-------------------
Any SQLite error returns AlertDecision(should_fire=True, message=original_message)
so alerts are never silently swallowed by an infrastructure failure.

Resetting
---------
Call cooldown.reset(alert_type, entity_id) when a worker recovers cleanly so
the next crash always fires an immediate alert regardless of prior history.
"""

from __future__ import annotations

import logging
import os
import sqlite3
from datetime import datetime, timezone
from typing import NamedTuple

logger = logging.getLogger(__name__)

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS alert_cooldowns (
    alert_type   TEXT    NOT NULL,
    entity_id    TEXT    NOT NULL,
    last_sent_at TEXT    NOT NULL,
    suppressed   INTEGER NOT NULL DEFAULT 0,
    last_error   TEXT,
    PRIMARY KEY (alert_type, entity_id)
);
"""


class AlertDecision(NamedTuple):
    """Return value of CrashAlertCooldown.check().

    should_fire — True when the caller should send the notification.
    message     — ready-to-send text; includes a suppression note when
                  errors were swallowed during the preceding cooldown window.
    """
    should_fire: bool
    message:     str


def _ru_plural(n: int, one: str, few: str, many: str) -> str:
    """Russian plural selector for N=1 / N=2..4 / N=5+."""
    if 11 <= (n % 100) <= 19:
        return many
    r = n % 10
    if r == 1:
        return one
    if 2 <= r <= 4:
        return few
    return many


class CrashAlertCooldown:
    """SQLite-backed per-channel alert rate limiter.

    One row per (alert_type, entity_id) pair.
    State survives process restarts — the cooldown window is wall-clock time.

    All methods are synchronous; each call opens its own short-lived connection
    so the class is safe to use from any thread or async context.
    """

    def __init__(
        self,
        db_path:        str = "",
        default_window: int = 900,
    ) -> None:
        self.db_path        = db_path or os.getenv("DB_PATH", "campaigns.db")
        self.default_window = default_window
        self._ensure_table()

    # ── Bootstrap ──────────────────────────────────────────────────────────────

    def _ensure_table(self) -> None:
        try:
            with self._conn() as conn:
                conn.execute(_CREATE_TABLE)
        except Exception as exc:
            logger.warning("[alert_cooldown] Could not create table: %s", exc)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=10000")
        return conn

    # ── Core decision ──────────────────────────────────────────────────────────

    def check(
        self,
        alert_type:  str,
        entity_id:   str,
        message:     str,
        window_secs: int | None = None,
    ) -> AlertDecision:
        """Decide whether to fire an alert or suppress it within the cooldown window.

        Returns AlertDecision(should_fire=True, message=...) when:
          * No alert has been sent yet for this (alert_type, entity_id), OR
          * The cooldown window has expired.

        Returns AlertDecision(should_fire=False, message='') when:
          * We are still inside the cooldown window.
            The error is counted in `suppressed` but NOT sent.

        When the cooldown expires and should_fire=True, message includes a
        suppression note if any errors were swallowed during the window::

            💥 ...original text...

            ⚠️ _3 аналогичных ошибки подавлено за последние 15 мин_
        """
        window = window_secs if window_secs is not None else self.default_window
        now    = datetime.now(timezone.utc)

        try:
            conn = self._conn()
            row  = conn.execute(
                "SELECT last_sent_at, suppressed FROM alert_cooldowns "
                "WHERE alert_type=? AND entity_id=?",
                (alert_type, entity_id),
            ).fetchone()

            if row is None:
                # First alert for this (type, entity) — always fire immediately.
                conn.execute(
                    "INSERT INTO alert_cooldowns "
                    "  (alert_type, entity_id, last_sent_at, suppressed, last_error) "
                    "VALUES (?, ?, ?, 0, ?)",
                    (alert_type, entity_id, now.isoformat(), message[:500]),
                )
                conn.commit()
                conn.close()
                logger.debug(
                    "[alert_cooldown] FIRE (first) type=%s entity=%s",
                    alert_type, entity_id,
                )
                return AlertDecision(should_fire=True, message=message)

            # Parse the stored timestamp; assume UTC if naive.
            last_sent = datetime.fromisoformat(row["last_sent_at"])
            if last_sent.tzinfo is None:
                last_sent = last_sent.replace(tzinfo=timezone.utc)
            elapsed_s = (now - last_sent).total_seconds()

            if elapsed_s >= window:
                # Cooldown expired — fire, and include aggregated suppression note.
                suppressed = int(row["suppressed"])
                final_msg  = message
                if suppressed > 0:
                    mins = max(1, round(window / 60))
                    noun = _ru_plural(
                        suppressed,
                        "аналогичная ошибка",
                        "аналогичных ошибки",
                        "аналогичных ошибок",
                    )
                    final_msg = (
                        f"{message}\n\n"
                        f"⚠️ _{suppressed} {noun} подавлено "
                        f"за последние {mins} мин_"
                    )
                conn.execute(
                    "UPDATE alert_cooldowns "
                    "SET last_sent_at=?, suppressed=0, last_error=? "
                    "WHERE alert_type=? AND entity_id=?",
                    (now.isoformat(), message[:500], alert_type, entity_id),
                )
                conn.commit()
                conn.close()
                logger.debug(
                    "[alert_cooldown] FIRE (cooldown expired, suppressed=%d) "
                    "type=%s entity=%s",
                    suppressed, alert_type, entity_id,
                )
                return AlertDecision(should_fire=True, message=final_msg)

            else:
                # Still inside cooldown window — suppress and count.
                conn.execute(
                    "UPDATE alert_cooldowns "
                    "SET suppressed=suppressed+1, last_error=? "
                    "WHERE alert_type=? AND entity_id=?",
                    (message[:500], alert_type, entity_id),
                )
                conn.commit()
                conn.close()
                remaining = int(window - elapsed_s)
                logger.info(
                    "[alert_cooldown] SUPPRESS type=%s entity=%s "
                    "cooldown=%ds remaining",
                    alert_type, entity_id, remaining,
                )
                return AlertDecision(should_fire=False, message="")

        except Exception as exc:
            # Fail-open: never swallow alerts because of an infra failure.
            logger.warning(
                "[alert_cooldown] DB error — failing open (will send): %s", exc
            )
            return AlertDecision(should_fire=True, message=message)

    # ── Lifecycle helpers ──────────────────────────────────────────────────────

    def reset(self, alert_type: str, entity_id: str) -> None:
        """Clear the cooldown for (alert_type, entity_id).

        Call this when a worker recovers cleanly (e.g. completes a task
        successfully) so the next crash always fires an immediate alert
        regardless of prior suppression history.
        """
        try:
            conn = self._conn()
            conn.execute(
                "DELETE FROM alert_cooldowns WHERE alert_type=? AND entity_id=?",
                (alert_type, entity_id),
            )
            conn.commit()
            conn.close()
            logger.debug(
                "[alert_cooldown] reset type=%s entity=%s", alert_type, entity_id
            )
        except Exception as exc:
            logger.warning("[alert_cooldown] reset failed: %s", exc)
