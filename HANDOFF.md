# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Auto-Loop infinite-loop bug fix (sms_retry_prompt)

**Bug:** In Auto-Loop mode, when a country pool is permanently flagged as recycled (`_RECYCLED_COUNTRY_POOL` in Python process memory), the backend returns `sms_retry_prompt` instantly on every call. The old handler called `void launch()` with zero delay → ~10 launches/second spin loop, saturating the system.

**Fix in `AccountFactory.tsx` — `sms_retry_prompt` auto-loop branch:**
- Detect permanent pool flag: message contains `"pool flagged as recycled"` OR `"SendCodeUnavailable"`
- If permanently flagged → stop auto-loop (`autoLoopStopRef.current = true`), surface the recycled-pool error popup, set `runState = "error"`
- All other soft failures (SMS timeout, low rate, etc.) → `setTimeout(5000)` before re-launching (max 1 retry/5s)

**Fix in `AccountFactory.tsx` — `error` auto-loop branch:**
- Same 5-second `setTimeout` delay added (was also `void launch()` with no delay)

### 2. 💾 Save button missing in proxy section

**Bug:** Builder (ProxyGenHelper) `onApply` called `setProxy(url)` but did NOT call `setSelectedProxyStoreId(null)`. If a Сховище chip was selected before opening the Builder, `selectedProxyStoreId` stayed non-null after applying the built URL → the `{proxy.trim() && !selectedProxyStoreId}` condition hid the 💾 Save button even though the new URL is unsaved.

**Fix:** Added `setSelectedProxyStoreId(null)` to the Builder's `onApply` callback (line ~4009).

---

## Current app state

- Both workflows running: `Telegram Mini App` (port 5000), `Telegram Bot`
- Typecheck: clean after both fixes
- No backend changes this session

## Key files

- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` — Auto-Loop logic + proxy section (5542 lines)
- `account_factory.py` — Python SSE backend (unchanged)
- `artifacts/api-server/src/routes/factory.ts` — Node.js factory proxy (unchanged)

## Open / follow-up items

- None. Both bugs fixed, typecheck clean, workflows running.
