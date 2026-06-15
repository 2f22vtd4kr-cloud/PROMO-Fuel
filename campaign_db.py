import aiosqlite
import json
from datetime import datetime

DB_PATH = "campaigns.db"

CREATE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    chat_id     INTEGER PRIMARY KEY,
    username    TEXT,
    first_name  TEXT,
    first_seen  TEXT NOT NULL,
    last_seen   TEXT NOT NULL,
    tags        TEXT DEFAULT '[]'
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
    status      TEXT NOT NULL,
    sent_at     TEXT NOT NULL,
    error       TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        for stmt in CREATE_SCHEMA.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                await db.execute(stmt)
        await db.commit()
        # Migrate existing DBs — add new columns if absent
        for col, definition in [
            ("scheduled_at",  "TEXT"),
            ("scheduled_tag", "TEXT"),
            ("notify_chat",   "INTEGER"),
        ]:
            try:
                await db.execute(f"ALTER TABLE campaigns ADD COLUMN {col} {definition}")
                await db.commit()
            except Exception:
                pass  # column already exists


async def upsert_user(chat_id: int, username: str = None, first_name: str = None):
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO users (chat_id, username, first_name, first_seen, last_seen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(chat_id) DO UPDATE SET
                last_seen = excluded.last_seen,
                username  = COALESCE(excluded.username, username),
                first_name = COALESCE(excluded.first_name, first_name)
        """, (chat_id, username, first_name, now, now))
        await db.commit()


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


async def log_send(campaign_id: int, chat_id: int, status: str, error: str = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO sends (campaign_id, chat_id, status, sent_at, error)
            VALUES (?, ?, ?, ?, ?)
        """, (campaign_id, chat_id, status, datetime.now().isoformat(), error))
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
