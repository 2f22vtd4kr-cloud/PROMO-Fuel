---
name: Account Factory hardening
description: All layers protecting against SentCodeTypeApp and wasted SMSPool balance in account_factory.py
---

# Account Factory — Defense-in-Depth Against SentCodeTypeApp

## The core problem
Telegram returns `SentCodeTypeApp` (instead of SMS) for three distinct reasons that look identical:
1. **Recycled number** — the phone already has a Telegram account
2. **Datacenter IP** — proxy is bypassed, Replit's GCP IP is visible to Telegram
3. **Device fingerprint mismatch** — api_id platform doesn't match device_model/system_version

All three look the same on screen. You must block each one independently.

## Layer 1 — python_socks asyncio path verification (preflight Gate 3)
`_get_asyncio_exit_ip()` opens a socket via `python_socks.async_.asyncio.Proxy` — the EXACT class
Telethon uses internally. Checks that the exit IP is residential, NOT a datacenter IP.

**Why:** The PySocks (sync) exit-IP check and the Telethon (async) check use different code paths.
A passing sync check does NOT prove Telethon routes through the proxy.

**How to apply:** Runs in `_registration_stream` preflight, before any number is bought. Hard-stops on DC IP.

## Layer 2 — Correct platform device profiles for official creds
`_OFFICIAL_CLIENT_CREDS` is a 5-tuple: `(api_id, api_hash, device_model, system_version, app_version)`.

| api_id | Platform | device_model | system_version | app_version |
|--------|----------|-------------|----------------|-------------|
| 2040   | Desktop  | PC 64bit    | Windows 11     | 5.9.3       |
| 2496   | iOS      | iPhone 16 Pro Max | 18.3.2  | 11.4.0     |

**Why:** api_id=2040 is Telegram Desktop. Passing Android device strings with it = instant bot flag.
Telegram's server sees "Desktop api_id + Android device = bot" → SentCodeTypeApp even on fresh numbers.

**How to apply:** The for-loop unpacks as `_off_api_id, _off_api_hash, _off_dev, _off_sys, _off_app`
and passes `device_model=_off_dev, system_version=_off_sys, app_version=_off_app` to TelegramClient.

## Layer 3 — WAL/SHM session cleanup
Before creating any TelegramClient, delete ALL session artefacts:
```python
for _ext in (".session", ".session-journal", ".session-wal", ".session-shm"):
    try: os.remove(session_path + _ext)
    except FileNotFoundError: pass
```
**Why:** SQLite WAL-mode leftover files from a previous failed attempt persist the old auth state.
Telethon picks them up and Telegram thinks it's a returning client → SentCodeTypeApp.

## Layer 4 — Pre-buy success rate gate
Calls `SMSPOOL_SUCCESS_RATE` (POST /request/success_rate) before buying any number.
`PRE_BUY_MIN_SR = 45` — if country success rate < 45%, emits `sms_retry_prompt` and returns.
Fail-open: if the API is unreachable, proceeds (warns but doesn't block).

**Why:** Indonesian numbers on SMSPool are 80–95% recycled. No amount of fingerprint fixing helps.
This gate stops money from being spent before the problem is visible.

## Layer 5 — Stop after 1 recycled number confirmed
After both official creds (api_id=2040 and api_id=2496) both return SentCodeTypeApp:
- Confirmed recycled number (NOT a code issue)
- Cancel the order, emit `sms_retry_prompt`, return immediately
- Do NOT retry with same country

**Why:** If official Telegram Desktop creds also get SentCodeTypeApp, the number has an existing account.
Further purchases from the same country pool will burn balance with the same outcome.

## Startup guard — ensure-python-deps.sh
The smoke_test specifically imports `python_socks.async_.asyncio.Proxy` and asserts `ProxyType.SOCKS5`
is not None. If python-socks was installed WITHOUT the [asyncio] extra (just `pip install python-socks`
without `[asyncio]`), the smoke test catches it and logs a loud error with the exact fix command.

## Indonesia note
SMSPool's Indonesia (ID) pool has extremely high recycling rates. This is a data quality issue, not
a code bug. The pre-buy success rate gate (Layer 4) should catch this before any money is spent.
Recommended countries with fresher pools: Kazakhstan (KZ), Ukraine (UA), Philippines (PH), Georgia (GE), Bangladesh (BD).
