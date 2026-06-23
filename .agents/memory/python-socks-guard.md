---
name: python-socks silent proxy bypass
description: Telethon silently ignores SOCKS5 proxy without python-socks[asyncio]; root cause of all numbers returning SentCodeTypeApp during Account Factory registration.
---

## The Rule
`python-socks[asyncio]` must be installed for Telethon to route through a SOCKS5 proxy. Without it, Telethon silently drops the proxy and connects from the server's bare datacenter IP.

**Why:** Telethon's async proxy support is in a separate optional package (`python-socks`). When absent, it prints `UserWarning: proxy argument will be ignored` to stderr but continues — it does NOT raise an exception. The TCP pre-check in `_test_proxy_connection()` uses `pysocks` (different package, raw socket) and passes regardless. This combination means: pre-check green, registration fails with SentCodeTypeApp on 100% of numbers, no obvious error in logs unless you specifically grep for the warning.

**How to apply:**
- `requirements.txt` must list `python-socks[asyncio]>=2.8.2` (NOT `pysocks` — that's a different package for sync code)
- `account_factory.py` now has an explicit guard after the proxy pre-check: if `proxy_string` is set but `import python_socks` fails → SSE error + abort before Step 1 (no SMSPool balance spent)
- Step 2 completion message now shows `via <host>:<port>` — if you see "Telethon connected" without "via …", proxy was not applied
- Symptom pattern: SentCodeTypeApp on ALL numbers across ALL countries even with official api_id=2040 → first suspect is missing python-socks or datacenter proxy
