"""
account_factory.py — Automated Telegram Account Registration Pipeline
Streams progress via SSE (text/event-stream) over a POST request.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import random
import shutil
import time
from datetime import datetime, timezone
from io import BytesIO
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
from telethon.tl.functions.account import UpdateProfileRequest
from telethon.tl.functions.photos import UploadProfilePhotoRequest

logger = logging.getLogger("account_factory")

factory_router = APIRouter(prefix="/api/factory", tags=["factory"])

DB_PATH      = os.environ.get("DB_PATH", "campaigns.db")
SESSION_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions")

SMSPOOL_BUY    = "https://api.smspool.net/purchase/sms"
SMSPOOL_CHECK  = "https://api.smspool.net/sms/check"
SMSPOOL_CANCEL = "https://api.smspool.net/sms/cancel"
SMSPOOL_STOCK  = "https://api.smspool.net/country/retrieve_all"

# ── In-memory country availability cache (key → (timestamp, data)) ──────────
_country_cache: dict[str, tuple[float, list]] = {}
COUNTRY_CACHE_TTL = 60.0  # seconds

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


PENDING_AVATARS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "pending_avatars")
USED_AVATARS_DIR    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "used_avatars")
GEMINI_API_URL      = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

_AVATAR_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _pick_pending_avatar() -> str | None:
    """Grab one image from pending_avatars/, move it to used_avatars/, return dest path or None."""
    os.makedirs(PENDING_AVATARS_DIR, exist_ok=True)
    os.makedirs(USED_AVATARS_DIR, exist_ok=True)
    try:
        candidates = [
            f for f in os.listdir(PENDING_AVATARS_DIR)
            if os.path.splitext(f)[1].lower() in _AVATAR_EXTS
        ]
    except OSError:
        return None
    if not candidates:
        return None
    chosen = random.choice(candidates)
    src = os.path.join(PENDING_AVATARS_DIR, chosen)
    dst = os.path.join(USED_AVATARS_DIR, chosen)
    try:
        shutil.move(src, dst)
    except Exception:
        return None
    return dst


async def _generate_ai_profile(http_session: aiohttp.ClientSession) -> dict[str, str]:
    """Call Gemini to generate a Russian-audience Telegram profile.

    Returns {"first_name": ..., "last_name": ..., "bio": ...}.
    Falls back to static name lists on any error or missing API key.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {
            "first_name": random.choice(FIRST_NAMES),
            "last_name":  random.choice(LAST_NAMES),
            "bio":        "",
        }

    # Four name styles with weighted random selection
    _styles = [
        ("classic",    40,
         "a traditional Russian Cyrillic first + last name (e.g. Алексей Громов, Ольга Захарова). "
         "first_name MUST be Cyrillic."),
        ("latin",      25,
         "a Latinized/transliterated Russian name (e.g. Oliya, Kirill Morozov, Sonya). "
         "Mix Latin letters naturally. last_name is optional."),
        ("nickname",   25,
         "a modern informal Russian Telegram nickname (e.g. x_vlad_x, toxic_masha, real_nikitos). "
         "last_name should be empty string."),
        ("subculture", 10,
         "a Russian patriotic or subculture name with Z, V or Cyrillic patriotic markers "
         "(e.g. Z_Алексей, Витя🔱, Zа_Победу). last_name can be short or empty."),
    ]
    _, _, style_desc = random.choices(_styles, weights=[s[1] for s in _styles], k=1)[0]

    include_bio = random.random() < 0.35
    bio_instr = (
        "Also generate a short Russian/English bio phrase (max 70 chars) matching the style."
        if include_bio else
        "Set bio to empty string."
    )

    prompt = (
        f"Generate a realistic Russian Telegram user profile.\n"
        f"Style: {style_desc}\n"
        f"{bio_instr}\n"
        f"Return ONLY valid JSON with no markdown:\n"
        f'{{\"first_name\": \"...\", \"last_name\": \"...\", \"bio\": \"...\"}}'
    )

    try:
        async with http_session.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
            timeout=aiohttp.ClientTimeout(total=18),
        ) as resp:
            if resp.status != 200:
                raise ValueError(f"Gemini HTTP {resp.status}")
            raw_data = await resp.json()
            text = raw_data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text.strip())
            return {
                "first_name": str(parsed.get("first_name") or ""),
                "last_name":  str(parsed.get("last_name")  or ""),
                "bio":        str(parsed.get("bio")        or ""),
            }
    except Exception as exc:
        logger.warning(f"AI profile generation failed ({exc}) — using static fallback")
        return {
            "first_name": random.choice(FIRST_NAMES),
            "last_name":  random.choice(LAST_NAMES),
            "bio":        "",
        }


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


