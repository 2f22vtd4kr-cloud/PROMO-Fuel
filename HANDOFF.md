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

**Task:** Debug why Account Factory gets stuck at Step 3 (Telegram code request) — all numbers returning SentCodeTypeApp / "recycled".

**Root cause found:** `CodeSettings` in all `RawSendCodeRequest` calls was missing two critical flags:
- `unknown_number=True` — tells Telegram this is a fresh/unregistered number → must receive SMS. Without it, Telegram's anti-spam routes delivery to Telegram app on unrecognized numbers (SentCodeTypeApp).
- `allow_app_hash=False` — explicit opt-out of app-hash delivery (was implicitly None/unset before).

Wire format proof: `CodeSettings(…)` without `unknown_number` serialized to `flags=0x00000000`; with `unknown_number=True` serializes to `flags=0x00000200` — different bit sent to Telegram.

**Secondary bug fixed:** The Step 3 "fallback" on exception was an identical copy of the primary `RawSendCodeRequest` (no difference at all). Replaced with Telethon's high-level `client.send_code_request(phone)` which takes a different internal code path.

**Files changed:**
- `account_factory.py` — 2 `CodeSettings` blocks (primary at ~line 1173, official-creds loop at ~line 1362) both now have `allow_app_hash=False, unknown_number=True`. Fallback changed to `client.send_code_request()`.

**Current state:**
- ✅ Telegram Bot workflow running (supervisor + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ account_factory.py passes `python3 -c "import ast; ast.parse(...)"` syntax check
- ✅ Bot restarted and serving requests

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
- **CodeSettings rule:** ALL `RawSendCodeRequest` calls MUST include `allow_app_hash=False, unknown_number=True` or Telegram routes to SentCodeTypeApp on fresh SMSPool numbers.

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
