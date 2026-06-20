---
name: SQLite DB schema
description: Actual table names in campaigns.db — differs from early scratchpad assumptions.
---

# campaigns.db Schema

Core tables: `campaigns`, `users`, `sends`, `sender_accounts`, `message_templates`, `uploads`, `tasks`, `broadcast_workers`, `account_groups`, `group_campaigns`, `group_sends`

## campaigns
id, name, text_template, status, created_at, started_at, finished_at, target_count, sent_count, failed_count, dry_run, scheduled_at, scheduled_tag, notify_chat, sender_account_id, send_delay_seconds

## users
chat_id (PK), username, first_name, first_seen, last_seen, tags (JSON string default '[]')

## sends
id, campaign_id, chat_id, status, sent_at, error — NO username/first_name columns (JOIN users to get those)

## sender_accounts
id, label, phone, telegram_id, username, api_id, api_hash, session_file, proxy, proxies, auth_status, status, sent_today, sent_total, failed_total, last_error, last_used_at, is_banned, is_active, created_at

## group_campaigns
id, name, text_template, status, sender_account_id, selected_groups (JSON), interval_seconds, next_send_at, last_sent_at, sent_count, failed_count, notes, media_url, media_type, inline_buttons (JSON), pin_message, min_delay_seconds (default 2.5), max_delay_seconds (default 6.0), daily_limit (default 0), created_at, updated_at

## group_sends
id, campaign_id, group_id, group_title, account_id, status, error, sent_at

## tasks
id, task_type, campaign_id, payload (JSON), status, priority, worker_id, claimed_at, started_at, finished_at, attempts, max_attempts, error, created_at, scheduled_at

## broadcast_workers
worker_id (PK), status, tasks_done, tasks_failed, last_heartbeat, pid, is_alive (computed from heartbeat age)

## account_groups
id, account_id, group_id, group_title, group_type, member_count, username, is_active, refreshed_at

**Why:** The bot uses `campaigns.db` (SQLite) for both campaigns and users. Early notes incorrectly named tables `bot_users` and `send_logs`. The api-server reads this file via better-sqlite3 with DB_PATH resolved to `../../campaigns.db` relative to the api-server's CWD (`artifacts/api-server`).

**How to apply:** Always use `users` and `sends`. To get username in send logs, LEFT JOIN users on chat_id. New columns added via ALTER TABLE in ensureTables() on API server start.
