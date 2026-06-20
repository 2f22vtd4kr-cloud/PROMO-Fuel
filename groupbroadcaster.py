"""Group Broadcasting Engine — sends messages to Telegram groups via Telethon.

Features:
  - Per-account FileLock to prevent "database is locked" Telethon errors
  - Proxy rotation from accounts.proxies JSON array
  - Full spintax resolution per message
  - Media attachment support (photo/video/document)
  - Inline button support
  - Anti-ban: jitter, tiered delays, flood-wait handling
  - Full error recovery and structured logging
  - Rate limiting via utils.ratelimiter

Usage (called by worker.py):
    from groupbroadcaster import run_group_campaign_task
    result = await run_group_campaign_task(task, worker_id="worker-1")
"""
import asyncio
import json
import logging
import os
import random
import sqlite3
from datetime import datetime
from filelock import FileLock, Timeout

import aiosqlite
from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError,
    PeerFloodError,
    ChatWriteForbiddenError,
    UserBannedInChannelError,
    ChannelPrivateError,
    SlowModeWaitError,
    UserDeactivatedBanError,
)
from telethon.tl.types import InputMediaUploadedPhoto, InputMediaUploadedDocument

import campaign_db as cdb
from utils.proxy import parse_proxies, pick_proxy, proxy_to_telethon, proxy_label
from utils.spintax import resolve as resolve_spintax
from utils.ratelimiter import PerAccountRateLimiter

logger = logging.getLogger(__name__)

DB_PATH      = os.getenv("DB_PATH", "campaigns.db")
SESSIONS_DIR = os.getenv("SESSION_DIR", "./sessions")

# Per-account file locks to prevent Telethon "database is locked" when multiple
# workers try to use the same account simultaneously.
_account_locks: dict[int, FileLock] = {}

# Per-account Telethon rate limiter: max 20 messages per 60 seconds
_rate_limiter = PerAccountRateLimiter(rate=20, per=60.0)

# Cached Telethon clients: account_id → TelegramClient
_telethon_clients: dict[int, TelegramClient] = {}


# ── Account locking ──────────────────────────────────────────────────────────

def _account_lock(account_id: int) -> FileLock:
    if account_id not in _account_locks:
        path = os.path.join(SESSIONS_DIR, f"account_{account_id}.lock")
        _account_locks[account_id] = FileLock(path, timeout=30)
    return _account_locks[account_id]


# ── Telethon client management ───────────────────────────────────────────────

async def _get_client(account: dict, proxy: dict | None = None) -> TelegramClient | None:
    """Return a connected, authorized TelegramClient for an account."""
    acc_id   = account["id"]
    sess     = account.get("session_file") or ""
    api_id   = account.get("api_id")
    api_hash = account.get("api_hash")

    if not (sess and api_id and api_hash):
        logger.warning(f"[broadcaster] Account {acc_id}: missing session/api_id/api_hash")
        return None

    # Reuse cached client
    if acc_id in _telethon_clients:
        client = _telethon_clients[acc_id]
        try:
            if client.is_connected() and await client.is_user_authorized():
                return client
        except Exception:
            pass
        try:
            await client.disconnect()
        except Exception:
            pass
        del _telethon_clients[acc_id]

    sess_path = sess.removesuffix(".session") if sess.endswith(".session") else sess
    tel_proxy = proxy_to_telethon(proxy) if proxy else None

    kwargs: dict = {}
    if tel_proxy:
        kwargs["proxy"] = tel_proxy

    client = TelegramClient(sess_path, int(api_id), str(api_hash), **kwargs)
    try:
        await client.connect()
        if not await client.is_user_authorized():
            logger.warning(f"[broadcaster] Account {acc_id}: session expired/revoked")
            await client.disconnect()
            return None
        _telethon_clients[acc_id] = client
        logger.info(f"[broadcaster] Account {acc_id} connected via proxy={proxy_label(proxy)}")
        return client
    except Exception as e:
        logger.error(f"[broadcaster] Account {acc_id} connect error: {e}")
        try:
            await client.disconnect()
        except Exception:
            pass
        return None


