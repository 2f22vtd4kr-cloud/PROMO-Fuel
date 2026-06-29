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
    PhoneNumberInvalidError,
    PhoneNumberUnoccupiedError,
    SendCodeUnavailableError,
    SessionPasswordNeededError,
)
from telethon.tl.functions.auth import (
    ResendCodeRequest, SendCodeRequest as RawSendCodeRequest, CancelCodeRequest,
)
from telethon.tl import types as tl_types
from telethon.tl.functions.account import UpdateProfileRequest, SetPrivacyRequest
from telethon.tl.types import InputPrivacyKeyPhoneNumber, InputPhoneContact, PrivacyValueDisallowAll
from telethon.tl.functions.contacts import ImportContactsRequest, DeleteContactsRequest
from telethon.tl.functions.photos import UploadProfilePhotoRequest

logger = logging.getLogger("account_factory")


def _strip_html(text: str) -> str:
    """Remove HTML tags from a string (SMSPool sometimes returns HTML in error messages)."""
    return re.sub(r"<[^>]+>", "", str(text or "")).strip()

factory_router = APIRouter(prefix="/api/factory", tags=["factory"])

DB_PATH      = os.environ.get("DB_PATH", "campaigns.db")
SESSION_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions")

SMSPOOL_BUY          = "https://api.smspool.net/purchase/sms"
SMSPOOL_CHECK        = "https://api.smspool.net/sms/check"
SMSPOOL_CANCEL       = "https://api.smspool.net/sms/cancel"
SMSPOOL_ACTIVE       = "https://api.smspool.net/request/active"
SMSPOOL_STOCK        = "https://api.smspool.net/country/retrieve_all"
SMSPOOL_PRICE        = "https://api.smspool.net/request/price"
SMSPOOL_SVC          = "https://api.smspool.net/service/retrieve_all"
SMSPOOL_SUCCESS_RATE = "https://api.smspool.net/request/success_rate"

# ── Process-level SendCodeUnavailable country blacklist ──────────────────────
# Countries that returned SendCodeUnavailable in this process lifetime.
# SendCodeUnavailable = Telegram definitively confirms the entire pool for that
# country is recycled (existing accounts).  Buying more numbers from the same
# country in the same process will always produce the same result.
# Cleared only on process restart, not between individual registration attempts.
_RECYCLED_COUNTRY_POOL: set[str] = set()

# ── SNSS: In-memory prefix blacklist ─────────────────────────────────────────
# key = "prefix:country_id", value = cumulative recycled count for that prefix.
# Loaded from SQLite at startup; updated in-process on each recycled detection.
# Avoids a DB round-trip inside the tight per-number retry loop.
_RECYCLED_PREFIX_MEM: dict[str, int] = {}

# ── SNSS: Configurable blacklist threshold ────────────────────────────────────
# Minimum recycled-hit count before a prefix is blocked. Adjustable at runtime
# via POST /api/factory/snss/config — no restart required.
_SNSS_MIN_COUNT: int = 2

# Phone prefix length stored in the blacklist (including the leading +).
# 9 chars captures the carrier batch: e.g. "+99870704" for UZ SMSPool batches.
_SNSS_PREFIX_LEN: int = 9