@factory_router.get("/countries")
async def get_country_availability(api_key: str = "", service: str = "11"):
    """
    Return real-time stock + price for every country that has Telegram
    (service 11) numbers available on SMSPool.
    Results are cached for COUNTRY_CACHE_TTL seconds per API key.
    """
    if not api_key:
        return JSONResponse({"error": "api_key is required"}, status_code=400)

    cache_key = f"{api_key}:{service}"
    cached = _country_cache.get(cache_key)
    if cached and (time.time() - cached[0]) < COUNTRY_CACHE_TTL:
        return {"countries": cached[1], "cached": True, "ttl": COUNTRY_CACHE_TTL}

    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                SMSPOOL_STOCK,
                data={"key": api_key, "service": service},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                raw = await resp.json(content_type=None)
    except Exception as exc:
        return JSONResponse({"error": f"SMSPool unreachable: {exc}"}, status_code=502)

    # country/retrieve_all returns [{ID, name}, ...] — no per-service stock field
    # Handle both list and dict responses; also catch API key error shape
    if isinstance(raw, dict) and raw.get("success") == 0:
        msgs = "; ".join(e.get("message", "") for e in raw.get("errors", []))
        return JSONResponse({"error": msgs or "Invalid API key"}, status_code=401)

    countries: list[dict] = []
    items = raw if isinstance(raw, list) else (
        [{"id": k, **v} for k, v in raw.items()] if isinstance(raw, dict) else []
    )
    for c in items:
        if not isinstance(c, dict):
            continue
        stock = int(c.get("stock", c.get("quantity", c.get("count", 1))) or 1)
        price = float(c.get("price", c.get("cost", c.get("rate", 0))) or 0)
        name  = str(c.get("name", c.get("country", c.get("countryName", ""))))
        cid   = str(c.get("ID", c.get("id", c.get("country_id", ""))))
        if not name:
            continue
        countries.append({"id": cid, "name": name, "stock": stock, "price": price})

    # Sort cheapest first, then by stock descending
    countries.sort(key=lambda x: (x["price"], -x["stock"]))

    _country_cache[cache_key] = (time.time(), countries)
    return {"countries": countries, "cached": False, "ttl": COUNTRY_CACHE_TTL}


async def _test_proxy_connection(proxy_string: str, timeout: float = 12.0) -> tuple[bool, str]:
    """
    Test a SOCKS5/SOCKS4 proxy by connecting to Telegram DC1 (149.154.167.91:443).
    Runs the blocking socket call in a thread executor so we don't block the event loop.
    Returns (ok: bool, message: str).
    """
    try:
        proxy_tuple = _parse_proxy(proxy_string)
        if proxy_tuple is None:
            return False, "Invalid or empty proxy string"

        stype, host, port, rdns, user, password = proxy_tuple

        import socks as pysocks  # noqa: PLC0415

        def _sync_connect():
            sock = pysocks.socksocket()
            sock.set_proxy(stype, host, port, rdns, user, password)
            sock.settimeout(timeout)
            sock.connect(("149.154.167.91", 443))  # Telegram DC1
            sock.close()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_connect)
        scheme_label = "SOCKS5" if stype == 2 else "SOCKS4"  # pysocks.SOCKS5 == 2
        return True, f"✅ {scheme_label} tunnel OK via {host}:{port}"

    except Exception as exc:
        short = str(exc)[:120]
        return False, f"Connection refused or timeout: {short}"


