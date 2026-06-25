# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix 1 — ResendCode always attempted regardless of next_type=None

When Telegram returned `SentCodeTypeApp` with `next_type=None`, factory was skipping ResendCode entirely. Fixed by removing the `if _raw_next_type is None: skip` branch — ResendCode now always runs. `SendCodeUnavailableError` handling unchanged.

`account_factory.py` ~line 1772: `if True:` replaces old `if _raw_next_type is not None:` guard.

### Fix 2 — Don't declare pool recycled after just 1 number

First recycled confirm now does `cancel + continue` (retries with fresh number). Only after 2 consecutive recycled numbers does it flag `_RECYCLED_COUNTRY_POOL` and stop.

`account_factory.py` ~line 1938: `_app_stuck_count < 2` → `continue`, else → `return`.

### Fix 3 — Minimize button stays on pipeline page (not factory menu)

When `sms_retry_prompt` arrived, frontend set `runState("idle")` which hid the 8-step pipeline. Pressing `—` (minimize) then showed the factory form instead of the pipeline with visible errors.

Fix: changed `setRunState("idle")` → `setRunState("error")` in the `sms_retry_prompt` SSE handler (`AccountFactory.tsx` ~line 1957). Now:
- `—` minimizes popup → pipeline stays visible with all step states/errors
- User can examine what failed
- Tap pill → re-opens popup to pick new country
- "🔄 Register More" button on pipeline → resets to factory form

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - ResendCode block (~line 1772) — `if True:` always tries ResendCode
  - Official creds check result handler (~line 1938) — `_app_stuck_count < 2` → continue, else → return
  - `_rewrite_proxy_country()` (~line 856) — alpha-2 only guard
  - Geo check block (~line 1316) — `_geo_target_cc` derived from proxy URL for numeric IDs
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `sms_retry_prompt` SSE handler (~line 1957) — `setRunState("error")` keeps pipeline visible
  - `GeoCheckCard` component (~line 226) — renders geo check result

---

## SMSPool country_id facts

- SMSPool's `country_id` is their OWN internal sequential integer — NOT an ITU dialing code.
- "44" = Uzbekistan in SMSPool's system.
- Always extract ISO target from proxy URL (`country-XX`) when doing ISO-comparison with a numeric country_id.
