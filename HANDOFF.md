# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Multi-Account Management — DONE

**`lib/account_manager.py`** — AccountManager class with `load_client`, `health_check`, `health_check_all`, `batch_join` (staggered), `warmup_account`, `get_tags`/`set_tags`, `get_manager()` singleton.

**Step 14 migration** — `account_phone TEXT` on `pending_verifications` + `idx_sender_accounts_last_used` index.

**`verification_listener.py`** — `_save_verification()` now auto-looks up and stores `account_phone`.

**`apiserver.py`** — `POST /api/admin/accounts/batch-join` and `POST /api/admin/accounts/health-check`.

**Frontend** — `AccountTagChips` component in `Accounts.tsx`; `SenderAccount` extended with `tags?/health_score?/fingerprint_data?/current_proxy_index?`; missing `backupDb/Hint/Btn/Success` translation keys added to EN+UK locales.

---

### 2. Account Factory retry budget — FIXED

All three abort checks (`_app_stuck_count`) were hardcoded (`< 3`, `< 5`, `< 5`) instead of `< MAX_NUM_RETRIES`. "Budget used" counter showed recycled-only count instead of total attempts. Both fixed; with `max_attempts=20` the factory now tries all 20 numbers before showing "switch country" popup.

---

### 3. Pool quality indicator — ADDED

**Backend (`account_factory.py`):** Emits new `pool_quality` SSE event `{"bad": N, "total": M}` immediately before every retry `continue` (prefix-skip L0, contact-hit L1, pre-banned, confirmed recycled). Does NOT emit on final abort (handled by `sms_retry_prompt`).

**Frontend (`AccountFactory.tsx`):**
- `poolQuality: {bad, total} | null` state — resets to `null` on every `launch()`
- Handles `pool_quality` SSE: updates state in place (no log line, no append)
- Renders a single compact strip inside the steps card (between step rows and poll-msg footer):
  - Thin 3px animated progress bar (bad/total as %)
  - Color: green < 30% bad, yellow 30–60%, red ≥ 60%
  - `"Pool" label | ▓▓░░░░ | 3/6 ❌ 50%`
  - Invisible when quality is null (fresh start or successful run)

No new log entries. The strip silently replaces itself on every bad number — never grows.

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

All 14 migration steps applied. `sender_accounts` has tags/health_score/fingerprint_data/last_used_at/warmup_*; `pending_verifications` has `account_phone` (Step 14); `settings` key/value store (Step 13).

---

## Known notes

- `_banned_count >= 3` abort intentionally left hardcoded (3 consecutive pre-bans = carrier pool signal, not budget issue).
- `lib/account_manager.py` imports Telethon lazily — safe to import anywhere.
- `DB_PATH = ./data/campaigns.db` (workspace-root-relative); Node.js resolves via `../../` fallback in `db-path.ts`.

## Slide counts (unchanged)

| Manual | Slides |
|---|---|
| Manual.tsx | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |
