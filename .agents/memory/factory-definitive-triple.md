---
name: Factory definitive-triple IP-flagging flaw
description: The "definitive recycled triple" (SentCodeTypeApp + SendCodeUnavailable + next_type=None) is NOT irrefutable; flagged proxy IPs produce the same triple for fresh numbers. Layer 2 must always run to get an independent verdict.
---

## The Rule

Never skip Layer 2 based on `_definitive_recycled = True`. Always run at least one Layer 2 credential attempt to get an independent exit-IP verdict.

## Why

The original assumption: *"SentCodeTypeApp + SendCodeUnavailable + next_type=None from an official api_id can only come from a recycled number."*

This is only true on a clean proxy IP. When **Telegram flags a proxy IP for automation**, it returns this identical triple even for perfectly fresh, unregistered numbers — because it refuses all code delivery paths from the flagged IP. Calling ResendCode from the same flagged IP then returns `SendCodeUnavailable`.

By skipping Layer 2 for "definitive" cases, the factory never got a second opinion from a fresh exit node. `_next_session_proxy()` rotates the Decodo session (session-N → session-N+1), which gives a different residential exit IP. That fresh IP would return `SentCodeTypeSms` for an unregistered number, proving it's a fresh number and the primary IP is the problem.

## How to Apply

- The Layer 2 for-loop must iterate over `_off_creds_filtered` unconditionally — no `else []` guard based on `_definitive_recycled`.
- `_definitive_recycled` is still useful as a **hint**: if it was True and Layer 2 gets `SentCodeTypeSms`, emit a `🚨 IP FLAGGING DETECTED` warning to the operator.
- If `_definitive_recycled = True` and Layer 2 ALSO gets `SentCodeTypeApp` → confirmed recycled (MODE A). The extra ~8-12s overhead is acceptable given the alternative is 100% false positives.
- Fix location: `account_factory.py` line ~2635, the `for` loop over `_off_creds_filtered`.
- The `🚨 IP FLAGGING DETECTED` message is emitted at line ~2763 when `_definitive_recycled and not any(t in code_type_name for t in _non_sms)`.
