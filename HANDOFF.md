# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

Fresh import from GitHub onto Replit. All services brought up from a clean state.

### Setup steps completed
1. **Python venv** — created `.pythonlibs` virtualenv; installed all deps from `requirements.txt`
2. **`requirements.txt` cleaned** — removed duplicate entries and the bare `telegram` stub package that shadows python-telegram-bot
3. **better-sqlite3** — native `.node` binary compiled via `scripts/ensure-sqlite3.sh`
4. **`.deps-ready` sentinel** — written so cold-start scripts skip reinstall on next boot
5. **All 8 secrets set** — `TELEGRAM_TOKEN`, `TELETHON_API_ID`, `TELETHON_API_HASH`, `ADMIN_TELEGRAM_ID`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `SMSPOOL_API_KEY`, `API_SECRET`

---

## Current app state

- **Telegram Bot** workflow: RUNNING cleanly — supervisor, worker-1, worker-2, PTB bot, FastAPI (8083), broadcast scheduler all up
- **Telegram Mini App** workflow: RUNNING (Vite on port 5000)
- **API Server** workflow: RUNNING (Node.js Express on port 8080)
- Mini App login screen: accessible at port 5000; enter `API_SECRET` value to log in
- `data/campaigns.db`: healthy (all 14 migration steps passed)

---

## Critical first action for next session

**The SNSS `recycled_prefix_cache` table is poisoned with false-positive entries from 247 failed runs.** Before any factory attempt:
1. Open Account Factory in the Mini App
2. Go to the SNSS panel
3. Click **"Clear entire blacklist"**

OR call the API directly: `POST /api/factory/snss/clear`

Without this, the poisoned prefixes will skip numbers at Layer 0 without buying them, masking whether the real fixes work.

---

## Known warnings (non-fatal)

- `MINIAPP_URL is not set` — bot warns on start; means no "Open App" button in Telegram for admin. Set `MINIAPP_URL` secret to the Replit public URL to fix.
- `VITE_OWNER_IDS / OWNER_IDS not set` — Mini App defaults to owner view for all users. Set `OWNER_IDS` to your Telegram user ID to restrict access.
- `saved_proxies is empty` — expected on fresh import; add proxies via Accounts → Proxies panel before running factory.
- `pf_session_files is empty` — expected; populate via account import or factory.
- Telethon `libssl` warning — falls back to Python AES; slower but fully functional.

---

## What to watch for in next factory run

After clearing the SNSS cache and running the factory again, three outcomes are possible:

1. **`🚨 IP FLAGGING DETECTED` in step 3** → Decodo's residential IP for that country is flagged by Telegram. Contact Decodo for a clean pool or try a different country. The numbers themselves are fresh — the IP is the problem.

2. **`⛔ Layer 2 proxy connection failed` (MODE B)** multiple times → Decodo's proxy is unstable during the 5s reconnect window in Layer 2. Consider increasing the sleep at line ~2650 from 5s to 8-10s, or contact Decodo about proxy stability.

3. **`🔴 Official creds also got SentCodeTypeApp — number is recycled`** consistently across many countries → the SMSPool pools for those countries are genuinely exhausted. Switch to less-popular countries or ask SMSPool for fresh batches.

4. **`✅ Code sent via SentCodeTypeSms — polling SMSPool`** → Step 3 succeeded. If Step 4 times out (no SMS arrives in 120s), the issue moves to the SMS delivery layer (api_id shadow-block or SMSPool service ID mismatch).

---

## Key files

| File | Notes |
|------|-------|
| `account_factory.py` | Python factory backend — 3 bugs fixed last session |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Mini App factory UI (5542 lines) |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS panel — "Clear entire blacklist" button |
| `data/campaigns.db` | SQLite DB — `recycled_prefix_cache` table needs clearing |
| `requirements.txt` | Cleaned — no duplicates, no telegram stub |
| `scripts/ensure-python-deps.sh` | Cold-start bootstrap — `.deps-ready` sentinel |
| `scripts/ensure-sqlite3.sh` | Compiles better-sqlite3 native binary (version hardcoded — tech debt) |

---

## Architecture reminders

- **Workflows:** "Telegram Bot" = Python supervisor → apiserver (FastAPI 8083) + worker-1 + worker-2 + PTB bot. "Telegram Mini App" = Vite on port 5000. "API Server" = Node.js Express on port 8080.
- **Session proxy rotation:** `_next_session_proxy()` increments `_PROXY_SESSION_COUNTER` to get `session-N+1` on Decodo, giving a fresh residential exit node.
- **Layer 2 creds:** `_OFFICIAL_CLIENT_CREDS` = [api_id=2040 Desktop, api_id=2496 iOS, api_id=6 Android]. `_off_creds_filtered` excludes whichever was used as primary.
- **SNSS counters:** `_SNSS_MIN_COUNT = 2` (prefix blocked after 2 confirmed recycled hits), `_SNSS_PREFIX_LEN = 9`, `_SNSS_SHORT_PREFIX_LEN = 7`, `_CONSECUTIVE_RECYCLED_ABORT = 5`.
- **DB path:** `data/campaigns.db` relative to repo root; API server CWD is `artifacts/api-server/` so it uses `../../data/campaigns.db` via the fallback in `db-path.ts`.
- **Login:** Mini App at port 5000 — enter value of `API_SECRET` secret to authenticate.
