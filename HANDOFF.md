# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built / fixed this session

### Fix — SMS steps not getting through (three-part fix)

**User report**: SMS verification codes never arrive — Step 3 always returns `SentCodeTypeApp` or factory aborts too early.

**Root causes found and fixed**:

#### 1. L0 threshold revert (user clarification)
The previous session changed the L0 abort threshold from 3→5. The user confirmed that **threshold=3 is intentional** — it is set via the SNSS slider UI (`/api/factory/snss/config`). Reverted `_app_stuck_count < 5` back to `_app_stuck_count < 3` in the SNSS L0 block.

#### 2. Developer api_id never used for registration
`TELETHON_API_ID` (user's own developer key from my.telegram.org) was passed to `_registration_stream()` but immediately overridden by the `_reg_pool` (official api_ids 2040/2496). The `_reg_pool` was rotated through on each retry attempt, but only ever contained official Telegram credentials.

**Problem**: Official api_ids 2040 (Desktop) and 2496 (iOS) are shared across millions of users and are known to Telegram's anti-spam systems. They can be shadow-blocked for SMS delivery, causing `SentCodeTypeApp` even on fresh numbers.

**Fix** (`account_factory.py`, after `_reg_pool` shuffle):
- If `TELETHON_API_ID` is set and is NOT one of the official ids (2040/2496/6), prepend it to `_reg_pool` as a `("PC 64bit", "Windows 11", "5.9.5", "desktop")` entry.
- Developer keys from `my.telegram.org` are unique to the operator and have NOT been mass-flagged — they are the best first-try credential for SMS delivery.
- Official 2040/2496 follow as automatic fallbacks on subsequent retries.

#### 3. `SendCodeUnavailableError + next_type set` was an immediate hard stop
When `ResendCode` returned `SendCodeUnavailableError` AND the original `next_type` was set (not None), the old code immediately called `return` after ONE number — also adding the country to `_RECYCLED_COUNTRY_POOL` (process-global, blocks ALL future registrations for that country in this process).

**Fix**: Changed the `else` branch to set `_definitive_recycled = True` and fall through to the same 5-number threshold path as all other recycled detections. ONE number with this pattern no longer shuts down the factory or poisons the country pool.

---

## Workflow status
- **Telegram Bot**: RUNNING — Python FastAPI 8083, all three fixes live
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- `better-sqlite3` native binary: rebuilt for Node 20 (v115 ABI) — stable

## Architecture reminders
- `_reg_pool` rotation: `_num_attempt % len(_reg_pool)` — pool is shuffled at session start, developer api_id is prepended before shuffle so it gets index 0 on attempt 0
- `_app_stuck_count`: unified bad-number counter shared across L0/L2/Step3 paths
- L0 threshold controlled by SNSS slider UI (`_SNSS_MIN_COUNT`), NOT hardcoded — currently 3
- L2 (Layer 2 official creds) threshold: 5 (separate from L0 which is user-configured)
- `_RECYCLED_COUNTRY_POOL`: process-global set; only add after N consecutive failures (≥5), NOT after one number
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083

## Key files
| File | Role |
|------|------|
| `account_factory.py` ~line 1753 | Developer api_id prepended to `_reg_pool` |
| `account_factory.py` ~line 1842 | L0 threshold reverted to `< 3` |
| `account_factory.py` ~line 2249 | `SendCodeUnavailable+next_type set` → `_definitive_recycled=True` instead of `return` |

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves in ~30s.
- `artifacts/api-server: API Server` artifact workflow — not the main API; safe to ignore if it fails.