# ── Credential effectiveness stats (in-memory, resets on restart) ─────────────
# Tracks per api_id: sms_ok (Telegram sent SMS), app (recycled/blocked),
# timeout (SMS never arrived in Step 4 window).  Used by the UI dashboard.
_CRED_STATS: dict[int, dict[str, int]] = {}

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
    # CIS / Eastern Europe
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
    "tj":  ("tg", "tg-TJ"),   # Tajikistan
    "tm":  ("tk", "tk-TM"),   # Turkmenistan
    # South / Southeast Asia
    "ph":  ("en", "en-PH"),   # Philippines
    "bd":  ("bn", "bn-BD"),   # Bangladesh
    "in":  ("hi", "hi-IN"),   # India
    "pk":  ("ur", "ur-PK"),   # Pakistan
    "vn":  ("vi", "vi-VN"),   # Vietnam
    "id":  ("id", "id-ID"),   # Indonesia
    "th":  ("th", "th-TH"),   # Thailand
    "kh":  ("km", "km-KH"),   # Cambodia — Khmer; default en-US is a bot fingerprint
    "mm":  ("my", "my-MM"),   # Myanmar / Burma — Burmese
    "la":  ("lo", "lo-LA"),   # Laos — Lao
    "lk":  ("si", "si-LK"),   # Sri Lanka — Sinhala
    "np":  ("ne", "ne-NP"),   # Nepal — Nepali
    "my":  ("ms", "ms-MY"),   # Malaysia — Malay
    "sg":  ("en", "en-SG"),   # Singapore — English
    "mn":  ("mn", "mn-MN"),   # Mongolia — Mongolian
    # East Asia
    "cn":  ("zh", "zh-CN"),   # China
    "tw":  ("zh", "zh-TW"),   # Taiwan
    "hk":  ("zh", "zh-HK"),   # Hong Kong
    "jp":  ("ja", "ja-JP"),   # Japan
    "kr":  ("ko", "ko-KR"),   # South Korea
    # Middle East / North Africa
    "ae":  ("ar", "ar-AE"),   # UAE
    "sa":  ("ar", "ar-SA"),   # Saudi Arabia
    "eg":  ("ar", "ar-EG"),   # Egypt
    "il":  ("he", "he-IL"),   # Israel
    "ir":  ("fa", "fa-IR"),   # Iran — Farsi
    "iq":  ("ar", "ar-IQ"),   # Iraq
    "ma":  ("ar", "ar-MA"),   # Morocco
    "dz":  ("ar", "ar-DZ"),   # Algeria
    "tn":  ("ar", "ar-TN"),   # Tunisia
    # Sub-Saharan Africa
    "ng":  ("en", "en-NG"),   # Nigeria
    "gh":  ("en", "en-GH"),   # Ghana
    "ke":  ("sw", "sw-KE"),   # Kenya — Swahili
    "tz":  ("sw", "sw-TZ"),   # Tanzania — Swahili
    "et":  ("am", "am-ET"),   # Ethiopia — Amharic
    "cm":  ("fr", "fr-CM"),   # Cameroon — French
    "sn":  ("fr", "fr-SN"),   # Senegal — French
    "ci":  ("fr", "fr-CI"),   # Côte d'Ivoire — French
    "mg":  ("fr", "fr-MG"),   # Madagascar — French
    # Europe
    "ro":  ("ro", "ro-RO"),   # Romania
    "pl":  ("pl", "pl-PL"),   # Poland
    "de":  ("de", "de-DE"),   # Germany
    "fr":  ("fr", "fr-FR"),   # France
    "it":  ("it", "it-IT"),   # Italy
    "es":  ("es", "es-ES"),   # Spain
    "pt":  ("pt", "pt-PT"),   # Portugal
    "nl":  ("nl", "nl-NL"),   # Netherlands
    "be":  ("nl", "nl-BE"),   # Belgium
    "cz":  ("cs", "cs-CZ"),   # Czech Republic
    "sk":  ("sk", "sk-SK"),   # Slovakia
    "hu":  ("hu", "hu-HU"),   # Hungary
    "bg":  ("bg", "bg-BG"),   # Bulgaria
    "hr":  ("hr", "hr-HR"),   # Croatia
    "rs":  ("sr", "sr-RS"),   # Serbia
    "gr":  ("el", "el-GR"),   # Greece
    "tr":  ("tr", "tr-TR"),   # Turkey
    # Americas
    "br":  ("pt", "pt-BR"),   # Brazil
    "mx":  ("es", "es-MX"),   # Mexico
    "co":  ("es", "es-CO"),   # Colombia
    "ar":  ("es", "es-AR"),   # Argentina
    "pe":  ("es", "es-PE"),   # Peru
    "cl":  ("es", "es-CL"),   # Chile
    "ve":  ("es", "es-VE"),   # Venezuela
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
    # device_model / system_version must match Telegram Desktop strings exactly
    (2040, "b18441a1ff607e10a989891a5462e627",
     "PC 64bit", "Windows 11",   "5.9.5", "desktop"),
    (2040, "b18441a1ff607e10a989891a5462e627",
     "PC 64bit", "Windows 10",   "5.8.4", "desktop"),
    (2040, "b18441a1ff607e10a989891a5462e627",
     "PC 64bit", "Windows 11",   "5.8.1", "desktop"),
    # Telegram macOS — api_id 2040 (same api_id, different device strings)
    (2040, "b18441a1ff607e10a989891a5462e627",
     "Mac",      "macOS 15.3.1", "11.5",  "desktop"),
    (2040, "b18441a1ff607e10a989891a5462e627",
     "Mac",      "macOS 14.6.1", "10.9",  "desktop"),
    # Telegram iOS — api_id 2496
    # system_version = iOS build (e.g. "18.3.2"), app_version = Telegram app version
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 17 Pro Max",  "18.5",   "11.6.2", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 17 Pro",      "18.5",   "11.6.2", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 16 Pro Max",  "18.3.2", "11.4.0", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 16 Pro",      "18.3.2", "11.4.0", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 16",          "18.2.1", "11.3.0", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 15 Pro Max",  "17.6.1", "10.9.1", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 15 Pro",      "17.6.1", "10.9.1", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 15",          "17.5.1", "10.8.0", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 14 Pro Max",  "17.5.1", "10.8.0", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone 14 Pro",      "17.4.1", "10.7.4", "ios"),
    (2496, "8da85b0d5bfe62527e5b244c209159c3",
     "iPhone SE (3rd gen)","17.4.1", "10.7.4", "ios"),
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
    (
        6, "eb06d4abfb49dc3eeb1aeb98ae0f581e",
        "Samsung Galaxy S24 Ultra", "Android 14", "10.14.0",  # Telegram Android
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


def _ensure_avatar_pool_table() -> None:
    """Create avatar_pool table in campaigns.db if it doesn't exist, and migrate any
    leftover filesystem images from assets/pending_avatars/ into it (one-time).
    Runs a WAL checkpoint at the end so the data is flushed to the main DB file
    and survives container restarts / republishing."""
    import sqlite3 as _sq3
    conn = _sq3.connect(DB_PATH, timeout=15)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS avatar_pool (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                gender   TEXT    NOT NULL,
                filename TEXT    NOT NULL UNIQUE,
                data     BLOB    NOT NULL,
                ext      TEXT    NOT NULL DEFAULT '.jpg',
                added_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
            )
        """)
        conn.commit()
        # One-time migration: import files still on disk into DB then remove them
        for g in ("male", "female"):
            folder = os.path.join(PENDING_AVATARS_DIR, g)
            if not os.path.isdir(folder):
                continue
            for fname in os.listdir(folder):
                ext = os.path.splitext(fname)[1].lower()
                if ext not in _AVATAR_EXTS:
                    continue
                fpath = os.path.join(folder, fname)
                try:
                    with open(fpath, "rb") as fh:
                        blob = fh.read()
                    conn.execute(
                        "INSERT OR IGNORE INTO avatar_pool(gender, filename, data, ext) VALUES (?,?,?,?)",
                        (g, fname, blob, ext),
                    )
                    conn.commit()
                    os.remove(fpath)
                except Exception:
                    pass
        # Flush WAL to main DB file so data persists across restarts / republishing
        conn.execute("PRAGMA wal_checkpoint(FULL)")
        conn.commit()
    finally:
        conn.close()


# Run migration/table-creation once at import time
try:
    _ensure_avatar_pool_table()
except Exception as _e:
    logger.warning(f"avatar_pool table setup failed (will retry on first use): {_e}")


async def _pick_pending_avatar(gender: str = "random") -> tuple[bytes, str] | None:
    """Pick one avatar from the DB pool for the given gender, remove it from pool.

    Returns (image_bytes, ext) or None if the pool is empty.
    Uses aiosqlite to avoid WAL snapshot-isolation gaps with concurrent readers.
    """
    resolved = gender if gender in ("male", "female") else random.choice(("male", "female"))
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        async with conn.execute(
            "SELECT id, data, ext FROM avatar_pool WHERE gender=? ORDER BY RANDOM() LIMIT 1",
            (resolved,),
        ) as cur:
            row = await cur.fetchone()
        if not row:
            async with conn.execute(
                "SELECT id, data, ext FROM avatar_pool ORDER BY RANDOM() LIMIT 1"
            ) as cur:
                row = await cur.fetchone()
        if not row:
            return None
        rid, data, ext = row
        await conn.execute("DELETE FROM avatar_pool WHERE id=?", (rid,))
        await conn.commit()
        return (bytes(data), ext)


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


# ═══════════════════════════════════════════════════════════════════════════════
# SNSS — Smart Number Screening System
# Three pre-registration layers that eliminate recycled numbers before expensive
# Telethon handshakes:
#   Layer 0  Prefix blacklist  — in-memory + SQLite, instant, free
#   Layer 1  Contact import    — existing sender account, ~2 s, free
#   Layer 2  Gemini AI         — pattern analysis after 2+ recycled, advisory
# ═══════════════════════════════════════════════════════════════════════════════

def _ensure_recycled_prefix_table() -> None:
    """Create recycled_prefix_cache table and pre-load entries into _RECYCLED_PREFIX_MEM."""
    import sqlite3 as _sq3
    global _RECYCLED_PREFIX_MEM
    try:
        _conn = _sq3.connect(DB_PATH, timeout=10)
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("""
            CREATE TABLE IF NOT EXISTS recycled_prefix_cache (
                prefix          TEXT    NOT NULL,
                country_id      TEXT    NOT NULL,
                count           INTEGER NOT NULL DEFAULT 1,
                last_seen       REAL    NOT NULL,
                pricing_options TEXT    NOT NULL DEFAULT '[]',
                example_phones  TEXT    NOT NULL DEFAULT '[]',
                PRIMARY KEY (prefix, country_id)
            )
        """)
        _conn.commit()
        _rows = _conn.execute(
            "SELECT prefix, country_id, count FROM recycled_prefix_cache"
        ).fetchall()
        for _pref, _cid, _cnt in _rows:
            _RECYCLED_PREFIX_MEM[f"{_pref}:{_cid.lower()}"] = int(_cnt)
        _conn.close()
        if _RECYCLED_PREFIX_MEM:
            logger.info("[SNSS] Prefix blacklist loaded: %d entries", len(_RECYCLED_PREFIX_MEM))
    except Exception as _e:
        logger.warning("[SNSS] recycled_prefix_cache setup failed: %s", _e)


try:
    _ensure_recycled_prefix_table()
except Exception as _snss_init_err:
    logger.warning("[SNSS] prefix table init failed at import: %s", _snss_init_err)


def _record_cred_stat(api_id: int, event: str) -> None:
    """Increment a per-credential event counter. GIL makes dict ops thread-safe."""
    if api_id not in _CRED_STATS:
        _CRED_STATS[api_id] = {"sms_ok": 0, "app": 0, "timeout": 0}
    _CRED_STATS[api_id][event] = _CRED_STATS[api_id].get(event, 0) + 1


def _record_recycled_prefix(phone: str, country_id: str, pricing_option: str = "1") -> None:
    """Record a recycled phone's prefix to the DB blacklist and in-memory cache.

    Uses a _SNSS_PREFIX_LEN-char prefix (e.g. '+99870704' for +998707040550)
    which corresponds to the carrier-batch level on most virtual-number pools.
    """
    import sqlite3 as _sq3
    prefix = phone[:_SNSS_PREFIX_LEN]
    cid    = country_id.lower()
    key    = f"{prefix}:{cid}"
    _RECYCLED_PREFIX_MEM[key] = _RECYCLED_PREFIX_MEM.get(key, 0) + 1
    try:
        _conn = _sq3.connect(DB_PATH, timeout=8)
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("""
            INSERT INTO recycled_prefix_cache
                (prefix, country_id, count, last_seen, pricing_options, example_phones)
            VALUES (?, ?, 1, ?, json_array(?), json_array(?))
            ON CONFLICT(prefix, country_id) DO UPDATE SET
                count          = count + 1,
                last_seen      = excluded.last_seen,
                pricing_options = CASE
                    WHEN instr(pricing_options, ?) = 0
                    THEN json_insert(pricing_options, '$[#]', ?)
                    ELSE pricing_options END,
                example_phones = CASE
                    WHEN length(example_phones) < 250
                    THEN json_insert(example_phones, '$[#]', ?)
                    ELSE example_phones END
        """, (
            prefix, cid, time.time(),
            pricing_option, phone,
            pricing_option, pricing_option,
            phone,
        ))
        _conn.commit()
        _conn.close()
        logger.debug("[SNSS] Recorded recycled prefix %s (count=%d)", prefix, _RECYCLED_PREFIX_MEM[key])
    except Exception as _e:
        logger.warning("[SNSS] Failed to persist recycled prefix %s: %s", prefix, _e)


def _check_prefix_blacklist(
    phone: str,
    country_id: str,
    min_count: int | None = None,
) -> tuple[bool, int, str]:
    """Check if a phone number's prefix is in the recycled blacklist.

    Returns (hit, count, prefix):
        hit=True means this prefix has been seen ≥ threshold times as recycled —
        the number should be cancelled immediately without connecting Telethon.

    Uses _SNSS_MIN_COUNT global (adjustable at runtime) when min_count is None.
    """
    threshold = min_count if min_count is not None else _SNSS_MIN_COUNT
    prefix = phone[:_SNSS_PREFIX_LEN]
    cid    = country_id.lower()
    count  = _RECYCLED_PREFIX_MEM.get(f"{prefix}:{cid}", 0)
    return count >= threshold, count, prefix


async def _check_registered_via_contact(phone: str) -> bool | None:
    """Pre-screen a phone number via contacts.importContacts on an idle sender account.

    Catches recycled numbers whose owners have PUBLIC privacy settings (~40-60%
    of recycled pools) BEFORE the expensive Telethon registration handshake.

    Returns:
        True   — number confirmed registered on Telegram (recycle it)
        False  — not found (may be fresh, or the account has privacy protection)
        None   — check skipped (no idle account available, connection error, etc.)

    Always fail-open — never block registration on any error.
    """
    import sqlite3 as _sq3
    try:
        _conn = _sq3.connect(DB_PATH, timeout=5)
        _conn.row_factory = _sq3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _row = _conn.execute("""
            SELECT session_file, api_id, api_hash
            FROM   sender_accounts
            WHERE  is_active    = 1
              AND  is_banned    = 0
              AND  broadcasting = 0
              AND  session_file IS NOT NULL
              AND  session_file != ''
            ORDER  BY RANDOM()
            LIMIT  1
        """).fetchone()
        _conn.close()

        if _row is None:
            return None

        _sess     = str(_row["session_file"] or "").strip().removesuffix(".session")
        _api_id   = int(_row["api_id"]   or 0)
        _api_hash = str(_row["api_hash"] or "").strip()

        if not (_sess and _api_id and _api_hash):
            return None
        if not os.path.exists(_sess + ".session"):
            return None

        # Connect without proxy — this is a quick background check, not registration.
        # Direct-server connection for ImportContactsRequest is not flagged by Telegram.
        _chk = TelegramClient(_sess, _api_id, _api_hash,
                               connection_retries=1, retry_delay=1)
        try:
            await asyncio.wait_for(_chk.connect(), timeout=7.0)
            if not await _chk.is_user_authorized():
                await _chk.disconnect()
                return None

            _res = await asyncio.wait_for(
                _chk(ImportContactsRequest([
                    InputPhoneContact(client_id=0, phone=phone, first_name="X", last_name="")
                ])),
                timeout=6.0,
            )
            _found = len(_res.users) > 0

            if _found and _res.users:
                try:
                    await asyncio.wait_for(
                        _chk(DeleteContactsRequest(id=list(_res.users))),
                        timeout=4.0,
                    )
                except Exception:
                    pass

            await _chk.disconnect()
            return _found

        except (asyncio.TimeoutError, Exception) as _ex:
            logger.debug("[SNSS] Contact check error for %s: %s", phone, _ex)
            try:
                await _chk.disconnect()
            except Exception:
                pass
            return None

    except Exception as _outer:
        logger.debug("[SNSS] Contact check outer error: %s", _outer)
        return None


async def _ai_analyze_recycled_pattern(
    recycled_phones: list[str],
    country_id: str,
    pricing_option: str,
    http_session: aiohttp.ClientSession,
) -> dict | None:
    """Ask Gemini to identify patterns in confirmed-recycled phone numbers.

    Returns dict with keys:
        prefix         — longest common prefix identified (e.g. '+99870704')
        confidence     — 0-100 estimate that the ENTIRE current batch is recycled
        switch_pool    — whether switching pricing_option would likely help
        recommendation — ≤120-char advisory for the operator
    Returns None on any error or missing API key.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or len(recycled_phones) < 2:
        return None

    next_pool  = "0" if pricing_option == "1" else ("1" if pricing_option == "2" else "2")
    phones_str = "\n".join(f"  • {p}" for p in recycled_phones)
    prompt = (
        f"You are analyzing a Telegram registration failure pattern.\n\n"
        f"SMSPool country: {country_id} | current pricing pool: {pricing_option} "
        f"(0=cheapest/mixed, 1=standard, 2=premium)\n\n"
        f"Phone numbers purchased from SMSPool — ALL confirmed recycled "
        f"(they already had Telegram accounts):\n{phones_str}\n\n"
        f"Tasks:\n"
        f"1. Find the LONGEST common prefix among these numbers (≥6 chars, including leading +).\n"
        f"2. Estimate 0-100 confidence that the entire current SMSPool batch is recycled.\n"
        f"3. Would switching to pricing pool {next_pool} likely provide DIFFERENT number batches? "
        f"(true or false)\n"
        f"4. Write a ≤120-char operator recommendation — Russian for CIS countries, "
        f"English otherwise.\n\n"
        f"Return ONLY valid JSON with no markdown:\n"
        f'{{\"prefix\": \"+...\", \"confidence\": 80, \"switch_pool\": true, '
        f'\"recommendation\": \"...\"}}'
    )

    try:
        async with http_session.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
            timeout=aiohttp.ClientTimeout(total=12),
        ) as _resp:
            if _resp.status != 200:
                logger.warning("[SNSS/AI] Gemini HTTP %d", _resp.status)
                return None
            _raw  = await _resp.json()
            _text = _raw["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(_text.strip())
    except Exception as _e:
        logger.warning("[SNSS/AI] Gemini analysis failed: %s", _e)
        return None


_WKWEBVIEW_MIN_BYTES = 4096  # WKWebView (Telegram iOS) buffers chunks until this threshold

def _sse(event: str, data: dict) -> str:
    """Build a padded SSE chunk.

    WKWebView (used by Telegram iOS Mini App) internally buffers incoming
    network data and only delivers it to JavaScript once the buffer reaches
    ~4 KB.  Small SSE events (50–150 bytes) sit in that buffer for tens of
    seconds before the UI ever sees them, making all 8 factory steps appear
    frozen.  Padding every chunk to ≥ 4096 bytes forces an immediate flush.

    We prepend a single SSE comment (`: <spaces>`) to reach the threshold.
    SSE comments are stripped by the browser's EventSource parser and are
    invisible to application code.
    """
    body = f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    body_bytes = len(body.encode("utf-8"))
    # comment overhead: ": " + spaces + "\n"  →  2 + pad + 1 = pad + 3
    pad = max(0, _WKWEBVIEW_MIN_BYTES - body_bytes - 3)
    if pad > 0:
        return f": {' ' * pad}\n{body}"
    return body


# Pre-built padded keepalive comment (also needs to hit the 4 KB threshold)
_KEEPALIVE_SSE = ": keepalive" + " " * max(0, _WKWEBVIEW_MIN_BYTES - len(": keepalive") - 2) + "\n\n"


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
    Returns {available, stock (=success_rate 0-100), price, quantity (actual available numbers)}.
    Fetches price/success_rate and pool quantity in parallel from SMSPool.
    """
    resolved_key = (api_key.strip() or os.environ.get("SMSPOOL_API_KEY", "").strip())
    if not resolved_key:
        return JSONResponse({"error": "No SMSPool API key"}, status_code=400)
    if not country:
        return JSONResponse({"error": "country is required"}, status_code=400)

    async def _fetch_price():
        try:
            async with aiohttp.ClientSession() as http:
                async with http.get(
                    SMSPOOL_PRICE,
                    params={"key": resolved_key, "service": service, "country": country},
                    timeout=aiohttp.ClientTimeout(total=12),
                ) as resp:
                    return await resp.json(content_type=None)
        except Exception:
            return None

    async def _fetch_quantity():
        """Query /pool/retrieve_valid to get actual available number count."""
        try:
            async with aiohttp.ClientSession() as http:
                async with http.post(
                    "https://api.smspool.net/pool/retrieve_valid",
                    data={"key": resolved_key, "service": service, "country": country, "web": "1"},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    return await resp.json(content_type=None)
        except Exception:
            return None

    raw, pools_raw = await asyncio.gather(_fetch_price(), _fetch_quantity())

    if raw is None:
        return JSONResponse({"error": "SMSPool unreachable"}, status_code=502)

    if isinstance(raw, dict) and raw.get("success") == 0:
        msgs = "; ".join(e.get("message", "") for e in raw.get("errors", []))
        return JSONResponse({"error": msgs or "Invalid API key"}, status_code=401)

    if not isinstance(raw, dict) or "price" not in raw:
        return {"available": False, "stock": 0, "price": 0.0, "quantity": 0}

    price        = float(raw.get("price", 0) or 0)
    success_rate = int(raw.get("success_rate", 0) or 0)

    # Parse pool quantity — total available numbers across all pools for this country+service
    quantity = 0
    if isinstance(pools_raw, list):
        for pool in pools_raw:
            if isinstance(pool, dict):
                q = int(pool.get("stock", pool.get("quantity", pool.get("available", 0)) or 0) or 0)
                quantity += q
    elif isinstance(pools_raw, dict):
        quantity = int(pools_raw.get("stock", pools_raw.get("quantity", pools_raw.get("available", 0)) or 0) or 0)

    return {
        "available": price > 0,
        "stock":     success_rate,
        "price":     price,
        "quantity":  quantity,
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


@factory_router.get("/smspool-rates")
async def get_smspool_rates(api_key: str = "", ids: str = ""):
    """
    Returns SMSPool success rates for a comma-separated list of country IDs.
    Used by the AI Вибір panel to overlay real-time SMSPool data onto AI rankings.
    """
    resolved_key = (api_key.strip() or os.environ.get("SMSPOOL_API_KEY", "").strip())
    if not resolved_key:
        return JSONResponse({"error": "api_key is required"}, status_code=400)

    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                SMSPOOL_SUCCESS_RATE,
                data={"key": resolved_key, "service": TELEGRAM_SERVICE_ID},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                raw = await resp.json(content_type=None)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)

    filter_ids: set[str] = {x.strip().lower() for x in ids.split(",") if x.strip()} if ids.strip() else set()

    results: list[dict] = []
    if isinstance(raw, dict):
        for code, data in raw.items():
            if not isinstance(data, dict):
                continue
            cid = code.lower()
            if filter_ids and cid not in filter_ids:
                continue
            sr = int(data.get("success_rate", data.get("average_success_rate", 0)) or 0)
            results.append({"id": cid, "success_rate": sr})
    elif isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("short_name", item.get("id", ""))).lower()
            if not cid:
                continue
            if filter_ids and cid not in filter_ids:
                continue
            sr = int(item.get("success_rate", item.get("average_success_rate", 0)) or 0)
            results.append({"id": cid, "success_rate": sr})

    return {"rates": results}


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


import re as _re

# ── Global monotonic session counter ─────────────────────────────────────────
# Each registration attempt (including retries and batch slots) must use a
# strictly unique residential exit node.  A simple relative +1 bump fails
# because the outer generate() loop always passes the original proxy_string
# (e.g. session-1) to every new _registration_stream call — so every stream
# bumps session-1 → session-2 and reuses the same cooling exit node.
# A global counter solves this: session-1, session-2, session-3 … across ALL
# streams and ALL retries, never repeating a node within a process lifetime.
_PROXY_SESSION_COUNTER: int = 0

# ── +7 prefix awareness ──────────────────────────────────────────────────────
# Russia and Kazakhstan both use the +7 country code and therefore draw from
# the SAME SMSPool pool.  Suggesting "Kazakhstan" when the +7 pool is recycled
# is useless — it's identical inventory.  Any country_id that resolves to +7
# must exclude both RU and KZ from its alternative suggestions.
_PLUS7_COUNTRY_IDS: frozenset[str] = frozenset({"7", "ru", "kz", "russia", "kazakhstan"})

# Alternatives ordered best → last (freshest pools first based on historical SR)
_ALT_COUNTRY_POOL = [
    ("ua", "Ukraine"),
    ("ph", "Philippines"),
    ("ge", "Georgia"),
    ("bd", "Bangladesh"),
    ("kz", "Kazakhstan"),
    ("in", "India"),
]


def _suggest_alt_countries(country_id: str) -> str:
    """Build a smart 'Switch to:' suggestion string, excluding the current
    country and any pool-siblings (Russia + Kazakhstan share +7 → same pool).

    Returns a ready-to-append sentence including the ⚠️ note for +7 countries.
    """
    cid = country_id.lower().strip()
    is_plus7 = cid in _PLUS7_COUNTRY_IDS

    alts = []
    for code, name in _ALT_COUNTRY_POOL:
        if is_plus7 and code in ("kz", "ru"):
            continue  # same +7 pool — useless suggestion
        if code == cid:
            continue  # same country the user is already using
        alts.append(f"{name} ({code.upper()})")

    suggestion = "Switch to: " + ", ".join(alts) + "."
    if is_plus7:
        suggestion = (
            "⚠️ Russia and Kazakhstan share the +7 prefix — they're the same SMSPool pool. "
            + suggestion
        )
    # Always append alternative provider hint — SMSPool's virtual number pools for
    # CIS/South-East Asian countries are notoriously recycled.  5sim and SMSBower
    # use different carrier batches and consistently have lower recycled rates.
    suggestion += (
        " Or switch provider: 5sim.net → Telegram service (often 60-80% success rate for UZ/KZ/UA). "
        "SMSBower is another option."
    )
    return suggestion


def _next_session_proxy(proxy_string: str) -> tuple[str, int]:
    """Replace session-N in proxy_string with the next globally unique session number.

    Returns (updated_proxy_string, new_session_number).
    If the proxy_string contains no session-N pattern the string is returned
    unchanged and session_number=0 (indicates no-op for logging).

    Thread-safe within a single-threaded asyncio event loop (CPython GIL
    protects the integer increment).
    """
    global _PROXY_SESSION_COUNTER
    if not proxy_string or not _re.search(r"session-\d+", proxy_string):
        return proxy_string, 0
    _PROXY_SESSION_COUNTER += 1
    n = _PROXY_SESSION_COUNTER
    return _re.sub(r"session-\d+", f"session-{n}", proxy_string, count=1), n


def _rewrite_proxy_country(proxy_string: str, country_id: str) -> str:
    """Rewrite the provider country-selector in a residential proxy username.

    Many residential providers (Decodo/Smartproxy, Bright Data, IPRoyal, etc.)
    embed the target country as `country-CC` inside the username, e.g.:
        user-sp8eeeap0s-session-3-country-uz:pass@gate.decodo.com:7000

    This rewrite ONLY fires when country_id is already a 2-letter ISO alpha-2
    code (e.g. "uz", "kz", "ph") — which happens when the operator types a
    custom country code directly.

    SMSPool's dropdown returns their own internal numeric IDs (e.g. "44" is
    Uzbekistan in SMSPool's numbering — NOT the UK dialing code). Numeric IDs
    must NEVER be used for the rewrite; the proxy is already set correctly by
    the operator for the target country.

    Returns proxy_string unchanged if:
      - country_id is numeric (SMSPool internal ID — skip rewrite)
      - country_id is not exactly 2 alpha chars (unknown format — skip rewrite)
      - no `country-XX` pattern exists in the proxy URL (plain IP proxy)
    """
    if not proxy_string or not country_id:
        return proxy_string
    cc = country_id.strip().lower()
    if len(cc) != 2 or not cc.isalpha():
        return proxy_string
    rewritten = _re.sub(r"country-[a-z]{2}", f"country-{cc}", proxy_string, flags=_re.IGNORECASE)
    return rewritten


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


async def _proxy_geo_check(
    exit_ip: str,
    target_cc: str,
    timeout: float = 8.0,
) -> dict:
    """
    Look up the country of `exit_ip` via ip-api.com (no proxy needed — it's a
    plain internet lookup of an IP we already confirmed is residential).
    Returns a dict:
      detected_cc:      str   — 2-letter ISO code from ip-api ("UA", "PL", …)
      detected_country: str   — human country name ("Ukraine", "Poland", …)
      org:              str   — ISP / org string ("AS12345 Some ISP Ltd")
      match:            bool  — detected_cc.lower() == target_cc.lower()
      latency_ms:       int   — round-trip time to ip-api in ms
      error:            str | None
    """
    import time as _time  # noqa: PLC0415
    import requests as _req  # noqa: PLC0415

    t0 = _time.monotonic()
    try:
        fields = "status,country,countryCode,org,query"
        r = _req.get(
            f"http://ip-api.com/json/{exit_ip}?fields={fields}",
            timeout=timeout,
        )
        r.raise_for_status()
        j = r.json()
        latency_ms = int((_time.monotonic() - t0) * 1000)

        if j.get("status") != "success":
            return {
                "detected_cc": "", "detected_country": "", "org": "",
                "match": False, "latency_ms": latency_ms,
                "error": f"ip-api returned status={j.get('status')}",
            }

        detected_cc = (j.get("countryCode") or "").upper()
        match = detected_cc.lower() == target_cc.lower()
        return {
            "detected_cc":      detected_cc,
            "detected_country": j.get("country", ""),
            "org":              j.get("org", ""),
            "match":            match,
            "latency_ms":       latency_ms,
            "error":            None,
        }
    except Exception as exc:
        latency_ms = int((_time.monotonic() - t0) * 1000)
        return {
            "detected_cc": "", "detected_country": "", "org": "",
            "match": False, "latency_ms": latency_ms,
            "error": str(exc)[:120],
        }


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
    force_country: bool = False,
    max_attempts: int = 20,
):
    """Async generator yielding SSE chunks for the full 8-step pipeline."""
    os.makedirs(SESSION_DIR, exist_ok=True)

    # ── Process-level recycled country check ──────────────────────────────────
    # If a previous attempt in this Python process already hit SendCodeUnavailable
    # for this country, the entire SMSPool pool is recycled.  No amount of retries
    # will change Telegram's response.  Abort immediately so the UI can prompt the
    # user to pick a different country instead of burning balance.
    #
    # force_country=True: user explicitly clicked "Keep Going" — clear the flag
    # and let them try once more.  If it fails again the flag gets re-set and
    # the popup will show again.
    if force_country:
        _RECYCLED_COUNTRY_POOL.discard(country_id.lower())
    elif country_id.lower() in _RECYCLED_COUNTRY_POOL:
        yield _sse("sms_retry_prompt", {
            "country_id": country_id,
            "message": (
                f"🚫 {country_id.upper()} pool flagged as recycled this session — "
                "a previous SendCodeUnavailable confirmed these numbers already have accounts. "
                + _suggest_alt_countries(country_id)
            ),
        })
        return

    order_code:              str | None = None   # alphanumeric e.g. "ECKU5XM9" — used for check/cancel
    phone:                   str | None = None
    client:                  TelegramClient | None = None
    _registration_succeeded: bool = False        # set True before complete SSE — guards cancel in finally

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
        # ─── Assign globally unique residential session before preflight ─────
        # Each _registration_stream call gets the next number from a global
        # monotonic counter, so session-1 → session-2 → session-3 … across all
        # streams and all retries within a process lifetime.  This prevents
        # reusing a cooling exit node when the outer loop immediately retries with
        # the same original proxy_string (which always has session-1 or whatever
        # the user typed — the outer cur_proxy_string is never updated).
        if proxy_string:
            proxy_string, _sn = _next_session_proxy(proxy_string)
            if _sn:
                yield _sse("debug", {"message": f"🔄 Proxy session → session-{_sn} (global slot #{_sn})"})
            # Rewrite country-XX in proxy username to match the registration
            # country.  Exit IP must be in the same country as the phone number
            # or Telegram returns SentCodeTypeApp for every number regardless
            # of whether the number is fresh or recycled.
            _rewritten = _rewrite_proxy_country(proxy_string, country_id)
            if _rewritten != proxy_string:
                _was_cc = proxy_string.split('country-')[1][:2] if 'country-' in proxy_string else '??'
                yield _sse("debug", {"message": f"🌍 Proxy country rewritten → country-{country_id.lower()} (was {_was_cc}, input id={country_id})"})
                proxy_string = _rewritten

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

        # ─── Geo check — verify exit IP is in the target country ─────────
        # Use the confirmed residential IP (prefer asyncio path, fall back to
        # requests path) and look up its country via ip-api.com.  A mismatch
        # means the proxy provider doesn't have a residential node for the
        # target country — warn clearly so the operator can choose a different
        # proxy pool, but don't block (the operator may intentionally use a
        # neighboring country or know better).
        #
        # IMPORTANT: SMSPool's country_id is their own internal numeric ID
        # (e.g. "44" = Uzbekistan in SMSPool's numbering — NOT the UK dialing
        # code). A numeric country_id cannot be compared to an ISO alpha-2
        # country code from ip-api.  In that case we extract the target country
        # from the proxy URL itself (country-uz → "uz") so the comparison is
        # always ISO-vs-ISO.  If we can't determine a target cc, we still run
        # the geo lookup but mark it as informational only (match=True).
        # Store the confirmed residential exit IP so Layer 2 can compare —
        # if Decodo has only one UZ residential node, all session numbers will
        # share the same exit IP.  In that case the session rotation is cosmetic
        # and Telegram sees both the primary request and the Layer 2 request as
        # coming from the same IP, which doesn't give us an independent verdict.
        _primary_exit_ip: str | None = async_ip or exit_ip
        # Tracks the exit IP used by the LAST number attempt so the retry
        # loop can warn when session rotation yields the same exit node.
        _last_attempt_exit_ip: str | None = _primary_exit_ip

        _geo_ip = async_ip or exit_ip
        if _geo_ip and proxy_string:
            _raw_cc = country_id.strip()
            if _raw_cc.isdigit():
                # Numeric SMSPool ID — extract target from proxy URL
                _proxy_cc_m = _re.search(r"country-([a-z]{2})", proxy_string, _re.IGNORECASE)
                _geo_target_cc = _proxy_cc_m.group(1).upper() if _proxy_cc_m else ""
            else:
                _geo_target_cc = _raw_cc.upper()
            yield _sse("geo_check", {
                "status":         "running",
                "target_cc":      _geo_target_cc or country_id.upper(),
                "exit_ip":        _geo_ip,
            })
            _geo = await _proxy_geo_check(_geo_ip, _geo_target_cc if _geo_target_cc else "XX")
            # If we had no target (numeric ID + no country-XX in proxy), treat
            # as informational: always show info, never flag as mismatch.
            if not _geo_target_cc:
                _geo["match"] = True
            if _geo["error"]:
                yield _sse("geo_check", {
                    "status":         "error",
                    "exit_ip":        _geo_ip,
                    "target_cc":      _geo_target_cc or country_id.upper(),
                    "detected_cc":    "",
                    "detected_country": "",
                    "org":            "",
                    "match":          False,
                    "latency_ms":     _geo["latency_ms"],
                    "message":        f"Geo lookup failed: {_geo['error']}",
                })
            else:
                _geo_status = "ok" if _geo["match"] else "mismatch"
                _display_target = _geo_target_cc or country_id.upper()
                yield _sse("geo_check", {
                    "status":           _geo_status,
                    "exit_ip":          _geo_ip,
                    "target_cc":        _display_target,
                    "detected_cc":      _geo["detected_cc"],
                    "detected_country": _geo["detected_country"],
                    "org":              _geo["org"],
                    "match":            _geo["match"],
                    "latency_ms":       _geo["latency_ms"],
                    "message": (
                        f"✅ Exit IP in {_geo['detected_country']} — matches target"
                        if _geo["match"] else
                        f"⚠️ Exit IP is in {_geo['detected_country']} ({_geo['detected_cc']}), "
                        f"not {_display_target} — provider may lack coverage for this country"
                    ),
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

        # ─── Pre-buy success rate info (informational only — never blocks) ──
        # Fetches the SMSPool success rate and shows it as a preflight status.
        # No gating — the user decides which country to try.
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
                "message": f"⚠️ Success rate check skipped ({str(_sr_ex)[:60]}) — proceeding",
            })
            _pre_sr = None  # fail-open

        if _pre_sr is not None:
            _sr_icon = "✅" if _pre_sr >= 70 else "⚠️" if _pre_sr >= 40 else "🟡"
            yield _sse("preflight", {
                "status": "done",
                "message": f"{_sr_icon} {country_id.upper()} SMS success rate: {_pre_sr}% — proceeding",
                "success_rate": _pre_sr,
                "country_id": country_id,
            })
        else:
            yield _sse("preflight", {
                "status": "done",
                "message": f"📊 {country_id.upper()} success rate: N/A — proceeding",
            })

        # ─── Steps 1–4 retry loop ─────────────────────────────────────────
        # If a purchased number fails (SentCodeTypeApp / SMS timeout), automatically
        # cancel it, buy a fresh number and retry — up to MAX_NUM_RETRIES times.
        # Configurable via max_attempts param (1–999, default 20).
        MAX_NUM_RETRIES = max(1, min(max_attempts, 999))
        code: str | None = None
        raw_num: str = ""
        _app_stuck_count      = 0
        _banned_count         = 0   # consecutive pre-banned numbers from this country
        _proxy_fail_count     = 0   # consecutive proxy-unreachable errors
        _sms_timeout_count    = 0   # consecutive SMS timeouts — flag for api_id shadow-block
        _tunnel_drop_count    = 0   # SOCKS5 tunnel drops detected mid-attempt
        _tunnel_recover_count = 0   # drops that recovered via reconnect (number NOT cancelled)
        # SMSPool pricing pool rotation — SNSS-AI auto-switches when it fires
        # switch_pool=True at ≥90% confidence.  Rotation order: 1 (standard) →
        # 0 (cheapest/mixed) → 2 (premium).  Different pools draw from different
        # carrier batches so a dead Pool 1 often has live numbers in Pool 0.
        _pricing_option  = "1"
        _pool_rotations  = 0   # max 2 rotations per session (1→0→2)

        # SNSS: accumulates confirmed-recycled phones this registration session
        # for Gemini pattern analysis (triggered at ≥2 recycled numbers).
        _recycled_phones_this_session: list[str] = []

        # Shuffle the official registration credential pool so each factory
        # session uses a different rotation order.  Each retry attempt cycles
        # to the next credential, ensuring we never hit the same api_id twice
        # in a row when SMS delivery is being shadow-blocked.
        _reg_pool: list[tuple] = _REGISTRATION_CREDS.copy()
        random.shuffle(_reg_pool)

        # Append the operator's own developer api_id (TELETHON_API_ID) as the
        # LAST credential in the rotation when it differs from the official pool.
        #
        # Why last, not first:
        #   A developer api_id is linked to the operator's own Telegram account.
        #   Telegram routes SendCode requests from it to the operator's installed
        #   Telegram app → SentCodeTypeApp for EVERY number, fresh or recycled.
        #   This makes it useless for detecting number freshness (primary or ResendCode)
        #   and adds ~10s overhead per attempt before L2 can give a real verdict.
        #
        #   Official api_ids (2040 Desktop / 2496 iOS / 6 Android) are NOT linked
        #   to any account — Telegram routes their SendCode to SMS for fresh numbers.
        #   ResendCode on an official api_id can also escalate App→SMS on certain
        #   carriers (UZ, KZ, IN).  The dev api_id can never do this.
        #
        #   The dev api_id IS still useful as a last resort if all official ids are
        #   shadow-blocked for this operator (rare), so we keep it in the pool at end.
        _dev_api_id   = api_id    # passed from TELETHON_API_ID env var
        _dev_api_hash = api_hash
        _official_ids = {c[0] for c in _REGISTRATION_CREDS}  # {2040, 2496, 6}
        if _dev_api_id and _dev_api_id not in _official_ids:
            _reg_pool.append((
                _dev_api_id, _dev_api_hash,
                "PC 64bit", "Windows 11", "5.9.5", "desktop",
            ))

        # Track which api_id / api_hash / device profile were ACTUALLY used for the
        # successful registration.  Updated each time we switch credentials.  Saved
        # to DB so groupbroadcaster can reconnect with the correct credential pair.
        _actual_api_id:        int = api_id
        _actual_api_hash:      str = api_hash
        _actual_device_model:  str = ""
        _actual_system_version: str = ""
        _actual_app_version:   str = ""

        for _num_attempt in range(MAX_NUM_RETRIES):

            # ─── Rotate residential session for every retry ───────────────
            # Attempt 0 already has a fresh session (assigned before preflight).
            # For retries, advance to the next global slot so each number attempt
            # hits a different exit node — prevents "Host unreachable" from a
            # still-cooling node used by the previous number attempt.
            if _num_attempt > 0 and proxy_string:
                proxy_string, _retry_sn = _next_session_proxy(proxy_string)
                if _retry_sn:
                    yield _sse("debug", {"message": f"🔄 Proxy session → session-{_retry_sn} (retry #{_num_attempt})"})
                # ── Exit-IP check: warn if Decodo gave us the same node again ──
                # If the proxy provider only has 1 residential node for this country,
                # every session rotation lands on the same exit IP.  Telegram then
                # sees ALL number attempts from the same IP — if that IP is flagged
                # for automation, every number returns SentCodeTypeApp even if the
                # number itself is fresh.  Without this warning the operator cannot
                # distinguish IP-flagging from a recycled pool.
                _retry_exit_ip, _, _ = await _get_asyncio_exit_ip(proxy_string, timeout=6.0)
                if _retry_exit_ip and _last_attempt_exit_ip and _retry_exit_ip == _last_attempt_exit_ip:
                    yield _sse("debug", {"message": (
                        f"⚠️ Retry exit IP = previous attempt IP ({_retry_exit_ip}) — "
                        "proxy provider has only 1 residential node for this country; session rotation is ineffective. "
                        "If ALL numbers fail, the IP may be flagged by Telegram, not just the pool being recycled. "
                        "Try a different proxy provider or country."
                    )})
                elif _retry_exit_ip:
                    yield _sse("debug", {"message": f"✅ Retry exit IP: {_retry_exit_ip} (fresh node, different from {_last_attempt_exit_ip})"})
                if _retry_exit_ip:
                    _last_attempt_exit_ip = _retry_exit_ip

            # ─── Step 1 — Purchase number ─────────────────────────────────
            _retry_label = f" (attempt {_num_attempt+1}/{MAX_NUM_RETRIES})" if _num_attempt else ""
            yield _sse("step", {"step": 1, "status": "running",
                                "message": f"⏳ Buying number from SMSPool{_retry_label}..."})

            try:
                async with aiohttp.ClientSession() as http:
                    async with http.post(
                        SMSPOOL_BUY,
                        data={"key": smspool_api_key, "service": TELEGRAM_SERVICE_ID,
                              "country": country_id, "pricing_option": _pricing_option},
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
                _raw_msg = _strip_html(result.get("message") or str(result))
                _msg_lc  = _raw_msg.lower()
                if "insufficient balance" in _msg_lc:
                    # Parse exact balance + price so the UI can show a targeted top-up prompt.
                    # Error format: "Pool X: the price is: 0.38 while you only have: 0.37"
                    _bal_m    = re.search(r"you only have[:\s]+(\d+\.?\d*)", _raw_msg, re.IGNORECASE)
                    _price_m  = re.search(r"price is[:\s]+(\d+\.?\d*)",      _raw_msg, re.IGNORECASE)
                    _cur_bal  = float(_bal_m.group(1))   if _bal_m   else None
                    _min_price = float(_price_m.group(1)) if _price_m else None
                    _bal_msg  = (
                        f"💰 SMSPool balance too low — you have ${_cur_bal:.2f} "
                        f"but the cheapest available pool costs ${_min_price:.2f}. "
                        "Top up at smspool.net to continue."
                        if _cur_bal is not None and _min_price is not None
                        else "💰 SMSPool balance insufficient — top up your account to continue."
                    )
                    yield _sse("balance_low", {
                        "balance":    _cur_bal,
                        "needed":     _min_price,
                        "message":    _bal_msg,
                        "top_up_url": "https://smspool.net/pricing",
                    })
                else:
                    yield _sse("error", {"message": f"SMSPool purchase failed: {_raw_msg}"})
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

            # ── SNSS Layer 0: Prefix blacklist ────────────────────────────
            # Instant in-memory check — no network, no Telethon startup cost.
            # If this number's prefix has been seen ≥ 2× recycled already,
            # cancel and retry immediately (saves ~25s per detection).
            _pbl_hit, _pbl_count, _pbl_prefix = _check_prefix_blacklist(phone, country_id)
            if _pbl_hit:
                yield _sse("step", {"step": 1, "status": "error",
                                    "message": (
                                        f"🔴 SNSS-L0: prefix '{_pbl_prefix}…' blacklisted "
                                        f"({_pbl_count}× recycled) — "
                                        "cancelling before Telethon handshake"
                                    )})
                # Do NOT call _record_recycled_prefix here — the prefix is
                # already confirmed-bad; re-recording inflates the count on
                # every L0-fire and poisons the cache unnecessarily.
                _recycled_phones_this_session.append(phone)
                await cancel_order()
                _app_stuck_count += 1
                if _app_stuck_count < MAX_NUM_RETRIES:
                    yield _sse("step", {"step": 1, "status": "error",
                                        "message": (
                                            f"🚫 SNSS prefix-skip #{_app_stuck_count}/{MAX_NUM_RETRIES} — "
                                            f"buying next number ({_num_attempt + 1}/{MAX_NUM_RETRIES} budget used)"
                                        )})
                    yield _sse("pool_quality", {"bad": _app_stuck_count, "total": _num_attempt + 1})
                    continue
                else:
                    yield _sse("sms_retry_prompt", {
                        "country_id": country_id,
                        "message": (
                            f"🚫 SMSPool {country_id.upper()} pool fully recycled — "
                            f"prefix '{_pbl_prefix}…' hit {_pbl_count} times. "
                            f"All {_app_stuck_count}/{MAX_NUM_RETRIES} numbers from the same recycled batch. "
                            + _suggest_alt_countries(country_id)
                        ),
                    })
                    return

            # ── SNSS Layer 1: contacts.importContacts pre-screen ──────────
            # Use an existing idle sender account to check if this number is
            # already registered on Telegram BEFORE firing up the registration
            # Telethon client. Catches ~40-60% of recycled numbers instantly.
            # Returns None when no idle sender accounts are available → skip.
            _contact_hit = await _check_registered_via_contact(phone)
            if _contact_hit is True:
                yield _sse("step", {"step": 1, "status": "running",
                                    "message": (
                                        f"🔴 SNSS-L1: {phone} found in Telegram via "
                                        "contact import — recycled, cancelling"
                                    )})
                _record_recycled_prefix(phone, country_id, _pricing_option)
                _recycled_phones_this_session.append(phone)
                await cancel_order()
                _app_stuck_count += 1
                if _app_stuck_count < MAX_NUM_RETRIES:
                    yield _sse("step", {"step": 1, "status": "error",
                                        "message": (
                                            f"🚫 SNSS contact-hit #{_app_stuck_count}/{MAX_NUM_RETRIES} — "
                                            f"buying next number ({_num_attempt + 1}/{MAX_NUM_RETRIES} budget used)"
                                        )})
                    yield _sse("pool_quality", {"bad": _app_stuck_count, "total": _num_attempt + 1})
                    continue
                else:
                    yield _sse("sms_retry_prompt", {
                        "country_id": country_id,
                        "message": (
                            f"🚫 {country_id.upper()} pool recycled — "
                            f"{_app_stuck_count}/{MAX_NUM_RETRIES} consecutive numbers confirmed via "
                            "contact import. " + _suggest_alt_countries(country_id)
                        ),
                    })
                    return
            elif _contact_hit is False:
                yield _sse("debug", {"message":
                    f"✅ SNSS-L1: {phone} not found in contact import — proceeding"})
            else:
                yield _sse("debug", {"message":
                    "ℹ️ SNSS-L1: contact check skipped (no idle sender account)"})

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
            _actual_api_id        = _reg_api_id
            _actual_api_hash      = _reg_api_hash
            _actual_device_model  = device_model
            _actual_system_version = system_version
            _actual_app_version   = app_version

            # Country-aware locale: a Ukrainian number with lang_code="en" is an
            # immediate bot fingerprint.  Desktop/iOS creds still get locale since
            # Telegram users in those countries use localised apps.
            #
            # SMSPool uses numeric internal IDs (e.g. "44" = Uzbekistan).
            # These never match ISO-keyed _COUNTRY_LANG_MAP entries → everyone
            # falls through to ("en", "en-US") — a bot fingerprint.
            # Fix: when country_id is numeric, extract the 2-letter ISO code from
            # the proxy URL's country-XX selector (already validated by geo-check).
            _cid_lower = country_id.lower()
            if _cid_lower.isdigit() and proxy_string:
                _iso_m = _re.search(r"country-([a-z]{2})", proxy_string, _re.IGNORECASE)
                if _iso_m:
                    _cid_lower = _iso_m.group(1).lower()
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
                # Fail fast so our own reconnect logic (below) reacts in <3s.
                # connection_retries=5 + retry_delay=2 would silently spin 10s
                # before surfacing "Cannot send requests while disconnected".
                connection_retries=1,
                retry_delay=1,
            )

            # ── TELEMETRY 1: Telethon client init dump ────────────────────
            yield _sse("debug", {"message": json.dumps({
                "🔧 TELETHON_INIT": {
                    "api_id": _reg_api_id,
                    "platform": _reg_plat,
                    "device_model": device_model,
                    "system_version": system_version,
                    "app_version": app_version,
                    "lang_code": _reg_lang,
                    "system_lang_code": _reg_sys_lang,
                    "session_path": session_path,
                    "proxy": proxy_string or None,
                }
            }, ensure_ascii=False, indent=2)})
            logging.getLogger("telethon").setLevel(logging.DEBUG)

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
                    _ce_str  = str(_ce)
                    _ce_low  = _ce_str.lower()
                    if _conn_try < 2:
                        try:
                            await client.disconnect()
                        except Exception:
                            pass
                        # Dead-peer detection: "Host unreachable" / "Connection refused"
                        # means the residential node Decodo pinned to this session-N is
                        # offline.  Retrying the same session-N is pointless — it stays
                        # mapped to the same offline peer until the session expires.
                        # Rotate immediately to session-(N+1) and recreate the client.
                        _dead_peer = any(x in _ce_low for x in (
                            "unreachable", "refused", "no route",
                        ))
                        if _dead_peer and proxy_string:
                            proxy_string, _new_sn = _next_session_proxy(proxy_string)
                            proxy_tuple = _parse_proxy(proxy_string)
                            client = TelegramClient(
                                session_path, _reg_api_id, _reg_api_hash,
                                proxy=proxy_tuple,
                                device_model=device_model,
                                system_version=system_version,
                                app_version=app_version,
                                lang_code=_reg_lang,
                                system_lang_code=_reg_sys_lang,
                                connection_retries=1,
                                retry_delay=1,
                            )
                            yield _sse("step", {"step": 2, "status": "running",
                                                "message": (
                                                    f"⚠️ Connect attempt {_conn_try+1}/3 failed "
                                                    f"(dead peer) — rotating proxy → session-{_new_sn}…"
                                                )})
                        else:
                            yield _sse("step", {"step": 2, "status": "running",
                                                "message": (
                                                    f"⚠️ Connect attempt {_conn_try+1}/3 failed "
                                                    f"({type(_ce).__name__}: {_ce_str[:60]}) — retrying in 2s…"
                                                )})
                        await asyncio.sleep(2)
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

            # ── Pre-flight: MTProto liveness check ───────────────────────────
            # Decodo residential SOCKS5 tunnels can silently drop within seconds
            # of establishment (short idle TTL on peer-side).  Check BEFORE the
            # RPC so we can fast-reconnect without cancelling the purchased number.
            if not client.is_connected():
                _tunnel_drop_count += 1
                yield _sse("debug", {"message": (
                    f"⚡ MTProto dropped during delay — fast reconnect… "
                    f"(session drop #{_tunnel_drop_count})"
                )})
                _pre_reconnect_ok = False
                try:
                    await asyncio.wait_for(client.connect(), timeout=8.0)
                    _tunnel_recover_count += 1
                    _pre_reconnect_ok = True
                    yield _sse("debug", {"message": (
                        f"✅ Fast reconnect succeeded "
                        f"({_tunnel_recover_count}/{_tunnel_drop_count} drops recovered this session)"
                    )})
                except Exception as _pre_err:
                    yield _sse("step", {"step": 3, "status": "running",
                                        "message": (
                                            f"🔄 Pre-flight reconnect failed ({type(_pre_err).__name__}) "
                                            "— cancelling number, buying fresh…"
                                        )})
                if not _pre_reconnect_ok:
                    yield _sse("proxy_health", {
                        "drops":     _tunnel_drop_count,
                        "recovered": _tunnel_recover_count,
                        "fatal":     _tunnel_drop_count - _tunnel_recover_count,
                        "message": (
                            f"🔌 Proxy: {_tunnel_drop_count} drop(s) — "
                            f"{_tunnel_recover_count} recovered, "
                            f"{_tunnel_drop_count - _tunnel_recover_count} fatal (number wasted)"
                        ),
                    })
                    await cancel_order()
                    await safe_disconnect()
                    await asyncio.sleep(2)
                    continue

            _banned = False
            _raw_next_type = None  # populated by whichever send_code path runs
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
                _raw_next_type  = getattr(raw_result, "next_type", None)  # None → no fallback
                # ── TELEMETRY 2: send_code_request raw response ───────────
                yield _sse("debug", {"message": json.dumps({
                    "📨 SEND_CODE_RESPONSE": {
                        "type": code_type_name,
                        "phone_code_hash": phone_code_hash[:8] + "…",
                        "timeout": getattr(raw_result, "timeout", None),
                        "next_type": type(getattr(raw_result, "next_type", None)).__name__
                            if getattr(raw_result, "next_type", None) else None,
                        "via": "RawSendCodeRequest",
                    }
                }, ensure_ascii=False, indent=2)})
            except PhoneNumberBannedError:
                _banned = True
            except PhoneNumberInvalidError:
                # SMSPool sold a number that Telegram rejects as syntactically invalid.
                # This is an SMSPool data-quality issue, not a factory-ending condition.
                # Cancel the order and buy a fresh number instead of aborting.
                yield _sse("step", {"step": 3, "status": "error",
                                    "message": "⚠️ Telegram rejected this number as invalid (bad SMSPool number) — cancelling and buying another…"})
                await cancel_order()
                await safe_disconnect()
                await asyncio.sleep(2)
                continue   # ← retry loop: buy new number
            except Exception:
                # Raw request failed — fall back to Telethon high-level send_code_request.
                # This uses a different internal code path and sometimes succeeds when the
                # raw TL call fails (e.g. on certain proxy/DC routing issues).
                try:
                    fb = await client.send_code_request(phone)
                    phone_code_hash = fb.phone_code_hash
                    code_type_name  = type(fb.type).__name__ if fb.type else "Unknown"
                    _raw_next_type  = getattr(fb, "next_type", None)
                    yield _sse("debug", {"message": json.dumps({
                        "📨 SEND_CODE_RESPONSE": {
                            "type": code_type_name,
                            "phone_code_hash": phone_code_hash[:8] + "…",
                            "timeout": getattr(fb, "timeout", None),
                            "next_type": type(_raw_next_type).__name__ if _raw_next_type else None,
                            "via": "send_code_request (fallback)",
                        }
                    }, ensure_ascii=False, indent=2)})
                except PhoneNumberBannedError:
                    _banned = True
                except PhoneNumberInvalidError:
                    # Same as the raw-path case above — bad number from SMSPool.
                    yield _sse("step", {"step": 3, "status": "error",
                                        "message": "⚠️ Telegram rejected this number as invalid (bad SMSPool number) — cancelling and buying another…"})
                    await cancel_order()
                    await safe_disconnect()
                    await asyncio.sleep(2)
                    continue   # ← retry loop: buy new number
                except Exception as e2:
                    _e2_str = str(e2).lower()
                    # Classify the error: transient connection/proxy errors should retry;
                    # permanent errors (auth, flood) should abort.
                    _is_transient = any(x in _e2_str for x in (
                        "disconnected", "not connected", "connection",
                        "timeout", "proxy", "network", "eof",
                    ))
                    yield _sse("step", {"step": 3, "status": "error",
                                        "message": f"❌ Code request failed: {e2}"})
                    if _is_transient and _num_attempt < MAX_NUM_RETRIES - 1:
                        # Transient tunnel drop — attempt ONE reconnect on the SAME purchased
                        # number before cancelling it.  The number itself is valid; only the
                        # SOCKS5 tunnel died.  Cancelling immediately wastes $0.38 + a budget
                        # slot.  Most Decodo drops recover within 3-5s on a fresh connect().
                        _tunnel_drop_count += 1
                        yield _sse("step", {"step": 3, "status": "running",
                                            "message": (
                                                f"🔄 Connection dropped — reconnecting on same number… "
                                                f"(drop #{_tunnel_drop_count} this session)"
                                            )})
                        _reconnect_ok = False
                        try:
                            await asyncio.wait_for(client.connect(), timeout=8.0)
                            _rc = await asyncio.wait_for(
                                client(RawSendCodeRequest(
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
                                )),
                                timeout=14.0,
                            )
                            phone_code_hash = _rc.phone_code_hash
                            code_type_name  = type(_rc.type).__name__ if _rc.type else "SentCodeTypeSms"
                            _raw_next_type  = getattr(_rc, "next_type", None)
                            _reconnect_ok   = True
                            _tunnel_recover_count += 1
                            yield _sse("step", {"step": 3, "status": "running",
                                                "message": (
                                                    f"✅ Reconnect succeeded — code sent ({code_type_name}) "
                                                    f"[{_tunnel_recover_count}/{_tunnel_drop_count} drops recovered]"
                                                )})
                        except Exception as _re:
                            yield _sse("step", {"step": 3, "status": "running",
                                                "message": (
                                                    f"🔄 Reconnect also failed ({type(_re).__name__}) "
                                                    "— cancelling number, buying fresh…"
                                                )})
                        if not _reconnect_ok:
                            yield _sse("proxy_health", {
                                "drops":     _tunnel_drop_count,
                                "recovered": _tunnel_recover_count,
                                "fatal":     _tunnel_drop_count - _tunnel_recover_count,
                                "message": (
                                    f"🔌 Proxy: {_tunnel_drop_count} drop(s) — "
                                    f"{_tunnel_recover_count} recovered, "
                                    f"{_tunnel_drop_count - _tunnel_recover_count} fatal (number wasted)"
                                ),
                            })
                            await cancel_order()
                            await safe_disconnect()
                            await asyncio.sleep(3)
                            continue   # ← buy fresh number
                        # Reconnect succeeded — fall through to normal post-send_code logic
                    else:
                        await cancel_order()
                        await safe_disconnect()
                        if not _is_transient:
                            yield _sse("error", {"message": f"Failed to request code from Telegram: {e2}"})
                            return
                        # Transient but budget exhausted — still cancel and loop to surface the prompt
                        yield _sse("step", {"step": 3, "status": "running",
                                            "message": "🔄 Connection dropped — cancelling number, retrying with fresh one…"})
                        await asyncio.sleep(4)
                        continue

            if _banned:
                _banned_count += 1
                _app_stuck_count += 1  # unified "bad number" counter → feeds L0 abort threshold

                # Record pre-banned prefix in SNSS so L0 kills it instantly on the next attempt.
                # Without this, every subsequent attempt from the same carrier batch spins up a
                # full Telethon client (~10s + $1.46) just to get PhoneNumberBannedError again.
                _record_recycled_prefix(phone, country_id, _pricing_option)
                _recycled_phones_this_session.append(phone)

                _remaining_after = MAX_NUM_RETRIES - _num_attempt - 1
                if _banned_count >= 3:
                    # 3+ consecutive pre-bans → flag the country and stop.
                    _RECYCLED_COUNTRY_POOL.add(country_id.lower())
                    yield _sse("step", {"step": 3, "status": "error",
                                        "message": f"🚫 {_banned_count} consecutive pre-banned numbers — {country_id.upper()} pool is exhausted"})
                    await cancel_order()
                    await safe_disconnect()
                    yield _sse("sms_retry_prompt", {
                        "country_id": country_id,
                        "message": (
                            f"🚫 {_banned_count} consecutive pre-banned numbers from {country_id.upper()} — "
                            "this country's pool is recycled/exhausted right now. "
                            + _suggest_alt_countries(country_id)
                        ),
                    })
                    return
                yield _sse("step", {"step": 3, "status": "running",
                                    "message": f"🚫 Number pre-banned — cancelling and trying new number… ({_remaining_after} attempt(s) left)"})
                yield _sse("pool_quality", {"bad": _app_stuck_count, "total": _num_attempt + 1})
                await cancel_order()
                await safe_disconnect()
                continue  # auto-retry with new number

            # ── Non-SMS delivery gate ─────────────────────────────────────────
            # SentCodeTypeApp/Flash/Firebase means Telegram wants to deliver via app.
            #
            # Strategy (2-layer after fix):
            # 1. ResendCodeRequest on the SAME connected client → escalates to SMS for
            #    fresh numbers on carriers that use App-first delivery as an anti-spam
            #    measure (e.g. Vietnamobile 056x).  For recycled numbers ResendCode may
            #    also return SentCodeTypeSms, but the SMS goes to the real owner's SIM
            #    and never appears in SMSPool → detected as timeout in step 4.
            # 2. Official creds check (api_id=2040 / 2496) → ONLY run when ResendCode
            #    returned a non-SMS type but next_type was declared (Telegram had planned
            #    a fallback).  When next_type=None + SendCodeUnavailable we already have
            #    a DEFINITIVE recycled signal and skip Layer 2 entirely (saves ~7s).
            #
            # Definitive recycled triple:
            #   SentCodeTypeApp + next_type=None + ResendCode→SendCodeUnavailable
            #   A fresh (unregistered) number CANNOT produce this combination because
            #   Telegram only sends SentCodeTypeApp when an existing account is present.
            _non_sms = ("App", "Flash", "Firebase", "MissedCall")
            _definitive_recycled = False  # set True → skip Layer 2 entirely
            if any(t in code_type_name for t in _non_sms):
                # ── Layer 1: ResendCodeRequest ────────────────────────────────────
                # Call on the still-connected original client (same api_id / session).
                # Telegram often escalates App → SMS on resend for fresh numbers even
                # when it uses App-first delivery as an anti-spam gate.
                #
                # ResendCode can escalate App→SMS on fresh numbers (observed on UZ, KZ, IN
                # carriers) — but ONLY when issued from an official Telegram api_id (2040/2496/6).
                # A developer api_id always gets SentCodeTypeApp/SendCodeUnavailable from
                # ResendCode because Telegram routes codes to the developer's own installed app,
                # not the carrier.  Calling ResendCode from a dev api_id wastes ~1-2s and
                # always produces SendCodeUnavailable — skip straight to L2 instead.
                _official_api_ids_set = {c[0] for c in _OFFICIAL_CLIENT_CREDS}
                _is_official_primary = _actual_api_id in _official_api_ids_set
                _resend_escalated = False
                _next_type_label = "(next_type=None) " if _raw_next_type is None else ""
                if _is_official_primary:
                    yield _sse("step", {"step": 3, "status": "running",
                                        "message": f"📲 {code_type_name} {_next_type_label}— requesting SMS resend (ResendCode)…"})
                else:
                    yield _sse("step", {"step": 3, "status": "running",
                                        "message": f"📲 {code_type_name} via dev api_id — skipping ResendCode, going straight to official creds…"})
                if _is_official_primary:
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
                        if _raw_next_type is None:
                            # SentCodeTypeApp + next_type=None + SendCodeUnavailable
                            # is a DEFINITIVE recycled triple — BUT only when an official
                            # Telegram api_id (2040/2496/6) produced it.  A developer
                            # api_id may always receive SentCodeTypeApp+SendCodeUnavailable
                            # for fresh numbers simply because its app is not configured for
                            # SMS fallback by Telegram's routing.  In that case L2 (official
                            # creds) still needs to run to get a reliable verdict.
                            _official_api_ids = {c[0] for c in _OFFICIAL_CLIENT_CREDS}
                            if _actual_api_id in _official_api_ids:
                                _definitive_recycled = True
                                yield _sse("step", {"step": 3, "status": "running",
                                                    "message": "🔴 SentCodeTypeApp + SendCodeUnavailable + next_type=None — definitive recycled, skipping Layer 2…"})
                            else:
                                # Dev api_id — not conclusive. Fall through to L2.
                                yield _sse("step", {"step": 3, "status": "running",
                                                    "message": f"🟡 SentCodeTypeApp + SendCodeUnavailable (dev api_id={_actual_api_id}) — checking official creds…"})
                        else:
                            # next_type was set → Telegram declared an SMS fallback but
                            # ResendCode says all delivery paths are now exhausted.
                            # This means the initial code went to the existing account's app.
                            # Treat identically to the definitive-recycled path: mark the
                            # number bad, record the prefix for SNSS, and let the retry loop
                            # decide when to stop.  One number does NOT confirm the whole
                            # country pool is recycled — only after N consecutive hits does
                            # the loop exit with sms_retry_prompt.
                            _definitive_recycled = True
                            yield _sse("step", {"step": 3, "status": "running",
                                                "message": "🔴 SendCodeUnavailable + next_type declared — code sent to existing app; number recycled, trying next…"})
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
                    #
                    # Skip any official cred whose api_id matches what the primary already
                    # used — re-testing the same api_id that just returned SentCodeTypeApp
                    # is redundant and wastes ~8 seconds (3s proxy sleep + connect + RPC).

                    # ── CRITICAL: Cancel the pending code session before Layer 2 ──
                    # The primary client's RawSendCodeRequest (and subsequent ResendCode)
                    # left an active code session on Telegram's server for this phone.
                    # If we issue a fresh RawSendCodeRequest from Layer 2 while that session
                    # is still "warm", Telegram may reuse its routing decision (SentCodeTypeApp)
                    # even for a fresh number — producing a false "recycled" diagnosis.
                    # CancelCodeRequest explicitly closes the session so Layer 2 gets a
                    # clean, independent routing evaluation.
                    if client and phone_code_hash:
                        try:
                            await client(CancelCodeRequest(
                                phone_number=phone,
                                phone_code_hash=phone_code_hash,
                            ))
                        except Exception:
                            pass  # best-effort; Layer 2 still runs even if cancel fails

                    _off_creds_filtered = [
                        c for c in _OFFICIAL_CLIENT_CREDS if c[0] != _actual_api_id
                    ] or _OFFICIAL_CLIENT_CREDS  # fallback: include all if somehow all match
                    _switched_to_official = False
                    _l2_same_ip = False   # set True if Layer 2 exit IP = primary exit IP
                    if _definitive_recycled:
                        yield _sse("debug", {"message":
                            "⚡ Layer 2 skipped — definitive recycled triple already confirmed"})
                    for _off_api_id, _off_api_hash, _off_dev, _off_sys, _off_app in (
                        _off_creds_filtered if not _definitive_recycled else []
                    ):
                        await safe_disconnect()
                        # Wait for the proxy to close the previous SOCKS5 tunnel before
                        # opening a new one. Without this pause, Decodo (and most residential
                        # proxy providers) reject the second connection immediately with ProxyError
                        # because the first tunnel is still being torn down on their end.
                        # 5 s (up from 3 s) also gives Telegram's server more time to settle
                        # after CancelCodeRequest before Layer 2 issues a new RawSendCodeRequest.
                        await asyncio.sleep(5)
                        # Rotate to a fresh proxy session (new exit node) so Telegram
                        # doesn't see a second RawSendCodeRequest for the same phone
                        # from the same IP within seconds — that pattern triggers
                        # anti-spam routing independent of account status.
                        _off_proxy_string = proxy_string
                        if proxy_string:
                            _off_proxy_string, _off_sn = _next_session_proxy(proxy_string)
                            if _off_sn:
                                yield _sse("debug", {"message": f"🔄 Layer 2 proxy → session-{_off_sn} (fresh exit node for official creds check)"})
                        _off_proxy_tuple = _parse_proxy(_off_proxy_string) if _off_proxy_string else None

                        # ── Check Layer 2 exit IP ──────────────────────────────────────
                        # If Decodo has only 1 UZ residential node, ALL session numbers
                        # resolve to the same exit IP.  Telegram then sees both the
                        # primary request and Layer 2 as the same "client" — if that IP
                        # is flagged for automation, EVERY number gets SentCodeTypeApp
                        # regardless of whether it's fresh.  Log a clear warning so the
                        # operator can distinguish IP-flagging from pool recycling.
                        _l2_same_ip = False
                        if _off_proxy_string:
                            _l2_exit_ip, _, _ = await _get_asyncio_exit_ip(_off_proxy_string, timeout=8.0)
                            if _l2_exit_ip and _primary_exit_ip and _l2_exit_ip == _primary_exit_ip:
                                _l2_same_ip = True
                                yield _sse("debug", {"message": (
                                    f"⚠️ Layer 2 exit IP = primary exit IP ({_l2_exit_ip}) — "
                                    "Decodo has only 1 UZ residential node; session rotation is ineffective. "
                                    "If ALL numbers fail, the issue may be this IP flagged by Telegram, "
                                    "not the numbers being recycled. Try a different proxy provider."
                                )})
                            elif _l2_exit_ip:
                                yield _sse("debug", {"message": f"✅ Layer 2 exit IP: {_l2_exit_ip} (different from primary {_primary_exit_ip}) — independent verdict"})

                        # Wipe ALL session artefacts before new client (same path reused)
                        for _ext in (".session", ".session-journal", ".session-wal", ".session-shm"):
                            try:
                                os.remove(session_path + _ext)
                            except FileNotFoundError:
                                pass
                        _off_client = TelegramClient(
                            session_path, _off_api_id, _off_api_hash,
                            proxy=_off_proxy_tuple,
                            device_model=_off_dev,      # ← platform-correct profile
                            system_version=_off_sys,    # ← must match api_id's platform
                            app_version=_off_app,       # ← actual app version, not Android
                            lang_code=_reg_lang,        # ← country-aware locale (e.g. "uz" not "en")
                            system_lang_code=_reg_sys_lang,  # ← must match phone country
                        )
                        yield _sse("debug", {"message": json.dumps({
                            "🔍 LAYER2_INIT": {
                                "api_id": _off_api_id,
                                "device_model": _off_dev,
                                "system_version": _off_sys,
                                "app_version": _off_app,
                                "lang_code": _reg_lang,
                                "proxy": _off_proxy_string or None,
                            }
                        }, ensure_ascii=False, indent=2)})
                        # Track which credentials we switched to — DB save must use
                        # these so groupbroadcaster can reconnect with the same api_id
                        # and matching device profile.
                        _actual_api_id        = _off_api_id
                        _actual_api_hash      = _off_api_hash
                        _actual_device_model  = _off_dev
                        _actual_system_version = _off_sys
                        _actual_app_version   = _off_app
                        client = _off_client
                        _off_result = None
                        for _off_try in range(3):  # up to 3 attempts for transient proxy/network errors
                            try:
                                # Always do a clean connect — never trust is_connected() after a
                                # client switch; the MTProto state from the old client bleeds through.
                                if client.is_connected():
                                    await client.disconnect()
                                await client.connect()
                                # Human-like pause — a real device takes 1-3s to
                                # open the app and navigate to the phone-entry screen.
                                # Sending auth.sendCode immediately after connect()
                                # is a bot fingerprint even with official api_ids.
                                await asyncio.sleep(random.uniform(1.2, 3.0))
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
                                # Break after first clean SentCodeTypeApp verdict — no need
                                # to try further credentials for a confirmed recycled number.
                                # Additional credentials (e.g. Android) are only tried when
                                # this credential failed due to a connection error (_off_result is None).
                                break

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
                        # proof the number has an existing account.
                        _record_cred_stat(_actual_api_id, "app")
                        _app_stuck_count += 1
                        await cancel_order()
                        await safe_disconnect()

                        # SNSS: record confirmed-recycled prefix (Layer 2 detection)
                        # and run Gemini pattern analysis when 2+ recycled in session.
                        _record_recycled_prefix(phone, country_id, _pricing_option)
                        _recycled_phones_this_session.append(phone)

                        if len(_recycled_phones_this_session) >= 2:
                            try:
                                async with aiohttp.ClientSession() as _ai_sess:
                                    _ai_result = await asyncio.wait_for(
                                        _ai_analyze_recycled_pattern(
                                            _recycled_phones_this_session,
                                            country_id,
                                            _pricing_option,
                                            _ai_sess,
                                        ),
                                        timeout=14.0,
                                    )
                                if _ai_result:
                                    _ai_conf   = _ai_result.get("confidence", "?")
                                    _ai_prefix = str(_ai_result.get("prefix") or "")
                                    _ai_rec    = _ai_result.get("recommendation", "")
                                    _ai_switch = _ai_result.get("switch_pool", False)
                                    yield _sse("debug", {"message": (
                                        f"🤖 SNSS-AI: prefix='{_ai_prefix}' "
                                        f"confidence={_ai_conf}% "
                                        f"switch_pool={_ai_switch} — {_ai_rec}"
                                    )})
                                    # Auto pool-switch: act on the AI signal immediately
                                    # instead of just logging it.  Rotation order: 1→0→2.
                                    # Pool 0 (cheapest/mixed) draws from different carrier
                                    # batches than Pool 1 (standard) — a dead standard pool
                                    # often has live numbers in the mixed pool.
                                    _conf_val = _ai_conf if isinstance(_ai_conf, (int, float)) else 0
                                    if _ai_switch and _conf_val >= 90 and _pool_rotations < 2:
                                        _next_pool = (
                                            "0" if _pricing_option == "1"
                                            else ("2" if _pricing_option == "0" else "1")
                                        )
                                        _pool_rotations  += 1
                                        _pricing_option   = _next_pool
                                        yield _sse("step", {"step": 1, "status": "running",
                                                            "message": (
                                                                f"🔀 SNSS-AI pool-switch → Pool {_next_pool} "
                                                                f"(confidence {_conf_val}% — "
                                                                f"Pool {_next_pool} draws from a different carrier batch)"
                                                            )})
                                    # Widen the in-memory blacklist to AI-identified prefix
                                    if _ai_prefix and len(_ai_prefix) >= 5:
                                        _ai_key = f"{_ai_prefix}:{country_id.lower()}"
                                        _RECYCLED_PREFIX_MEM[_ai_key] = max(
                                            _RECYCLED_PREFIX_MEM.get(_ai_key, 0),
                                            len(_recycled_phones_this_session),
                                        )
                            except asyncio.TimeoutError:
                                yield _sse("debug", {"message":
                                    "🤖 SNSS-AI: pattern analysis timed out — continuing"})
                            except Exception as _ai_ex:
                                yield _sse("debug", {"message":
                                    f"🤖 SNSS-AI: analysis skipped ({_ai_ex})"})

                        # Retry up to MAX_NUM_RETRIES consecutive bad numbers before halting.
                        # MAX_NUM_RETRIES is set from the user-configured max_attempts param
                        # (default 20).  All three abort checks (prefix-skip, contact-hit,
                        # confirmed-recycled) share _app_stuck_count and the same threshold
                        # so the "switch country" popup never fires before the full budget
                        # is exhausted, regardless of which detection layer triggered.
                        if _app_stuck_count < MAX_NUM_RETRIES:
                            yield _sse("step", {"step": 3, "status": "error",
                                                "message": (
                                                    f"🚫 Recycled number (#{_app_stuck_count}/{MAX_NUM_RETRIES}) — ResendCode + all official "
                                                    f"credentials returned {code_type_name}. "
                                                    f"Retrying with new number ({_num_attempt + 1}/{MAX_NUM_RETRIES} budget used)…"
                                                )})
                            yield _sse("pool_quality", {"bad": _app_stuck_count, "total": _num_attempt + 1})
                            continue
                        else:
                            # All MAX_NUM_RETRIES attempts exhausted — flag the pool and stop.
                            _RECYCLED_COUNTRY_POOL.add(country_id.lower())
                            # Detect same-exit-IP scenario and tailor the message
                            _ip_flag_hint = (
                                " Note: Layer 2 exit IP matched primary — your proxy IP may be flagged "
                                "by Telegram for automation. Try a different proxy provider before switching country."
                            ) if _l2_same_ip else ""
                            yield _sse("step", {"step": 3, "status": "error",
                                                "message": (
                                                    f"🚫 Recycled pool confirmed ({_app_stuck_count} numbers) — "
                                                    f"ResendCode + all official credentials returned {code_type_name}. "
                                                    "This country's pool has existing accounts. Switch country."
                                                    + _ip_flag_hint
                                                )})
                            yield _sse("sms_retry_prompt", {
                                "country_id": country_id,
                                "message": (
                                    f"🚫 Number pool is recycled — SMSPool's {country_id} numbers already have "
                                    f"Telegram accounts ({_app_stuck_count} confirmed). "
                                    "ResendCode + official Telegram Desktop creds all returned SentCodeTypeApp. "
                                    + _suggest_alt_countries(country_id)
                                ),
                            })
                            return

            _record_cred_stat(_actual_api_id, "sms_ok")
            yield _sse("step", {"step": 3, "status": "done",
                                "message": f"✅ Code sent via {code_type_name} — polling SMSPool..."})

            # ─── Step 4 — Poll for SMS code ──────────────────────────────
            yield _sse("step", {"step": 4, "status": "running",
                                "message": "💬 Waiting for Telegram SMS verification code (Timeout in 120s)..."})

            # CRITICAL: must be initialised here (inside the per-number retry
            # loop) so every fresh number attempt starts with code=None.
            # Without this, `if code:` at the end of the while-loop raises
            # NameError when /request/active returns a list that doesn't
            # contain our order — the except-block catches it and
            # silently skips /sms/check, so codes are NEVER found.
            code: str | None = None

            _deadline    = time.time() + 120


            def _extract_code(raw: str) -> str | None:
                s = str(raw or "").strip()
                if s and s != "0" and s.isdigit() and 4 <= len(s) <= 8:
                    return s
                m = re.search(r"\b(\d{4,8})\b", s)
                return m.group(1) if m else None

            async with aiohttp.ClientSession() as _http:
                while time.time() < _deadline:
                    _remaining = int(_deadline - time.time())

                    # NOTE: Mid-poll ResendCodeRequest intentionally removed.
                    # Sending ResendCodeRequest during an active SMS wait can trigger
                    # Telegram's internal anti-automation flag for fresh-number flows,
                    # causing the code to silently drop on subsequent retries.
                    # If the SMS hasn't arrived within the 120s window, the outer loop
                    # cancels the order and buys a fresh number instead.

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

                    _elapsed = int(120 - _remaining)
                    try:
                        # ── Primary: /request/active ──────────────────────────────
                        # SMSPool docs recommend this as the primary endpoint: it lists
                        # all active orders in one batch call — rate-limit friendly (no
                        # per-order request needed while the order is still pending).
                        _active_http_status = 0
                        async with _http.post(
                            SMSPOOL_ACTIVE,
                            data={"key": smspool_api_key},
                            timeout=aiohttp.ClientTimeout(total=10),
                        ) as _resp:
                            _active_http_status = _resp.status
                            _orders = await _resp.json(content_type=None)

                        # ── TELEMETRY 3a: SMSPool /request/active per-iteration dump ─
                        yield _sse("debug", {"message": json.dumps({
                            "🌐 SMSPOOL_ACTIVE": {
                                "url": SMSPOOL_ACTIVE,
                                "elapsed_s": _elapsed,
                                "http_status": _active_http_status,
                                "raw_response": _orders if isinstance(_orders, list) and len(_orders) <= 5
                                    else (f"[{len(_orders)} orders]" if isinstance(_orders, list) else _orders),
                            }
                        }, ensure_ascii=False, indent=2)})

                        if isinstance(_orders, list):
                            for _o in _orders:
                                if not isinstance(_o, dict):
                                    continue
                                if (str(_o.get("order_code", "")) == order_code
                                        or str(_o.get("phonenumber", "")).endswith(raw_num)):
                                    _active_code_raw  = str(_o.get("code",      "0") or "0")
                                    _active_full_raw  = str(_o.get("full_code", "")  or "")
                                    code = (_extract_code(_active_code_raw)
                                            or _extract_code(_active_full_raw))
                                    if code:
                                        break
                                    yield _sse("poll", {
                                        "remaining": _remaining,
                                        "message": f"💬 Polling (active)... ({_remaining}s) [{_o.get('status','pending')}]"
                                    })
                                    break
                            if code:
                                break

                        # ── Secondary: /sms/check ─────────────────────────────────
                        # Catches status=3 (complete) and status=6 (refunded) — both
                        # cases where the order has LEFT the /request/active list.
                        # Always run this regardless of whether the active check found
                        # the order, so refunded orders are detected promptly.
                        if order_code:
                            _chk_http_status = 0
                            async with _http.post(
                                SMSPOOL_CHECK,
                                data={"key": smspool_api_key, "orderid": order_code},
                                timeout=aiohttp.ClientTimeout(total=10),
                            ) as _resp:
                                _chk_http_status = _resp.status
                                _chk = await _resp.json(content_type=None)

                            # ── TELEMETRY 3b: SMSPool /sms/check per-iteration dump ─
                            yield _sse("debug", {"message": json.dumps({
                                "🌐 SMSPOOL_CHECK": {
                                    "url": SMSPOOL_CHECK,
                                    "params": {"orderid": order_code},
                                    "elapsed_s": _elapsed,
                                    "http_status": _chk_http_status,
                                    "raw_response": _chk,
                                }
                            }, ensure_ascii=False, indent=2)})

                            if isinstance(_chk, dict):
                                _sid = _chk.get("status", 1)
                                _raw_sms  = str(_chk.get("sms",      "") or "")
                                _full_sms = str(_chk.get("full_sms", "") or "")
                                _code_f   = str(_chk.get("code",     "") or "")
                                yield _sse("poll", {"remaining": _remaining,
                                                    "message": f"💬 /sms/check: status={_sid} sms={repr(_raw_sms)} ({_remaining}s)"})
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
            _record_cred_stat(_actual_api_id, "timeout")
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
                    + _suggest_alt_countries(country_id)
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

            _av_result = await _pick_pending_avatar(gender=gender)
            if _av_result:
                _av_bytes, _av_ext = _av_result
                try:
                    _uploaded = await client.upload_file(_av_bytes, file_name=f"avatar{_av_ext}")
                    await client(UploadProfilePhotoRequest(file=_uploaded))
                    yield _sse("step", {"step": 7, "status": "running",
                                        "message": "📸 Avatar assigned from pool"})
                except Exception as _ape:
                    logger.warning(f"AI avatar upload failed: {_ape}")
            else:
                yield _sse("step", {"step": 7, "status": "running",
                                    "message": "📁 No pending avatars — upload photos in the Avatar Pool section"})

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
            "device_model":   _actual_device_model,
            "system_version": _actual_system_version,
            "app_version":    _actual_app_version,
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
        _registration_succeeded = True
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
        # Cancel the SMSPool order whenever registration didn't fully complete,
        # so the user gets a refund rather than losing balance on a failed attempt.
        if not _registration_succeeded:
            await cancel_order()
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


async def _pick_auto_switch_proxy(tried_countries: set[str], ai_country_ids: list[str] | None = None) -> dict:
    """
    Pick the best proxy from saved_proxies for auto-switching on sms_retry_prompt.

    Priority order:
      1. AI Вибір rankings (ai_country_ids in rank order) — first untried country with a proxy wins.
      2. Our own historical success rate from factory_country_stats.
      3. Any available proxy for an untried country (last resort).

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

            # ── Priority 1: AI Вибір rankings ─────────────────────────────────
            # Walk AI-ranked countries in order; first one with a stored proxy wins.
            if ai_country_ids:
                for ai_cc in ai_country_ids:
                    ai_cc = ai_cc.lower()
                    if ai_cc in tried_countries:
                        continue
                    if ai_cc in proxy_country_set:
                        async with _conn.execute(
                            "SELECT country_code, proxy_string, label FROM saved_proxies "
                            "WHERE LOWER(country_code) = ? AND proxy_string IS NOT NULL AND proxy_string != '' "
                            "ORDER BY RANDOM() LIMIT 1",
                            (ai_cc,),
                        ) as _cur:
                            row = await _cur.fetchone()
                        if row:
                            return {"status": "found", **dict(row)}

            # ── Priority 2: our own historical success rate ────────────────────
            async with _conn.execute(
                "SELECT country_id, country_name, attempts, successes "
                "FROM factory_country_stats WHERE attempts > 0 ORDER BY attempts DESC"
            ) as _cur:
                stats_rows = list(await _cur.fetchall())

            best_cc:    str | None = None
            best_name:  str | None = None
            best_score: float = -1.0
            for row in stats_rows:
                cid = row["country_id"].lower()
                if cid in proxy_country_set and cid not in tried_countries:
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

            # ── Priority 3: any untried country with a proxy (last resort) ────
            if proxy_country_set:
                any_cc = next(iter(proxy_country_set))
                async with _conn.execute(
                    "SELECT country_code, proxy_string, label FROM saved_proxies "
                    "WHERE LOWER(country_code) = ? AND proxy_string IS NOT NULL AND proxy_string != '' "
                    "ORDER BY RANDOM() LIMIT 1",
                    (any_cc,),
                ) as _cur:
                    row = await _cur.fetchone()
                if row:
                    return {"status": "found", **dict(row)}

            # ── Suggest: best country from AI list or stats but no proxy stored ─
            if ai_country_ids:
                for ai_cc in ai_country_ids:
                    if ai_cc.lower() not in tried_countries:
                        return {"status": "suggest", "suggested_id": ai_cc.lower(), "suggested_name": ai_cc.upper()}

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
    quantity            = min(max(int(body.get("quantity", 1) or 1), 1), 20)
    max_attempts        = min(max(int(body.get("max_attempts", 20) or 20), 1), 999)
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
    auto_switch      = bool(body.get("auto_switch", False))
    _ai_ids_raw      = body.get("ai_country_ids") or []
    ai_country_ids   = [str(x).strip().lower() for x in _ai_ids_raw if isinstance(x, str) and str(x).strip()]
    force_country    = bool(body.get("force_country", False))

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
        # ── Keepalive-injecting wrapper ──────────────────────────────────────
        # Problem: the preflight network checks (_test_proxy_connection,
        # _get_exit_ip_via_proxy, _get_asyncio_exit_ip) can block the generator
        # for 15-75 seconds before yielding the first step event.  Replit's
        # production CDN silently drops SSE connections that send no data for
        # ~60 s (even with X-Accel-Buffering: no), causing Safari to throw
        # "TypeError: Load failed" and all 8 steps to stay "waiting".
        #
        # Fix: run _generate_inner() in a background asyncio.Task.  The outer
        # generator pulls items from a shared queue with a 15-second timeout;
        # on timeout it emits a ": keepalive" SSE comment (invisible to the
        # UI parser, but keeps the TCP connection alive through every proxy).
        # The first chunk is still yielded immediately so the client knows the
        # stream is live the instant the request completes.
        yield _KEEPALIVE_SSE

        _queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def _producer() -> None:
            try:
                async for _chunk in _generate_inner():
                    await _queue.put(_chunk)
            except Exception as _e:
                await _queue.put(_sse("error", {
                    "message": f"⛔ Internal error in registration stream: {str(_e)[:300]}"
                }))
            finally:
                await _queue.put(None)   # EOF sentinel

        _task = asyncio.create_task(_producer())
        try:
            while True:
                try:
                    _item = await asyncio.wait_for(_queue.get(), timeout=15.0)
                    if _item is None:
                        break          # generator finished cleanly
                    yield _item
                except asyncio.TimeoutError:
                    # No event for 15 s — ping the CDN to keep the socket alive
                    yield _KEEPALIVE_SSE
        finally:
            _task.cancel()
            try:
                await _task
            except (asyncio.CancelledError, Exception):
                pass

    async def _generate_inner():
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

        # Local copy so assigning False later does NOT create an UnboundLocalError.
        # (Python treats any variable that is ever assigned in a function as local
        # throughout the whole function — reading it before the assignment would
        # raise UnboundLocalError if we used the bare outer `force_country` name.)
        _force_country = force_country

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
                    force_country=_force_country,
                    max_attempts=max_attempts,
                ):
                    yield chunk
                    if '"complete"' in chunk:
                        got_complete = True
                    elif '"sms_retry_prompt"' in chunk:
                        got_retry_prompt = True
                # force_country only applies to the user's first explicit retry;
                # auto-switch attempts on different countries should obey the pool.
                _force_country = False

                if got_complete:
                    succeeded += 1
                    _slot_done = True
                elif got_retry_prompt and auto_switch and _switch_count < MAX_AUTO_SWITCHES:
                    _tried_countries.add(cur_country_id.lower())
                    _switch_result = await _pick_auto_switch_proxy(_tried_countries, ai_country_ids)
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


