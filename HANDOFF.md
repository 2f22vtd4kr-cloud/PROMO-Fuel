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

**Task:** Remove SMS rate gate, add dual-stats to AI Вибір, fix `receive_timeout` crash.

### Fix: `TelegramBaseClient.__init__() got an unexpected keyword argument 'receive_timeout'`
Telethon 1.44.0 removed the `receive_timeout` parameter from `TelegramClient()`. Removed the `receive_timeout=45` line from `account_factory.py` (~line 1134). Bot restarted, fix live.

### Fix: Replit deployment DROP TABLE migrations
`lib/db/src/schema/index.ts` was empty — Replit's migration system treated every table in production PostgreSQL as "extra" and wanted to drop them. Added all three PostgreSQL-backed tables to the Drizzle schema:
- `saved_proxies` (proxy-store.ts — proxies with country_code, proxy_string, last_session_num)
- `pf_db_snapshot` (db_sync.py — binary SQLite snapshot for cold-start restore)
- `pf_session_files` (db_sync.py + pg-pool.ts — Telethon .session binaries)
`bytea` columns use `customType` since Drizzle doesn't export `bytea` directly from `pg-core`. Republishing will now see these tables as expected and generate no DROP migrations.

### Other changes this session

**`account_factory.py`**
- Removed `PRE_BUY_MIN_SR` gate — success-rate check is now **informational only**: shows ✅/⚠️/🟡 icon + rate in preflight log, then proceeds unconditionally. `sms_retry_prompt` with `isLowRate` no longer emitted.
- Added `/api/factory/smspool-rates` endpoint (~line 539): accepts `ids` (comma-sep country codes) + optional `api_key`; calls SMSPool `/request/success_rate`; returns `{"rates": [{id, success_rate}]}` filtered to requested IDs.

**`artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`**
- Added `aiSmsRates: Record<string,number>` + `aiSmsRatesLoading` state (~line 895).
- `fetchAiCountries()` now batch-fetches `/api/factory/smspool-rates` for all AI countries after the AI call and stores in `aiSmsRates`.
- `sortedAiCountryData` useMemo (~line 900): sorted SMSPool rate desc → AI freshness desc; falls back to AI order if no rates yet.
- AI Вибір rows use `sortedAiCountryData`; rank badge reflects sorted position; each row shows **dual stats**: coloured SMS pill (`SMS 78%` green/yellow/red) + AI freshness mini-bar. Pulse skeleton shown while SMSPool rates load.
- Panel header: "✦ SMSPool live · AI: Топ-10 країн" + "✓ SMSPool live (N)" status line.
- `handleAutoLaunch` + `ai_country_ids` in launch request body both use `sortedAiCountryData` (SMSPool-priority order).
- Build verified clean: ✓ 1711 modules.

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

Vite proxy: ALL `/api/*` → port 8080 (Node.js).
Node.js `makePythonProxy` proxies `/api/factory/*` and `/api/verifications/*` → Python 8083, with 3 retries on ECONNREFUSED.

### Account Factory pipeline (8 steps)
```
Preflight (info-only rate check) → Step 1 (SMSPool buy) → Step 2 (Telethon init)
→ Step 3 (SendCode + 3-layer fallback) → Step 4 (SMS poll 120s) → Step 5 (sign_in/sign_up)
→ Step 6 (2FA) → Step 7 (Profile) → Step 8 (DB save)
```
All failure paths call `cancel_order()` via `finally` guard.

### Cold-start
If `ensure-sqlite3.sh` says "already built" but server crashes with NODE_MODULE_VERSION error:
```
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```
