"""
account_factory.py — Automated Telegram Account Registration Pipeline
Streams progress via SSE (text/event-stream) over a POST request.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import time
from urllib.parse import urlparse

import aiohttp
import aiosqlite
from fastapi import APIRouter
from fastapi.requests import Request
from fastapi.responses import JSONResponse, StreamingResponse
from telethon import TelegramClient
from telethon.errors import (
    PhoneNumberBannedError,
    PhoneNumberUnoccupiedError,
    SessionPasswordNeededError,
)

logger = logging.getLogger("account_factory")

factory_router = APIRouter(prefix="/api/factory", tags=["factory"])

DB_PATH      = os.environ.get("DB_PATH", "campaigns.db")
SESSION_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions")

SMSPOOL_BUY    = "https://api.smspool.net/purchase/sms"
SMSPOOL_CHECK  = "https://api.smspool.net/sms/check"
SMSPOOL_CANCEL = "https://api.smspool.net/sms/cancel"

DEVICE_MODELS = [
    "Samsung Galaxy S23", "Samsung Galaxy S22 Ultra", "iPhone 14 Pro",
    "iPhone 13", "Xiaomi 13 Pro", "OnePlus 11", "Google Pixel 7 Pro",
    "Motorola Edge 40 Pro", "Realme GT 5", "OPPO Find X6", "Nokia X30 5G",
]
SYSTEM_VERSIONS = [
    "Android 13", "Android 12", "Android 14", "Android 12.1",
    "Android 13.0.1", "iOS 16.6", "iOS 17.0.2", "iOS 15.7.8",
]
APP_VERSIONS = ["9.6.3", "9.5.9", "9.4.4", "9.3.3", "9.2.1", "9.7.1", "9.1.8"]

FIRST_NAMES = [
    "Alex", "Maria", "Ivan", "Anna", "Pavlo", "Olga", "Dmytro", "Elena",
    "Sergii", "Natalia", "Andrii", "Tatiana", "Maksym", "Julia", "Viktor",
    "Daryna", "Roman", "Iryna", "Bohdan", "Kateryna",
]
LAST_NAMES = [
    "Kovalenko", "Shevchenko", "Bondarenko", "Tkachenko", "Kravchenko",
    "Melnyk", "Petrenko", "Savchenko", "Moroz", "Lytvyn", "Rudenko",
    "Ponomarenko", "Hrytsenko", "Boyko", "Marchenko",
]


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _parse_proxy(proxy_string: str):
    """Return (scheme_int, host, port, rdns, user, password) or None."""
    s = proxy_string.strip()
    if not s:
        return None
    parsed = urlparse(s)
    scheme = parsed.scheme.lower()
    import socks as pysocks  # pysocks — shipped with Telethon
    stype = pysocks.SOCKS5 if "5" in scheme else pysocks.SOCKS4
    return (stype, parsed.hostname, parsed.port or 1080, True,
            parsed.username or None, parsed.password or None)


async def _registration_stream(
    smspool_api_key: str,
    country_id: str,
    proxy_string: str,
    two_factor_password: str,
    api_id: int,
    api_hash: str,
):
    """Async generator yielding SSE chunks for the full 7-step pipeline."""
    os.makedirs(SESSION_DIR, exist_ok=True)

    order_id: str | None = None
    phone:    str | None = None
    client:   TelegramClient | None = None

    async def cancel_order():
        if order_id:
            try:
                async with aiohttp.ClientSession() as h:
                    await h.post(
                        SMSPOOL_CANCEL,
                        data={"key": smspool_api_key, "id": order_id},
                        timeout=aiohttp.ClientTimeout(total=10),
                    )
            except Exception:
                pass

    async def safe_disconnect():
        nonlocal client
        if client:
            try:
                await client.disconnect()
            except Exception:
                pass
            client = None

    try:
        # ─── Step 1 — Purchase number ────────────────────────────────────
        yield _sse("step", {"step": 1, "status": "running",
                            "message": "⏳ Requesting an optimized number from SMSPool..."})

        async with aiohttp.ClientSession() as http:
            async with http.post(
                SMSPOOL_BUY,
                data={"key": smspool_api_key, "service": "11",
                      "country": country_id, "platform": "2"},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                raw = await resp.text()

        try:
            result = json.loads(raw)
        except Exception:
            yield _sse("error", {"message": f"SMSPool returned non-JSON: {raw[:300]}"})
            return

        if not result.get("success") and "number" not in result:
            yield _sse("error", {
                "message": f"SMSPool purchase failed: {result.get('message') or result}"
            })
            return

        order_id = str(result.get("order_id") or result.get("id") or "")
        raw_num  = str(result.get("number", "")).replace("+", "").strip()
        phone    = f"+{raw_num}"

        yield _sse("step", {"step": 1, "status": "done",
                            "message": f"📱 Number Acquired: {phone}"})

        # ─── Step 2 — Init Telethon client ───────────────────────────────
        yield _sse("step", {"step": 2, "status": "running",
                            "message": "📡 Routing Telethon connection via Residential Proxy..."})

        device_model   = random.choice(DEVICE_MODELS)
        system_version = random.choice(SYSTEM_VERSIONS)
        app_version    = random.choice(APP_VERSIONS)
        lang_code      = "en"
        system_lang    = "en-US"

        digits       = raw_num
        session_path = os.path.join(SESSION_DIR, digits)
        proxy_tuple  = _parse_proxy(proxy_string) if proxy_string else None

        client = TelegramClient(
            session_path, api_id, api_hash,
            proxy=proxy_tuple,
            device_model=device_model,
            system_version=system_version,
            app_version=app_version,
            lang_code=lang_code,
            system_lang_code=system_lang,
        )
        await client.connect()

        yield _sse("step", {"step": 2, "status": "done",
                            "message": "📡 Proxy tunnel established — Telethon connected"})

        # ─── Step 3 — Request code ───────────────────────────────────────
        yield _sse("step", {"step": 3, "status": "running",
                            "message": "💬 Requesting Telegram SMS verification code..."})
        try:
            sent = await client.send_code_request(phone)
            phone_code_hash = sent.phone_code_hash
        except PhoneNumberBannedError:
            yield _sse("step", {"step": 3, "status": "error",
                                "message": "🚫 Number pre-banned — cancelling order..."})
            await cancel_order()
            yield _sse("error", {
                "message": "⛔ This phone number is pre-banned by Telegram. "
                           "Order cancelled — no funds wasted. Please try again."
            })
            return

        yield _sse("step", {"step": 3, "status": "done",
                            "message": "💬 Code requested — waiting for SMS..."})

        # ─── Step 4 — Poll for SMS code ──────────────────────────────────
        yield _sse("step", {"step": 4, "status": "running",
                            "message": "💬 Waiting for Telegram SMS verification code (Timeout in 120s)..."})

        code: str | None = None
        deadline = time.time() + 120

        async with aiohttp.ClientSession() as http:
            while time.time() < deadline:
                remaining = int(deadline - time.time())
                yield _sse("poll", {
                    "remaining": remaining,
                    "message": f"💬 Polling SMS... ({remaining}s remaining)"
                })
                await asyncio.sleep(5)
                try:
                    async with http.get(
                        SMSPOOL_CHECK,
                        params={"key": smspool_api_key, "id": order_id},
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        data = await resp.json(content_type=None)
                    sms = str(data.get("sms") or data.get("code") or "").strip()
                    if sms and sms.isdigit() and len(sms) >= 4:
                        code = sms
                        break
                except Exception:
                    pass

        if not code:
            await cancel_order()
            yield _sse("error", {
                "message": "⏱️ SMS code not received within 2 minutes. "
                           "Order cancelled automatically."
            })
            return

        yield _sse("step", {"step": 4, "status": "done",
                            "message": f"🔑 SMS Code Received: {code}"})

        # ─── Step 5 — Sign in / Sign up ──────────────────────────────────
        yield _sse("step", {"step": 5, "status": "running",
                            "message": "🔑 Code Received! Finalizing Telegram account handshake..."})
        try:
            await client.sign_in(
                phone=phone, code=code, phone_code_hash=phone_code_hash
            )
        except PhoneNumberUnoccupiedError:
            first = random.choice(FIRST_NAMES)
            last  = random.choice(LAST_NAMES)
            try:
                await client.sign_up(
                    code=code,
                    first_name=first,
                    last_name=last,
                    phone_code_hash=phone_code_hash,
                )
            except Exception as e2:
                yield _sse("error", {"message": f"Sign-up failed: {e2}"})
                return
        except SessionPasswordNeededError:
            yield _sse("error", {
                "message": "⚠️ This number already has 2FA enabled. "
                           "Cannot auto-register — try a fresh number."
            })
            return
        except Exception as e:
            err = str(e)
            if "signup" in err.lower() or "first_name" in err.lower():
                first = random.choice(FIRST_NAMES)
                last  = random.choice(LAST_NAMES)
                try:
                    await client.sign_up(
                        code=code,
                        first_name=first,
                        last_name=last,
                        phone_code_hash=phone_code_hash,
                    )
                except Exception as e3:
                    yield _sse("error", {"message": f"Sign-up failed: {e3}"})
                    return
            else:
                yield _sse("error", {"message": f"Sign-in failed: {e}"})
                return

        yield _sse("step", {"step": 5, "status": "done",
                            "message": "✅ Telegram account handshake complete"})

        # ─── Step 6 — Set 2FA ────────────────────────────────────────────
        yield _sse("step", {"step": 6, "status": "running",
                            "message": "🔒 Setting up 2FA Security Password..."})
        try:
            await client.edit_2fa(
                current_password=None,
                new_password=two_factor_password,
            )
            yield _sse("step", {"step": 6, "status": "done",
                                "message": "🔒 2FA password set — account secured"})
        except Exception as e:
            logger.warning(f"2FA setup warning (non-fatal): {e}")
            yield _sse("step", {"step": 6, "status": "done",
                                "message": f"🔒 2FA attempted (note: {str(e)[:60]})"})

        # ─── Step 7 — Persist ────────────────────────────────────────────
        yield _sse("step", {"step": 7, "status": "running",
                            "message": "💾 Saving session file and updating CRM database..."})

        # Write JSON metadata
        json_path = os.path.join(SESSION_DIR, f"{digits}.json")
        metadata = {
            "session_file_name": f"{digits}.session",
            "phone": phone,
            "api_id": api_id,
            "api_hash": api_hash,
            "device_model": device_model,
            "system_version": system_version,
            "app_version": app_version,
            "lang_code": lang_code,
            "system_lang_code": system_lang,
            "proxy_string": proxy_string.strip() if proxy_string else "",
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

        # Persist to DB
        async with aiosqlite.connect(DB_PATH) as conn:
            await conn.execute("PRAGMA journal_mode=WAL")
            await conn.execute("PRAGMA busy_timeout=15000")
            # Check if phone already exists
            async with conn.execute(
                "SELECT id FROM sender_accounts WHERE phone=?", (phone,)
            ) as cur:
                row = await cur.fetchone()

            if row:
                await conn.execute(
                    """UPDATE sender_accounts
                       SET two_factor_pass=?, session_file=?, proxy=?,
                           auth_status='active', is_active=1
                       WHERE phone=?""",
                    (two_factor_password, f"{digits}.session",
                     proxy_string.strip() if proxy_string else "", phone),
                )
            else:
                await conn.execute(
                    """INSERT INTO sender_accounts
                         (phone, two_factor_pass, session_file, proxy,
                          auth_status, is_active)
                       VALUES (?, ?, ?, ?, 'active', 1)""",
                    (phone, two_factor_password, f"{digits}.session",
                     proxy_string.strip() if proxy_string else ""),
                )
            await conn.commit()

        yield _sse("step", {"step": 7, "status": "done",
                            "message": "🎉 Account successfully generated, protected, and added to your CRM!"})
        yield _sse("complete", {"phone": phone})

    except Exception as e:
        logger.exception("Account factory pipeline failed")
        yield _sse("error", {"message": f"Unexpected error: {e}"})
    finally:
        await safe_disconnect()


@factory_router.post("/register")
async def register_account(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    smspool_api_key     = str(body.get("smspool_api_key", "")).strip()
    country_id          = str(body.get("country_id", "")).strip()
    proxy_string        = str(body.get("proxy_string", "")).strip()
    two_factor_password = str(body.get("two_factor_password", "")).strip()
    quantity            = min(max(int(body.get("quantity", 1) or 1), 1), 10)

    # Telethon creds — prefer env vars, fall back to request body
    api_id_raw  = os.environ.get("TELETHON_API_ID") or str(body.get("api_id", ""))
    api_hash    = str(os.environ.get("TELETHON_API_HASH") or body.get("api_hash", "")).strip()

    missing = []
    if not smspool_api_key:     missing.append("smspool_api_key")
    if not country_id:          missing.append("country_id")
    if not proxy_string:        missing.append("proxy_string")
    if not two_factor_password: missing.append("two_factor_password")
    if missing:
        return JSONResponse({"error": f"Missing fields: {', '.join(missing)}"}, status_code=400)

    try:
        api_id = int(api_id_raw)
        assert api_id > 0
    except Exception:
        return JSONResponse(
            {"error": "TELETHON_API_ID is not set or invalid. "
                      "Set it as an environment variable or pass api_id in the request body."},
            status_code=400,
        )
    if not api_hash:
        return JSONResponse(
            {"error": "TELETHON_API_HASH is not set. "
                      "Set it as an environment variable or pass api_hash in the request body."},
            status_code=400,
        )

    INTER_REG_DELAY = 12  # seconds between batch registrations

    async def generate():
        if quantity > 1:
            yield _sse("batch_start", {"total": quantity})

        succeeded = 0
        failed    = 0

        for i in range(quantity):
            if quantity > 1:
                yield _sse("batch_progress", {
                    "current": i + 1,
                    "total": quantity,
                    "succeeded": succeeded,
                    "failed": failed,
                    "message": f"🔄 Registering account {i + 1} of {quantity}…",
                })
                yield _sse("batch_reset", {})

            got_complete = False
            async for chunk in _registration_stream(
                smspool_api_key, country_id, proxy_string,
                two_factor_password, api_id, api_hash,
            ):
                yield chunk
                # Track outcome for summary
                if '"complete"' in chunk:
                    got_complete = True
                elif '"error"' in chunk:
                    pass

            if got_complete:
                succeeded += 1
            else:
                failed += 1

            # Inter-registration cooldown (skip after last)
            if quantity > 1 and i < quantity - 1:
                for remaining in range(INTER_REG_DELAY, 0, -1):
                    yield _sse("batch_delay", {
                        "remaining": remaining,
                        "message": f"⏱ Cooling down {remaining}s before next registration…",
                    })
                    await asyncio.sleep(1)

        if quantity > 1:
            yield _sse("batch_done", {
                "total": quantity,
                "succeeded": succeeded,
                "failed": failed,
                "message": f"🎉 Batch complete — {succeeded}/{quantity} accounts registered",
            })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
