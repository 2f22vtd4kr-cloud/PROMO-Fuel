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

## This session: fixes applied

### 1. Proxy session counter (account_factory.py)
- **Problem:** Relative `_bump_proxy_session()` always reset to session-1 on retry — cooling Decodo residential exit nodes reused.
- **Fix:** Global monotonic `_PROXY_SESSION_COUNTER` + `_next_session_proxy()`. Each registration attempt (all streams + retries) gets a strictly unique session number.

### 2. +7 shared-prefix bug (account_factory.py)
- **Problem:** When Russia/Kazakhstan SMS fails, suggestions included other +7 countries that share the same Telegram routing.
- **Fix:** `_PLUS7_COUNTRY_IDS` set + `_suggest_alt_countries()` excludes ALL +7 countries from suggestions when the failing country is in that set. Applied at all 4 `sms_retry_prompt` emission sites.

### 3. Four-layer PostgreSQL data preservation (DROP TABLE prevention)
Protects: **saved_proxies** (proxy configs), **pf_session_files** (Telethon bot-account sessions), **pf_db_snapshot** (full SQLite backup including all sender_accounts).

| Layer | Where | What it does |
|---|---|---|
| 1 | `lib/db/src/schema/index.ts` | All 3 tables in Drizzle schema → Replit never generates DROP TABLE migration |
| 2 | `scripts/post-merge.sh` `push_drizzle()` | `drizzle-kit push --force` after every cold-start/merge → dev DB stays in sync |
| 3 | `scripts/deploy-build.sh` Step 2b | `drizzle-kit push --force` during every production build → prod schema always current |
| 4 | `artifacts/api-server/src/lib/pg-guard.ts` | `ensurePgTables()` called from `app.ts` on every API server boot — recreates any accidentally dropped tables + emits ⛔ CRITICAL log if `pf_session_files` is empty while SQLite has bot accounts (data-loss signal) |

**drizzle-kit binary:** `$(pwd)/node_modules/.pnpm/node_modules/.bin/drizzle-kit`

**DO NOT approve any publishing migration that DROPs saved_proxies, pf_session_files, or pf_db_snapshot.** If you see such a migration, run: `cd lib/db && /home/runner/workspace/node_modules/.pnpm/node_modules/.bin/drizzle-kit push --force --config ./drizzle.config.ts` to re-sync dev, then republish.

---

## Architecture snapshot

### Database split
- **SQLite** (`campaigns.db`) — ALL app data: campaigns, users, sends, sender_accounts, group_campaigns, tasks, broadcast_workers, message_templates, uploads, etc.
- **PostgreSQL** (`DATABASE_URL`) — 3 tables only:
  - `saved_proxies` — proxy configs for account registration
  - `pf_session_files` — Telethon `.session` binaries for every bot account (these ARE the bot accounts)
  - `pf_db_snapshot` — full binary backup of campaigns.db (restores all SQLite data on cold start)

Bot account data flow: Telethon session → `pf_session_files` (PostgreSQL) + metadata → `sender_accounts` (SQLite → `pf_db_snapshot`). Both must survive deployment.

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

### Cold-start bootstrap
`post-merge.sh` runs pip + pnpm + better-sqlite3 compile + drizzle push in parallel, then writes `.deps-ready`.

If better-sqlite3 crashes with `NODE_MODULE_VERSION` error:
```bash
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```

---

## Gotchas for next agent

1. **Telethon 1.44.0** — `receive_timeout` and other old params removed. Check docs before adding new `TelegramClient()` kwargs.
2. **Drizzle schema + pg-guard** — If adding a new PostgreSQL table: (a) add to `lib/db/src/schema/index.ts`, (b) add DDL to `pg-guard.ts` `ensurePgTables()`. Both must stay in sync.
3. **DROP TABLE in Publishing UI** — Never approve. Re-sync with `drizzle-kit push --force` then republish.
4. **No `@twa-dev/sdk`** — uses `window.Telegram.WebApp` global from `https://telegram.org/js/telegram-web-app.js` in index.html.
5. **Never add `telegram>=0.0.1`** to pyproject.toml — it shadows python-telegram-bot.
6. **`python-socks[asyncio]`** must be installed — Telethon silently ignores proxy without it, causing SentCodeTypeApp on all numbers.
7. **pg-guard CRITICAL log** — if API server logs `⛔ CRITICAL: pf_session_files is EMPTY but SQLite has N sender_account(s)`, bot accounts exist in DB but their Telegram sessions are gone. They'll need re-authentication.
