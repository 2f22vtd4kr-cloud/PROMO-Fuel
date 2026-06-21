import asyncio
import os
import re
import random
import logging
from datetime import datetime, timezone
from telegram import Bot
from telegram.error import TelegramError, Forbidden
from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError as TelFloodWait,
    UserPrivacyRestrictedError,
    UserDeactivatedBanError,
    UserDeactivatedError,
    PeerFloodError,
    InputUserDeactivatedError,
)

import campaign_db as db
from utils.account_ratelimit import acquire as _rl_acquire

# Cache of active Telethon clients: account_id -> TelegramClient
_telethon_clients: dict = {}

DAILY_SEND_CAP = int(os.getenv("DAILY_SEND_CAP", "500"))


def resolve_spintax(text: str) -> str:
    """Resolve {option1|option2|option3} spintax patterns randomly."""
    pattern = re.compile(r'\{([^{}|]+(?:\|[^{}|]*)+)\}')
    max_iter = 20
    for _ in range(max_iter):
        m = pattern.search(text)
        if not m:
            break
        chosen = random.choice(m.group(1).split('|'))
        text = text[:m.start()] + chosen + text[m.end():]
    return text


async def human_delay(sent_count: int) -> None:
    """
    Tier-based human-like delay to reduce ban risk.
    - Base: 3–8s per message
    - Every 10 sends: extra 15–40s break
    - Every 50 sends: extra 60–180s break
    - Every 100 sends: extra 120–300s major break
    """
    base = random.uniform(3.0, 8.0)
    extra = 0.0

    if sent_count > 0 and sent_count % 100 == 0:
        extra = random.uniform(120.0, 300.0)
        logger.info(f"[Sender] Major break after {sent_count} sends ({extra:.0f}s)...")
    elif sent_count > 0 and sent_count % 50 == 0:
        extra = random.uniform(60.0, 180.0)
        logger.info(f"[Sender] Long break after {sent_count} sends ({extra:.0f}s)...")
    elif sent_count > 0 and sent_count % 10 == 0:
        extra = random.uniform(15.0, 40.0)
        logger.info(f"[Sender] Short break after {sent_count} sends ({extra:.0f}s)...")

    await asyncio.sleep(base + extra)


logger = logging.getLogger(__name__)

# Active campaign state
_active: dict = {}  # campaign_id -> state dict
_scheduler_task = None


async def get_telethon_client(account: dict) -> TelegramClient | None:
    """Return a connected, authorized TelegramClient for a sender account, or None."""
    acc_id = account.get("id")
    sess = account.get("session_file")
    api_id = account.get("api_id")
    api_hash = account.get("api_hash")
    if not (sess and api_id and api_hash):
        return None
    # Reuse cached client if still connected
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
    # Telethon adds .session extension automatically
    sess_path = sess[:-8] if sess.endswith(".session") else sess
    client = TelegramClient(sess_path, int(api_id), str(api_hash))
    try:
        await client.connect()
        if not await client.is_user_authorized():
            logger.warning(f"Account {account.get('phone')} session expired/revoked")
            await client.disconnect()
            return None
        _telethon_clients[acc_id] = client
        return client
    except Exception as e:
        logger.error(f"Failed to connect Telethon client for account {account.get('phone')}: {e}")
        try:
            await client.disconnect()
        except Exception:
            pass
        return None


