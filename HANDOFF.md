# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. SNSS-AI automatic pool-switching — IMPLEMENTED

**Problem diagnosed from factory logs:** SMSPool Vietnam Pool 1 was 100% recycled. The SNSS-AI was correctly firing `switch_pool=True` at 95–100% confidence from attempt #2 onward, but the factory was ignoring the signal and burning the full 20-number budget on the same dead pool.

**Fix in `account_factory.py`:**
- Added `_pool_rotations = 0` counter (max 2 rotations per session)
- After the SNSS-AI logs its result, if `switch_pool=True` and `confidence ≥ 90` and `_pool_rotations < 2`, the factory now **immediately rotates `_pricing_option`** to the next pool
- Rotation order: **1 (standard) → 0 (cheapest/mixed) → 2 (premium)**
- Emits a `step` SSE event: `🔀 SNSS-AI pool-switch → Pool 0 (confidence 95% — Pool 0 draws from a different carrier batch)`
- Removed two stale "Always keep pricing_option=1 — rotation removed." comments

**Effect on the logged run:** Would have switched to Pool 0 at attempt #3 (after the 2nd recycled number triggered the AI at 95%), saving ~17 wasted number purchases and ~$6.46 in SMSPool costs.

---

## Current system state

| Workflow | Port | Status |
|---|---|---|
| Telegram Bot (Python supervisor) | 8083 | ✅ Running |
| Telegram Mini App (Vite) | 5000 | ✅ Running |
| Node.js API Server | 8080 | ✅ Running |
| CRM Platform | 23873 | ✅ Running |
| Mockup Sandbox | 8081 | ✅ Running |

TypeScript typecheck: zero errors (known pre-existing corrupted JSX in mockup-sandbox canvas files — do not touch).

---

## DB schema (`data/campaigns.db`)

All 14 migration steps applied. No schema changes this session.

---

## Known notes

- `_banned_count >= 3` abort intentionally left hardcoded (3 consecutive pre-bans = carrier pool signal, not budget issue).
- SNSS-AI pool rotation caps at 2 rotations per session (1→0→2). If Pool 2 is also dead the factory exhausts its budget and shows the switch-country prompt as before.
- Pool rotation only triggers via SNSS-AI (`confidence ≥ 90`). Pre-ban path does not trigger rotation (pre-bans already abort at 3 consecutive hits).
- `DB_PATH = ./data/campaigns.db` (workspace-root-relative); Node.js resolves via `../../` fallback in `db-path.ts`.

## Slide counts (unchanged)

| Manual | Slides |
|---|---|
| Manual.tsx | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |
