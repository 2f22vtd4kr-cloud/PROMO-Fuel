"""Telethon account authorization HTTP server (port 8082).

Endpoints:
  POST /start-auth    { phone, api_id, api_hash }
                      -> { phone_code_hash }
                      -> { already_authorized, display_name, session_file }
  POST /confirm-auth  { phone, code, phone_code_hash }
                      -> { ok, display_name, session_file }
                      -> { needs_2fa: true }
  POST /confirm-2fa   { phone, password }
                      -> { ok, display_name, session_file }
"""

import asyncio
import json
import os
import logging
import threading
from aiohttp import web
from telethon import TelegramClient
from telethon.errors import (
    SessionPasswordNeededError, FloodWaitError,
    PhoneNumberInvalidError, PhoneCodeInvalidError,
    PhoneCodeExpiredError,
)

logger = logging.getLogger(__name__)

SESSION_DIR = os.getenv("SESSION_DIR", "./sessions")
os.makedirs(SESSION_DIR, exist_ok=True)

# pending: phone -> { client: TelegramClient, phone_code_hash: str, awaiting_2fa: bool }
_pending: dict = {}


def _session_path(phone: str) -> str:
    safe = phone.replace("+", "").replace(" ", "").replace("-", "")
    return os.path.join(SESSION_DIR, safe)


async def _me_display(client: TelegramClient, fallback: str) -> str:
    try:
        me = await client.get_me()
        if me.username:
            return f"@{me.username}"
        return me.first_name or fallback
    except Exception:
        return fallback


async def handle_start_auth(request: web.Request) -> web.Response:
    try:
        data = await request.json()
        phone = str(data.get("phone", "")).strip()
        api_id = int(data["api_id"])
        api_hash = str(data["api_hash"]).strip()
        if not phone:
            raise ValueError("phone required")
    except (KeyError, ValueError, TypeError) as e:
        return web.json_response({"error": f"Bad params: {e}"}, status=400)

    # Clean up any previous pending session for this phone
    if phone in _pending:
        try:
            await _pending[phone]["client"].disconnect()
        except Exception:
            pass
        del _pending[phone]

    sess = _session_path(phone)
    client = TelegramClient(sess, api_id, api_hash)
    try:
        await client.connect()
        if await client.is_user_authorized():
            display_name = await _me_display(client, phone)
            await client.disconnect()
            return web.json_response({
                "already_authorized": True,
                "display_name": display_name,
                "session_file": f"{sess}.session",
            })

        sent = await client.send_code_request(phone)
        _pending[phone] = {
            "client": client,
            "phone_code_hash": sent.phone_code_hash,
            "awaiting_2fa": False,
        }
        return web.json_response({"phone_code_hash": sent.phone_code_hash})

    except FloodWaitError as e:
        try:
            await client.disconnect()
        except Exception:
            pass
        return web.json_response({"error": f"Flood wait: подождите {e.seconds} сек"}, status=429)
    except PhoneNumberInvalidError:
        try:
            await client.disconnect()
        except Exception:
            pass
        return web.json_response({"error": "Неверный номер телефона"}, status=400)
    except Exception as e:
        try:
            await client.disconnect()
        except Exception:
            pass
        logger.error(f"start-auth error: {e}")
        return web.json_response({"error": str(e)}, status=500)


async def handle_confirm_auth(request: web.Request) -> web.Response:
    try:
        data = await request.json()
        phone = str(data["phone"]).strip()
        code = str(data["code"]).strip()
        phone_code_hash = str(data["phone_code_hash"]).strip()
    except (KeyError, ValueError) as e:
        return web.json_response({"error": f"Bad params: {e}"}, status=400)

    pending = _pending.get(phone)
    if not pending:
        return web.json_response({"error": "Нет активной сессии авторизации. Запустите снова."}, status=400)

    client: TelegramClient = pending["client"]
    try:
        await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
        sess = _session_path(phone)
        display_name = await _me_display(client, phone)
        await client.disconnect()
        del _pending[phone]
        return web.json_response({
            "ok": True,
            "display_name": display_name,
            "session_file": f"{sess}.session",
        })
    except SessionPasswordNeededError:
        pending["awaiting_2fa"] = True
        return web.json_response({"needs_2fa": True})
    except PhoneCodeInvalidError:
        return web.json_response({"error": "Неверный код. Попробуйте ещё раз."}, status=400)
    except PhoneCodeExpiredError:
        del _pending[phone]
        try:
            await client.disconnect()
        except Exception:
            pass
        return web.json_response({"error": "Код устарел. Запросите новый."}, status=400)
    except Exception as e:
        logger.error(f"confirm-auth error: {e}")
        return web.json_response({"error": str(e)}, status=400)


async def handle_confirm_2fa(request: web.Request) -> web.Response:
    try:
        data = await request.json()
        phone = str(data["phone"]).strip()
        password = str(data["password"]).strip()
    except (KeyError, ValueError) as e:
        return web.json_response({"error": f"Bad params: {e}"}, status=400)

    pending = _pending.get(phone)
    if not pending or not pending.get("awaiting_2fa"):
        return web.json_response({"error": "Нет ожидающей 2FA-сессии."}, status=400)

    client: TelegramClient = pending["client"]
    try:
        await client.sign_in(password=password)
        sess = _session_path(phone)
        display_name = await _me_display(client, phone)
        await client.disconnect()
        del _pending[phone]
        return web.json_response({
            "ok": True,
            "display_name": display_name,
            "session_file": f"{sess}.session",
        })
    except Exception as e:
        logger.error(f"confirm-2fa error: {e}")
        return web.json_response({"error": str(e)}, status=400)


async def _run_server():
    app = web.Application()
    app.router.add_post("/start-auth", handle_start_auth)
    app.router.add_post("/confirm-auth", handle_confirm_auth)
    app.router.add_post("/confirm-2fa", handle_confirm_2fa)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 8082)
    await site.start()
    logger.info("🔑 Telethon auth server listening on 127.0.0.1:8082")
    await asyncio.Event().wait()


def run_in_thread():
    """Start the aiohttp auth server in a background daemon thread."""
    def _target():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_run_server())
        except Exception as e:
            logger.error(f"Telethon auth server crashed: {e}")

    t = threading.Thread(target=_target, daemon=True, name="telethon-auth")
    t.start()
    logger.info("🔑 Telethon auth server thread started")