# ── Avatar pool management (stored in campaigns.db, not filesystem) ───────────

async def _avatar_db_counts_async(conn: aiosqlite.Connection) -> dict:
    result = {}
    for g in ("male", "female"):
        async with conn.execute("SELECT COUNT(*) FROM avatar_pool WHERE gender=?", (g,)) as cur:
            row = await cur.fetchone()
        result[g] = row[0] if row else 0
    return result


@factory_router.get("/avatar-counts")
async def get_avatar_counts():
    """Return how many photos are stored in the DB pool for each gender."""
    try:
        _ensure_avatar_pool_table()
        async with aiosqlite.connect(DB_PATH) as conn:
            counts = await _avatar_db_counts_async(conn)
        return JSONResponse(counts)
    except Exception as e:
        return JSONResponse({"male": 0, "female": 0, "error": str(e)})


@factory_router.post("/upload-avatars")
async def upload_avatars(request: Request):
    """Save base64-encoded images into the avatar_pool table in campaigns.db.

    Deduplicates by content-hash — uploading the same bytes twice is a no-op.
    Rejects images smaller than 2 KB (truncated/corrupt uploads from Telegram WebView).
    """
    import base64 as _b64
    import hashlib as _hashlib
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON body"}, status_code=400)

    gender_val = str(body.get("gender", "")).strip().lower()
    if gender_val not in ("male", "female"):
        return JSONResponse({"error": "gender must be 'male' or 'female'"}, status_code=400)

    _ensure_avatar_pool_table()
    saved = 0
    skipped_too_small = 0
    async with aiosqlite.connect(DB_PATH) as conn:
        for file_item in body.get("files", []):
            name = str(file_item.get("name", "file.jpg"))
            data_b64 = str(file_item.get("data", ""))
            ext = os.path.splitext(name)[1].lower()
            if ext not in _AVATAR_EXTS:
                ext = ".jpg"
            try:
                content = _b64.b64decode(data_b64)
            except Exception:
                continue
            # Reject truncated / corrupt uploads.
            # A real photo is always ≥ 2 KB; anything smaller is a broken JPEG
            # header, a Telegram WebView thumbnail artifact, or a corrupt transfer.
            if len(content) < 2000:
                skipped_too_small += 1
                logger.warning(
                    "[AvatarPool] Rejected upload '%s': only %d bytes (need ≥ 2KB)",
                    name, len(content),
                )
                continue
            # Content-hash dedup: same bytes → same filename → INSERT OR IGNORE skips.
            # This prevents duplicates across sessions without needing a separate hash column.
            content_hash = _hashlib.sha256(content).hexdigest()[:20]
            safe_name = f"{content_hash}{ext}"
            try:
                await conn.execute(
                    "INSERT OR IGNORE INTO avatar_pool(gender, filename, data, ext) VALUES (?,?,?,?)",
                    (gender_val, safe_name, content, ext),
                )
                saved += 1
            except Exception:
                continue
        await conn.commit()
        await conn.execute("PRAGMA wal_checkpoint(FULL)")
        counts = await _avatar_db_counts_async(conn)

    return JSONResponse({
        "saved": saved,
        "skipped_too_small": skipped_too_small,
        "gender": gender_val,
        "counts": counts,
    })


