# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built / fixed this session

### 1. SMS delivery fixes (three-part)

**Problem**: Step 3 always returned `SentCodeTypeApp`; SMS codes never arrived.

**Fix A — L0 threshold revert**: Previous session changed L0 abort from 3→5. User confirmed threshold=3 is intentional (set via SNSS slider UI). Reverted.

**Fix B — Developer api_id now first in registration pool**: `TELETHON_API_ID` was passed to `_registration_stream()` but then immediately overridden by `_reg_pool` (only 2040/2496). Now: if `TELETHON_API_ID` is set and not one of the official IDs, it's prepended to `_reg_pool` as index 0 (Desktop profile). Developer keys are unique to the operator and not mass-flagged by Telegram. Official 2040/2496 follow as fallbacks.

**Fix C — `SendCodeUnavailable + next_type set` no longer hard-stops**: The `else` branch (next_type IS set + SendCodeUnavailableError) previously did immediate `return` after ONE number, poisoning `_RECYCLED_COUNTRY_POOL` process-wide. Changed to set `_definitive_recycled = True` and follow the same 5-number threshold path.

### 2. Credential Stats Dashboard

**What**: Minimal collapsible panel at the bottom of Account Factory, below SNSS. Shows per-api_id stats for the current process session.

**Three tracked events** (hooks in `_registration_stream`):
- `sms_ok`: incremented when Step 3 ends with SMS (api_id got code delivery) — just before step 3 "done" SSE
- `app`: incremented when Layer 2 else fires (Telegram confirmed recycled) — before `_app_stuck_count += 1`
- `timeout`: incremented at Step 4 SMS timeout — before `_sms_timeout_count += 1`

**Files changed**:
- `account_factory.py`: `_CRED_STATS` global dict, `_record_cred_stat()` helper, 3 hook points, 2 new routes (`GET /api/factory/cred-stats`, `POST /api/factory/cred-stats/reset`)
- `artifacts/telegram-miniapp/src/components/CredStatsPanel.tsx`: new component (collapsible, mini horizontal bar per metric, success% badge, Reset button)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`: import + render after SnssPanel

**Design**: Collapsed by default (just title + summary), expands to show per-api_id card with 3 mini bars (SMS OK green / Blocked red / Timeout amber) and a success% pill. Reset button clears in-memory stats. Resets on process restart.

---

## Workflow status
- **Telegram Bot**: RUNNING — Python FastAPI 8083, all fixes live
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- `better-sqlite3` native binary: rebuilt for Node 20 (v115 ABI) — stable

## Architecture reminders
- `_CRED_STATS` is in-memory only (intentional) — resets on restart, shows current-session picture
- `_reg_pool` rotation: `_num_attempt % len(_reg_pool)` — pool shuffled at session start, dev api_id prepended as index 0
- `_app_stuck_count`: unified bad-number counter (L0 threshold=user-configured via SNSS UI, L2 threshold=5)
- `_RECYCLED_COUNTRY_POOL`: process-global; only add after ≥5 consecutive failures (not after 1)
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083

## Key files
| File | Role |
|------|------|
| `account_factory.py` ~line 89 | `_CRED_STATS` global dict |
| `account_factory.py` ~line 572 | `_record_cred_stat()` helper |
| `account_factory.py` ~line 1753 | Dev api_id prepended to `_reg_pool` |
| `account_factory.py` ~line 1847 | L0 threshold `< 3` |
| `account_factory.py` ~line 2249 | `SendCodeUnavailable+next_type set` → `_definitive_recycled=True` |
| `account_factory.py` ~line 2572 | `sms_ok` hook |
| `account_factory.py` ~line 2470 | `app` hook |
| `account_factory.py` ~line 2721 | `timeout` hook |
| `account_factory.py` ~line 3748 | `GET/POST /api/factory/cred-stats` routes |
| `artifacts/telegram-miniapp/src/components/CredStatsPanel.tsx` | New panel component |

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves in ~30s.
- `artifacts/api-server: API Server` artifact workflow — not the main API; safe to ignore if it fails.
