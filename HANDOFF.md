# PROMO-Fuel — Handoff

**Last updated:** 2026-06-24

---

> **AGENT PROTOCOL — read this first, every session**
> 1. Read this file completely before touching code.
> 2. Rewrite this file after EVERY response turn that does real work.
> 3. Replace "This session" entirely — do NOT accumulate past sessions here.
> HANDOFF.md must stay under ~150 lines.

---

## This session

**Task:** Three improvements:
1. ✅ Last-saved indicator + manual PG backup trigger in Accounts page
2. ✅ Cross-DB deletion — proxy delete now also cleans SQLite `saved_proxies`
3. ✅ Account Factory debug panel — `debug` SSE events now properly visible and expandable

### What was built / fixed

**`artifacts/telegram-miniapp/src/components/FactoryDebugPanel.tsx`**
- Added `debug` event color `#06b6d4` (cyan) in `eventColor()`
- Added `debugLabel()` helper: parses JSON message, extracts the key name (e.g. `🔧 TELETHON_INIT`) as the label
- Replaced the flat row renderer in `EventLog` with a new `DebugRow` sub-component:
  - Non-debug events: same monospace row as before
  - `debug` events: cyan `🔬 DBG` badge, key label, **click to expand** — shows full pretty-printed JSON in a cyan-tinted panel (maxHeight 300px, scrollable)
- Account Factory already emits `TELETHON_INIT`, `SEND_CODE_RESPONSE`, `SMSPOOL_CHECK`, `SMSPOOL_ACTIVE` as `debug` SSE events → these now appear visibly and are expandable

**`artifacts/api-server/src/routes/proxy-store.ts`**
- Added `import Database from "better-sqlite3"` + `import { DB_PATH } from "../lib/db-path"`
- `DELETE /api/proxy-store/:id` now: deletes from PG (primary), then mirrors delete to SQLite `saved_proxies` by `proxy_string` match (non-fatal if SQLite fails)

**Accounts page sync indicator (already existed):**
- `GET /api/sync/status` → `artifacts/api-server/src/routes/sync.ts` → queries `pf_db_snapshot WHERE key='main'` in PG
- `POST /api/sync/now` → sync.ts calls Python apiserver `POST /internal/sync` → `db_sync.save_snapshot()`
- Python `/internal/sync` already existed in `apiserver.py` (line 1013)
- UI in `Accounts.tsx` lines 1059-1081 + 1369-1393 already complete — `loadSyncStatus()` called on mount

**better-sqlite3 rebuild (cold-start fix):**
- `ensure-sqlite3.sh` only rebuilds when `.node` file is absent; after a Node version change the stale binary must be manually deleted first: `rm .../better_sqlite3.node && bash scripts/ensure-sqlite3.sh`

---

## Required secrets

| Secret | Where |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather |
| `TELETHON_API_ID` / `TELETHON_API_HASH` | my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `GROQ_API_KEY` | console.groq.com/keys |
| `SMSPOOL_API_KEY` | smspool.net/profile |
| `API_SECRET` | any strong random string |

Non-sensitive: `PORT=8080`.

---

## Architecture snapshot

### Ports
| Service | Port |
|---|---|
| Vite Mini App dev | 5000 (exposed 80) |
| Python FastAPI | 8083 |
| Node.js Express | 8080 |

Vite proxy: ALL `/api/*` → port 8080 (Node.js)

### Account Factory debug SSE events
Backend emits `debug` type SSE with `{"message": "JSON string"}` at:
- `TELETHON_INIT` — after proxy + Telethon client init (~line 1097 of account_factory.py)
- `SEND_CODE_RESPONSE` — after `SendCode` call (~line 1200)
- `SMSPOOL_CHECK` / `SMSPOOL_ACTIVE` — during SMS polling (~lines 1538, 1579)

### Cold-start
If `ensure-sqlite3.sh` says "already built" but server crashes with NODE_MODULE_VERSION error:
```
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```
