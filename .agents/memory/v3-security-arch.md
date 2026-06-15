---
name: V3 security architecture
description: How auth is split between CRM (Bearer) and Mini App (TWA HMAC) routes in app.ts
---

# Security routing in app.ts

## Rules
- `POST /api/auth` — unprotected (registered BEFORE middleware), returns {ok:true} when API_SECRET not set (dev) or matches.
- `/api/twa/*` — TWA HMAC validated via `X-Telegram-Init-Data` header; validation **skipped in NODE_ENV=development** or when TELEGRAM_TOKEN not set.
- All other `/api/*` — Bearer token required when `API_SECRET` env var is set; open when unset (dev mode).

## CRM Platform login flow
- `sessionStorage.getItem("crm_secret")` → initial authed state.
- `apiFetch()` helper in App.tsx adds `Authorization: Bearer ${secret}` to every request.
- `LoginScreen` shown when no crm_secret; calls `POST /api/auth` to verify, then stores in sessionStorage.

## Mini App API client
- `artifacts/telegram-miniapp/src/lib/api.ts` calls `/api/twa/*` paths (not `/api/*`).
- `twaHeaders()` reads `window.Telegram?.WebApp?.initData` and passes as `X-Telegram-Init-Data`.

## New routes added
- `GET /api/analytics/summary` — alias for /analytics/overview (same handler function).
- `GET /api/audience` — paginated users (page, limit, search, tag params).
- `POST /api/upload/users` — batch import users JSON array.
- `GET|POST /api/twa/*` — mirrors all existing routes for TWA-authenticated mini app.

**Why:** CRM uses permanent session secret, Mini App validates cryptographically via Telegram's HMAC — different trust models for different clients.
