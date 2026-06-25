# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Account Factory — All fixes + UX enhancements

**Bug 1 — Python `UnboundLocalError` (primary root cause of "all steps waiting")**
`force_country = False` inside `generate()` made it a local variable, crashing before a single SSE event was emitted. Fix: split into `generate()` + `_generate_inner()`; use `_force_country` local copy inside the inner generator.

**Bug 2 — Silent exception swallowing**
`generate()` now wraps `_generate_inner()` in `try/except Exception` and yields an `error` SSE event so the user sees the message instead of a frozen screen.

**Bug 3 — No keepalive chunk**
`generate()` yields `": keepalive\n\n"` as its first chunk before any network work, forcing CDN to flush headers immediately.

**Bug 4 — Node.js proxy swallowing SSE chunks**
Replaced `proxyRes.pipe(res)` with a manual `data` event handler that calls `res.write(chunk)` + `res.socket?.uncork()` after each chunk. `sock.setTimeout(0)` prevents idle-timeout on long registrations.

**Bug 5 — Frontend stuck in "running"**
Added `receivedTerminal` bool. If the stream closes without a terminal event → shows `"⚠️ Поток закрито без відповіді від сервера"` and sets `runState("error")`.

### Step timing display
Each `StepRow` shows a live ticking badge (100ms interval, accent color) while running → frozen green/red badge with elapsed time when done/error. `StepState.startedAt`+`elapsedMs`; `updateStep` auto-stamps the transition.

### Session summary strip
Stats Strip appears as soon as registration starts. Shows live total session time (1s tick, `sessionLiveMs`), `$X.XX витрачено` (SMSPool cost), and recycled-skip counts. Freezes in green/muted when done/error. `sessionStartedAt` ref stamped in `launch()`, `sessionElapsedMs` frozen in terminal event handlers.

### Registration history log (current session)
Collapsible `RegHistoryPanel` at the bottom of the Account Factory page. Persists up to 100 entries in `localStorage("pf_reg_history")`. Each entry stores: status (done/error), phone, country, duration, SMSPool cost, error message, timestamp.

- Green dot → successful registration with phone number + country + time
- Red dot → failed registration with truncated error message
- Right side: frozen `fmtMs(durationMs)` + `$cost` (yellow, only when > 0)
- "Clear" button removes all entries from state + localStorage
- Collapse/expand chevron, "History N" header with count pill

Implementation details:
- `RegHistoryEntry` interface at top of file
- `regHistory` state initialized from localStorage (lazy init)
- `addToHistory` useCallback — prepends to state + syncs localStorage
- `localCostAccumulated` local var in `launch()` tracks cost without stale closure (avoids reading React state mid-async)
- `complete` event: saves `{ status:"done", phone, country: countryId, durationMs: completeElapsed, cost: localCostAccumulated }`
- `error` event: saves `{ status:"error", errorMsg, country: countryId, durationMs: errorElapsed, cost: localCostAccumulated }`

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080, dist rebuilt)
- **Telegram Mini App**: RUNNING on port 5000 (dist rebuilt — `index-CployFxM.js`)
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py` — `generate()` + `_generate_inner()` fix; `_force_country` rename
- `artifacts/api-server/src/app.ts` — SSE proxy manual write+uncork
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `RegHistoryEntry` interface (~line 62)
  - `RegHistoryPanel` component (~line 205)
  - `regHistory` state + `addToHistory` callback (~line 1479)
  - `localCostAccumulated` in `launch()` (~line 1502)
  - `complete` handler with `addToHistory` call (~line 1656)
  - `error` handler with `addToHistory` call (~line 1718)
  - `<RegHistoryPanel />` render at page bottom (~line 4492)

---

## Pending / watch items

- Factory not end-to-end tested in this session (requires real SMSPOOL_API_KEY + proxy + 2FA password in prod)
- `python-multipart` still not installed in `.pythonlibs` — upload works via JSON+base64 without it
- `assets/pending_avatars/` empty on fresh import — user must upload photos before AI mode can assign avatars
- `[pg-guard] FAILED to create saved_proxies — duplicate key` in API Server logs is harmless
