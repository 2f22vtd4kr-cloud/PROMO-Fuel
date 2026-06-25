# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built this session

### Session Health Dashboard (`SessionHealthPanel`)
- **New component**: `artifacts/telegram-miniapp/src/components/SessionHealthPanel.tsx`
- Collapsible panel injected into **Accounts page** (after summary cards + problem badges, line ~1528)
- Lazy-loads on first expand — no fetch until user opens it
- `GET /api/accounts/session-health` → fast DB-only read (no Telethon) added to `accounts.ts`
- Health classification: `active` 🟢 | `flood_wait` 🟡 | `banned` 🔴 | `session_invalid` 🔴 | `no_session` ⚪
- Per-account "check" button + "Validate All" + "Recheck problems" → `POST /api/accounts/validate-sessions`
- Shows: name, phone, health badge, quota bar (sent_today/daily_limit), last_used_at, flood countdown, validate result inline

### SNSS Stats Panel (`SnssPanel`)
- **New component**: `artifacts/telegram-miniapp/src/components/SnssPanel.tsx`
- Injected into **AccountFactory overlay** below `<RegHistoryPanel>` (line ~4845)
- 4 stat chips: Blocked prefixes, Countries, Total hits, Threshold
- **Threshold slider** (1–10) with save → `POST /api/factory/snss/config` (updates `_SNSS_MIN_COUNT` in-process, no restart)
- Prefix table: monospace prefix, country flag, hit count (color-coded by severity), last-seen, per-row unblock ✕
- Clear-all button; all mutations sync both DB and `_RECYCLED_PREFIX_MEM` atomically

### Backend additions

#### `account_factory.py`
- `_SNSS_MIN_COUNT: int = 2` global added after `_RECYCLED_PREFIX_MEM`
- `_check_prefix_blacklist(min_count: int | None = None)` — uses `_SNSS_MIN_COUNT` as default (was hardcoded 2)
- 5 new routes on `factory_router` (all proxied via Node.js → Python 8083):
  - `GET  /api/factory/snss/stats` — full prefix list + aggregate counts
  - `DELETE /api/factory/snss/prefix?prefix=&country_id=` — unblock single prefix
  - `POST /api/factory/snss/clear` — wipe entire blacklist
  - `GET  /api/factory/snss/config` — read current threshold
  - `POST /api/factory/snss/config` — set `_SNSS_MIN_COUNT` at runtime

#### `artifacts/api-server/src/routes/accounts.ts`
- `GET /api/accounts/session-health` — DB-only health read; maps account fields → `health` string

## Workflow status
- **API Server** (port 8080): RUNNING — Express + Python proxy
- **Telegram Bot**: RUNNING — polling (409 conflicts normal for multi-instance)
- **Telegram Mini App** (port 5000): RUNNING — Vite dev HMR active
- `artifacts/api-server: API Server` artifact workflow: FAILED — not used by main app, ignore

## Architecture reminders
- Vite proxy: `/api/*` → `http://localhost:8080` (Node.js)
- Node.js: `/api/factory/*` → Python FastAPI 8083 via `makePythonProxy`; `/api/accounts/*` handled natively
- `SessionHealthPanel` imports `getStoredSecret` from LockScreen for Bearer auth
- `SnssPanel` receives `authHeaders` function prop from AccountFactory
- `_SNSS_MIN_COUNT` is process-global — resets to 2 on Python restart (not persisted to DB; by design)

## Key files
| File | Role |
|------|------|
| `account_factory.py` | Python FastAPI — SNSS routes + blacklist logic (lines 80–84, 609–626, 3562–3652) |
| `artifacts/api-server/src/routes/accounts.ts` | Node.js — `/accounts/session-health` route (line ~530) |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS management UI (new) |
| `artifacts/telegram-miniapp/src/components/SessionHealthPanel.tsx` | Session health dashboard (new) |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Imports + mounts `<SnssPanel>` |
| `artifacts/telegram-miniapp/src/pages/Accounts.tsx` | Imports + mounts `<SessionHealthPanel>` |

## Known non-issues
- `artifacts/api-server: API Server` artifact workflow FAILED — real API is the `API Server` bash-workflow. Safe to ignore.
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, do not touch unless asked.
- Telegram Bot 409 conflicts: normal when Replit spawns multiple supervisor instances.
