---
name: Resume-cursor architecture for group broadcast tasks
description: How zero-duplicate resume works across SIGTERM/Replit-restart mid-broadcast
---

# Zero-duplicate resume cursor

## The problem
`force_release_worker_sync()` re-queues interrupted tasks with `tasks.status='pending'`
while preserving `tasks.id` (the task_id). Without a cursor, the broadcaster restarts
from position 0 — sending duplicates to groups already confirmed in the interrupted run.

## How it works

```
SIGTERM fires
  → force_release_worker_sync(WORKER_ID)
       tasks SET status='pending', worker_id=NULL   ← task_id PRESERVED
       sender_accounts SET locked_by=NULL, broadcasting=0

Worker restarts
  → claim_task() picks up same task_id
  → run_group_campaign_task(task)
       _load_send_cursor(campaign_id, task_id)
         SELECT group_id FROM group_send_logs
         WHERE campaign_id=? AND task_id=? AND status='ok'
         → frozenset of already-confirmed group_ids
       send loop: if gid in already_sent → continue  (no send, no re-log)
       on success: _log_send(... status='ok')        → captured in group_send_logs
                   _persist_task_cursor(task_id, gid) → tasks.cursor_group (diagnostic)
```

## Key guarantees

- **task_id is the join key** — preserved across all re-queue paths (SIGTERM,
  fail_task, force_release_worker_sync). A *new* task always gets a *new* id.
- **group_send_logs is the source of truth** — not tasks.cursor_group (that's
  diagnostic only). Query is covered by `idx_gsl_cursor(campaign_id, task_id, status)`.
- **Fail-open** — if group_send_logs doesn't exist or query fails, `_load_send_cursor`
  returns frozenset() so the broadcaster starts from scratch (safe, not broken).
- **Fresh campaigns unaffected** — a deliberately re-triggered campaign pushes a new
  task with a new task_id → no cursor entries → full send from position 0.

## Database changes

- `group_send_logs` table created in dbmigrations Step 5.5 (was missing — _log_send
  was silently failing on every call because only `group_campaign_sends` existed).
- `tasks.cursor_group TEXT` column — last confirmed group_id, diagnostic only.
- `idx_gsl_cursor ON group_send_logs(campaign_id, task_id, status)` — covering index.

**Why:** Without `group_send_logs`, all send history was silently lost. The cursor
mechanism requires durable per-send rows keyed by task_id.

## Files changed

- `dbmigrations.py` — Step 5.5 creates `group_send_logs`, Step 5 adds `cursor_group`
- `groupbroadcaster.py` — `_load_send_cursor()`, `_persist_task_cursor()`,
  resume skip in send loop, `results["resumed"]` counter
- `worker.py` — includes `resumed_n` in completion check and owner notification
