import aiosqlite
import json
from contextlib import asynccontextmanager
from datetime import datetime

DB_PATH = "campaigns.db"


@asynccontextmanager
async def _db(path: str = DB_PATH):
    """Async context manager that opens an aiosqlite connection with the three
    mandatory concurrency pragmas applied before yielding.

    Pragma rationale
    ----------------
    journal_mode=WAL      Multiple readers never block a writer and vice-versa.
    synchronous=NORMAL    Safe for WAL mode; avoids per-commit fsync overhead.
    busy_timeout=30000    Retry on SQLITE_BUSY for up to 30 s instead of
                          immediately raising — critical under multi-worker load.
    """
    async with aiosqlite.connect(path) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA busy_timeout=30000")
        await conn.execute("PRAGMA foreign_keys=ON")
        yield conn

CREATE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    chat_id        INTEGER PRIMARY KEY,
    username       TEXT,
    first_name     TEXT,
    first_seen     TEXT NOT NULL,
    last_seen      TEXT NOT NULL,
    tags           TEXT DEFAULT '[]',
    promo_targeted INTEGER DEFAULT 0,
    last_promo_at  TEXT
);

CREATE TABLE IF NOT EXISTS campaigns (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT UNIQUE NOT NULL,
    text_template TEXT NOT NULL,
    status        TEXT DEFAULT 'draft',
    created_at    TEXT NOT NULL,
    started_at    TEXT,
    finished_at   TEXT,
    target_count  INTEGER DEFAULT 0,
    sent_count    INTEGER DEFAULT 0,
    failed_count  INTEGER DEFAULT 0,
    dry_run       INTEGER DEFAULT 0,
    scheduled_at  TEXT,
    scheduled_tag TEXT,
    notify_chat   INTEGER
);

CREATE TABLE IF NOT EXISTS sends (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    chat_id     INTEGER NOT NULL,
    account_id  INTEGER,
    status      TEXT NOT NULL,
    sent_at     TEXT NOT NULL,
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
    session_file  TEXT,
    proxy         TEXT,
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
"""


async def init_db():
    async with _db(DB_PATH) as db:
        for stmt in CREATE_SCHEMA.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                await db.execute(stmt)
        await db.commit()
        # Migrate existing DBs — add new columns if absent
        for col, definition in [
            ("promo_targeted", "INTEGER DEFAULT 0"),
            ("last_promo_at",  "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass
        for col, definition in [
            ("scheduled_at",  "TEXT"),
            ("scheduled_tag", "TEXT"),
            ("notify_chat",   "INTEGER"),
            ("finished_at",   "TEXT"),
            ("notes",         "TEXT DEFAULT ''"),
        ]:
            try:
                await db.execute(f"ALTER TABLE campaigns ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass
        for col, definition in [
            ("account_id", "INTEGER"),
        ]:
            try:
                await db.execute(f"ALTER TABLE sends ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass
        # V3 user column migrations
        for col, definition in [
            ("converted",    "INTEGER DEFAULT 0"),
            ("converted_at", "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass
        # Campaign new columns
        for col, definition in [
            ("sender_account_id", "INTEGER"),
            ("send_delay_seconds", "INTEGER DEFAULT 15"),
        ]:
            try:
                await db.execute(f"ALTER TABLE campaigns ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass
        # sender_accounts: flood_wait_until + api creds + daily_limit
        for col, definition in [
            ("api_id",           "INTEGER"),
            ("api_hash",         "TEXT"),
            ("flood_wait_until", "TEXT"),
            ("daily_limit",      "INTEGER NOT NULL DEFAULT 300"),
        ]:
            try:
                await db.execute(f"ALTER TABLE sender_accounts ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass
        # Uploads table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS uploads (
                key TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                entries_json TEXT NOT NULL,
                uploaded_at TEXT DEFAULT (datetime('now')),
                imported_count INTEGER DEFAULT 0
            )
        """)
        await db.commit()
        # sender_accounts column migrations
        for col, definition in [
            ("label",        "TEXT NOT NULL DEFAULT ''"),
            ("proxy",        "TEXT"),
            ("session_file", "TEXT"),
            ("is_banned",    "INTEGER NOT NULL DEFAULT 0"),
            ("is_active",    "INTEGER NOT NULL DEFAULT 1"),
            ("sent_today",   "INTEGER NOT NULL DEFAULT 0"),
            ("sent_total",   "INTEGER NOT NULL DEFAULT 0"),
            ("failed_total", "INTEGER NOT NULL DEFAULT 0"),
            ("last_error",   "TEXT"),
            ("last_used_at", "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE sender_accounts ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass  # column already exists


async def upsert_user(chat_id: int, username: str = None, first_name: str = None) -> bool:
    """Upsert a user record. Returns True if the user is new (first /start)."""
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        r = await (await db.execute(
            "SELECT 1 FROM users WHERE chat_id = ?", (chat_id,)
        )).fetchone()
        is_new = r is None
        await db.execute("""
            INSERT INTO users (chat_id, username, first_name, first_seen, last_seen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(chat_id) DO UPDATE SET
                last_seen = excluded.last_seen,
                username  = COALESCE(excluded.username, username),
                first_name = COALESCE(excluded.first_name, first_name)
        """, (chat_id, username, first_name, now, now))
        await db.commit()
        return is_new


async def get_all_users():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users ORDER BY first_seen") as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_users_by_tag(tag: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users") as cur:
            rows = [dict(r) for r in await cur.fetchall()]
    return [r for r in rows if tag in json.loads(r.get("tags") or "[]")]


async def get_untargeted_users() -> list[dict]:
    """Return users who have never received a promo (promo_targeted = 0)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE promo_targeted = 0 ORDER BY first_seen"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_untargeted_users_by_tag(tag: str) -> list[dict]:
    """Return un-targeted users filtered by tag."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE promo_targeted = 0"
        ) as cur:
            rows = [dict(r) for r in await cur.fetchall()]
    return [r for r in rows if tag in json.loads(r.get("tags") or "[]")]


