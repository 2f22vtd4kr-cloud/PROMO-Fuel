# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Fix 1 — WKWebView SSE buffering (iOS Telegram Mini App)
Padded every SSE chunk to ≥ 4096 bytes via `_sse()` + `_KEEPALIVE_SSE` in `account_factory.py`.

### Fix 2 — Proxy country geo-mismatch causing SentCodeTypeApp
`_rewrite_proxy_country(proxy_string, country_id)` rewrites `country-XX` in proxy
username to match the target registration country. Called after `_next_session_proxy()`
in `_registration_stream()`. Debug SSE event confirms the rewrite.

### Fix 3 — False-positive recycled pool from next_type=None
When `sendCode` returns `SentCodeTypeApp` with `next_type=None`, skip `ResendCode`
(which always returns `SendCodeUnavailable` in this case) and jump directly to Layer 2
(official creds check). `_raw_next_type` stored from both send paths.

### Feature — Proxy Geo Verify card (UI + backend)
`_proxy_geo_check(exit_ip, target_cc)` added to `account_factory.py`:
- Queries `ip-api.com` (direct, no proxy needed) with the confirmed residential exit IP
- Returns detected_cc, country name, ISP/org, match bool, latency_ms
- Emits `geo_check` SSE event: status=running → ok / mismatch / error

`GeoCheckCard` component added to `AccountFactory.tsx`:
- **Running**: three concentric radar-ping rings animating outward from a glowing center dot (amber)
- **OK (match)**: green glow, detected flag = target flag with "✓", ISP name, latency badge
- **Mismatch**: orange glow, detected flag ≠ target flag with "✗", warns operator but doesn't block
- **Error**: red glow, shows error message
- Exit IP shown in monospace chip on the right
- Country flags built from ISO code via regional-indicator Unicode offset trick
- `geo-ping` keyframe added to `src/main.tsx`
- State: `geoCheck` (reset on batch_reset / auto_switching / new run)
- Rendered between the preflight banner and the batch progress banner

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083, all fixes live)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_rewrite_proxy_country()` (~line 856)
  - `_proxy_geo_check()` (~line 1055) ← NEW
  - `_raw_next_type` init + capture (~line 1533, 1549, 1572)
  - Skip-ResendCode when `_raw_next_type is None` (~line 1659–1665)
  - Geo check call in `_registration_stream` after asyncio gate (~line 1295–1339)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `ccToFlag()` helper (~line 205)
  - `GeoCheckCard` component (~line 215–355)
  - `geoCheck` state (~line 1144)
  - `geo_check` SSE handler + batch_reset/auto_switching resets
  - Render: after preflight banner, before batch progress banner
- `artifacts/telegram-miniapp/src/main.tsx` line 45: `@keyframes geo-ping`

---

## Pending / watch items

- If mismatch shows up: the proxy provider doesn't have residential nodes for the
  target country. The operator should switch to a proxy pool that covers it or use
  a neighboring country accepted by the carrier.
- `assets/pending_avatars/` empty on fresh import — user must upload photos before
  AI mode can assign avatars.
