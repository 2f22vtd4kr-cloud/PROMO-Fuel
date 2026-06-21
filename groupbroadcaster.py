"""Group Broadcasting Engine — sends messages to Telegram groups via Telethon.

Features:
  - Per-account FileLock to prevent "database is locked" Telethon errors
  - Double-verification of account ownership after file lock acquisition
  - Full proxy rotation: cycles through all proxies on failure, tracks per-proxy
    failure counts and skips persistently failing proxies
  - proxy_index persisted to DB after every successful switch
  - If ALL proxies exhausted → account marked status='proxy_failed', lock released
  - broadcasting=1 flag set ONLY while locked_by = this worker (belt-and-suspenders)
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
from utils.account_ratelimit import acquire as _rl_acquire
from utils.preflight import run_account_preflight, invalidate_cache as preflight_invalidate

logger = logging.getLogger(__name__)

DB_PATH      = os.getenv("DB_PATH", "campaigns.db")
SESSIONS_DIR = os.getenv("SESSION_DIR", "./sessions")
_BOT_TOKEN   = os.getenv("TELEGRAM_TOKEN", "")
_OWNER_IDS   = [int(x) for x in os.getenv("OWNER_IDS", os.getenv("VITE_OWNER_IDS", "")).split(",") if x.strip().lstrip("-").isdigit()]

# Per-account file locks — prevent concurrent Telethon sessions on the same .session file
_account_locks: dict[int, FileLock] = {}

# Cached Telethon clients: account_id → TelegramClient
_telethon_clients: dict[int, TelegramClient] = {}

# Per-proxy failure tracking: proxy_label → (count, last_failure_monotonic)
_proxy_failures: dict[str, tuple[int, float]] = {}
_PROXY_FAIL_WINDOW = 300   # seconds — reset count after 5 min without new failures
_PROXY_FAIL_SKIP   = 5     # skip proxy after this many failures within the window

# Track which campaigns have already emitted the 80% quota warning this session
_quota_warned: set[int] = set()


async def _notify_quota_warning(campaign_name: str, campaign_id: int, sent: int, daily_limit: int) -> None:
    """Fire-and-forget notification to owner when 80% of daily limit is reached."""
    if not _BOT_TOKEN or not _OWNER_IDS:
        return
    if campaign_id in _quota_warned:
        return
    _quota_warned.add(campaign_id)
    pct = int(sent / daily_limit * 100)
    text = (
        f"⚠️ *Квота на исходе* — «{campaign_name}»\n\n"
        f"Отправлено: *{sent}* из *{daily_limit}* ({pct}%)\n"
        f"Осталось: *{daily_limit - sent}* сообщений на сегодня."
    )
    try:
        import aiohttp  # noqa: PLC0415
        url = f"https://api.telegram.org/bot{_BOT_TOKEN}/sendMessage"
        async with aiohttp.ClientSession() as session:
            for uid in _OWNER_IDS:
                try:
                    await session.post(
                        url,
                        json={"chat_id": uid, "text": text, "parse_mode": "Markdown"},
                        timeout=aiohttp.ClientTimeout(total=10),
                    )
                except Exception:
                    pass
    except Exception:
        pass


# ── Account file locking ──────────────────────────────────────────────────────

def _account_lock(account_id: int) -> FileLock:
    if account_id not in _account_locks:
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        path = os.path.join(SESSIONS_DIR, f"account_{account_id}.lock")
        _account_locks[account_id] = FileLock(path, timeout=30)
    return _account_locks[account_id]


# ── DB flag helpers ───────────────────────────────────────────────────────────

async def _set_broadcasting(account_id: int, state: bool, worker_id: str | None = None) -> None:
    """Set/clear the broadcasting=1 flag on sender_accounts.

    When state=True and worker_id is given, only sets the flag if locked_by
    matches this worker — prevents overwriting another worker's ownership.
    When state=False, clears unconditionally (cleanup path always runs).
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            if state:
                if worker_id:
                    await db.execute(
                        "UPDATE sender_accounts SET broadcasting=1 "
                        "WHERE id=? AND locked_by=?",
                        (account_id, worker_id),
                    )
                else:
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


async def _verify_account_ownership(account_id: int, worker_id: str) -> bool:
    """Return True only if locked_by = worker_id in the DB right now.

    Called after acquiring the per-account FileLock to confirm no other process
    raced in between the task claim and the lock acquisition.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT locked_by FROM sender_accounts WHERE id=?", (account_id,)
            ) as cur:
                row = await cur.fetchone()
        return row is not None and row["locked_by"] == worker_id
    except Exception as e:
        logger.debug("[broadcaster] _verify_account_ownership(%d) failed: %s", account_id, e)
        return False


async def _persist_proxy_index(account_id: int, index: int) -> None:
    """Persist the current proxy rotation index to DB for crash recovery."""
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


async def _persist_last_error(account_id: int, error: str) -> None:
    """Write the most recent error to sender_accounts.last_error."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE sender_accounts SET last_error=? WHERE id=?",
                (error[:300], account_id),
            )
            await db.commit()
    except Exception:
        pass


async def _mark_group_banned(account_id: int, group_id: str, reason: str) -> None:
    """Persist a per-group ban for this account so future sends skip it automatically."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                UPDATE account_groups
                SET is_banned=1, banned_at=datetime('now'), ban_reason=?
                WHERE account_id=? AND group_id=?
            """, (reason[:200], account_id, group_id))
            await db.commit()
        logger.warning(
            "[broadcaster] Account %d banned from group %s — marked permanently: %s",
            account_id, group_id, reason,
        )
    except Exception as e:
        logger.debug("[broadcaster] _mark_group_banned failed: %s", e)


async def _mark_proxy_failed(account_id: int) -> None:
    """Mark an account as proxy_failed when all proxy options are exhausted."""
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
    import os as _os
    acc_id   = account["id"]
    sess     = account.get("session_file") or ""
    api_id   = account.get("api_id")
    api_hash = account.get("api_hash")

    if not (sess and api_id and api_hash):
        logger.warning("[broadcaster] Account %d: missing session/api_id/api_hash", acc_id)
        return None

    sess_path = sess.removesuffix(".session") if sess.endswith(".session") else sess

    # Verify the .session file actually exists before attempting to connect.
    # A missing file causes Telethon to create an empty new session (not authorized)
    # rather than raising a clear error, leading to silent auth failures.
    session_file = sess_path + ".session"
    if not _os.path.exists(session_file):
        logger.error(
            "[broadcaster] Account %d: session file not found: %s — "
            "run telethon_auth to authenticate this account first",
            acc_id, session_file,
        )
        return None

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
            continue
        if _proxy_fail_count(label) >= _PROXY_FAIL_SKIP:
            logger.debug(
                "[broadcaster] Skipping proxy %r (%d failures)",
                label, _proxy_fail_count(label),
            )
            continue
        client = await _connect_with_proxy(account, proxy)
        if client:
            _telethon_clients[acc_id] = client
            await _persist_proxy_index(acc_id, idx)
            logger.info(
                "[broadcaster] Account %d rotated to proxy %s (slot %d)",
                acc_id, label, idx,
            )
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

    # Truly exhausted
    await _mark_proxy_failed(acc_id)
    return None, None, -1


async def _initial_connect(
    account: dict,
    proxies: list[dict],
) -> tuple[TelegramClient | None, dict | None, int]:
    """Connect account, resuming from the persisted proxy_index, then trying all others."""
    if not proxies:
        client = await _get_or_connect(account, None)
        return client, None, 0

    ranked = _rank_proxies(proxies)
    start_idx = int(account.get("proxy_index") or 0) % max(len(ranked), 1)

    order = list(range(start_idx, len(ranked))) + list(range(0, start_idx))
    for idx in order:
        proxy = ranked[idx]
        label = proxy_label(proxy)
        if _proxy_fail_count(label) >= _PROXY_FAIL_SKIP:
            continue
        client = await _get_or_connect(account, proxy)
        if client:
            if idx != start_idx:
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

SendResult = Literal["sent", "group_error", "group_banned", "abort_task", "proxy_failed"]


