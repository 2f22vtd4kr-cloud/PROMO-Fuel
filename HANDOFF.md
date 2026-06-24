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

**What was worked on:**

**Turn 1 — Per-turn handoff protocol wired in**
Tightened the MEMORY.md rule to "after every response turn", updated session-handoff.md frequency section.

**Turn 2 — SMSPool country dashboard auto-load**
AccountFactory.tsx already had Auto Pick (⚡), Check Stock (📊), and AI Pick (✦) with a top-5 ranked list. What was missing: the list only appeared after clicking a button. Added a `useEffect` on `[serverHasKey]` that fires when the server confirms the SMSPool key is set — silently fetches `/api/factory/best-country`, populates `autoCountryTop5` without auto-applying a country. User opens factory, rankings appear immediately. Also fixed: panel border/header color was red when auto-loaded (no autoCountryMsg yet) — now green when top5 present. Title updated to "⚡ SMSPool Country Rankings — Telegram" / "⚡ Рейтинг країн SMSPool — Telegram".

**Turn 3 — Secrets persistence + lean handoff protocol**
- Explained to user: Replit secrets are per-Repl, not per-repo. Fresh GitHub import = blank secrets.
- Created `scripts/required-secrets.sh` — canonical list of 8 secret names + sources, `check_secrets()` function that prints a loud warning box with instructions for any that are missing.
- Added `check_secrets` call to `post-merge.sh` — runs immediately at the top of every post-merge so the user sees missing secrets right away.
- Added `required-secrets.md` memory topic with the agent protocol: on session start, run `viewEnvVars()`, then `requestEnvVar()` for any of the 8 secrets that are missing.
- Rewrote `session-handoff.md` and `HANDOFF.md` protocol: lean document, previous session content dropped each session, max ~150 lines.

**What to do next session:** User wanted historical `factory_country_stats` data (our own registration attempts/successes/recycled per country) shown alongside the SMSPool success rate in the country rankings panel. Both columns side-by-side in the same table.

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set in this Replit project
- ⚠️ VN (Vietnam) SMSPool pool 100% recycled — use KZ or UA in Account Factory
- ✅ Account Factory country rankings now auto-load on page open
- ✅ Cold starts fast — `.deps-ready` sentinel written by `post-merge.sh`

---

## Required secrets (check on fresh import)

On fresh GitHub import: run `viewEnvVars()` in code_execution, then `requestEnvVar()` for any missing from this list:

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

Non-sensitive env var already set as shared: `PORT=8080`.

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
- Node API: `artifacts/api-server/src/routes/factory.ts` → `/api/factory/best-country`, `/api/factory/ai-countries`, `/api/factory/config`
- UI: `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`
- SMSPool `success_rate` = SMS delivery rate, NOT Telegram freshness. High rate ≠ fresh numbers.
- Own freshness data: `factory_country_stats` table in `campaigns.db`
- Best countries June 2026: KH > LA > MM > KZ > NP > UZ. VN = 100% recycled.
- Service ID for Telegram on SMSPool: `907`
- Proxy: Decodo residential — `socks5://user-{U}-session-{N}-country-{CC}:{P}@gate.decodo.com:7000`

### Startup
1. `post-merge.sh` → checks missing secrets → pip+pnpm parallel → sqlite3 compile → writes `.deps-ready`
2. All restarts after: `ensure-*.sh` sees sentinel → exits in <100ms

### Key files
| File | Purpose |
|---|---|
| `account_factory.py` | All Telegram registration logic |
| `supervisor.py` | Process manager |
| `scripts/post-merge.sh` | Parallel dep install + sentinel + secrets warning |
| `scripts/required-secrets.sh` | Canonical secret list + check_secrets() |
| `scripts/ensure-python-deps.sh` | Sentinel fast-path → pip fallback |
| `.deps-ready` | Sentinel file |
| `campaigns.db` | SQLite — all tables |
| `sessions/` | Telethon .session files |
| `HANDOFF.md` | This file |