@factory_router.get("/avatar-list")
async def get_avatar_list(gender: str = "male"):
    """Return filenames for all pending avatars of the given gender from the DB."""
    if gender not in ("male", "female"):
        return JSONResponse({"error": "gender must be male or female"}, status_code=400)
    _ensure_avatar_pool_table()
    async with aiosqlite.connect(DB_PATH) as conn:
        async with conn.execute(
            "SELECT filename FROM avatar_pool WHERE gender=? ORDER BY added_at ASC",
            (gender,),
        ) as cur:
            rows = await cur.fetchall()
    return JSONResponse({"gender": gender, "files": [r[0] for r in rows]})


@factory_router.delete("/avatar/{gender}/{filename}")
async def delete_avatar(gender: str, filename: str):
    """Delete a specific avatar from the DB pool."""
    if gender not in ("male", "female"):
        return JSONResponse({"error": "invalid gender"}, status_code=400)
    safe = os.path.basename(filename)
    if not safe:
        return JSONResponse({"error": "invalid filename"}, status_code=400)
    _ensure_avatar_pool_table()
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "DELETE FROM avatar_pool WHERE gender=? AND filename=?", (gender, safe)
        )
        await conn.commit()
        # Check if anything was actually deleted
        async with conn.execute(
            "SELECT COUNT(*) FROM avatar_pool WHERE gender=? AND filename=?", (gender, safe)
        ) as cur:
            pass  # row is gone; we just need rowcount which aiosqlite tracks via total_changes
        changes = conn.total_changes  # type: ignore[attr-defined]

    # aiosqlite doesn't expose rowcount directly; check total_changes delta instead
    # Simpler: just return OK (frontend removes from list optimistically)
    return JSONResponse({"deleted": safe, "gender": gender})


