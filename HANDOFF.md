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

## This session: fixes applied

### 1. Proxy session counter (account_factory.py)
- **Problem:** Relative `_bump_proxy_session()` always reset to session-1 on retry because the outer `generate()` loop in `register_account` never updated `cur_proxy_string`. Cooling Decodo residential exit nodes were reused.
- **Fix:** Global monotonic `_PROXY_SESSION_COUNTER` + `_next_session_proxy()` — each registration attempt across ALL streams and retries gets a strictly unique session number. Called once before preflight and once per retry in `_registration_stream`.

### 2. +7 shared-prefix bug (account_factory.py)
- **Problem:** When Russia/Kazakhstan SMS fails, alternative country suggestions included other +7 countries (Kazakhstan/Russia respectively), which share the same Telegram SMS routing and fail identically.
- **Fix:** `_PLUS7_COUNTRY_IDS` set + `_suggest_alt_countries(country_id)` helper excludes ALL +7 countries from suggestions when the failing country is in that set. Explanatory ⚠️ note added. Applied at all 4 `sms_retry_prompt` emission sites.

### 3. DROP TABLE saved_proxies — prevented (scripts/post-merge.sh + lib/db)
- **Problem:** Replit Publishing showed `DROP TABLE "saved_proxies" CASCADE` (1 row at risk). Replit's deployment migration system compares dev PostgreSQL vs prod. `saved_proxies` existed in prod but NOT in dev DB → interpreted as "intentionally dropped from dev" → generated DROP TABLE. **DO NOT approve any migration that DROPs saved_proxies.**
- **Fix:**
  1. Ran `drizzle-kit push --force` against the dev database — all 3 tables now exist in both dev and prod PostgreSQL (`saved_proxies`, `pf_db_snapshot`, `pf_session_files`).
  2. Added `push_drizzle()` function to `scripts/post-merge.sh` — runs `drizzle-kit push --force` in parallel after every cold start / merge, keeping dev DB permanently in sync with schema.
- **Binary:** `/home/runner/workspace/node_modules/.pnpm/node_modules/.bin/drizzle-kit`

---

## Known-good fixes applied (do NOT revert)

| File | What was fixed | Why |
|---|---|---|
| `account_factory.py` ~line 1133 | Removed `receive_timeout=45` from `TelegramClient()` | Telethon 1.44.0 dropped this param — caused crash at Step 2 on every registration |
| `lib/db/src/schema/index.ts` | Added `saved_proxies`, `pf_db_snapshot`, `pf_session_files` tables to Drizzle schema | Schema was empty → Replit deployment generated `DROP TABLE saved_proxies` migration on every republish |
| `scripts/post-merge.sh` | Added `push_drizzle()` step (runs after pnpm install) | Keeps dev PostgreSQL in sync with Drizzle schema after every cold start/merge — prevents spurious DROP TABLE migrations |
| `scripts/ensure-python-deps.sh` | Sentinel fast-path now also runs `smoke_test` | Sentinel `.deps-ready` is committed to git — on fresh import it exists but packages aren't installed |
| `scripts/ensure-node-deps.sh` | Sentinel fast-path now checks `vite.js` exists | Same stale-sentinel bug |
| `.gitignore` | Added `.deps-ready` | Was tracked by git; stale sentinel caused ensure-*.sh to skip dep install on fresh import |

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

### Cold-start bootstrap
`post-merge.sh` runs pip + pnpm + better-sqlite3 compile + drizzle push in parallel, then writes `.deps-ready`. The ensure-*.sh scripts validate both the sentinel AND actual package presence before skipping.

If better-sqlite3 crashes with `NODE_MODULE_VERSION` error:
```bash
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```

---

## Gotchas for next agent

1. **Telethon version is 1.44.0** — `receive_timeout` and other old params are gone. If you add new `TelegramClient()` kwargs, check the 1.44.0 docs.
2. **Drizzle schema** (`lib/db/src/schema/index.ts`) must stay in sync with every PostgreSQL table the app creates. Adding a new PostgreSQL table without adding it to the schema → Replit deployment will generate a DROP TABLE migration on next republish.
3. **Replit deploy migration warning** — if you see a DROP TABLE migration in the Publishing UI for `saved_proxies`, `pf_db_snapshot`, or `pf_session_files`, it means the dev DB drifted. Run `cd lib/db && /home/runner/workspace/node_modules/.pnpm/node_modules/.bin/drizzle-kit push --force --config ./drizzle.config.ts` to fix. **Never approve a DROP TABLE migration for those tables.**
4. **No `@twa-dev/sdk`** — uses `window.Telegram.WebApp` global from `https://telegram.org/js/telegram-web-app.js` in index.html.
5. **`VITE_OWNER_IDS`** — role detection. If unset → defaults to owner view in dev.
6. **Never add `telegram>=0.0.1`** to pyproject.toml — it shadows python-telegram-bot.
7. **`python-socks[asyncio]`** must be installed — Telethon silently ignores proxy without it, causing SentCodeTypeApp on all numbers.
