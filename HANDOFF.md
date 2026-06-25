# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. `pricing_option` always = `"1"` (highest success rate) — root SMS fix
Removed ALL rotation of `_pricing_option` away from `"1"` in `account_factory.py`.
Four locations fixed:
- SNSS L0 prefix-blacklist block (rotation to "0" after 2 stuck, to "2" after 3 removed)
- SNSS L1 contact-check block (rotation to "0" after 2, to "2" after 4 removed)
- Pre-ban PhoneNumberBannedError block (comment + 2 assignments removed)
- L2 recycled detection block (comment + 4 lines removed)

`_pricing_option` is now set once to `"1"` (highest success rate) and never changed.
This was the root cause of Step 3-4 SMS failures — rotating to "0" (cheapest) fed
progressively lower-quality recycled numbers back into the loop.

### 2. `get_service_stock` — now returns live quantity
Added parallel fetch of `POST https://api.smspool.net/pool/retrieve_valid` alongside
the existing `/request/price` call. Response now includes `quantity` (actual available
numbers, summed across all pools). Falls back to 0 if endpoint fails/unknown format.

Return shape now: `{ available, stock (success_rate 0-100), price, quantity }`.

### 3. AI Analysis Modal restructured
- Added `countryAiStock` state (`{ stock, price, quantity } | null`) — fetched in
  parallel with AI analysis call inside `fetchCountryAiAnalysis`
- **SMSPool section** added at TOP of modal card: large % success rate (24px bold,
  color-coded) + available count + per-number price, inside a tinted bordered box
  labelled "📡 SMSPool · live"
- **AI freshness ring** shrunk to 34px (was 52px) and moved below SMSPool section —
  now shows as secondary info with smaller bar + pills
- Modal close button + "Use this country →" button both clear `countryAiStock`
- `fetchCountryAiAnalysis` parallel-fetches service-stock using same api_key logic
  as the main svcStock effect

### 4. Bottom svcStock badge — quantity pill added
Added green pill badge (`X доступно` / `X available`) in the subtitle row of the
existing bottom stock badge, conditionally rendered when `svcStock.quantity > 0`.
`svcStock` state type now includes `quantity: number` field throughout.

---

## Workflow status
- **Telegram Bot**: RUNNING — supervisor up, FastAPI 8083, PTB polling
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- **API Server** (port 8080): NOT STARTED (start with restart_workflow as needed)

## Architecture reminders (carry-forward)
- `_reg_pool` order: official creds shuffled (2040/2496/6) + dev api_id appended last
- `_OFFICIAL_CLIENT_CREDS` api_ids: 2040 (Desktop), 2496 (iOS), 6 (Android)
- `_is_official_primary` = `_actual_api_id in {c[0] for c in _OFFICIAL_CLIENT_CREDS}`
- ResendCode only runs for official primary api_ids; dev api_ids skip straight to L2
- `_definitive_recycled = True` → L2 skipped. Only trustworthy from official api_ids.
- `avatar-image` Express route is whitelisted from Bearer auth (`app.ts` skip list)
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `pnpm install` must always use `--ignore-scripts`
- `pricing_option=1` = "Select highest success rate" — NEVER rotate to 0 or 2

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx — corrupted JSX, pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves ~15s.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` supervisor warnings: expected in dev.
- `pool/retrieve_valid` quantity may return 0 if SMSPool doesn't recognise the format for a specific country — graceful fallback (quantity shows only when > 0).
