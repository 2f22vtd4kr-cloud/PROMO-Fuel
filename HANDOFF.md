# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. `pricing_option` always = `"1"` (highest success rate)
Removed ALL rotation of `_pricing_option` away from `"1"` in `account_factory.py`.
`_pricing_option` is set once to `"1"` and never changed. (Done previous session.)

### 2. `get_service_stock` + AI Modal + bottom badge — live quantity (Done previous session.)
See archived context if needed.

### 3. Root-cause analysis + 4 systematic Step 3-4 bugs fixed (THIS SESSION)

#### Bug 1 — CRITICAL: `code` NameError kills step 4 silently
`code` was NEVER initialised to `None` before the step-4 while-loop.
Every `if code:` or `if not code:` reference outside the conditional blocks raised
`NameError` which was caught by the `except Exception` handler — silently skipping
`/sms/check`. Real SMS codes sitting in SMSPool were NEVER found.

Fix: added `code: str | None = None` right before `_deadline = time.time() + 120`
(line ~2629, inside the per-number retry loop so each attempt resets it).

Root failure cascade:
1. Order completes → leaves `/request/active` list
2. `/request/active` returns a list (possibly empty `[]`) not containing our order
3. `if code:` at line 2700 → `NameError` → caught by `except Exception` → `/sms/check` SKIPPED
4. SMS code sits in SMSPool but is never retrieved → 120s timeout → cancel → retry
5. After 20 retries: `if code:` at line 2752 (outside try/except) → uncaught NameError → generator crash

#### Bug 2 — SNSS L0/L1 emitted wrong step number
L0 prefix-blacklist and L1 contact-check both fire BEFORE step 2 (Telethon connect)
but both emitted `{"step": 3, "status": "error"}`, making the operator think step 3
was failing. Fixed: both now emit `{"step": 1, "status": "error"}`.

#### Bug 3 — L0 inflated prefix blacklist count redundantly
When SNSS L0 fires (a prefix is already blacklisted), it was calling
`_record_recycled_prefix` AGAIN — incrementing the count on every L0-fire.
This caused exponential count inflation. Removed the redundant call inside the L0 block.

#### Bug 4 — `_SNSS_MIN_COUNT = 1` too aggressive
With threshold=1, ONE recycled detection blacklisted the entire carrier-batch prefix
for all future runs. Changed to `_SNSS_MIN_COUNT = 2` (requires two confirmations
before a prefix is blocked). Reduces false positives from SMSPool's mixed-quality batches.

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
- `_SNSS_MIN_COUNT = 2` — requires 2 recycled hits to blacklist a prefix (was 1)
- SNSS cache can be cleared via `POST /api/factory/snss/clear` if prefixes accumulate

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx — corrupted JSX, pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves ~15s.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` supervisor warnings: expected in dev.
- `pool/retrieve_valid` quantity may return 0 if SMSPool doesn't recognise the format for a specific country — graceful fallback (quantity shows only when > 0).
