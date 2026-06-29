# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. SNSS-AI automatic pool-switching

When SNSS-AI fires `switch_pool=True` at ≥90% confidence, the factory now rotates `_pricing_option` immediately. Rotation: **1 → 0 → 2**, capped at 2 per session.

### 2. "Connection dropped" three-layer fix

**Root cause:** Decodo residential SOCKS5 tunnels silently drop during the human-like delay (1.2–4.1s) between `connect()` and `send_code_request()`. Old code: `connection_retries=5 × retry_delay=2` spun 10s silently then cancelled the purchased number ($0.38 wasted).

**Layer 1 — Fail fast:** `connection_retries=1, retry_delay=1` — Telethon surfaces error in <2s.

**Layer 2 — Pre-flight liveness check:** `client.is_connected()` called after the delay. If false, fast reconnect (8s timeout) without cancelling the number.

**Layer 3 — Reconnect on same number:** On transient exception, attempt one reconnect + retry `RawSendCodeRequest` on the same phone before cancelling. Budget slot only consumed if reconnect also fails.

**Confirmed working in log:** Session 4 — "ProxyError: Host unreachable" on connect attempt 1, retried, then "Cannot send requests while disconnected" on step 3, Layer 3 reconnected successfully → `SentCodeTypeApp` received on same number without cancelling it.

### 3. Proxy stability monitoring

- Added `_tunnel_drop_count` and `_tunnel_recover_count` session counters
- Debug SSE messages now include `(drop #N this session)` and `(N/M drops recovered)`
- `proxy_health` SSE event emitted when a reconnect fails with `drops/recovered/fatal` counts
- Both reconnect paths (pre-flight Layer 2 + exception Layer 3) instrument the counters

### 4. SMSPool balance_low event

When purchase fails with "Insufficient balance", the server now:
- Parses the exact current balance and minimum price from the error string (regex on "you only have: X.XX" and "price is: X.XX")
- Emits a structured `balance_low` SSE event with `{balance, needed, top_up_url}`
- Previously emitted generic `error` event

**UI changes (AccountFactory.tsx):**
- New `balanceLow` state holds `{balance, needed, url}`
- Error banner changes to amber theme when `balanceLow` is set
- "💰 Balance Too Low" title instead of "Registration Failed"
- "Top Up (need $X.XX more)" amber button linking to smspool.net/pricing
- `stop()` and `reset()` both clear `balanceLow`

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