@factory_router.get("/avatar-image/{gender}/{filename}")
async def serve_avatar_image(gender: str, filename: str):
    """Serve a pending avatar image from the DB."""
    from fastapi.responses import Response as _Resp
    if gender not in ("male", "female"):
        return JSONResponse({"error": "invalid gender"}, status_code=400)
    safe = os.path.basename(filename)
    if not safe:
        return JSONResponse({"error": "invalid filename"}, status_code=400)
    _ensure_avatar_pool_table()
    async with aiosqlite.connect(DB_PATH) as conn:
        async with conn.execute(
            "SELECT data, ext FROM avatar_pool WHERE gender=? AND filename=?",
            (gender, safe),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return JSONResponse({"error": "not found"}, status_code=404)
    data, ext = row
    media_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                   ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
    return _Resp(content=bytes(data), media_type=media_types.get(ext, "image/jpeg"))


# ── SNSS Management Routes ────────────────────────────────────────────────────

@factory_router.get("/snss/stats")
async def snss_stats():
    """Return full SNSS prefix blacklist — stats + per-prefix rows."""
    import sqlite3 as _sq3
    try:
        conn = _sq3.connect(DB_PATH, timeout=5)
        conn.row_factory = _sq3.Row
        rows = conn.execute(
            "SELECT prefix, country_id, count, last_seen, pricing_options, example_phones "
            "FROM recycled_prefix_cache ORDER BY count DESC, last_seen DESC"
        ).fetchall()
        conn.close()
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)

    countries: set[str] = set()
    total_hits = 0
    prefixes = []
    for row in rows:
        cid = row["country_id"]
        countries.add(cid)
        total_hits += row["count"]
        prefixes.append({
            "prefix":          row["prefix"],
            "country_id":      cid,
            "count":           row["count"],
            "last_seen":       row["last_seen"],
            "pricing_options": json.loads(row["pricing_options"] or "[]"),
            "example_phones":  json.loads(row["example_phones"]  or "[]"),
        })

    return JSONResponse({
        "prefix_count":  len(prefixes),
        "country_count": len(countries),
        "countries":     sorted(countries),
        "total_hits":    total_hits,
        "min_count":     _SNSS_MIN_COUNT,
        "prefixes":      prefixes,
    })


