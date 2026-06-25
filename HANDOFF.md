# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### WKWebView SSE buffering fix (Account Factory — iOS Telegram Mini App)

**Root cause:** WKWebView (used by Telegram iOS Mini App) buffers incoming network
data internally and only delivers chunks to JavaScript once the buffer reaches
~4 KB.  Every factory SSE event was 50–150 bytes, so they sat in the WKWebView
buffer for up to minutes — all 8 steps appeared frozen/waiting even though Python
was emitting events normally (confirmed working in dev via direct curl test).

**Fix applied in `account_factory.py`:**

1. Added `_WKWEBVIEW_MIN_BYTES = 4096` constant.
2. Rewrote `_sse()` to prepend a padded SSE comment (`: <spaces>\n`) so that every
   chunk totals ≥ 4096 bytes. SSE comments are stripped by the browser's EventSource
   parser and are invisible to the frontend.
3. Added `_KEEPALIVE_SSE` pre-built constant — padded keepalive comment string
   (": keepalive" + spaces to 4096 bytes + "\n\n").
4. Replaced both bare `": keepalive\n\n"` yields in `generate()` with `_KEEPALIVE_SSE`.

All previous fixes from the prior session remain intact:
- `generate()` + `_generate_inner()` split (UnboundLocalError fix)
- Exception-to-SSE-error wrapping
- Express proxy manual `res.write` + `uncork()` for chunk-by-chunk flushing

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080, existing dist)
- **Telegram Mini App**: RUNNING on port 5000 (existing dist)
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py`:
  - `_WKWEBVIEW_MIN_BYTES` constant (~line 501)
  - `_sse()` function with WKWebView padding (~line 503)
  - `_KEEPALIVE_SSE` pre-built padded keepalive (~line 525)
  - `generate()` with two `yield _KEEPALIVE_SSE` calls (~line 2458, 2483)
  - `_generate_inner()` — main registration stream generator (~line 2490)
- `artifacts/api-server/src/app.ts` — SSE proxy manual write+uncork
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`:
  - `RegHistoryEntry` interface (~line 62)
  - `RegHistoryPanel` component (~line 205)
  - Step timing badges, session summary strip, history log

---

## Pending / watch items

- Factory not end-to-end tested on iOS after this fix (requires real SMSPOOL_API_KEY + proxy + 2FA password in prod)
- `assets/pending_avatars/` empty on fresh import — user must upload photos before AI mode can assign avatars
- `[pg-guard] saved_proxies is empty` in API Server logs is expected until proxies are added
- Artifact sub-workflows (crm-platform, mockup-sandbox) fail on port conflicts — not blocking for main app