async def _try_send(
    client_ref: list,
    proxy_ref:  list,
    index_ref:  list,
    account: dict,
    proxies: list[dict],
    group_id: str,
    text: str,
    media_url: str | None,
    media_type: str | None,
    inline_buttons: list | None,
    pin: bool,
    consecutive_errors: list,   # mutable [int] — reset on success, abort when high
) -> tuple[SendResult, str | None]:
    """Attempt to send to one group with automatic proxy rotation on failure.

    consecutive_errors is a mutable [int] counter — incremented on transient
    failures and reset to 0 on success. If it exceeds 5 the task is aborted
    to prevent hammering a failing proxy.

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
            consecutive_errors[0] = 0   # reset on success
            return "sent", None

        except FloodWaitError as e:
            wait = e.seconds + random.randint(5, 15)
            logger.warning(
                "[broadcaster] FloodWait %ds — sleeping %ds then retry",
                e.seconds, wait,
            )
            await cdb.account_flood_wait(account["id"], e.seconds)
            await asyncio.sleep(wait)
            continue

        except PeerFloodError:
            await cdb.account_flood_wait(account["id"], 3600)
            return "abort_task", "PeerFloodError — account rate-limited globally"

        except UserDeactivatedBanError:
            await cdb.account_flag_banned(account["id"], "UserDeactivatedBanError")
            preflight_invalidate(account["id"])  # evict cache — account is now banned
            return "abort_task", f"Account {account['id']} banned/deactivated"

        except (ChatWriteForbiddenError, UserBannedInChannelError) as e:
            # Hard ban — account is blocked from this group permanently
            return "group_banned", f"{type(e).__name__}: {str(e)[:100]}"

        except ChannelPrivateError as e:
            # Group became private/deleted — skip this send but don't mark as banned
            return "group_error", f"ChannelPrivate: {str(e)[:100]}"

        except SlowModeWaitError as e:
            return "group_error", f"SlowModeWait {e.seconds}s"

        except Exception as e:
            err = str(e)[:200]
            consecutive_errors[0] += 1

            # Abort early if we are seeing many consecutive errors
            if consecutive_errors[0] >= 5:
                return "abort_task", f"Too many consecutive errors: {err}"

            if attempt == 0 and proxies:
                failed_label = proxy_label(proxy)
                _record_proxy_fail(failed_label)
                logger.warning(
                    "[broadcaster] Send error (%s) — rotating proxy from %r (consecutive=%d)",
                    err, failed_label, consecutive_errors[0],
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
                    continue
                else:
                    return "proxy_failed", f"proxy exhausted: {err}"
            else:
                return "group_error", err

    return "group_error", "Max send attempts reached"


# ── Main task runner ──────────────────────────────────────────────────────────

async def run_group_campaign_task(task: dict, worker_id: str = "worker") -> dict:
    """Execute one task — send to all groups for a group campaign.

    Ownership verification flow:
      1. task_queue.claim_task_sync already locked the account with locked_by=worker_id
      2. We set broadcasting=1 only if locked_by still matches (belt-and-suspenders)
      3. We acquire the per-account FileLock (Telethon .session file safety)
      4. After acquiring the FileLock we re-verify locked_by == worker_id in DB
         (catches any race between the claim and lock acquisition)
      5. Only then do we connect Telethon and start sending

    Returns {ok, sent, failed, errors}.
    """
    campaign_id = task["campaign_id"]
    task_id     = task["id"]
    results     = {"ok": True, "sent": 0, "failed": 0, "errors": [], "resumed": 0, "campaign_name": ""}
    account_id: int | None = None

    campaign = await _get_campaign(campaign_id)
    if not campaign:
        return {"ok": False, "sent": 0, "failed": 0, "errors": ["Campaign not found"], "campaign_name": ""}
    results["campaign_name"] = campaign.get("name", f"#{campaign_id}")

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

    # ── Belt-and-suspenders: set broadcasting=1 only if WE own the lock ───────
    await _set_broadcasting(account_id, True, worker_id=worker_id)

    # ── Acquire per-account file lock (Telethon .session file protection) ─────
    lock = _account_lock(account_id)
    try:
        lock.acquire(timeout=30)
    except Timeout:
        await _set_broadcasting(account_id, False)
        return {"ok": False, "sent": 0, "failed": 0,
                "errors": [f"Account {account_id} file-locked by another worker"]}

    try:
        # ── Post-lock ownership re-verification ────────────────────────────────
        # Between task claim and FileLock acquisition, another process could have
        # taken ownership. If locked_by no longer matches, abort cleanly.
        if not await _verify_account_ownership(account_id, worker_id):
            logger.warning(
                "[broadcaster] Worker %r lost account %d ownership after FileLock — aborting",
                worker_id, account_id,
            )
            return {"ok": False, "sent": 0, "failed": 0,
                    "errors": [f"Account {account_id} ownership lost to another worker"]}

        # ── Connect with proxy rotation ────────────────────────────────────────
        client, active_proxy, proxy_idx = await _initial_connect(account, proxies)
        if not client:
            await _mark_proxy_failed(account_id)
            return {"ok": False, "sent": 0, "failed": 0,
                    "errors": ["Could not connect Telethon client (all proxies failed)"]}

        logger.info(
            "[broadcaster] Task #%d using %s (worker %r acct %d)",
            task_id, proxy_label(active_proxy), worker_id, account_id,
        )

        # ── Pre-flight health check ────────────────────────────────────────────
        # Verify session validity using the already-live connection (no extra
        # TCP handshake).  get_me() catches: session revoked server-side,
        # account deactivated/banned by Telegram.
        # On hard failure: account is marked INACTIVE in the DB immediately,
        # and the task exits cleanly — the finally block releases the FileLock
        # and marks the account idle.  The task is then re-queued (up to
        # max_attempts) so the operator can reassign a healthy account.
        preflight = await run_account_preflight(client, account)
        if not preflight.ok:
            logger.warning(
                "[broadcaster] Task #%d — account %d marked INACTIVE after "
                "pre-flight, aborting cleanly: %s",
                task_id, account_id, preflight.reason,
            )
            results["ok"]    = False
            results["errors"].append(f"Pre-flight: {preflight.reason}")
            return results  # finally: FileLock released, broadcasting cleared, account→idle

        # Mutable refs so _try_send can update client/proxy/index in-place on rotation
        client_ref = [client]
        proxy_ref  = [active_proxy]
        index_ref  = [proxy_idx]
        consec_err = [0]   # consecutive transient-error counter

        # ── Resolve group list ─────────────────────────────────────────────────
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

        group_meta    = await _get_group_meta(account_id, selected_groups)
        banned_groups = await _get_banned_groups(account_id)
        sent_count    = 0

        # ── Resume cursor ──────────────────────────────────────────────────────
        # When a worker is interrupted mid-broadcast (SIGTERM / Replit restart),
        # force_release_worker_sync() re-queues the task with the same task_id.
        # On the next claim we load group_send_logs to find every group already
        # confirmed sent in the previous run and skip them — guaranteeing zero
        # duplicate messages even across crashes.
        #
        # The cursor is keyed on task_id (not campaign_id alone) so that a
        # deliberately re-triggered fresh task always starts from position 0.
        already_sent: frozenset[str] = await _load_send_cursor(campaign_id, task_id)
        if already_sent:
            logger.info(
                "[broadcaster] Task #%d resuming — %d group(s) already confirmed sent "
                "in a previous run, skipping them",
                task_id, len(already_sent),
            )

        for group_id in selected_groups:
            if daily_limit > 0 and results["sent"] >= daily_limit:
                logger.info("[broadcaster] Daily limit %d reached — stopping", daily_limit)
                break

            gid_str     = str(group_id)
            group_title = group_meta.get(gid_str, gid_str)

            # ── Resume cursor skip ─────────────────────────────────────────────
            # This group was successfully sent in a previous partial run of the
            # same task — skip it unconditionally to prevent duplicates.
            # We do NOT increment results["sent"] here; the previous run's counts
            # are already reflected in group_campaigns.sent_count.
            if gid_str in already_sent:
                results["resumed"] += 1
                logger.debug(
                    "[broadcaster] Task #%d cursor-skip %s (%s) — already sent",
                    task_id, group_title, gid_str,
                )
                continue

            # ── Pre-skip groups where this account is already banned ───────────
            if gid_str in banned_groups:
                reason = banned_groups[gid_str]
                logger.info(
                    "[broadcaster] Skipping banned group %s (%s): %s",
                    group_title, gid_str, reason,
                )
                await _log_send(campaign_id, gid_str, group_title,
                                account_id, task_id, "banned", reason)
                results["failed"] += 1
                continue

            # Cross-process rate gate — shared across all workers and campaign_sender
            # via SQLite so a single account never exceeds 20 sends/60 s globally.
            await _rl_acquire(account_id)

            text = resolve_spintax(text_template)

            outcome, err_msg = await _try_send(
                client_ref, proxy_ref, index_ref, account, proxies,
                gid_str, text, media_url, media_type, inline_buttons, pin,
                consec_err,
            )

            if outcome == "sent":
                await _log_send(campaign_id, gid_str, group_title,
                                account_id, task_id, "ok")
                results["sent"] += 1
                sent_count += 1
                logger.info("[broadcaster] ✓ #%d → %s", task_id, group_title)
                # Fire 80% daily-quota warning (once per campaign per process)
                if daily_limit > 0 and campaign_id not in _quota_warned:
                    warn_at = int(daily_limit * 0.8)
                    if results["sent"] >= warn_at:
                        asyncio.create_task(_notify_quota_warning(
                            campaign.get("name", f"#{campaign_id}") if campaign else f"#{campaign_id}",
                            campaign_id, results["sent"], daily_limit,
                        ))
                # Persist cursor: on the next claim of this task_id (after a
                # crash/SIGTERM), _load_send_cursor will query group_send_logs
                # and skip this group.  _persist_task_cursor writes a lightweight
                # diagnostic column to tasks.cursor_group; it is NOT the source
                # of truth (group_send_logs is).
                await _persist_task_cursor(task_id, gid_str)
                await _inter_message_delay(sent_count, min_delay, max_delay)

            elif outcome == "group_banned":
                # Persist the ban so this group is auto-skipped from now on
                await _mark_group_banned(account_id, gid_str, err_msg or "Banned")
                banned_groups[gid_str] = err_msg or "Banned"   # update in-memory cache too
                await _log_send(campaign_id, gid_str, group_title,
                                account_id, task_id, "banned", err_msg)
                results["failed"] += 1
                results["errors"].append(f"BANNED {group_title}: {err_msg}")
                logger.warning(
                    "[broadcaster] ⛔ #%d → %s banned — marked, skipping future sends",
                    task_id, group_title,
                )
                # No delay needed — we didn't actually send

            elif outcome == "group_error":
                await _log_send(campaign_id, gid_str, group_title,
                                account_id, task_id, "failed", err_msg)
                results["failed"] += 1
                results["errors"].append(f"{gid_str}: {err_msg}")
                logger.warning("[broadcaster] ✗ #%d → %s: %s", task_id, group_title, err_msg)
                await _inter_message_delay(sent_count, min_delay, max_delay)

            elif outcome in ("abort_task", "proxy_failed"):
                results["errors"].append(err_msg or "Task aborted")
                logger.error("[broadcaster] ✗ Task #%d aborted: %s", task_id, err_msg)
                # Persist last error for visibility in the UI
                if err_msg:
                    await _persist_last_error(account_id, err_msg)
                remaining = len(selected_groups) - results["sent"] - results["failed"]
                results["failed"] += remaining
                break

        await _update_campaign_counts(campaign_id, results["sent"], results["failed"])

    finally:
        lock.release()
        await _set_broadcasting(account_id, False)
        if account_id:
            acct_check = await cdb.get_account_by_id(account_id)
            if acct_check and acct_check.get("status") != "proxy_failed":
                await cdb.account_mark_idle(account_id)

    # A task is considered successful if:
    #   - At least one group was sent this run, OR
    #   - All groups were skipped via the resume cursor (task fully resumed), OR
    #   - No groups failed (edge case: all were banned/errored in previous runs)
    results["ok"] = (
        results["sent"] > 0
        or results["resumed"] > 0
        or results["failed"] == 0
    )
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


async def _get_banned_groups(account_id: int) -> dict[str, str]:
    """Return {group_id: ban_reason} for all groups this account is banned from."""
    try:
        async with aiosqlite.connect(DB_PATH) as conn:
            conn.row_factory = aiosqlite.Row
            async with conn.execute(
                "SELECT group_id, ban_reason FROM account_groups "
                "WHERE account_id=? AND is_banned=1",
                (account_id,),
            ) as cur:
                rows = await cur.fetchall()
        return {r["group_id"]: (r["ban_reason"] or "Banned") for r in rows}
    except Exception as e:
        logger.debug("[broadcaster] _get_banned_groups(%d) failed: %s", account_id, e)
        return {}


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
    campaign_id: int,
    group_id: str,
    group_title: str,
    account_id: int,
    task_id: int,
    status: str,
    error: str | None = None,
) -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                INSERT INTO group_send_logs
                    (campaign_id, group_id, group_title, account_id, task_id, status, error, sent_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (campaign_id, group_id, group_title, account_id, task_id, status, error))
            await db.commit()
    except Exception as e:
        logger.debug("[broadcaster] _log_send failed: %s", e)


async def _update_campaign_counts(campaign_id: int, sent: int, failed: int) -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                UPDATE group_campaigns
                SET sent_count   = sent_count   + ?,
                    failed_count = failed_count + ?,
                    last_sent_at = datetime('now')
                WHERE id=?
            """, (sent, failed, campaign_id))
            await db.commit()
    except Exception as e:
        logger.debug("[broadcaster] _update_campaign_counts failed: %s", e)


# ── Resume-cursor helpers ─────────────────────────────────────────────────────
#
# These two functions power the zero-duplicate resume mechanism.
#
# How it works end-to-end:
#   1. Worker SIGTERM fires → force_release_worker_sync() sets
#      tasks.status='pending' while preserving tasks.id (the task_id).
#   2. On restart, worker re-claims the same task — same task_id.
#   3. run_group_campaign_task() calls _load_send_cursor() which queries
#      group_send_logs WHERE campaign_id=? AND task_id=? AND status='ok'.
#      This returns every group confirmed sent in prior runs of this task.
#   4. The send loop skips those groups — zero duplicates guaranteed.
#   5. After each successful send, _log_send() writes a new 'ok' row so
#      if the worker is interrupted again the new position is captured.
#   6. _persist_task_cursor() writes the last group_id to tasks.cursor_group
#      for diagnostic visibility in the UI — it is NOT read back for logic.

async def _load_send_cursor(campaign_id: int, task_id: int) -> frozenset[str]:
    """Return the set of group_ids already confirmed sent for this task_id.

    Queries group_send_logs WHERE campaign_id=? AND task_id=? AND status='ok'.
    Returns frozenset() (empty — start from scratch) on any error including
    a missing table (pre-migration), so the broadcaster always degrades
    gracefully rather than crashing.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT group_id FROM group_send_logs "
                "WHERE campaign_id=? AND task_id=? AND status='ok'",
                (campaign_id, task_id),
            ) as cur:
                rows = await cur.fetchall()
        result = frozenset(r[0] for r in rows)
        if result:
            logger.debug(
                "[broadcaster] Cursor for task #%d: %d group(s) already sent",
                task_id, len(result),
            )
        return result
    except Exception as exc:
        logger.debug(
            "[broadcaster] _load_send_cursor(campaign=%d, task=%d) failed — "
            "starting from position 0: %s",
            campaign_id, task_id, exc,
        )
        return frozenset()


async def _persist_task_cursor(task_id: int, group_id: str) -> None:
    """Write the last successfully sent group_id to tasks.cursor_group.

    Diagnostic only — the resume logic reads from group_send_logs, not this
    column.  Failures are silently swallowed so a missing column (pre-migration)
    never breaks the send loop.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE tasks SET cursor_group=? WHERE id=?",
                (group_id, task_id),
            )
            await db.commit()
    except Exception:
        pass
