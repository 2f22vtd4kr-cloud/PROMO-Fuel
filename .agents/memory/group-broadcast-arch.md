---
name: Group Broadcasting Module
description: Architecture decisions for the SQLite task queue, multi-worker broadcaster, scheduler, and Mini App pages.
---

## Key files
- `task_queue.py` — FileLock-protected SQLite task queue; `default_queue` module-level instance
- `worker.py` — standalone process: `python worker.py worker-1`; claims tasks, sends heartbeats, calls `run_group_campaign_task()`
- `groupbroadcaster.py` — Telethon sending engine; per-account FileLock + proxy rotation + spintax + anti-ban jitter
- `broadcastscheduler.py` — async background task; polls group_campaigns every 30s, pushes tasks for due campaigns
- `dbmigrations.py` — idempotent schema; run on every startup
- `utils/proxy.py` — parse_proxies(), pick_proxy(), proxy_to_telethon()
- `utils/spintax.py` — resolve(), preview_all(), validate()
- `utils/supervisor.py` — WorkerHeartbeat thread; reap_dead_workers() async helper

## API routes
- `artifacts/api-server/src/routes/workers.ts` — GET /workers, GET /tasks, POST /tasks/:id/retry, GET /workers-summary, etc.
- Mounted at both /api/* and /api/twa/* in routes/index.ts

## Mini App pages
- `pages/GroupBroadcasts.tsx` — list view with start/pause/stop/duplicate/delete
- `pages/GroupBroadcastCreate.tsx` — create/edit form; group picker with refresh; spintax preview; inline buttons
- `pages/Workers.tsx` — health dashboard; task queue viewer with retry/cancel
- `lib/spintax.ts` — client-side spintax (mirrors Python utils/spintax.py)

## Design decisions
**Why FileLock on SQLite:** Multiple worker processes sharing one DB need atomic claim_task. SQLite WAL mode handles reads but not UPDATE/SELECT races; filelock provides mutual exclusion for writes.

**How to apply:** Any new worker-facing operation that writes to `tasks` or `sender_accounts.status` must acquire `_flock` first.

**Why per-account Telethon FileLock (`account_{id}.lock`):** Telethon session files use SQLite internally — two async tasks connecting to the same session file simultaneously causes "database is locked". One FileLock per account_id prevents this.

**Why broadcastscheduler advances next_send_at BEFORE pushing the task:** If push fails after the advance, the campaign waits one full interval (safe). If we pushed first and the advance failed, the campaign fires again immediately on the next poll (dangerous double-send).

**Tab order:** home / campaigns / groups / analytics / audience / upload / workers (7 tabs total). GroupBroadcastCreate editor is an overlay (zIndex 50), same pattern as EditorPage.
