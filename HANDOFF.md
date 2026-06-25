# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix — Full ITU dialing-code → ISO alpha-2 mapping for proxy country rewrite

**Root cause:** SMSPool's `country_id` is a numeric ITU calling code (`"44"` = UK,
`"380"` = Ukraine, `"63"` = Philippines). `_rewrite_proxy_country()` had a guard
`if len(cc) != 2` but `"44"` passes (length 2), producing invalid `country-44` in the
Decodo URL → SOCKS5 handshake rejected → "Connection closed unexpectedly".

**Backend fix (`account_factory.py` ~line 856):**
- `_DIALCODE_TO_ISO` dict — ~150 countries, ITU numeric → ISO alpha-2
- `_ISO_ALIAS` dict — non-standard SMSPool aliases (`"uk"` → `"gb"`)
- `_normalize_country_to_iso(country_id)` — called inside `_rewrite_proxy_country()`
  before the existing alpha/length guard
- Debug SSE now shows `country-gb (was uz, input id=44)` for clarity

**Frontend fix (`AccountFactory.tsx`):**
- `proxyRewrite` state `{ from, to, inputId }` — set when debug SSE matches rewrite pattern
- Regex parse: `/country-(\w+) \(was (\w+), input id=(\w+)\)/` on every `debug` event
- Cleared on `batch_reset` and in the session reset function
- **Proxy country rewrite badge** rendered between preflight banner and GeoCheckCard:
  - Amber border/background, 🔀 icon
  - Shows `country-uz → country-gb` in monospace chips + `(your id: 44)`
  - Country flag emoji rendered from ISO code via regional-indicator Unicode trick
  - Bilingual label (UA/EN)

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_DIALCODE_TO_ISO` (~line 861) — ITU → ISO table
  - `_ISO_ALIAS` (~line 920) — SMSPool non-standard alias overrides
  - `_normalize_country_to_iso()` (~line 926) — normalizer
  - `_rewrite_proxy_country()` (~line 940) — calls normalizer first
  - Debug SSE rewrite message (~line 1293)
  - `_proxy_geo_check()` (~line 1150)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `proxyRewrite` state (~line 1363)
  - `debug` SSE handler with regex parse (~line 1840)
  - `batch_reset` clears `proxyRewrite` (~line 1853)
  - Reset function clears `proxyRewrite` (~line 2012)
  - Proxy rewrite badge render (~line 4462)
  - `GeoCheckCard` component (~line 226)

---

## Pending / watch items

- `"7"` maps to `"ru"` — Russia and Kazakhstan share +7. Use custom `"kz"` for KZ exits.
- `assets/pending_avatars/` empty on fresh import — must upload photos before AI mode.