@factory_router.delete("/snss/prefix")
async def snss_delete_prefix(prefix: str, country_id: str):
    """Remove a single prefix from the blacklist (DB + in-memory)."""
    global _RECYCLED_PREFIX_MEM
    import sqlite3 as _sq3
    cid = country_id.lower()
    mem_key = f"{prefix}:{cid}"
    _RECYCLED_PREFIX_MEM.pop(mem_key, None)
    try:
        conn = _sq3.connect(DB_PATH, timeout=5)
        conn.execute(
            "DELETE FROM recycled_prefix_cache WHERE prefix=? AND country_id=?",
            (prefix, cid),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)
    return JSONResponse({"deleted": mem_key})


@factory_router.post("/snss/clear")
async def snss_clear():
    """Remove every prefix from the blacklist (DB + in-memory)."""
    global _RECYCLED_PREFIX_MEM
    import sqlite3 as _sq3
    try:
        conn = _sq3.connect(DB_PATH, timeout=5)
        n = conn.execute("SELECT COUNT(*) FROM recycled_prefix_cache").fetchone()[0]
        conn.execute("DELETE FROM recycled_prefix_cache")
        conn.commit()
        conn.close()
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)
    _RECYCLED_PREFIX_MEM.clear()
    return JSONResponse({"cleared": n})


