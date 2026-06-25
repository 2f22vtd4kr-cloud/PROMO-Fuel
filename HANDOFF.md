# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix 1 — ResendCode always attempted regardless of next_type=None

**Problem:** When Telegram returned `SentCodeTypeApp` with `next_type=None`, the factory skipped ResendCode entirely, jumping straight to the official creds check. The comment claimed "ResendCode will always return SendCodeUnavailable when next_type=None" — this is incorrect. ResendCode can and does escalate to SMS on UZ/KZ/IN carriers even when `next_type=None`.

**Fix (`account_factory.py` ~line 1772):**
- Removed the `if _raw_next_type is None: skip` branch
- Replaced `if _raw_next_type is not None:` guard with `if True:` — ResendCode now always runs
- Status message now shows `(next_type=None)` label when applicable so it's visible in the UI
- `SendCodeUnavailableError` handling unchanged (correctly flags as recycled)

### Fix 2 — Don't declare pool recycled after just 1 number

**Problem:** When official creds check also returned SentCodeTypeApp, the code immediately called `return` and flagged the entire country pool as recycled. One bad number in the pool caused the factory to stop and refuse all subsequent attempts.

**Fix (`account_factory.py` ~line 1938):**
- When `_app_stuck_count < 2`: cancel order and `continue` (retry with fresh number, no pool flag)
- When `_app_stuck_count >= 2`: flag `_RECYCLED_COUNTRY_POOL`, emit `sms_retry_prompt`, and `return`
- UI message now says "Recycled number (#1) — retrying with new number…" on first hit
- Pool confirmed message shows count: "Recycled pool confirmed (2 numbers)"

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
  - `GeoCheckCard` component (~line 226) — renders geo check result

---

## SMSPool country_id facts

- SMSPool's `country_id` is their OWN internal sequential integer — NOT an ITU dialing code.
- "44" = Uzbekistan in SMSPool's system.
- Always extract ISO target from proxy URL (`country-XX`) when doing ISO-comparison with a numeric country_id.
