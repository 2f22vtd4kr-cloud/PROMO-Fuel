# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Account Factory — two Step 3 crash fixes

**Bug A — "definitive recycled" false positive on dev api_id**

When the primary api_id was a developer key (e.g. 30533575), the triple
`SentCodeTypeApp + next_type=None + ResendCode→SendCodeUnavailable`
was immediately setting `_definitive_recycled = True` and skipping Layer 2
(official creds 2040/2496/6) entirely. Dev api_ids can produce this triple
on *fresh* numbers simply because they aren't configured for SMS fallback —
it is NOT conclusive from a dev key alone.

**Fix**: The "definitive recycled" fast-exit now only fires when
`_actual_api_id in {c[0] for c in _OFFICIAL_CLIENT_CREDS}` (i.e. 2040,
2496, or 6). If it's a dev api_id, the code falls through to L2 with a
`🟡` yellow warning and lets the official creds give the real verdict.

**Bug B — `PhoneNumberInvalid` killed the entire factory**

SMSPool occasionally sells syntactically invalid numbers. Telegram responds
with `PhoneNumberInvalidError` on `SendCodeRequest`. This error wasn't
caught explicitly — it fell into `except Exception as e2`, wasn't classed
as transient, and hit `return` (factory abort) instead of `continue`.

**Fix**: `PhoneNumberInvalidError` is now imported from `telethon.errors`
and caught explicitly in BOTH the raw-request path and the fallback
`send_code_request` path. Both handlers cancel the SMSPool order and
`continue` to the next number — same pattern as `PhoneNumberBannedError`.

**Files changed**: `account_factory.py`
- Import: added `PhoneNumberInvalidError`
- ~line 2109: raw path — new `except PhoneNumberInvalidError` block
- ~line 2139: fallback path — same
- ~line 2277: `_definitive_recycled` guard — official api_ids only

---

## Workflow status
- **Telegram Bot**: RUNNING — supervisor up, FastAPI 8083, PTB polling, all 12 migrations OK
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- **API Server** (port 8080): RUNNING — serving static dist
- `better-sqlite3` native binary: built for Node 20 (v115 ABI) via gcc

## Architecture reminders (carry-forward)
- `_OFFICIAL_CLIENT_CREDS` api_ids: 2040 (Desktop), 2496 (iOS), 6 (Android)
- `_definitive_recycled = True` → L2 skipped. Only trustworthy from official api_ids.
- `_actual_api_id` tracks which credential is currently active in the Step 3 loop
- `_app_stuck_count` unified bad-number counter: L0 abort at user-configured SNSS threshold
- `_RECYCLED_COUNTRY_POOL`: process-global; only populated after ≥5 consecutive failures
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `pnpm install` must always use `--ignore-scripts` — node-gyp breaks on Node 20/24 mismatch

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves in ~15s.
- `artifacts/api-server: API Server` artifact workflow proxy-store PG error on init: harmless duplicate-type constraint, guarded by `pg-guard`.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` warnings in supervisor log are expected in dev.