@factory_router.get("/snss/config")
async def snss_get_config():
    """Return the current SNSS threshold setting."""
    return JSONResponse({"min_count": _SNSS_MIN_COUNT})


@factory_router.post("/snss/config")
async def snss_set_config(request: Request):
    """Update SNSS threshold at runtime. Body: {"min_count": N}"""
    global _SNSS_MIN_COUNT
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON"}, status_code=400)
    mc = payload.get("min_count")
    if not isinstance(mc, int) or mc < 1 or mc > 50:
        return JSONResponse({"error": "min_count must be an integer 1–50"}, status_code=400)
    _SNSS_MIN_COUNT = mc
    logger.info("[SNSS] threshold updated → %d", _SNSS_MIN_COUNT)
    return JSONResponse({"min_count": _SNSS_MIN_COUNT})


# ── Credential Stats Routes ───────────────────────────────────────────────────

_CRED_LABEL: dict[int, str] = {2040: "TG Desktop", 2496: "TG iOS", 6: "TG Android"}

@factory_router.get("/cred-stats")
async def get_cred_stats():
    """Return per-api_id effectiveness counters for the current process lifetime."""
    rows = []
    for api_id, counts in sorted(_CRED_STATS.items(), key=lambda x: -sum(x[1].values())):
        rows.append({
            "api_id":  api_id,
            "label":   _CRED_LABEL.get(api_id, f"Dev {api_id}"),
            "sms_ok":  counts.get("sms_ok",  0),
            "app":     counts.get("app",      0),
            "timeout": counts.get("timeout",  0),
        })
    return JSONResponse(rows)

@factory_router.post("/cred-stats/reset")
async def reset_cred_stats():
    """Clear all credential stats counters."""
    _CRED_STATS.clear()
    return JSONResponse({"ok": True})
