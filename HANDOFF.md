# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built / fixed this session

### Fix — SNSS-L0 abort threshold too tight (premature sms_retry_prompt)

**Root cause**: `_app_stuck_count` is a unified counter shared across all "bad number" detection layers (pre-ban, L0 prefix skip, L1 contact hit, Step 3 SentCodeTypeApp recycled). The L0 path used `< 3` as its abort threshold while Step 3 used `< 5`. A single pre-banned number (stuck=1) + one Step 3 recycled (stuck=2) + one L0 prefix hit (stuck=3) was enough to fire `sms_retry_prompt` after only 3 attempts — stopping the factory far too early and wasting the remaining 17-number budget.

**Observed sequence** from debug log:
1. +998994430713 → `PhoneNumberBannedError` → stuck=1, prefix recorded in SNSS
2. +998776629240 → `SentCodeTypeApp + SendCodeUnavailable + next_type=None` → stuck=2
3. +998994433847 → **L0 fires** on prefix from attempt 1 → stuck=3 → `_app_stuck_count < 3` is False → `sms_retry_prompt` + return ← **premature**

**Fix** (`account_factory.py`, L0 SNSS block ~line 1832):
- `_app_stuck_count == 3 → pricing_option "2"` changed to `_app_stuck_count == 4` (matches Step 3 rotation schedule)
- `_app_stuck_count < 3` changed to `_app_stuck_count < 5` (consistent with Step 3 threshold)
- Progress display updated: `#N/3` → `#N/5`

**Why L0 should be more lenient**: L0 costs ~0s (no Telethon startup, no SMS purchase — just a memory check). Step 3 costs ~25s + $1.46 per attempt. There's no reason to abort sooner at the cheaper detection layer.

---

## Workflow status
- **Telegram Bot**: RUNNING — Python FastAPI 8083, fix live
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- `better-sqlite3` native binary: rebuilt for Node 20 (v115 ABI) — was stale at v137 ABI from a different Node build

## Architecture reminders
- `_app_stuck_count`: unified bad-number counter; abort thresholds must match across all layers (L0/L1/Step3 all now use `< 5`)
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `_SNSS_MIN_COUNT = 1` — in-memory, resets on Python restart, adjustable via `/api/factory/snss/config`
- Avatar pool: DB-only (`avatar_pool` table), no filesystem files

## Key files
| File | Role |
|------|------|
| `account_factory.py` ~line 1827 | L0 abort threshold fix (pool rotation + `< 5` guard) |

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves in ~30s.
- `artifacts/api-server: API Server` artifact workflow — not the main API; safe to ignore if it fails.
