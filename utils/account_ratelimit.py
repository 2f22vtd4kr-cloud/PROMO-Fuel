"""Cross-process per-account rate limiter backed by SQLite.

Problem solved
--------------
groupbroadcaster.py previously used an in-process PerAccountRateLimiter, so
worker-1 and worker-2 each maintained their own independent counter for the
same account.  campaign_sender.py had no rate limiting at all.  Result: a
single Telegram account could receive concurrent sends from multiple workers
and the PTB campaign sender simultaneously, causing FloodWait and PeerFlood
errors.

Solution
--------
Every worker process opens the shared campaigns.db and uses
BEGIN IMMEDIATE + check-and-increment to atomically claim one send slot.
SQLite's writer-exclusive locking ensures only one process modifies the
counter at a time.  If the window is full all callers sleep until the oldest
slot expires, exactly matching the "20 messages per 60 seconds" safe zone.

Algorithm: fixed-window counter
    - window_start (unix timestamp) marks when the current window opened.
    - count tracks how many sends have been claimed in that window.
    - When now >= window_start + per: reset window_start=now, count=1, grant.
    - When count < rate: increment count, grant.
    - When count >= rate: release DB lock, sleep until window_start+per, retry.

The 2× burst at window boundaries is acceptable given that:
    a) inter-message jitter delays are already applied by each sender, and
    b) Telegram's own flood detection is approximate and account-based.

Public API
----------
    await acquire(account_id)              — suspend until slot available
    ok = await try_acquire(account_id)     — non-blocking, returns False if full
    await reset(account_id)               — clear counter (e.g. after ban lift)

All functions accept optional rate, per, db_path overrides.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time

import aiosqlite

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")

# Conservative default: 20 API calls per 60 s per account.
# Telegram's documented flood threshold is ~30/min for user accounts, but
# 20/min leaves headroom for media uploads and other non-send calls.
_DEFAULT_RATE = int(os.getenv("ACCOUNT_RATE_LIMIT_MAX", "20"))
_DEFAULT_PER  = float(os.getenv("ACCOUNT_RATE_LIMIT_WIN", "60"))

# How long to sleep between retries when SQLite is locked by another writer
_LOCK_RETRY   = 0.05   # seconds

_CREATE_SQL = """
    CREATE TABLE IF NOT EXISTS account_rate_limits (
        account_id   INTEGER PRIMARY KEY,
        window_start REAL    NOT NULL,
        count        INTEGER NOT NULL DEFAULT 0
    )
"""


async def _run_transaction(
    account_id: int,
    rate: int,
    per: float,
    path: str,
) -> float | None:
    """Try one atomic check-and-increment.

    Returns:
        None  — slot granted, caller can proceed.
        float — seconds to wait before retrying (window is full).

    Raises aiosqlite.OperationalError("database is locked") on contention;
    caller retries with back-off.
    """
    async with aiosqlite.connect(path) as conn:
        await conn.execute(_CREATE_SQL)
        await conn.commit()

        await conn.execute("BEGIN IMMEDIATE")

        async with conn.execute(
            "SELECT window_start, count FROM account_rate_limits WHERE account_id=?",
            (account_id,),
        ) as cur:
            row = await cur.fetchone()

        now = time.time()

        if row is None or now - row[0] >= per:
            # First call ever, or window expired — open a fresh window
            await conn.execute(
                "INSERT OR REPLACE INTO account_rate_limits "
                "(account_id, window_start, count) VALUES (?,?,1)",
                (account_id, now),
            )
            await conn.commit()
            return None   # granted

        current = int(row[1])
        if current < rate:
            await conn.execute(
                "UPDATE account_rate_limits SET count=count+1 WHERE account_id=?",
                (account_id,),
            )
            await conn.commit()
            return None   # granted

        # Window is full — compute wait and release the lock
        wait = row[0] + per - now
        await conn.rollback()
        return max(wait, 0.05)   # must wait


async def acquire(
    account_id: int,
    rate: int = _DEFAULT_RATE,
    per: float = _DEFAULT_PER,
    db_path: str | None = None,
) -> None:
    """Suspend the current coroutine until a send slot is available.

    Safe to call concurrently from multiple asyncio tasks and from separate
    worker processes — all contend on the same SQLite row with IMMEDIATE
    locking so the invariant "at most `rate` sends per `per` seconds" is
    enforced globally, not just within one process.
    """
    path = db_path or DB_PATH
    while True:
        try:
            wait = await _run_transaction(account_id, rate, per, path)
        except Exception as exc:
            err = str(exc).lower()
            if "database is locked" in err or "busy" in err:
                await asyncio.sleep(_LOCK_RETRY)
                continue
            # Fail-open on unexpected errors so a DB hiccup never blocks sends
            logger.warning(
                "[account_ratelimit] acquire(%d) DB error — failing open: %s",
                account_id, exc,
            )
            return

        if wait is None:
            return   # slot granted

        logger.debug(
            "[account_ratelimit] account-%d window full (%d/%d) — sleeping %.2fs",
            account_id, rate, rate, wait,
        )
        await asyncio.sleep(wait)


async def try_acquire(
    account_id: int,
    rate: int = _DEFAULT_RATE,
    per: float = _DEFAULT_PER,
    db_path: str | None = None,
) -> bool:
    """Non-blocking slot claim.

    Returns True if a slot was granted, False if the window is currently full.
    Does not sleep.  Use `acquire()` when you need to wait.
    """
    path = db_path or DB_PATH
    try:
        wait = await _run_transaction(account_id, rate, per, path)
        return wait is None
    except Exception as exc:
        err = str(exc).lower()
        if "database is locked" in err or "busy" in err:
            return False   # treat contention as "full"
        logger.warning(
            "[account_ratelimit] try_acquire(%d) DB error — failing open: %s",
            account_id, exc,
        )
        return True   # fail-open


async def reset(
    account_id: int,
    db_path: str | None = None,
) -> None:
    """Clear the rate-limit counter for an account.

    Call after a ban lift, account replacement, or worker restart when you
    want to immediately allow sends rather than waiting out the current window.
    """
    path = db_path or DB_PATH
    try:
        async with aiosqlite.connect(path) as conn:
            await conn.execute(
                "DELETE FROM account_rate_limits WHERE account_id=?",
                (account_id,),
            )
            await conn.commit()
        logger.debug("[account_ratelimit] reset account-%d", account_id)
    except Exception as exc:
        logger.warning("[account_ratelimit] reset(%d) failed: %s", account_id, exc)
