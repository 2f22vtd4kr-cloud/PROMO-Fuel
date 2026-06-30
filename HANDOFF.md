# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## Session date
2026-06-30

## Current app state

- **Telegram Bot** workflow: RUNNING — supervisor, worker-1, worker-2, PTB bot (polling backed off to prod), FastAPI (8083), broadcast scheduler all up
- **Telegram Mini App** workflow: RUNNING (Vite on port 5000)
- **API Server** workflow: NOT_STARTED (only needed for CRM/Mini App front-end dev)
- App is **deployed to production** (Replit autoscale, checkpoint published ~19:22 UTC today)
- `data/campaigns.db`: healthy (all 14 migration steps passed)

---

## What was done this session

### 1. Multi-credential pool (`account_factory.py`)
- `_load_operator_creds()` loads `TELETHON_API_ID_1`/`_HASH_1`, `TELETHON_API_ID_2`/`_HASH_2`, … from env
- Each credential gets a distinct Android device profile (Samsung S24 Ultra → api_id 30533575; Xiaomi Redmi Note 13 Pro → api_id 37989276)
- `api_id=6` (official Telegram Desktop) removed from `_OFFICIAL_CLIENT_CREDS` and `_REGISTRATION_CREDS`
- `_LAYER2_CREDS` built with operator creds first, then official fallbacks
- `/register` endpoint guards require at least one operator credential

### 2. Proxy reconnect hardening (`account_factory.py`)
- Step 3 reconnect is a 3-attempt loop; attempts 2+3 rotate to fresh Decodo session-N proxies
- 1-second SOCKS5 stabilisation sleep added after Step 2 connect
- Pre-flight MTProto liveness check timeout bumped 8s → 12s

### 3. 409 Conflict auto-backoff (`main.py`)
- **Root cause**: deployed prod instance + dev workspace both poll same `TELEGRAM_TOKEN`; Telegram only allows one `getUpdates` session per token
- **Fix**: rolling 120-second conflict window; after 8 conflicts call `updater.stop()` — polling stops in dev, workers/schedulers/backup keep running; production gets exclusive ownership
- **Bug fixed during implementation**: `import asyncio` inside `main()` shadowed the module-level import → `UnboundLocalError` at line 2234; removed all three inline imports
- `BOT_POLLING_DISABLED=true` env var added: set to skip polling entirely at startup (idle mode — event loop + schedulers still run)
- Verified in logs: triggered at exactly 8/8 conflicts at 19:25:21; next `getUpdates` from prod got `200 OK` cleanly

---

## Critical first action for next factory run

**The SNSS `recycled_prefix_cache` table may be poisoned with false-positive entries from past failed runs.** Before any factory attempt:
1. Open Account Factory in the Mini App → SNSS panel
2. Click **"Clear entire blacklist"**

OR call: `POST /api/factory/snss/clear`

---

## Known warnings (non-fatal)

- `MINIAPP_URL is not set` — no "Open App" button in Telegram for admin. Set `MINIAPP_URL` secret to Replit public URL to fix.
- `VITE_OWNER_IDS / OWNER_IDS not set` — Mini App defaults to owner view for all users.
- `TELETHON_API_ID` / `TELETHON_API_HASH` (legacy bare names) not set — warnings only; pool creds `_1`/`_2` are what matter.
- Telethon `libssl` warning — falls back to Python AES; slower but fully functional.
- Dev bot polls until 8 conflicts, then backs off to production — this is correct behaviour, not a bug.

---

## Key files

| File | Notes |
|------|-------|
| `account_factory.py` | Telethon registration pipeline — multi-cred pool + proxy hardening this session |
| `main.py` | PTB bot entry; error_handler with conflict auto-backoff (lines ~2309–2400) |
| `supervisor.py` | Process orchestrator — spawns workers + apiserver, then calls `main.main()` |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Mini App factory UI |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS panel — "Clear entire blacklist" |
| `data/campaigns.db` | SQLite DB (all 14 migrations applied) |
| `requirements.txt` | Cleaned — no telegram stub |
| `scripts/ensure-python-deps.sh` | Cold-start bootstrap — `.deps-ready` sentinel |

---

## Architecture reminders

- **Workflows:** "Telegram Bot" = Python supervisor → apiserver (FastAPI 8083) + worker-1 + worker-2 + PTB bot. "Telegram Mini App" = Vite port 5000. "API Server" = Node.js Express port 8080.
- **Conflict guard:** dev bot auto-backs-off after 8 conflicts in 120s; prod owns polling exclusively once deployed.
- **Session proxy rotation:** `_next_session_proxy()` increments `_PROXY_SESSION_COUNTER` → fresh Decodo session-N residential exit node.
- **Layer 2 creds:** `_LAYER2_CREDS` = operator creds (30533575, 37989276) + official fallbacks (2040 Desktop, 2496 iOS). Primary api_id excluded from Layer 2 filtered list.
- **SNSS counters:** `_SNSS_MIN_COUNT=2`, `_SNSS_PREFIX_LEN=9`, `_SNSS_SHORT_PREFIX_LEN=7`, `_CONSECUTIVE_RECYCLED_ABORT=5`.
- **DB path:** `data/campaigns.db` relative to repo root; API server CWD is `artifacts/api-server/` — uses `../../data/campaigns.db` fallback in `db-path.ts`.
- **Login:** Mini App at port 5000 — enter value of `API_SECRET` secret to authenticate.
