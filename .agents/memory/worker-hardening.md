---
name: Worker hardening architecture
description: Production hardening decisions for multi-worker task queue: atomic locking, proxy rotation, supervisor, UI spawn button.
---

## Atomic account double-booking guard (task_queue.py)

`claim_task_sync` uses a `NOT EXISTS` subquery to skip tasks whose campaign's sender account already has `status='broadcasting'` in `sender_accounts`. This is the DB-level guard (complements FileLock which guards the Telethon .session file).

```sql
NOT EXISTS (
  SELECT 1 FROM group_campaigns gc
  JOIN sender_accounts sa ON sa.id = gc.sender_account_id
  WHERE gc.id = t.campaign_id AND sa.status = 'broadcasting'
)
```

If the account becomes busy between the guard check and the UPDATE, a second check (`locked = 0` rows) rolls back the claim atomically.

`reset_stuck_sync` also calls `_release_account_lock()` for every stuck task before re-queuing, to prevent orphaned `status='broadcasting'` entries from blocking all workers indefinitely.

**Why:** Without the guard, two workers can claim tasks for the same Telethon account. This causes `database is locked` errors on the .session file and Telegram flood detection.

**How to apply:** Always resolve `sender_account_id` from either the task payload or the `group_campaigns` table. Keep both the SQL guard and the FileLock — they protect different layers.

---

## Proxy rotation (groupbroadcaster.py)

Three-tier system:
1. `_rank_proxies(proxies)` — sorts by `_proxy_fail_count()`, least-failed first.
2. `_proxy_fail_count(label)` — counts failures within a 300s window; auto-clears stale counts.
3. `_rotate_to_next_proxy(account, proxies, failed_label)` — on send failure, disconnects current client, skips the failed label and any proxy with ≥5 failures, tries remaining in ranked order, falls back to direct (no proxy) as last resort.

Per-send retry: `_try_send()` attempts the send twice. On the first failure (if proxies exist), it rotates proxy and retries. On second failure or group-level error, logs and moves on.

**Why:** A single failed proxy shouldn't abort a whole task. But exhausted rotation should log clearly so ops can diagnose.

---

## WorkerSupervisor (utils/supervisor.py)

`WorkerSupervisor(worker_count=N)` spawns N worker subprocesses using `subprocess.Popen(['python', 'worker.py', worker_id, '--db', db_path])`. A daemon monitor thread polls every 15s. On crash: exponential backoff (5s → 10s → 20s … capped at 300s). After 120s of healthy uptime, restart_count and backoff decay. Gives up after 20 consecutive restarts.

`WORKER_COUNT=N` env var controls auto-spawn from `main.py post_init`. Default 0 = opt-in only (start workers manually).

**Why:** Avoids needing an external process manager (systemd/supervisor) in the Replit environment. Self-healing for transient crashes.

---

## DB schema additions (sender_accounts)

Five new columns added via `dbmigrations.py` (idempotent ALTER TABLE):
- `locked_by TEXT` — worker_id holding the lock (NULL = free)
- `locked_at TEXT` — ISO-8601 timestamp of lock acquisition (for stale-lock detection)
- `proxy_index INTEGER DEFAULT 0` — persisted proxy rotation index
- `broadcasting INTEGER NOT NULL DEFAULT 0` — belt-and-suspenders active flag
- `flood_wait_until TEXT` — earliest allowed retry time

New table: `worker_heartbeats` (worker_id, last_seen, status, tasks_completed, tasks_failed)
— separate from `broadcast_workers` (lifecycle tracking). Workers upsert to both.

## API endpoints added (workers.ts)

- `GET  /worker-heartbeats` — returns worker_heartbeats table with age_seconds + is_alive (< 60s)
- `POST /workers/recover-locks` — finds accounts where locked_at > timeout_seconds (default 300),
  releases them, resets stuck claimed tasks; returns {released_accounts, reset_tasks, stale[]}

## Workers.tsx UI changes

- Refresh interval: 15s → 10s (spec says 10s)
- Added `SpawnWorkerButton` → calls `POST /api/twa/workers/spawn`, auto-increments worker-N
- `HeartbeatDot` component: animated ring pulse (keyframe `hb-ring`) green for idle, blue for working, red for dead
- Worker card shows uptime (`uptime(worker.started_at)`) alongside PID
- Active worker count shown inline in page header

## GroupBroadcasts.tsx UI changes

- Loads `api.getTasks("claimed")` alongside campaigns; builds `Set<number>` of active campaign IDs
- `isActive` prop on `GroupCampaignCard`: shows animated pulse dot on the Radio icon and "● В работе у воркера" subtitle line
- Refresh interval: 20s → 12s

## Workers.ts API (Express)

Added `POST /workers/spawn` — uses Node `child_process.spawn` to start `python worker.py worker-N` as a detached process. Auto-increments the highest existing worker number from the DB.
