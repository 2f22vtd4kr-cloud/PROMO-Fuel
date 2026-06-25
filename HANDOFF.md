# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Full account factory bug hunt — all known bugs fixed

Root complaint: Account Factory flags every UZ (Uzbekistan) number from SMSPool (country_id="44") as recycled. User has tried 100+ times with no successful registration.

**Total bugs found and fixed this session: 8**

---

### Bug 1: `CancelCodeRequest` imported but never called

After the primary client's `RawSendCodeRequest` returns `SentCodeTypeApp` → `ResendCode` → `SendCodeUnavailableError`, Telegram's server kept an active code session warm for that phone. Layer 2's fresh `RawSendCodeRequest` then received a contaminated routing decision.

**Fix:** Added `CancelCodeRequest(phone_number, phone_code_hash)` (best-effort) on the primary `client` immediately before entering the Layer 2 loop.

---

### Bug 2: 3-second sleep too short after CancelCodeRequest

After adding `CancelCodeRequest`, Telegram's server needs time to settle before Layer 2's request arrives. 3s was also too short to let Decodo's proxy tunnel close cleanly.

**Fix:** Bumped `asyncio.sleep(3)` → `asyncio.sleep(5)`.

---

### Bug 3: Layer 2 reused same proxy session as primary (same exit IP)

Layer 2's `TelegramClient` was created with the same `proxy_tuple` as primary — same Decodo session ID, same exit node. Two consecutive `auth.sendCode` requests for the same phone from the same IP looks like automation.

**Fix:** Layer 2 now calls `_next_session_proxy(proxy_string)` to rotate to a fresh session. Logged as `🔄 Layer 2 proxy → session-N`.

---

### Bug 4: Layer 2 `lang_code` hardcoded to `"en"`/`"en-US"`

Primary correctly uses `_reg_lang`/`_reg_sys_lang` (e.g. `"uz"`/`"uz-UZ"` for Uzbekistan). Layer 2 had hardcoded English locale — a bot fingerprint.

**Fix:** Layer 2 now uses `lang_code=_reg_lang` / `system_lang_code=_reg_sys_lang`.

---

### Bug 5 (pervasive): SMSPool numeric `country_id` breaks `_COUNTRY_LANG_MAP` lookup

`_COUNTRY_LANG_MAP` is keyed by ISO codes (`"uz"`, etc.) but SMSPool's dropdown sends their internal numeric ID (`"44"` = Uzbekistan). `_COUNTRY_LANG_MAP.get("44")` → falls through to `("en", "en-US")`. Every single SMSPool registration used `lang_code="en"` regardless of target country.

**Fix (line 1548-1553):** When `country_id` is numeric, extract the ISO code from the proxy URL's `country-XX` selector (already validated by geo-check):
```python
_cid_lower = country_id.lower()
if _cid_lower.isdigit() and proxy_string:
    _iso_m = _re.search(r"country-([a-z]{2})", proxy_string, _re.IGNORECASE)
    if _iso_m:
        _cid_lower = _iso_m.group(1).lower()
_reg_lang, _reg_sys_lang = _COUNTRY_LANG_MAP.get(_cid_lower, ("en", "en-US"))
```

Confirmed working: `TELETHON_INIT` SSE now shows `lang_code: "uz"`.

---

### Bug 6: No human-like delay in Layer 2 before `RawSendCodeRequest`

The primary client has `asyncio.sleep(random.uniform(1.2, 4.1))` before sending `auth.sendCode`. Layer 2 sent the request immediately after `connect()` — a bot fingerprint even with official api_ids.

**Fix:** Added `await asyncio.sleep(random.uniform(1.2, 3.0))` inside Layer 2's `_off_try` loop after `await client.connect()`.

---

### Bug 7: `MAX_NUM_RETRIES = 5` — too few to find a fresh number in a high-recycled pool

With a 90% recycled pool, only 5 retries gives ~59% probability of finding at least one fresh number. Not nearly enough.

**Fix:** Raised `MAX_NUM_RETRIES` from `5` to `20`. At 90% recycled: 87% chance of finding ≥1 fresh. At 95% recycled: 64% chance.

