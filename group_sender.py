"""Group campaign sender — sends messages to Telegram groups on a schedule."""
import asyncio
import json
import logging
import random
from datetime import datetime, timedelta

import aiosqlite

import campaign_db as db
from campaign_sender import get_telethon_client, resolve_spintax

logger = logging.getLogger(__name__)

DB_PATH = db.DB_PATH

CREATE_GROUP_CAMPAIGNS = """
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
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
)
"""

CREATE_GROUP_SENDS = """
CREATE TABLE IF NOT EXISTS group_sends (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    group_id    TEXT    NOT NULL,
    group_title TEXT,
    account_id  INTEGER,
    status      TEXT    NOT NULL,
    error       TEXT,
    sent_at     TEXT    DEFAULT (datetime('now'))
)
"""

_active_group: dict = {}
_group_scheduler_task = None


async def ensure_group_tables():
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(CREATE_GROUP_CAMPAIGNS)
        await conn.execute(CREATE_GROUP_SENDS)
        await conn.commit()


async def list_group_campaigns() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(CREATE_GROUP_CAMPAIGNS)
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM group_campaigns ORDER BY created_at DESC"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_group_campaign(cid: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(CREATE_GROUP_CAMPAIGNS)
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM group_campaigns WHERE id = ?", (cid,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def get_due_group_campaigns() -> list[dict]:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(CREATE_GROUP_CAMPAIGNS)
        conn.row_factory = aiosqlite.Row
        async with conn.execute("""
            SELECT * FROM group_campaigns
            WHERE status = 'running'
              AND (next_send_at IS NULL OR next_send_at <= ?)
        """, (now,)) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def send_group_campaign(campaign_id: int) -> dict:
    """Execute one round of sends for a group campaign."""
    campaign = await get_group_campaign(campaign_id)
    if not campaign:
        return {"ok": False, "error": "Campaign not found"}

    account_id = campaign.get("sender_account_id")
    if not account_id:
        return {"ok": False, "error": "No sender account assigned"}

    account = await db.get_account_by_id(account_id)
    if not account:
        return {"ok": False, "error": "Sender account not found"}

    client = await get_telethon_client(account)
    if not client:
        return {"ok": False, "error": "Could not connect Telethon client"}

    selected_groups = json.loads(campaign.get("selected_groups") or "[]")
    if not selected_groups:
        return {"ok": False, "error": "No groups selected"}

    text_template = campaign["text_template"]
    sent   = 0
    failed = 0
    now    = datetime.now().isoformat()

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(CREATE_GROUP_SENDS)
        for group_id in selected_groups:
            try:
                text = resolve_spintax(text_template)
                # get group title from cache for logging
                group_title = group_id
                try:
                    async with conn.execute(
                        "SELECT group_title FROM account_groups WHERE account_id = ? AND group_id = ?",
                        (account_id, group_id)
                    ) as cur:
                        r = await cur.fetchone()
                        if r:
                            group_title = r[0]
                except Exception:
                    pass

                await client.send_message(int(group_id), text, parse_mode="md")
                await conn.execute("""
                    INSERT INTO group_sends (campaign_id, group_id, group_title, account_id, status, sent_at)
                    VALUES (?, ?, ?, ?, 'ok', ?)
                """, (campaign_id, group_id, group_title, account_id, now))
                sent += 1
                logger.info(f"Group campaign {campaign_id}: sent to {group_title} ({group_id})")
                await asyncio.sleep(random.uniform(2.0, 5.0))
            except Exception as e:
                err = str(e)[:200]
                logger.error(f"Group campaign {campaign_id}: send error for {group_id}: {err}")
                await conn.execute("""
                    INSERT INTO group_sends (campaign_id, group_id, account_id, status, error, sent_at)
                    VALUES (?, ?, ?, 'failed', ?, ?)
                """, (campaign_id, group_id, account_id, err, now))
                failed += 1

        interval = int(campaign.get("interval_seconds") or 86400)
        next_send = (datetime.now() + timedelta(seconds=interval)).isoformat()

        await conn.execute("""
            UPDATE group_campaigns
            SET sent_count   = sent_count + ?,
                failed_count = failed_count + ?,
                last_sent_at = ?,
                next_send_at = ?,
                updated_at   = ?
            WHERE id = ?
        """, (sent, failed, now, next_send, now, campaign_id))
        await conn.commit()

    return {"ok": True, "sent": sent, "failed": failed, "next_send_at": next_send}


async def group_scheduler_loop():
    """Background loop: executes due group campaigns every 30 seconds."""
    logger.info("📢 Group campaign scheduler started")
    await ensure_group_tables()
    while True:
        try:
            due = await get_due_group_campaigns()
            for camp in due:
                cid = camp["id"]
                if cid not in _active_group:
                    _active_group[cid] = True

                    async def _run(campaign_id=cid):
                        try:
                            result = await send_group_campaign(campaign_id)
                            logger.info(f"Group campaign {campaign_id} round done: {result}")
                        except Exception as e:
                            logger.error(f"Group campaign {campaign_id} error: {e}")
                        finally:
                            _active_group.pop(campaign_id, None)

                    asyncio.create_task(_run())
        except Exception as e:
            logger.error(f"Group scheduler loop error: {e}")
        await asyncio.sleep(30)


def start_group_scheduler():
    global _group_scheduler_task
    if _group_scheduler_task is None or _group_scheduler_task.done():
        _group_scheduler_task = asyncio.create_task(group_scheduler_loop())
        logger.info("✅ Group scheduler task created")
