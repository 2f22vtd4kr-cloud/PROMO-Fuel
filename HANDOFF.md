# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix 1 — Proxy country rewrite: numeric SMSPool IDs must never trigger rewrite

`_rewrite_proxy_country()` in `account_factory.py` only fires when `country_id` is
a 2-letter alpha string (ISO alpha-2 custom code typed by operator). SMSPool's
dropdown sends numeric internal IDs (e.g. "44" = Uzbekistan in SMSPool's system —
not UK). Numeric IDs skip the rewrite entirely; proxy URL is untouched.

Removed: `_DIALCODE_TO_ISO`, `_ISO_ALIAS`, `_normalize_country_to_iso` — all gone.

### Fix 2 — Geo-check false mismatch for numeric SMSPool country IDs

**Problem:** geo_check compared `detected_cc="UZ"` vs `target_cc="44"` → always
false mismatch for SMSPool dropdown selections.

**Fix (line ~1316 in `_registration_stream`):**
- When `country_id.isdigit()` → extract geo target from proxy URL via
  `country-([a-z]{2})` regex (e.g. `country-uz` → "UZ")
- Use that ISO code for the ip-api comparison and `target_cc` SSE field
- If proxy has no `country-XX` selector → treat as informational, force `match=True`
- When `country_id` is already alpha-2 → used directly (unchanged path)

Result: UZ proxy + SMSPool ID "44" → geo target = "UZ" → exit IP in Uzbekistan →
green ✅ match, no false warning.

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_rewrite_proxy_country()` (~line 856) — alpha-2 only guard
  - Geo check block (~line 1316) — `_geo_target_cc` derived from proxy URL for numeric IDs
  - `_proxy_geo_check()` (~line 1055) — ip-api lookup
  - Debug SSE rewrite message (~line 1200)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `proxyRewrite` state (~line 1363) — badge shown when rewrite fires
  - `GeoCheckCard` component (~line 226) — renders geo check result
  - `debug` SSE handler + regex parse (~line 1840)

---

## SMSPool country_id facts

- SMSPool's `country_id` is their OWN internal sequential integer — NOT an ITU
  dialing code. "44" = Uzbekistan, "380" might be something else entirely.
- Never map SMSPool numeric IDs to ITU calling codes.
- Always extract the ISO target from the proxy URL (`country-XX`) when doing
  any ISO-comparison with a numeric country_id.
