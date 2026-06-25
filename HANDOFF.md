# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix — `_rewrite_proxy_country` numeric code guard
`_rewrite_proxy_country()` in `account_factory.py` (~line 877) had a guard
`if len(cc) != 2: return proxy_string` — but numeric dialing codes like `"44"` (UK)
are also 2 chars and passed the guard, producing `country-44` in the Decodo URL which
is invalid (Decodo expects ISO alpha-2 like `country-gb`). The proxy then rejected the
SOCKS5 handshake → "Socket error: Connection closed unexpectedly".

**Fix**: added `or not cc.isalpha()` so any non-alphabetic country_id skips the rewrite.
The proxy URL is now left unchanged when `country_id` is a numeric dialing code.

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_rewrite_proxy_country()` (~line 853) ← fixed this session
  - `_proxy_geo_check()` (~line 1055)
  - `_raw_next_type` init + capture (~line 1533, 1549, 1572)
  - Skip-ResendCode when `_raw_next_type is None` (~line 1659–1665)
  - Geo check call in `_registration_stream` after asyncio gate (~line 1295–1339)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `ccToFlag()` helper (~line 205)
  - `GeoCheckCard` component (~line 215–355)
  - `geoCheck` state (~line 1144)
  - `geo_check` SSE handler + batch_reset/auto_switching resets
  - Render: after preflight banner, before batch progress banner
- `artifacts/telegram-miniapp/src/main.tsx` line 45: `@keyframes geo-ping`

---

## Pending / watch items

- If `country_id` is alphabetic (e.g. "uz", "kz") the rewrite still works as intended.
- If a future SMSPool country is a 2-letter non-alpha code, the guard is correct to skip.
- `assets/pending_avatars/` empty on fresh import — user must upload photos before
  AI mode can assign avatars.
