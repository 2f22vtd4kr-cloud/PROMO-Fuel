---
name: Bulk Account Importer
description: Architecture and implementation details for the ZIP-based bulk account import feature.
---

# Bulk Account Importer

## Implementation Status: COMPLETE

## Files
- `scripts/bulk_import_sessions.py` — Python processor: reads .session+.json pairs from ZIP, writes .session files to `sessions/` dir, upserts to sender_accounts with proxy assignment.
- `artifacts/api-server/src/routes/accounts.ts` — `POST /api/accounts/bulk-import` endpoint: multer disk upload → spawnSync python3 → JSON response.
- `artifacts/telegram-miniapp/src/lib/api.ts` — `api.bulkImportAccounts(file, proxies)` method.
- `artifacts/telegram-miniapp/src/pages/Accounts.tsx` — `BulkImportPanel` component + `showBulk` state + "📦 Bulk" button in header.

## Key Decisions
- Session binary files written to `sessions/{phone_digits}.session` on disk (Telethon needs actual files).
- `two_factor_pass` column added via ALTER TABLE IF NOT EXISTS in Python script.
- Proxies fed via stdin to Python script (avoids shell escaping issues with special characters).
- Proxy assignment: round-robin via `index % len(proxies)` — handles fewer proxies than accounts safely.
- Sanitization: only `socks5://` prefixed lines accepted; others silently discarded.
- Panel rendered as full-screen overlay (same pattern as AddAccountForm) — zIndex 200, background #07090f.

**Why:** spawnSync over adm-zip avoids adding a new npm dep; Python already has stdlib zipfile. The sessions/ dir stores real Telethon SQLite session files for immediate use by workers.
