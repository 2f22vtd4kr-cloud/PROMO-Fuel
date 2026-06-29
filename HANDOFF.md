# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. SNSS-AI automatic pool-switching

When SNSS-AI fires `switch_pool=True` at ≥90% confidence, the factory rotates `_pricing_option` immediately. Rotation: **1 → 0 → 2**, capped at 2 per session.

### 2. "Connection dropped" three-layer fix (Step 3)

When Telethon disconnects mid-send_code (MTProto tunnel drop):

- **Layer 2 — Pre-flight liveness check:** `client.is_connected()` after the human-delay. If false, fast reconnect (8s timeout) without cancelling the number.
- **Layer 3 — Reconnect on same number:** On `"Cannot send requests while disconnected"` exception, attempt one reconnect + retry `RawSendCodeRequest` on the same phone before cancelling the number.

Both layers instrument `_tunnel_drop_count` / `_tunnel_recover_count` session counters and emit `proxy_health` SSE on fatal drops. **Confirmed working (2/2 drops recovered in production log).**

### 3. Proxy dead-peer rotation at Step 2 connect (THIS SESSION)

**Root cause:** Decodo residential proxy pins `session-N` to one specific residential peer. When that peer goes offline, `client.connect()` raises `ProxyError: Host unreachable`. The old code retried the same dead peer 3× with 4s sleeps (up to 24s wasted, still fails).

**Fix (account_factory.py, connect retry loop):**
- On `"unreachable"` / `"refused"` / `"no route"` error, immediately call `_next_session_proxy()` to rotate to a fresh `session-(N+1)` (different residential peer)
- Recreate `TelegramClient` in-place with the new proxy tuple — the proxy is baked into the client at init time
- Sleep reduced from 4s → 2s (we're already switching peers, no need to wait)
- Message now says `"rotating proxy → session-N…"` instead of generic "retrying in 4s"
- Non-dead-peer errors (transient network, DNS, etc.) still use the 2s retry without rotating

**Expected log before fix:**
```
⚠️ Connect attempt 1/3 failed (ProxyError: Host unreachable) — retrying in 4s…
⚠️ Connect attempt 2/3 failed (ProxyError: Host unreachable) — retrying in 4s…
📡 Proxy tunnel established...       ← third attempt finally gets a living peer
```
Total: ~8-17s spinning on a dead peer before success.

**Expected log after fix:**
```
⚠️ Connect attempt 1/3 failed (dead peer) — rotating proxy → session-N…
📡 Proxy tunnel established...       ← immediately gets a fresh peer
```
Total: ~2s.

### 4. SMSPool balance_low event

When purchase fails with "Insufficient balance":
- Parses exact balance and price from error string (regex)
- Emits structured `balance_low` SSE `{balance, needed, top_up_url}`
- UI: amber "💰 Balance Too Low" banner + "Top Up (need $X.XX more)" button → smspool.net/pricing

---

## Log analysis from production run (12:06–12:11)

**Run 1 (sessions 1–5):** VN pool exhausted — 1 recycled, 2 pre-banned, 1 recycled (SNSS-AI pool-switch at 95%), 1 pre-banned → "3 consecutive pre-banned" abort. Expected behaviour.

**Run 2 (sessions 6–14):** Same VN pool. Sessions 6, 12, 13 hit `Host unreachable` at connect (1–2 failures each before success — old retry code). Sessions 10, 13 hit `"Cannot send requests while disconnected"` → Layer 3 recovered both (2/2). Balance hit $0.03 at session 14 → `balance_low` fired correctly.

**Root cause of failed run:** VN SMSPool pool is 100% recycled/pre-banned that day. Not proxy code.

---

## Current system state

| Workflow | Port | Status |
|---|---|---|
| Telegram Bot (Python supervisor) | 8083 | ✅ Running |
| Telegram Mini App (Vite) | 5000 | ✅ Running |
| Node.js API Server | 8080 | ✅ Running |
| CRM Platform | 23873 | ✅ Running |
| Mockup Sandbox | 8081 | ✅ Running |

---

## Known notes

- Pool rotation caps at 2 per session (1→0→2). After Pool 2, factory exhausts budget and shows switch-country prompt.
- `_banned_count >= 3` abort is intentional — 3 consecutive pre-bans = carrier pool signal.
- `DB_PATH = ./data/campaigns.db`; Node.js resolves via `../../` fallback in `db-path.ts`.
- Mockup-sandbox: PolishComplete.tsx, RefinedDepth.tsx, GroupsV2.tsx, WorkersV3.tsx have corrupted JSX — do not touch.

## Slide counts (unchanged)

| Manual | Slides |
|---|---|
| Manual.tsx | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |
