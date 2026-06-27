# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Multi-Account Management — DONE (previous half of session)

**`lib/account_manager.py`** — AccountManager class with `load_client`, `health_check`, `health_check_all`, `batch_join` (staggered), `warmup_account`, `get_tags`/`set_tags`, `get_manager()` singleton.

**Step 14 migration** — `account_phone TEXT` on `pending_verifications` + `idx_sender_accounts_last_used` index.

**`verification_listener.py`** — `_save_verification()` now auto-looks up and stores `account_phone`.

**`apiserver.py`** — Two new `admin_router` endpoints: `POST /api/admin/accounts/batch-join` and `POST /api/admin/accounts/health-check`.

**Frontend** — `AccountTagChips` component in `Accounts.tsx` (colored pill chips from JSON tags); `SenderAccount` interface extended with `tags?`, `health_score?`, `fingerprint_data?`, `current_proxy_index?`; missing `backupDb/Hint/Btn/Success` translation keys added to EN+UK locales.

---

### 2. Account Factory retry budget bug — FIXED (this half of session)

**Root cause (3 bugs in `account_factory.py`):**

The `_app_stuck_count` counter (unified "bad number" tracker shared by all three abort checks) was compared against hardcoded limits instead of `MAX_NUM_RETRIES` (derived from the user-configured `max_attempts` param):

| Check | Old limit | Fixed |
|---|---|---|
| SNSS prefix-skip (L0) | `< 3` hardcoded | `< MAX_NUM_RETRIES` |
| SNSS contact-hit (L1) | `< 5` hardcoded | `< MAX_NUM_RETRIES` |
| Confirmed recycled (Step 3) | `< 5` hardcoded | `< MAX_NUM_RETRIES` |

**Also fixed: "budget used" counter was wrong.** All three messages showed `_app_stuck_count/{MAX_NUM_RETRIES}` where `_app_stuck_count` is the recycled-only counter — should be `_num_attempt + 1` (total attempts). Log messages now accurately show e.g. `(6/20 budget used)` not `(4/20 budget used)` when some attempts were pre-banned.

**Effect:** With `max_attempts=20`, the factory now tries all 20 numbers before showing the "switch country" popup. Previously it aborted after 5 regardless of the configured budget. Log counter will now show `#N/20` instead of `#N/5`.

---

## Current system state

| Workflow | Port | Status |
|---|---|---|
| Telegram Bot (Python supervisor) | 8083 | ✅ Running |
| Telegram Mini App (Vite) | 5000 | ✅ Running |
| Node.js API Server | 8080 | ✅ Running |
| CRM Platform | 23873 | ✅ Running |
| Mockup Sandbox | 8081 | ✅ Running |

TypeScript typecheck: zero errors in app code (known pre-existing corrupted JSX in mockup-sandbox canvas files — do not touch).

---

## DB schema state (`data/campaigns.db`)

All 14 migration steps applied. Key tables: `sender_accounts` (tags/health_score/fingerprint_data/last_used_at/warmup_*), `pending_verifications` (account_phone — Step 14), `settings` (Step 13).

---

## Known issues / notes

- `_banned_count >= 3` abort (3 consecutive pre-banned numbers → pool exhausted) is intentionally left hardcoded — it's a carrier-pool signal, not a budget issue, and pre-banned messages already show remaining budget via `MAX_NUM_RETRIES - _num_attempt - 1`.
- `lib/account_manager.py` imports Telethon lazily — safe to import anywhere.
- `DB_PATH = ./data/campaigns.db` (workspace-root-relative). Node.js API resolves it via `../../` fallback in `db-path.ts`.

## Slide counts (unchanged)

| Manual | Slides |
|---|---|
| Manual.tsx | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |
