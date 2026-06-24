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
import re
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
    SendCodeUnavailableError,
    SessionPasswordNeededError,
)
from telethon.tl.functions.auth import (
    ResendCodeRequest, SendCodeRequest as RawSendCodeRequest, CancelCodeRequest,
)
from telethon.tl import types as tl_types
from telethon.tl.functions.account import UpdateProfileRequest, SetPrivacyRequest
from telethon.tl.types import InputPrivacyKeyPhoneNumber, PrivacyValueDisallowAll
from telethon.tl.functions.photos import UploadProfilePhotoRequest

logger = logging.getLogger("account_factory")


def _strip_html(text: str) -> str:
    """Remove HTML tags from a string (SMSPool sometimes returns HTML in error messages)."""
    return re.sub(r"<[^>]+>", "", str(text or "")).strip()

factory_router = APIRouter(prefix="/api/factory", tags=["factory"])

DB_PATH      = os.environ.get("DB_PATH", "campaigns.db")
SESSION_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions")

SMSPOOL_BUY    = "https://api.smspool.net/purchase/sms"
SMSPOOL_CHECK  = "https://api.smspool.net/sms/check"
SMSPOOL_CANCEL = "https://api.smspool.net/sms/cancel"
SMSPOOL_STOCK  = "https://api.smspool.net/country/retrieve_all"
SMSPOOL_PRICE  = "https://api.smspool.net/request/price"
SMSPOOL_SVC           = "https://api.smspool.net/service/retrieve_all"
SMSPOOL_SUCCESS_RATE  = "https://api.smspool.net/request/success_rate"

# Telegram service ID on SMSPool (verified: service 907 = Telegram)
TELEGRAM_SERVICE_ID = "907"

# ── In-memory country availability cache (key → (timestamp, data)) ──────────
_country_cache: dict[str, tuple[float, list]] = {}
COUNTRY_CACHE_TTL = 60.0  # seconds

# ── Android device profiles for env api_id fallback ──────────────────────────
# Larger pool with real devices spanning Android 11-14 and multiple brands.
# Consistent pairing is important — Telegram flags mismatched iOS version on
# Android device.
DEVICE_PROFILES = [
    # Samsung flagship / mid-range
    ("Samsung Galaxy S24 Ultra",  "Android 14",   "10.0.1"),
    ("Samsung Galaxy S23",        "Android 13",   "9.6.3"),
    ("Samsung Galaxy S22 Ultra",  "Android 12",   "9.5.9"),
    ("Samsung Galaxy S21 FE",     "Android 12",   "9.4.4"),
    ("Samsung Galaxy A54 5G",     "Android 13",   "9.6.3"),
    ("Samsung Galaxy A34 5G",     "Android 13",   "9.5.9"),
    ("Samsung Galaxy A24",        "Android 13",   "9.4.4"),
    ("Samsung Galaxy M54 5G",     "Android 13",   "9.6.3"),
    # Xiaomi / Redmi
    ("Xiaomi 14 Pro",             "Android 14",   "10.0.1"),
    ("Xiaomi 13 Pro",             "Android 13",   "9.7.1"),
    ("Xiaomi 12X",                "Android 12",   "9.5.9"),
    ("Xiaomi Redmi Note 13 Pro",  "Android 13",   "9.6.3"),
    ("Xiaomi Redmi Note 12",      "Android 12",   "9.4.4"),
    ("Xiaomi Redmi 12C",          "Android 12",   "9.3.3"),
    ("Poco X5 Pro",               "Android 13",   "9.5.9"),
    ("Poco F5",                   "Android 13",   "9.7.1"),
    # Google Pixel
    ("Google Pixel 8 Pro",        "Android 14",   "10.0.1"),
    ("Google Pixel 7 Pro",        "Android 14",   "9.6.3"),
    ("Google Pixel 7a",           "Android 14",   "9.7.1"),
    ("Google Pixel 6a",           "Android 13",   "9.5.9"),
    # OnePlus / OPPO
    ("OnePlus 12",                "Android 14",   "10.0.1"),
    ("OnePlus 11",                "Android 13",   "9.4.4"),
    ("OnePlus Nord 3",            "Android 13",   "9.6.3"),
    ("OPPO Find X6 Pro",          "Android 13",   "9.7.1"),
    ("OPPO Reno10 Pro",           "Android 13",   "9.5.9"),
    # Vivo / Realme
    ("Vivo X90 Pro",              "Android 13",   "9.6.3"),
    ("Realme GT 5 Pro",           "Android 14",   "10.0.1"),
    ("Realme 11 Pro+",            "Android 13",   "9.5.9"),
    # Motorola
    ("Motorola Edge 40 Pro",      "Android 13",   "9.3.3"),
    ("Motorola Moto G84",         "Android 13",   "9.4.4"),
    # Huawei (uses Android strings even though GMS-free)
    ("Huawei P60 Pro",            "Android 13",   "9.6.3"),
]

# ── Country → (lang_code, system_lang_code) ───────────────────────────────────
# A real mobile user in UA with lang_code="en" is an obvious bot fingerprint.
# Map country IDs (SMSPool format) to the locale a real device in that country sends.
_COUNTRY_LANG_MAP: dict[str, tuple[str, str]] = {
    "ua":  ("uk", "uk-UA"),   # Ukraine
    "ru":  ("ru", "ru-RU"),   # Russia
    "kz":  ("ru", "ru-KZ"),   # Kazakhstan
    "by":  ("ru", "ru-BY"),   # Belarus
    "kg":  ("ru", "ru-KG"),   # Kyrgyzstan
    "uz":  ("uz", "uz-UZ"),   # Uzbekistan
    "az":  ("az", "az-AZ"),   # Azerbaijan
    "ge":  ("ka", "ka-GE"),   # Georgia
    "am":  ("hy", "hy-AM"),   # Armenia
    "md":  ("ro", "ro-MD"),   # Moldova
    "ph":  ("en", "en-PH"),   # Philippines
    "bd":  ("bn", "bn-BD"),   # Bangladesh
    "in":  ("hi", "hi-IN"),   # India
    "pk":  ("ur", "ur-PK"),   # Pakistan
    "ng":  ("en", "en-NG"),   # Nigeria
    "vn":  ("vi", "vi-VN"),   # Vietnam
    "id":  ("id", "id-ID"),   # Indonesia
    "th":  ("th", "th-TH"),   # Thailand
    "ro":  ("ro", "ro-RO"),   # Romania
    "pl":  ("pl", "pl-PL"),   # Poland
    "de":  ("de", "de-DE"),   # Germany
    "br":  ("pt", "pt-BR"),   # Brazil
    "mx":  ("es", "es-MX"),   # Mexico
    "co":  ("es", "es-CO"),   # Colombia
    "es":  ("es", "es-ES"),   # Spain
    "fr":  ("fr", "fr-FR"),   # France
    "it":  ("it", "it-IT"),   # Italy
    "tr":  ("tr", "tr-TR"),   # Turkey
    "il":  ("he", "he-IL"),   # Israel
    "ae":  ("ar", "ar-AE"),   # UAE
    "sa":  ("ar", "ar-SA"),   # Saudi Arabia
    "eg":  ("ar", "ar-EG"),   # Egypt
}

# ── Registration-grade credential pool ───────────────────────────────────────
# CRITICAL: each entry = (api_id, api_hash, device_model, system_version,
#           app_version, platform).
# Official Telegram app credentials have MUCH higher per-api_id registration
# limits than custom my.telegram.org credentials. A single developer api_id
# gets shadow-blocked after ~20-30 fresh registrations: Telegram returns
# SentCodeTypeSms with a valid hash but never dispatches the carrier SMS.
# 50 consecutive SMS timeouts with no SentCodeTypeApp errors = api_id
# shadow-block, not a carrier issue.
# MUST pair api_id with the correct platform device strings — mismatched
# platform triggers immediate SentCodeTypeApp on fresh numbers.
_REGISTRATION_CREDS: list[tuple] = [
    # Telegram Desktop Windows — api_id 2040
    (2040, "b18441a1ff607e10a989891a5462e627",
     "PC 64bit", "Windows 11", "5.9.5", "desktop"),
    (2040, "b18441a1ff607e10a989891a5462e627",
     "PC 64bit", "Windows 10", "5.8.4", "desktop"),
    # Telegram iOS — api_id 2496
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 16 Pro Max", "18.3.2", "11.4.0", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 15 Pro",     "17.6.1", "10.9.1", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 14 Pro Max", "17.5.1", "10.8.0", "ios"),
]

# Keep _OFFICIAL_CLIENT_CREDS as the recycled-number detection fallback
# (used in the SentCodeTypeApp → ResendCode → official creds check path).
# Tuple: (api_id, api_hash, device_model, system_version, app_version)
_OFFICIAL_CLIENT_CREDS = [
    (
        2040, "b18441a1ff607e10a989891a5462e627",
        "PC 64bit", "Windows 11", "5.9.5",         # Telegram Desktop (Windows)
    ),
    (
        2496, "8da85b0d5bfe62527e5b244c209159c3",
        "iPhone 16 Pro Max", "18.3.2", "11.4.0",   # Telegram iOS
    ),
]

APP_VERSIONS = ["9.6.3", "9.5.9", "9.4.4", "9.3.3", "9.2.1", "9.7.1", "9.1.8"]

MALE_FIRST_NAMES = [
    "Алексей", "Дмитрий", "Иван", "Михаил", "Андрей", "Сергей", "Николай",
    "Виктор", "Роман", "Максим", "Павел", "Артём", "Кирилл", "Влад", "Антон",
]
FEMALE_FIRST_NAMES = [
    "Анна", "Мария", "Ольга", "Екатерина", "Виктория", "Наталья", "Светлана",
    "Елена", "Ирина", "Юлия", "Татьяна", "Ксения", "Дарья", "Алина", "Соня",
]
FIRST_NAMES = MALE_FIRST_NAMES + FEMALE_FIRST_NAMES  # legacy fallback
LAST_NAMES = [
    "Кovalenko", "Shevchenko", "Bondarenko", "Tkachenko", "Kravchenko",
    "Melnyk", "Petrenko", "Savchenko", "Moroz", "Lytvyn", "Rudenko",
    "Ponomarenko", "Hrytsenko", "Boyko", "Marchenko",
]


PENDING_AVATARS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "pending_avatars")
USED_AVATARS_DIR    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "used_avatars")
GEMINI_API_URL      = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

_AVATAR_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _pick_pending_avatar(gender: str = "random") -> str | None:
    """Pick one image from the gender-appropriate subfolder, move it to used/, return dest path.

    Priority: gender subfolder (male/ or female/) → root pending_avatars/ as fallback.
    """
    resolved = gender if gender in ("male", "female") else random.choice(("male", "female"))

    search_paths = [
        (os.path.join(PENDING_AVATARS_DIR, resolved), os.path.join(USED_AVATARS_DIR, resolved)),
        (PENDING_AVATARS_DIR, USED_AVATARS_DIR),  # root fallback
    ]

    for pending_dir, used_dir in search_paths:
        os.makedirs(pending_dir, exist_ok=True)
        os.makedirs(used_dir, exist_ok=True)
        try:
            candidates = [
                f for f in os.listdir(pending_dir)
                if os.path.splitext(f)[1].lower() in _AVATAR_EXTS
            ]
        except OSError:
            continue
        if not candidates:
            continue
        chosen = random.choice(candidates)
        src = os.path.join(pending_dir, chosen)
        dst = os.path.join(used_dir, chosen)
        try:
            shutil.move(src, dst)
            return dst
        except Exception:
            continue
    return None


