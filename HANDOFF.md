# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix 1 — ResendCode always attempted regardless of next_type=None

When Telegram returned `SentCodeTypeApp` with `next_type=None`, factory was skipping ResendCode entirely. Fixed by removing the `if _raw_next_type is None: skip` branch — ResendCode now always runs.

`account_factory.py` ~line 1772: `if True:` replaces old `if _raw_next_type is not None:` guard.

### Fix 2 — Don't declare pool recycled after just 1 number

First recycled confirm (from Layer 2 all-creds check) now does `cancel + continue` (retries with fresh number). Only after 2 consecutive recycled numbers does it flag `_RECYCLED_COUNTRY_POOL` and stop.

`account_factory.py` ~line 1944–1957: `_app_stuck_count < 2` → `continue`, else → `return`.

### Fix 3 — Minimize button stays on pipeline page (not factory menu)

When `sms_retry_prompt` arrived, frontend set `runState("idle")` which hid the 8-step pipeline. Pressing `—` (minimize) then showed the factory form.

Fix: changed `setRunState("idle")` → `setRunState("error")` in the `sms_retry_prompt` SSE handler (`AccountFactory.tsx` ~line 1957). Now `—` minimizes popup → pipeline stays visible with all step states/errors.

### Fix 4 — SendCodeUnavailableError on ResendCode with next_type=None treated as hard recycled

**Root bug**: Fix 1 made ResendCode always run, but the `SendCodeUnavailableError` handler treated it as a definitive recycled signal regardless of `_raw_next_type`. When `next_type=None`, Telegram never declared a fallback delivery method — `SendCodeUnavailable` from ResendCode just means "nothing queued," NOT that the number is recycled.

The log showing the bug:
```
SentCodeTypeApp (next_type=None) — requesting SMS resend…
SendCodeUnavailable — number confirmed recycled   ← 0.285s later, WRONG
```

**Fix**: Split the `SendCodeUnavailableError` handler on `_raw_next_type`:
- `next_type=None` → fall through to Layer 2 (official creds check); expected, not a recycled signal
- `next_type set` → hard recycled signal; all delivery methods declared but exhausted → pool flag + stop

`account_factory.py` lines 1807–1834.

**Correct end-to-end flow now** (for `next_type=None` path):
1. `SentCodeTypeApp` + `next_type=None` → ResendCode → `SendCodeUnavailable` → fall through
2. Layer 2: official creds (2040 Desktop, 2496 iOS) each do fresh `RawSendCodeRequest`
3. Both return `SentCodeTypeApp` → `_app_stuck_count = 1` → `continue` (new number)
4. Number 2: same → `_app_stuck_count = 2` → flag pool → `sms_retry_prompt` to user

---

## Current system state

- **Telegram Bot**: RUNNING (restarted after Fix 4)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - ResendCode block (~line 1772) — `if True:` always tries ResendCode
  - `SendCodeUnavailableError` handler (~line 1807) — split on `_raw_next_type is None`
  - Layer 2 official creds exhaustion (~line 1944) — `_app_stuck_count < 2` → continue, else → return + flag pool
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `sms_retry_prompt` SSE handler (~line 1957) — `setRunState("error")` keeps pipeline visible

---

## SMSPool country_id facts

- SMSPool's `country_id` is their OWN internal sequential integer — NOT an ITU dialing code.
- "44" = Uzbekistan in SMSPool's system.
- Always extract ISO target from proxy URL (`country-XX`) when doing ISO-comparison with a numeric country_id.

---

## Decision log

- `SendCodeUnavailableError` is ONLY a hard-recycled signal when `next_type` was declared (i.e. Telegram said "fallback exists" but then refused to use it). When `next_type=None`, it's expected behavior.
- 2 consecutive recycled numbers required before flagging the country pool — single bad number shouldn't block the whole pool.
