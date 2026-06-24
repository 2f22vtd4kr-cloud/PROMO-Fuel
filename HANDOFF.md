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

---

## This session: fixes and new features

### 1. Proxy session counter (account_factory.py)
Global monotonic `_PROXY_SESSION_COUNTER` + `_next_session_proxy()` — each registration attempt across all streams and retries gets a strictly unique session number. Prevents reuse of cooling Decodo residential exit nodes.

### 2. +7 shared-prefix bug (account_factory.py)
`_PLUS7_COUNTRY_IDS` set + `_suggest_alt_countries()` excludes ALL +7 countries from suggestions when failing country is Russia/Kazakhstan. Applied at all 4 `sms_retry_prompt` sites.

### 3. Four-layer PostgreSQL data preservation
Protects: **pf_session_files** (bot account Telethon sessions), **pf_db_snapshot** (full SQLite backup = all sender_accounts/campaigns), **saved_proxies** (proxy configs).

| Layer | Where | Trigger |
|---|---|---|
| 1 | `lib/db/src/schema/index.ts` | Replit never generates DROP TABLE for known tables |
| 2 | `scripts/post-merge.sh` `push_drizzle()` | Every dev cold-start/merge |
| 3 | `scripts/deploy-build.sh` Step 2b | Every production build |
| 4 | `artifacts/api-server/src/lib/pg-guard.ts` `ensurePgTables()` | Every API server boot — recreates dropped tables + fires Telegram alert if sessions empty while accounts exist |

### 4. Periodic PG health-check with Telegram alerts (`watchdog.ts`)
- New `checkPgHealth()` function in watchdog — runs on startup + every **30 minutes**
- Stores row counts for all 3 PG tables in SQLite (`pg_health_snapshots` table)
- Compares current count vs last stored count — if any table drops, sends Telegram alert:
  - `pf_session_files` / `pf_db_snapshot` drop → ⛔ critical alert (Russian text)
  - `saved_proxies` drop → ⚠️ warning alert
- First run always records baseline (no spurious alert on fresh install)
- Drop to same low level doesn't re-alert (snapshot updates after each alert)
- `pg-guard.ts` startup check also fires immediately if `pf_session_files` is empty but SQLite has accounts

**drizzle-kit binary (dev):** `/home/runner/workspace/node_modules/.pnpm/node_modules/.bin/drizzle-kit`

**⚠️ NEVER approve a DROP TABLE migration in Replit Publishing.** Re-sync: `cd lib/db && <drizzle-kit> push --force --config ./drizzle.config.ts`

---

## Architecture snapshot

### Database split
- **SQLite** (`campaigns.db`) — ALL app data: campaigns, users, sends, sender_accounts, group_campaigns, tasks, broadcast_workers, etc.
- **PostgreSQL** — 3 tables only: `pf_session_files` (Telethon sessions), `pf_db_snapshot` (SQLite backup), `saved_proxies` (proxies)

### pg_health_snapshots (SQLite)
New table added by `checkPgHealth()`. Stores `{key, count, checked_at}`. Used for cross-restart drop detection. Don't delete it — it's the baseline for alerting.

### Account Factory pipeline (8 steps)
```
Preflight → Step 1 (SMSPool buy) → Step 2 (TelegramClient — NO receive_timeout)
→ Step 3 (SendCode) → Step 4 (SMS poll) → Step 5 (sign_in/sign_up)
→ Step 6 (2FA) → Step 7 (Profile) → Step 8 (DB save + session sync)
```

### Cold-start bootstrap
`post-merge.sh`: pip + pnpm + better-sqlite3 compile + drizzle push in parallel → writes `.deps-ready`.

If better-sqlite3 `NODE_MODULE_VERSION` error:
```bash
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```

---

## Gotchas for next agent

1. **Telethon 1.44.0** — `receive_timeout` and other old params removed.
2. **New PostgreSQL table?** → add to (a) `lib/db/src/schema/index.ts`, (b) `pg-guard.ts` DDL, (c) `watchdog.ts` `PG_TABLES` array. All three must stay in sync.
3. **DROP TABLE in Publishing UI** → never approve, re-sync with drizzle-kit push.
4. **No `@twa-dev/sdk`** — uses `window.Telegram.WebApp` global.
5. **Never add `telegram>=0.0.1`** to pyproject.toml — shadows python-telegram-bot.
6. **`python-socks[asyncio]`** must be installed — Telethon silently ignores proxy without it.
7. **pg-guard CRITICAL Telegram alert** — if you see `⛔ КРИТИЧНО: Сессии бот-аккаунтов утеряны!` in chat, sessions are gone and accounts need re-auth.