async def _registration_stream(
    smspool_api_key: str,
    country_id: str,
    proxy_string: str,
    two_factor_password: str,
    api_id: int,
    api_hash: str,
    profile_mode: str = "ai",
    first_name: str = "",
    last_name: str = "",
    bio: str = "",
    avatars: list | None = None,
):
    """Async generator yielding SSE chunks for the full 8-step pipeline."""
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
        # ─── Preflight — Proxy health check ──────────────────────────────
        yield _sse("preflight", {
            "status": "running",
            "message": f"🔍 Testing proxy connection to Telegram DC1…",
        })
        proxy_ok, proxy_msg = await _test_proxy_connection(proxy_string)
        if not proxy_ok:
            yield _sse("preflight", {"status": "error", "message": proxy_msg})
            yield _sse("error", {
                "message": (
                    f"🔌 Proxy pre-check failed — {proxy_msg}. "
                    "Fix your proxy before proceeding so you don't waste SMSPool balance."
                )
            })
            return
        yield _sse("preflight", {"status": "done", "message": proxy_msg})

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

        # ─── Step 7 — Profile Setup & Warming ───────────────────────────
        yield _sse("step", {"step": 7, "status": "running",
                            "message": "🪪 Configuring account profile…"})

        _profile_display = ""

        if profile_mode == "manual":
            _fn = (first_name or "").strip()
            _ln = (last_name  or "").strip()
            _ab = (bio        or "").strip()
            try:
                await client(UpdateProfileRequest(
                    first_name=_fn, last_name=_ln, about=_ab,
                ))
                _profile_display = f"{_fn} {_ln}".strip() or phone
            except Exception as _pe:
                logger.warning(f"Manual profile update warning: {_pe}")
                _profile_display = phone or ""

            _av_list = list(avatars or [])
            for _i, _av_b64 in enumerate(_av_list):
                try:
                    _img_bytes = base64.b64decode(_av_b64)
                    _uploaded  = await client.upload_file(
                        BytesIO(_img_bytes), file_name=f"photo_{_i}.jpg"
                    )
                    await client(UploadProfilePhotoRequest(file=_uploaded))
                    yield _sse("step", {"step": 7, "status": "running",
                                        "message": f"📸 Uploaded photo {_i + 1}/{len(_av_list)} — building photo history"})
                    await asyncio.sleep(1.5)
                except Exception as _ape:
                    logger.warning(f"Photo upload {_i + 1} failed: {_ape}")

            yield _sse("step", {"step": 7, "status": "done",
                                "message": f"✅ Custom profile applied — {_profile_display}"})

        else:  # AI mode
            async with aiohttp.ClientSession() as _ai_http:
                _ai_prof = await _generate_ai_profile(_ai_http)

            _fn = _ai_prof.get("first_name") or random.choice(FIRST_NAMES)
            _ln = _ai_prof.get("last_name")  or ""
            _ab = _ai_prof.get("bio")        or ""

            try:
                await client(UpdateProfileRequest(first_name=_fn, last_name=_ln, about=_ab))
                _profile_display = f"{_fn} {_ln}".strip()
                yield _sse("step", {"step": 7, "status": "running",
                                    "message": f"🤖 AI identity: {_profile_display}"})
            except Exception as _pe:
                logger.warning(f"AI profile update failed: {_pe}")
                _profile_display = phone or ""

            _av_path = _pick_pending_avatar()
            if _av_path:
                try:
                    _uploaded = await client.upload_file(_av_path)
                    await client(UploadProfilePhotoRequest(file=_uploaded))
                    yield _sse("step", {"step": 7, "status": "running",
                                        "message": "📸 Avatar assigned from pool"})
                except Exception as _ape:
                    logger.warning(f"AI avatar upload failed: {_ape}")
            else:
                yield _sse("step", {"step": 7, "status": "running",
                                    "message": "📁 No pending avatars — add images to assets/pending_avatars/"})

            yield _sse("step", {"step": 7, "status": "done",
                                "message": f"✅ AI profile applied — {_profile_display}"})

        # ─── Step 8 — Persist ────────────────────────────────────────────
        yield _sse("step", {"step": 8, "status": "running",
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

        yield _sse("step", {"step": 8, "status": "done",
                            "message": "🎉 Account generated, profiled, and added to your CRM!"})
        yield _sse("complete", {"phone": phone})

        # ─── Auto-queue warmup ───────────────────────────────────────────
        try:
            from utils.account_warmer import start_warmup_task as _start_warmup  # noqa: PLC0415
            _now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            async with aiosqlite.connect(DB_PATH) as _wconn:
                await _wconn.execute("PRAGMA journal_mode=WAL")
                async with _wconn.execute(
                    "SELECT id FROM sender_accounts WHERE phone=?", (phone,)
                ) as _wcur:
                    _wrow = await _wcur.fetchone()
                if _wrow:
                    _acc_id = int(_wrow[0])
                    await _wconn.execute(
                        "UPDATE sender_accounts SET warmup_status='queued', warmup_started_at=? WHERE id=?",
                        (_now, _acc_id),
                    )
                    await _wconn.commit()
                    _start_warmup(_acc_id)
                    yield _sse("warmup_queued", {"account_id": _acc_id,
                                                  "message": "🔥 Warmup scheduled — account aging in background"})
        except Exception as _we:
            logger.warning("[factory] warmup queue failed: %s", _we)

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

    # Prefer body value; fall back to server-side env var so the UI can omit the key
    smspool_api_key     = (str(body.get("smspool_api_key", "")).strip()
                           or os.environ.get("SMSPOOL_API_KEY", "").strip())
    country_id          = str(body.get("country_id", "")).strip()
    proxy_string        = str(body.get("proxy_string", "")).strip()
    two_factor_password = str(body.get("two_factor_password", "")).strip()
    quantity            = min(max(int(body.get("quantity", 1) or 1), 1), 10)

    # Profile setup params
    profile_mode = str(body.get("profile_mode", "ai")).strip() or "ai"
    first_name   = str(body.get("first_name",   "")).strip()
    last_name    = str(body.get("last_name",    "")).strip()
    bio          = str(body.get("bio",          "")).strip()
    _avatars_raw = body.get("avatars") or []
    avatars: list[str] = [str(a) for a in _avatars_raw if isinstance(a, str) and a]

    # Telethon creds — prefer env vars, fall back to request body
    api_id_raw  = os.environ.get("TELETHON_API_ID") or str(body.get("api_id", ""))
    api_hash    = str(os.environ.get("TELETHON_API_HASH") or body.get("api_hash", "")).strip()

    missing = []
    if not smspool_api_key:     missing.append("smspool_api_key (or set SMSPOOL_API_KEY on server)")
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
                profile_mode, first_name, last_name, bio, avatars,
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


# ── Warmup API ────────────────────────────────────────────────────────────────

@factory_router.post("/warmup/{account_id}/start")
async def start_account_warmup(account_id: int):
    """Queue and start warmup for a registered account."""
    from utils.account_warmer import is_warmup_running, start_warmup_task  # noqa: PLC0415

    if is_warmup_running(account_id):
        return JSONResponse({"ok": True, "started": False, "message": "Warmup already running"})

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        async with conn.execute(
            "SELECT id, warmup_status FROM sender_accounts WHERE id=?", (account_id,)
        ) as cur:
            row = await cur.fetchone()

    if not row:
        return JSONResponse({"error": "Account not found"}, status_code=404)

    status = row[1]
    if status in ("warming",):
        return JSONResponse({"ok": True, "started": False, "message": "Already warming"})

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute(
            "UPDATE sender_accounts SET warmup_status='queued', warmup_started_at=?, "
            "warmup_messages_sent=0, warmup_completed_at=NULL WHERE id=?",
            (now_str, account_id),
        )
        await conn.commit()

    started = start_warmup_task(account_id)
    return JSONResponse({
        "ok": True,
        "started": started,
        "message": "Warmup started" if started else "Warmup queued",
    })


@factory_router.get("/warmup/{account_id}")
async def get_warmup_status(account_id: int):
    """Return warmup status for a single account."""
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT id, warmup_status, warmup_messages_sent, warmup_target, "
            "warmup_started_at, warmup_completed_at FROM sender_accounts WHERE id=?",
            (account_id,),
        ) as cur:
            row = await cur.fetchone()

    if not row:
        return JSONResponse({"error": "Account not found"}, status_code=404)

    return JSONResponse(dict(row))