async def release_telethon_client(account_id: int):
    """Disconnect and remove a cached Telethon client."""
    if account_id in _telethon_clients:
        try:
            await _telethon_clients[account_id].disconnect()
        except Exception:
            pass
        del _telethon_clients[account_id]


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
    """Background loop: fires scheduled & running campaigns."""
    import os
    ADMIN_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))
    logger.info("📅 Campaign scheduler started")
    while True:
        try:
            # Fire due scheduled campaigns
            due = await db.get_due_campaigns()
            for c in due:
                if c["id"] in _active:
                    continue
                logger.info(f"📅 Firing scheduled campaign '{c['name']}' (id={c['id']})")
                notify = c.get("notify_chat") or ADMIN_ID
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

            # Also pick up campaigns set to 'running' via API (not yet in _active)
            all_camps = await db.list_campaigns()
            for c in all_camps:
                if c["status"] == "running" and c["id"] not in _active:
                    logger.info(f"▶️ Resuming API-started campaign '{c['name']}' (id={c['id']})")
                    notify = c.get("notify_chat") or ADMIN_ID
                    tag = c.get("scheduled_tag")
                    asyncio.create_task(send_campaign(bot, c["id"], notify, tag))

        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(15)


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

    # Resolve sender account — prefer Telethon user account over bot
    sender_account_id = campaign.get("sender_account_id") or None
    account = None
    telethon_client = None
    if sender_account_id:
        account = await db.get_account_by_id(sender_account_id)
        if account:
            telethon_client = await get_telethon_client(account)
            if telethon_client:
                logger.info(f"📲 Telethon account {account['phone']} ready for campaign {campaign_id}")
                await db.account_mark_sending(sender_account_id)
            else:
                logger.warning(f"⚠️ Telethon unavailable for account {account.get('phone')}, falling back to Bot API")

    # Per-campaign dedup: skip users already messaged for this campaign across any account
    users = await db.get_untargeted_users_for_campaign(campaign_id, tag)

    _active[campaign_id] = {
        "status": "running",
        "total": len(users),
        "sent": 0,
        "failed": 0,
        "skipped": 0,
        "skipped_promo": 0,
        "started_at": datetime.now().isoformat(),
        "paused": False,
        "cancelled": False,
        "sender": account["phone"] if account else "bot",
    }

    await db.update_campaign_status(campaign_id, "running", target_count=len(users))

    dry_run = bool(campaign.get("dry_run"))
    text_template = campaign["text_template"]
    delay = int(campaign.get("send_delay_seconds") or 15)

    try:
        for user in users:
            state = _active[campaign_id]

            while state["paused"] and not state["cancelled"]:
                await asyncio.sleep(1)

            if state["cancelled"]:
                break

            chat_id = user["chat_id"]

            # Race-condition guard: double-check global targeted flag
            if await db.is_promo_targeted(chat_id):
                state["skipped_promo"] += 1
                await db.log_send(campaign_id, chat_id, "skipped_already_targeted", account_id=sender_account_id)
                continue

            # Daily send cap check
            if state["sent"] >= DAILY_SEND_CAP:
                logger.warning(f"Campaign {campaign_id}: daily cap {DAILY_SEND_CAP} reached — stopping")
                state["cancelled"] = True
                break

            name = user.get("first_name") or user.get("username") or "друг"
            text = text_template.replace("{name}", name).replace("{username}", user.get("username") or name)
            text = resolve_spintax(text)

            if dry_run:
                state["sent"] += 1
                await db.log_send(campaign_id, chat_id, "dry_run", account_id=sender_account_id)
                await db.increment_campaign_counts(campaign_id, sent=1)
                await asyncio.sleep(0.05)
                continue

            # ── Telethon send ───────────────────────────────────────────
            if telethon_client:
                try:
                    # Cross-process rate gate — shared with groupbroadcaster workers
                    # via SQLite so this account never exceeds 20 sends/60 s globally.
                    await _rl_acquire(sender_account_id)
                    await telethon_client.send_message(chat_id, text, parse_mode="md")
                    state["sent"] += 1
                    await db.log_send(campaign_id, chat_id, "ok", account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, sent=1)
                    await db.mark_user_as_promo_targeted(chat_id)
                    await db.account_record_send(sender_account_id, success=True)
                    await asyncio.sleep(delay)

                except TelFloodWait as e:
                    logger.warning(f"Telethon FloodWait {e.seconds}s for account {account['phone']}")
                    await db.account_flood_wait(sender_account_id, e.seconds)
                    await asyncio.sleep(e.seconds + random.randint(5, 15))
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "failed", f"FloodWait {e.seconds}s", account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, failed=1)

                except PeerFloodError:
                    logger.error(f"PeerFloodError — account {account['phone']} is being rate-limited by Telegram. Stopping.")
                    await db.account_flood_wait(sender_account_id, 3600)
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "failed", "PeerFloodError", account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, failed=1)
                    state["cancelled"] = True
                    break

                except (UserPrivacyRestrictedError, UserDeactivatedError,
                        UserDeactivatedBanError, InputUserDeactivatedError) as e:
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "blocked", str(e)[:100], account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, failed=1)
                    await db.account_record_send(sender_account_id, success=False, error=str(e)[:100])

                except Exception as e:
                    err = str(e)[:200]
                    logger.error(f"Telethon send error for chat {chat_id}: {err}")
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "failed", err, account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, failed=1)
                    await db.account_record_send(sender_account_id, success=False, error=err)

            # ── Bot API send (fallback) ──────────────────────────────────
            else:
                try:
                    await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
                    state["sent"] += 1
                    await db.log_send(campaign_id, chat_id, "ok", account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, sent=1)
                    await db.mark_user_as_promo_targeted(chat_id)
                    await asyncio.sleep(delay)

                except Forbidden:
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "blocked", "User blocked the bot", account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, failed=1)

                except TelegramError as e:
                    err_str = str(e)
                    if "Too Many Requests" in err_str:
                        wait = 30
                        try:
                            wait = int(err_str.split("retry after ")[1])
                        except Exception:
                            pass
                        logger.warning(f"Bot API rate limited — sleeping {wait}s")
                        await asyncio.sleep(wait + random.randint(5, 15))
                        try:
                            await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
                            state["sent"] += 1
                            await db.log_send(campaign_id, chat_id, "ok_retry", account_id=sender_account_id)
                            await db.increment_campaign_counts(campaign_id, sent=1)
                            await db.mark_user_as_promo_targeted(chat_id)
                        except Exception as e2:
                            state["failed"] += 1
                            await db.log_send(campaign_id, chat_id, "failed", str(e2)[:200], account_id=sender_account_id)
                            await db.increment_campaign_counts(campaign_id, failed=1)
                    else:
                        state["failed"] += 1
                        await db.log_send(campaign_id, chat_id, "failed", err_str[:200], account_id=sender_account_id)
                        await db.increment_campaign_counts(campaign_id, failed=1)

                except Exception as e:
                    state["failed"] += 1
                    await db.log_send(campaign_id, chat_id, "failed", str(e)[:200], account_id=sender_account_id)
                    await db.increment_campaign_counts(campaign_id, failed=1)

    finally:
        # Always release Telethon client and mark account idle when done
        if sender_account_id:
            await db.account_mark_idle(sender_account_id)
        if telethon_client:
            await release_telethon_client(sender_account_id)

    state = _active[campaign_id]
    final_status = "cancelled" if state["cancelled"] else "done"
    _active[campaign_id]["status"] = final_status
    await db.update_campaign_status(campaign_id, final_status)

    sender_label = f"@{account['username']}" if account and account.get("username") else (account["phone"] if account else "bot")
    summary = (
        f"{'🏁' if final_status == 'done' else '⏹'} *Кампания «{campaign['name']}» завершена*\n\n"
        f"{'🔍 Режим: DRY RUN (не отправлялось)' + chr(10) if dry_run else ''}"
        f"📲 Отправитель: {sender_label}\n"
        f"👥 Всего получателей: {state['total']}\n"
        f"✅ Отправлено: {state['sent']}\n"
        f"❌ Ошибок: {state['failed']}\n"
        f"⏭ Уже получали ранее: {state['skipped_promo']}\n"
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