async def _release_client(account_id: int) -> None:
    if account_id in _telethon_clients:
        try:
            await _telethon_clients[account_id].disconnect()
        except Exception:
            pass
        del _telethon_clients[account_id]


# ── Jitter delays ────────────────────────────────────────────────────────────

async def _inter_message_delay(sent_count: int, min_delay: float = 2.5, max_delay: float = 6.0) -> None:
    """Tiered human-like delay between sends."""
    base = random.uniform(min_delay, max(max_delay, min_delay + 0.5))
    extra = 0.0
    if sent_count > 0 and sent_count % 50 == 0:
        extra = random.uniform(90.0, 200.0)
        logger.info(f"[broadcaster] Long break after {sent_count} sends ({extra:.0f}s)")
    elif sent_count > 0 and sent_count % 20 == 0:
        extra = random.uniform(30.0, 75.0)
        logger.info(f"[broadcaster] Short break after {sent_count} sends ({extra:.0f}s)")
    elif sent_count > 0 and sent_count % 5 == 0:
        extra = random.uniform(8.0, 20.0)
    await asyncio.sleep(base + extra)


# ── Message sending ──────────────────────────────────────────────────────────

async def _send_to_group(
    client: TelegramClient,
    group_id: str,
    text: str,
    media_url: str | None = None,
    media_type: str | None = None,
    inline_buttons: list | None = None,
    pin: bool = False,
) -> None:
    """Send a message to a single group. Raises on unrecoverable errors."""
    from telethon.tl.types import ReplyInlineMarkup, KeyboardButtonUrl, KeyboardButtonRow

    buttons = None
    if inline_buttons:
        rows = []
        for row in inline_buttons:
            if not isinstance(row, list):
                row = [row]
            btn_row = []
            for btn in row:
                if isinstance(btn, dict):
                    btn_row.append(KeyboardButtonUrl(
                        text=btn.get("text", "—"),
                        url=btn.get("url", "https://t.me"),
                    ))
            if btn_row:
                rows.append(KeyboardButtonRow(buttons=btn_row))
        if rows:
            buttons = ReplyInlineMarkup(rows=rows)

    entity = int(group_id) if group_id.lstrip("-").isdigit() else group_id

    if media_url:
        file = await client.upload_file(media_url) if os.path.isfile(media_url) else None
        if file:
            await client.send_file(
                entity, file,
                caption=text, parse_mode="md",
                buttons=buttons,
                force_document=(media_type == "document"),
            )
        else:
            await client.send_message(entity, text, parse_mode="md", buttons=buttons)
    else:
        msg = await client.send_message(entity, text, parse_mode="md", buttons=buttons)
        if pin and msg:
            try:
                await client.pin_message(entity, msg)
            except Exception as e:
                logger.debug(f"[broadcaster] Pin failed for {group_id}: {e}")


# ── Main task runner ─────────────────────────────────────────────────────────

