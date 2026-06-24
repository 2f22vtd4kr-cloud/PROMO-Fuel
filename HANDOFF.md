# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 4-vector registration hardening + external audit response in `account_factory.py`

**Vector 1 — Device telemetry / locale fingerprint**
- Expanded `_COUNTRY_LANG_MAP` from 32 → 72 entries. KH (Cambodia `km-KH`), MM (Myanmar `my-MM`), LA (Laos `lo-LA`), and 36+ others previously fell through to `("en", "en-US")` — a bot fingerprint for non-English countries.
- Expanded `_REGISTRATION_CREDS` from 5 → 16 entries: 3 Desktop Windows + 2 Desktop macOS + 11 iOS models (iPhone 17 Pro Max/Pro, 16 Pro Max/Pro/base, 15 Pro Max, 15 Pro, 15, 14 Pro Max, 14 Pro, SE 3rd gen). Pool is shuffled per registration run.

**Vector 2 — SentCode interception**
Already complete from a prior session. TELEMETRY 2 logs `type`, `phone_code_hash[:8]`, `timeout`, `next_type`, `via` on every send_code. Extensive `SentCodeTypeApp` → ResendCode → official creds multi-layer recovery exists (line ~1515).

**Vector 3 — Remote DNS**
Already correct from a prior session. `_parse_proxy()` always returns `rdns=True`; HTTP checks use `socks5h://`.

**Vector 4 — SMSPool polling restructure**
- `/request/active` is now **primary** (SMSPool docs recommend this). TELEMETRY 3a logs it.
- `/sms/check` runs as **secondary** every cycle — catches status=3 (completed) and status=6 (refunded). TELEMETRY 3b logs it.
- `SMSPOOL_ACTIVE` promoted to top-level module constant.

**Process-level `SendCodeUnavailable` country blacklist**
- `_RECYCLED_COUNTRY_POOL: set[str]` (module-level) — survives for the Python process lifetime.
- Written when `SendCodeUnavailableError` fires. `_registration_stream()` aborts immediately (no number purchase) if country already in the set.

**Mid-poll ResendCodeRequest removed**
External audit flagged that issuing `ResendCodeRequest` during an active SMS wait may trigger Telegram's anti-automation flag for fresh-number flows, causing silent SMS drops on the current and subsequent retries. The mid-poll resend (previously at 60s remaining) has been removed. The outer retry loop already handles timeout: cancel order → buy fresh number. The `_resent_code` variable removed (now dead code).

---

## Architecture notes — what the external audit got wrong vs. right

**Already implemented (audit claimed missing):**
- Device fingerprint with randomized pool → done (16-entry shuffled `_REGISTRATION_CREDS`)
- Country-aware locale → done (72 entries). Audit's example hardcodes `lang_code="en"` which is worse.
- `SentCodeTypeApp` interception → done and more sophisticated than audit suggested
- Remote DNS / `socks5h://` → done
- `/request/active` as primary polling → done this session

**Audit's code sample is a regression** — it uses no api_id override (would use dev api_id, shadow-blocked after ~20 regs) and hardcodes `lang_code="en"` universally.

**Audit's one valid new claim** — mid-poll ResendCode may cause shadow bans → removed.

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + 2 workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: running on port 5000
- **DB**: campaigns.db current, PG snapshot in sync

---

## Key file locations

- `account_factory.py`
  - `_RECYCLED_COUNTRY_POOL` — line ~68
  - `_COUNTRY_LANG_MAP` — line ~125 (72 entries)
  - `_REGISTRATION_CREDS` — line ~223 (16 entries)
  - blacklist early-abort — inside `_registration_stream()`, line ~977
  - `SendCodeUnavailableError` handler — adds to blacklist, line ~1566
  - polling loop — line ~1730 (primary: SMSPOOL_ACTIVE, secondary: SMSPOOL_CHECK, no mid-poll resend)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` — `sms_retry_prompt` handler with `isHardRecycled` guard

---

## Pending / watch items

- `DEVICE_PROFILES` Android pool (30 entries, line ~82) still unused in registration — needs official Android api_id (not publicly documented) to be useful. Leave as is.
- `[pg-guard] FAILED to create saved_proxies — duplicate key` in API Server logs is a harmless idempotent index conflict.
- 409 Conflict in bot logs is normal — clears after ~35s.
