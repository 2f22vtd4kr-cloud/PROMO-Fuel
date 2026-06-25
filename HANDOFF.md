# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built / fixed this session

### Fix 1 — SNSS: Pre-banned numbers now feed prefix blacklist

**Root cause**: `PhoneNumberBannedError` (pre-banned) path never called `_record_recycled_prefix`, so L0 stayed empty and every attempt burned a full Telethon connect.

**Fix** (`account_factory.py`, pre-banned handler ~line 2123):
- `_app_stuck_count += 1` — feeds L0 abort threshold (`< 3`)
- `_record_recycled_prefix(phone, country_id, _pricing_option)` — feeds SNSS blacklist
- `_recycled_phones_this_session.append(phone)` — feeds Gemini AI analysis
- Pricing pool rotation: `_app_stuck_count==2` → `"0"` (mixed), `_app_stuck_count==3` → `"2"` (premium)
- `_RECYCLED_COUNTRY_POOL.add(country_id.lower())` on `_banned_count >= 3`

**New flow with `_SNSS_MIN_COUNT=1`** (already in code since previous session):
- Attempt 1: Telethon → pre-banned → records prefix (count→1), stuck=1 → continue
- Attempt 2: **L0 fires** (count ≥ 1) → instant cancel, no Telethon, pool rotates to "0" → continue
- Attempt 3: **L0 fires** → stuck=3 ≥ 3 → `sms_retry_prompt`

---

### Fix 2 — Avatar pool: broken preview + duplicates

**Root cause (broken image)**: Uploaded images were stored as 170-byte truncated JPEGs — just the JFIF header, no pixel data. Upload had no minimum-size validation.

**Root cause (duplicates)**: Filename was `{timestamp}_{i}{ext}` — same file uploaded in two sessions gets two different timestamps → two DB rows. `INSERT OR IGNORE` deduplicates by filename, not content.

**Fixes**:

*Python `upload_avatars` endpoint (~line 3487 `account_factory.py`)*:
1. **Minimum size guard**: reject files `< 2000 bytes` — logs a warning, skips the file, returns `skipped_too_small` count in response
2. **Content-hash dedup**: `safe_name = sha256(content)[:20] + ext` — same bytes → same filename → `INSERT OR IGNORE` skips silently. No cross-session duplicates ever.

*Frontend `AccountFactory.tsx` (AI mode avatar pool)*:
1. Added `stagingFiles: File[]` + `stagingPreviews: string[]` states
2. File input now populates staging (generates data-URL previews via FileReader) instead of immediately uploading
3. Staging area shows thumbnails + "✓ Зберегти" + "Очистити" buttons
4. If preview looks broken/wrong, user can clear before committing to server

*DB cleanup*: Deleted 2 existing broken 170-byte entries from `avatar_pool` table.

---

## Workflow status
- **Telegram Bot**: RUNNING — Python FastAPI 8083, both fixes live
- **API Server** (port 8080): RUNNING
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR, staging preview UI active

## Architecture reminders
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `_SNSS_MIN_COUNT = 1` — in-memory, resets on Python restart, adjustable via `/api/factory/snss/config`
- `_app_stuck_count` now unified: counts pre-banned + recycled + L0 hits (all "bad number" types)
- Avatar pool is DB-only (`avatar_pool` table in campaigns.db) — no filesystem files, `_ensure_avatar_pool_table()` migrates any legacy filesystem files on first call

## Key files
| File | Role |
|------|------|
| `account_factory.py` | Pre-banned SNSS fix (~line 2123); avatar upload dedup+validation (~line 3487) |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Staging preview UI (states ~line 1090, upload section ~line 4108) |
| `artifacts/api-server/src/routes/factory.ts` | Node.js proxies for avatar-image/list/delete/upload |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS management UI |
| `artifacts/telegram-miniapp/src/components/SessionHealthPanel.tsx` | Session health dashboard |

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves.
- `artifacts/api-server: API Server` artifact workflow FAILED — real API is the `API Server` bash-workflow. Safe to ignore.
