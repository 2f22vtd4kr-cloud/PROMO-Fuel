"""
Telethon background listener — Unified Verification Queue.

For every active sender account this module maintains a persistent
TelegramClient that watches for incoming captcha/anti-bot challenges
(inline-button and math/text reply types) and persists them to the
`pending_verifications` SQLite table so the operator can solve them
from the Mini App dashboard.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sqlite3
from typing import Optional

from telethon import TelegramClient, events
from telethon.errors import (
    SessionPasswordNeededError,
    AuthKeyError,
    UserDeactivatedBanError,
)

logger = logging.getLogger(__name__)

DB_PATH    = os.getenv("DB_PATH", "campaigns.db")
SESSION_DIR = os.getenv("SESSION_DIR", "./sessions")

# ─── Captcha detection heuristics ────────────────────────────────────────────

CAPTCHA_KEYWORDS = [
    # English
    "captcha", "verify", "verification", "robot", "human", "solve",
    "press the button", "click button", "i am not a robot",
    "welcome", "math", "calculate", "answer", "sum",
    # Russian / Ukrainian
    "капча", "проверка", "подтвердите", "нажмите", "нажми", "кнопку",
    "докажите", "вы не робот", "верификация", "відповідь", "підтвердіть",
]


def _is_captcha_message(text: str, has_buttons: bool) -> bool:
    """Return True when a message looks like an anti-bot challenge."""
    if has_buttons and text.strip():
        return True
    tl = text.lower()
    return any(kw in tl for kw in CAPTCHA_KEYWORDS)


def _extract_buttons(reply_markup) -> Optional[list]:
    """Convert Telethon ReplyInlineMarkup → serialisable list-of-rows."""
    if reply_markup is None:
        return None
    try:
        rows_out = []
        for row in reply_markup.rows:
            row_out = []
            for btn in row.buttons:
                data = None
                if hasattr(btn, "data") and btn.data:
                    try:
                        data = btn.data.decode("utf-8", errors="replace")
                    except Exception:
                        data = str(btn.data)
                row_out.append({"text": btn.text, "callback_data": data})
            rows_out.append(row_out)
        return rows_out
    except Exception as exc:
        logger.debug("[listener] extract_buttons: %s", exc)
        return None


# ─── DB helpers ──────────────────────────────────────────────────────────────

def _db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def _save_verification(
    account_id: int,
    group_username: str,
    group_title: str,
    bot_message_id: int,
    captcha_text: str,
    buttons_json: Optional[str],
    captcha_type: str,
) -> None:
    try:
        conn = _db()
        conn.execute(
            """
            INSERT INTO pending_verifications
              (account_id, group_username, group_title, bot_message_id,
               captcha_text, buttons_json, captcha_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
            """,
            (account_id, group_username, group_title, bot_message_id,
             captcha_text, buttons_json, captcha_type),
        )
        conn.commit()
        conn.close()
        logger.info(
            "[listener] account=%d  group=%s  type=%s  → verification saved",
            account_id, group_username or group_title, captcha_type,
        )
    except Exception as exc:
        logger.error("[listener] DB save failed: %s", exc)


def mark_verification_done(verification_id: int, status: str = "done") -> None:
    """Update a verification row status (called by the API after solving)."""
    try:
        conn = _db()
        conn.execute(
            "UPDATE pending_verifications SET status=? WHERE id=?",
            (status, verification_id),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("[listener] mark_done failed: %s", exc)


# ─── Per-account listener lifecycle ──────────────────────────────────────────

_listeners: dict[int, TelegramClient] = {}   # account_id → client
_listener_tasks: dict[int, asyncio.Task]  = {}


async def _build_client(account: dict) -> Optional[TelegramClient]:
    """Build and connect a TelegramClient for account; return None on failure."""
    sess     = account.get("session_file") or ""
    api_id   = account.get("api_id")
    api_hash = account.get("api_hash")

    if not (sess and api_id and api_hash):
        return None

    sess_path = sess.removesuffix(".session") if sess.endswith(".session") else sess
    if not os.path.exists(sess_path + ".session"):
        logger.warning("[listener] session file not found for account %d", account["id"])
        return None

    # optional proxy
    proxy_cfg = None
    try:
        from utils.proxy import proxy_to_telethon
        proxies = json.loads(account.get("proxies") or "[]")
        idx = account.get("current_proxy_index") or 0
        if proxies:
            proxy_cfg = proxy_to_telethon(proxies[idx % len(proxies)])
    except Exception:
        pass

    client = TelegramClient(
        sess_path, int(api_id), str(api_hash),
        **({"proxy": proxy_cfg} if proxy_cfg else {}),
    )
    try:
        await client.connect()
        if not await client.is_user_authorized():
            await client.disconnect()
            logger.warning("[listener] account %d session expired", account["id"])
            return None
        return client
    except (AuthKeyError, UserDeactivatedBanError) as exc:
        logger.warning("[listener] account %d auth error: %s", account["id"], exc)
        try:
            await client.disconnect()
        except Exception:
            pass
        return None
    except Exception as exc:
        logger.error("[listener] account %d connect error: %s", account["id"], exc)
        try:
            await client.disconnect()
        except Exception:
            pass
        return None


async def _run_listener(account: dict) -> None:
    """Long-running coroutine for a single account's captcha listener."""
    account_id = account["id"]
    client = await _build_client(account)
    if not client:
        logger.info("[listener] skipping account %d — could not connect", account_id)
        return

    _listeners[account_id] = client

    @client.on(events.NewMessage(incoming=True))
    async def _on_message(event: events.NewMessage.Event) -> None:
        try:
            msg = event.message
            text = msg.message or ""
            has_buttons = msg.reply_markup is not None

            if not _is_captcha_message(text, has_buttons):
                return

            chat = await event.get_chat()
            group_username = (getattr(chat, "username", None) or "").strip()
            group_title = (
                getattr(chat, "title", None)
                or getattr(chat, "first_name", None)
                or ""
            ).strip()

            buttons = _extract_buttons(msg.reply_markup) if has_buttons else None
            captcha_type  = "button" if has_buttons else "text_reply"
            buttons_json  = json.dumps(buttons, ensure_ascii=False) if buttons else None

            _save_verification(
                account_id     = account_id,
                group_username = group_username,
                group_title    = group_title,
                bot_message_id = msg.id,
                captcha_text   = text[:800],
                buttons_json   = buttons_json,
                captcha_type   = captcha_type,
            )
        except Exception as exc:
            logger.debug("[listener] handler error account %d: %s", account_id, exc)

    logger.info("[listener] ✓ account %d listening for captchas", account_id)
    try:
        await client.run_until_disconnected()
    except Exception as exc:
        logger.warning("[listener] account %d disconnected: %s", account_id, exc)
    finally:
        _listeners.pop(account_id, None)
        logger.info("[listener] account %d stopped", account_id)


async def start_listener(account: dict) -> bool:
    """Start a listener for *account* if one is not already running."""
    account_id = account["id"]
    if account_id in _listeners:
        return True
    task = asyncio.create_task(_run_listener(account), name=f"verif-listener-{account_id}")
    _listener_tasks[account_id] = task
    # give it a moment to connect
    await asyncio.sleep(0.5)
    return account_id in _listeners


async def stop_listener(account_id: int) -> None:
    """Disconnect and clean up the listener for *account_id*."""
    client = _listeners.pop(account_id, None)
    if client:
        try:
            await client.disconnect()
        except Exception:
            pass
    task = _listener_tasks.pop(account_id, None)
    if task and not task.done():
        task.cancel()
    logger.info("[listener] stopped account %d", account_id)


def get_active_listener_ids() -> list[int]:
    """Return account IDs with active connected listeners."""
    return [aid for aid, c in _listeners.items() if c.is_connected()]


# ─── Bulk helpers (called from API) ──────────────────────────────────────────

async def start_all_active_accounts() -> dict:
    """
    Load all idle/active accounts from the DB and start listeners
    for those whose session file exists.  Returns a summary dict.
    """
    conn = _db()
    rows = conn.execute(
        "SELECT id, session_file, api_id, api_hash, proxies, current_proxy_index "
        "FROM sender_accounts WHERE status IN ('idle','active')"
    ).fetchall()
    conn.close()

    cols = ["id", "session_file", "api_id", "api_hash", "proxies", "current_proxy_index"]
    accounts = [dict(zip(cols, r)) for r in rows]

    started = 0
    skipped = 0
    for acc in accounts:
        ok = await start_listener(acc)
        if ok:
            started += 1
        else:
            skipped += 1

    return {"started": started, "skipped": skipped, "total": len(accounts)}


# ─── Telethon action helpers (called synchronously from the FastAPI route) ───

async def perform_click(
    account: dict,
    group_username: str,
    bot_message_id: int,
    button_index: int,
) -> dict:
    """
    Re-use an existing listener client or create a fresh one to click
    an inline button at *button_index* (flat index across all rows).
    """
    account_id = account["id"]
    client = _listeners.get(account_id)
    own_client = False

    if not client or not client.is_connected():
        client = await _build_client(account)
        if not client:
            return {"ok": False, "error": "Could not connect account"}
        own_client = True

    try:
        entity = group_username or int(account.get("last_group_peer_id", 0) or 0)
        msgs   = await client.get_messages(entity, ids=bot_message_id)
        if not msgs:
            return {"ok": False, "error": "Message not found"}
        await msgs.click(button_index)
        return {"ok": True}
    except Exception as exc:
        logger.error("[listener] click error account %d: %s", account_id, exc)
        return {"ok": False, "error": str(exc)}
    finally:
        if own_client:
            try:
                await client.disconnect()
            except Exception:
                pass


async def perform_reply(
    account: dict,
    group_username: str,
    bot_message_id: int,
    answer: str,
) -> dict:
    """Send a text reply to the captcha challenge message."""
    account_id = account["id"]
    client = _listeners.get(account_id)
    own_client = False

    if not client or not client.is_connected():
        client = await _build_client(account)
        if not client:
            return {"ok": False, "error": "Could not connect account"}
        own_client = True

    try:
        await client.send_message(group_username, answer, reply_to=bot_message_id)
        return {"ok": True}
    except Exception as exc:
        logger.error("[listener] reply error account %d: %s", account_id, exc)
        return {"ok": False, "error": str(exc)}
    finally:
        if own_client:
            try:
                await client.disconnect()
            except Exception:
                pass
