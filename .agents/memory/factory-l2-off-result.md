---
name: Factory L2 _off_result scope bug
description: _off_result was scoped inside the Layer 2 for-loop; when the loop ran over [] it was never defined, causing NameError in the else: clause and silent stream crash.
---

## The Rule

Always initialize `_off_result = None` **before** the Layer 2 for-loop in `account_factory.py`, never inside the loop body.

## Why

`_off_result = None` was set as the first statement inside the for-loop body. When `_definitive_recycled = True`, the loop iterated over `[]` — the body never executed, so `_off_result` was never created as a Python variable.

The `else:` clause after the loop (MODE B / MODE A split) then referenced `_off_result`, hitting:
```
NameError: name '_off_result' is not defined
```

The `_producer()` async wrapper caught this as `Exception`, emitted an "Internal error" SSE, and closed the stream — **without ever calling `cancel_order()`**. SMSPool auto-refunded each order after the 120s timeout. This produced exactly: 247 orders placed, $0 spent, 0 registrations.

## How to Apply

- Any time you add a reference to `_off_result` in the `else:` clause (or anywhere outside the for-loop body), make sure `_off_result = None` is declared before `for _off_api_id, ... in _off_creds_filtered:`.
- The fix is at `account_factory.py` line ~2627 (before the for-loop that iterates over `_off_creds_filtered`).
- General pattern: in Python, variables assigned only inside a `for` loop body are undefined if the iterable is empty. Always pre-initialise variables you'll read after the loop.
