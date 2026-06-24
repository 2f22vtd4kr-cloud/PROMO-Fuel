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

**Task:** Build a foldable AI debug panel in AccountFactory that captures live SSE events and lets Gemini/Groq analyze the registration session.

**What was built:**

1. **`artifacts/telegram-miniapp/src/components/FactoryDebugPanel.tsx`** (new file)
   - Foldable glass panel with indigo/purple glass morphism design
   - Monospace event log (max 220px, scrollable, auto-scrolls to bottom)
   - Each event: `HH:mm:ss.ms` timestamp + color-coded event-type badge + smart label
   - Color scheme: step/done=green, step/running=amber, step/error=red, poll=blue, preflight=purple, error=red, complete=bright green, sms_retry=orange, batch_*=cyan, warmup_*=purple
   - Smart label extraction: extracts `SentCodeType*` from step messages, shows exit IP + DC warning for preflight
   - Header badges: red "DC IP!" or orange "recycled" alert badges appear when relevant
   - Copy-log and Clear buttons in header
   - AI analysis section: optional question input + "Аналіз AI" button (Sparkles icon)
   - Shows loading spinner, then: SeverityChip (✅/⚠️/❌) + engine badge (GEMINI/GROQ) + summary + issues list (red ▸) + suggestions (green ✓) + collapsible detailed analysis
   - Inline `DetailedAnalysis` sub-component (expand/collapse)

2. **`artifacts/api-server/src/routes/ai.ts`** — added `POST /api/v3/ai/factory-debug`
   - Takes `{ events: DebugLogEntry[], question?: string }`
   - Formats event timeline as readable log (max 120 events)
   - System prompt encodes full factory architecture: 8-step pipeline, CodeSettings rule, SMS delivery types, proxy requirements, pre-flight events, healthy signature, common failure patterns
   - Gemini 2.5 Flash primary (JSON mode), Groq llama-3.3-70b fallback
   - Returns `{ severity, summary, issues[], suggestions[], analysis, engine }`

3. **`artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`** — wired up:
   - Import `FactoryDebugPanel` + `DebugLogEntry` type
   - Added `debugLog` / `setDebugLog` state (capped at 500 entries)
   - SSE loop: every parsed event pushed to `debugLog` before the if/else dispatch
   - `reset()` function: clears `debugLog` (called on "Register More")
   - `<FactoryDebugPanel>` rendered before the action buttons (always visible when panel active)

**Also fixed this session:** `better-sqlite3` native binary mismatch after cold start — ran `npm rebuild better-sqlite3 --build-from-source`, API server now running.

**Current state:**
- ✅ Telegram Bot workflow running
- ✅ Telegram Mini App workflow running (Vite, port 5000), build: 1711 modules, 0 errors
- ✅ API server workflow running (port 8080), new endpoint deployed

---

## Required secrets (check on fresh import)

| Secret | Where to get it |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather |
| `TELETHON_API_ID` | https://my.telegram.org/apps |
| `TELETHON_API_HASH` | https://my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `SMSPOOL_API_KEY` | https://smspool.net/profile |
| `API_SECRET` | Any strong random string |

Non-sensitive: `PORT=8080`.

---

## Architecture snapshot

### Ports
| Service | Port |
|---|---|
| Vite Mini App dev | 5000 (exposed as 80) |
| Python FastAPI | 8083 |
| Node.js Express | 8080 |

### Vite proxy: ALL `/api/*` → port 8080 (Node.js Express)

### Account Factory
- **CodeSettings rule:** ALL `RawSendCodeRequest` calls MUST have `allow_app_hash=False, unknown_number=True`
- SSE events captured: preflight, step, poll, error, complete, sms_retry_prompt, warmup_*, batch_*
- Debug panel renders once `runState !== "idle"` (after first launch)

### cold-start note
`better-sqlite3` native binary is NOT committed. On cold start: `npm rebuild better-sqlite3 --build-from-source` or `scripts/post-merge.sh`.
