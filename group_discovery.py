"""Discover and cache Telegram groups/channels for sender accounts via Telethon."""
import aiosqlite
import logging
from datetime import datetime

import campaign_db as db

logger = logging.getLogger(__name__)

CREATE_GROUPS_TABLE = """
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
)
"""


async def ensure_table():
    async with aiosqlite.connect(db.DB_PATH) as conn:
        await conn.execute(CREATE_GROUPS_TABLE)
        await conn.commit()


async def fetch_and_cache_groups(account_id: int, telethon_client) -> list[dict]:
    """Fetch all groups/channels the account is in and cache to account_groups."""
    from telethon.tl.types import Chat, Channel

    groups = []
    try:
        async for dialog in telethon_client.iter_dialogs():
            entity = dialog.entity
            if not isinstance(entity, (Chat, Channel)):
                continue

            if isinstance(entity, Channel):
                group_type = "channel" if entity.broadcast else "supergroup"
            else:
                group_type = "group"

            group_id    = str(entity.id)
            group_title = getattr(entity, "title", f"Group {group_id}")
            username    = getattr(entity, "username", None)
            member_count = getattr(entity, "participants_count", 0) or 0

            groups.append({
                "account_id":   account_id,
                "group_id":     group_id,
                "group_title":  group_title,
                "group_type":   group_type,
                "member_count": member_count,
                "username":     username,
            })
    except Exception as e:
        logger.error(f"fetch_and_cache_groups account={account_id}: {e}")

    if groups:
        await _save_groups(account_id, groups)
    else:
        # still mark a refresh happened
        await _mark_refreshed(account_id)

    logger.info(f"Cached {len(groups)} groups for account {account_id}")
    return groups


async def _save_groups(account_id: int, groups: list[dict]) -> None:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(db.DB_PATH) as conn:
        await conn.execute(CREATE_GROUPS_TABLE)
        await conn.execute(
            "UPDATE account_groups SET is_active = 0 WHERE account_id = ?",
            (account_id,)
        )
        for g in groups:
            await conn.execute("""
                INSERT INTO account_groups
                    (account_id, group_id, group_title, group_type, member_count, username, is_active, refreshed_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(account_id, group_id) DO UPDATE SET
                    group_title  = excluded.group_title,
                    group_type   = excluded.group_type,
                    member_count = excluded.member_count,
                    username     = excluded.username,
                    is_active    = 1,
                    refreshed_at = excluded.refreshed_at
            """, (
                account_id, g["group_id"], g["group_title"],
                g["group_type"], g["member_count"], g["username"], now
            ))
        await conn.commit()


async def _mark_refreshed(account_id: int) -> None:
    now = datetime.now().isoformat()
    async with aiosqlite.connect(db.DB_PATH) as conn:
        await conn.execute(CREATE_GROUPS_TABLE)
        await conn.execute(
            "UPDATE account_groups SET refreshed_at = ? WHERE account_id = ?",
            (now, account_id)
        )
        await conn.commit()


async def get_cached_groups(account_id: int) -> list[dict]:
    """Return active cached groups for this account."""
    async with aiosqlite.connect(db.DB_PATH) as conn:
        await conn.execute(CREATE_GROUPS_TABLE)
        await conn.commit()
        conn.row_factory = aiosqlite.Row
        async with conn.execute("""
            SELECT * FROM account_groups
            WHERE account_id = ? AND is_active = 1
            ORDER BY group_title ASC
        """, (account_id,)) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_all_cached_groups() -> list[dict]:
    """Return all active groups across all accounts (for admin overview)."""
    async with aiosqlite.connect(db.DB_PATH) as conn:
        await conn.execute(CREATE_GROUPS_TABLE)
        await conn.commit()
        conn.row_factory = aiosqlite.Row
        async with conn.execute("""
            SELECT ag.*, sa.phone, sa.label, sa.username as account_username
            FROM account_groups ag
            JOIN sender_accounts sa ON sa.id = ag.account_id
            WHERE ag.is_active = 1
            ORDER BY ag.group_title ASC
        """) as cur:
            return [dict(r) for r in await cur.fetchall()]
