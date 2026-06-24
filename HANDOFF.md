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

**Task:** Auto-fill proxy + 2FA on country change, plus rainbow "Full Auto Launch" button.

**1. Auto-fill proxy + 2FA on country selection (`AccountFactory.tsx`)**
- Extended the proxy-fetch `useEffect` (watches `country`/`customCountry`) to also auto-fill the proxy field from the first (most-recent) stored proxy for that country — sets `proxy`, `sessionStartNum` (last_session_num + 1), `selectedProxyStoreId`.
- If `twoFa` is currently empty, auto-generates a 16-char password (upper+lower+digits+symbols via `crypto.getRandomValues`). Does NOT overwrite an existing password.
- `twoFaRef = useRef("")` kept in sync with `twoFa` state so async functions read live value without stale-closure bugs.
- Fires on every country change (initial load, Наявність tab click, AI Вибір, own-stats panel, any `applyCountry()` call).

**2. `pendingAutoLaunchRef` trigger system (`AccountFactory.tsx`)**
- A `useRef` flag. When set `true`, a `useEffect` watching `[country, customCountry, proxy, twoFa]` fires `launch()` once all three are non-empty — avoids stale-closure issues since `launch()` reads React state.
- Used exclusively by `handleAutoLaunch()` after it sets all state.

**3. Rainbow "Full Auto Launch" button (`AccountFactory.tsx`, `index.css`)**
- CSS: `@keyframes rainbow-flow` — animates `background-position` 0%→100%→0% on a 300%-wide multi-stop gradient (slow 5s idle, fast 2s while checking). `@keyframes rainbow-pulse` for glow cycling (available).
- Button: `linear-gradient(135deg, #ff6b6b → #ffd93d → #6bcb77 → #4d96ff → #a855f7 → #ff6b6b)` at `backgroundSize: 300% 300%`, animated continuously. Scales down + accelerates while running.
- `handleAutoLaunch()` runs 4 preflight checks: (1) SMSPool key set, (2) best country from cache or `/api/factory/best-country`, (3) proxy in store for that country via `/api/proxy-store?country=X`, (4) avatar count via `/api/factory/avatar-counts` (AI profile mode only).
- If blockers → yellow issues card lists each problem. If all clear → applies state + fires launch.
- A "або запустити вручну" divider separates it from the original 🚀 manual button (unchanged).

**4. Previous session (already merged):** smart proxy selection fix, авто toggle removal, button beautification, per-country AI analysis card.

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ Build clean: `vite build` zero errors, 1099 kB bundle
- ✅ Auto-fill fires on any country change
- ✅ Rainbow auto-launch button renders + animates in idle and checking states

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
- `_pick_auto_switch_proxy()`: only returns "found" if stats + proxy both exist; "suggest" if best has no proxy; "none" if no data
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
| `artifacts/telegram-miniapp/src/index.css` | Global CSS incl. rainbow-flow keyframes |
| `campaigns.db` | SQLite — all tables incl. `factory_country_stats`, `saved_proxies` |
