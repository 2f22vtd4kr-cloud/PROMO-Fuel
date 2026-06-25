# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix 1 — WKWebView SSE buffering (iOS Telegram Mini App)
Padded every SSE chunk to ≥ 4096 bytes via a prepended comment so WKWebView flushes immediately.
- `_WKWEBVIEW_MIN_BYTES = 4096` constant
- `_sse()` prepends `": <spaces>\n"` padding
- `_KEEPALIVE_SSE` pre-built padded keepalive
- Both `yield _KEEPALIVE_SSE` calls in `generate()`

### Fix 2 — Proxy country geo-mismatch causing SentCodeTypeApp on every number
Root cause: Decodo proxy username contains `country-uz` (hardcoded to Uzbekistan).
Buying a Ukrainian/Philippine/Georgian number through a Uzbekistan exit IP causes
Telegram to return `SentCodeTypeApp` for every number — even fresh ones — because
the exit IP country doesn't match the carrier's country.

**Fix: `_rewrite_proxy_country(proxy_string, country_id)`** — replaces `country-XX`
in the proxy username with the target country_id. Called immediately after
`_next_session_proxy()` in `_registration_stream()`. A debug SSE event shows
when rewriting happens.

### Fix 3 — False-positive recycled pool from next_type=None
When `sendCode` returns `SentCodeTypeApp` with `next_type=None`, calling `ResendCode`
always returns `SendCodeUnavailable` (no fallback method). Old code caught this and
incorrectly flagged the entire country pool as recycled.

**Fix:**
- `_raw_next_type` stored from both sendCode paths (raw + fallback)
- When `_raw_next_type is None` → skip `ResendCode` entirely, jump to Layer 2
  (official creds check) which does a fresh `sendCode` unaffected by null next_type

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083, with all 3 fixes)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_WKWEBVIEW_MIN_BYTES` / `_sse()` / `_KEEPALIVE_SSE` (~line 501–527)
  - `_next_session_proxy()` (~line 838)
  - `_rewrite_proxy_country()` (~line 856) ← NEW
  - Proxy rewrite call in `_registration_stream` (~line 1131–1142)
  - `_raw_next_type` init + capture (~line 1533, 1549, 1572)
  - Skip-ResendCode when `_raw_next_type is None` (~line 1659–1665)

---

## Pending / watch items

- After applying geo-rewrite fix, user should retry with any country — debug log will
  show "🌍 Proxy country rewritten → country-XX" confirming the fix is active
- If still getting SentCodeTypeApp after proxy country matches: check if the proxy
  provider supports the target country (some residential providers don't cover all CCs)
- Official creds (2040/2496) are still used in the registration pool — if Telegram
  flags these specific hashes for the target region, user may need to add their own
  api_id/api_hash from my.telegram.org as additional pool entries
- `assets/pending_avatars/` empty on fresh import — user must upload photos before
  AI mode can assign avatars
