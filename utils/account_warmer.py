"""Account Warmup Engine — sends organic messages to public groups to age new accounts."""
from __future__ import annotations

import asyncio
import logging
import os
import random
from datetime import datetime, timezone

import aiosqlite
from telethon import TelegramClient
from telethon import errors as tl_errors

from utils.proxy import proxy_to_telethon

logger = logging.getLogger(__name__)

DB_PATH     = os.environ.get("CAMPAIGNS_DB", "campaigns.db")
SESSION_DIR = os.environ.get("SESSION_DIR", "sessions")

# ── Warmup content pool ──────────────────────────────────────────────────────

WARMUP_MESSAGES: list[str] = [
    "Привет всем! Как дела сегодня? 🙂",
    "Хороший день, правда? ☀️",
    "Цены на бензин опять выросли... когда уже это кончится 😤",
    "Подскажите, где сейчас выгоднее заправляться в городе?",
    "Давно слежу за этой темой — очень полезный контент!",
    "Согласен, хорошая информация 👍",
    "Интересный вопрос. Сам давно думаю об этом.",
    "А кто как экономит на топливе? Поделитесь опытом",
    "Отличная тема! Подписался, чтобы не пропустить",
    "Машина — это свобода. Главное не переплачивать за заправку 😄",
    "Всем доброго вечера! Как прошёл день?",
    "Доброе утро! Хорошей всем недели 🙂",
    "Интересно, спасибо за информацию",
    "Слышал, что скоро опять поднимут цены. Надо заправляться впрок",
    "Как выбираете АЗС — по цене или по качеству топлива?",
    "Брендовые заправки vs независимые — что предпочитаете?",
    "Сегодня заехал на заправку — очередь была огромная",
    "У кого есть опыт с бонусными картами АЗС? Стоит ли?",
    "Хорошая скидка, надо воспользоваться 👌",
    "А в вашем городе какие цены на 95-й сейчас?",
    "Лучше переплатить за качественный бензин, чем экономить на двигателе",
    "Автомобиль требует заботы, как и всё остальное 🔧",
    "Спасибо за полезный совет! Обязательно попробую",
    "Давно ищу хорошую заправку рядом с домом",
    "Всем хорошей дороги и без пробок! 🚗",
    "Сезон шиномонтажа скоро, надо записаться заранее",
    "Нашёл отличное место для ТО, буду рекомендовать",
    "Берегите своё авто — оно вас не подведёт",
    "Подписался, интересный контент тут 👍",
    "Полезная информация, сохранил в закладки",
    "Согласен с предыдущим комментарием на 100%",
    "Хороший совет, спасибо!",
    "Очень актуальная тема, жду продолжения",
    "Кто что думает про новые правила?",
    "Бережём машины и кошельки 😊",
]

# Public Russian supergroups that allow member messages.
# The engine gracefully skips any group that rejects the message.
WARMUP_GROUPS: list[str] = [
    "avto_ru_chat",
    "automoscow",
    "voditelirossii",
    "auto_russia_club",
    "avtochat_ru",
    "car_talk_ru",
    "azs_ru",
    "toplivoinfo",
    "avto_news_ru",
    "benzinprice",
]

# ── Background task registry ─────────────────────────────────────────────────

_active_warmups: dict[int, asyncio.Task] = {}

# ── DB helpers ───────────────────────────────────────────────────────────────

async def _update_warmup_db(
    account_id: int,
    status: str,
    messages_sent: int | None = None,
    completed_at: str | None = None,
) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        if messages_sent is not None and completed_at:
            await conn.execute(
                """UPDATE sender_accounts
                   SET warmup_status=?, warmup_messages_sent=?, warmup_completed_at=?
                   WHERE id=?""",
                (status, messages_sent, completed_at, account_id),
            )
        elif messages_sent is not None:
            await conn.execute(
                "UPDATE sender_accounts SET warmup_status=?, warmup_messages_sent=? WHERE id=?",
                (status, messages_sent, account_id),
            )
        else:
            await conn.execute(
                "UPDATE sender_accounts SET warmup_status=? WHERE id=?",
                (status, account_id),
            )
        await conn.commit()


