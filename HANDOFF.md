# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix — Proxy country rewrite: numeric SMSPool IDs must never trigger rewrite

**Root cause (corrected understanding):**
SMSPool's `country_id` is their own internal sequential numeric ID — NOT any ITU
dialing code. e.g. SMSPool internal ID "44" = Uzbekistan (not UK). The rewrite
`country-uz → country-gb` was incorrect in every case where the user selected a
country from the SMSPool dropdown.

**History of fixes this session:**
1. First fix: added `not cc.isalpha()` guard — CORRECT, but then overridden.
2. Second fix (wrong): added `_DIALCODE_TO_ISO` mapping treating SMSPool IDs as ITU
   dialing codes — mapped "44" → "gb" (UK) when "44" is Uzbekistan in SMSPool.
   Made things worse: `country-uz → country-gb` for an Uzbek proxy + Uzbek numbers.
3. Final fix: removed `_DIALCODE_TO_ISO`, `_ISO_ALIAS`, `_normalize_country_to_iso`
   entirely. Restored simple guard: `if len(cc) != 2 or not cc.isalpha(): skip`.

**Correct behaviour:**
- SMSPool dropdown selection → numeric country_id → `not isalpha()` → skip rewrite
  → proxy URL untouched (operator already set it correctly for the target country)
- Custom country field (typed) → alpha-2 like "uz", "kz" → rewrite fires if the
  proxy URL has a different `country-XX` selector

**Files changed:** `account_factory.py` only (~line 856 `_rewrite_proxy_country`)

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_rewrite_proxy_country()` (~line 856) — only fires for alpha-2 custom codes
  - Debug SSE rewrite message (~line 1200)
  - `_proxy_geo_check()` (~line 1060)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `proxyRewrite` state (~line 1363) — badge shown when rewrite fires
  - `debug` SSE handler + regex parse (~line 1840)
  - Proxy rewrite badge render (~line 4462)
  - `GeoCheckCard` component (~line 226)

---

## Pending / watch items

- Proxy rewrite badge in UI still parses the debug SSE message. Since numeric IDs
  no longer trigger rewrites, the badge will only appear for custom alpha-2 typed codes.
- `assets/pending_avatars/` empty on fresh import — must upload photos before AI mode.