async def get_untargeted_users_for_campaign(campaign_id: int, tag: str = None) -> list[dict]:
    """Cross-account-safe: exclude users already messaged for this campaign.

    Combines global promo_targeted flag with per-campaign sends dedup so
    switching sender accounts mid-campaign never double-messages anyone.
    """
    async with aiosqlite.connect(DB_PATH) as db_conn:
        db_conn.row_factory = aiosqlite.Row
        async with db_conn.execute("""
            SELECT * FROM users
            WHERE promo_targeted = 0
              AND chat_id NOT IN (
                SELECT DISTINCT chat_id FROM sends
                WHERE campaign_id = ? AND status IN ('ok', 'ok_retry', 'dry_run')
              )
            ORDER BY first_seen
        """, (campaign_id,)) as cur:
            rows = [dict(r) for r in await cur.fetchall()]
    if tag:
        rows = [r for r in rows if tag in json.loads(r.get("tags") or "[]")]
    return rows


async def is_promo_targeted(chat_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT promo_targeted FROM users WHERE chat_id = ?", (chat_id,)
        ) as cur:
            row = await cur.fetchone()
    return bool(row and row[0])


async def mark_user_as_promo_targeted(chat_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET promo_targeted = 1, last_promo_at = ? WHERE chat_id = ?",
            (datetime.now().isoformat(), chat_id)
        )
        await db.commit()


async def tag_user(chat_id: int, tag: str):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT tags FROM users WHERE chat_id = ?", (chat_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            return
        tags = json.loads(row[0] or "[]")
        if tag not in tags:
            tags.append(tag)
        await db.execute("UPDATE users SET tags = ? WHERE chat_id = ?",
                         (json.dumps(tags, ensure_ascii=False), chat_id))
        await db.commit()


async def create_campaign(name: str, text: str, dry_run: bool = False) -> int:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            INSERT INTO campaigns (name, text_template, status, created_at, dry_run)
            VALUES (?, ?, 'draft', ?, ?)
        """, (name, text, now, int(dry_run)))
        await db.commit()
        return cur.lastrowid


async def get_campaign(name: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM campaigns WHERE name = ?", (name,)) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def get_campaign_by_id(cid: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM campaigns WHERE id = ?", (cid,)) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def list_campaigns() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM campaigns ORDER BY created_at DESC") as cur:
            return [dict(r) for r in await cur.fetchall()]


async def update_campaign_status(campaign_id: int, status: str, **kwargs):
    now = datetime.now().isoformat()
    fields = {"status": status}
    if status == "running" and "started_at" not in kwargs:
        fields["started_at"] = now
    if status in ("done", "cancelled"):
        fields["finished_at"] = now
    fields.update(kwargs)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [campaign_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE campaigns SET {set_clause} WHERE id = ?", values)
        await db.commit()


async def increment_campaign_counts(campaign_id: int, sent: int = 0, failed: int = 0):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE campaigns
            SET sent_count = sent_count + ?, failed_count = failed_count + ?
            WHERE id = ?
        """, (sent, failed, campaign_id))
        await db.commit()


async def log_send(campaign_id: int, chat_id: int, status: str, error: str = None, account_id: int = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO sends (campaign_id, chat_id, status, sent_at, error, account_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (campaign_id, chat_id, status, datetime.now().isoformat(), error, account_id))
        await db.commit()


async def schedule_campaign(campaign_id: int, scheduled_at: str,
                            tag: str = None, notify_chat: int = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE campaigns
            SET status = 'scheduled', scheduled_at = ?, scheduled_tag = ?, notify_chat = ?
            WHERE id = ?
        """, (scheduled_at, tag, notify_chat, campaign_id))
        await db.commit()


async def unschedule_campaign(name: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            UPDATE campaigns SET status = 'draft', scheduled_at = NULL,
            scheduled_tag = NULL, notify_chat = NULL
            WHERE name = ? AND status = 'scheduled'
        """, (name,))
        await db.commit()
        return cur.rowcount > 0


async def get_due_campaigns() -> list[dict]:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM campaigns
            WHERE status = 'scheduled' AND scheduled_at <= ?
        """, (now,)) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def delete_campaign(name: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("DELETE FROM campaigns WHERE name = ? AND status NOT IN ('running')", (name,))
        await db.commit()
        return cur.rowcount > 0


async def get_scheduled_campaigns() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM campaigns WHERE status = 'scheduled' ORDER BY scheduled_at"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_campaign_sends(campaign_id: int, limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT s.*, u.username, u.first_name
            FROM sends s LEFT JOIN users u ON s.chat_id = u.chat_id
            WHERE s.campaign_id = ?
            ORDER BY s.sent_at DESC LIMIT ?
        """, (campaign_id, limit)) as cur:
            return [dict(r) for r in await cur.fetchall()]


