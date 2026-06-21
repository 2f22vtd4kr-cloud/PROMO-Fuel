"""Database migration runner — applies all schema upgrades idempotently.

Run directly:   python dbmigrations.py
Or import:      from dbmigrations import run_migrations; run_migrations()

Design goals
============
* All migrations are idempotent (safe to run multiple times on any DB age).
* Three mandatory WAL pragmas are set on every connection opened here:
      PRAGMA journal_mode = WAL          — writer does not block readers
      PRAGMA synchronous  = NORMAL       — safe yet fast fsync strategy
      PRAGMA busy_timeout = 30000        — wait up to 30 s before SQLITE_BUSY
* Additive ALTER TABLE ADD COLUMN is used everywhere — no destructive DDL.
* Every schema decision is logged at DEBUG level; key milestones at INFO.

Target table canonical schemas (new installs)
=============================================
senderaccounts   — id TEXT PRIMARY KEY, proxies JSON, current_proxy_index,
                   auth_status TEXT DEFAULT 'idle', last_used_at TEXT  + more
tasks            — id TEXT PRIMARY KEY, type TEXT, payload TEXT,
                   status TEXT DEFAULT 'pending', worker_id TEXT,
                   created_at TEXT, started_at TEXT, completed_at TEXT,
                   error TEXT   + operational columns retained for compat
groupcampaigns   — full group-broadcast campaign lifecycle
groupcampaignsends — per-send log rows for group campaigns
"""

import logging
import os
import sqlite3
from typing import Sequence

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")

# ─────────────────────────────────────────────────────────────────────────────
# Connection factory — THREE mandatory pragmas on every connection
# ─────────────────────────────────────────────────────────────────────────────

