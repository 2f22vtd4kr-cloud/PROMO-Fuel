# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. SNSS-AI automatic pool-switching — IMPLEMENTED

**Problem:** SMSPool VN Pool 1 was 100% recycled. SNSS-AI was firing `switch_pool=True` at 95% confidence from attempt #2 but was being ignored.

**Fix in `account_factory.py`:**
- Added `_pool_rotations = 0` counter (max 2 per session)
- After SNSS-AI logs `switch_pool=True` + `confidence ≥ 90`, factory immediately rotates `_pricing_option`
- Rotation order: **1 → 0 → 2**
- Emits: `🔀 SNSS-AI pool-switch → Pool X (confidence Y% — ...)` SSE

### 2. "Connection dropped" fixes — IMPLEMENTED

**Root cause diagnosed from logs (sessions 14, 19, 20, 22):**

The error "Cannot send requests while disconnected" was caused by Decodo residential SOCKS5 tunnels silently closing during the 1.2–4.1s human-like delay inserted between `connect()` and `send_code_request()`. When the tunnel dropped, Telethon's `connection_retries=5 × retry_delay=2` silently spun for up to 10s before surfacing the error. The code then cancelled the purchased number ($0.38 each) even though the number itself was valid.

**Three-layer fix:**

**Layer 1 — Fail fast (`connection_retries=1, retry_delay=1`):**
- Changed from `connection_retries=5, retry_delay=2` → `connection_retries=1, retry_delay=1`
- Telethon now surfaces the error in <2s instead of spinning silently for up to 10s
- Our explicit reconnect logic (below) handles recovery

**Layer 2 — Pre-flight MTProto liveness check:**
- Added `client.is_connected()` check immediately after the human-like delay, before the `RawSendCodeRequest` call
- If already disconnected: fast `client.connect()` with 8s timeout — recover without cancelling the number
- Only cancels and buys fresh if the reconnect itself fails

**Layer 3 — Reconnect on same number before cancelling:**
- In the `except Exception as e2` block (fallback send_code path), instead of immediately `cancel_order()`, attempt ONE reconnect + retry `RawSendCodeRequest` on the same purchased number
- Only cancels and advances the budget counter if the reconnect also fails
- Saves ~$0.38 and one budget slot per recovered drop

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

- Pool rotation caps at 2 rotations per session (1→0→2). After Pool 2, factory exhausts budget and shows switch-country prompt.
- `_banned_count >= 3` abort (3 consecutive pre-bans) is intentionally hardcoded — that's a carrier pool signal, not a proxy issue.
- `DB_PATH = ./data/campaigns.db` (workspace-root-relative); Node.js resolves via `../../` fallback in `db-path.ts`.
- Mockup-sandbox: PolishComplete.tsx, RefinedDepth.tsx, GroupsV2.tsx, WorkersV3.tsx have corrupted JSX — do not touch.

## Slide counts (unchanged)

| Manual | Slides |
|---|---|
| Manual.tsx | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |
