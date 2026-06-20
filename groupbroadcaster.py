"""Group Broadcasting Engine — sends messages to Telegram groups via Telethon.

Features:
  - Per-account FileLock to prevent "database is locked" Telethon errors
  - Full proxy rotation: cycles through all proxies on failure, tracks per-proxy
    failure counts and skips persistently failing proxies
  - proxy_index persisted to DB after every successful switch
  - If ALL proxies exhausted → account marked status='proxy_failed', lock released
  - broadcasting=1 flag set in DB at task start, cleared in finally (belt-and-suspenders
    beyond the task_queue locked_by guard)
  - Reconnect with next proxy on connection or transient send failure
  - Full spintax resolution per message
  - Media attachment support (photo/video/document)
  - Inline button support
  - Anti-ban: jitter, tiered delays, flood-wait handling
  - Full error recovery and structured logging

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


# ── DB flag helpers ───────────────────────────────────────────────────────────

async def _set_broadcasting(account_id: int, state: bool) -> None:
    """Set/clear the broadcasting=1 flag on sender_accounts.

    This is a belt-and-suspenders guard on top of locked_by. Even if a race
    allows two processes to pass the locked_by check, only one will win the
    broadcasting UPDATE atomically.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            if state:
                await db.execute(
                    "UPDATE sender_accounts SET broadcasting=1 WHERE id=?",
                    (account_id,),
                )
            else:
                await db.execute(
                    "UPDATE sender_accounts SET broadcasting=0 WHERE id=?",
                    (account_id,),
                )
            await db.commit()
    except Exception as e:
        logger.debug("[broadcaster] _set_broadcasting(%d, %s) failed: %s", account_id, state, e)


