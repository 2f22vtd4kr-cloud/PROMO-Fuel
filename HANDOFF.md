# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix — Full ITU dialing-code → ISO alpha-2 mapping for proxy country rewrite

**Root cause:** SMSPool's `country_id` is a numeric ITU calling code (e.g. `"44"` for UK,
`"380"` for Ukraine, `"63"` for Philippines). `_rewrite_proxy_country()` had a guard
`if len(cc) != 2` but `"44"` passes (length 2), producing invalid `country-44` in the
Decodo URL → SOCKS5 handshake rejected → "Connection closed unexpectedly".

**Fix (two parts):**

1. Added `_DIALCODE_TO_ISO` dict (~150 countries) + `_normalize_country_to_iso(country_id)`
   in `account_factory.py` (~line 856). Converts numeric codes to ISO alpha-2 before rewrite:
   - `"44"` → `"gb"`, `"380"` → `"ua"`, `"63"` → `"ph"`, `"998"` → `"uz"`, etc.
   - Also handles SMSPool alias `"uk"` → `"gb"`.
   - Falls through unchanged for already-valid codes (`"uz"`, `"kz"`, `"ph"`).

2. `_rewrite_proxy_country()` now calls `_normalize_country_to_iso()` first, then applies
   the existing `len != 2 or not isalpha()` guard on the normalized result.
   Debug SSE now shows `country-gb (was uz, input id=44)` for clarity.

**Coverage:** All countries SMSPool supports + full CIS/MENA/APAC/Africa table.

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_DIALCODE_TO_ISO` dict (~line 861) — ITU code → ISO alpha-2 table
  - `_ISO_ALIAS` dict (~line 920) — SMSPool non-standard alias overrides
  - `_normalize_country_to_iso()` (~line 926) — normalizer called by rewrite
  - `_rewrite_proxy_country()` (~line 940) — uses normalizer, then guards
  - Debug SSE rewrite message (~line 1293) — shows resolved ISO + input id
  - `_proxy_geo_check()` (~line 1150) — verifies exit IP country via ip-api.com
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `GeoCheckCard` component (~line 215) — visual geo verification card
  - `geo_check` SSE handler — updates GeoCheckCard state

---

## Pending / watch items

- `"7"` maps to `"ru"` — Russia and Kazakhstan share +7. Decodo `country-ru` will
  get Russian exit nodes even for KZ numbers. If KZ registration is needed, operator
  should either use `"kz"` as custom country or a KZ-specific proxy.
- `assets/pending_avatars/` empty on fresh import — must upload photos before AI mode.
