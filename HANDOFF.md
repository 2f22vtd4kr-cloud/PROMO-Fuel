# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Auto-Loop infinite-loop bug fix (sms_retry_prompt)

When a country pool is permanently flagged as recycled (`_RECYCLED_COUNTRY_POOL` in Python), the backend returns `sms_retry_prompt` instantly on every call. The old handler called `void launch()` with zero delay → ~10 launches/second spin loop.

**Fix in `AccountFactory.tsx` — `sms_retry_prompt` auto-loop branch:**
- Detect permanent pool flag: message contains `"pool flagged as recycled"` OR `"SendCodeUnavailable"`
- If permanently flagged → stop auto-loop, surface recycled-pool error popup
- All other soft failures → `setTimeout(5000)` before re-launching
- Same 5s delay added to `error` auto-loop branch

### 2. 💾 Save button missing in proxy section

Builder's `onApply` called `setProxy(url)` but did NOT call `setSelectedProxyStoreId(null)`. Fixed by adding `setSelectedProxyStoreId(null)` to the `onApply` callback.

### 3. Auto-Loop: UI must stay on 8-step running screen throughout

**Bug:** Every auto-loop inter-iteration branch called `setRunState("idle")` before relaunching. `runState === "idle"` triggers the settings form to render, hiding the 8-step running window with the debug menu.

**Fix — removed all `setRunState("idle")` calls from auto-loop branches:**
- `batch_done` auto-loop (target not yet reached): removed `setRunState("idle")`, just call `launch()` directly (launch sets "running" itself)
- `complete` auto-loop (target not yet reached): same — removed `setRunState("idle")`
- `balance_low` auto-loop: removed `setRunState("idle")` — stays "running" while countdown ticks
- `sms_retry_prompt` soft retry: replaced `setRunState("idle")` with `setPollMsg("🔁 Авто-Цикл: повтор через 5с…")` — user sees status on 8-step screen
- `error` auto-loop retry: same poll message, no idle transition

**Result:** The 8-step running window (with debug menu) stays visible for the entire auto-loop session. It only resets when: target is reached (`runState = "done"`), permanently recycled pool is detected (`runState = "error"`), or the user presses Stop.

---

## Current app state

- All workflows running: `Telegram Mini App` (port 5000), `Telegram Bot`, API Server (port 8080)
- Typecheck: clean after all three fixes
- No backend changes this session

## Key files

- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` — all Auto-Loop + proxy logic (5542 lines)
- `account_factory.py` — Python SSE backend (unchanged)
- `artifacts/api-server/src/routes/factory.ts` — Node.js factory proxy (unchanged)

## Open / follow-up items

- None. All three bugs fixed, typecheck clean, workflows running.
