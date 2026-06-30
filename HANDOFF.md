# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

Three bugs found and fixed in `account_factory.py` — all contributed to 247 failed registrations with $0 spent.

---

### Bug 1: Layer 2 proxy failure misclassified as "recycled number"

**Location:** `else:` branch after the Layer 2 for-loop (~line 2793)

When ALL 3 Layer 2 connection retries threw proxy/connection exceptions, `_off_result` stayed `None`. The old code treated this identically to a confirmed SentCodeTypeApp result — incrementing `_app_stuck_count`, recording the prefix as blacklisted, flagging the country as recycled.

**Fix:** Split the `else:` into MODE B (`_off_result is None` = proxy failure, cancel but don't count as recycled) and MODE A (`_off_result is not None` = confirmed SentCodeTypeApp). Added `_l2_proxy_fail_count` counter.

---

### Bug 2: `_off_result` NameError when `_definitive_recycled = True`

**Location:** `_off_result = None` was set INSIDE the for-loop body (~line 2700), but the `else:` clause (my Bug 1 fix) references `_off_result` OUTSIDE the loop.

When `_definitive_recycled = True`, the loop iterated over `[]` — loop body never ran, `_off_result` was never defined. The `else:` clause hit `NameError: name '_off_result' is not defined`. The `_producer()` caught this as `Exception`, emitted an "Internal error" SSE, ended the stream — WITHOUT calling `cancel_order()`. SMSPool auto-refunded after 120s → $0 spent. **This was the primary cause of $0 spent / 247 verifications / 0 registrations.**

**Fix:** Moved `_off_result = None` initialization to BEFORE the for-loop (line 2627), outside the loop body, so it's always defined when the `else:` clause runs.

---

### Bug 3: "Definitive triple" falsely skips Layer 2 when primary proxy IP is flagged

**Location:** `_off_creds_filtered if not _definitive_recycled else []` at the for-loop guard.

The "definitive recycled triple" (SentCodeTypeApp + SendCodeUnavailable + next_type=None) was assumed to be irrefutable proof of a recycled number. But when a **proxy IP is flagged by Telegram for automation**, Telegram returns this exact same triple even for fresh, unregistered numbers — because it refuses all delivery paths from the flagged IP.

By skipping Layer 2 entirely for the definitive triple, the code never got an independent verdict from a different exit node. Layer 2 uses `_next_session_proxy` to rotate to a fresh residential node. If that node gets `SentCodeTypeSms` after a "definitive triple", the number is fresh and the primary IP is flagged.

**Fix:** Removed `else []` guard — Layer 2 always runs regardless of `_definitive_recycled`. Added IP-flagging detection: when `_definitive_recycled = True` but Layer 2 gets SentCodeTypeSms → emits `🚨 IP FLAGGING DETECTED` step message so the operator knows to switch proxy providers.

---

## Current app state

- All workflows running: `Telegram Mini App` (port 5000), `Telegram Bot`
- Bot restarted cleanly after all 3 fixes
- **IMPORTANT:** The SNSS `recycled_prefix_cache` table is poisoned with false-positive entries from 247 failed runs. User must click "Clear entire blacklist" in the SNSS panel before the next factory run.

## Key files

- `account_factory.py` — all 3 bugs fixed
  - Bug 1: ~line 2793 (new `_off_result is None` MODE B branch)
  - Bug 2: ~line 2627 (`_off_result = None` moved before for-loop)
  - Bug 3: ~line 2635 (removed `else []` from `_off_creds_filtered` guard)
- `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` — "Clear entire blacklist" button

## Open / follow-up items

- User should clear SNSS blacklist before next factory run
- If factory now shows "🚨 IP FLAGGING DETECTED" → user's primary proxy IP is flagged by Telegram; they should contact Decodo to get a clean residential IP pool for the target country
- If factory shows MODE B "Layer 2 proxy connection failed" multiple times → proxy stability issue on reconnect; increase the 5s sleep at line ~2641 or use a more stable proxy
