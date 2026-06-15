import asyncio
import random
import logging
from datetime import datetime, timezone
from telegram import Bot
from telegram.error import TelegramError, Forbidden

import campaign_db as db

logger = logging.getLogger(__name__)

# Active campaign state
_active: dict = {}  # campaign_id -> state dict
_scheduler_task = None


async def daily_reset_loop():
    """Resets sent_today counter on all sender accounts at midnight MSK."""
    logger.info("🔄 Daily reset loop started")
    while True:
        try:
            now = datetime.now()
            # Calculate seconds until next midnight
            from datetime import timedelta
            next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=5, microsecond=0)
            secs = (next_midnight - now).total_seconds()
            logger.info(f"🕛 Daily reset in {secs/3600:.1f}h at {next_midnight.strftime('%H:%M')}")
            await asyncio.sleep(secs)
            await db.reset_daily_counts()
            logger.info("✅ Daily account limits reset")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Daily reset error: {e}")
            await asyncio.sleep(60)


async def scheduler_loop(bot: Bot):
    """Background loop: fires scheduled campaigns when their time comes."""
    logger.info("📅 Campaign scheduler started")
    while True:
        try:
            due = await db.get_due_campaigns()
            for c in due:
                if c["id"] in _active:
                    continue
                logger.info(f"📅 Firing scheduled campaign '{c['name']}' (id={c['id']})")
                notify = c.get("notify_chat") or 0
                tag = c.get("scheduled_tag")
                await db.update_campaign_status(c["id"], "running", scheduled_at=None)
                asyncio.create_task(send_campaign(bot, c["id"], notify, tag))
                if notify:
                    try:
                        await bot.send_message(
                            chat_id=notify,
                            text=f"📅 Автозапуск кампании *«{c['name']}»*",
                            parse_mode="Markdown"
                        )
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(30)


_daily_reset_task = None

def start_scheduler(bot: Bot):
    global _scheduler_task, _daily_reset_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(scheduler_loop(bot))
        logger.info("✅ Scheduler task created")
    if _daily_reset_task is None or _daily_reset_task.done():
        _daily_reset_task = asyncio.create_task(daily_reset_loop())
        logger.info("✅ Daily reset task created")


def get_active_campaign_id() -> int | None:
    for cid, state in _active.items():
        if state["status"] == "running":
            return cid
    return None


def get_state(campaign_id: int) -> dict | None:
    return _active.get(campaign_id)


async def send_campaign(bot: Bot, campaign_id: int, notify_chat_id: int, tag: str = None):
    campaign = await db.get_campaign_by_id(campaign_id)
    if not campaign:
        return

    if campaign_id in _active and _active[campaign_id]["status"] == "running":
        return

    users = await db.get_users_by_tag(tag) if tag else await db.get_all_users()

    _active[campaign_id] = {
        "status": "running",
        "total": len(users),
        "sent": 0,
        "failed": 0,
        "skipped": 0,
        "started_at": datetime.now().isoformat(),
        "paused": False,
        "cancelled": False,
    }

    await db.update_campaign_status(campaign_id, "running", target_count=len(users))

    dry_run = bool(campaign.get("dry_run"))
    text_template = campaign["text_template"]

    for user in users:
        state = _active[campaign_id]

        while state["paused"] and not state["cancelled"]:
            await asyncio.sleep(1)

        if state["cancelled"]:
            break

        chat_id = user["chat_id"]
        name = user.get("first_name") or user.get("username") or "друг"
        text = text_template.replace("{name}", name).replace("{username}", user.get("username") or name)

        if dry_run:
            state["sent"] += 1
            await db.log_send(campaign_id, chat_id, "dry_run")
            await db.increment_campaign_counts(campaign_id, sent=1)
            await asyncio.sleep(0.05)
            continue

        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
            state["sent"] += 1
            await db.log_send(campaign_id, chat_id, "ok")
            await db.increment_campaign_counts(campaign_id, sent=1)
            delay = random.uniform(1.5, 4.0)
            await asyncio.sleep(delay)

        except Forbidden:
            state["failed"] += 1
            await db.log_send(campaign_id, chat_id, "blocked", "User blocked the bot")
            await db.increment_campaign_counts(campaign_id, failed=1)

        except TelegramError as e:
            err_str = str(e)
            if "Too Many Requests" in err_str:
                wait = 30
                try:
                    wait = int(err_str.split("retry after ")[1])
                except Exception:
                    pass
                logger.warning(f"Rate limited — sleeping {wait}s")
                await asyncio.sleep(wait + random.randint(3, 10))
                try:
                    await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
                    state["sent"] += 1
                    await db.log_send(campaign_id, chat_id, "ok_retry")
                    await db.increment_campaign_counts(campaign_id, sent=1)
                except Exception as e2:
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "failed", str(e2)[:200])
                    await db.increment_campaign_counts(campaign_id, failed=1)
            else:
                state["failed"] += 1
                await db.log_send(campaign_id, chat_id, "failed", err_str[:200])
                await db.increment_campaign_counts(campaign_id, failed=1)

        except Exception as e:
            state["failed"] += 1
            await db.log_send(campaign_id, chat_id, "failed", str(e)[:200])
            await db.increment_campaign_counts(campaign_id, failed=1)

    state = _active[campaign_id]
    final_status = "cancelled" if state["cancelled"] else "done"
    _active[campaign_id]["status"] = final_status
    await db.update_campaign_status(campaign_id, final_status)

    summary = (
        f"{'🏁' if final_status == 'done' else '⏹'} *Кампания «{campaign['name']}» завершена*\n\n"
        f"{'🔍 Режим: DRY RUN (не отправлялось)' + chr(10) if dry_run else ''}"
        f"👥 Всего получателей: {state['total']}\n"
        f"✅ Отправлено: {state['sent']}\n"
        f"❌ Ошибок: {state['failed']}\n"
        f"⏱ Начато: {state['started_at'][:19]}\n"
        f"⏱ Завершено: {datetime.now().isoformat()[:19]}"
    )
    try:
        await bot.send_message(chat_id=notify_chat_id, text=summary, parse_mode="Markdown")
    except Exception:
        pass


def pause_campaign(campaign_id: int) -> bool:
    if campaign_id in _active and _active[campaign_id]["status"] == "running":
        _active[campaign_id]["paused"] = True
        _active[campaign_id]["status"] = "paused"
        return True
    return False


def resume_campaign(campaign_id: int) -> bool:
    if campaign_id in _active and _active[campaign_id]["status"] == "paused":
        _active[campaign_id]["paused"] = False
        _active[campaign_id]["status"] = "running"
        return True
    return False


def cancel_campaign(campaign_id: int) -> bool:
    if campaign_id in _active:
        _active[campaign_id]["cancelled"] = True
        _active[campaign_id]["paused"] = False
        _active[campaign_id]["status"] = "cancelled"
        return True
    return False