async def _generate_ai_profile(
    http_session: aiohttp.ClientSession,
    gender: str = "random",
) -> dict[str, str]:
    """Call Gemini to generate a gender-aware Russian-audience Telegram profile.

    Args:
        gender: "male", "female", or "random" (resolved 50/50 internally).
    Returns dict with keys: first_name, last_name, bio, gender (resolved).
    Falls back to static name lists on any error or missing API key.
    """
    resolved_gender = gender if gender in ("male", "female") else random.choice(("male", "female"))
    fb_names = MALE_FIRST_NAMES if resolved_gender == "male" else FEMALE_FIRST_NAMES

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {
            "first_name": random.choice(fb_names),
            "last_name":  random.choice(LAST_NAMES),
            "bio":        "",
            "gender":     resolved_gender,
        }

    if resolved_gender == "female":
        _styles = [
            ("classic_female", 40,
             "a traditional Russian Cyrillic FEMALE first + last name "
             "(e.g. Анна Козлова, Мария Иванова, Ольга Смирнова, Екатерина Новикова). "
             "first_name MUST be Cyrillic and unambiguously feminine."),
            ("latinized_female", 25,
             "a Latinized Russian FEMALE name (e.g. Sonya, Katya Morozova, Anya, Alina Volkov). "
             "last_name is optional."),
            ("nickname_female", 30,
             "a modern informal FEMALE Telegram nickname "
             "(e.g. _kseniya_, masha_ok, its_sonya, nastya.life, life_with_anya). "
             "last_name must be empty string."),
            ("emoji_female", 5,
             "a short feminine Russian name with a lifestyle emoji "
             "(e.g. Лена ✨, Sasha 🌸, Ксюша 💎). last_name must be empty string."),
        ]
        bio_themes = (
            "lifestyle, beauty, travel, family, or positivity. "
            "Use emoji naturally. "
            "Examples: 'живу, чтобы жить 🌸', 'путешествия и кофе ☕', 'мама, жена, подруга 💕'"
        )
        gender_instr = "The profile is for a WOMAN. Use feminine Russian name and warm personal style."
    else:
        _styles = [
            ("classic_male", 35,
             "a traditional Russian Cyrillic MALE first + last name "
             "(e.g. Алексей Громов, Дмитрий Козлов, Иван Петров, Михаил Соколов). "
             "first_name MUST be Cyrillic and unambiguously masculine."),
            ("latinized_male", 25,
             "a Latinized Russian MALE name (e.g. Vlad, Kirill Morozov, Alexey, Dima Solov). "
             "last_name is optional."),
            ("nickname_male", 25,
             "a modern informal MALE Telegram nickname "
             "(e.g. x_vlad_x, real_nikitos, boss_artem, toxic_misha). "
             "last_name must be empty string."),
            ("patriotic_male", 15,
             "a Russian patriotic or subculture MALE name "
             "(e.g. Z_Алексей, Витя🔱, Zа_Победу, Voin2024). last_name can be short or empty."),
        ]
        bio_themes = (
            "business, sports, tech, cars, or patriotism. "
            "Keep it minimal and direct. "
            "Examples: 'бизнес | авто | жизнь', 'работаю на мечту 💪', 'z за победу 🇷🇺'"
        )
        gender_instr = "The profile is for a MAN. Use masculine Russian name and confident direct style."

    _, _, style_desc = random.choices(_styles, weights=[s[1] for s in _styles], k=1)[0]

    include_bio = random.random() < 0.35
    bio_instr = (
        f"Also generate a short bio phrase (max 70 chars) on theme: {bio_themes}"
        if include_bio else
        "Set bio to empty string."
    )

    prompt = (
        f"Generate a realistic Russian Telegram user profile.\n"
        f"{gender_instr}\n"
        f"Name style: {style_desc}\n"
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
                "gender":     resolved_gender,
            }
    except Exception as exc:
        logger.warning(f"AI profile generation failed ({exc}) — using static fallback")
        return {
            "first_name": random.choice(fb_names),
            "last_name":  random.choice(LAST_NAMES),
            "bio":        "",
            "gender":     resolved_gender,
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
async def get_country_availability(api_key: str = "", service: str = TELEGRAM_SERVICE_ID):
    """
    Return all countries that have Telegram (service 907) numbers on SMSPool.
    country/retrieve_all filtered by service gives country names + IDs only;
    stock/price come from the /request/price endpoint (fetched per-country in /service-stock).
    Results are cached for COUNTRY_CACHE_TTL seconds per API key.
    """
    resolved_key = (api_key.strip() or os.environ.get("SMSPOOL_API_KEY", "").strip())
    if not resolved_key:
        return JSONResponse({"error": "api_key is required"}, status_code=400)

    cache_key = f"{resolved_key}:{service}"
    cached = _country_cache.get(cache_key)
    if cached and (time.time() - cached[0]) < COUNTRY_CACHE_TTL:
        return {"countries": cached[1], "cached": True, "ttl": COUNTRY_CACHE_TTL}

    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                SMSPOOL_STOCK,
                data={"key": resolved_key, "service": service},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                raw = await resp.json(content_type=None)
    except Exception as exc:
        return JSONResponse({"error": f"SMSPool unreachable: {exc}"}, status_code=502)

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
        name = str(c.get("name", c.get("country", c.get("countryName", ""))))
        cid  = str(c.get("ID", c.get("id", c.get("country_id", ""))))
        if not name or not cid:
            continue
        # Stock/price not included in country/retrieve_all — shown per-selection via /service-stock
        countries.append({"id": cid, "name": name, "stock": 1, "price": 0})

    countries.sort(key=lambda x: x["name"])

    _country_cache[cache_key] = (time.time(), countries)
    return {"countries": countries, "cached": False, "ttl": COUNTRY_CACHE_TTL}


@factory_router.get("/service-stock")
async def get_service_stock(country: str = "", service: str = TELEGRAM_SERVICE_ID, api_key: str = ""):
    """
    Real-time price + availability for Telegram (service 907) in a specific country.
    Uses SMSPool /request/price — returns {available, stock (=success_rate), price}.
    """
    resolved_key = (api_key.strip() or os.environ.get("SMSPOOL_API_KEY", "").strip())
    if not resolved_key:
        return JSONResponse({"error": "No SMSPool API key"}, status_code=400)
    if not country:
        return JSONResponse({"error": "country is required"}, status_code=400)

    try:
        async with aiohttp.ClientSession() as http:
            async with http.get(
                SMSPOOL_PRICE,
                params={"key": resolved_key, "service": service, "country": country},
                timeout=aiohttp.ClientTimeout(total=12),
            ) as resp:
                raw = await resp.json(content_type=None)
    except Exception as exc:
        return JSONResponse({"error": f"SMSPool unreachable: {exc}"}, status_code=502)

    if isinstance(raw, dict) and raw.get("success") == 0:
        msgs = "; ".join(e.get("message", "") for e in raw.get("errors", []))
        return JSONResponse({"error": msgs or "Invalid API key"}, status_code=401)

    if not isinstance(raw, dict) or "price" not in raw:
        # Service not available in this country
        return {"available": False, "stock": 0, "price": 0.0}

    price        = float(raw.get("price", 0) or 0)
    success_rate = int(raw.get("success_rate", 0) or 0)

    return {
        "available": price > 0,
        "stock":     success_rate,   # 0-100 success-rate used as stock indicator
        "price":     price,
    }


async def _get_best_country(api_key: str, service: str = TELEGRAM_SERVICE_ID) -> dict | None:
    """
    Query SMSPool /request/success_rate and return the country with the highest
    success rate for Telegram. Returns {"id": str, "name": str, "success_rate": int}
    or None on failure.
    """
    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                SMSPOOL_SUCCESS_RATE,
                data={"key": api_key, "service": service},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                raw = await resp.json(content_type=None)
    except Exception:
        return None

    candidates: list[dict] = []
    if isinstance(raw, dict):
        for code, data in raw.items():
            if not isinstance(data, dict):
                continue
            sr   = int(data.get("success_rate", data.get("average_success_rate", 0)) or 0)
            name = str(data.get("country", data.get("name", code)))
            candidates.append({"id": code.lower(), "name": name, "success_rate": sr})
    elif isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            code = str(item.get("short_name", item.get("id", ""))).lower()
            sr   = int(item.get("success_rate", item.get("average_success_rate", 0)) or 0)
            name = str(item.get("country", item.get("name", code)))
            if code:
                candidates.append({"id": code, "name": name, "success_rate": sr})

    if not candidates:
        return None
    candidates.sort(key=lambda x: x["success_rate"], reverse=True)
    return candidates[0]


@factory_router.get("/best-country")
async def get_best_country(api_key: str = "", service: str = TELEGRAM_SERVICE_ID):
    """
    Returns the SMSPool country with the highest Telegram registration success rate.
    Queries POST /request/success_rate and returns the top result.
    """
    resolved_key = (api_key.strip() or os.environ.get("SMSPOOL_API_KEY", "").strip())
    if not resolved_key:
        return JSONResponse({"error": "api_key is required"}, status_code=400)

    best = await _get_best_country(resolved_key, service)
    if not best:
        return JSONResponse({"error": "Could not retrieve success rates from SMSPool"}, status_code=502)
    return best


@factory_router.get("/top-countries")
async def get_top_countries(api_key: str = "", service: str = TELEGRAM_SERVICE_ID, limit: int = 5):
    """
    Returns the top N countries by Telegram registration success rate on SMSPool.
    """
    resolved_key = (api_key.strip() or os.environ.get("SMSPOOL_API_KEY", "").strip())
    if not resolved_key:
        return JSONResponse({"error": "api_key is required"}, status_code=400)

    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                SMSPOOL_SUCCESS_RATE,
                data={"key": resolved_key, "service": service},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                raw = await resp.json(content_type=None)
    except Exception as exc:
        return JSONResponse({"error": f"SMSPool unreachable: {exc}"}, status_code=502)

    candidates: list[dict] = []
    if isinstance(raw, dict):
        for code, data in raw.items():
            if not isinstance(data, dict):
                continue
            sr   = int(data.get("success_rate", data.get("average_success_rate", 0)) or 0)
            name = str(data.get("country", data.get("name", code)))
            candidates.append({"id": code.lower(), "name": name, "success_rate": sr})
    elif isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            code = str(item.get("short_name", item.get("id", ""))).lower()
            sr   = int(item.get("success_rate", item.get("average_success_rate", 0)) or 0)
            name = str(item.get("country", item.get("name", code)))
            if code:
                candidates.append({"id": code, "name": name, "success_rate": sr})

    candidates.sort(key=lambda x: x["success_rate"], reverse=True)
    return {"countries": candidates[:limit]}


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


# ── Known datacenter/cloud-provider CIDR ranges ──────────────────────────────
# Used to detect when the proxy is bypassed and traffic exits from a bare
# server IP (e.g. Replit runs on GCP → 34.x / 35.x range).
import ipaddress as _ipaddress

_DC_NETWORKS: list[_ipaddress.IPv4Network] = [
    _ipaddress.ip_network(cidr, strict=False) for cidr in [
        # Google Cloud Platform (Replit's infrastructure)
        "34.0.0.0/8", "35.0.0.0/8",
        "104.154.0.0/15", "104.196.0.0/14",
        "130.211.0.0/22", "146.148.0.0/17",
        # Amazon Web Services
        "3.0.0.0/8", "18.0.0.0/8", "52.0.0.0/8", "54.0.0.0/8",
        # Microsoft Azure
        "13.64.0.0/11", "20.0.0.0/8", "40.64.0.0/10",
        # Hetzner
        "5.9.0.0/16", "78.46.0.0/15", "88.198.0.0/16",
        "95.216.0.0/16", "116.202.0.0/15", "135.181.0.0/16",
        "157.90.0.0/16", "176.9.0.0/16", "188.40.0.0/16",
        # DigitalOcean
        "104.131.0.0/16", "138.197.0.0/16", "142.93.0.0/16",
        "159.65.0.0/16", "159.89.0.0/16", "165.227.0.0/16",
        "167.99.0.0/16",
        # Vultr
        "45.32.0.0/16", "45.63.0.0/16", "45.76.0.0/16",
        # Linode / Akamai
        "45.33.0.0/16", "45.56.0.0/16", "45.79.0.0/16", "50.116.0.0/16",
        # OVH / OVHcloud
        "5.135.0.0/16", "37.59.0.0/16", "51.75.0.0/16", "51.77.0.0/16",
        "51.79.0.0/16", "51.89.0.0/16", "91.121.0.0/16", "94.23.0.0/16",
        "135.125.0.0/16", "213.32.0.0/16",
    ]
]


def _is_datacenter_ip(ip_str: str) -> bool:
    """Return True if ip_str falls in any known cloud/datacenter CIDR range."""
    try:
        addr = _ipaddress.ip_address(ip_str)
        return any(addr in net for net in _DC_NETWORKS)
    except ValueError:
        return False


async def _get_asyncio_exit_ip(proxy_string: str, timeout: float = 12.0) -> tuple[str | None, str, bool]:
    """
    Verify proxy using python_socks.async_.asyncio — the EXACT same code path
    Telethon uses internally (confirmed from Telethon 1.44 source).
    If this returns a DC IP while _get_exit_ip_via_proxy returned residential,
    python_socks asyncio is broken and Telethon is bypassing the proxy silently.
    Returns (ip_or_None, message, is_datacenter).
    """
    try:
        proxy_tuple = _parse_proxy(proxy_string)
        if proxy_tuple is None:
            return None, "Cannot parse proxy string", False

        _stype, host, port, rdns, user, password = proxy_tuple

        try:
            from python_socks.async_.asyncio import Proxy as _AsyncProxy  # noqa: PLC0415
            from python_socks import ProxyType as _PT                      # noqa: PLC0415
        except ImportError as _ie:
            return None, f"python_socks.async_.asyncio unavailable: {_ie}", False

        proxy = _AsyncProxy.create(
            proxy_type=_PT.SOCKS5,
            host=host,
            port=port,
            rdns=rdns,
            username=user,
            password=password,
        )

        sock = await asyncio.wait_for(
            proxy.connect(dest_host="api.ipify.org", dest_port=80),
            timeout=timeout,
        )

        reader, writer = await asyncio.open_connection(sock=sock)
        writer.write(b"GET / HTTP/1.0\r\nHost: api.ipify.org\r\nConnection: close\r\n\r\n")
        await writer.drain()
        data = await asyncio.wait_for(reader.read(4096), timeout=timeout)
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

        body = data.decode("ascii", errors="ignore").split("\r\n\r\n")[-1].strip()
        ip_match = re.search(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", body)
        if not ip_match:
            return None, f"Unexpected asyncio response: {body[:80]}", False

        ip = ip_match.group(0)
        is_dc = _is_datacenter_ip(ip)
        return ip, f"🔗 Telethon-path IP: {ip}", is_dc

    except Exception as exc:
        return None, f"Asyncio proxy check failed: {str(exc)[:120]}", False


async def _get_exit_ip_via_proxy(proxy_string: str, timeout: float = 10.0) -> tuple[str | None, str, bool]:
    """
    Make a real HTTP GET through the SOCKS5 proxy to api.ipify.org.
    Returns (exit_ip_or_None, human_readable_message, is_datacenter_ip).
    Runs blocking requests call in a thread executor.
    If this passes, HTTP traffic is genuinely routed through the proxy.
    """
    try:
        proxy_tuple = _parse_proxy(proxy_string)
        if proxy_tuple is None:
            return None, "Cannot parse proxy string", False

        _stype, host, port, _rdns, user, password = proxy_tuple

        import requests as _req  # noqa: PLC0415

        if user and password:
            proxy_url = f"socks5h://{user}:{password}@{host}:{port}"
        else:
            proxy_url = f"socks5h://{host}:{port}"

        proxies = {"https": proxy_url, "http": proxy_url}

        def _sync_get() -> str:
            r = _req.get("https://api.ipify.org", proxies=proxies, timeout=timeout)
            r.raise_for_status()
            return r.text.strip()

        loop = asyncio.get_event_loop()
        exit_ip = await loop.run_in_executor(None, _sync_get)
        is_dc = _is_datacenter_ip(exit_ip)
        msg = f"🌍 Exit IP: {exit_ip}" + (" ⚠️ DATACENTER" if is_dc else "")
        return exit_ip, msg, is_dc

    except Exception as exc:
        return None, f"IP check failed: {str(exc)[:100]}", False


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
    warmup_mode: str = "all",
    session_name: str = "",
    gender: str = "random",
):
    """Async generator yielding SSE chunks for the full 8-step pipeline."""
    os.makedirs(SESSION_DIR, exist_ok=True)

    order_code: str | None = None   # alphanumeric e.g. "ECKU5XM9" — used for check/cancel
    phone:      str | None = None
    client:     TelegramClient | None = None

    async def cancel_order():
        if order_code:
            try:
                async with aiohttp.ClientSession() as h:
                    await h.post(
                        SMSPOOL_CANCEL,
                        data={"key": smspool_api_key, "orderid": order_code},
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

        # ─── HTTP exit-IP verification ────────────────────────────────────
        # TCP check above proves the port is reachable. This check proves
        # actual HTTP traffic routes through the proxy — confirms the exit IP
        # is NOT the Replit datacenter IP before spending SMSPool balance.
        yield _sse("preflight", {
            "status": "running",
            "message": "🌍 Verifying exit IP through proxy…",
        })
        exit_ip, ip_msg, is_dc = await _get_exit_ip_via_proxy(proxy_string)
        if is_dc:
            yield _sse("preflight", {
                "status": "error",
                "message": (
                    f"⛔ Datacenter IP detected: {exit_ip} — proxy is NOT routing traffic. "
                    "Telethon would connect from the bare server IP → SentCodeTypeApp on every number."
                ),
                "exit_ip": exit_ip,
                "is_datacenter": True,
            })
            yield _sse("error", {
                "message": (
                    f"⛔ Exit IP {exit_ip} is a datacenter IP — your proxy is not working correctly. "
                    "Fix your proxy string before proceeding to avoid burning SMSPool balance."
                )
            })
            return
        yield _sse("preflight", {
            "status": "done",
            "message": f"{proxy_msg} · {ip_msg}",
            "exit_ip": exit_ip,
            "is_datacenter": False,
        })

        # ─── Gate 3: asyncio path check (Telethon's actual code path) ─────
        # The requests-based exit-IP check above uses PySocks (sync). Telethon
        # uses python_socks.async_.asyncio internally. These are different code
        # paths — a working sync path does NOT guarantee the asyncio path works.
        # This check proves the exact proxy path Telethon will use is live,
        # and that its exit IP is residential (not Replit's datacenter IP).
        yield _sse("preflight", {
            "status": "running",
            "message": "🔗 Verifying Telethon asyncio proxy path…",
        })
        async_ip, async_msg, async_is_dc = await _get_asyncio_exit_ip(proxy_string)
        if async_is_dc:
            yield _sse("preflight", {
                "status": "error",
                "message": (
                    f"⛔ Telethon asyncio path exits from DATACENTER IP {async_ip}! "
                    "python_socks[asyncio] is NOT routing Telethon through your proxy. "
                    "Reinstall: pip install 'python-socks[asyncio]' then restart."
                ),
                "exit_ip": async_ip,
                "is_datacenter": True,
            })
            yield _sse("error", {
                "message": (
                    f"⛔ Telethon proxy BROKEN — asyncio path exits from {async_ip} (datacenter). "
                    "Telethon would register from Replit's IP → SentCodeTypeApp on every number."
                )
            })
            return
        if async_ip is None:
            # asyncio check failed (timeout, connection error, etc.) — warn but don't block
            yield _sse("preflight", {
                "status": "done",
                "message": f"{proxy_msg} · {ip_msg} · ⚠️ Asyncio path: {async_msg}",
                "exit_ip": exit_ip,
                "is_datacenter": False,
            })
        else:
            yield _sse("preflight", {
                "status": "done",
                "message": f"{proxy_msg} · {ip_msg} · {async_msg}",
                "exit_ip": exit_ip,
                "is_datacenter": False,
                "async_exit_ip": async_ip,
            })

        # ─── python-socks guard ───────────────────────────────────────────
        # Telethon needs `python-socks[asyncio]` to actually route through a
        # SOCKS5 proxy.  Without it Telethon silently ignores proxy_tuple and
        # connects straight from the server's datacenter IP — causing Telegram
        # to return SentCodeTypeApp on every single number (which looks like
        # all numbers are recycled, but is really a missing dependency).
        # Fail immediately here, before spending any SMSPool balance.
        if proxy_string:
            try:
                import python_socks  # noqa: F401
            except ImportError:
                yield _sse("error", {
                    "message": (
                        "❌ python-socks not installed — Telethon would silently ignore your proxy "
                        "and connect from the datacenter IP, causing SentCodeTypeApp on every number. "
                        "Fix: pip install 'python-socks[asyncio]' then restart the bot."
                    )
                })
                return

        # ─── Pre-buy success rate gate ────────────────────────────────────
        # Call SMSPool's /request/success_rate BEFORE spending any money.
        # If the chosen country has < PRE_BUY_MIN_SR% success rate we stop
        # immediately — buying would almost certainly yield recycled numbers.
        # Fail-open: if the API is unreachable we warn but proceed.
        PRE_BUY_MIN_SR = 60  # %, below this we refuse to buy

        yield _sse("preflight", {
            "status": "running",
            "message": f"📊 Checking {country_id.upper()} SMS success rate on SMSPool…",
        })
        _pre_sr: int | None = None
        try:
            async with aiohttp.ClientSession() as _sr_http:
                async with _sr_http.post(
                    SMSPOOL_SUCCESS_RATE,
                    data={"key": smspool_api_key, "service": TELEGRAM_SERVICE_ID},
                    timeout=aiohttp.ClientTimeout(total=12),
                ) as _sr_resp:
                    _sr_raw = await _sr_resp.json(content_type=None)

            if isinstance(_sr_raw, dict):
                for _code, _data in _sr_raw.items():
                    if isinstance(_data, dict) and _code.lower() == country_id.lower():
                        _pre_sr = int(_data.get("success_rate",
                                       _data.get("average_success_rate", 0)) or 0)
                        break
            elif isinstance(_sr_raw, list):
                for _item in _sr_raw:
                    if isinstance(_item, dict):
                        _c = str(_item.get("short_name", _item.get("id", ""))).lower()
                        if _c == country_id.lower():
                            _pre_sr = int(_item.get("success_rate",
                                           _item.get("average_success_rate", 0)) or 0)
                            break
        except Exception as _sr_ex:
            yield _sse("preflight", {
                "status": "done",
                "message": f"⚠️ Success rate check failed ({str(_sr_ex)[:60]}) — proceeding",
            })
            _pre_sr = None  # fail-open

        if _pre_sr is not None:
            _sr_icon = "✅" if _pre_sr >= 70 else "⚠️" if _pre_sr >= PRE_BUY_MIN_SR else "🚫"
            yield _sse("preflight", {
                "status": "done" if _pre_sr >= PRE_BUY_MIN_SR else "error",
                "message": f"{_sr_icon} {country_id.upper()} success rate: {_pre_sr}%",
                "success_rate": _pre_sr,
                "country_id": country_id,
            })
            if _pre_sr < PRE_BUY_MIN_SR:
                yield _sse("sms_retry_prompt", {
                    "country_id": country_id,
                    "message": (
                        f"🚫 {country_id.upper()} has only {_pre_sr}% SMS success rate right now "
                        f"(minimum {PRE_BUY_MIN_SR}%). Buying would waste your balance on recycled "
                        "numbers. Switch to: Kazakhstan (KZ), Ukraine (UA), Philippines (PH), "
                        "Georgia (GE), or Bangladesh (BD)."
                    ),
                })
                return
        else:
            yield _sse("preflight", {
                "status": "done",
                "message": f"📊 {country_id.upper()} success rate: N/A — proceeding",
            })

        # ─── Steps 1–4 retry loop ─────────────────────────────────────────
        # If a purchased number fails (SentCodeTypeApp / SMS timeout), automatically
        # cancel it, buy a fresh number and retry — up to MAX_NUM_RETRIES times.
        MAX_NUM_RETRIES = 5
        code: str | None = None
        raw_num: str = ""
        _app_stuck_count    = 0
        _banned_count       = 0   # consecutive pre-banned numbers from this country
        _proxy_fail_count   = 0   # consecutive proxy-unreachable errors
        _sms_timeout_count  = 0   # consecutive SMS timeouts — flag for api_id shadow-block

        # Shuffle the official registration credential pool so each factory
        # session uses a different rotation order.  Each retry attempt cycles
        # to the next credential, ensuring we never hit the same api_id twice
        # in a row when SMS delivery is being shadow-blocked.
        _reg_pool: list[tuple] = _REGISTRATION_CREDS.copy()
        random.shuffle(_reg_pool)

        # Track which api_id / api_hash were ACTUALLY used for the successful
        # registration.  Updated each time we switch credentials.  Saved to DB
        # so groupbroadcaster can reconnect with the correct credential pair.
        _actual_api_id:   int = api_id
        _actual_api_hash: str = api_hash

        for _num_attempt in range(MAX_NUM_RETRIES):

            # ─── Step 1 — Purchase number ─────────────────────────────────
            _retry_label = f" (attempt {_num_attempt+1}/{MAX_NUM_RETRIES})" if _num_attempt else ""
            yield _sse("step", {"step": 1, "status": "running",
                                "message": f"⏳ Buying number from SMSPool{_retry_label}..."})

            try:
                async with aiohttp.ClientSession() as http:
                    async with http.post(
                        SMSPOOL_BUY,
                        data={"key": smspool_api_key, "service": TELEGRAM_SERVICE_ID,
                              "country": country_id, "pricing_option": "1"},
                        timeout=aiohttp.ClientTimeout(total=30),
                    ) as resp:
                        raw = await resp.text()
            except Exception as e_buy:
                yield _sse("error", {"message": f"SMSPool unreachable: {e_buy}"})
                return

            try:
                result = json.loads(raw)
            except Exception:
                yield _sse("error", {"message": f"SMSPool returned non-JSON: {raw[:300]}"})
                return

            if not result.get("success") and "number" not in result:
                yield _sse("error", {
                    "message": f"SMSPool purchase failed: {_strip_html(result.get('message') or str(result))}"
                })
                return

            # SMSPool purchase returns order_id (e.g. "ECKU5XM9")
            order_code = str(result.get("order_code") or result.get("order_id") or result.get("id") or "")
            raw_num    = str(result.get("number", "")).replace("+", "").strip()
            phone      = f"+{raw_num}"
            # SMSPool purchase response may include the cost paid for this number
            num_cost   = float(result.get("cost") or result.get("price") or 0)

            yield _sse("step", {"step": 1, "status": "done",
                                "message": f"📱 Number Acquired: {phone}",
                                "cost": num_cost})

            # ─── Step 2 — Init Telethon client ───────────────────────────
            yield _sse("step", {"step": 2, "status": "running",
                                "message": "📡 Routing Telethon connection via Residential Proxy..."})

            # ── Pick registration credentials for this attempt ────────────────
            # Rotate through official Telegram app credentials.  Official api_ids
            # (2040 Desktop, 2496 iOS) have per-api_id registration headroom orders
            # of magnitude larger than a single developer my.telegram.org credential.
            # 50 consecutive SMS timeouts with no SentCodeTypeApp errors = the user's
            # env api_id is shadow-blocked: Telegram returns SentCodeTypeSms with a
            # valid hash but never dispatches the carrier SMS.  Rotating credentials
            # eliminates this failure mode.
            _cred_idx = _num_attempt % len(_reg_pool)
            _reg_api_id, _reg_api_hash, device_model, system_version, app_version, _reg_plat = _reg_pool[_cred_idx]

            # Update tracking vars so the DB save uses the correct credential pair
            _actual_api_id   = _reg_api_id
            _actual_api_hash = _reg_api_hash

            # Country-aware locale: a Ukrainian number with lang_code="en" is an
            # immediate bot fingerprint.  Desktop/iOS creds still get locale since
            # Telegram users in those countries use localised apps.
            _cid_lower = country_id.lower()
            _reg_lang, _reg_sys_lang = _COUNTRY_LANG_MAP.get(_cid_lower, ("en", "en-US"))

            digits        = raw_num
            effective_stem = session_name if session_name else digits
            session_path  = os.path.join(SESSION_DIR, effective_stem)
            proxy_tuple  = _parse_proxy(proxy_string) if proxy_string else None

            # Delete stale session files — a leftover .session from a previous failed
            # attempt on the same number makes Telegram return SentCodeTypeApp.
            for _ext in (".session", ".session-journal", ".session-wal", ".session-shm"):
                try:
                    os.remove(session_path + _ext)
                except FileNotFoundError:
                    pass

            client = TelegramClient(
                session_path, _reg_api_id, _reg_api_hash,
                proxy=proxy_tuple,
                device_model=device_model,
                system_version=system_version,
                app_version=app_version,
                lang_code=_reg_lang,
                system_lang_code=_reg_sys_lang,
                # Explicit retry/timeout params — defaults are too conservative for
                # residential proxies which can have higher initial latency.
                connection_retries=5,
                retry_delay=2,
                receive_timeout=45,
            )

            # Wrap connect() — previously bare (no try/except), so any routing error
            # like "Host unreachable" or "Connection refused" from the proxy's exit node
            # would escape the generator and kill the whole SSE stream unrecoverably.
            _connect_ok = False
            _proxy_label = f" via {proxy_tuple[1]}:{proxy_tuple[2]}" if proxy_tuple else ""
            for _conn_try in range(3):
                try:
                    await client.connect()
                    _connect_ok = True
                    break
                except Exception as _ce:
                    _ce_str = str(_ce)
                    if _conn_try < 2:
                        yield _sse("step", {"step": 2, "status": "running",
                                            "message": (
                                                f"⚠️ Connect attempt {_conn_try+1}/3 failed "
                                                f"({type(_ce).__name__}: {_ce_str[:60]}) — retrying in 4s…"
                                            )})
                        try:
                            await client.disconnect()
                        except Exception:
                            pass
                        await asyncio.sleep(4)
                    else:
                        yield _sse("step", {"step": 2, "status": "error",
                                            "message": f"❌ Proxy connection failed: {_ce_str[:80]}"})

            if not _connect_ok:
                # All 3 connect attempts failed — cancel this number and retry the loop.
                # Do NOT crash the stream; a different residential exit node may route fine.
                await cancel_order()
                await safe_disconnect()
                _proxy_fail_count += 1
                if _proxy_fail_count >= 2:
                    # Proxy unreachable twice in a row → proxy session is dead.
                    # Buying more numbers would waste balance since they all fail at Step 2.
                    yield _sse("sms_retry_prompt", {
                        "country_id": country_id,
                        "message": (
                            f"🔌 Proxy unreachable {_proxy_fail_count}× in a row — "
                            "the proxy connection is dead. Fix your proxy (try a fresh session URL) "
                            "and restart. No SMSPool balance was spent on those numbers."
                        ),
                    })
                    return
                yield _sse("step", {"step": 2, "status": "running",
                                    "message": "🔄 Connection failed — buying fresh number and retrying…"})
                await asyncio.sleep(3)
                continue

            yield _sse("step", {"step": 2, "status": "done",
                                "message": f"📡 Proxy tunnel established — Telethon connected{_proxy_label}"})

            # ─── Step 3 — Request code (SMS-forced) ──────────────────────
            yield _sse("step", {"step": 3, "status": "running",
                                "message": "💬 Requesting Telegram SMS verification code..."})

            phone_code_hash: str = ""
            code_type_name: str = "SentCodeTypeSms"

            # Use RawSendCodeRequest with CodeSettings to discourage non-SMS delivery.
            # Valid fields: allow_flashcall, current_number, allow_app_hash,
            # allow_missed_call, allow_firebase.  There is NO allow_app field.
            # current_number=False discourages SentCodeTypeApp routing.

            # Human-like delay: a real user takes 1-4 seconds to read the phone
            # number input screen and tap "Send Code".  Sending the request
            # immediately after connect() is a strong bot fingerprint.
            await asyncio.sleep(random.uniform(1.2, 4.1))

            _banned = False
            try:
                raw_result = await client(RawSendCodeRequest(
                    phone_number=phone,
                    api_id=_actual_api_id,
                    api_hash=_actual_api_hash,
                    settings=tl_types.CodeSettings(
                        allow_flashcall=False,
                        allow_missed_call=False,
                        allow_firebase=False,
                        allow_app_hash=False,
                        current_number=False,
                        unknown_number=True,
                    ),
                ))
                phone_code_hash = raw_result.phone_code_hash
                code_type_name  = type(raw_result.type).__name__ if raw_result.type else "SentCodeTypeSms"
            except PhoneNumberBannedError:
                _banned = True
            except Exception:
                # Raw request failed — fall back to Telethon high-level send_code_request.
                # This uses a different internal code path and sometimes succeeds when the
                # raw TL call fails (e.g. on certain proxy/DC routing issues).
                try:
                    fb = await client.send_code_request(phone)
                    phone_code_hash = fb.phone_code_hash
                    code_type_name  = type(fb.type).__name__ if fb.type else "Unknown"
                except PhoneNumberBannedError:
                    _banned = True
                except Exception as e2:
                    _e2_str = str(e2).lower()
                    # Classify the error: transient connection/proxy errors should retry
                    # with a fresh number; permanent errors (auth, flood) should abort.
                    _is_transient = any(x in _e2_str for x in (
                        "disconnected", "not connected", "connection",
                        "timeout", "proxy", "network", "eof",
                    ))
                    yield _sse("step", {"step": 3, "status": "error",
                                        "message": f"❌ Code request failed: {e2}"})
                    await cancel_order()
                    await safe_disconnect()
                    if _is_transient and _num_attempt < MAX_NUM_RETRIES - 1:
                        # Transient connectivity issue — cancel this number, wait, buy another.
                        # Do NOT abort the whole factory; a fresh number + reconnect usually works.
                        yield _sse("step", {"step": 3, "status": "running",
                                            "message": "🔄 Connection dropped — cancelling number, retrying with fresh one…"})
                        await asyncio.sleep(4)
                        continue   # ← retry loop: buy new number
                    yield _sse("error", {"message": f"Failed to request code from Telegram: {e2}"})
                    return

            if _banned:
                _banned_count += 1
                _remaining_after = MAX_NUM_RETRIES - _num_attempt - 1
                if _banned_count >= 3:
                    # 3+ consecutive pre-bans → entire country pool is recycled.
                    # Stop now — continuing just burns more SMSPool balance.
                    yield _sse("step", {"step": 3, "status": "error",
                                        "message": f"🚫 {_banned_count} consecutive pre-banned numbers — {country_id.upper()} pool is exhausted"})
                    await cancel_order()
                    await safe_disconnect()
                    yield _sse("sms_retry_prompt", {
                        "country_id": country_id,
                        "message": (
                            f"🚫 {_banned_count} consecutive pre-banned numbers from {country_id.upper()} — "
                            "this country's pool is recycled/exhausted right now. "
                            "Switch to: Kazakhstan (KZ), Ukraine (UA), Philippines (PH), "
                            "Georgia (GE), or Bangladesh (BD)."
                        ),
                    })
                    return
                yield _sse("step", {"step": 3, "status": "running",
                                    "message": f"🚫 Number pre-banned — cancelling and trying new number… ({_remaining_after} attempt(s) left)"})
                await cancel_order()
                await safe_disconnect()
                continue  # auto-retry with new number

            # ── Non-SMS delivery gate ─────────────────────────────────────────
            # SentCodeTypeApp/Flash/Firebase means Telegram wants to deliver via app.
            #
            # Strategy (3-layer):
            # 1. ResendCodeRequest on the SAME connected client → escalates to SMS for
            #    fresh numbers on carriers that use App-first delivery as an anti-spam
            #    measure (e.g. Vietnamobile 056x).  For recycled numbers ResendCode may
            #    also return SentCodeTypeSms, but the SMS goes to the real owner's SIM
            #    and never appears in SMSPool → detected as timeout in step 4.
            # 2. Official creds check (api_id=2040 / 2496) → only run when ResendCode
            #    still returns a non-SMS type; distinguishes unknown-api_id anti-spam
            #    from genuine recycled numbers for most carriers.
            # 3. If all strategies return non-SMS → confirmed recycled → stop.
            _non_sms = ("App", "Flash", "Firebase", "MissedCall")
            if any(t in code_type_name for t in _non_sms):
                # ── Layer 1: ResendCodeRequest ────────────────────────────────────
                # Call on the still-connected original client (same api_id / session).
                # Telegram often escalates App → SMS on resend for fresh numbers even
                # when it uses App-first delivery as an anti-spam gate.
                _resend_escalated = False
                yield _sse("step", {"step": 3, "status": "running",
                                    "message": f"📲 {code_type_name} — requesting SMS resend (ResendCode)…"})
                try:
                    _rc_result = await client(ResendCodeRequest(
                        phone_number=phone,
                        phone_code_hash=phone_code_hash,
                    ))
                    _rc_type = type(_rc_result.type).__name__ if _rc_result.type else code_type_name
                    # Always update hash — Telegram issues a new hash on every resend
                    phone_code_hash = _rc_result.phone_code_hash
                    if not any(t in _rc_type for t in _non_sms):
                        # Escalated to SMS (or other codeable type)!
                        code_type_name = _rc_type
                        _resend_escalated = True
                        yield _sse("step", {"step": 3, "status": "done",
                                            "message": f"✅ ResendCode escalated to {_rc_type} — polling SMS…"})
                    else:
                        # Still non-SMS → fall through to official creds check
                        code_type_name = _rc_type
                        yield _sse("step", {"step": 3, "status": "running",
                                            "message": f"📲 ResendCode still {_rc_type} — checking with official Telegram creds…"})
                except SendCodeUnavailableError:
                    # Hard recycled signal: Telegram says all delivery methods exhausted,
                    # meaning the code was already delivered to the EXISTING account's
                    # Telegram app.  No SMS fallback is possible.  Buying more numbers
                    # from the same country will produce the same result — stop now.
                    _app_stuck_count += 1
                    yield _sse("step", {"step": 3, "status": "error",
                                        "message": "🚫 SendCodeUnavailable — code delivered to existing account's app; number confirmed recycled"})
                    await cancel_order()
                    await safe_disconnect()
                    yield _sse("sms_retry_prompt", {
                        "country_id": country_id,
                        "message": (
                            f"🚫 {country_id.upper()} pool is recycled — Telegram's SendCodeUnavailable "
                            "confirms these numbers already have accounts. "
                            "Switch to: Kazakhstan (KZ), Ukraine (UA), Philippines (PH), "
                            "Georgia (GE), or Bangladesh (BD)."
                        ),
                    })
                    return
                except Exception as _rc_ex:
                    # ResendCode failed (proxy hiccup, etc.) — proceed to official creds
                    yield _sse("step", {"step": 3, "status": "running",
                                        "message": f"⚠️ ResendCode failed ({type(_rc_ex).__name__}) — trying official creds…"})

                if _resend_escalated:
                    pass  # fall through to step 4 — SMS is on its way
                else:
                    # ── Layer 2: Official creds check ─────────────────────────────
                    # ResendCode didn't escalate to SMS.  Try official Telegram client
                    # credentials (api_id=2040 Desktop, api_id=2496 iOS).  If these get
                    # SentCodeTypeSms the number is fresh but our api_id was hitting
                    # Telegram's anti-spam gate.  If they also return SentCodeTypeApp the
                    # number is almost certainly recycled.
                    _switched_to_official = False
                    for _off_api_id, _off_api_hash, _off_dev, _off_sys, _off_app in _OFFICIAL_CLIENT_CREDS:
                        await safe_disconnect()
                        # Wait for the proxy to close the previous SOCKS5 tunnel before
                        # opening a new one. Without this pause, Decodo (and most residential
                        # proxy providers) reject the second connection immediately with ProxyError
                        # because the first tunnel is still being torn down on their end.
                        await asyncio.sleep(3)
                        # Wipe ALL session artefacts (including WAL/SHM) before new client
                        for _ext in (".session", ".session-journal", ".session-wal", ".session-shm"):
                            try:
                                os.remove(session_path + _ext)
                            except FileNotFoundError:
                                pass
                        _off_client = TelegramClient(
                            session_path, _off_api_id, _off_api_hash,
                            proxy=proxy_tuple,
                            device_model=_off_dev,      # ← platform-correct profile
                            system_version=_off_sys,    # ← must match api_id's platform
                            app_version=_off_app,       # ← actual app version, not Android
                            lang_code="en",
                            system_lang_code="en-US",
                        )
                        # Track which credentials we switched to — DB save must use
                        # these so groupbroadcaster can reconnect with the same api_id.
                        _actual_api_id   = _off_api_id
                        _actual_api_hash = _off_api_hash
                        client = _off_client
                        _off_result = None
                        for _off_try in range(3):  # up to 3 attempts for transient proxy/network errors
                            try:
                                # Always do a clean connect — never trust is_connected() after a
                                # client switch; the MTProto state from the old client bleeds through.
                                if client.is_connected():
                                    await client.disconnect()
                                await client.connect()
                                _off_result = await client(RawSendCodeRequest(
                                    phone_number=phone,
                                    api_id=_off_api_id,
                                    api_hash=_off_api_hash,
                                    settings=tl_types.CodeSettings(
                                        allow_flashcall=False,
                                        allow_missed_call=False,
                                        allow_firebase=False,
                                        allow_app_hash=False,
                                        current_number=False,
                                        unknown_number=True,
                                    ),
                                ))
                                break
                            except PhoneNumberBannedError:
                                _banned = True
                                break
                            except Exception as _e_off:
                                _ename = type(_e_off).__name__
                                # ProxyError / connection errors: longer delay to let proxy recover
                                _retry_delay = 6 if "Proxy" in _ename else 3
                                if _off_try < 2:
                                    yield _sse("step", {"step": 3, "status": "running",
                                                        "message": f"⚠️ Official creds ({_ename}) — retrying in {_retry_delay}s… ({_off_try+1}/3)"})
                                    try:
                                        await client.disconnect()
                                    except Exception:
                                        pass
                                    await asyncio.sleep(_retry_delay)
                                else:
                                    yield _sse("step", {"step": 3, "status": "running",
                                                        "message": f"⚠️ Official creds (api_id={_off_api_id}): {_ename} — all retries exhausted"})
                        if _banned:
                            break
                        if _off_result is not None:
                            phone_code_hash = _off_result.phone_code_hash
                            code_type_name  = type(_off_result.type).__name__ if _off_result.type else code_type_name
                            if not any(t in code_type_name for t in _non_sms):
                                yield _sse("step", {"step": 3, "status": "running",
                                                    "message": f"✅ Official creds (api_id={_off_api_id}) → {code_type_name} — polling SMS…"})
                                _switched_to_official = True
                                break
                            else:
                                yield _sse("step", {"step": 3, "status": "running",
                                                    "message": f"🔴 Official creds (api_id={_off_api_id}) also got {code_type_name} — number is recycled"})

                    if _switched_to_official:
                        pass  # fall through to step 4
                    elif _banned:
                        yield _sse("step", {"step": 3, "status": "running",
                                            "message": "🚫 Number banned — cancelling, buying new number…"})
                        await cancel_order()
                        await safe_disconnect()
                        continue
                    else:
                        # All credential strategies exhausted — number is confirmed recycled.
                        # Official Telegram Desktop also returning SentCodeTypeApp is definitive
                        # proof the number has an existing account. Stop immediately: further
                        # purchases from the same country will waste balance on the same result.
                        _app_stuck_count += 1
                        yield _sse("step", {"step": 3, "status": "error",
                                            "message": (
                                                f"🚫 Recycled number confirmed — ResendCode + all official "
                                                f"credentials returned {code_type_name}. "
                                                "This country's pool has existing accounts. Switch country."
                                            )})
                        await cancel_order()
                        await safe_disconnect()
                        yield _sse("sms_retry_prompt", {
                            "country_id": country_id,
                            "message": (
                                f"🚫 Number pool is recycled — SMSPool's {country_id} numbers already have "
                                "Telegram accounts. ResendCode + official Telegram Desktop creds all returned "
                                "SentCodeTypeApp. Switch to: Kazakhstan (KZ), Ukraine (UA), "
                                "Philippines (PH), Georgia (GE), or Bangladesh (BD)."
                            ),
                        })
                        return

            yield _sse("step", {"step": 3, "status": "done",
                                "message": f"✅ Code sent via {code_type_name} — polling SMSPool..."})

            # ─── Step 4 — Poll for SMS code ──────────────────────────────
            yield _sse("step", {"step": 4, "status": "running",
                                "message": "💬 Waiting for Telegram SMS verification code (Timeout in 120s)..."})

            _deadline    = time.time() + 120
            _resent_code = False

            def _extract_code(raw: str) -> str | None:
                s = str(raw or "").strip()
                if s and s != "0" and s.isdigit() and 4 <= len(s) <= 8:
                    return s
                m = re.search(r"\b(\d{4,8})\b", s)
                return m.group(1) if m else None

            _SMSPOOL_CHECK  = "https://api.smspool.net/sms/check"
            _SMSPOOL_ACTIVE = "https://api.smspool.net/request/active"

            async with aiohttp.ClientSession() as _http:
                while time.time() < _deadline:
                    _remaining = int(_deadline - time.time())

                    # Mid-poll resend at 60 s remaining (halfway through 120s window)
                    if not _resent_code and _remaining <= 60:
                        _resent_code = True
                        try:
                            _resent = await client(ResendCodeRequest(
                                phone_number=phone, phone_code_hash=phone_code_hash,
                            ))
                            phone_code_hash = _resent.phone_code_hash
                            yield _sse("poll", {"remaining": _remaining,
                                                "message": f"🔄 Resending Telegram code... ({_remaining}s left)"})
                        except Exception:
                            pass

                    yield _sse("poll", {"remaining": _remaining,
                                        "message": f"💬 Polling SMS... ({_remaining}s remaining)"})

                    # Keepalive: if the SOCKS5 proxy dropped the idle TCP connection,
                    # Telethon silently becomes disconnected.  Re-connect before the next
                    # poll so sign_in() still works when the code arrives.
                    if not client.is_connected():
                        try:
                            yield _sse("poll", {"remaining": _remaining,
                                                "message": "🔄 Telethon reconnecting (proxy idle timeout)…"})
                            await client.connect()
                        except Exception:
                            pass

                    await asyncio.sleep(4)

                    try:
                        # Primary: /sms/check — catches status 3 (complete) even after
                        # the order leaves the /request/active list.
                        if order_code:
                            async with _http.post(
                                _SMSPOOL_CHECK,
                                data={"key": smspool_api_key, "orderid": order_code},
                                timeout=aiohttp.ClientTimeout(total=10),
                            ) as _resp:
                                _chk = await _resp.json(content_type=None)

                            if isinstance(_chk, dict):
                                _sid = _chk.get("status", 1)
                                # Try every field that may carry the code
                                _raw_sms  = str(_chk.get("sms",      "") or "")
                                _full_sms = str(_chk.get("full_sms", "") or "")
                                _code_f   = str(_chk.get("code",     "") or "")
                                # Show raw response in debug poll so we can diagnose
                                yield _sse("poll", {"remaining": _remaining,
                                                    "message": f"💬 SMSPool check: status={_sid} sms={repr(_raw_sms)} code={repr(_code_f)} ({_remaining}s)"})
                                if _sid == 3 or _raw_sms or _code_f:
                                    code = (_extract_code(_raw_sms)
                                            or _extract_code(_full_sms)
                                            or _extract_code(_code_f))
                                    if code:
                                        break
                                if _sid == 6:
                                    yield _sse("poll", {"remaining": _remaining,
                                                        "message": "💬 Order refunded — will retry..."})
                                    break  # no point waiting; auto-retry outer loop
                                continue  # skip fallback

                        # Fallback: /request/active
                        async with _http.post(
                            _SMSPOOL_ACTIVE,
                            data={"key": smspool_api_key},
                            timeout=aiohttp.ClientTimeout(total=10),
                        ) as _resp:
                            _orders = await _resp.json(content_type=None)

                        if isinstance(_orders, list):
                            for _o in _orders:
                                if not isinstance(_o, dict):
                                    continue
                                if (str(_o.get("order_code", "")) == order_code
                                        or str(_o.get("phonenumber", "")).endswith(raw_num)):
                                    code = (_extract_code(str(_o.get("code", "0")))
                                            or _extract_code(str(_o.get("full_code", ""))))
                                    if not code:
                                        yield _sse("poll", {
                                            "remaining": _remaining,
                                            "message": f"💬 Polling (active)... ({_remaining}s) [{_o.get('status','pending')}]"
                                        })
                                    break
                            if code:
                                break

                    except Exception as _exc:
                        yield _sse("poll", {"remaining": _remaining,
                                            "message": f"💬 Polling... ({_remaining}s) [err: {_exc}]"})

            # End of polling window
            if code:
                break  # exit the number-retry loop — we have a code!

            # No code — cancel order and auto-retry with a new number.
            # Track consecutive timeouts: N≥2 is the api_id shadow-block signature
            # (Telegram accepts RawSendCodeRequest and returns SentCodeTypeSms but
            # never routes the SMS to the carrier).  Emit a diagnostic so the user
            # knows what is happening and that the next attempt will rotate api_id.
            _sms_timeout_count += 1
            if _sms_timeout_count >= 2:
                _nums_left_warn = MAX_NUM_RETRIES - _num_attempt - 1
                yield _sse("poll", {"remaining": 0, "message": (
                    f"⚠️ {_sms_timeout_count} consecutive SMS timeouts "
                    f"(api_id={_actual_api_id}). "
                    "This matches Telegram's api_id shadow-block: SentCodeTypeSms is "
                    "returned but the carrier SMS is never dispatched. "
                    f"Next attempt rotates to a different credential set "
                    f"({_nums_left_warn} attempt(s) left)."
                )})
            await cancel_order()
            await safe_disconnect()
            _nums_left = MAX_NUM_RETRIES - _num_attempt - 1
            if _nums_left > 0:
                yield _sse("poll", {
                    "remaining": 0,
                    "message": f"⏱️ SMS timeout — auto-buying new number ({_nums_left} attempt(s) left)...",
                })
            # continue outer loop

        # ── After retry loop ──────────────────────────────────────────────
        if not code:
            _all_app = _app_stuck_count >= MAX_NUM_RETRIES
            yield _sse("sms_retry_prompt", {
                "country_id": country_id,
                "message": (
                    f"⏱️ All {MAX_NUM_RETRIES} numbers from this country returned SentCodeTypeApp — "
                    "these are recycled numbers with existing Telegram accounts. "
                    "Switch to a different country: Kazakhstan (KZ), Ukraine (UA), Philippines (PH), "
                    "or Georgia (GE) have much fresher number pools."
                ) if _all_app else (
                    f"⏱️ SMS code not received after {MAX_NUM_RETRIES} attempts. "
                    "Try a different country or check your SMSPool balance."
                ),
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

        # Hide phone number from public Telegram profile
        try:
            await client(SetPrivacyRequest(
                key=InputPrivacyKeyPhoneNumber(),
                rules=[PrivacyValueDisallowAll()],
            ))
            logger.info("[factory] Phone number hidden from public profile")
        except Exception as _pe:
            logger.warning("[factory] Could not hide phone privacy: %s", _pe)

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
                _ai_prof = await _generate_ai_profile(_ai_http, gender=gender)

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

            _av_path = _pick_pending_avatar(gender=gender)
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
        json_path = os.path.join(SESSION_DIR, f"{effective_stem}.json")
        metadata = {
            "session_file_name": f"{effective_stem}.session",
            "phone": phone,
            "api_id": _actual_api_id,
            "api_hash": _actual_api_hash,
            "device_model": device_model,
            "system_version": system_version,
            "app_version": app_version,
            "lang_code": _reg_lang,
            "system_lang_code": _reg_sys_lang,
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
                           api_id=?, api_hash=?,
                           auth_status='active', is_active=1
                       WHERE phone=?""",
                    (two_factor_password, f"{effective_stem}.session",
                     proxy_string.strip() if proxy_string else "",
                     _actual_api_id, _actual_api_hash, phone),
                )
            else:
                await conn.execute(
                    """INSERT INTO sender_accounts
                         (phone, two_factor_pass, session_file, proxy,
                          api_id, api_hash, auth_status, is_active)
                       VALUES (?, ?, ?, ?, ?, ?, 'active', 1)""",
                    (phone, two_factor_password, f"{effective_stem}.session",
                     proxy_string.strip() if proxy_string else "",
                     _actual_api_id, _actual_api_hash),
                )
            await conn.commit()

        yield _sse("step", {"step": 8, "status": "done",
                            "message": "🎉 Account generated, profiled, and added to your CRM!"})
        yield _sse("complete", {"phone": phone})

        # ─── Warmup (mode: none / all / ask) ─────────────────────────────
        if warmup_mode != "none":
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
                        if warmup_mode == "all":
                            await _wconn.execute(
                                "UPDATE sender_accounts SET warmup_status='queued', warmup_started_at=? WHERE id=?",
                                (_now, _acc_id),
                            )
                            await _wconn.commit()
                            _start_warmup(_acc_id)
                            yield _sse("warmup_queued", {
                                "account_id": _acc_id,
                                "message": "🔥 Warmup scheduled — account aging in background",
                            })
                        elif warmup_mode == "ask":
                            yield _sse("warmup_prompt", {
                                "account_id": _acc_id,
                                "phone": phone,
                                "message": "❓ Запустити прогрів для цього акаунта?",
                            })
            except Exception as _we:
                logger.warning("[factory] warmup queue failed: %s", _we)

    except Exception as e:
        logger.exception("Account factory pipeline failed")
        yield _sse("error", {"message": f"Unexpected error: {e}"})
    finally:
        await safe_disconnect()


@factory_router.get("/health")
async def factory_health():
    """Quick environment check: python-socks + PySocks installed? saved proxy count? SMSPool key set?"""
    ps_ok = False
    ps_version: str | None = None
    try:
        import python_socks as _ps  # noqa: F401
        import socks as _socks  # noqa: F401  — PySocks, required by Telethon proxy
        ps_ok = True
        ps_version = getattr(_ps, "__version__", "ok")
    except ImportError as _e:
        ps_version = f"missing: {_e}"

    proxy_count = 0
    try:
        async with aiosqlite.connect(DB_PATH) as conn:
            async with conn.execute(
                "SELECT COUNT(*) FROM saved_proxies WHERE proxy_string IS NOT NULL AND proxy_string != ''"
            ) as cur:
                row = await cur.fetchone()
                proxy_count = int(row[0]) if row else 0
    except Exception:
        pass

    smspool_key_set = bool(os.environ.get("SMSPOOL_API_KEY", "").strip())

    return {
        "python_socks": ps_ok,
        "python_socks_version": ps_version,
        "proxy_count": proxy_count,
        "smspool_key_set": smspool_key_set,
    }


async def _pick_auto_switch_proxy(tried_countries: set[str]) -> dict:
    """
    Pick the best proxy from saved_proxies ranked by our own historical success rate
    (factory_country_stats). Cross-references stored proxies with our registration data.

    Returns one of three shapes:
      {"status": "found",   "country_code": ..., "proxy_string": ..., "label": ...}
      {"status": "suggest", "suggested_id": ..., "suggested_name": ...}  — best country but no proxy stored
      {"status": "none"}  — no useful data
    """
    try:
        async with aiosqlite.connect(DB_PATH) as _conn:
            _conn.row_factory = aiosqlite.Row

            # 1. All distinct country codes available in proxy storage (excluding already tried)
            if tried_countries:
                placeholders = ",".join("?" * len(tried_countries))
                _proxy_q = (
                    f"SELECT DISTINCT LOWER(country_code) as cc FROM saved_proxies "
                    f"WHERE LOWER(country_code) NOT IN ({placeholders}) "
                    f"AND proxy_string IS NOT NULL AND proxy_string != ''"
                )
                _proxy_args: list[str] = [c.lower() for c in tried_countries]
            else:
                _proxy_q = (
                    "SELECT DISTINCT LOWER(country_code) as cc FROM saved_proxies "
                    "WHERE proxy_string IS NOT NULL AND proxy_string != ''"
                )
                _proxy_args = []
            async with _conn.execute(_proxy_q, _proxy_args) as _cur:
                proxy_country_set: set[str] = {row["cc"] for row in await _cur.fetchall()}

            # 2. Our own registration stats (successes / attempts = quality score)
            async with _conn.execute(
                "SELECT country_id, country_name, attempts, successes "
                "FROM factory_country_stats WHERE attempts > 0 ORDER BY attempts DESC"
            ) as _cur:
                stats_rows = list(await _cur.fetchall())

            # 3. Find best country that HAS a proxy in storage, ranked by success rate.
            #    ONLY pick a country if we have real performance data for it —
            #    never fall back to a random available proxy just because it exists.
            best_cc:    str | None = None
            best_name:  str | None = None
            best_score: float = -1.0
            for row in stats_rows:
                cid = row["country_id"].lower()
                if cid in proxy_country_set:
                    score = row["successes"] / row["attempts"]
                    if score > best_score:
                        best_score = score
                        best_cc    = cid
                        best_name  = row["country_name"]

            if best_cc:
                async with _conn.execute(
                    "SELECT country_code, proxy_string, label FROM saved_proxies "
                    "WHERE LOWER(country_code) = ? AND proxy_string IS NOT NULL AND proxy_string != '' "
                    "ORDER BY RANDOM() LIMIT 1",
                    (best_cc,),
                ) as _cur:
                    row = await _cur.fetchone()
                if row:
                    return {"status": "found", **dict(row)}

            # 4. No proxy for any untried country — suggest the best-performing country from our stats
            best_sug_cc:    str | None = None
            best_sug_name:  str | None = None
            best_sug_score: float = -1.0
            for row in stats_rows:
                cid = row["country_id"].lower()
                if cid not in tried_countries:
                    score = row["successes"] / row["attempts"]
                    if score > best_sug_score:
                        best_sug_score = score
                        best_sug_cc    = cid
                        best_sug_name  = row["country_name"]

            if best_sug_cc:
                return {"status": "suggest", "suggested_id": best_sug_cc, "suggested_name": best_sug_name or best_sug_cc.upper()}

            return {"status": "none"}
    except Exception:
        return {"status": "none"}


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
    _wm_raw             = str(body.get("warmup_mode", "all")).strip().lower()
    warmup_mode         = _wm_raw if _wm_raw in ("none", "all", "ask") else "all"
    session_prefix      = str(body.get("session_prefix", "")).strip()
    session_start_num   = max(int(body.get("session_start_num", 1) or 1), 1)

    # Profile setup params
    profile_mode = str(body.get("profile_mode", "ai")).strip() or "ai"
    first_name   = str(body.get("first_name",   "")).strip()
    last_name    = str(body.get("last_name",    "")).strip()
    bio          = str(body.get("bio",          "")).strip()
    _avatars_raw = body.get("avatars") or []
    avatars: list[str] = [str(a) for a in _avatars_raw if isinstance(a, str) and a]
    _gender_raw  = str(body.get("gender", "random")).strip().lower()
    gender       = _gender_raw if _gender_raw in ("male", "female", "random") else "random"
    auto_switch  = bool(body.get("auto_switch", False))

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
    MAX_AUTO_SWITCHES = 3

    async def generate():
        if quantity > 1:
            yield _sse("batch_start", {"total": quantity})

        succeeded = 0
        failed    = 0

        # Auto-switch state persists across batch slots: once we find a
        # working proxy/country, all subsequent accounts use it too.
        _switch_count    = 0
        _tried_countries: set[str] = set()
        cur_country_id   = country_id
        cur_proxy_string = proxy_string

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

            computed_session_name = (
                f"{session_prefix}-{session_start_num + i}"
                if session_prefix else ""
            )

            # ── Auto-switch inner loop ─────────────────────────────────────
            # On sms_retry_prompt: if auto_switch is enabled and we still have
            # unused proxies in the store, switch country+proxy and retry the
            # same account slot; otherwise fall through to normal stop logic.
            _slot_done       = False
            got_retry_prompt = False
            got_complete     = False

            while not _slot_done:
                got_complete     = False
                got_retry_prompt = False

                async for chunk in _registration_stream(
                    smspool_api_key, cur_country_id, cur_proxy_string,
                    two_factor_password, api_id, api_hash,
                    profile_mode, first_name, last_name, bio, avatars,
                    warmup_mode,
                    computed_session_name,
                    gender=gender,
                ):
                    yield chunk
                    if '"complete"' in chunk:
                        got_complete = True
                    elif '"sms_retry_prompt"' in chunk:
                        got_retry_prompt = True

                if got_complete:
                    succeeded += 1
                    _slot_done = True
                elif got_retry_prompt and auto_switch and _switch_count < MAX_AUTO_SWITCHES:
                    _tried_countries.add(cur_country_id.lower())
                    _switch_result = await _pick_auto_switch_proxy(_tried_countries)
                    if _switch_result["status"] == "found":
                        _switch_count   += 1
                        cur_country_id   = _switch_result["country_code"]
                        cur_proxy_string = _switch_result["proxy_string"]
                        _proxy_label     = (_switch_result.get("label") or "").strip() or cur_proxy_string[:40]
                        yield _sse("auto_switching", {
                            "country_id":  cur_country_id,
                            "proxy_label": _proxy_label,
                            "switch_num":  _switch_count,
                            "message": (
                                f"🔄 Авто-перемикання → {cur_country_id.upper()} "
                                f"(спроба {_switch_count}/{MAX_AUTO_SWITCHES})…"
                            ),
                        })
                        yield _sse("batch_reset", {})
                    elif _switch_result["status"] == "suggest":
                        # Best country known but no proxy stored for it — prompt user to upload
                        sug_id   = _switch_result["suggested_id"]
                        sug_name = _switch_result["suggested_name"]
                        yield _sse("sms_retry_prompt", {
                            "no_proxy_for":  sug_id,
                            "no_proxy_name": sug_name,
                            "message": (
                                f"🔄 Авто-перемикання: найкраща країна — {sug_name} ({sug_id.upper()}), "
                                f"але проксі для неї немає у сховищі. "
                                f"Додайте проксі для {sug_id.upper()} та запустіть знову."
                            ),
                        })
                        failed     += 1
                        _slot_done  = True
                    else:
                        # No proxies in storage at all for untried countries
                        failed     += 1
                        _slot_done  = True
                else:
                    if not got_complete:
                        failed += 1
                    _slot_done = True

            # SMS retry prompt — stop the batch if no auto-switch resolved it
            if got_retry_prompt and not got_complete:
                if quantity > 1:
                    yield _sse("batch_done", {
                        "total": quantity,
                        "succeeded": succeeded,
                        "failed": failed,
                        "message": f"⏱ Batch paused — SMS timeout on account {i + 1}. "
                                   f"{succeeded} registered, {failed} failed.",
                    })
                return

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


# ── Avatar pool management ────────────────────────────────────────────────────

@factory_router.get("/avatar-counts")
async def get_avatar_counts():
    """Return how many unused photos are in each gender subfolder."""
    result = {}
    for g in ("male", "female"):
        folder = os.path.join(PENDING_AVATARS_DIR, g)
        os.makedirs(folder, exist_ok=True)
        try:
            count = sum(
                1 for f in os.listdir(folder)
                if os.path.splitext(f)[1].lower() in _AVATAR_EXTS
            )
        except OSError:
            count = 0
        result[g] = count
    return JSONResponse(result)


@factory_router.post("/upload-avatars")
async def upload_avatars(request: Request):
    """Save uploaded images to the gender-specific pending_avatars subfolder."""
    from fastapi import Form, UploadFile
    form = await request.form()
    gender_val = str(form.get("gender", "")).strip().lower()
    if gender_val not in ("male", "female"):
        return JSONResponse({"error": "gender must be 'male' or 'female'"}, status_code=400)

    folder = os.path.join(PENDING_AVATARS_DIR, gender_val)
    os.makedirs(folder, exist_ok=True)

    saved = 0
    for key in form:
        field = form[key]
        if not hasattr(field, "filename") or not field.filename:
            continue
        ext = os.path.splitext(field.filename)[1].lower()
        if ext not in _AVATAR_EXTS:
            continue
        safe_name = f"{int(time.time() * 1000)}_{saved}{ext}"
        dest = os.path.join(folder, safe_name)
        content = await field.read()
        with open(dest, "wb") as fh:
            fh.write(content)
        saved += 1

    return JSONResponse({"saved": saved, "gender": gender_val})
