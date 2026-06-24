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

**Context:** User shared 14 screenshots showing the Account Factory burning $2.08 on 6 consecutive pre-banned Indonesia (+62) numbers, then the proxy dying completely ("Host unreachable").

**Root causes identified:**
1. `PRE_BUY_MIN_SR = 45%` — Indonesia at 53% passes the gate, but half the numbers are recycled
2. No consecutive pre-ban counter — on `_banned`, code just `continue`s silently using all 5 retries
3. No proxy-dead abort — when proxy dies mid-loop, it still buys more numbers before failing at Step 2

**Fixes applied to `account_factory.py`:**
- `PRE_BUY_MIN_SR` raised **45 → 60** (Indonesia at 53% now blocked at the pre-check)
- Added `_banned_count` tracker — **2 consecutive pre-bans** emits `sms_retry_prompt` and stops (was 5)
- Added `_proxy_fail_count` tracker — **2 consecutive proxy-unreachable** emits `sms_retry_prompt` and stops

**Max money burned per session is now:** 2 numbers × ~$0.35 = **$0.70** (was $2.08+)

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set
- ✅ Account Factory: PRE_BUY_MIN_SR=60%, consecutive pre-ban abort at 2, proxy-dead abort at 2
- ✅ Account Factory: gendered AI profile + avatar pool per gender
- ✅ Account Factory: 3-layer non-SMS gate (ResendCode → SendCodeUnavailableError → official creds)
- ✅ Proxy vault: saves and loads correctly (Bearer skip for /proxy-store)
- ✅ Country rankings: own historical stats in ranked rows + full history panel

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
- Python: `account_factory.py` → `_registration_stream()` generator
- Node API: `artifacts/api-server/src/routes/factory.ts`
- UI: `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`
- Retry loop (lines ~892–1095): MAX_NUM_RETRIES=5; `_banned_count` aborts at 2 consecutive bans; `_proxy_fail_count` aborts at 2 consecutive proxy fails
- Non-SMS gate (lines ~1095–1260): ResendCode → SendCodeUnavailableError fast-fail → official creds → confirmed recycled
- 2FA: custom row with RefreshCw button; `crypto.getRandomValues` 16-char password
- Proxy store: `/api/proxy-store` is in Bearer skip list — accessible without CRM login
- Country rankings: `BestCountryResult` carries `own_attempts/successes/recycled`; full history from `GET /api/factory/country-stats`

### Auth model
- Bearer middleware (app.ts): active when `API_SECRET` set; skips `/twa`, `/health`, `/auth`, `/proxy-store`
- TWA middleware: HMAC validation on `/api/twa/*`; skipped in dev or when `TELEGRAM_TOKEN` missing
- Factory + Verifications: mounted BEFORE Bearer middleware → no auth required

### Key files
| File | Purpose |
|---|---|
| `account_factory.py` | All Telegram registration logic |
| `artifacts/api-server/src/app.ts` | Express app + auth middleware |
| `artifacts/api-server/src/routes/proxy-store.ts` | Proxy vault CRUD |
| `artifacts/api-server/src/routes/factory.ts` | Factory API + country stats |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Factory UI |
| `campaigns.db` | SQLite — all tables incl. `factory_country_stats` |
| `HANDOFF.md` | This file |