# ── Sender account helpers ───────────────────────────────────────────────────

async def get_active_accounts() -> list[dict]:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        # Auto-clear expired flood_wait status
        await db.execute("""
            UPDATE sender_accounts
            SET status = 'idle', flood_wait_until = NULL
            WHERE status = 'flood_wait'
              AND flood_wait_until IS NOT NULL
              AND flood_wait_until <= ?
        """, (now,))
        await db.commit()
        async with db.execute("""
            SELECT * FROM sender_accounts
            WHERE is_active = 1
              AND is_banned = 0
              AND (flood_wait_until IS NULL OR flood_wait_until <= ?)
              AND sent_today < COALESCE(daily_limit, 300)
            ORDER BY sent_today ASC
        """, (now,)) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_account_by_id(account_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db_conn:
        db_conn.row_factory = aiosqlite.Row
        async with db_conn.execute(
            "SELECT * FROM sender_accounts WHERE id = ?", (account_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def get_account_by_phone(phone: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM sender_accounts WHERE phone = ?", (phone,)) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def upsert_account(phone: str, **kwargs) -> int:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            INSERT INTO sender_accounts (phone, created_at)
            VALUES (?, ?)
            ON CONFLICT(phone) DO UPDATE SET phone = excluded.phone
        """, (phone, now))
        await db.commit()
        acc_id = cur.lastrowid if cur.lastrowid else (
            await (await db.execute("SELECT id FROM sender_accounts WHERE phone = ?", (phone,))).fetchone()
        )[0]
        if kwargs:
            fields = ", ".join(f"{k} = ?" for k in kwargs)
            await db.execute(
                f"UPDATE sender_accounts SET {fields} WHERE id = ?",
                list(kwargs.values()) + [acc_id]
            )
            await db.commit()
    return acc_id


async def account_mark_sending(account_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sender_accounts SET status = 'sending', last_used_at = ? WHERE id = ?",
            (datetime.now().isoformat(), account_id)
        )
        await db.commit()


async def account_mark_idle(account_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sender_accounts SET status = 'idle' WHERE id = ?",
            (account_id,)
        )
        await db.commit()


async def account_record_send(account_id: int, success: bool, error: str = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        if success:
            await db.execute("""
                UPDATE sender_accounts
                SET sent_today = sent_today + 1,
                    sent_total = sent_total + 1,
                    last_error = NULL,
                    last_used_at = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), account_id))
        else:
            await db.execute("""
                UPDATE sender_accounts
                SET failed_total = failed_total + 1,
                    last_error = ?,
                    last_used_at = ?
                WHERE id = ?
            """, (error, datetime.now().isoformat(), account_id))
        await db.commit()


async def account_flag_banned(account_id: int, error: str = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE sender_accounts
            SET is_banned = 1, status = 'banned', last_error = ?
            WHERE id = ?
        """, (error, account_id))
        await db.commit()


async def account_flood_wait(account_id: int, seconds: int) -> None:
    from datetime import timedelta
    until = (datetime.now() + timedelta(seconds=seconds)).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE sender_accounts
            SET status = 'flood_wait',
                flood_wait_until = ?,
                last_error = ?
            WHERE id = ?
        """, (until, f"FloodWait {seconds}s", account_id))
        await db.commit()


async def reset_daily_counts() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE sender_accounts SET sent_today = 0")
        await db.commit()


async def log_send_with_account(campaign_id: int, chat_id: int, status: str,
                                 account_id: int = None, error: str = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO sends (campaign_id, chat_id, account_id, status, sent_at, error)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (campaign_id, chat_id, account_id, status, datetime.now().isoformat(), error))
        await db.commit()


async def get_campaign_account_breakdown(campaign_id: int) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT
                sa.id, sa.label, sa.phone, sa.username,
                COUNT(*) as total,
                SUM(CASE WHEN s.status = 'ok' THEN 1 ELSE 0 END) as ok,
                SUM(CASE WHEN s.status = 'error' THEN 1 ELSE 0 END) as errors
            FROM sends s
            JOIN sender_accounts sa ON sa.id = s.account_id
            WHERE s.campaign_id = ?
            GROUP BY s.account_id
            ORDER BY total DESC
        """, (campaign_id,)) as cur:
            return [dict(r) for r in await cur.fetchall()]
