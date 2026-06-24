# PROMO-Fuel — Handoff

**Last updated:** 2026-06-24

---

> **AGENT PROTOCOL — read this first, every session**
> 1. Read this file completely before touching code.
> 2. Rewrite this file after EVERY response turn that does real work.
> 3. Replace "This session" entirely — do NOT accumulate past sessions here.
> 4. Check secrets on fresh import (see section below) before doing anything else.
> HANDOFF.md must stay under ~150 lines. Previous session details live in git history.

---

## This session

**Context:** User reported the Account Factory burning $2.08 on 6 consecutive pre-banned Indonesia (+62) numbers, then proxy dying. Two rounds of fixes were shipped.

**Round 1 — Abort early to cap money burn:**
- `PRE_BUY_MIN_SR` raised **45 → 60** (Indonesia at 53% blocked at pre-check)
- `_banned_count` tracker: abort with `sms_retry_prompt` after **3 consecutive** pre-bans
- `_proxy_fail_count` tracker: abort after **2 consecutive** proxy-unreachable failures

**Round 2 — Auto-switch toggle with proxy store integration:**
- New `_pick_auto_switch_proxy(tried_countries)` helper queries `saved_proxies` for a proxy with a different `country_code` (random pick, excludes already-tried countries)
- `auto_switch: bool` parsed from request body in `register_account()`
- `generate()` restructured with a while-loop per account slot: on `sms_retry_prompt`, if `auto_switch=True` and switches remaining (max 3), picks next proxy from store, emits `auto_switching` SSE, resets UI steps, and retries the same account slot with new country+proxy
- Auto-switch state persists across batch slots — once it finds a working country, subsequent accounts start there
- UI toggle "🔄 Авто-перемикання проксі" (glass button with iOS-style toggle switch, off by default)
- SSE handler: `auto_switching` event resets steps/preflight/exitIp in the UI

**What to do next session:** awaiting user direction

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set
- ✅ Account Factory: PRE_BUY_MIN_SR=60%, consecutive abort thresholds, auto-switch toggle

---

## Required secrets (check on fresh import)

| Secret | Where to get it |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather on Telegram |
| `TELETHON_API_ID` | https://my.telegram.org/apps (integer) |
| `TELETHON_API_HASH` | https://my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot on Telegram |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `SMSPOOL_API_KEY` | https://smspool.net/profile |
| `API_SECRET` | Any strong random string (`openssl rand -hex 32`) |

Non-sensitive env var: `PORT=8080`.

---

## Standing architecture facts

### Ports
| Service | Port |
|---|---|
| Vite Mini App dev | 5000 (exposed as 80) |
| Python FastAPI | 8083 |
| Node.js Express API | 8080 |

### Account Factory
- Python: `account_factory.py` → `_registration_stream()` + `_pick_auto_switch_proxy()`
- Node API: `artifacts/api-server/src/routes/factory.ts`
- UI: `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`
- Retry loop (lines ~892–1110): MAX_NUM_RETRIES=5; `_banned_count` aborts at 3 consecutive bans; `_proxy_fail_count` aborts at 2 consecutive proxy fails
- Auto-switch: `_pick_auto_switch_proxy()` before `register_account()`; `generate()` while-loop per account slot; SSE event `auto_switching`; UI toggle state `autoSwitch`
- Non-SMS gate: ResendCode → SendCodeUnavailableError fast-fail → official creds → confirmed recycled
- Country rankings: `BestCountryResult` carries `own_attempts/successes/recycled`; full history from `GET /api/factory/country-stats`

### Auth model
- Bearer middleware (app.ts): active when `API_SECRET` set; skips `/twa`, `/health`, `/auth`, `/proxy-store`
- Factory + Verifications: mounted BEFORE Bearer middleware → no auth required

### Key files
| File | Purpose |
|---|---|
| `account_factory.py` | All Telegram registration logic |
| `artifacts/api-server/src/app.ts` | Express app + auth middleware |
| `artifacts/api-server/src/routes/proxy-store.ts` | Proxy vault CRUD |
| `artifacts/api-server/src/routes/factory.ts` | Factory API + country stats |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Factory UI |
| `campaigns.db` | SQLite — all tables incl. `factory_country_stats`, `saved_proxies` |
| `HANDOFF.md` | This file |