async def run_group_campaign_task(task: dict, worker_id: str = "worker") -> dict:
    """Execute one task from the queue — send to all groups for a group campaign.

    Returns a result dict with keys: ok, sent, failed, errors.
    """
    campaign_id = task["campaign_id"]
    task_id     = task["id"]
    results     = {"ok": True, "sent": 0, "failed": 0, "errors": []}

    # Load campaign
    campaign = await _get_campaign(campaign_id)
    if not campaign:
        return {"ok": False, "sent": 0, "failed": 0, "errors": ["Campaign not found"]}

    task_payload: dict = {}
    try:
        task_payload = json.loads(task.get("payload") or "{}")
    except Exception:
        pass
    is_test_task = task_payload.get("test", False)

    if not is_test_task and campaign.get("status") not in ("running", "draft"):
        return {"ok": False, "sent": 0, "failed": 0, "errors": [f"Campaign status: {campaign.get('status')}"]}

    # Load sender account
    account_id = campaign.get("sender_account_id")
    if not account_id:
        return {"ok": False, "sent": 0, "failed": 0, "errors": ["No sender_account_id"]}

    account = await cdb.get_account_by_id(account_id)
    if not account or account.get("is_banned") or not account.get("is_active"):
        return {"ok": False, "sent": 0, "failed": 0, "errors": [f"Account {account_id} unavailable"]}

    # Parse proxies and pick one
    proxies = parse_proxies(account.get("proxies") or account.get("proxy"))
    proxy   = pick_proxy(proxies, account_id=account_id)
    if proxy:
        logger.info(f"[broadcaster] Task #{task_id} using proxy {proxy_label(proxy)}")

    # Acquire per-account file lock
    lock = _account_lock(account_id)
    try:
        lock.acquire(timeout=30)
    except Timeout:
        return {"ok": False, "sent": 0, "failed": 0, "errors": [f"Account {account_id} locked by another worker"]}

    client = None
    try:
        client = await _get_client(account, proxy=proxy)
        if not client:
            # Try next proxy on connect failure
            if len(proxies) > 1:
                proxy = pick_proxy(proxies, account_id=account_id)
                client = await _get_client(account, proxy=proxy)
        if not client:
            return {"ok": False, "sent": 0, "failed": 0, "errors": ["Could not connect Telethon client"]}

        # Test mode: override group list with payload's group_ids
        payload_data: dict = {}
        try:
            payload_data = json.loads(task.get("payload") or "{}")
        except Exception:
            pass
        is_test = payload_data.get("test", False)

        if is_test and payload_data.get("group_ids"):
            selected_groups = [str(g) for g in payload_data["group_ids"]]
            logger.info(f"[broadcaster] Task #{task_id} TEST mode — groups: {selected_groups}")
        else:
            selected_groups = json.loads(campaign.get("selected_groups") or "[]")

        if not selected_groups:
            return {"ok": False, "sent": 0, "failed": 0, "errors": ["No groups selected"]}

        text_template   = campaign.get("text_template", "")
        media_url       = campaign.get("media_url")
        media_type      = campaign.get("media_type")
        pin             = bool(campaign.get("pin_message", 0))
        inline_buttons  = json.loads(campaign.get("inline_buttons") or "[]")
        min_delay       = float(campaign.get("min_delay_seconds") or 2.5)
        max_delay       = float(campaign.get("max_delay_seconds") or 6.0)
        daily_limit     = int(campaign.get("daily_limit") or 0)

        # Enrich group titles from cache
        group_meta = await _get_group_meta(account_id, selected_groups)

        sent_count = 0
        for group_id in selected_groups:
            # Enforce daily limit
            if daily_limit > 0 and results["sent"] >= daily_limit:
                logger.info(f"[broadcaster] Daily limit {daily_limit} reached for campaign {campaign_id}")
                break

            # Apply rate limit
            await _rate_limiter.acquire(account_id)

            group_title = group_meta.get(str(group_id), str(group_id))
            text = resolve_spintax(text_template)

            try:
                await _send_to_group(
                    client, str(group_id), text,
                    media_url=media_url,
                    media_type=media_type,
                    inline_buttons=inline_buttons,
                    pin=pin,
                )
                await _log_send(campaign_id, str(group_id), group_title, account_id, task_id, "ok")
                results["sent"] += 1
                sent_count += 1
                logger.info(f"[broadcaster] ✓ Task #{task_id} → {group_title} ({group_id})")
                await _inter_message_delay(sent_count, min_delay=min_delay, max_delay=max_delay)

            except FloodWaitError as e:
                wait = e.seconds + random.randint(5, 15)
                logger.warning(f"[broadcaster] FloodWait {e.seconds}s for account {account_id}, sleeping {wait}s")
                await cdb.account_flood_wait(account_id, e.seconds)
                await asyncio.sleep(wait)
                # Retry once after flood wait
                try:
                    await _send_to_group(client, str(group_id), text,
                                         media_url=media_url, media_type=media_type,
                                         inline_buttons=inline_buttons, pin=pin)
                    await _log_send(campaign_id, str(group_id), group_title, account_id, task_id, "ok")
                    results["sent"] += 1
                    sent_count += 1
                except Exception as e2:
                    err = str(e2)[:200]
                    results["failed"] += 1
                    results["errors"].append(f"{group_id}: {err}")
                    await _log_send(campaign_id, str(group_id), group_title, account_id, task_id, "failed", err)

            except PeerFloodError:
                logger.error(f"[broadcaster] PeerFloodError — account {account_id} rate-limited by Telegram")
                await cdb.account_flood_wait(account_id, 3600)
                results["failed"] += len(selected_groups) - results["sent"] - results["failed"]
                results["errors"].append(f"PeerFloodError — account {account_id} stopped")
                break

            except UserDeactivatedBanError:
                logger.error(f"[broadcaster] Account {account_id} is banned/deactivated")
                await cdb.account_flag_banned(account_id, "UserDeactivatedBanError")
                results["errors"].append(f"Account {account_id} banned — stopping")
                break

            except (ChatWriteForbiddenError, UserBannedInChannelError, ChannelPrivateError) as e:
                err = str(e)[:120]
                logger.warning(f"[broadcaster] Group {group_id} inaccessible: {err}")
                results["failed"] += 1
                results["errors"].append(f"{group_id}: {err}")
                await _log_send(campaign_id, str(group_id), group_title, account_id, task_id, "failed", err)

            except SlowModeWaitError as e:
                logger.warning(f"[broadcaster] SlowMode {e.seconds}s for {group_id}, skipping")
                results["failed"] += 1
                err = f"SlowMode {e.seconds}s"
                results["errors"].append(f"{group_id}: {err}")
                await _log_send(campaign_id, str(group_id), group_title, account_id, task_id, "slow_mode", err)

            except Exception as e:
                err = str(e)[:200]
                logger.error(f"[broadcaster] Error sending to {group_id}: {err}")
                results["failed"] += 1
                results["errors"].append(f"{group_id}: {err}")
                await _log_send(campaign_id, str(group_id), group_title, account_id, task_id, "failed", err)

        # Update campaign aggregate counts
        await _update_campaign_counts(campaign_id, results["sent"], results["failed"])

    finally:
        lock.release()
        # Don't disconnect — reuse client across tasks
        # But mark account idle
        if account_id:
            await cdb.account_mark_idle(account_id)

    results["ok"] = results["failed"] == 0 or results["sent"] > 0
    return results


