"""Database migration runner — applies all schema upgrades idempotently.

Run directly:   python dbmigrations.py
Or import:      from dbmigrations import run_migrations; run_migrations()

All migrations are idempotent (safe to run multiple times).
Uses WAL mode for all connections to improve concurrency.
"""
import logging
import os
import sqlite3

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")


def _conn(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _add_col(conn: sqlite3.Connection, table: str, col: str, definition: str) -> None:
    """Add a column to a table if it doesn't already exist."""
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
        conn.commit()
        logger.debug(f"  + {table}.{col}")
    except sqlite3.OperationalError:
        pass  # column already exists


def run_migrations(db_path: str = DB_PATH) -> None:
    logger.info(f"[migrations] Running against {db_path}")
    conn = _conn(db_path)

    # ── 1. Core tables (idempotent CREATE IF NOT EXISTS) ─────────────────────

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            chat_id        INTEGER PRIMARY KEY,
            username       TEXT,
            first_name     TEXT,
            first_seen     TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen      TEXT NOT NULL DEFAULT (datetime('now')),
            tags           TEXT DEFAULT '[]',
            promo_targeted INTEGER DEFAULT 0,
            last_promo_at  TEXT,
            converted      INTEGER DEFAULT 0,
            converted_at   TEXT
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            name              TEXT UNIQUE NOT NULL,
            text_template     TEXT NOT NULL,
            status            TEXT DEFAULT 'draft',
            created_at        TEXT NOT NULL DEFAULT (datetime('now')),
            started_at        TEXT,
            finished_at       TEXT,
            target_count      INTEGER DEFAULT 0,
            sent_count        INTEGER DEFAULT 0,
            failed_count      INTEGER DEFAULT 0,
            dry_run           INTEGER DEFAULT 0,
            scheduled_at      TEXT,
            scheduled_tag     TEXT,
            notify_chat       INTEGER,
            notes             TEXT DEFAULT '',
            sender_account_id INTEGER,
            send_delay_seconds INTEGER DEFAULT 15
        );

        CREATE TABLE IF NOT EXISTS sends (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            chat_id     INTEGER NOT NULL,
            account_id  INTEGER,
            status      TEXT NOT NULL,
            sent_at     TEXT NOT NULL DEFAULT (datetime('now')),
            error       TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
            FOREIGN KEY (account_id)  REFERENCES sender_accounts(id)
        );

        CREATE TABLE IF NOT EXISTS sender_accounts (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            label         TEXT NOT NULL DEFAULT '',
            phone         TEXT UNIQUE NOT NULL,
            telegram_id   INTEGER,
            username      TEXT,
            api_id        INTEGER,
            api_hash      TEXT,
            session_file  TEXT,
            proxy         TEXT,
            proxies       TEXT DEFAULT '[]',
            auth_status   TEXT NOT NULL DEFAULT 'pending',
            status        TEXT NOT NULL DEFAULT 'idle',
            sent_today    INTEGER NOT NULL DEFAULT 0,
            sent_total    INTEGER NOT NULL DEFAULT 0,
            failed_total  INTEGER NOT NULL DEFAULT 0,
            last_error    TEXT,
            last_used_at  TEXT,
            is_banned     INTEGER NOT NULL DEFAULT 0,
            is_active     INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS uploads (
            key            TEXT PRIMARY KEY,
            filename       TEXT NOT NULL,
            entries_json   TEXT NOT NULL,
            uploaded_at    TEXT DEFAULT (datetime('now')),
            imported_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS message_templates (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT UNIQUE NOT NULL,
            body       TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS account_groups (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id   INTEGER NOT NULL,
            group_id     TEXT    NOT NULL,
            group_title  TEXT,
            group_type   TEXT    DEFAULT 'group',
            member_count INTEGER DEFAULT 0,
            username     TEXT,
            is_active    INTEGER DEFAULT 1,
            refreshed_at TEXT    DEFAULT (datetime('now')),
            UNIQUE(account_id, group_id)
        );

        CREATE TABLE IF NOT EXISTS group_campaigns (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            name              TEXT NOT NULL,
            text_template     TEXT NOT NULL,
            status            TEXT DEFAULT 'draft',
            sender_account_id INTEGER,
            selected_groups   TEXT DEFAULT '[]',
            interval_seconds  INTEGER DEFAULT 86400,
            next_send_at      TEXT,
            last_sent_at      TEXT,
            sent_count        INTEGER DEFAULT 0,
            failed_count      INTEGER DEFAULT 0,
            notes             TEXT DEFAULT '',
            media_url         TEXT,
            media_type        TEXT,
            inline_buttons    TEXT DEFAULT '[]',
            pin_message       INTEGER DEFAULT 0,
            created_at        TEXT DEFAULT (datetime('now')),
            updated_at        TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS group_campaign_sends (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            group_id    TEXT    NOT NULL,
            group_title TEXT,
            account_id  INTEGER,
            task_id     INTEGER,
            status      TEXT    NOT NULL,
            error       TEXT,
            sent_at     TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            task_type     TEXT    NOT NULL DEFAULT 'group_broadcast',
            campaign_id   INTEGER NOT NULL,
            payload       TEXT    NOT NULL DEFAULT '{}',
            status        TEXT    NOT NULL DEFAULT 'pending',
            priority      INTEGER NOT NULL DEFAULT 5,
            worker_id     TEXT,
            claimed_at    TEXT,
            started_at    TEXT,
            finished_at   TEXT,
            attempts      INTEGER NOT NULL DEFAULT 0,
            max_attempts  INTEGER NOT NULL DEFAULT 3,
            error         TEXT,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            scheduled_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS broadcast_workers (
            worker_id      TEXT PRIMARY KEY,
            pid            INTEGER,
            status         TEXT NOT NULL DEFAULT 'idle',
            current_task   INTEGER,
            tasks_done     INTEGER NOT NULL DEFAULT 0,
            tasks_failed   INTEGER NOT NULL DEFAULT 0,
            started_at     TEXT NOT NULL DEFAULT (datetime('now')),
            last_heartbeat TEXT NOT NULL DEFAULT (datetime('now')),
            last_error     TEXT
        );
    """)
    conn.commit()

    # ── 1b. Additional tables added in later versions ─────────────────────────

    conn.executescript("""
        -- Dedicated real-time heartbeat table (separate from broadcast_workers lifecycle)
        CREATE TABLE IF NOT EXISTS worker_heartbeats (
            worker_id       TEXT PRIMARY KEY,
            last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
            status          TEXT NOT NULL DEFAULT 'idle',
            tasks_completed INTEGER NOT NULL DEFAULT 0,
            tasks_failed    INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_worker_hb_last_seen
            ON worker_heartbeats(last_seen);
    """)
    conn.commit()

    # ── 2. Additive column migrations (safe ALTER TABLE ADD COLUMN) ──────────

    # sender_accounts
    for col, defn in [
        ("proxies",          "TEXT DEFAULT '[]'"),
        ("auth_status",      "TEXT NOT NULL DEFAULT 'pending'"),
        ("api_id",           "INTEGER"),
        ("api_hash",         "TEXT"),
        ("label",            "TEXT NOT NULL DEFAULT ''"),
        ("proxy",            "TEXT"),
        ("session_file",     "TEXT"),
        ("is_banned",        "INTEGER NOT NULL DEFAULT 0"),
        ("is_active",        "INTEGER NOT NULL DEFAULT 1"),
        ("sent_today",       "INTEGER NOT NULL DEFAULT 0"),
        ("sent_total",       "INTEGER NOT NULL DEFAULT 0"),
        ("failed_total",     "INTEGER NOT NULL DEFAULT 0"),
        ("last_error",       "TEXT"),
        ("last_used_at",     "TEXT"),
        # ── Worker-hardening additions ──────────────────────────────────────
        ("locked_by",        "TEXT"),                     # worker_id holding the lock
        ("locked_at",        "TEXT"),                     # ISO timestamp of lock acquisition
        ("proxy_index",      "INTEGER DEFAULT 0"),        # persisted rotation index
        ("broadcasting",     "INTEGER NOT NULL DEFAULT 0"),# 1 while actively sending
        ("flood_wait_until", "TEXT"),                     # earliest allowed retry time
    ]:
        _add_col(conn, "sender_accounts", col, defn)

    # users
    for col, defn in [
        ("promo_targeted", "INTEGER DEFAULT 0"),
        ("last_promo_at",  "TEXT"),
        ("converted",      "INTEGER DEFAULT 0"),
        ("converted_at",   "TEXT"),
    ]:
        _add_col(conn, "users", col, defn)

    # campaigns
    for col, defn in [
        ("scheduled_at",       "TEXT"),
        ("scheduled_tag",      "TEXT"),
        ("notify_chat",        "INTEGER"),
        ("finished_at",        "TEXT"),
        ("notes",              "TEXT DEFAULT ''"),
        ("sender_account_id",  "INTEGER"),
        ("send_delay_seconds", "INTEGER DEFAULT 15"),
    ]:
        _add_col(conn, "campaigns", col, defn)

    # sends
    _add_col(conn, "sends", "account_id", "INTEGER")

    # group_campaigns
    for col, defn in [
        ("media_url",      "TEXT"),
        ("media_type",     "TEXT"),
        ("inline_buttons", "TEXT DEFAULT '[]'"),
        ("pin_message",    "INTEGER DEFAULT 0"),
    ]:
        _add_col(conn, "group_campaigns", col, defn)

    # ── 3. Indexes ────────────────────────────────────────────────────────────

    indexes = [
        ("idx_campaigns_status",           "campaigns(status)"),
        ("idx_campaigns_scheduled",        "campaigns(scheduled_at)"),
        ("idx_sends_campaign",             "sends(campaign_id)"),
        ("idx_sends_account",              "sends(account_id)"),
        ("idx_sends_chat",                 "sends(chat_id)"),
        ("idx_users_promo_targeted",       "users(promo_targeted)"),
        ("idx_account_groups_account",     "account_groups(account_id)"),
        ("idx_group_campaigns_status",     "group_campaigns(status)"),
        ("idx_group_campaign_sends_camp",  "group_campaign_sends(campaign_id)"),
        ("idx_tasks_status",               "tasks(status)"),
        ("idx_tasks_campaign",             "tasks(campaign_id)"),
        ("idx_tasks_scheduled",            "tasks(scheduled_at)"),
        ("idx_workers_heartbeat",          "broadcast_workers(last_heartbeat)"),
    ]
    for name, target in indexes:
        try:
            conn.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {target}")
        except sqlite3.OperationalError as e:
            logger.debug(f"  Index {name}: {e}")

    conn.commit()
    conn.close()
    logger.info("[migrations] Done.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run_migrations()
    print("Migrations complete.")
