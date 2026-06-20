"""Group Broadcasting Engine — sends messages to Telegram groups via Telethon.

Features:
  - Per-account FileLock to prevent "database is locked" Telethon errors
  - Full proxy rotation: cycles through all proxies on failure, tracks per-proxy
    failure counts and skips persistently failing proxies
  - Reconnect with next proxy on connection or transient send failure
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
import time
from datetime import datetime
from typing import Literal

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

import campaign_db as cdb
from utils.proxy import parse_proxies, proxy_to_telethon, proxy_label
from utils.spintax import resolve as resolve_spintax
from utils.ratelimiter import PerAccountRateLimiter

logger = logging.getLogger(__name__)

DB_PATH      = os.getenv("DB_PATH", "campaigns.db")
SESSIONS_DIR = os.getenv("SESSION_DIR", "./sessions")

# Per-account file locks — prevent concurrent Telethon sessions on the same .session file
_account_locks: dict[int, FileLock] = {}

# Per-account Telethon rate limiter: max 20 messages per 60 seconds
_rate_limiter = PerAccountRateLimiter(rate=20, per=60.0)

# Cached Telethon clients: account_id → TelegramClient
_telethon_clients: dict[int, TelegramClient] = {}

# Per-proxy failure tracking: proxy_label → (count, last_failure_monotonic)
_proxy_failures: dict[str, tuple[int, float]] = {}
_PROXY_FAIL_WINDOW = 300   # seconds — reset count after 5 min without new failures
_PROXY_FAIL_SKIP   = 5     # skip proxy after this many failures within the window


# ── Account file locking ──────────────────────────────────────────────────────

def _account_lock(account_id: int) -> FileLock:
    if account_id not in _account_locks:
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        path = os.path.join(SESSIONS_DIR, f"account_{account_id}.lock")
        _account_locks[account_id] = FileLock(path, timeout=30)
    return _account_locks[account_id]


# ── Proxy rotation helpers ────────────────────────────────────────────────────

def _record_proxy_fail(label: str) -> None:
    count, _ = _proxy_failures.get(label, (0, 0.0))
    _proxy_failures[label] = (count + 1, time.monotonic())


def _proxy_fail_count(label: str) -> int:
    count, ts = _proxy_failures.get(label, (0, 0.0))
    if time.monotonic() - ts > _PROXY_FAIL_WINDOW:
        _proxy_failures.pop(label, None)
        return 0
    return count


def _rank_proxies(proxies: list[dict]) -> list[dict]:
    """Return proxies sorted by failure count ascending (least-failed first)."""
    valid = [p for p in proxies if p.get("host")]
    return sorted(valid, key=lambda p: _proxy_fail_count(proxy_label(p)))


# ── Telethon client management ────────────────────────────────────────────────

async def _disconnect_account(account_id: int) -> None:
    """Disconnect and evict cached client for an account."""
    client = _telethon_clients.pop(account_id, None)
    if client:
        try:
            await client.disconnect()
        except Exception:
            pass


async def _connect_with_proxy(account: dict, proxy: dict | None) -> TelegramClient | None:
    """Create a fresh TelegramClient with the given proxy. Returns None on failure."""
    acc_id   = account["id"]
    sess     = account.get("session_file") or ""
    api_id   = account.get("api_id")
    api_hash = account.get("api_hash")

    if not (sess and api_id and api_hash):
        logger.warning(f"[broadcaster] Account {acc_id}: missing session/api_id/api_hash")
        return None

    sess_path = sess.removesuffix(".session") if sess.endswith(".session") else sess
    tel_proxy = proxy_to_telethon(proxy) if proxy else None

    client = TelegramClient(
        sess_path, int(api_id), str(api_hash),
        **({"proxy": tel_proxy} if tel_proxy else {}),
    )
    try:
        await client.connect()
        if not await client.is_user_authorized():
            logger.warning(f"[broadcaster] Account {acc_id}: session expired or revoked")
            await client.disconnect()
            return None
        logger.info(f"[broadcaster] Account {acc_id} ✓ connected via {proxy_label(proxy)}")
        return client
    except Exception as e:
        logger.error(f"[broadcaster] Account {acc_id} connect error via {proxy_label(proxy)}: {e}")
        try:
            await client.disconnect()
        except Exception:
            pass
        _record_proxy_fail(proxy_label(proxy))
        return None


async def _get_or_connect(account: dict, proxy: dict | None) -> TelegramClient | None:
    """Return a healthy cached client or connect a new one."""
    acc_id = account["id"]
    existing = _telethon_clients.get(acc_id)
    if existing:
        try:
            if existing.is_connected() and await existing.is_user_authorized():
                return existing
        except Exception:
            pass
        await _disconnect_account(acc_id)

    client = await _connect_with_proxy(account, proxy)
    if client:
        _telethon_clients[acc_id] = client
    return client


async def _rotate_to_next_proxy(
    account: dict,
    proxies: list[dict],
    failed_label: str | None,
) -> tuple[TelegramClient | None, dict | None]:
    """Disconnect current client and try the next proxy in ranked order.

    Returns (new_client, used_proxy) or (None, None) if all proxies are exhausted.
    """
    acc_id = account["id"]
    await _disconnect_account(acc_id)

    ranked = _rank_proxies(proxies)

    for proxy in ranked:
        label = proxy_label(proxy)
        if label == failed_label:
            continue  # skip the one that just failed
        if _proxy_fail_count(label) >= _PROXY_FAIL_SKIP:
            logger.debug(f"[broadcaster] Skipping proxy {label!r} ({_proxy_fail_count(label)} failures)")
            continue
        client = await _connect_with_proxy(account, proxy)
        if client:
            _telethon_clients[acc_id] = client
            return client, proxy
        # _connect_with_proxy already records failure

    # All proxies exhausted — try no-proxy as last resort
    logger.warning(f"[broadcaster] Account {acc_id}: all proxies failed, attempting direct connection")
    client = await _connect_with_proxy(account, None)
    if client:
        _telethon_clients[acc_id] = client
    return client, None


async def _initial_connect(
    account: dict,
    proxies: list[dict],
) -> tuple[TelegramClient | None, dict | None]:
    """Connect account, trying proxies in failure-ranked order.

    Returns (client, used_proxy).
    """
    if not proxies:
        client = await _get_or_connect(account, None)
        return client, None

    ranked = _rank_proxies(proxies)
    for proxy in ranked:
        label = proxy_label(proxy)
        if _proxy_fail_count(label) >= _PROXY_FAIL_SKIP:
            continue
        client = await _get_or_connect(account, proxy)
        if client:
            return client, proxy

    # Last resort — no proxy
    client = await _get_or_connect(account, None)
    return client, None


# ── Jitter delays ─────────────────────────────────────────────────────────────

async def _inter_message_delay(sent: int, min_d: float, max_d: float) -> None:
    base  = random.uniform(min_d, max(max_d, min_d + 0.5))
    extra = 0.0
    if sent > 0 and sent % 50 == 0:
        extra = random.uniform(90.0, 200.0)
        logger.info(f"[broadcaster] Long break after {sent} sends ({extra:.0f}s)")
    elif sent > 0 and sent % 20 == 0:
        extra = random.uniform(30.0, 75.0)
        logger.info(f"[broadcaster] Short break after {sent} sends ({extra:.0f}s)")
    elif sent > 0 and sent % 5 == 0:
        extra = random.uniform(8.0, 20.0)
    await asyncio.sleep(base + extra)


# ── Single-group send ─────────────────────────────────────────────────────────

async def _send_to_group(
    client: TelegramClient,
    group_id: str,
    text: str,
    media_url: str | None = None,
    media_type: str | None = None,
    inline_buttons: list | None = None,
    pin: bool = False,
) -> None:
    """Send message to a single group. Raises on any error."""
    from telethon.tl.types import ReplyInlineMarkup, KeyboardButtonUrl, KeyboardButtonRow

    buttons = None
    if inline_buttons:
        rows = []
        for row in inline_buttons:
            if not isinstance(row, list):
                row = [row]
            btn_row = [
                KeyboardButtonUrl(text=btn.get("text", "—"), url=btn.get("url", "https://t.me"))
                for btn in row if isinstance(btn, dict)
            ]
            if btn_row:
                rows.append(KeyboardButtonRow(buttons=btn_row))
        if rows:
            buttons = ReplyInlineMarkup(rows=rows)

    entity = int(group_id) if group_id.lstrip("-").isdigit() else group_id

    if media_url and os.path.isfile(media_url):
        file = await client.upload_file(media_url)
        await client.send_file(
            entity, file,
            caption=text, parse_mode="md",
            buttons=buttons,
            force_document=(media_type == "document"),
        )
    else:
        msg = await client.send_message(entity, text, parse_mode="md", buttons=buttons)
        if pin and msg:
            try:
                await client.pin_message(entity, msg)
            except Exception as e:
                logger.debug(f"[broadcaster] Pin failed for {group_id}: {e}")


# ── Send result sentinel ──────────────────────────────────────────────────────

SendResult = Literal["sent", "group_error", "abort_task"]


async def _try_send(
    client_ref: list,          # [client] — mutable so rotation can update it
    proxy_ref:  list,          # [proxy]  — mutable
    account: dict,
    proxies: list[dict],
    group_id: str,
    text: str,
    media_url: str | None,
    media_type: str | None,
    inline_buttons: list | None,
    pin: bool,
) -> tuple[SendResult, str | None]:
    """Attempt to send to one group with automatic proxy rotation on failure.

    Returns (result, error_string | None).
    """
    client = client_ref[0]
    proxy  = proxy_ref[0]

    for attempt in range(2):
        try:
            await _send_to_group(
                client, group_id, text,
                media_url=media_url,
                media_type=media_type,
                inline_buttons=inline_buttons,
                pin=pin,
            )
            return "sent", None

        except FloodWaitError as e:
            wait = e.seconds + random.randint(5, 15)
            logger.warning(f"[broadcaster] FloodWait {e.seconds}s — sleeping {wait}s then retry")
            await cdb.account_flood_wait(account["id"], e.seconds)
            await asyncio.sleep(wait)
            continue  # retry same connection (flood is account-level, not proxy)

        except PeerFloodError:
            await cdb.account_flood_wait(account["id"], 3600)
            return "abort_task", "PeerFloodError — account rate-limited globally"

        except UserDeactivatedBanError:
            await cdb.account_flag_banned(account["id"], "UserDeactivatedBanError")
            return "abort_task", f"Account {account['id']} banned/deactivated"

        except (ChatWriteForbiddenError, UserBannedInChannelError, ChannelPrivateError) as e:
            return "group_error", str(e)[:120]

        except SlowModeWaitError as e:
            return "group_error", f"SlowModeWait {e.seconds}s"

        except Exception as e:
            err = str(e)[:200]
            if attempt == 0 and proxies:
                # Rotate to next proxy and retry once
                failed_label = proxy_label(proxy)
                _record_proxy_fail(failed_label)
                logger.warning(f"[broadcaster] Send error ({err}) — rotating proxy from {failed_label!r}")
                new_client, new_proxy = await _rotate_to_next_proxy(
                    account, proxies, failed_label
                )
                if new_client:
                    client_ref[0] = new_client
                    proxy_ref[0]  = new_proxy
                    client = new_client
                    proxy  = new_proxy
                    logger.info(f"[broadcaster] Rotated to {proxy_label(new_proxy)}, retrying {group_id}")
                    continue  # retry send
                else:
                    logger.error(f"[broadcaster] All proxies exhausted for account {account['id']}")
                    return "group_error", f"proxy exhausted: {err}"
            else:
                return "group_error", err

    return "group_error", "Max send attempts reached"


# ── Main task runner ──────────────────────────────────────────────────────────

async def run_group_campaign_task(task: dict, worker_id: str = "worker") -> dict:
    """Execute one task — send to all groups for a group campaign.

    Returns {ok, sent, failed, errors}.
    """
    campaign_id = task["campaign_id"]
    task_id     = task["id"]
    results     = {"ok": True, "sent": 0, "failed": 0, "errors": []}

    campaign = await _get_campaign(campaign_id)
    if not campaign:
        return {"ok": False, "sent": 0, "failed": 0, "errors": ["Campaign not found"]}

    task_payload: dict = {}
    try:
        task_payload = json.loads(task.get("payload") or "{}")
    except Exception:
        pass
    is_test = task_payload.get("test", False)

    if not is_test and campaign.get("status") not in ("running", "draft"):
        return {"ok": False, "sent": 0, "failed": 0,
                "errors": [f"Campaign status: {campaign.get('status')}"]}

    account_id = campaign.get("sender_account_id")
    if not account_id:
        return {"ok": False, "sent": 0, "failed": 0, "errors": ["No sender_account_id"]}

    account = await cdb.get_account_by_id(account_id)
    if not account or account.get("is_banned") or not account.get("is_active"):
        return {"ok": False, "sent": 0, "failed": 0,
                "errors": [f"Account {account_id} unavailable"]}

    proxies = parse_proxies(account.get("proxies") or account.get("proxy"))

    # Acquire per-account file lock
    lock = _account_lock(account_id)
    try:
        lock.acquire(timeout=30)
    except Timeout:
        return {"ok": False, "sent": 0, "failed": 0,
                "errors": [f"Account {account_id} file-locked by another worker"]}

    try:
        # Connect with proxy rotation
        client, active_proxy = await _initial_connect(account, proxies)
        if not client:
            return {"ok": False, "sent": 0, "failed": 0,
                    "errors": ["Could not connect Telethon client (all proxies failed)"]}

        logger.info(f"[broadcaster] Task #{task_id} using {proxy_label(active_proxy)} "
                    f"(worker {worker_id!r})")

        # Mutable refs so _try_send can update client/proxy in-place on rotation
        client_ref = [client]
        proxy_ref  = [active_proxy]

        # Resolve group list
        if is_test and task_payload.get("group_ids"):
            selected_groups = [str(g) for g in task_payload["group_ids"]]
            logger.info(f"[broadcaster] TEST mode — groups: {selected_groups}")
        else:
            selected_groups = json.loads(campaign.get("selected_groups") or "[]")

        if not selected_groups:
            return {"ok": False, "sent": 0, "failed": 0, "errors": ["No groups selected"]}

        text_template  = campaign.get("text_template", "")
        media_url      = campaign.get("media_url")
        media_type     = campaign.get("media_type")
        pin            = bool(campaign.get("pin_message", 0))
        inline_buttons = json.loads(campaign.get("inline_buttons") or "[]")
        min_delay      = float(campaign.get("min_delay_seconds") or 2.5)
        max_delay      = float(campaign.get("max_delay_seconds") or 6.0)
        daily_limit    = int(campaign.get("daily_limit") or 0)

        group_meta = await _get_group_meta(account_id, selected_groups)
        sent_count = 0

        for group_id in selected_groups:
            if daily_limit > 0 and results["sent"] >= daily_limit:
                logger.info(f"[broadcaster] Daily limit {daily_limit} reached — stopping")
                break

            await _rate_limiter.acquire(account_id)

            group_title = group_meta.get(str(group_id), str(group_id))
            text = resolve_spintax(text_template)

            outcome, err_msg = await _try_send(
                client_ref, proxy_ref, account, proxies,
                str(group_id), text, media_url, media_type, inline_buttons, pin,
            )

            if outcome == "sent":
                await _log_send(campaign_id, str(group_id), group_title,
                                account_id, task_id, "ok")
                results["sent"] += 1
                sent_count += 1
                logger.info(f"[broadcaster] ✓ #{task_id} → {group_title}")
                await _inter_message_delay(sent_count, min_delay, max_delay)

            elif outcome == "group_error":
                await _log_send(campaign_id, str(group_id), group_title,
                                account_id, task_id, "failed", err_msg)
                results["failed"] += 1
                results["errors"].append(f"{group_id}: {err_msg}")
                logger.warning(f"[broadcaster] ✗ #{task_id} → {group_title}: {err_msg}")
                await _inter_message_delay(sent_count, min_delay, max_delay)

            elif outcome == "abort_task":
                results["errors"].append(err_msg or "Task aborted")
                logger.error(f"[broadcaster] ✗ Task #{task_id} aborted: {err_msg}")
                # Count remaining groups as failed
                remaining = len(selected_groups) - results["sent"] - results["failed"]
                results["failed"] += remaining
                break

        await _update_campaign_counts(campaign_id, results["sent"], results["failed"])

    finally:
        lock.release()
        if account_id:
            await cdb.account_mark_idle(account_id)

    results["ok"] = results["sent"] > 0 or results["failed"] == 0
    return results


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _get_campaign(campaign_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM group_campaigns WHERE id=?", (campaign_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def _get_group_meta(account_id: int, group_ids: list) -> dict[str, str]:
    if not group_ids:
        return {}
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        ph = ",".join("?" * len(group_ids))
        async with conn.execute(
            f"SELECT group_id, group_title FROM account_groups "
            f"WHERE account_id=? AND group_id IN ({ph})",
            [account_id] + [str(g) for g in group_ids]
        ) as cur:
            rows = await cur.fetchall()
    return {r["group_id"]: r["group_title"] or r["group_id"] for r in rows}


async def _log_send(
    campaign_id: int, group_id: str, group_title: str,
    account_id: int, task_id: int, status: str, error: str | None = None,
) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """INSERT INTO group_campaign_sends
               (campaign_id, group_id, group_title, account_id, task_id, status, error, sent_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (campaign_id, group_id, group_title, account_id, task_id,
             status, error, datetime.now().isoformat()),
        )
        await conn.commit()


async def _update_campaign_counts(campaign_id: int, sent: int, failed: int) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """UPDATE group_campaigns
               SET sent_count   = sent_count + ?,
                   failed_count = failed_count + ?,
                   last_sent_at = ?,
                   updated_at   = ?
               WHERE id=?""",
            (sent, failed, datetime.now().isoformat(), datetime.now().isoformat(), campaign_id),
        )
        await conn.commit()