# ── DB helpers ───────────────────────────────────────────────────────────────

async def _get_campaign(campaign_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM group_campaigns WHERE id=?", (campaign_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def _get_group_meta(account_id: int, group_ids: list) -> dict[str, str]:
    """Return {group_id: group_title} for the given account."""
    if not group_ids:
        return {}
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        placeholders = ",".join("?" * len(group_ids))
        async with conn.execute(
            f"SELECT group_id, group_title FROM account_groups WHERE account_id=? AND group_id IN ({placeholders})",
            [account_id] + [str(g) for g in group_ids]
        ) as cur:
            rows = await cur.fetchall()
    return {r["group_id"]: r["group_title"] or r["group_id"] for r in rows}


async def _log_send(
    campaign_id: int, group_id: str, group_title: str,
    account_id: int, task_id: int, status: str, error: str | None = None
) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("""
            INSERT INTO group_campaign_sends
                (campaign_id, group_id, group_title, account_id, task_id, status, error, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            campaign_id, group_id, group_title, account_id, task_id,
            status, error, datetime.now().isoformat()
        ))
        await conn.commit()


async def _update_campaign_counts(campaign_id: int, sent: int, failed: int) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("""
            UPDATE group_campaigns
            SET sent_count   = sent_count + ?,
                failed_count = failed_count + ?,
                last_sent_at = ?,
                updated_at   = ?
            WHERE id=?
        """, (sent, failed, datetime.now().isoformat(), datetime.now().isoformat(), campaign_id))
        await conn.commit()
