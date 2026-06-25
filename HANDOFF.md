# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Import migration completed
- `post-merge.sh` ran: Python deps installed, better-sqlite3 compiled, Drizzle schema pushed
- All 8 required secrets confirmed present in Replit secrets store
- Both workflows verified RUNNING: Telegram Bot (supervisor + FastAPI 8083 + PTB) and Mini App (Vite port 5000)

### 2. `max_attempts` — configurable number budget per account (THIS SESSION)

**Problem:** `MAX_NUM_RETRIES` was hardcoded to `20` in `_registration_stream`. The SNSS architecture and the UI were disconnected — user couldn't change how many SMSPool numbers to burn per registration attempt, and quantity was capped at 10.

**Changes:**
- `account_factory.py` — `_registration_stream`: added `max_attempts: int = 20` param; `MAX_NUM_RETRIES = max(1, min(max_attempts, 999))` replaces hardcoded 20
- `account_factory.py` — `register_account`: parses `max_attempts` from body (clamp 1–999, default 20); also raised `quantity` server-side cap 10→20
- `account_factory.py` — `_generate_inner`: passes `max_attempts=max_attempts` through to `_registration_stream`
- `AccountFactory.tsx`: `maxAttempts` state (default 20); added "Макс. спроб номерів" number input (1–999, orange glow when >20); quantity stepper max raised 10→20; `max_attempts: maxAttempts` added to fetch body
- `AccountFactory.tsx` — cost estimator banner below the max attempts input: computes `estCost = maxAttempts × svcStock.price × quantity`; compares against `balanceData.balance` — red card + "⚠ не вистачає" when over budget, green when within budget, neutral grey when balance not yet fetched. Renders only when `svcStock.price > 0` (i.e. country selected and stock loaded).

**Log message now reflects real config:** "attempt 2/999" when set to 999.

---

## Workflow status
- **Telegram Bot**: RUNNING — supervisor up, FastAPI 8083, PTB polling (409 conflict on dual-instance start, self-resolves)
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
- `_SNSS_MIN_COUNT = 2` — requires 2 recycled hits to blacklist a prefix (was 1)
- SNSS cache can be cleared via `POST /api/factory/snss/clear` if prefixes accumulate
- `max_attempts` is now a full-stack param (UI → body → `_registration_stream` → `MAX_NUM_RETRIES`); quantity server cap is 20

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx — corrupted JSX, pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves ~15s.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` supervisor warnings: expected in dev.
- `pool/retrieve_valid` quantity may return 0 if SMSPool doesn't recognise the format for a specific country — graceful fallback (quantity shows only when > 0).
- SentCodeTypeApp + next_type=None = recycled number (not an API cred issue). api_id 2496 in debug logs = hardcoded official iOS cred, NOT the user's TELETHON_API_ID secret.
