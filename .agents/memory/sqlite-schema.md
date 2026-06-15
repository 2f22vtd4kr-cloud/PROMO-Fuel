---
name: SQLite DB schema
description: Actual table names in campaigns.db — differs from early scratchpad assumptions.
---

# campaigns.db Schema

Tables: `campaigns`, `users`, `sends`, `sqlite_sequence`

## campaigns
id, name, text_template, status, created_at, started_at, finished_at, target_count, sent_count, failed_count, dry_run, scheduled_at, scheduled_tag, notify_chat

## users
chat_id (PK), username, first_name, first_seen, last_seen, tags (JSON string default '[]')

## sends
id, campaign_id, chat_id, status, sent_at, error — NO username/first_name columns (JOIN users to get those)

**Why:** The bot uses `campaigns.db` (SQLite) for both campaigns and users. Early notes incorrectly named tables `bot_users` and `send_logs`. The api-server reads this file via better-sqlite3 with DB_PATH resolved to `../../campaigns.db` relative to the api-server's CWD (`artifacts/api-server`).

**How to apply:** Always use `users` and `sends`. To get username in send logs, LEFT JOIN users on chat_id.
