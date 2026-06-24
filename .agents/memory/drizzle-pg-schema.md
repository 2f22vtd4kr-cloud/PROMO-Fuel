---
name: Drizzle schema must mirror all PostgreSQL tables
description: lib/db/src/schema/index.ts must define every table the app creates in PostgreSQL, or Replit deployment generates DROP TABLE migrations.
---

# Drizzle Schema Must Mirror All PostgreSQL Tables

## The rule
Every table created via raw SQL in PostgreSQL (`pool.query("CREATE TABLE IF NOT EXISTS ...")`) **must also be defined** in `lib/db/src/schema/index.ts`.

**Why:** Replit's deployment migration system uses the Drizzle schema as the desired state. Any table in production PostgreSQL that is NOT in the schema gets a `DROP TABLE ... CASCADE` migration generated on every republish — wiping real user data (proxies, session files, DB snapshots).

**How to apply:**
When adding a new PostgreSQL table anywhere in the Node.js routes or Python db_sync, immediately add it to `lib/db/src/schema/index.ts` using Drizzle's pg-core builders.

## Current PostgreSQL tables (as of 2026-06-24)
| Table | Managed by | Schema type |
|---|---|---|
| `saved_proxies` | `artifacts/api-server/src/routes/proxy-store.ts` | serial PK, text country_code/label/proxy_string, integer last_session_num, timestamptz created_at/updated_at |
| `pf_db_snapshot` | `db_sync.py` | text PK key, bytea db_data, timestamptz updated_at |
| `pf_session_files` | `db_sync.py` + `pg-pool.ts` | text PK filename, bytea data, timestamptz updated_at |

## Important: `bytea` columns
`bytea` is NOT directly exported from `drizzle-orm/pg-core`. Use:
```ts
import { customType } from "drizzle-orm/pg-core";
const bytea = customType<{ data: Buffer }>({
  dataType() { return "bytea"; },
});
```

## Everything else is SQLite only
All other tables (campaigns, users, sends, sender_accounts, group_campaigns, tasks, broadcast_workers, etc.) live exclusively in `campaigns.db` (SQLite via better-sqlite3). They are NOT in Replit's PostgreSQL.
