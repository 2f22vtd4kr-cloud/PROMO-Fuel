---
name: Crash-alert rate limiter
description: SQLite-backed cooldown that prevents Telegram alert floods when workers crash repeatedly
---

# Crash-alert cooldown (utils/alert_cooldown.py)

## Table
`alert_cooldowns` in campaigns.db — one row per `(alert_type, entity_id)`.
Created on first use by `CrashAlertCooldown._ensure_table()`.

## Columns
- `last_sent_at` — ISO-8601 UTC timestamp of the last fired alert
- `suppressed`   — count of suppressed alerts since last fire
- `last_error`   — last error text seen (max 500 chars)

## Call sites
| alert_type | entity_id | window | file |
|---|---|---|---|
| `task_crash` | `WORKER_ID` | 15 min (900s) | `worker.py` line ~505 |
| `crash_loop` | `worker_id` | 30 min (1800s) | `utils/supervisor.py` `_send_critical_alert` |

## Behaviour
- First alert for an (alert_type, entity_id) pair: always fires immediately.
- Within window: suppressed, counter incremented.
- Window expired: fires with suppression note appended to message body.
- `reset(alert_type, entity_id)`: clears the row — called by `worker.py` on successful task completion so the next crash always fires immediately.

## Fail-open guarantee
Any SQLite error returns `AlertDecision(should_fire=True, message=original)` — alerts are never silently swallowed by an infra failure.

**Why:** task_crash notifications fire every POLL_INTERVAL on a persistently bad task (e.g. corrupt data, network issue). Without rate-limiting, a single bad campaign generates one Telegram message every 5s, flooding the admin channel.
