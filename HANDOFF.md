# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Auto-Loop mode in Account Factory

Implemented a new **Auto-Loop** mode in `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`. When enabled, the factory runs continuously until a user-specified target account count is reached — no interrupting popups, no country-switch prompts, no manual restart needed.

**New state & refs added** (after line ~1387):
- `autoLoop` / `autoLoopRef` — toggle state + ref for async access
- `autoLoopTarget` / `autoLoopTargetRef` — target count
- `autoLoopCompleted` / `autoLoopCompletedRef` — accounts completed so far
- `autoLoopBalanceWait` / `autoLoopWaitSecs` — balance-wait state + countdown
- `autoLoopStopRef` — set true by `abort()`, prevents timer re-launch
- `autoLoopWaitTimerRef` — holds the setInterval for balance countdown

**New function: `startBalanceWait()`** (before `launch()`):
- Starts a 5-minute countdown (1s ticks, updates `autoLoopWaitSecs`)
- On each tick, checks `autoLoopStopRef` — stops immediately if user pressed Stop
- At zero: hits `/api/factory/balance`; if balance > $0.50 → calls `void launch()`; else restarts the wait

**Modified `launch()`** top:
- Resets `autoLoopStopRef.current = false` (so a fresh Launch after Stop works)
- Syncs `autoLoopRef.current` and `autoLoopTargetRef.current` from React state

**Modified SSE event handlers** inside `launch()`:
- `batch_done` — if auto-loop: increments `autoLoopCompletedRef`, checks target, re-launches or stops
- `complete` (qty=1 mode) — same logic per individual account
- `balance_low` — if auto-loop: enters `autoLoopBalanceWait` mode silently instead of error
- `sms_retry_prompt` — if auto-loop: silent `void launch()` for ALL reason types (timeout, recycled, low_rate)
- `error` — if auto-loop: silent `void launch()` instead of showing error

**Modified `abort()`**: sets `autoLoopStopRef.current = true`, clears timer, clears `autoLoopBalanceWait`

**Modified `reset()`**: resets `autoLoopStopRef.current = false`, `autoLoopCompleted = 0`, clears timer

**New UI** (after Quantity stepper):
- Glass card with 🔁 icon + animated toggle switch (green when active)
- When enabled: target counter with +/− buttons (default 10)
- Description changes based on enabled state

**New UI** (in running status area):
- Auto-Loop progress banner (🔁, progress bar, X/Y count) — visible during run and balance-wait
- Balance-wait card (💰) with MM:SS countdown + "Top Up →" link — only in auto-loop mode

---

## Current app state

- Both workflows running: `Telegram Mini App` (port 5000), `Telegram Bot`
- Typecheck: clean (0 errors after all Auto-Loop edits)
- No backend changes needed — frontend-only orchestration loop

## Key files

- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` — all Auto-Loop logic (5300+ lines)
- `account_factory.py` — Python SSE backend (unchanged this session)
- `artifacts/api-server/src/routes/factory.ts` — Node.js factory proxy (unchanged)

## Open / follow-up items

- None from this session. Auto-Loop is fully implemented and typechecks clean.
