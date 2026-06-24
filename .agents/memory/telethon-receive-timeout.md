---
name: Telethon 1.44.0 removed receive_timeout
description: receive_timeout kwarg was removed from TelegramClient() in Telethon 1.44.0; caused Step 2 crash on every registration.
---

# Telethon 1.44.0 — Removed Parameters

## The rule
Before adding any new `TelegramClient()` keyword argument, verify it exists in Telethon 1.44.0.

**Why:** `receive_timeout=45` was passed to `TelegramClient()` in `account_factory.py`. Telethon 1.44.0 (the installed version) removed this parameter. Every registration attempt crashed at Step 2 with `TelegramBaseClient.__init__() got an unexpected keyword argument 'receive_timeout'`.

**How to apply:**
- Check the installed version: `python3 -c "import telethon; print(telethon.__version__)"`
- Currently 1.44.0 — this is a significant version jump from ~1.24 where many params were added/removed.
- Parameters that still work in 1.44.0: `connection_retries`, `retry_delay`, `device_model`, `system_version`, `app_version`, `lang_code`, `system_lang_code`, `proxy`.
- Parameters that were removed: `receive_timeout` (use asyncio timeouts instead if needed).

## Fix applied
Removed `receive_timeout=45` from `TelegramClient()` in `account_factory.py` (~line 1133). No replacement needed — Telethon manages connection timeouts internally.
