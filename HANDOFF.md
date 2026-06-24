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

**Turn 2 — Account Factory: gendered AI personality + avatar pool UI**
Full gender separation for AI account creation: `_generate_ai_profile(gender=)`, `_pick_pending_avatar(gender=)`, new avatar-counts and upload-avatars endpoints, avatar pool indicator bars in AccountFactory.tsx (green/yellow/red/black), gender selector (♂/♀/⚄), inline per-gender upload panel.

**Turn 3 — Account Factory: VN SentCodeTypeApp false-positive fix + 120s timeout**
Added Layer 1 `ResendCodeRequest` step before the official-creds check. For fresh numbers on App-first carriers (Vietnamobile 056x), Telegram escalates App → SMS on resend. SMS poll timeout reduced 180s → 120s, mid-poll resend at 60s remaining.

**Turn 4 — Three fixes: proxy save bug, 2FA random password, SMS SendCodeUnavailableError**

**Fix 1 — Proxy vault not saving (root cause):**
`/api/proxy-store` was blocked by the Bearer middleware when `API_SECRET` is set. The Mini App doesn't carry a Bearer session token. Fixed: added `/proxy-store` prefix to the Bearer middleware skip list in `artifacts/api-server/src/app.ts` (line ~164). No UI changes needed.

**Fix 2 — 2FA password generator button:**
Replaced the `LabelledInput` for "Пароль 2FA" with a custom row: `<input type="password" flex:1>` + `<RefreshCw>` icon button. Click generates a 16-char cryptographically random password using `crypto.getRandomValues()` from charset `A-Z a-z 2-9 !@#$%&*` (no ambiguous chars). Added `RefreshCw` to the lucide-react import.

**Fix 3 — `SendCodeUnavailableError` fast-fail:**
`SendCodeUnavailableError` on `ResendCodeRequest` means Telegram explicitly says "all delivery methods exhausted — code is in the existing account's app." Previously treated as a generic error → fell through to the 15s official-creds check. Now caught specifically: immediately cancel order, `safe_disconnect`, emit `sms_retry_prompt`, and `return`. This stops wasting time and money on a confirmed-recycled signal.

**What to do next session:** Country rankings with own historical stats (attempts/successes/recycled per country) alongside SMSPool rate.

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set
- ✅ Account Factory: gendered AI profile + avatar pool per gender
- ✅ Account Factory: 3-layer non-SMS gate (ResendCode → SendCodeUnavailableError fast-fail → official creds → confirmed recycled)
- ✅ Proxy vault: saves and loads correctly (Bearer skip for /proxy-store)
- ✅ 2FA field: random password generator button

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
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Factory UI |
| `campaigns.db` | SQLite — all tables |
| `HANDOFF.md` | This file |
