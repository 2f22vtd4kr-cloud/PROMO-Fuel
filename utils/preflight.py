"""Pre-flight health check for Telethon sender accounts.

Checks performed
----------------
1. Session validity  — ``client.get_me()`` must succeed and return a non-None user.
2. Account status    — Telegram must not have banned or deactivated the account.

Checks NOT performed here (handled elsewhere)
----------------------------------------------
- Proxy connectivity: validated by ``_initial_connect`` in groupbroadcaster.py.
- Session file presence: validated by ``_connect_with_proxy`` in groupbroadcaster.py.
- ``is_active`` / ``is_banned`` DB flags: validated in ``run_group_campaign_task``
  before connecting.

Database status transitions on hard failure
-------------------------------------------
Session revoked / expired  → ``is_active=0, status='session_invalid'``
Account banned by Telegram → ``is_active=0, is_banned=1, status='banned'``

Hard-failure writes happen immediately so the CRM reflects the correct state.
The in-memory cache entry is invalidated on hard failure so the next task
attempt runs a fresh check rather than serving a stale "ok" result.

Result caching
--------------
Successful checks are cached for ``PREFLIGHT_CACHE_TTL`` seconds (default 900 = 15 min)
to avoid calling ``get_me()`` on every task for a healthy busy account.
The cache is per-process (worker) and cleared on restart.

Fail-open behaviour
-------------------
Transient errors (timeouts, unexpected RPC errors, FloodWait on get_me) return
``PreflightResult(ok=True)`` so a brief API hiccup never blocks an entire broadcast.
Only hard, deterministic errors (ban, session revocation) mark an account inactive.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import aiosqlite
from telethon import TelegramClient
from telethon.errors import (
    AuthKeyDuplicated,
    AuthKeyUnregisteredError,
    FloodWaitError,
    SessionRevokedError,
    UserDeactivatedBanError,
)

logger = logging.getLogger(__name__)

DB_PATH             = os.getenv("DB_PATH", "campaigns.db")
PREFLIGHT_CACHE_TTL = int(os.getenv("PREFLIGHT_CACHE_TTL", "900"))  # 15 minutes
PREFLIGHT_TIMEOUT   = int(os.getenv("PREFLIGHT_TIMEOUT",   "30"))   # seconds for get_me()

# ── In-memory result cache ─────────────────────────────────────────────────────
# account_id → (ok: bool, monotonic_ts: float, reason: str)
_cache:      dict[int, tuple[bool, float, str]] = {}
_cache_lock: asyncio.Lock                       = asyncio.Lock()


@dataclass
class PreflightResult:
    """Return value of run_account_preflight().

    ok     — True when the account passed all checks; False on a hard failure.
    reason — Human-readable detail when ok=False; empty string when ok=True.
    """
    ok:         bool
    account_id: int
    reason:     str = ""


def invalidate_cache(account_id: int) -> None:
    """Synchronously evict a cached entry so the next check always runs live.

    Call this from the ban-handling path in groupbroadcaster if the account
    is detected as banned DURING a send (not just during pre-flight).
    """
    _cache.pop(account_id, None)


# ── Public API ─────────────────────────────────────────────────────────────────

async def run_account_preflight(
    client:  TelegramClient,
    account: dict,
) -> PreflightResult:
    """Verify account health using an already-connected Telethon client.

    This is called by ``run_group_campaign_task`` immediately after
    ``_initial_connect`` succeeds, before the send loop starts.  The
    already-live connection is reused — no extra TCP handshake is needed.

    Returns ``PreflightResult(ok=True)`` when the account is healthy.
    Returns ``PreflightResult(ok=False, reason=...)`` on hard failure,
    having already written the updated status to the database.
    """
    acc_id = int(account["id"])

    # ── Serve from cache if still warm ───────────────────────────────────────
    async with _cache_lock:
        entry = _cache.get(acc_id)
    if entry is not None:
        ok, ts, reason = entry
        age = time.monotonic() - ts
        if age < PREFLIGHT_CACHE_TTL:
            log = logger.debug if ok else logger.info
            log(
                "[preflight] Account %d: %s (cached, %.0fs ago)",
                acc_id, "OK" if ok else f"FAIL — {reason}", age,
            )
            return PreflightResult(ok=ok, account_id=acc_id, reason=reason)

    # ── Live check ────────────────────────────────────────────────────────────
    result = await _run_live_check(client, account)

    # ── Persist result to cache and DB ────────────────────────────────────────
    async with _cache_lock:
        if result.ok:
            _cache[acc_id] = (True, time.monotonic(), "")
        else:
            # Hard failure: do NOT cache — force a fresh check next time so
            # an operator who fixes the account doesn't have to wait for TTL.
            _cache.pop(acc_id, None)

    if result.ok:
        await _persist_preflight_ok(acc_id)

    return result


# ── Live Telegram check ────────────────────────────────────────────────────────

async def _run_live_check(client: TelegramClient, account: dict) -> PreflightResult:
    """Call ``get_me()`` and inspect the result.  Never raises — all paths handled."""
    acc_id = int(account["id"])

    try:
        me = await asyncio.wait_for(
            client.get_me(),
            timeout=float(PREFLIGHT_TIMEOUT),
        )

    except asyncio.TimeoutError:
        # Transient — proceed and let the send loop surface the real problem.
        logger.warning(
            "[preflight] Account %d: get_me() timed out (%ds) — treating as transient",
            acc_id, PREFLIGHT_TIMEOUT,
        )
        return PreflightResult(ok=True, account_id=acc_id,
                               reason=f"get_me timeout {PREFLIGHT_TIMEOUT}s (transient)")

    except UserDeactivatedBanError as exc:
        reason = f"Account deactivated/banned by Telegram: {exc}"
        logger.error("[preflight] Account %d HARD FAIL — %s", acc_id, reason)
        await _mark_banned(acc_id, reason)
        return PreflightResult(ok=False, account_id=acc_id, reason=reason)

    except (SessionRevokedError, AuthKeyUnregisteredError, AuthKeyDuplicated) as exc:
        reason = f"Session revoked or auth key invalid: {exc}"
        logger.error("[preflight] Account %d HARD FAIL — %s", acc_id, reason)
        await _mark_session_invalid(acc_id, reason)
        return PreflightResult(ok=False, account_id=acc_id, reason=reason)

    except FloodWaitError as exc:
        # get_me() triggering FloodWait is extremely rare but harmless —
        # the account is alive, just rate-limited on the MTProto layer.
        logger.warning(
            "[preflight] Account %d: FloodWait %ds on get_me() — account is alive",
            acc_id, exc.seconds,
        )
        return PreflightResult(ok=True, account_id=acc_id,
                               reason=f"FloodWait {exc.seconds}s on get_me (proceeding)")

    except Exception as exc:
        # Unknown / transient error — do not mark inactive.
        logger.warning(
            "[preflight] Account %d: unexpected get_me() error — treating as transient: %s",
            acc_id, exc,
        )
        return PreflightResult(ok=True, account_id=acc_id,
                               reason=f"get_me transient error: {exc}")

    # ── Interpret the result object ────────────────────────────────────────────

    if me is None:
        reason = "get_me() returned None — session expired or revoked server-side"
        logger.error("[preflight] Account %d HARD FAIL — %s", acc_id, reason)
        await _mark_session_invalid(acc_id, reason)
        return PreflightResult(ok=False, account_id=acc_id, reason=reason)

    # Log any account-level restrictions (regional bans, spam warnings, etc.).
    # We do NOT mark the account inactive on mere restrictions — the account may
    # still be able to send to groups.  Hard deactivation shows up as
    # UserDeactivatedBanError above.
    restrictions = getattr(me, "restrictions", None) or []
    if restrictions:
        reasons_text = "; ".join(
            getattr(r, "reason", str(r)) for r in restrictions
        )
        logger.warning(
            "[preflight] Account %d (%s): Telegram restrictions present: %s — proceeding",
            acc_id,
            me.phone or getattr(me, "username", None) or "?",
            reasons_text,
        )

    logger.info(
        "[preflight] Account %d (%s) ✓ healthy — tg_id=%d",
        acc_id,
        me.phone or getattr(me, "username", None) or "?",
        me.id,
    )
    return PreflightResult(ok=True, account_id=acc_id)


# ── DB write helpers ───────────────────────────────────────────────────────────

async def _persist_preflight_ok(account_id: int) -> None:
    """Record a successful pre-flight in sender_accounts (fail-silent)."""
    try:
        now = datetime.now(timezone.utc).isoformat()
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE sender_accounts "
                "SET preflight_ok_at=?, last_preflight_at=?, preflight_status='ok' "
                "WHERE id=?",
                (now, now, account_id),
            )
            await db.commit()
    except Exception as exc:
        logger.debug("[preflight] _persist_preflight_ok(%d) failed: %s", account_id, exc)


async def _mark_session_invalid(account_id: int, reason: str) -> None:
    """Mark account inactive due to a revoked or expired session."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE sender_accounts "
                "SET is_active=0, status='session_invalid', "
                "    preflight_status='session_invalid', "
                "    last_preflight_at=datetime('now'), "
                "    last_error=? "
                "WHERE id=?",
                (reason[:300], account_id),
            )
            await db.commit()
        logger.warning(
            "[preflight] Account %d marked INACTIVE — status='session_invalid'", account_id
        )
    except Exception as exc:
        logger.debug("[preflight] _mark_session_invalid(%d) failed: %s", account_id, exc)


async def _mark_banned(account_id: int, reason: str) -> None:
    """Mark account inactive and banned after Telegram deactivation detection."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE sender_accounts "
                "SET is_active=0, is_banned=1, status='banned', "
                "    preflight_status='banned', "
                "    last_preflight_at=datetime('now'), "
                "    last_error=? "
                "WHERE id=?",
                (reason[:300], account_id),
            )
            await db.commit()
        logger.warning(
            "[preflight] Account %d marked INACTIVE — status='banned'", account_id
        )
    except Exception as exc:
        logger.debug("[preflight] _mark_banned(%d) failed: %s", account_id, exc)