async def _log_message(
    account_id: int,
    group_username: str,
    group_title: str,
    message_text: str,
    status: str,
    error: str | None = None,
) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute(
            """INSERT INTO account_warmup_log
               (account_id, group_username, group_title, message_text, status, error)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (account_id, group_username, group_title, message_text, status, error),
        )
        await conn.commit()

# ── Core warmup coroutine ────────────────────────────────────────────────────

async def run_warmup_for_account(account_id: int) -> None:
    """
    Long-lived background coroutine that connects via the account's Telethon
    session, sends organic messages to public Russian groups with realistic
    human-paced delays, then marks the account's warmup as done.
    """
    logger.info("[warmer] Starting warmup for account_id=%d", account_id)

    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT id, phone, session_file, proxy, api_id, api_hash, warmup_target "
            "FROM sender_accounts WHERE id=?",
            (account_id,),
        ) as cur:
            row = await cur.fetchone()

    if not row:
        logger.warning("[warmer] account_id=%d not found — aborting", account_id)
        return

    session_file = row["session_file"]
    proxy_string = row["proxy"] or ""
    api_id       = row["api_id"]
    api_hash     = row["api_hash"]
    target       = int(row["warmup_target"] or 10)

    if not session_file or not api_id or not api_hash:
        logger.warning("[warmer] account_id=%d missing session/creds — aborting", account_id)
        await _update_warmup_db(account_id, "failed")
        return

    session_path = os.path.join(SESSION_DIR, session_file.replace(".session", ""))
    proxy_tuple  = proxy_to_telethon(proxy_string) if proxy_string else None

    await _update_warmup_db(account_id, "warming")

    client: TelegramClient | None = None
    messages_sent = 0

    try:
        client = TelegramClient(session_path, int(api_id), api_hash, proxy=proxy_tuple)
        await client.connect()

        if not await client.is_user_authorized():
            logger.warning("[warmer] account_id=%d not authorized — aborting", account_id)
            await _update_warmup_db(account_id, "failed")
            return

        groups = WARMUP_GROUPS.copy()
        random.shuffle(groups)

        for group_username in groups:
            if messages_sent >= target:
                break

            if messages_sent > 0:
                delay = random.uniform(240, 600)
                logger.info("[warmer] Acc %d sleeping %.0fs before next message", account_id, delay)
                await asyncio.sleep(delay)

            try:
                entity     = await client.get_entity(group_username)
                group_title = getattr(entity, "title", group_username)
                msg_text   = random.choice(WARMUP_MESSAGES)

                await client.send_message(entity, msg_text)
                messages_sent += 1
                logger.info("[warmer] Acc %d sent %d/%d to @%s", account_id, messages_sent, target, group_username)

                await _log_message(account_id, group_username, group_title, msg_text, "sent")
                await _update_warmup_db(account_id, "warming", messages_sent)

            except tl_errors.ChatWriteForbiddenError:
                logger.debug("[warmer] Acc %d — @%s write forbidden, skipping", account_id, group_username)
                await _log_message(account_id, group_username, group_username, "", "failed", "ChatWriteForbidden")

            except tl_errors.FloodWaitError as exc:
                wait = exc.seconds + random.randint(30, 120)
                logger.warning("[warmer] Acc %d FloodWait %ds on @%s", account_id, wait, group_username)
                await asyncio.sleep(min(wait, 600))

            except (tl_errors.UsernameInvalidError, tl_errors.UsernameNotOccupiedError):
                logger.debug("[warmer] Acc %d — @%s not found, skipping", account_id, group_username)

            except Exception as exc:
                logger.warning("[warmer] Acc %d — @%s error: %s", account_id, group_username, exc)
                await _log_message(account_id, group_username, group_username, "", "failed", str(exc)[:200])

        final_status = "done" if messages_sent >= max(1, target // 2) else "partial"
        done_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        await _update_warmup_db(account_id, final_status, messages_sent, done_at)
        logger.info("[warmer] Acc %d warmup=%s  %d/%d msgs", account_id, final_status, messages_sent, target)

    except Exception as exc:
        logger.exception("[warmer] Acc %d fatal error: %s", account_id, exc)
        await _update_warmup_db(account_id, "failed", messages_sent)
    finally:
        if client:
            try:
                await client.disconnect()
            except Exception:
                pass
        _active_warmups.pop(account_id, None)


# ── Public API ───────────────────────────────────────────────────────────────

def start_warmup_task(account_id: int) -> bool:
    """
    Spawn a background asyncio.Task for the warmup.
    Returns True if newly started, False if already running.
    """
    existing = _active_warmups.get(account_id)
    if existing and not existing.done():
        return False
    task = asyncio.ensure_future(run_warmup_for_account(account_id))
    _active_warmups[account_id] = task
    return True


def is_warmup_running(account_id: int) -> bool:
    t = _active_warmups.get(account_id)
    return bool(t and not t.done())