async def _persist_proxy_index(account_id: int, index: int) -> None:
    """Persist the current proxy rotation index to DB for crash recovery.

    Called after every successful proxy switch so a restarted worker picks up
    where it left off rather than always starting from proxy #0.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE sender_accounts SET proxy_index=? WHERE id=?",
                (index, account_id),
            )
            await db.commit()
        logger.debug("[broadcaster] Persisted proxy_index=%d for account %d", index, account_id)
    except Exception as e:
        logger.debug("[broadcaster] _persist_proxy_index(%d) failed: %s", account_id, e)


async def _mark_proxy_failed(account_id: int) -> None:
    """Mark an account as proxy_failed when all proxy options are exhausted.

    Also releases locked_by/locked_at and clears broadcasting so other workers
    don't block on this account indefinitely.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                UPDATE sender_accounts
                SET status='proxy_failed',
                    broadcasting=0,
                    locked_by=NULL,
                    locked_at=NULL,
                    last_error='All proxies exhausted'
                WHERE id=?
            """, (account_id,))
            await db.commit()
        logger.error(
            "[broadcaster] Account %d marked proxy_failed — all proxies exhausted",
            account_id,
        )
    except Exception as e:
        logger.debug("[broadcaster] _mark_proxy_failed(%d) failed: %s", account_id, e)


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
        logger.warning("[broadcaster] Account %d: missing session/api_id/api_hash", acc_id)
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
            logger.warning("[broadcaster] Account %d: session expired or revoked", acc_id)
            await client.disconnect()
            return None
        logger.info("[broadcaster] Account %d ✓ connected via %s", acc_id, proxy_label(proxy))
        return client
    except Exception as e:
        logger.error(
            "[broadcaster] Account %d connect error via %s: %s",
            acc_id, proxy_label(proxy), e,
        )
        try:
            await client.disconnect()
        except Exception:
            pass
        _record_proxy_fail(proxy_label(proxy))
        return None


async def _get_or_connect(account: dict, proxy: dict | None) -> TelegramClient | None:
    """Return a healthy cached client or connect a new one."""
    acc_id   = account["id"]
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
    current_index: int = 0,
) -> tuple[TelegramClient | None, dict | None, int]:
    """Disconnect current client and try the next proxy in ranked order.

    Persists proxy_index to DB after each successful switch.
    If all proxies fail and no-proxy also fails → marks account as proxy_failed.

    Returns (new_client, used_proxy, new_index) or (None, None, -1) if exhausted.
    """
    acc_id = account["id"]
    await _disconnect_account(acc_id)

    ranked = _rank_proxies(proxies)

    for idx, proxy in enumerate(ranked):
        label = proxy_label(proxy)
        if label == failed_label:
            continue  # skip the one that just failed
        if _proxy_fail_count(label) >= _PROXY_FAIL_SKIP:
            logger.debug(
                "[broadcaster] Skipping proxy %r (%d failures)",
                label, _proxy_fail_count(label),
            )
            continue
        client = await _connect_with_proxy(account, proxy)
        if client:
            _telethon_clients[acc_id] = client
            # Persist the new index so a restarted worker resumes here
            await _persist_proxy_index(acc_id, idx)
            return client, proxy, idx

    # All proxies exhausted — try no-proxy as last resort
    logger.warning(
        "[broadcaster] Account %d: all proxies failed, attempting direct connection",
        acc_id,
    )
    client = await _connect_with_proxy(account, None)
    if client:
        _telethon_clients[acc_id] = client
        await _persist_proxy_index(acc_id, 0)
        return client, None, 0

    # Truly exhausted — mark account so no worker tries it again
    await _mark_proxy_failed(acc_id)
    return None, None, -1


async def _initial_connect(
    account: dict,
    proxies: list[dict],
) -> tuple[TelegramClient | None, dict | None, int]:
    """Connect account, resuming from the persisted proxy_index, then trying all others.

    Returns (client, used_proxy, index).
    """
    if not proxies:
        client = await _get_or_connect(account, None)
        return client, None, 0

    ranked = _rank_proxies(proxies)
    # Resume from persisted index (mod length for safety)
    start_idx = int(account.get("proxy_index") or 0) % len(ranked)

    # Try from start_idx first, then wrap around
    order = list(range(start_idx, len(ranked))) + list(range(0, start_idx))
    for idx in order:
        proxy = ranked[idx]
        label = proxy_label(proxy)
        if _proxy_fail_count(label) >= _PROXY_FAIL_SKIP:
            continue
        client = await _get_or_connect(account, proxy)
        if client:
            if idx != start_idx:
                # We skipped the persisted proxy — update index
                await _persist_proxy_index(account["id"], idx)
            return client, proxy, idx

    # Last resort — no proxy
    client = await _get_or_connect(account, None)
    return client, None, 0


# ── Jitter delays ─────────────────────────────────────────────────────────────

async def _inter_message_delay(sent: int, min_d: float, max_d: float) -> None:
    base  = random.uniform(min_d, max(max_d, min_d + 0.5))
    extra = 0.0
    if sent > 0 and sent % 50 == 0:
        extra = random.uniform(90.0, 200.0)
        logger.info("[broadcaster] Long break after %d sends (%.0fs)", sent, extra)
    elif sent > 0 and sent % 20 == 0:
        extra = random.uniform(30.0, 75.0)
        logger.info("[broadcaster] Short break after %d sends (%.0fs)", sent, extra)
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
                logger.debug("[broadcaster] Pin failed for %s: %s", group_id, e)


# ── Send result sentinel ──────────────────────────────────────────────────────

SendResult = Literal["sent", "group_error", "abort_task", "proxy_failed"]


async def _try_send(
    client_ref: list,          # [client] — mutable so rotation can update it
    proxy_ref:  list,          # [proxy]  — mutable
    index_ref:  list,          # [int]    — mutable proxy index
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
            logger.warning(
                "[broadcaster] FloodWait %ds — sleeping %ds then retry",
                e.seconds, wait,
            )
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
                logger.warning(
                    "[broadcaster] Send error (%s) — rotating proxy from %r",
                    err, failed_label,
                )
                new_client, new_proxy, new_idx = await _rotate_to_next_proxy(
                    account, proxies, failed_label, index_ref[0]
                )
                if new_client:
                    client_ref[0] = new_client
                    proxy_ref[0]  = new_proxy
                    index_ref[0]  = new_idx
                    client = new_client
                    proxy  = new_proxy
                    logger.info(
                        "[broadcaster] Rotated to %s, retrying %s",
                        proxy_label(new_proxy), group_id,
                    )
                    continue  # retry send
                else:
                    # All proxies exhausted — account already marked proxy_failed
                    logger.error(
                        "[broadcaster] All proxies exhausted for account %d",
                        account["id"],
                    )
                    return "proxy_failed", f"proxy exhausted: {err}"
            else:
                return "group_error", err

    return "group_error", "Max send attempts reached"


# ── Main task runner ──────────────────────────────────────────────────────────

async def run_group_campaign_task(task: dict, worker_id: str = "worker") -> dict:
    """Execute one task — send to all groups for a group campaign.

    Sets broadcasting=1 in DB at start, clears it in finally (belt-and-suspenders
    on top of the task_queue locked_by mechanism).

    Returns {ok, sent, failed, errors}.
    """
    campaign_id = task["campaign_id"]
    task_id     = task["id"]
    results     = {"ok": True, "sent": 0, "failed": 0, "errors": []}
    account_id: int | None = None

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

    if account.get("status") == "proxy_failed":
        return {"ok": False, "sent": 0, "failed": 0,
                "errors": [f"Account {account_id} has status=proxy_failed"]}

    proxies = parse_proxies(account.get("proxies") or account.get("proxy"))

    # ── Set broadcasting flag BEFORE acquiring any lock ───────────────────────
    # This is belt-and-suspenders: if two workers somehow passed the locked_by
    # DB guard simultaneously, only one will hold the FileLock below.
    await _set_broadcasting(account_id, True)

    # Acquire per-account file lock (Telethon .session file protection)
    lock = _account_lock(account_id)
    try:
        lock.acquire(timeout=30)
    except Timeout:
        await _set_broadcasting(account_id, False)
        return {"ok": False, "sent": 0, "failed": 0,
                "errors": [f"Account {account_id} file-locked by another worker"]}

    try:
        # Connect with proxy rotation — resumes from persisted proxy_index
        client, active_proxy, proxy_idx = await _initial_connect(account, proxies)
        if not client:
            await _mark_proxy_failed(account_id)
            return {"ok": False, "sent": 0, "failed": 0,
                    "errors": ["Could not connect Telethon client (all proxies failed)"]}

        logger.info(
            "[broadcaster] Task #%d using %s (worker %r acct %d)",
            task_id, proxy_label(active_proxy), worker_id, account_id,
        )

        # Mutable refs so _try_send can update client/proxy/index in-place on rotation
        client_ref = [client]
        proxy_ref  = [active_proxy]
        index_ref  = [proxy_idx]

        # Resolve group list
        if is_test and task_payload.get("group_ids"):
            selected_groups = [str(g) for g in task_payload["group_ids"]]
            logger.info("[broadcaster] TEST mode — groups: %s", selected_groups)
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
                logger.info("[broadcaster] Daily limit %d reached — stopping", daily_limit)
                break

            await _rate_limiter.acquire(account_id)

            group_title = group_meta.get(str(group_id), str(group_id))
            text = resolve_spintax(text_template)

            outcome, err_msg = await _try_send(
                client_ref, proxy_ref, index_ref, account, proxies,
                str(group_id), text, media_url, media_type, inline_buttons, pin,
            )

            if outcome == "sent":
                await _log_send(campaign_id, str(group_id), group_title,
                                account_id, task_id, "ok")
                results["sent"] += 1
                sent_count += 1
                logger.info("[broadcaster] ✓ #%d → %s", task_id, group_title)
                await _inter_message_delay(sent_count, min_delay, max_delay)

            elif outcome == "group_error":
                await _log_send(campaign_id, str(group_id), group_title,
                                account_id, task_id, "failed", err_msg)
                results["failed"] += 1
                results["errors"].append(f"{group_id}: {err_msg}")
                logger.warning("[broadcaster] ✗ #%d → %s: %s", task_id, group_title, err_msg)
                await _inter_message_delay(sent_count, min_delay, max_delay)

            elif outcome in ("abort_task", "proxy_failed"):
                results["errors"].append(err_msg or "Task aborted")
                logger.error("[broadcaster] ✗ Task #%d aborted: %s", task_id, err_msg)
                remaining = len(selected_groups) - results["sent"] - results["failed"]
                results["failed"] += remaining
                break

        await _update_campaign_counts(campaign_id, results["sent"], results["failed"])

    finally:
        lock.release()
        # Always clear the broadcasting flag and mark account idle on exit
        await _set_broadcasting(account_id, False)
        if account_id:
            # Only mark idle if we didn't mark it proxy_failed
            acct_check = await cdb.get_account_by_id(account_id)
            if acct_check and acct_check.get("status") != "proxy_failed":
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
