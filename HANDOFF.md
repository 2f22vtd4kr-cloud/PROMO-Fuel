# PROMO-Fuel — Handoff

**Last updated:** 2026-06-24

---

> **AGENT PROTOCOL — read this first, every session**
> 1. Read this file completely before touching code.
> 2. Rewrite this file **at the end of every response turn** that does real work.
> 3. Replace "This session" entirely — do NOT accumulate past sessions here.
> HANDOFF.md must stay under ~180 lines.

---

## FIRST THING ON EVERY SESSION: Check secrets

Run `viewEnvVars()` in code_execution. If any of the 8 required secrets are missing, call `requestEnvVar()` before anything else. Fresh Replit imports lose all secrets.

| Secret | Where |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather on Telegram |
| `TELETHON_API_ID` | https://my.telegram.org/apps |
| `TELETHON_API_HASH` | https://my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot on Telegram |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `SMSPOOL_API_KEY` | https://smspool.net/profile |
| `API_SECRET` | Any strong random string (`openssl rand -hex 32`) |

---

## Current state (as of this session)

Both workflows running:
- **Telegram Bot** — `bash scripts/ensure-python-deps.sh && .pythonlibs/bin/python3 supervisor.py`
- **Telegram Mini App** — `bash scripts/ensure-node-deps.sh && cd artifacts/telegram-miniapp && node node_modules/vite/bin/vite.js --config vite.config.ts --host 0.0.0.0`

Ports: Vite Mini App = 5000 (exposed 80), Python FastAPI = 8083, Node.js Express = 8080.
Vite proxy: `/api/*` → 8080 (Node.js). Node.js `makePythonProxy` forwards `/api/factory/*` + `/api/verifications/*` → 8083 (Python), with 3 retries on ECONNREFUSED.

---

## Known-good fixes applied (do NOT revert)

| File | What was fixed | Why |
|---|---|---|
| `account_factory.py` ~line 1133 | Removed `receive_timeout=45` from `TelegramClient()` | Telethon 1.44.0 dropped this param — caused crash at Step 2 on every registration |
| `lib/db/src/schema/index.ts` | Added `saved_proxies`, `pf_db_snapshot`, `pf_session_files` tables to Drizzle schema | Schema was empty → Replit deployment generated `DROP TABLE saved_proxies` migration on every republish |
| `scripts/ensure-python-deps.sh` | Sentinel fast-path now also runs `smoke_test` | Sentinel `.deps-ready` is committed to git — on fresh import it exists but packages aren't installed; blind trust caused silent install skip |
| `scripts/ensure-node-deps.sh` | Sentinel fast-path now checks `vite.js` exists | Same stale-sentinel bug — without vite check, fresh import skips node install |
| `.gitignore` | Added `.deps-ready` | Was tracked by git; stale sentinel from git caused both ensure-*.sh to skip dep install on fresh import |
| `account_factory.py` ~line 914 | Removed `PRE_BUY_MIN_SR` gate | Rate check is now informational only (shows ✅/⚠️/🟡 in preflight log); never blocks registration |

---

## Architecture snapshot

### Database split
- **SQLite** (`campaigns.db`) — ALL app data: campaigns, users, sends, sender_accounts, group_campaigns, tasks, broadcast_workers, etc.
- **PostgreSQL** (`DATABASE_URL`) — 3 tables only: `saved_proxies` (proxies), `pf_db_snapshot` (SQLite backup), `pf_session_files` (Telethon sessions). All created via `CREATE TABLE IF NOT EXISTS` in their respective files at startup.

### Account Factory pipeline (8 steps)
```
Preflight (info-only SMS rate check)
→ Step 1 (SMSPool buy number)
→ Step 2 (Telethon TelegramClient init — NO receive_timeout param)
→ Step 3 (SendCode + 3-layer API creds fallback)
→ Step 4 (SMS poll 120s)
→ Step 5 (sign_in / sign_up)
→ Step 6 (2FA)
→ Step 7 (Profile: AI name+bio+avatar or manual)
→ Step 8 (DB save + session sync)
```
All failure paths call `cancel_order()` via `finally` guard.

### AI Вибір panel
- Fetches AI freshness rankings from `/api/factory/ai-countries`
- Then batch-fetches real-time SMSPool success rates from `/api/factory/smspool-rates`
- Sorts by SMSPool rate desc → AI freshness desc
- Each row shows: SMSPool live % pill (green/yellow/red) + AI freshness bar
- Auto Launch and `ai_country_ids` in launch body both use `sortedAiCountryData`

### Cold-start bootstrap
`post-merge.sh` runs pip + pnpm + better-sqlite3 compile in parallel, then writes `.deps-ready`. The ensure-*.sh scripts now validate both the sentinel AND actual package presence before skipping.

If better-sqlite3 crashes with `NODE_MODULE_VERSION` error:
```bash
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```

---

## Gotchas for next agent

1. **Telethon version is 1.44.0** — `receive_timeout` and other old params are gone. If you add new `TelegramClient()` kwargs, check the 1.44.0 docs.
2. **Drizzle schema** (`lib/db/src/schema/index.ts`) must stay in sync with every PostgreSQL table the app creates. Adding a new PostgreSQL table without adding it to the schema → Replit deployment will generate a DROP TABLE migration on next republish.
3. **No `@twa-dev/sdk`** — uses `window.Telegram.WebApp` global from `https://telegram.org/js/telegram-web-app.js` in index.html.
4. **`VITE_OWNER_IDS`** — role detection. If unset → defaults to owner view in dev.
5. **Never add `telegram>=0.0.1`** to pyproject.toml — it shadows python-telegram-bot (see Telegram stub conflict in memory).
6. **`python-socks[asyncio]`** must be installed — Telethon silently ignores proxy without it, causing SentCodeTypeApp on all numbers.
