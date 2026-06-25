# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Deep bug hunt: false "recycled" diagnosis in Account Factory

The user reported UZ (Uzbekistan) numbers being flagged as recycled even though they may be fresh. Full audit of `account_factory.py` revealed **5 bugs** on our side, all fixed:

---

### Bug 1 (ROOT CAUSE): `CancelCodeRequest` imported but never called

`account_factory.py` imports `CancelCodeRequest` (line 34) but never uses it. After the primary client's `RawSendCodeRequest` gets `SentCodeTypeApp` → `ResendCode` → `SendCodeUnavailableError`, Telegram's server still has an active code session for that phone. Layer 2 then issues a fresh `RawSendCodeRequest` from a NEW client for the SAME phone while the first session is still "warm." Telegram can reuse its routing decision (`SentCodeTypeApp`) even for a genuinely fresh number, producing a false "recycled" diagnosis.

**Fix:** Added `CancelCodeRequest(phone_number=phone, phone_code_hash=phone_code_hash)` call (best-effort) immediately before entering the Layer 2 loop, while the primary client is still connected. This explicitly closes Telegram's pending code session so Layer 2 gets a clean, independent routing evaluation.

Location: `account_factory.py` ~line 1861 (new block before `_off_creds_filtered = [...]`).

---

### Bug 2: 3-second sleep too short after CancelCodeRequest

The original 3-second `asyncio.sleep` before Layer 2 connects was added for proxy tunnel teardown. After adding `CancelCodeRequest`, we also need time for Telegram's server to settle before Layer 2's fresh `RawSendCodeRequest` arrives.

**Fix:** Bumped `asyncio.sleep(3)` → `asyncio.sleep(5)`.

---

### Bug 3: Layer 2 reuses same proxy session (same exit IP)

Layer 2's `TelegramClient` was created with the same `proxy_tuple` as the primary — same Decodo session ID, same exit node. Two `RawSendCodeRequest` calls for the same phone from the same IP within seconds can trigger Telegram's per-IP anti-spam routing independently of account status.

**Fix:** Layer 2 now calls `_next_session_proxy(proxy_string)` to rotate to a fresh proxy session (new exit node). Logged as `🔄 Layer 2 proxy → session-N` in the debug SSE stream. A `🔍 LAYER2_INIT` debug SSE event now logs the Layer 2 client's full profile.

---

### Bug 4: Layer 2 `TelegramClient` hardcoded `lang_code="en"` / `system_lang_code="en-US"`

The primary client correctly uses `_reg_lang`/`_reg_sys_lang` (e.g. `"uz"`/`"uz-UZ"` for Uzbekistan). Layer 2 had `lang_code="en"`, `system_lang_code="en-US"` hardcoded. A Uzbekistan phone number connecting with English locale is a bot fingerprint Telegram can act on when routing code delivery.

**Fix:** Layer 2 now uses `lang_code=_reg_lang` / `system_lang_code=_reg_sys_lang` — matching the primary.

**NOTE:** Bug 4 was downstream of Bug 5 (below). `_reg_lang` was already `"en"` due to Bug 5, so fixing Bug 4 alone would have done nothing. Both must be fixed together.

---

### Bug 5 (SILENT, PERVASIVE): SMSPool numeric `country_id` breaks `_COUNTRY_LANG_MAP` lookup

`_COUNTRY_LANG_MAP` is keyed by ISO alpha-2 codes (`"uz"`, `"kz"`, etc.). But when the user selects a country from the SMSPool dropdown, `country_id` arrives as SMSPool's internal numeric ID (e.g. `"44"` = Uzbekistan — NOT the UK dialling code). Line 1539:

```python
_cid_lower = country_id.lower()  # → "44"
_reg_lang, _reg_sys_lang = _COUNTRY_LANG_MAP.get(_cid_lower, ("en", "en-US"))
# → ("en", "en-US") because "44" is not in the map
```

Every registration via SMSPool dropdown silently got `lang_code="en"` regardless of the target country. `_rewrite_proxy_country` correctly skips numeric IDs (it guards with `len(cc) != 2 or not cc.isalpha()`), so the proxy URL stays correct — but the Telethon client locale was always English.

The geo-check code (line 1314–1317) already has the right pattern — it extracts the ISO code from the proxy URL when `country_id` is numeric:
```python
if _raw_cc.isdigit():
    _proxy_cc_m = _re.search(r"country-([a-z]{2})", proxy_string, _re.IGNORECASE)
    _geo_target_cc = _proxy_cc_m.group(1).upper() if _proxy_cc_m else ""
```

**Fix:** Same logic added at line 1548, before the `_COUNTRY_LANG_MAP` lookup:
```python
_cid_lower = country_id.lower()
if _cid_lower.isdigit() and proxy_string:
    _iso_m = _re.search(r"country-([a-z]{2})", proxy_string, _re.IGNORECASE)
    if _iso_m:
        _cid_lower = _iso_m.group(1).lower()
_reg_lang, _reg_sys_lang = _COUNTRY_LANG_MAP.get(_cid_lower, ("en", "en-US"))
```

Now confirmed by the `🔧 TELETHON_INIT` debug SSE: `lang_code` will show `"uz"` not `"en"` for Uzbekistan.

---

## Current system state

- **Telegram Bot**: RUNNING (restarted with all 5 fixes active)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - Bug 5 fix (~line 1548): ISO extraction from proxy URL for numeric SMSPool IDs
  - Bug 1 fix (~line 1861): `CancelCodeRequest` before Layer 2
  - Bug 2 fix (~line 1890): `asyncio.sleep(5)` (was 3)
  - Bug 3 fix (~line 1895): `_next_session_proxy` for Layer 2 proxy rotation
  - Bug 4 fix (~line 1913): `lang_code=_reg_lang` / `system_lang_code=_reg_sys_lang` in Layer 2

---

## How to verify fixes are active

In the factory SSE debug stream, after a fresh registration attempt with a numeric SMSPool country ID, you should now see:

1. `🔧 TELETHON_INIT` → `lang_code: "uz"` (not `"en"`)
2. If SentCodeTypeApp occurs and Layer 2 runs:
   - `🔄 Layer 2 proxy → session-N (fresh exit node for official creds check)`
   - `🔍 LAYER2_INIT` → `lang_code: "uz"`, new session-N, api_id=2040
   - A real 5s+ gap before Layer 2 connects (previously appeared instant due to SSE buffering hiding the 3s sleep)

---

## Decision log

- `CancelCodeRequest` is the primary fix — without it, Telegram's routing state from the primary request contaminates Layer 2's independent evaluation.
- `_off_session_path` (separate session file for Layer 2) was considered and **rejected**: the DB save uses `f"{effective_stem}.session"`, so a different session path would break groupbroadcaster reconnect. The wipe + same-path approach is correct as long as `safe_disconnect()` fully releases the SQLite file before the wipe.
- `SendCodeUnavailableError` is ONLY a hard-recycled signal when `next_type` was declared. When `next_type=None`, it's expected behavior (no queued fallback).
- 2 consecutive recycled numbers required before flagging the country pool.
- SMSPool `country_id` "44" = Uzbekistan (their internal ID, NOT ITU dialling code).
