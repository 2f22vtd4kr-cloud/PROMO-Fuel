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

Python environment: `.pythonlibs/bin/python3` is a wrapper script that sets `PYTHONPATH` to `.pythonlibs/lib/python3.12/site-packages`. System Python (NixOS) is immutable — always install via `pip install --target .pythonlibs/lib/python3.12/site-packages`.

---

## This session: fixes

### 1. Account Factory — `SendCodeUnavailable` infinite loop (AccountFactory.tsx)

**Bug:** User clicks "Keep Going" on a recycled country (e.g. KH) → `suppressRecycledRef` adds "kh". Every subsequent `sms_retry_prompt` with `isRecycled=true` silently called `void launch()` again, buying more KH numbers and burning SMSPool balance in a loop.

**Root cause:** The suppression path (lines 1439–1445) treated ALL recycled signals the same. `SendCodeUnavailable` is a **hard** Telegram signal (the entire country pool is definitively recycled — no fresh number will ever work). Soft signals (SentCodeTypeApp without SendCodeUnavailable) may work with a new number from the same country.

**Fix (AccountFactory.tsx, `sms_retry_prompt` handler):**
- Added `isHardRecycled = msg.includes("SendCodeUnavailable")`
- Guard on suppress path changed from `isRecycled && suppressed` → `isRecycled && !isHardRecycled && suppressed`
- Hard recycled always shows the country-switch prompt and clears the country from `suppressRecycledRef`

After this fix: one `SendCodeUnavailable` → prompt appears immediately → user must manually switch countries. No more auto-loop.

---

## Architecture snapshot

### Database split
- **SQLite** (`campaigns.db`) — ALL app data: campaigns, users, sends, sender_accounts, group_campaigns, tasks, broadcast_workers, etc.
- **PostgreSQL** — 3 tables only: `pf_session_files` (Telethon sessions), `pf_db_snapshot` (SQLite backup), `saved_proxies` (proxies)

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

**drizzle-kit binary (dev):** `/home/runner/workspace/node_modules/.pnpm/node_modules/.bin/drizzle-kit`

**⚠️ NEVER approve a DROP TABLE migration in Replit Publishing.** Re-sync: `cd lib/db && <drizzle-kit> push --force --config ./drizzle.config.ts`

---

## Gotchas for next agent

1. **Telethon 1.44.0** — `receive_timeout` and other old params removed.
2. **New PostgreSQL table?** → add to (a) `lib/db/src/schema/index.ts`, (b) `pg-guard.ts` DDL, (c) `watchdog.ts` `PG_TABLES` array. All three must stay in sync.
3. **DROP TABLE in Publishing UI** → never approve, re-sync with drizzle-kit push.
4. **No `@twa-dev/sdk`** — uses `window.Telegram.WebApp` global.
5. **Never add `telegram>=0.0.1`** to pyproject.toml — shadows python-telegram-bot.
6. **`python-socks[asyncio]`** must be installed — Telethon silently ignores proxy without it.
7. **pg-guard CRITICAL Telegram alert** — if you see `⛔ КРИТИЧНО: Сессии бот-аккаунтов утеряны!` in chat, sessions are gone and accounts need re-auth.
8. **SendCodeUnavailable = hard recycled** — never auto-retry, always show country-switch prompt (fixed in AccountFactory.tsx).
9. **Bot 409 Conflict** — normal on session start if a prior instance was running; clears after ~35s when Telegram revokes the old polling token.
