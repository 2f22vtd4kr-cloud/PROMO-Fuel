# PROMO-Fuel — Handoff

**Last updated:** 2026-06-24

---

> **AGENT PROTOCOL — read this first, every session**
> 1. Read this file completely before touching code.
> 2. Rewrite this file after EVERY response turn that does real work.
> 3. Replace "This session" entirely — do NOT accumulate past sessions here.
> HANDOFF.md must stay under ~150 lines.

---

## This session

**Task:** Fix "Python API unavailable" error in Account Factory, then audit all 8 pipeline steps for bugs.

### Root cause of "Python API unavailable"
Two compounding issues:
1. **Race condition** — `scripts/start.sh` starts Python supervisor in background then immediately starts Node.js. Requests hit `/api/factory/*` proxy before Python's FastAPI is ready on port 8083 → ECONNREFUSED → 502.
2. **No retry logic** in the Node.js proxy — a single ECONNREFUSED from Python immediately returns error to the client.

### Fixes applied

**`scripts/start.sh`**
- Added 30-second readiness poll loop after starting Python supervisor, probing port 8083 with `socket.create_connection` before starting Node.js. Fail-open after 30s.

**`artifacts/api-server/src/app.ts` — `makePythonProxy()`**
- Added retry logic: 3 attempts with 800ms × attempt backoff for ECONNREFUSED/ECONNRESET errors.
- Removed `transfer-encoding: chunked` from forwarded headers when body buffer is set — it conflicted with explicit `content-length`, potentially causing Python HTTP parse errors.
- Added `attempt` counter to error log for diagnostics.
- API server rebuilt and restarted — all changes live.

**`artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`**
- Error display now shows `j.detail` alongside `j.error`: `"Python API unavailable: connect ECONNREFUSED 127.0.0.1:8083"` instead of just `"Python API unavailable"`.

**`account_factory.py` — pipeline bug fixes**

| Bug | Fix |
|---|---|
| Missing `cancel_order()` on step 5 sign_in/sign_up failures → leaks SMSPool balance | Added `_registration_succeeded = False` flag; `finally` block calls `cancel_order()` unless flag is True. |
| Wrong device metadata in step 8 JSON when official creds used in step 3 Layer 2 | Added `_actual_device_model`, `_actual_system_version`, `_actual_app_version` tracking vars; updated when pool creds picked AND when official creds used; step 8 metadata uses `_actual_*` vars. |

---

## Required secrets

| Secret | Where |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather |
| `TELETHON_API_ID` / `TELETHON_API_HASH` | my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `GROQ_API_KEY` | console.groq.com/keys |
| `SMSPOOL_API_KEY` | smspool.net/profile |
| `API_SECRET` | any strong random string |

Non-sensitive: `PORT=8080`.

---

## Architecture snapshot

### Ports
| Service | Port |
|---|---|
| Vite Mini App dev | 5000 (exposed 80) |
| Python FastAPI | 8083 |
| Node.js Express | 8080 |

Vite proxy: ALL `/api/*` → port 8080 (Node.js).
Node.js `makePythonProxy` proxies `/api/factory/*` and `/api/verifications/*` → Python 8083, with 3 retries on ECONNREFUSED.

### Account Factory pipeline (8 steps)
```
Preflight → Step 1 (SMSPool buy) → Step 2 (Telethon init) → Step 3 (SendCode + 3-layer fallback)
→ Step 4 (SMS poll 120s) → Step 5 (sign_in/sign_up) → Step 6 (2FA) → Step 7 (Profile) → Step 8 (DB save)
```
All failure paths (except complete) now call `cancel_order()` via `finally` guard.

### Cold-start
If `ensure-sqlite3.sh` says "already built" but server crashes with NODE_MODULE_VERSION error:
```
rm node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
bash scripts/ensure-sqlite3.sh
```
