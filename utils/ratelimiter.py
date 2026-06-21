"""Thread-safe sliding-window rate limiter keyed by account_id.

Design rationale
----------------
A sliding-window counter is more accurate than a token bucket for burst
prevention: it tracks the *actual timestamps* of recent calls rather than
approximating them with a refill rate.  This means a window of "20 calls per
60 s" is enforced as "no more than 20 calls in any rolling 60-second interval"
rather than "20 calls per fixed minute boundary."

Concurrency model
-----------------
Both sync and async callers are supported.  A threading.Lock serialises all
mutations to the shared deque so it is safe to use across threads AND across
coroutines within the same event loop.

Architecture
------------
SlidingWindowLimiter    — single-account limiter backed by a collections.deque
                          of monotonic timestamps.
PerAccountRateLimiter   — pool of per-account limiters with lazy creation,
                          also protected by a threading.Lock.

Intercepting DB round-trips
---------------------------
The rate limiter sits in front of every outbound Telethon API call.  By
enforcing limits in-memory — before any network or database I/O — it prevents
high-frequency abuse from ever reaching the Telegram API and avoids the
expensive "sender_accounts UPDATE + flood_wait_until write" cycle that a
FloodWaitError would trigger.

Public API (backward-compatible)
----------------------------------
PerAccountRateLimiter(rate, per, burst)
    .acquire(account_id)        async  — suspend until a slot is free
    .acquire_sync(account_id)   sync   — block until a slot is free
    .reset(account_id)                 — clear limits for an account (e.g. on ban)

RateLimiter (alias for SlidingWindowLimiter, kept for import compatibility)

SlidingWindowLimiter(rate, per, name)
    .acquire()       async
    .acquire_sync()  sync
    .try_acquire()   async bool  — non-blocking check
    .try_acquire_sync()  sync bool
    .available       property int  — free slots right now
"""
from __future__ import annotations

import asyncio
import collections
import logging
import threading
import time
from typing import Deque

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Core sliding-window limiter
# ─────────────────────────────────────────────────────────────────────────────

class SlidingWindowLimiter:
    """Rate limiter using a sliding window of recorded call timestamps.

    Algorithm
    ---------
    A deque stores the monotonic timestamp of every call that succeeded within
    the current window.  Before each new call:

        1. Acquire the threading lock (prevents races across threads/coroutines).
        2. Evict all entries older than `now - per` (they are outside the window).
        3. If len(deque) < rate: record `now`, release lock, return immediately.
        4. Otherwise: compute `wait = deque[0] + per - now` (time until the
           oldest entry expires and frees a slot), release lock, sleep *wait*,
           then retry from step 1.

    Because the lock is released before sleeping, other coroutines/threads can
    still make progress while this caller waits.

    Args:
        rate:  Maximum number of calls allowed within any rolling *per*-second window.
        per:   Window size in seconds.
        name:  Label used in log messages (e.g. "account-42").
    """

    def __init__(self, rate: int, per: float = 60.0, name: str = "limiter") -> None:
        if rate <= 0:
            raise ValueError(f"rate must be > 0, got {rate}")
        if per <= 0:
            raise ValueError(f"per must be > 0, got {per}")

        self.rate = rate
        self.per  = per
        self.name = name

        self._timestamps: Deque[float] = collections.deque()
        self._lock = threading.Lock()

    # ── Internal primitives ───────────────────────────────────────────────────

    def _evict(self, now: float) -> None:
        """Remove timestamps that have fallen outside the current window.

        Must be called with self._lock held.
        """
        cutoff = now - self.per
        while self._timestamps and self._timestamps[0] <= cutoff:
            self._timestamps.popleft()

    def _try_consume(self) -> float:
        """Attempt to consume one slot.

        Must be called with self._lock held.

        Returns:
            0.0   — slot consumed successfully; caller may proceed.
            >0.0  — seconds the caller must wait before a slot becomes available.
        """
        now = time.monotonic()
        self._evict(now)

        if len(self._timestamps) < self.rate:
            self._timestamps.append(now)
            return 0.0

        # Oldest timestamp in the window; it will expire in (ts + per - now) seconds.
        wait = self._timestamps[0] + self.per - now
        return max(wait, 0.001)  # never return exactly 0 on failure path

    # ── Sync API ──────────────────────────────────────────────────────────────

    def try_acquire_sync(self) -> bool:
        """Non-blocking synchronous attempt.  Returns True if a slot was consumed."""
        with self._lock:
            return self._try_consume() == 0.0

    def acquire_sync(self) -> None:
        """Block the calling thread until a rate-limit slot is available."""
        while True:
            with self._lock:
                wait = self._try_consume()
                if wait == 0.0:
                    return
            logger.debug("[ratelimiter:%s] slot busy — sleeping %.3fs", self.name, wait)
            time.sleep(wait)

    # ── Async API ─────────────────────────────────────────────────────────────

    async def try_acquire(self) -> bool:
        """Non-blocking async attempt.  Returns True if a slot was consumed."""
        with self._lock:
            return self._try_consume() == 0.0

    async def acquire(self) -> None:
        """Suspend the current coroutine until a rate-limit slot is available.

        The threading lock is held only during the brief _try_consume() check and
        released before the await, so the event loop is never blocked.
        """
        while True:
            with self._lock:
                wait = self._try_consume()
                if wait == 0.0:
                    return
            logger.debug("[ratelimiter:%s] slot busy — waiting %.3fs", self.name, wait)
            await asyncio.sleep(wait)

    # ── Diagnostics ───────────────────────────────────────────────────────────

    @property
    def available(self) -> int:
        """Number of calls that can be made right now without waiting."""
        with self._lock:
            now = time.monotonic()
            self._evict(now)
            return max(0, self.rate - len(self._timestamps))

    @property
    def used(self) -> int:
        """Number of slots consumed in the current window."""
        with self._lock:
            now = time.monotonic()
            self._evict(now)
            return len(self._timestamps)

    def reset(self) -> None:
        """Clear all recorded timestamps, immediately freeing all slots."""
        with self._lock:
            self._timestamps.clear()

    def __repr__(self) -> str:
        return (
            f"SlidingWindowLimiter(name={self.name!r}, "
            f"rate={self.rate}/{self.per}s, "
            f"used={self.used}/{self.rate})"
        )


