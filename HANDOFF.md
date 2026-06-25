# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built / fixed this session

### Session Health Dashboard (`SessionHealthPanel`)
- **New component**: `artifacts/telegram-miniapp/src/components/SessionHealthPanel.tsx`
- Collapsible panel injected into **Accounts page** (after summary cards + problem badges, line ~1528)
- `GET /api/accounts/session-health` → fast DB-only read (no Telethon) in `accounts.ts`
- Health states: `active` 🟢 | `flood_wait` 🟡 | `banned` 🔴 | `session_invalid` 🔴 | `no_session` ⚪

### SNSS Stats Panel (`SnssPanel`)
- **New component**: `artifacts/telegram-miniapp/src/components/SnssPanel.tsx`
- Injected into **AccountFactory overlay** below `<RegHistoryPanel>` (line ~4845)
- Threshold slider + prefix table with unblock. Backend: 5 routes on `/api/factory/snss/*`

### Account Factory — Backend recycled-detection fix (this session)

**Root cause of UZ failure**: Every UZ SMSPool number returns
`SentCodeTypeApp + next_type=None → ResendCode → SendCodeUnavailable`.
This is a DEFINITIVE recycled signal but the old code then ran a **Layer 2 check**
(different API credentials via a fresh proxy session) that ALWAYS agreed — wasting
~7 seconds and keeping the SMSPool order open longer than necessary.

**Three fixes applied to `account_factory.py`**:

| # | What | Where | Effect |
|---|------|--------|--------|
| 1 | **Skip Layer 2 for definitive triple** | `~line 2204–2215` + `~line 2276–2281` | Saves ~7s per recycled UZ number |
| 2 | **SNSS threshold 2 → 1** | `_SNSS_MIN_COUNT = 1` (line 83) | L0 prefix blacklist fires after 1st recycled hit instead of 2nd |
| 3 | **L0 halt threshold 5 → 3** | L0 block `_app_stuck_count < 3` | Stops burning balance 2 attempts sooner |

**Details of Fix 1** — new flag `_definitive_recycled`:
- Initialized to `False` before the `_non_sms` gate
- Set to `True` in the `SendCodeUnavailableError + next_type=None` catch branch
- Layer 2 for loop now iterates over `_off_creds_filtered if not _definitive_recycled else []`
- When True: emits `"⚡ Layer 2 skipped"` debug SSE and falls through to recycled handling

**Expected new behaviour for UZ**:
1. Buy number → prefix L0 check (pass on attempt 1, counts 0)
2. Telethon init → `SentCodeTypeApp` → ResendCode → `SendCodeUnavailable + next_type=None`
3. `_definitive_recycled = True` → emit "🔴 definitive recycled" → **skip 7s Layer 2**
4. Record prefix, cancel, `_app_stuck_count += 1`
5. Attempt 2: Buy number → L0 fires (count=1 ≥ threshold=1) → cancel instantly, no Telethon
6. Attempt 3: L0 fires again → `_app_stuck_count = 3` → emit `sms_retry_prompt` with alternatives
7. **Total time**: ~20s vs old ~70s. **Total spend**: ~$4.38 vs old ~$4.38 (same numbers bought)
   — savings are time + UX clarity, money savings if SMSPool refunds cancelled orders

## Workflow status
- **API Server** (port 8080): RUNNING
- **Telegram Bot**: RUNNING — Python FastAPI 8083 (account_factory.py changes live)
- **Telegram Mini App** (port 5000): RUNNING — Vite dev HMR

## Architecture reminders
- Vite proxy: `/api/*` → `http://localhost:8080` (Node.js)
- Node.js: `/api/factory/*` → Python FastAPI 8083 via `makePythonProxy`
- `_SNSS_MIN_COUNT = 1` — process-global, resets on Python restart, adjustable via `/api/factory/snss/config`
- `_definitive_recycled` is a per-attempt local variable (not global), correct scope

## Key files
| File | Role |
|------|------|
| `account_factory.py` | Python FastAPI — SNSS + recycled detection (lines 83, 2167, 2204–2215, 2274–2281, 1827–1852) |
| `artifacts/api-server/src/routes/accounts.ts` | Node.js — `/accounts/session-health` |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS management UI |
| `artifacts/telegram-miniapp/src/components/SessionHealthPanel.tsx` | Session health dashboard |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Hosts `<SnssPanel>` |
| `artifacts/telegram-miniapp/src/pages/Accounts.tsx` | Hosts `<SessionHealthPanel>` |

## Known non-issues
- `artifacts/api-server: API Server` artifact workflow FAILED — real API is the `API Server` bash-workflow. Safe to ignore.
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing.
- Telegram Bot 409 conflicts: normal for multi-instance Replit starts.
