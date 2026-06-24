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

**Turn 1 — Project imported to Replit environment**
Both workflows running. Python deps installed. `.deps-ready` sentinel written.

**Turn 2 — Country rankings with own historical stats**

Added per-country historical stats (our own DB) to the Account Factory country ranking panel:

**API changes (`artifacts/api-server/src/routes/factory.ts`):**
- Extended `BestCountryResult` interface with optional `own_attempts`, `own_successes`, `own_recycled` fields
- `/best-country` now merges `getOwnStats()` data by country_id into each top-5 entry before returning

**UI changes (`artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`):**
- `autoCountryTop5` state type extended with `own_attempts?`, `own_successes?`, `own_recycled?`
- Ranked country rows now show a 3rd line under the SMSPool success-rate bar:
  `наші дані: N спроб · ✓X свіжих · ✗Y переробл · ZZ% fresh` (color-coded green/amber/red)
  — only visible when we have data for that country
- Added `ownStatsData` / `showOwnStats` / `ownStatsLoading` state + `fetchOwnStats()` + `handleToggleOwnStats()`
- "📊 Наша повна статистика…" toggle button appears at the bottom of the ranked list
- Clicking it opens a full history table: all countries with attempts > 0, sorted by attempts desc,
  columns: Country | Tries | ✓Fresh | ✗Recycled | Fresh% — tapping a row selects that country

**What to do next session:** (awaiting user direction)

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set
- ✅ Account Factory: gendered AI profile + avatar pool per gender
- ✅ Account Factory: 3-layer non-SMS gate (ResendCode → SendCodeUnavailableError fast-fail → official creds → confirmed recycled)
- ✅ Proxy vault: saves and loads correctly (Bearer skip for /proxy-store)
- ✅ 2FA field: random password generator button
- ✅ Country rankings: own historical stats (attempts/fresh/recycled/%) shown in ranked rows + full history panel

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
- Non-SMS gate (lines ~1087–1250): ResendCode → SendCodeUnavailableError fast-fail → official creds → confirmed recycled
- 2FA: custom row with RefreshCw button; `crypto.getRandomValues` 16-char password
- Proxy store: `/api/proxy-store` is now in Bearer skip list — accessible from Mini App without CRM login
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