# Backward-compatible alias — existing code importing RateLimiter still works.
RateLimiter = SlidingWindowLimiter


# ─────────────────────────────────────────────────────────────────────────────
# Per-account limiter pool
# ─────────────────────────────────────────────────────────────────────────────

class PerAccountRateLimiter:
    """Manages one SlidingWindowLimiter per account_id with lazy initialisation.

    All access to the internal limiter map is protected by a threading.Lock so
    the pool is safe to use from multiple threads and coroutines simultaneously.

    Intercepting DB round-trips
    ---------------------------
    Call `await pool.acquire(account_id)` *before* any Telethon send call.
    The limiter will hold callers back in-memory until their slot is due,
    preventing the bursts that cause FloodWaitError (and the subsequent
    expensive DB updates to flood_wait_until).

    Usage::

        pool = PerAccountRateLimiter(rate=20, per=60.0)

        async def send_message(account_id: int, ...):
            await pool.acquire(account_id)   # blocks here if rate exceeded
            await client.send_message(...)   # only reaches Telegram when ready

    Args:
        rate:  Maximum calls per window per account.
        per:   Window size in seconds.
        burst: Ignored (kept for API compatibility with the old token-bucket
               signature); the sliding window enforces an exact cap naturally.
    """

    def __init__(
        self,
        rate: int,
        per: float = 60.0,
        burst: int | float | None = None,  # accepted but not used
    ) -> None:
        self.rate  = rate
        self.per   = per
        self._pool: dict[int, SlidingWindowLimiter] = {}
        self._lock = threading.Lock()

    # ── Pool management ───────────────────────────────────────────────────────

    def _get(self, account_id: int) -> SlidingWindowLimiter:
        """Return (and lazily create) the limiter for *account_id*.

        Double-checked locking: check without lock first for the hot path, then
        re-check under lock before inserting to avoid a race on first creation.
        """
        limiter = self._pool.get(account_id)
        if limiter is not None:
            return limiter
        with self._lock:
            # Re-check: another thread may have created it while we waited
            if account_id not in self._pool:
                self._pool[account_id] = SlidingWindowLimiter(
                    rate=self.rate,
                    per=self.per,
                    name=f"account-{account_id}",
                )
            return self._pool[account_id]

    # ── Async API ─────────────────────────────────────────────────────────────

    async def acquire(self, account_id: int) -> None:
        """Suspend until a send slot is available for *account_id*.

        This is the primary entry point used by groupbroadcaster.py before
        every Telethon API call.  It intercepts high-frequency sends in-memory
        — no database round-trip occurs until the slot is actually granted.
        """
        await self._get(account_id).acquire()

    async def try_acquire(self, account_id: int) -> bool:
        """Non-blocking async attempt.  Returns False if the account is throttled."""
        return await self._get(account_id).try_acquire()

    # ── Sync API ──────────────────────────────────────────────────────────────

    def acquire_sync(self, account_id: int) -> None:
        """Block until a send slot is available for *account_id*."""
        self._get(account_id).acquire_sync()

    def try_acquire_sync(self, account_id: int) -> bool:
        """Non-blocking sync attempt."""
        return self._get(account_id).try_acquire_sync()

    # ── Utility ───────────────────────────────────────────────────────────────

    def reset(self, account_id: int) -> None:
        """Clear the rate-limit state for *account_id* (e.g., after a ban lift or restart).

        Safe to call even if no limiter has been created for this account yet.
        """
        with self._lock:
            limiter = self._pool.get(account_id)
        if limiter is not None:
            limiter.reset()
            logger.debug("[ratelimiter] reset account-%s", account_id)

    def remove(self, account_id: int) -> None:
        """Remove the limiter for *account_id* entirely (frees memory)."""
        with self._lock:
            self._pool.pop(account_id, None)

    def stats(self) -> dict[int, dict]:
        """Return a snapshot of usage stats for every tracked account."""
        with self._lock:
            ids = list(self._pool.keys())
        return {
            aid: {
                "used":      self._pool[aid].used,
                "available": self._pool[aid].available,
                "rate":      self.rate,
                "per":       self.per,
            }
            for aid in ids
            if aid in self._pool
        }

    def __repr__(self) -> str:
        return (
            f"PerAccountRateLimiter("
            f"rate={self.rate}/{self.per}s, "
            f"accounts={len(self._pool)})"
        )
