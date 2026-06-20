---
name: Group Broadcasting Module
description: Architecture decisions for the SQLite task queue, multi-worker broadcaster, scheduler, and Mini App pages.
---

## Key files
- `task_queue.py` — FileLock-protected SQLite task queue; `default_queue` module-level instance
- `worker.py` — standalone process: `python worker.py worker-1`; claims tasks, sends heartbeats, calls `run_group_campaign_task()`. On task completion sends Telegram notification to OWNER_IDS via aiohttp (fire-and-forget).
- `groupbroadcaster.py` — Telethon sending engine; per-account FileLock + proxy rotation + spintax + anti-ban jitter; configurable min/max delay and daily_limit from campaign; test mode (payload `{test:true, group_ids:[...]}`) bypasses status check and overrides group list.
- `broadcastscheduler.py` — async background task; polls group_campaigns every 30s, pushes tasks for due campaigns
- `dbmigrations.py` — idempotent schema; run on every startup
- `utils/proxy.py` — parse_proxies(), pick_proxy(), proxy_to_telethon()
- `utils/spintax.py` — resolve(), preview_all(), validate()
- `utils/supervisor.py` — WorkerHeartbeat thread; reap_dead_workers() async helper

## API routes (group-campaigns.ts)
- GET/POST/PUT/DELETE `/group-campaigns` + `/:id`
- POST `/:id/action` — {action: start|pause|resume|stop|cancel}
- POST `/:id/duplicate` — copies all fields including delay settings
- POST `/:id/send-now` — inserts priority=1 task, transitions draft→running
- POST `/:id/test-send` — {group_id} → inserts priority=0 task with {test:true, group_ids:[group_id]} payload
- GET `/:id/logs` — last 200 group_sends rows
- GET `/:id/stats` — {by_group, daily} aggregated from group_sends
- GET/POST `/accounts/:id/groups` + `groups/refresh` — mounted before accounts.ts to win route precedence

## group_campaigns table columns
Standard: id, name, text_template, status, sender_account_id, selected_groups, interval_seconds, next_send_at, last_sent_at, sent_count, failed_count, notes, created_at, updated_at
Media: media_url, media_type, inline_buttons (JSON), pin_message
Anti-ban: min_delay_seconds (default 2.5), max_delay_seconds (default 6.0), daily_limit (default 0=unlimited)

## Mini App pages
- `pages/GroupBroadcasts.tsx` — list with send-now/pause/stop/duplicate/delete; expandable logs+stats tabs; stats tab shows per-group success rate with progress bars
- `pages/GroupBroadcastCreate.tsx` — create/edit form; group picker with refresh; spintax preview; inline buttons; anti-ban section (min/max delay, daily limit)
- `pages/Workers.tsx` — health dashboard; task queue viewer with retry/cancel; 15s auto-refresh
- `pages/Home.tsx` — worker health strip shows alive workers + pending tasks + active group campaigns count
- `lib/spintax.ts` — client-side spintax (mirrors Python utils/spintax.py)

## Bot commands (main.py)
- `/workers` — worker health + task queue summary
- `/broadcasts` — group campaigns list with inline keyboard buttons (▶ Отправить #id)
- `/group_send <id>` — push task immediately for campaign id
- `gc_send:<id>` callback — inline button handler that inserts task into DB

## Design decisions
**Why FileLock on SQLite:** Multiple worker processes sharing one DB need atomic claim_task. SQLite WAL mode handles reads but not UPDATE/SELECT races; filelock provides mutual exclusion for writes.

**How to apply:** Any new worker-facing operation that writes to `tasks` or `sender_accounts.status` must acquire `_flock` first.

**Why per-account Telethon FileLock (`account_{id}.lock`):** Telethon session files use SQLite internally — two async tasks connecting to the same session file simultaneously causes "database is locked". One FileLock per account_id prevents this.

**Why broadcastscheduler advances next_send_at BEFORE pushing the task:** If push fails after the advance, the campaign waits one full interval (safe). If we pushed first and the advance failed, the campaign fires again immediately on the next poll (dangerous double-send).

**Tab order:** home / campaigns / groups / analytics / audience / upload / workers (7 tabs total). GroupBroadcastCreate editor is an overlay (zIndex 50), same pattern as EditorPage.

**Test mode:** send-now with test=true + group_ids payload in groupbroadcaster bypasses campaign status check and sends to specified groups only. Useful for dry runs.