def get_connection(path: str = DB_PATH) -> sqlite3.Connection:
    """Open a SQLite connection with all required concurrency pragmas.

    Pragma rationale
    ----------------
    journal_mode=WAL      Writers append to the WAL file; readers use the
                          main DB file simultaneously — no reader/writer blocking.
    synchronous=NORMAL    The OS flushes at checkpoints (not every commit).
                          Safe against power loss when WAL is enabled.
    busy_timeout=30000    SQLite sleeps and retries for up to 30 000 ms before
                          raising SQLITE_BUSY — critical under multi-worker
                          concurrency to avoid spurious "database is locked" errors.
    foreign_keys=ON       Enforce referential integrity.
    """
    logger.debug("[db] Opening connection to %s", path)
    conn = sqlite3.connect(path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA foreign_keys=ON")
    logger.debug(
        "[db] Pragmas set — WAL mode, synchronous=NORMAL, busy_timeout=30000ms"
    )
    return conn


# Keep the old private name as an alias so existing call-sites in this file
# continue to work without changes.
_conn = get_connection


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _add_col(
    conn: sqlite3.Connection,
    table: str,
    col: str,
    definition: str,
) -> bool:
    """Add a single column to *table* if it does not already exist.

    Returns True if the column was created, False if it was already present.
    Never raises — existing columns are silently skipped.
    """
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
        conn.commit()
        logger.debug("  [schema] + %s.%s  (%s)", table, col, definition)
        return True
    except sqlite3.OperationalError:
        logger.debug("  [schema] = %s.%s already exists, skip", table, col)
        return False


def _add_cols(
    conn: sqlite3.Connection,
    table: str,
    cols: Sequence[tuple[str, str]],
) -> int:
    """Apply a list of (column_name, definition) pairs to *table*.

    Returns the number of columns actually added.
    """
    added = 0
    for col, defn in cols:
        if _add_col(conn, table, col, defn):
            added += 1
    if added:
        logger.info("[migrations] %s: added %d column(s)", table, added)
    else:
        logger.debug("[migrations] %s: all columns already present", table)
    return added


def _create_index(
    conn: sqlite3.Connection,
    index_name: str,
    target: str,
) -> None:
    """Create an index if it does not already exist, logging the outcome."""
    try:
        conn.execute(
            f"CREATE INDEX IF NOT EXISTS {index_name} ON {target}"
        )
        logger.debug("  [index] ✓ %s ON %s", index_name, target)
    except sqlite3.OperationalError as exc:
        logger.warning("  [index] ✗ %s — %s", index_name, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Migration entry point
# ─────────────────────────────────────────────────────────────────────────────

def run_migrations(db_path: str = DB_PATH) -> None:  # noqa: C901 — long but linear
    """Apply all schema migrations to *db_path* in order.

    Safe to call on every application start — every step is idempotent.
    """
    logger.info("[migrations] Running against %s", db_path)
    conn = _conn(db_path)

    # ── Step 1: Core tables (CREATE TABLE IF NOT EXISTS) ─────────────────────
    #
    # Canonical schemas for new installations.  On existing DBs the CREATE
    # statements are no-ops; additive ALTER TABLE migrations follow in step 2.
    #
    # Note on primary-key types
    # --------------------------
    # New-install target: TEXT PRIMARY KEY (UUIDs / named keys).
    # Existing installs retain INTEGER PK from earlier versions — the additive
    # migrations in step 2 ensure all new columns are present regardless.

    logger.info("[migrations] Step 1 — core tables")
    conn.executescript("""
        -- ── users ────────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS users (
            chat_id        INTEGER PRIMARY KEY,
            username       TEXT,
            first_name     TEXT,
            first_seen     TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen      TEXT NOT NULL DEFAULT (datetime('now')),
            tags           TEXT NOT NULL DEFAULT '[]',
            promo_targeted INTEGER NOT NULL DEFAULT 0,
            last_promo_at  TEXT,
            converted      INTEGER NOT NULL DEFAULT 0,
            converted_at   TEXT
        );

        -- ── campaigns (direct-message campaigns) ─────────────────────────────
        CREATE TABLE IF NOT EXISTS campaigns (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            name                  TEXT    UNIQUE NOT NULL,
            text_template         TEXT    NOT NULL,
            status                TEXT    NOT NULL DEFAULT 'draft',
            created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
            started_at            TEXT,
            finished_at           TEXT,
            target_count          INTEGER NOT NULL DEFAULT 0,
            sent_count            INTEGER NOT NULL DEFAULT 0,
            failed_count          INTEGER NOT NULL DEFAULT 0,
            dry_run               INTEGER NOT NULL DEFAULT 0,
            scheduled_at          TEXT,
            scheduled_tag         TEXT,
            notify_chat           INTEGER,
            notes                 TEXT    NOT NULL DEFAULT '',
            sender_account_id     INTEGER,
            send_delay_seconds    INTEGER NOT NULL DEFAULT 15
        );

        -- ── sends (per-message log for direct campaigns) ─────────────────────
        CREATE TABLE IF NOT EXISTS sends (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            chat_id     INTEGER NOT NULL,
            account_id  INTEGER,
            status      TEXT    NOT NULL,
            sent_at     TEXT    NOT NULL DEFAULT (datetime('now')),
            error       TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
            FOREIGN KEY (account_id)  REFERENCES sender_accounts(id)
        );

        -- ── sender_accounts ───────────────────────────────────────────────────
        -- Canonical new-install schema (TEXT PRIMARY KEY).
        -- Existing installations keep INTEGER PK; step 2 adds missing columns.
        CREATE TABLE IF NOT EXISTS sender_accounts (
            id                  TEXT    PRIMARY KEY,
            label               TEXT    NOT NULL DEFAULT '',
            phone               TEXT    UNIQUE NOT NULL,
            telegram_id         INTEGER,
            username            TEXT,
            api_id              INTEGER,
            api_hash            TEXT,
            session_file        TEXT,
            proxy               TEXT,
            proxies             TEXT    NOT NULL DEFAULT '[]',
            current_proxy_index INTEGER NOT NULL DEFAULT 0,
            auth_status         TEXT    NOT NULL DEFAULT 'idle',
            status              TEXT    NOT NULL DEFAULT 'idle',
            sent_today          INTEGER NOT NULL DEFAULT 0,
            daily_limit         INTEGER NOT NULL DEFAULT 300,
            sent_total          INTEGER NOT NULL DEFAULT 0,
            failed_total        INTEGER NOT NULL DEFAULT 0,
            last_error          TEXT,
            last_used_at        TEXT,
            is_banned           INTEGER NOT NULL DEFAULT 0,
            is_active           INTEGER NOT NULL DEFAULT 1,
            locked_by           TEXT,
            locked_at           TEXT,
            proxy_index         INTEGER NOT NULL DEFAULT 0,
            broadcasting        INTEGER NOT NULL DEFAULT 0,
            flood_wait_until    TEXT,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- ── uploads ───────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS uploads (
            key            TEXT    PRIMARY KEY,
            filename       TEXT    NOT NULL,
            entries_json   TEXT    NOT NULL,
            uploaded_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            imported_count INTEGER NOT NULL DEFAULT 0
        );

        -- ── message_templates ─────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS message_templates (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    UNIQUE NOT NULL,
            body       TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- ── account_groups ────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS account_groups (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id   INTEGER NOT NULL,
            group_id     TEXT    NOT NULL,
            group_title  TEXT,
            group_type   TEXT    NOT NULL DEFAULT 'group',
            member_count INTEGER NOT NULL DEFAULT 0,
            username     TEXT,
            is_active    INTEGER NOT NULL DEFAULT 1,
            refreshed_at TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(account_id, group_id)
        );
    """)
    conn.commit()
    logger.info("[migrations] Step 1 — core tables OK")

    # ── Step 2: groupcampaigns ────────────────────────────────────────────────
    #
    # Complete schema for group-broadcast campaigns.
    # Alias: the runtime table is named group_campaigns; "groupcampaigns" is the
    # logical name used in requirements.

    logger.info("[migrations] Step 2 — groupcampaigns / groupcampaignsends")
    conn.executescript("""
        -- ── group_campaigns (groupcampaigns) ─────────────────────────────────
        CREATE TABLE IF NOT EXISTS group_campaigns (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            name                  TEXT    NOT NULL,
            text_template         TEXT    NOT NULL,
            status                TEXT    NOT NULL DEFAULT 'draft',
            sender_account_id     INTEGER,
            selected_groups       TEXT    NOT NULL DEFAULT '[]',
            interval_seconds      INTEGER NOT NULL DEFAULT 86400,
            next_send_at          TEXT,
            last_sent_at          TEXT,
            sent_count            INTEGER NOT NULL DEFAULT 0,
            failed_count          INTEGER NOT NULL DEFAULT 0,
            notes                 TEXT    NOT NULL DEFAULT '',
            media_url             TEXT,
            media_type            TEXT,
            inline_buttons        TEXT    NOT NULL DEFAULT '[]',
            pin_message           INTEGER NOT NULL DEFAULT 0,
            created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- ── group_campaign_sends (groupcampaignsends) ─────────────────────────
        CREATE TABLE IF NOT EXISTS group_campaign_sends (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            group_id    TEXT    NOT NULL,
            group_title TEXT,
            account_id  INTEGER,
            task_id     INTEGER,
            status      TEXT    NOT NULL,
            error       TEXT,
            sent_at     TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (campaign_id) REFERENCES group_campaigns(id)
        );
    """)
    conn.commit()
    logger.info("[migrations] Step 2 — group campaign tables OK")

    # ── Step 3: tasks ─────────────────────────────────────────────────────────
    #
    # Clean indexed schema as per requirements.
    # Mandatory columns: id TEXT PK, type, payload, status, worker_id,
    #                    created_at, started_at, completed_at, error.
    # Additional operational columns retained for compatibility with task_queue.py.
    # Indexes: status, worker_id.

    logger.info("[migrations] Step 3 — tasks table")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            id            TEXT    PRIMARY KEY,
            type          TEXT    NOT NULL DEFAULT 'group_broadcast',
            payload       TEXT    NOT NULL DEFAULT '{}',
            status        TEXT    NOT NULL DEFAULT 'pending',
            worker_id     TEXT,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            started_at    TEXT,
            completed_at  TEXT,
            error         TEXT,
            -- Operational columns for task_queue.py compatibility
            task_type     TEXT    GENERATED ALWAYS AS (type) VIRTUAL,
            campaign_id   INTEGER,
            priority      INTEGER NOT NULL DEFAULT 5,
            claimed_at    TEXT,
            finished_at   TEXT    GENERATED ALWAYS AS (completed_at) VIRTUAL,
            attempts      INTEGER NOT NULL DEFAULT 0,
            max_attempts  INTEGER NOT NULL DEFAULT 3,
            scheduled_at  TEXT
        );

        -- Required indexes on status and worker_id
        CREATE INDEX IF NOT EXISTS idx_tasks_status
            ON tasks(status);

        CREATE INDEX IF NOT EXISTS idx_tasks_worker_id
            ON tasks(worker_id);

        -- Supporting operational indexes
        CREATE INDEX IF NOT EXISTS idx_tasks_campaign
            ON tasks(campaign_id);

        CREATE INDEX IF NOT EXISTS idx_tasks_scheduled
            ON tasks(scheduled_at);
    """)
    conn.commit()
    logger.info("[migrations] Step 3 — tasks table OK")

    # ── Step 4: broadcast_workers and worker_heartbeats ───────────────────────

    logger.info("[migrations] Step 4 — worker registry tables")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS broadcast_workers (
            worker_id      TEXT    PRIMARY KEY,
            pid            INTEGER,
            status         TEXT    NOT NULL DEFAULT 'idle',
            current_task   TEXT,
            tasks_done     INTEGER NOT NULL DEFAULT 0,
            tasks_failed   INTEGER NOT NULL DEFAULT 0,
            started_at     TEXT    NOT NULL DEFAULT (datetime('now')),
            last_heartbeat TEXT    NOT NULL DEFAULT (datetime('now')),
            last_error     TEXT
        );

        CREATE TABLE IF NOT EXISTS worker_heartbeats (
            worker_id       TEXT    PRIMARY KEY,
            last_seen       TEXT    NOT NULL DEFAULT (datetime('now')),
            status          TEXT    NOT NULL DEFAULT 'idle',
            tasks_completed INTEGER NOT NULL DEFAULT 0,
            tasks_failed    INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_worker_hb_last_seen
            ON worker_heartbeats(last_seen);

        CREATE INDEX IF NOT EXISTS idx_broadcast_workers_heartbeat
            ON broadcast_workers(last_heartbeat);
    """)
    conn.commit()
    logger.info("[migrations] Step 4 — worker registry tables OK")

    # ── Step 5: Additive column migrations ───────────────────────────────────
    #
    # Every column added here is idempotent: _add_col swallows OperationalError
    # when the column already exists.  Order within each table does not matter.

    logger.info("[migrations] Step 5 — additive column migrations")

    # sender_accounts — full column surface
    _add_cols(conn, "sender_accounts", [
        # Core identity & credentials
        ("label",               "TEXT    NOT NULL DEFAULT ''"),
        ("telegram_id",         "INTEGER"),
        ("username",            "TEXT"),
        ("api_id",              "INTEGER"),
        ("api_hash",            "TEXT"),
        ("session_file",        "TEXT"),
        # Proxy management
        ("proxy",               "TEXT"),
        ("proxies",             "TEXT    NOT NULL DEFAULT '[]'"),
        ("current_proxy_index", "INTEGER NOT NULL DEFAULT 0"),
        # Authentication & operational state
        ("auth_status",         "TEXT    NOT NULL DEFAULT 'idle'"),
        ("status",              "TEXT    NOT NULL DEFAULT 'idle'"),
        # Send counters
        ("sent_today",          "INTEGER NOT NULL DEFAULT 0"),
        ("daily_limit",         "INTEGER NOT NULL DEFAULT 300"),
        ("sent_total",          "INTEGER NOT NULL DEFAULT 0"),
        ("failed_total",        "INTEGER NOT NULL DEFAULT 0"),
        # Error tracking
        ("last_error",          "TEXT"),
        ("last_used_at",        "TEXT"),
        # Flags
        ("is_banned",           "INTEGER NOT NULL DEFAULT 0"),
        ("is_active",           "INTEGER NOT NULL DEFAULT 1"),
        # Worker-hardening: distributed locking
        ("locked_by",           "TEXT"),
        ("locked_at",           "TEXT"),
        # Proxy rotation persistence
        ("proxy_index",         "INTEGER NOT NULL DEFAULT 0"),
        # Active-send guard
        ("broadcasting",        "INTEGER NOT NULL DEFAULT 0"),
        # Anti-flood
        ("flood_wait_until",    "TEXT"),
        # Pre-flight health check timestamps and result
        ("preflight_ok_at",    "TEXT"),        # last successful pre-flight (NULL = never ok)
        ("last_preflight_at",  "TEXT"),        # last check attempt (success or failure)
        ("preflight_status",   "TEXT"),        # 'ok' | 'session_invalid' | 'banned' | NULL
    ])

    # users
    _add_cols(conn, "users", [
        ("promo_targeted", "INTEGER NOT NULL DEFAULT 0"),
        ("last_promo_at",  "TEXT"),
        ("converted",      "INTEGER NOT NULL DEFAULT 0"),
        ("converted_at",   "TEXT"),
        ("tags",           "TEXT    NOT NULL DEFAULT '[]'"),
    ])

    # campaigns
    _add_cols(conn, "campaigns", [
        ("scheduled_at",       "TEXT"),
        ("scheduled_tag",      "TEXT"),
        ("notify_chat",        "INTEGER"),
        ("finished_at",        "TEXT"),
        ("notes",              "TEXT    NOT NULL DEFAULT ''"),
        ("sender_account_id",  "INTEGER"),
        ("send_delay_seconds", "INTEGER NOT NULL DEFAULT 15"),
    ])

    # sends
    _add_cols(conn, "sends", [
        ("account_id", "INTEGER"),
    ])

    # group_campaigns
    _add_cols(conn, "group_campaigns", [
        ("media_url",         "TEXT"),
        ("media_type",        "TEXT"),
        ("inline_buttons",    "TEXT NOT NULL DEFAULT '[]'"),
        ("pin_message",       "INTEGER NOT NULL DEFAULT 0"),
        ("notes",             "TEXT    NOT NULL DEFAULT ''"),
        ("interval_seconds",  "INTEGER NOT NULL DEFAULT 86400"),
        ("next_send_at",      "TEXT"),
        ("last_sent_at",      "TEXT"),
        ("sent_count",        "INTEGER NOT NULL DEFAULT 0"),
        ("failed_count",      "INTEGER NOT NULL DEFAULT 0"),
        ("updated_at",        "TEXT    NOT NULL DEFAULT (datetime('now'))"),
    ])

    # group_campaign_sends
    _add_cols(conn, "group_campaign_sends", [
        ("group_title", "TEXT"),
        ("account_id",  "INTEGER"),
        ("task_id",     "INTEGER"),
        ("error",       "TEXT"),
    ])

    # tasks — add columns that existing INTEGER-PK installs may be missing
    _add_cols(conn, "tasks", [
        ("type",         "TEXT    NOT NULL DEFAULT 'group_broadcast'"),
        ("completed_at", "TEXT"),
        ("worker_id",    "TEXT"),
        ("campaign_id",  "INTEGER"),
        ("priority",     "INTEGER NOT NULL DEFAULT 5"),
        ("claimed_at",   "TEXT"),
        ("attempts",     "INTEGER NOT NULL DEFAULT 0"),
        ("max_attempts", "INTEGER NOT NULL DEFAULT 3"),
        ("scheduled_at", "TEXT"),
        ("error",        "TEXT"),
        # Resume-cursor: last group_id confirmed sent; diagnostic only —
        # the authoritative cursor is rebuilt from group_send_logs at task start.
        ("cursor_group", "TEXT"),
    ])

    # broadcast_workers — widen current_task to TEXT for UUID task IDs
    _add_cols(conn, "broadcast_workers", [
        ("pid",       "INTEGER"),
        ("last_error","TEXT"),
    ])

    logger.info("[migrations] Step 5 — additive column migrations OK")

    # ── Step 5.5: group_send_logs ─────────────────────────────────────────────
    #
    # groupbroadcaster._log_send() writes to THIS table (not group_campaign_sends).
    # The (campaign_id, task_id, status) covering index powers the resume-cursor
    # query at task start: which groups were already successfully sent in a
    # previous partial run of the same task_id?
    #
    # Without this table, _log_send() calls fail silently (the exception is caught
    # and only logged at DEBUG level), meaning zero send history is ever persisted.

    logger.info("[migrations] Step 5.5 — group_send_logs (broadcaster send log)")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS group_send_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            group_id    TEXT    NOT NULL,
            group_title TEXT,
            account_id  INTEGER,
            task_id     INTEGER,
            status      TEXT    NOT NULL,
            error       TEXT,
            sent_at     TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Covering index for the resume-cursor query:
        --   SELECT group_id FROM group_send_logs
        --   WHERE campaign_id=? AND task_id=? AND status='ok'
        CREATE INDEX IF NOT EXISTS idx_gsl_cursor
            ON group_send_logs(campaign_id, task_id, status);

        -- Chronological lookup by campaign for the send-log UI
        CREATE INDEX IF NOT EXISTS idx_gsl_campaign_time
            ON group_send_logs(campaign_id, sent_at);
    """)
    conn.commit()
    logger.info("[migrations] Step 5.5 — group_send_logs OK")

    # ── Step 6: All indexes ───────────────────────────────────────────────────
    #
    # CREATE INDEX IF NOT EXISTS is idempotent.  Every index is logged.

    logger.info("[migrations] Step 6 — indexes")

    index_pairs: list[tuple[str, str]] = [
        # campaigns
        ("idx_campaigns_status",           "campaigns(status)"),
        ("idx_campaigns_scheduled",        "campaigns(scheduled_at)"),
        # sends
        ("idx_sends_campaign",             "sends(campaign_id)"),
        ("idx_sends_account",              "sends(account_id)"),
        ("idx_sends_chat",                 "sends(chat_id)"),
        # users
        ("idx_users_promo_targeted",       "users(promo_targeted)"),
        # sender_accounts — auth_status index (required by spec)
        ("idx_sender_accounts_auth_status","sender_accounts(auth_status)"),
        ("idx_sender_accounts_status",     "sender_accounts(status)"),
        ("idx_sender_accounts_phone",      "sender_accounts(phone)"),
        # account_groups
        ("idx_account_groups_account",     "account_groups(account_id)"),
        # group_campaigns
        ("idx_group_campaigns_status",     "group_campaigns(status)"),
        ("idx_group_campaigns_next_send",  "group_campaigns(next_send_at)"),
        # group_campaign_sends
        ("idx_group_campaign_sends_camp",  "group_campaign_sends(campaign_id)"),
        ("idx_group_campaign_sends_group", "group_campaign_sends(group_id)"),
        # tasks — required by spec: status + worker_id
        ("idx_tasks_status",               "tasks(status)"),
        ("idx_tasks_worker_id",            "tasks(worker_id)"),
        ("idx_tasks_campaign",             "tasks(campaign_id)"),
        ("idx_tasks_scheduled",            "tasks(scheduled_at)"),
        # broadcast_workers
        ("idx_broadcast_workers_heartbeat","broadcast_workers(last_heartbeat)"),
        # worker_heartbeats
        ("idx_worker_hb_last_seen",        "worker_heartbeats(last_seen)"),
    ]

    for idx_name, idx_target in index_pairs:
        _create_index(conn, idx_name, idx_target)

    conn.commit()
    logger.info("[migrations] Step 6 — %d indexes ensured", len(index_pairs))

    # ── Step 7: Data fixups ───────────────────────────────────────────────────
    #
    # Normalise any legacy values that would conflict with the new defaults.

    logger.info("[migrations] Step 7 — data fixups")

    # Reset any campaigns stuck in 'running' state (e.g. from a hard crash)
    cur = conn.execute(
        "UPDATE campaigns SET status = 'draft' WHERE status = 'running'"
    )
    if cur.rowcount:
        logger.info(
            "[migrations] Reset %d stuck campaign(s) from 'running' → 'draft'",
            cur.rowcount,
        )

    # Normalise NULL proxies columns to the empty-array sentinel
    conn.execute(
        "UPDATE sender_accounts SET proxies = '[]' WHERE proxies IS NULL"
    )
    conn.execute(
        "UPDATE sender_accounts SET current_proxy_index = 0 "
        "WHERE current_proxy_index IS NULL"
    )

    conn.commit()
    logger.info("[migrations] Step 7 — data fixups OK")

    # ── Done ─────────────────────────────────────────────────────────────────

    conn.close()
    logger.info("[migrations] Done.")


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )
    target = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    run_migrations(target)
    print("Migrations complete.")
