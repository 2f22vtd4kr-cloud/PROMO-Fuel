---
name: Pre-flight account health check
description: Telethon get_me() health check before each broadcast task; marks bad accounts INACTIVE
---

# Pre-flight account check (utils/preflight.py)

## Integration point
`run_group_campaign_task()` in `groupbroadcaster.py` — called immediately after `_initial_connect()` succeeds, before the send loop.  Reuses the already-live TCP connection; no extra handshake.

## Checks performed
1. `get_me()` — verifies session is authorized server-side (not just locally).
   - Returns `None` → session expired/revoked → mark `is_active=0, status='session_invalid'`
   - `UserDeactivatedBanError` → mark `is_active=0, is_banned=1, status='banned'`
   - `SessionRevokedError` / `AuthKeyUnregisteredError` / `AuthKeyDuplicated` → `session_invalid`
   - `FloodWaitError` → treat as transient (account is alive)
   - Timeout / unknown error → treat as transient (fail-open)
2. `me.restrictions` list — logged as a warning; does NOT mark inactive (may be regional).

## Cache
In-memory dict `_cache: dict[int, tuple[bool, float, str]]`.  TTL = `PREFLIGHT_CACHE_TTL` env var (default 900 s = 15 min).  Cache entry is invalidated (popped) on hard failure so the next task attempt runs a fresh check.  `invalidate_cache(account_id)` is called from the `UserDeactivatedBanError` handler in `_try_send` to synchronise the live-ban path.

## DB columns added (Step 5 migrations)
- `sender_accounts.preflight_ok_at TEXT` — timestamp of last successful check
- `sender_accounts.last_preflight_at TEXT` — timestamp of last check (any result)
- `sender_accounts.preflight_status TEXT` — `'ok'` | `'session_invalid'` | `'banned'` | NULL

## Fail-open guarantee
Any transient/unknown error returns `PreflightResult(ok=True)` — a brief API hiccup never blocks a campaign.  Only deterministic hard errors (ban, revocation) mark the account inactive.

## On preflight failure
`run_group_campaign_task` returns immediately with `results["ok"]=False`.  The `finally` block runs: releases FileLock, clears `broadcasting=0`, marks account `idle`.  Worker calls `fail_task()` which re-queues up to `max_attempts`.  The campaign queue continues processing other campaigns unaffected.

**Why:** catching session revocation and bans before the send loop prevents: (a) sending partial messages before a hard failure mid-loop, (b) false "proxy failed" errors when the real cause is an invalid session.
