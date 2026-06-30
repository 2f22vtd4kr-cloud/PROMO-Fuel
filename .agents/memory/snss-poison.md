---
name: SNSS cache poisoning after factory debug runs
description: False-positive recycled detections during buggy factory runs poison recycled_prefix_cache; must clear before first real run after any bug fix session.
---

## The Rule

After any session that fixes factory bugs and involves test runs that produced false "recycled" verdicts, **always clear the SNSS blacklist before the next real factory run**.

## Why

The SNSS Layer 0 prefix blacklist (`recycled_prefix_cache` SQLite table, also mirrored in `_RECYCLED_PREFIX_MEM` in-process dict) blocks numbers whose first 9 digits have been seen ≥ `_SNSS_MIN_COUNT` (=2) times in confirmed-recycled outcomes.

When bugs cause fresh numbers to be falsely counted as recycled (e.g., the `_definitive_recycled` + `_off_result` NameError bugs), many valid prefixes get blacklisted. On the next run, those prefixes are rejected instantly at Layer 0 — SMSPool orders are cancelled before purchase, no numbers are even tried. This masks whether the underlying bugs are fixed.

## How to Apply

- Clear via: Mini App → Account Factory → SNSS panel → **"Clear entire blacklist"** button.
- Or directly: `POST /api/factory/snss/clear` (no body required).
- The API route clears both the `recycled_prefix_cache` DB table and the `_RECYCLED_PREFIX_MEM` in-process dict (via a flag read on next factory run or via direct dict clear in the route handler).
- Always do this after a bug-fix session before the operator runs the factory for real results.