---

### Bug 8: `_app_stuck_count < 2` halt threshold — quits after 2 recycled numbers

After only 2 consecutive recycled numbers, the factory halts and declares "switch country." This is far too aggressive for a pool that's 80-90% recycled but not 100%.

**Fix:** Raised halt threshold from `< 2` to `< 5`. Now retries up to 4 recycled numbers before halting on the 5th consecutive. Message updated to show `(#N/5)` progress.

---

### New diagnostic: Layer 2 exit IP check

**Problem identified:** Decodo's UZ residential pool may have only one or very few physical nodes. When all session numbers resolve to the same exit IP (213.230.114.16 was observed), session rotation is cosmetic — Telegram sees every request from the same IP. If that IP is flagged for automation, ALL numbers get `SentCodeTypeApp` regardless of pool quality.

**Fix:** Layer 2 now calls `_get_asyncio_exit_ip(_off_proxy_string)` and compares it with `_primary_exit_ip`. If they match, emits a clear `⚠️` debug SSE:
> "Decodo has only 1 UZ residential node; session rotation is ineffective. If ALL numbers fail, the issue may be this IP flagged by Telegram, not the numbers being recycled. Try a different proxy provider."

If different, emits `✅ Layer 2 exit IP: X.X.X.X (different from primary) — independent verdict`.

When the halt threshold is reached and same-IP was detected, the halt message appends the IP-flagging hint.

---

## Current system state

- **Telegram Bot**: RUNNING (restarted with all 8 fixes active)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current, synced to PG

---

## Key changes in `account_factory.py`

| Line range | Change |
|---|---|
| ~1314 | `_primary_exit_ip = async_ip or exit_ip` stored before retry loop |
| ~1442 | `MAX_NUM_RETRIES = 20` (was 5) |
| ~1548 | ISO extraction from proxy URL for numeric SMSPool `country_id` |
| ~1869 | `CancelCodeRequest` before Layer 2 |
| ~1894 | `_l2_same_ip = False` initialized before Layer 2 for loop |
| ~1900 | `asyncio.sleep(5)` (was 3) before Layer 2 |
| ~1907-1935 | `_next_session_proxy` for Layer 2, then `_get_asyncio_exit_ip` comparison |
| ~1979 | `asyncio.sleep(random.uniform(1.2, 3.0))` human delay in Layer 2 |
| ~1913 | `lang_code=_reg_lang` / `system_lang_code=_reg_sys_lang` in Layer 2 |
| ~2049 | `if _app_stuck_count < 5:` (was < 2) |
| ~2067 | Halt message includes IP-flag hint when `_l2_same_ip=True` |

---

## How to verify

In the factory SSE debug stream, you should now see:
1. `🔧 TELETHON_INIT` → `lang_code: "uz"` (not `"en"`) ✅
2. `🔄 Layer 2 proxy → session-N` (fresh exit node) ✅
3. `🔍 LAYER2_INIT` → `lang_code: "uz"`, new session-N ✅
4. One of:
   - `⚠️ Layer 2 exit IP = primary exit IP (X.X.X.X)` → proxy rotation ineffective (IP-flagging likely cause)
   - `✅ Layer 2 exit IP: Y.Y.Y.Y (different from primary X.X.X.X) — independent verdict`
5. If recycled: `🚫 Recycled number (#N/5)` counter up to 4, then halt at 5th

---

## Decision log

- If **same exit IP** is logged for Layer 2: the root cause is the proxy provider having limited UZ residential nodes. Our Layer 2 verdict ("recycled") is unreliable because BOTH requests came from the same flagged IP. User should switch proxy provider for UZ before concluding the numbers are recycled.
- If **different exit IPs** AND every number still gets `SentCodeTypeApp`: numbers are genuinely recycled. SMSPool's UZ pool has a very high recycled rate.
- `_off_session_path` (separate session file for Layer 2) was considered and rejected — DB save uses `effective_stem`, different path breaks groupbroadcaster reconnect.
- `CancelCodeRequest` is the primary fix — without it, Telegram's routing state from the primary request contaminates Layer 2's independent evaluation.
