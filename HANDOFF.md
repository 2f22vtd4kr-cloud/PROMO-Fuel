# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Account Factory — Step 3 SMS flow fixes (3 fixes total)

**Fix A — `PhoneNumberInvalidError` killed the whole factory**
Imported `PhoneNumberInvalidError` from `telethon.errors`. Now caught explicitly
in both the raw-request and fallback `send_code_request` paths. Cancels the
SMSPool order and `continue`s to the next number instead of `return` (abort).

**Fix B — "definitive recycled" false positive on dev api_id**
The triple `SentCodeTypeApp + next_type=None + ResendCode→SendCodeUnavailable`
now only sets `_definitive_recycled = True` (skipping L2) when `_actual_api_id`
is an official Telegram api_id (2040/2496/6). Dev api_ids fall through to L2.

**Fix C — Dev api_id moved to END of `_reg_pool`; ResendCode skipped for dev**
Root cause of persistent SentCodeTypeApp: the dev api_id (30533575) was FIRST
in `_reg_pool`. Telegram routes all SendCode requests from a dev api_id to the
developer's own installed Telegram app → SentCodeTypeApp for EVERY number
(fresh or recycled). This made the dev api_id useless as a freshness detector
and added ~10-15s overhead per attempt before L2 could run.

Two sub-fixes:
1. `_reg_pool.append(...)` instead of `.insert(0, ...)` — official creds (2040/2496/6)
   are now tried first. Dev api_id is last resort (only if all official ids shadow-blocked).
2. ResendCode is now gated on `_is_official_primary` — skipped for dev api_ids
   (ResendCode from a dev api_id always returns SendCodeUnavailable, wastes 1-2s).

**Files changed**: `account_factory.py`
- Import: added `PhoneNumberInvalidError`
- ~line 1787: `append` instead of `insert(0, ...)`
- ~line 2255: `_is_official_primary` guard for ResendCode block
- ~line 2278: `_definitive_recycled` guard — official api_ids only

---

## Workflow status
- **Telegram Bot**: RUNNING — supervisor up, FastAPI 8083, PTB polling, all 12 migrations OK
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- **API Server** (port 8080): RUNNING — serving static dist

## Architecture reminders (carry-forward)
- `_reg_pool` order: official creds shuffled (2040/2496/6) + dev api_id appended last
- `_OFFICIAL_CLIENT_CREDS` api_ids: 2040 (Desktop), 2496 (iOS), 6 (Android)
- `_is_official_primary` = `_actual_api_id in {c[0] for c in _OFFICIAL_CLIENT_CREDS}`
- ResendCode only runs for official primary api_ids — skipped for dev api_ids
- `_definitive_recycled = True` → L2 skipped. Only trustworthy from official api_ids.
- `_actual_api_id` tracks the active credential for DB save & sign-in
- `_app_stuck_count` unified bad-number counter: L0 abort at user-configured SNSS threshold
- `_RECYCLED_COUNTRY_POOL`: process-global; only populated after ≥5 consecutive failures
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `pnpm install` must always use `--ignore-scripts` — node-gyp breaks on Node 20/24 mismatch

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx — corrupted JSX, pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves in ~15s.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` warnings in supervisor log: expected in dev.
- proxy-store PG duplicate-type error on API server init: harmless, guarded by pg-guard.
