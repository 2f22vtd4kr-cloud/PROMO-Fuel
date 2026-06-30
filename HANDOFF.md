# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

Three critical bugs fixed in `account_factory.py` — root cause of 247 failed registrations with $0 spent and 0 successful accounts.

---

### Bug 1 — Layer 2 proxy failure misclassified as "recycled number"

**File:** `account_factory.py` ~line 2793 (MODE B block in `else:` after L2 for-loop)

When all 3 Layer 2 connection retries threw proxy/connection exceptions, `_off_result` stayed `None`. The old `else:` clause treated this identically to confirmed SentCodeTypeApp — incremented `_app_stuck_count`, recorded prefix as blacklisted in `recycled_prefix_cache`, flagged the country as exhausted.

**Fix:** Restructured `else:` into two explicit paths:
- **MODE B** (`_off_result is None`): cancel order, increment `_l2_proxy_fail_count`, emit "Layer 2 proxy failed — NOT confirmed recycled", continue retry loop WITHOUT touching recycled counters or prefix blacklist.
- **MODE A** (`_off_result is not None`): confirmed SentCodeTypeApp — existing recycled handling unchanged.

Added `_l2_proxy_fail_count = 0` counter alongside other session counters (~line 1800).

---

### Bug 2 — `NameError` crash that silently killed every registration (PRIMARY CAUSE of $0 spent)

**File:** `account_factory.py` ~line 2627 (`_off_result = None` moved before the for-loop)

`_off_result = None` was set **inside** the Layer 2 for-loop body (~line 2700). When `_definitive_recycled = True`, the loop iterated over `[]` (empty list) — the body never ran, so `_off_result` was **never defined as a Python variable**.

The Bug 1 fix then referenced `_off_result` **outside** the loop (`if _off_result is None:`), hitting `NameError: name '_off_result' is not defined`. The `_producer()` wrapper caught this as `Exception`, emitted an "Internal error" SSE, and closed the stream — **without ever calling `cancel_order()`**. SMSPool auto-refunded each timed-out order after 120s → $0 spent despite 247 orders placed.

**Fix:** `_off_result = None` is now initialized **before** the for-loop (line 2627), outside the loop body, so it is always defined when the `else:` clause runs.

---

### Bug 3 — "Definitive triple" incorrectly bypassed Layer 2 when primary proxy IP was flagged

**File:** `account_factory.py` ~line 2635 (removed `else []` guard from L2 for-loop)

The "definitive recycled triple" (SentCodeTypeApp + SendCodeUnavailable + `next_type=None` from official `api_id`) was treated as irrefutable proof of a recycled number → Layer 2 skipped entirely via `_off_creds_filtered if not _definitive_recycled else []`.

This assumption breaks when the **primary proxy IP is flagged by Telegram for automation**: Telegram returns the same triple even for perfectly fresh, unregistered numbers — it refuses ALL delivery paths from a flagged IP. By skipping Layer 2, the code never got a second opinion from a different exit node (`_next_session_proxy` rotates Decodo session, giving a fresh residential IP).

**Fix:** Removed the `else []` guard — Layer 2 always runs regardless of `_definitive_recycled`. Added IP-flagging detection: if `_definitive_recycled = True` but Layer 2 gets `SentCodeTypeSms` → emits `🚨 IP FLAGGING DETECTED: primary proxy IP is flagged by Telegram` in the step message. If Layer 2 also gets SentCodeTypeApp → confirmed recycled (MODE A).

---

## Current app state

- **Telegram Bot** workflow: RUNNING cleanly (all 3 bugs fixed, restarted twice)
- **Telegram Mini App** workflow: RUNNING (port 5000)
- No frontend changes this session — all fixes are backend `account_factory.py`
- `data/campaigns.db`: healthy, VACUUM'd, WAL checkpoint done

---

## Critical first action for next session

**The SNSS `recycled_prefix_cache` table is poisoned with false-positive entries from 247 failed runs.** Before any factory attempt:
1. Open Account Factory in the Mini App
2. Go to the SNSS panel
3. Click **"Clear entire blacklist"**

OR call the API directly: `POST /api/factory/snss/clear`

Without this, the poisoned prefixes will skip numbers at Layer 0 without buying them, masking whether the real fixes work.

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
| `account_factory.py` | Python factory backend — all 3 bugs fixed this session |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Mini App factory UI (5542 lines) — no changes this session |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS panel — "Clear entire blacklist" button |
| `data/campaigns.db` | SQLite DB — `recycled_prefix_cache` table needs clearing |
| `scripts/ensure-python-deps.sh` | Cold-start bootstrap — `.deps-ready` sentinel |

---

## Architecture reminders

- **Workflows:** "Telegram Bot" = Python supervisor → apiserver (FastAPI 8083) + worker-1 + worker-2 + PTB bot. "Telegram Mini App" = Vite on port 5000.
- **Session proxy rotation:** `_next_session_proxy()` increments `_PROXY_SESSION_COUNTER` to get `session-N+1` on Decodo, giving a fresh residential exit node.
- **Layer 2 creds:** `_OFFICIAL_CLIENT_CREDS` = [api_id=2040 Desktop, api_id=2496 iOS, api_id=6 Android]. `_off_creds_filtered` excludes whichever was used as primary.
- **SNSS counters:** `_SNSS_MIN_COUNT = 2` (prefix blocked after 2 confirmed recycled hits), `_SNSS_PREFIX_LEN = 9`, `_SNSS_SHORT_PREFIX_LEN = 7`, `_CONSECUTIVE_RECYCLED_ABORT = 5`.
- **DB path:** `data/campaigns.db` relative to repo root; API server CWD is `artifacts/api-server/` so it uses `../../data/campaigns.db` via the fallback in `db-path.ts`.
