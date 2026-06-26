"""db_sync.py — Persist campaigns.db + Telethon session files to PostgreSQL.

Called by supervisor.py to survive Replit redeploys:
  - restore_if_fresh()  : on startup, restore from PG if local DB is empty
  - save_snapshot()     : gzip DB + sessions → upsert into PG
  - start_sync_thread() : background thread, saves every SYNC_INTERVAL seconds
"""
from __future__ import annotations

import gzip
import logging
import os
import sqlite3
import threading
import time
from pathlib import Path

logger = logging.getLogger("db_sync")

SYNC_INTERVAL = 300          # seconds between periodic saves (5 min)
_DB_SNAPSHOT_KEY = "main"    # fixed key in pf_db_snapshot

# ── PostgreSQL helpers ────────────────────────────────────────────────────────

def _get_conn():
    import psycopg2
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(url, connect_timeout=10)


def _ensure_tables(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS pf_db_snapshot (
                key        TEXT PRIMARY KEY,
                db_data    BYTEA       NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS pf_session_files (
                filename   TEXT PRIMARY KEY,
                data       BYTEA       NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
    conn.commit()


# ── "Fresh" detection ─────────────────────────────────────────────────────────

def _is_fresh(db_path: str) -> bool:
    """Return True if campaigns.db has no accounts and no campaigns (just schema)."""
    try:
        conn = sqlite3.connect(db_path, timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM sender_accounts")
        accounts = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM campaigns")
        campaigns = cur.fetchone()[0]
        conn.close()
        return accounts == 0 and campaigns == 0
    except Exception:
        return True   # DB missing or schema not created yet → treat as fresh


# ── Snapshot save ─────────────────────────────────────────────────────────────

def save_snapshot(db_path: str = "", sessions_dir: str = "sessions") -> None:
    """Gzip campaigns.db + all session files and upsert into PostgreSQL."""
    if not db_path:
        db_path = os.environ.get("DB_PATH", "./data/campaigns.db")
    try:
        conn = _get_conn()
        _ensure_tables(conn)

        # ── 1. campaigns.db ──────────────────────────────────────────────
        db_file = Path(db_path)
        if db_file.exists():
            raw = db_file.read_bytes()
            compressed = gzip.compress(raw, compresslevel=6)
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO pf_db_snapshot (key, db_data, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE
                        SET db_data = EXCLUDED.db_data,
                            updated_at = NOW()
                """, (_DB_SNAPSHOT_KEY, compressed))
            conn.commit()
            logger.info(
                "[db_sync] ✓ campaigns.db saved to PG (%d KB → %d KB compressed)",
                len(raw) // 1024, len(compressed) // 1024,
            )

        # ── 2. Session files ─────────────────────────────────────────────
        sdir = Path(sessions_dir)
        if sdir.is_dir():
            session_files = list(sdir.glob("*.session"))
            saved = 0
            for sf in session_files:
                try:
                    data = sf.read_bytes()
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO pf_session_files (filename, data, updated_at)
                            VALUES (%s, %s, NOW())
                            ON CONFLICT (filename) DO UPDATE
                                SET data = EXCLUDED.data,
                                    updated_at = NOW()
                        """, (sf.name, data))
                    saved += 1
                except Exception as e:
                    logger.warning("[db_sync] Failed to save session %s: %s", sf.name, e)
            if saved:
                conn.commit()
                logger.info("[db_sync] ✓ %d session file(s) saved to PG", saved)

        conn.close()

    except Exception as exc:
        logger.warning("[db_sync] save_snapshot failed (non-fatal): %s", exc)


# ── Restore on fresh start ────────────────────────────────────────────────────

def restore_if_fresh(db_path: str = "", sessions_dir: str = "sessions") -> bool:
    """
    If the local DB is empty AND PostgreSQL has a snapshot, restore it.
    Returns True if a restore was performed.
    """
    if not db_path:
        db_path = os.environ.get("DB_PATH", "./data/campaigns.db")
    # Ensure the parent directory exists before trying to write the restored DB
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    try:
        conn = _get_conn()
        _ensure_tables(conn)

        # Check PG for a stored snapshot
        with conn.cursor() as cur:
            cur.execute("SELECT db_data, updated_at FROM pf_db_snapshot WHERE key = %s",
                        (_DB_SNAPSHOT_KEY,))
            row = cur.fetchone()

        if not row:
            logger.info("[db_sync] No PG snapshot found — starting fresh")
            conn.close()
            return False

        compressed, saved_at = row

        # Only restore if local DB is "fresh" (empty schema or missing)
        db_file = Path(db_path)
        if db_file.exists() and not _is_fresh(db_path):
            logger.info("[db_sync] Local DB has data — skipping restore (PG snapshot from %s)", saved_at)
            conn.close()
            return False

        # ── Restore campaigns.db ─────────────────────────────────────────
        raw = gzip.decompress(bytes(compressed))
        db_file.write_bytes(raw)
        logger.info(
            "[db_sync] ✓ Restored campaigns.db from PG snapshot (%s, %d KB)",
            saved_at, len(raw) // 1024,
        )

        # ── Restore session files ────────────────────────────────────────
        sdir = Path(sessions_dir)
        sdir.mkdir(exist_ok=True)
        with conn.cursor() as cur:
            cur.execute("SELECT filename, data FROM pf_session_files")
            rows = cur.fetchall()

        restored_sessions = 0
        for filename, data in rows:
            try:
                (sdir / filename).write_bytes(bytes(data))
                restored_sessions += 1
            except Exception as e:
                logger.warning("[db_sync] Failed to restore session %s: %s", filename, e)

        if restored_sessions:
            logger.info("[db_sync] ✓ Restored %d session file(s) from PG", restored_sessions)

        conn.close()
        return True

    except Exception as exc:
        logger.warning("[db_sync] restore_if_fresh failed (non-fatal): %s", exc)
        return False


# ── Background sync thread ────────────────────────────────────────────────────

_sync_stop = threading.Event()


def start_sync_thread(
    db_path: str = "campaigns.db",
    sessions_dir: str = "sessions",
    interval: int = SYNC_INTERVAL,
) -> threading.Thread:
    """Start a daemon thread that saves a snapshot every `interval` seconds."""

    def _loop() -> None:
        logger.info("[db_sync] Sync thread started — saving every %ds", interval)
        while not _sync_stop.wait(timeout=interval):
            save_snapshot(db_path, sessions_dir)
        logger.info("[db_sync] Sync thread stopped")

    t = threading.Thread(target=_loop, name="db-sync", daemon=True)
    t.start()
    return t


def stop_sync_thread() -> None:
    _sync_stop.set()
