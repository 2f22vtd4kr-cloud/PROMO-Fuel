# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was built / fixed this session

### SNSS — Pre-banned numbers now feed the prefix blacklist

**Root cause of the UZ failure (screenshots IMG_2523/2524, debug log 17:41–17:42):**

All 3 UZ SMSPool numbers got `PhoneNumberBannedError` (pre-banned — Telegram itself had banned the numbers). The pre-banned code path (`if _banned:` block, ~line 2123) incremented `_banned_count` but:
- **Never called `_record_recycled_prefix`** → SNSS prefix blacklist stayed empty
- **Never incremented `_app_stuck_count`** → L0's abort threshold (`< 3`) never triggered
- **Never rotated `_pricing_option`** → all 3 attempts pulled from the same SMSPool carrier batch

Result: 3 × full Telethon connects (~10s each) before `sms_retry_prompt`. SNSS showed "0 blocked".

**Fix applied to `account_factory.py` (pre-banned handler, ~line 2123):**

Added immediately after `_banned_count += 1`:
1. `_app_stuck_count += 1` — unified counter so L0 abort threshold fires
2. `_record_recycled_prefix(phone, country_id, _pricing_option)` — feeds SNSS
3. `_recycled_phones_this_session.append(phone)` — feeds Gemini AI analysis
4. Pricing pool rotation: `_app_stuck_count==2` → `"0"` (mixed), `_app_stuck_count==3` → `"2"` (premium)
5. `_RECYCLED_COUNTRY_POOL.add(country_id.lower())` on `_banned_count >= 3` — flags country

**New flow for UZ with `_SNSS_MIN_COUNT=1` (already in code since last session):**

| Attempt | Action | SNSS | `_app_stuck_count` | pricing |
|---------|--------|------|-------------------|---------|
| 1 | L0 miss → Telethon → banned → records prefix (count→1) | count=1 | 1 | "1" |
| 2 | **L0 fires** (count=1 ≥ 1) → instant cancel | count=2 | 2 | rotates to "0" |
| 3 | L0 fires → `_app_stuck_count=3 ≥ 3` → `sms_retry_prompt` | count=3 | 3 | — |

If attempt-2 number has a DIFFERENT prefix (different carrier sub-batch), L0 misses and Telethon runs again — but attempt 3 uses pricing_option="0" (mixed pool), drawing from a different carrier batch that may have non-banned numbers.

**Also preserved from last session (already in code):**
- `_definitive_recycled` flag: `SentCodeTypeApp + next_type=None + SendCodeUnavailableError` → skips Layer 2 entirely (~7s saved per recycled number)
- `_SNSS_MIN_COUNT = 1` (line ~83)

## Workflow status
- **Telegram Bot**: RUNNING — Python FastAPI 8083 (`account_factory.py` fix is live)
- **API Server** (port 8080): RUNNING
- **Telegram Mini App** (port 5000): RUNNING — Vite dev HMR

## Architecture reminders
- Vite proxy: `/api/*` → `http://localhost:8080` (Node.js)
- Node.js: `/api/factory/*` → Python FastAPI 8083 via `makePythonProxy`
- `_SNSS_MIN_COUNT = 1` — process-global, resets on Python restart, adjustable via `/api/factory/snss/config`
- `_definitive_recycled` — per-attempt local variable (not global), correct scope
- `_app_stuck_count` now counts BOTH pre-banned AND recycled numbers (unified "bad number" counter)

## Key files
| File | Role |
|------|------|
| `account_factory.py` | Python FastAPI — pre-banned fix (~line 2123); SNSS + recycled detection |
| `artifacts/api-server/src/routes/accounts.ts` | Node.js — `/accounts/session-health` |
| `artifacts/telegram-miniapp/src/components/SnssPanel.tsx` | SNSS management UI |
| `artifacts/telegram-miniapp/src/components/SessionHealthPanel.tsx` | Session health dashboard |
| `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` | Hosts `<SnssPanel>` |
| `artifacts/telegram-miniapp/src/pages/Accounts.tsx` | Hosts `<SessionHealthPanel>` |

## Known non-issues
- `artifacts/api-server: API Server` artifact workflow FAILED — real API is the `API Server` bash-workflow. Safe to ignore.
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx have corrupted JSX — pre-existing.
- Telegram Bot 409 conflicts: normal for multi-instance Replit starts, self-resolves.
