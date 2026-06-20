"""Thread-safe in-memory rate limiter using a token bucket algorithm.

Usage:
    limiter = RateLimiter(rate=10, per=60.0)   # 10 actions per 60 seconds
    await limiter.acquire()                     # async, waits if needed
    limiter.acquire_sync()                      # sync version
"""
import asyncio
import threading
import time
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token-bucket rate limiter.

    Args:
        rate:    Maximum number of tokens (actions) allowed per window.
        per:     Window size in seconds.
        burst:   Maximum burst size (defaults to rate).
        name:    Label used in log messages.
    """

    def __init__(self, rate: float, per: float = 1.0,
                 burst: float | None = None, name: str = "limiter"):
        self.rate    = rate
        self.per     = per
        self.burst   = burst if burst is not None else rate
        self.name    = name

        self._tokens     = self.burst
        self._last_refill = time.monotonic()
        self._lock        = threading.Lock()
        self._async_lock  = asyncio.Lock()

    # ── Internal token management ──────────────────────────────────────────

    def _refill(self) -> None:
        now     = time.monotonic()
        elapsed = now - self._last_refill
        new_tokens = elapsed * (self.rate / self.per)
        self._tokens = min(self.burst, self._tokens + new_tokens)
        self._last_refill = now

    def _consume_one(self) -> float:
        """Return 0 if a token is available, or seconds to wait otherwise."""
        self._refill()
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return 0.0
        # Time until 1 token is available
        return (1.0 - self._tokens) * (self.per / self.rate)

    # ── Sync API ────────────────────────────────────────────────────────────

    def acquire_sync(self) -> None:
        """Block until a token is available."""
        while True:
            with self._lock:
                wait = self._consume_one()
                if wait <= 0:
                    return
            logger.debug(f"[{self.name}] rate limit — sleeping {wait:.2f}s")
            time.sleep(wait)

    def try_acquire_sync(self) -> bool:
        """Non-blocking: returns True if token acquired, False otherwise."""
        with self._lock:
            return self._consume_one() <= 0

    # ── Async API ───────────────────────────────────────────────────────────

    async def acquire(self) -> None:
        """Async: suspend until a token is available."""
        while True:
            async with self._async_lock:
                with self._lock:
                    wait = self._consume_one()
                    if wait <= 0:
                        return
            logger.debug(f"[{self.name}] rate limit — sleeping {wait:.2f}s")
            await asyncio.sleep(wait)

    async def try_acquire(self) -> bool:
        """Async non-blocking."""
        async with self._async_lock:
            with self._lock:
                return self._consume_one() <= 0

    # ── Diagnostics ─────────────────────────────────────────────────────────

    @property
    def available(self) -> float:
        with self._lock:
            self._refill()
            return self._tokens

    def __repr__(self) -> str:
        return (f"RateLimiter(name={self.name!r}, rate={self.rate}/"
                f"{self.per}s, tokens={self.available:.2f})")


class PerAccountRateLimiter:
    """Manages per-account rate limiters with shared defaults.

    Usage:
        pool = PerAccountRateLimiter(rate=20, per=60)
        await pool.acquire(account_id=42)
    """

    def __init__(self, rate: float, per: float = 60.0, burst: float | None = None):
        self.rate  = rate
        self.per   = per
        self.burst = burst
        self._limiters: dict[int, RateLimiter] = {}
        self._lock = threading.Lock()

    def _get(self, account_id: int) -> RateLimiter:
        with self._lock:
            if account_id not in self._limiters:
                self._limiters[account_id] = RateLimiter(
                    rate=self.rate, per=self.per, burst=self.burst,
                    name=f"account-{account_id}"
                )
            return self._limiters[account_id]

    async def acquire(self, account_id: int) -> None:
        await self._get(account_id).acquire()

    def acquire_sync(self, account_id: int) -> None:
        self._get(account_id).acquire_sync()

    def reset(self, account_id: int) -> None:
        with self._lock:
            self._limiters.pop(account_id, None)
