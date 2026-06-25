# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Replit environment migration (cold-start fix)

**Problem**: Fresh import cold start failed because `pnpm install` triggered `better-sqlite3`'s node-gyp build hook, which grabbed pnpm's bundled Node 24 headers while the runtime is Node 20 — version mismatch, exit 7, entire install aborted. Workflows showed "No such file or directory" for `ensure-python-deps.sh` / `ensure-node-deps.sh` on first run.

**Fix**: Added `--ignore-scripts` to every `pnpm install` call in:
- `scripts/post-merge.sh` → `install_node()` function
- `scripts/ensure-node-deps.sh` → slow-path install

The custom gcc compiler in `compile_sqlite()` (post-merge) and `start-api.sh` already handled better-sqlite3 correctly using Node 20 headers — node-gyp just needed to be bypassed entirely.

**Python deps**: `ensure-python-deps.sh` worked fine; smoke-test + sentinel fast-path passed.

---

## Workflow status
- **Telegram Bot**: RUNNING — Python supervisor up, all 12 DB migration steps OK, FastAPI on 8083
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR, Liquid Glass UI visible
- `better-sqlite3` native binary: built for Node 20 (v115 ABI) via gcc
- API server dist: `artifacts/api-server/dist/index.mjs` present

## Architecture reminders (carry-forward)
- `_CRED_STATS` is in-memory only — resets on restart, shows current-session picture
- `_reg_pool` rotation: `_num_attempt % len(_reg_pool)` — pool shuffled at session start, dev api_id prepended as index 0
- `_app_stuck_count`: unified bad-number counter (L0 threshold=user-configured via SNSS UI, L2 threshold=5)
- `_RECYCLED_COUNTRY_POOL`: process-global; only add after ≥5 consecutive failures (not after 1)
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `pnpm install` must always use `--ignore-scripts` — node-gyp will break otherwise

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves in ~30s.
- `artifacts/api-server: API Server` artifact workflow — not the main API; safe to ignore if it fails.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` warnings in supervisor log are expected in dev.
