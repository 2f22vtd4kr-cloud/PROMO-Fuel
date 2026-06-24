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

**Task:** Debug panel in AccountFactory with session history + .md download.

### What was built

**`artifacts/telegram-miniapp/src/components/FactoryDebugPanel.tsx`**
- Foldable glass panel (indigo/purple) above action buttons in AccountFactory
- Live event log: monospace, auto-scroll, 220px, color-coded event badges
- Header alert badges: "DC IP!" (red) or "recycled" (orange) + "N saved" pill
- Header toolbar: Copy raw | **Download .md** | Clear
- **AI analysis section** — optional question input + "Аналіз AI" button → `POST /api/v3/ai/factory-debug` (Gemini 2.5 Flash primary, Groq fallback) → SeverityChip + engine badge + summary + issues▸ + suggestions✓ + collapsible detailed analysis
- **Session history** — auto-saves to `localStorage["pf_factory_debug_sessions"]` (max 10) when `runState` transitions `running → done/error`
- History UI: collapsible "SESSION HISTORY" section, per-session: label + event count + DC/recycled flags + **View** / **Download ↓** / **Delete** buttons
- "View" loads a past session into the log view with an orange banner; "✕" returns to live log
- **Download .md** (current or any saved session): generates LLM-friendly markdown with session summary, step-by-step breakdown, architecture reference, full event table, and raw JSON — filename `factory_debug_YYYYMMDD_HHMM.md`

**`artifacts/api-server/src/routes/ai.ts`** — `POST /api/v3/ai/factory-debug`
- Already documented in previous turn — unchanged this turn

**`artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`**
- Added `runState` prop to `<FactoryDebugPanel>` so auto-save fires on completion

**Status:** build clean (1711 modules, 0 errors), both workflows running, HMR applied

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

Vite proxy: ALL `/api/*` → port 8080 (Node.js)

### Account Factory rules
- **CodeSettings:** ALL `RawSendCodeRequest` MUST have `allow_app_hash=False, unknown_number=True`
- SSE events collected: preflight, step, poll, error, complete, sms_retry_prompt, warmup_*, batch_*
- `pf_factory_debug_sessions` localStorage key — max 10 sessions

### Cold-start
`better-sqlite3` binary not committed → `npm rebuild better-sqlite3 --build-from-source` on cold start.
