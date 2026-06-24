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

**Task:** Three-part improvement to Account Factory country selection UX.

**1. Fixed `_pick_auto_switch_proxy` smart selection logic (`account_factory.py`)**
- Removed the alphabetical fallback that previously picked any proxy country available in storage even when we had zero performance data for it
- Now: only switches to a country IF we have real `factory_country_stats` data showing it's good AND a proxy for it exists in storage
- If stats say a country is best but no proxy stored for it → emits "suggest" SSE (upload proxy prompt)
- If no matching data at all → "none" (no blind switches)

**2. Removed "Авто-перемикання проксі" toggle UI (`AccountFactory.tsx`)**
- Removed the entire toggle button JSX (lines ~1659–1698 original)
- Removed `autoSwitch` state + `setAutoSwitch`
- Removed `auto_switch: autoSwitch` from `launch()` POST body
- Removed `auto_switching` SSE event handler
- Backend `auto_switch` defaults to `false` without the toggle (feature dormant)

**3. Beautified "Наявність" and "AI Вибір" buttons**
- Both buttons enlarged with distinct icon blocks (40×40px rounded squares)
- **Наявність**: 📡 icon, teal/cyan gradient theme, live pulse dot, "SMSPool live" subtitle
- **AI Вибір**: 🧠 icon, purple/violet gradient theme, ✦ sparkle accent, "Топ-10 аналіз" subtitle
- Active/inactive state glow + inset highlight on both

**4. Added per-country AI analysis panel for Наявність tab (`AccountFactory.tsx`)**
- `countryAiEntry` state was populated but never rendered — now displays a full panel
- Triggers automatically when user clicks any country in the Наявність list (existing `fetchCountryAiAnalysis` call)
- Panel: conic-gradient freshness score circle, bar, avg_attempts + source badge pills, reasoning block with AI label
- "Вибрати цю країну →" button applies country + closes panel
- Loading skeleton (3 animated bars + text) and error state included
- Panel dismissable via ✕; appears between AI Top-10 panel and the SMSPool stock badge

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set
- ✅ Account Factory: smart proxy selection, no авто toggle, beautiful buttons, per-country AI card

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
- `_pick_auto_switch_proxy()`: only returns "found" if stats + proxy both exist; returns "suggest" if best country has no proxy stored; returns "none" if no data
- No авто toggle — `auto_switch` always `false` from frontend

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
