# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 4-vector registration hardening in `account_factory.py`

**Vector 1 — Device telemetry / locale fingerprint**

- Expanded `_COUNTRY_LANG_MAP` from 32 → 72 entries. Previously KH (Cambodia), MM (Myanmar), LA (Laos), and many others fell through to the default `("en", "en-US")` — an obvious bot fingerprint for non-English-speaking countries. All 72 entries now map to the native locale of a real mobile user in that country.
- Expanded `_REGISTRATION_CREDS` from 5 → 16 entries (3 Desktop Windows + 2 Desktop macOS + 11 iOS models). New iPhone 17 Pro Max/Pro, iPhone 16 Pro Max/Pro/base, iPhone 15 Pro Max, iPhone SE (3rd gen), macOS 15.3.1, macOS 14.6.1 entries added. Bigger shuffled pool means each of the 5 retry attempts uses a genuinely different device fingerprint.

**Vector 2 — SentCode interception logging**

Already complete from a prior session. TELEMETRY 2 emits `type`, `phone_code_hash[:8]`, `timeout`, `next_type`, and `via` on every send_code response. No change needed.

**Vector 3 — Remote DNS through proxy**

Already correct: `_parse_proxy()` always returns `rdns=True`, Telethon gets it via the proxy tuple, and HTTP exit-IP checks use `socks5h://`. No change needed.

**Vector 4 — SMSPool polling restructure**

Polling loop rewritten:
- **Primary: `/request/active`** (SMSPool docs say "use this as primary — lists all orders in one batch call, rate-limit friendly"). TELEMETRY 3a now logs this endpoint.
- **Secondary: `/sms/check`** runs every poll cycle AFTER the active check. Catches `status=3` (complete, disappeared from active list) and `status=6` (refunded). TELEMETRY 3b logs this.
- Previously, `/request/active` was dead code — `continue` at the end of the `/sms/check` branch always skipped it. Now both are called every 4 seconds.
- `SMSPOOL_ACTIVE` promoted from a local string literal to a top-level module constant.

**Process-level `SendCodeUnavailable` country blacklist**

- New module-level set `_RECYCLED_COUNTRY_POOL: set[str]` — lives for the Python process lifetime.
- When `SendCodeUnavailableError` fires, `_RECYCLED_COUNTRY_POOL.add(country_id.lower())` is called immediately (backend-side complement to the UI fix from last session).
- `_registration_stream()` now starts with an early-abort check: if the requested country is already in `_RECYCLED_COUNTRY_POOL`, it yields `sms_retry_prompt` and returns without buying a number — zero SMSPool balance burned.

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + 2 workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080, better-sqlite3 rebuilt)
- **Telegram Mini App**: port 5000 in use (already running from before restart — normal)
- **CRM / Mockup sandbox**: FAILED (vite not found — canvas-only tools, not needed for normal operation)
- **DB**: campaigns.db restored from PG snapshot, migrations current

---

## Key file locations

- `account_factory.py` — all 4-vector changes above
  - `_RECYCLED_COUNTRY_POOL` — line ~68
  - `_COUNTRY_LANG_MAP` — line ~125 (72 entries)
  - `_REGISTRATION_CREDS` — line ~223 (16 entries)
  - blacklist early-abort — inside `_registration_stream()`, line ~977
  - `SendCodeUnavailableError` handler — adds to blacklist, line ~1566
  - polling loop — line ~1730 (primary: SMSPOOL_ACTIVE, secondary: SMSPOOL_CHECK)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` — `sms_retry_prompt` handler with `isHardRecycled` guard (prior session)

---

## Pending / watch items

- `DEVICE_PROFILES` Android pool (30 entries, line ~82) is still unused in registration. All devices have `rdns=True` in proxy setup, but the pool has no hook into `_REGISTRATION_CREDS` (would need an official Android api_id, which is not publicly documented). Remove dead code or document as reserved.
- 409 Conflict in bot logs is normal — clears after ~35s when the previous polling token expires.
- `[pg-guard] FAILED to create saved_proxies — duplicate key` in API Server logs is a harmless idempotent index conflict; the table and index already exist.
