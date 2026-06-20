import os
import re
import csv
import json
import time
import asyncio
import logging
import requests
import aiohttp
from io import StringIO
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, MenuButtonDefault, WebAppInfo
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    filters, ContextTypes, CallbackQueryHandler
)
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, FloodWaitError
import campaign_db as cdb
import campaign_sender as cs
import telethon_auth

TOKEN = os.getenv("TELEGRAM_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))

TELETHON_API_ID = os.getenv("TELETHON_API_ID")
TELETHON_API_HASH = os.getenv("TELETHON_API_HASH")
TELETHON_PHONE = os.getenv("TELETHON_PHONE")

_tg_client = None

async def get_telethon_client():
    global _tg_client
    if not TELETHON_API_ID or not TELETHON_API_HASH or not TELETHON_PHONE:
        raise ValueError("Telethon secrets не настроены (TELETHON_API_ID / API_HASH / PHONE)")
    if _tg_client is None or not _tg_client.is_connected():
        _tg_client = TelegramClient("telethon_session", int(TELETHON_API_ID), TELETHON_API_HASH)
        await _tg_client.connect()
        if not await _tg_client.is_user_authorized():
            raise RuntimeError(
                "Telethon не авторизован. Запусти /enrich auth в первый раз и введи код из Telegram."
            )
    return _tg_client

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def admin_only(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id if update.effective_user else None
        if user_id != ADMIN_ID:
            # Silent — non-admin gets no reply, just a warning in logs
            logger.warning(f"Blocked unauthorized access from user_id={user_id}")
            if update.callback_query:
                try:
                    await update.callback_query.answer()
                except Exception:
                    pass
            return
        return await func(update, context)
    wrapper.__name__ = func.__name__
    return wrapper


DB_FILE = "bot_db.json"
_db_lock = __import__("threading").Lock()

def db_load():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def db_save(data):
    import tempfile
    with _db_lock:
        fd, tmp = tempfile.mkstemp(dir=".", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp, DB_FILE)
        except Exception:
            try:
                os.unlink(tmp)
            except Exception:
                pass
            raise

def db_get(key, default=None):
    data = db_load()
    return data.get(key, default)

def db_set(key, value):
    data = db_load()
    data[key] = value
    db_save(data)

def db_delete(key):
    data = db_load()
    if key in data:
        del data[key]
        db_save(data)
        return True
    return False

def db_keys():
    return list(db_load().keys())

def increment_user_lookups(user_id):
    key = f"user_{user_id}_lookups"
    current = db_get(key, 0)
    db_set(key, current + 1)

PROMO_TEXT = (
    "🔥 Нравится бот? Попробуй мой проект *fuel-tickets-ru* — "
    "удобный инструмент для экономии на топливе и билетах.\n\n"
    "GitHub: https://github.com/2f22vtd4kr-cloud/fuel-tickets-ru\n"
    "Поставь ⭐ если полезно!"
)

async def send_promo(update: Update):
    target = update.message or (update.callback_query and update.callback_query.message)
    if target:
        await target.reply_text(PROMO_TEXT, parse_mode="Markdown")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    u = update.effective_user
    user_id = u.id
    # Always track user in audience DB
    await cdb.upsert_user(user_id, username=u.username, first_name=u.first_name)

    if user_id == ADMIN_ID:
        # Set CRM Mini App button for admin
        miniapp_url = os.getenv("MINIAPP_URL", "")
        if miniapp_url:
            try:
                await context.bot.set_chat_menu_button(
                    chat_id=user_id,
                    menu_button=MenuButtonWebApp(text="CRM", web_app=WebAppInfo(url=miniapp_url))
                )
            except Exception:
                pass

        welcome = (
            "👋 Привет, Администратор!\n\n"
            "📋 *Команды управления:*\n"
            "/campaigns — список кампаний\n"
            "/stats — статистика отправок\n"
            "/audience — аудитория бота\n"
            "/broadcast — ручная рассылка\n"
            "/help — все команды\n\n"
            "📱 Открой CRM-панель через кнопку меню внизу."
        )
        await update.message.reply_text(welcome, parse_mode="Markdown")
    else:
        # Remove CRM menu button for regular users
        try:
            await context.bot.set_chat_menu_button(
                chat_id=user_id,
                menu_button=MenuButtonDefault()
            )
        except Exception:
            pass

        # Handle referral tracking
        args = context.args
        if args and args[0].startswith("ref"):
            try:
                referrer = int(args[0][3:])
                ref_key = f"ref_{referrer}_count"
                db_set(ref_key, db_get(ref_key, 0) + 1)
            except ValueError:
                pass

        await update.message.reply_text(
            "⛽ Привет! Подпишитесь на наши акции и получайте выгодные предложения на топливо.",
            parse_mode="Markdown"
        )
        await send_promo(update)


@admin_only
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "📋 *Все команды:*\n\n"
        "🔍 *Поиск по открытым данным:*\n"
        "/inn `7707083893` — поиск организации по ИНН или ОГРН\n"
        "/ip `8.8.8.8` — информация по IP-адресу\n"
        "/checko — бесплатные ресурсы для глубокого поиска\n\n"
        "🌐 *Полезное:*\n"
        "/weather `Москва` — текущая погода\n"
        "/currency — курсы валют ЦБ РФ\n\n"
        "👥 *Социальное:*\n"
        "/ref — твоя реферальная ссылка\n"
        "/stats — статистика твоих запросов\n\n"
        "📁 *Файлы:*\n"
        "Отправь .html/.csv/.tsv/.json/.jsonl — распарсю и сохраню\n"
        "/listdata — список загрузок в базе\n"
        "/getdata `ключ` — просмотр записи\n"
        "/deldata `ключ` — удаление записи\n\n"
        "🚀 *Продвижение:*\n"
        "/fuel — о проекте fuel-tickets-ru\n\n"
        "📡 *Групповые рассылки:*\n"
        "/broadcasts — список групповых рассылок\n"
        "/workers — статус воркеров и очередь задач\n"
        "/group\\_send `id` — запустить рассылку прямо сейчас\n"
        "/broadcast `текст` — ручная рассылка всем пользователям"
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")


@admin_only
async def fuel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_promo(update)


@admin_only
async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🔎 Поиск по ИНН", callback_data="inn_help")],
        [InlineKeyboardButton("🌤 Погода", callback_data="weather_help")],
        [InlineKeyboardButton("💱 Курсы валют", callback_data="currency_now")],
        [InlineKeyboardButton("🌐 Поиск по IP", callback_data="ip_help")],
        [InlineKeyboardButton("🚀 fuel-tickets-ru", callback_data="fuel_promo")],
    ]
    await update.message.reply_text(
        "Выбери действие:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


@admin_only
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "fuel_promo":
        await send_promo(update)
    elif query.data == "inn_help":
        await query.message.reply_text("Отправь: /inn 7707083893")
    elif query.data == "weather_help":
        await query.message.reply_text("Отправь: /weather Москва")
    elif query.data == "ip_help":
        await query.message.reply_text("Отправь: /ip 8.8.8.8")
    elif query.data == "currency_now":
        context.args = []
        fake_update = update
        await _fetch_currency(query.message)
    elif query.data.startswith("gc_send:"):
        camp_id = int(query.data.split(":")[1])
        try:
            import aiosqlite
            db_path = os.environ.get("DB_PATH", "campaigns.db")
            async with aiosqlite.connect(db_path) as db:
                db.row_factory = aiosqlite.Row
                cur = await db.execute("SELECT name FROM group_campaigns WHERE id = ?", (camp_id,))
                camp = await cur.fetchone()
                if camp:
                    await db.execute(
                        "INSERT INTO tasks (task_type, campaign_id, payload, status, priority, max_attempts, created_at, scheduled_at) "
                        "VALUES ('group_broadcast', ?, '{}', 'pending', 1, 3, datetime('now'), datetime('now'))",
                        (camp_id,)
                    )
                    await db.commit()
                    await query.message.reply_text(f"✅ Рассылка *{camp['name']}* #{camp_id} запущена!", parse_mode="Markdown")
                else:
                    await query.message.reply_text(f"❌ Кампания #{camp_id} не найдена.")
        except Exception as e:
            await query.message.reply_text(f"❌ Ошибка: {e}")


@admin_only
async def inn_lookup(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Использование: /inn `7707083893` или /inn `1027739468877`",
            parse_mode="Markdown"
        )
        return

    query_val = context.args[0].strip()
    await update.message.reply_text(f"🔍 Ищу по ИНН/ОГРН: `{query_val}`...", parse_mode="Markdown")

    increment_user_lookups(update.effective_user.id)

    sources = [
        f"https://htmlweb.ru/api/service/org?inn={query_val}",
        f"https://htmlweb.ru/api/service/org?ogrn={query_val}",
    ]

    found = False
    for url in sources:
        try:
            resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("error") or not data.get("name"):
                    continue
                name = data.get("name") or data.get("full_name", "N/A")
                inn = data.get("inn", query_val)
                ogrn = data.get("ogrn", "N/A")
                address = data.get("address", "N/A")
                status = data.get("status", "N/A")
                okved = data.get("okved", "N/A")
                limit_left = data.get("limit", "N/A")

                result_text = (
                    f"✅ *Найдено (публичные данные):*\n\n"
                    f"🏢 *Название:* {name}\n"
                    f"🔢 *ИНН:* {inn}\n"
                    f"📋 *ОГРН:* {ogrn}\n"
                    f"📍 *Адрес:* {address}\n"
                    f"📊 *Статус:* {status}\n"
                    f"🏭 *ОКВЭД:* {okved}\n\n"
                    f"_Лимит запросов сегодня: {limit_left}_"
                )
                await update.message.reply_text(result_text, parse_mode="Markdown")
                found = True
                break
        except Exception as e:
            logger.warning(f"INN lookup error for {url}: {e}")
            continue

    if not found:
        await update.message.reply_text(
            "🔍 Данные не найдены или исчерпан дневной лимит.\n\n"
            "📋 *Рекомендации (бесплатно):*\n"
            "• [egrul.nalog.ru](https://egrul.nalog.ru) — официальный реестр ФНС\n"
            "• [Rusprofile.ru](https://rusprofile.ru) — удобный поиск\n"
            "• [Checko.ru](https://checko.ru) — Лайт тариф (бесплатно)\n"
            "• [Ofdata.ru](https://ofdata.ru) — API бесплатный тариф\n\n"
            "Попробуй /checko для подробностей.",
            parse_mode="Markdown",
            disable_web_page_preview=True
        )

    await send_promo(update)


@admin_only
async def weather(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Использование: /weather `Москва`",
            parse_mode="Markdown"
        )
        return

    city = " ".join(context.args)
    await update.message.reply_text(f"🌤 Получаю погоду для: {city}...")

    try:
        async with aiohttp.ClientSession() as session:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=ru"
            async with session.get(geo_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                geo = await resp.json()

            if not geo.get("results"):
                await update.message.reply_text("❌ Город не найден. Попробуй другое название.")
                return

            r = geo["results"][0]
            lat, lon = r["latitude"], r["longitude"]
            city_name = r.get("name", city)
            country = r.get("country", "")

            w_url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lon}"
                f"&current_weather=true"
                f"&hourly=relativehumidity_2m,windspeed_10m"
            )
            async with session.get(w_url, timeout=aiohttp.ClientTimeout(total=10)) as w_resp:
                wd = await w_resp.json()

            cw = wd.get("current_weather", {})
            temp = cw.get("temperature", "N/A")
            wind = cw.get("windspeed", "N/A")
            wmo = cw.get("weathercode", 0)

            weather_icons = {
                0: "☀️ Ясно", 1: "🌤 Преимущественно ясно", 2: "⛅ Переменная облачность",
                3: "☁️ Пасмурно", 45: "🌫 Туман", 48: "🌫 Изморозь",
                51: "🌦 Слабая морось", 53: "🌦 Морось", 55: "🌧 Сильная морось",
                61: "🌧 Слабый дождь", 63: "🌧 Дождь", 65: "🌧 Сильный дождь",
                71: "🌨 Слабый снег", 73: "🌨 Снег", 75: "❄️ Сильный снег",
                80: "🌦 Ливень", 81: "🌧 Ливень", 82: "⛈ Сильный ливень",
                95: "⛈ Гроза", 96: "⛈ Гроза с градом", 99: "⛈ Гроза с сильным градом",
            }
            condition = weather_icons.get(wmo, f"Код: {wmo}")

            msg = (
                f"🌍 *{city_name}, {country}*\n\n"
                f"{condition}\n"
                f"🌡 Температура: *{temp}°C*\n"
                f"💨 Ветер: {wind} км/ч\n\n"
                f"_Данные: Open-Meteo (бесплатно)_"
            )
            await update.message.reply_text(msg, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Weather error: {e}")
        await update.message.reply_text("❌ Ошибка получения погоды. Попробуй позже.")

    await send_promo(update)


async def _fetch_currency(target_message):
    try:
        resp = requests.get(
            "https://www.cbr-xml-daily.ru/daily_json.js",
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        data = resp.json()
        valutes = data.get("Valute", {})

        currencies = ["USD", "EUR", "CNY", "GBP", "JPY", "KZT", "BYR", "UAH"]
        lines = [f"💱 *Курсы валют ЦБ РФ*\n_на {data.get('Date', 'сегодня')[:10]}_\n"]

        for code in currencies:
            if code in valutes:
                v = valutes[code]
                name = v.get("Name", code)
                val = v.get("Value", 0)
                nominal = v.get("Nominal", 1)
                prev = v.get("Previous", val)
                diff = val - prev
                arrow = "📈" if diff > 0 else ("📉" if diff < 0 else "➡️")
                lines.append(
                    f"{arrow} *{code}* ({nominal} {name[:15]}): {val:.2f} ₽  _{diff:+.2f}_"
                )

        await target_message.reply_text("\n".join(lines), parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Currency error: {e}")
        await target_message.reply_text("❌ Ошибка получения курсов. Попробуй позже.")


@admin_only
async def currency(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await _fetch_currency(update.message)
    await send_promo(update)


@admin_only
async def ip_lookup(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Использование: /ip `8.8.8.8`",
            parse_mode="Markdown"
        )
        return

    ip = context.args[0].strip()
    await update.message.reply_text(f"🔍 Получаю данные по IP: `{ip}`...", parse_mode="Markdown")

    increment_user_lookups(update.effective_user.id)

    try:
        resp = requests.get(
            f"https://ipapi.co/{ip}/json/",
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("error"):
                await update.message.reply_text(f"❌ {data.get('reason', 'IP не найден')}")
            else:
                msg = (
                    f"🌐 *Информация по IP: `{ip}`*\n\n"
                    f"🌍 Страна: {data.get('country_name', 'N/A')} {data.get('country_code', '')}\n"
                    f"🏙 Город: {data.get('city', 'N/A')}\n"
                    f"🗺 Регион: {data.get('region', 'N/A')}\n"
                    f"🏢 Провайдер: {data.get('org', 'N/A')}\n"
                    f"🌐 ASN: {data.get('asn', 'N/A')}\n"
                    f"🕐 Часовой пояс: {data.get('timezone', 'N/A')}\n"
                    f"📍 Координаты: {data.get('latitude', 'N/A')}, {data.get('longitude', 'N/A')}\n\n"
                    f"_Данные: ipapi.co (публичные)_"
                )
                await update.message.reply_text(msg, parse_mode="Markdown")
        else:
            raise Exception(f"HTTP {resp.status_code}")

    except Exception as e:
        logger.error(f"IP lookup error: {e}")
        await update.message.reply_text(
            "❌ Не удалось получить данные по IP (публичные источники).\n"
            "Проверь формат: /ip 8.8.8.8"
        )

    await send_promo(update)


@admin_only
async def checko_hint(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📋 *Бесплатные ресурсы для поиска по российским компаниям:*\n\n"
        "🔹 [egrul.nalog.ru](https://egrul.nalog.ru) — официальный ЕГРЮЛ ФНС\n"
        "🔹 [Rusprofile.ru](https://rusprofile.ru) — удобный поиск без регистрации\n"
        "🔹 [Checko.ru](https://checko.ru) — Лайт тариф (бесплатно после рег.)\n"
        "🔹 [Ofdata.ru](https://ofdata.ru) — API, есть бесплатный тариф\n"
        "🔹 [htmlweb.ru](https://htmlweb.ru) — 20 запросов/день без ключа\n"
        "🔹 [Контур.Фокус](https://focus.kontur.ru) — демо-доступ\n"
        "🔹 [СБИС](https://sbis.ru) — поиск по ИНН/ОГРН\n\n"
        "💡 Введи /inn + ИНН для автоматического поиска через бот.",
        parse_mode="Markdown",
        disable_web_page_preview=True
    )
    await send_promo(update)


@admin_only
async def referral(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    bot = context.bot
    bot_info = await bot.get_me()
    ref_link = f"https://t.me/{bot_info.username}?start=ref{user_id}"
    ref_count = db_get(f"ref_{user_id}_count", 0)

    await update.message.reply_text(
        f"🔗 *Твоя реферальная ссылка:*\n`{ref_link}`\n\n"
        f"👥 Друзей привлёк: *{ref_count}*\n\n"
        f"Поделись ссылкой — помоги другу найти нужные данные!",
        parse_mode="Markdown"
    )
    await send_promo(update)


@admin_only
async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    lookups = db_get(f"user_{user_id}_lookups", 0)
    refs = db_get(f"ref_{user_id}_count", 0)
    total_keys = len(db_keys())
    username = update.effective_user.username or update.effective_user.first_name

    await update.message.reply_text(
        f"📊 *Статистика для @{username}:*\n\n"
        f"🔍 Запросов сделано: *{lookups}*\n"
        f"👥 Рефералов привлечено: *{refs}*\n"
        f"📁 Записей в общей базе: *{total_keys}*\n\n"
        f"_Используй /ref чтобы поделиться ботом_",
        parse_mode="Markdown"
    )


@admin_only
async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.document:
        return

    doc = update.message.document
    filename = (doc.file_name or "").lower()

    supported = (".html", ".csv", ".tsv", ".jsonl", ".json")
    if not any(filename.endswith(ext) for ext in supported):
        await update.message.reply_text(
            "❌ Поддерживаются файлы: *.html*, *.csv*, *.tsv*, *.jsonl*, *.json*\n\n"
            "Отправь один из этих форматов и я сохраню данные в базу.",
            parse_mode="Markdown"
        )
        return

    await update.message.reply_text(f"📤 Получаю файл: `{filename}`\nОбрабатываю...", parse_mode="Markdown")

    try:
        file = await context.bot.get_file(doc.file_id)
        content = (await file.download_as_bytearray()).decode("utf-8", errors="ignore")

        extracted = {
            "filename": filename,
            "uploaded_at": datetime.now().isoformat(),
            "uploaded_by": update.effective_user.id,
            "entries": []
        }

        if filename.endswith(".html"):
            names = re.findall(
                r"([А-ЯЁ][А-ЯЁа-яё]{1,}\s+[А-ЯЁ][А-ЯЁа-яё]{1,}(?:\s+[А-ЯЁ][А-ЯЁа-яё]{1,})?)",
                content
            )
            phones = re.findall(r"[\+]?[0-9]{1}[\s\-\(\)0-9]{8,18}[0-9]", content)
            vins = re.findall(r"\b[A-HJ-NPR-Z0-9]{17}\b", content)
            plates = re.findall(r"\b[А-ЯЁA-Z]{1,2}\d{3,4}[А-ЯЁA-Z]{2}\d{2,3}\b", content)

            seen_names = dict.fromkeys(names)
            for name in list(seen_names)[:100]:
                extracted["entries"].append({"full_name": name.strip()})
            for phone in set(phones[:50]):
                cleaned = re.sub(r"[\s\-\(\)]", "", phone)
                if 7 <= len(cleaned) <= 15:
                    extracted["entries"].append({"phone": cleaned})
            for vin in set(vins[:20]):
                extracted["entries"].append({"vin": vin})
            for plate in set(plates[:20]):
                extracted["entries"].append({"plate": plate})

        elif filename.endswith((".csv", ".tsv")):
            delimiter = "\t" if filename.endswith(".tsv") else ","
            reader = csv.DictReader(StringIO(content), delimiter=delimiter)
            for row in reader:
                clean_row = {k.strip(): str(v).strip() for k, v in row.items() if v and str(v).strip()}
                if clean_row:
                    extracted["entries"].append(clean_row)

        elif filename.endswith(".jsonl"):
            for line in content.strip().split("\n"):
                if line.strip():
                    try:
                        data = json.loads(line)
                        extracted["entries"].append(data if isinstance(data, dict) else {"data": data})
                    except Exception:
                        continue

        elif filename.endswith(".json"):
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    extracted["entries"] = [d if isinstance(d, dict) else {"data": d} for d in data]
                elif isinstance(data, dict):
                    extracted["entries"] = [data]
            except Exception:
                pass

        key = f"upload_{int(time.time())}"
        db_set(key, extracted)

        # Auto-enrich phone entries in the background (timeout 8s per lookup)
        phone_entries = [e for e in extracted["entries"] if "phone" in e and "telegram" not in e]
        if phone_entries:
            asyncio.create_task(_auto_enrich_upload(key, phone_entries, extracted))

        count = len(extracted["entries"])
        await update.message.reply_text(
            f"✅ *Файл загружен и обработан!*\n\n"
            f"📁 Файл: `{filename}`\n"
            f"📊 Записей сохранено: *{count}*\n"
            f"🔑 Ключ в базе: `{key}`\n\n"
            f"Команды для просмотра:\n"
            f"`/getdata {key}` — посмотреть\n"
            f"`/listdata` — все загрузки",
            parse_mode="Markdown"
        )

    except Exception as e:
        logger.error(f"Document handler error: {e}")
        await update.message.reply_text(f"❌ Ошибка при обработке файла:\n`{str(e)[:300]}`", parse_mode="Markdown")


@admin_only
async def get_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Использование: /getdata `ключ`", parse_mode="Markdown")
        return
    key = context.args[0].strip()
    value = db_get(key)
    if value is None:
        await update.message.reply_text("❌ Ключ не найден. Используй /listdata чтобы посмотреть все ключи.")
        return

    text = json.dumps(value, ensure_ascii=False, indent=2)
    if len(text) > 3500:
        text = text[:3500] + "\n...(обрезано)"

    await update.message.reply_text(
        f"🔑 Ключ: `{key}`\n\n```json\n{text}\n```",
        parse_mode="Markdown"
    )


@admin_only
async def list_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keys = db_keys()
    data_keys = [k for k in keys if k.startswith("upload_") or k.startswith("report_")]

    if not data_keys:
        await update.message.reply_text(
            "📂 База загрузок пустая.\n\nОтправь файл (.html/.csv/.json) и я сохраню данные."
        )
        return

    lines = ["📋 *Загрузки в базе:*\n"]
    for k in sorted(data_keys)[-30:]:
        val = db_get(k, {})
        fname = val.get("filename", k)
        count = len(val.get("entries", []))
        lines.append(f"• `{k}` — {fname} ({count} записей)")

    lines.append(f"\n/getdata `ключ` — посмотреть записи")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


@admin_only
async def delete_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Использование: /deldata `ключ`", parse_mode="Markdown")
        return
    key = context.args[0].strip()
    if db_delete(key):
        await update.message.reply_text(f"🗑 Ключ `{key}` успешно удалён.", parse_mode="Markdown")
    else:
        await update.message.reply_text("❌ Ключ не найден.")


@admin_only
async def export_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    all_data = db_load()
    upload_keys = [k for k in all_data if k.startswith("upload_") or k.startswith("report_")]

    query_val = " ".join(context.args).strip().lower() if context.args else ""

    if not upload_keys:
        await update.message.reply_text(
            "📂 База пустая. Сначала загрузи файл (.html/.csv/.json)."
        )
        return

    await update.message.reply_text(
        f"📦 Формирую CSV{'  по запросу: *' + query_val + '*' if query_val else ''}...",
        parse_mode="Markdown"
    )

    rows = []
    fieldnames_set = []

    for key in upload_keys:
        record = all_data[key]
        filename = record.get("filename", key)
        entries = record.get("entries", [])
        for entry in entries:
            if query_val:
                entry_str = json.dumps(entry, ensure_ascii=False).lower()
                if query_val not in entry_str:
                    continue
            row = {"_source_file": filename, "_key": key}
            row.update(entry)
            rows.append(row)
            for k in row:
                if k not in fieldnames_set:
                    fieldnames_set.append(k)

    if not rows:
        msg = (
            f"❌ По запросу *{query_val}* ничего не найдено."
            if query_val else
            "❌ В базе нет записей для экспорта."
        )
        await update.message.reply_text(msg, parse_mode="Markdown")
        return

    export_path = f"/tmp/export_{int(time.time())}.csv"
    with open(export_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_set, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    caption = (
        f"📊 Экспорт: *{len(rows)} записей*"
        + (f" по запросу «{query_val}»" if query_val else " (все данные)")
        + f"\n📁 Файлов-источников: {len(upload_keys)}"
    )

    with open(export_path, "rb") as f:
        await update.message.reply_document(
            document=f,
            filename=f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            caption=caption,
            parse_mode="Markdown"
        )

    os.remove(export_path)


@admin_only
async def search_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Использование: /search `Попова` или /search `+79161234567`\n\n"
            "Поиск по всем загруженным файлам (имя, телефон, VIN, номер)",
            parse_mode="Markdown"
        )
        return

    query_val = " ".join(context.args).strip().lower()
    await update.message.reply_text(f"🔍 Ищу: `{query_val}` по всем загрузкам...", parse_mode="Markdown")

    all_data = db_load()
    upload_keys = [k for k in all_data if k.startswith("upload_") or k.startswith("report_")]

    if not upload_keys:
        await update.message.reply_text(
            "📂 База пустая. Сначала загрузи файл (.html/.csv/.json)."
        )
        return

    matches = []
    for key in upload_keys:
        record = all_data[key]
        entries = record.get("entries", [])
        filename = record.get("filename", key)
        for entry in entries:
            entry_str = json.dumps(entry, ensure_ascii=False).lower()
            if query_val in entry_str:
                matches.append((key, filename, entry))
            if len(matches) >= 50:
                break
        if len(matches) >= 50:
            break

    if not matches:
        await update.message.reply_text(
            f"❌ По запросу *{query_val}* ничего не найдено.\n\n"
            "Проверь: загружены ли файлы (/listdata)?",
            parse_mode="Markdown"
        )
        return

    lines = [f"✅ *Найдено совпадений: {len(matches)}* (показаны первые 20)\n"]
    prev_key = None
    shown = 0
    for key, filename, entry in matches[:20]:
        if key != prev_key:
            lines.append(f"\n📁 *{filename}* (`{key}`)")
            prev_key = key
        parts = []
        if entry.get("full_name"):
            parts.append(f"👤 {entry['full_name']}")
        if entry.get("phone"):
            parts.append(f"📱 {entry['phone']}")
        if entry.get("address"):
            parts.append(f"📍 {entry['address']}")
        if entry.get("plate"):
            parts.append(f"🚗 {entry['plate']}")
        if entry.get("vin"):
            parts.append(f"🔩 VIN: {entry['vin']}")
        if not parts:
            flat = ", ".join(f"{k}: {v}" for k, v in list(entry.items())[:3])
            parts.append(flat)
        lines.append("  • " + " | ".join(parts))
        shown += 1

    if len(matches) > 20:
        lines.append(f"\n_...и ещё {len(matches) - 20} совпадений. Уточни запрос._")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


@admin_only
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text or ""
    if text and not text.startswith("/"):
        inn_match = re.match(r"^[\d]{10,13}$", text.strip())
        if inn_match:
            context.args = [text.strip()]
            await inn_lookup(update, context)
        else:
            await update.message.reply_text(
                "📋 Отправь команду, например:\n"
                "/inn 7707083893\n"
                "/weather Москва\n"
                "/currency\n"
                "/ip 8.8.8.8\n\n"
                "Или введи /help для списка всех команд."
            )


@admin_only
async def broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Использование: /broadcast Текст сообщения\n\n"
            "Отправит сообщение всем пользователям, которые когда-либо использовали бота.",
        )
        return

    text = " ".join(context.args)
    all_data = db_load()
    user_keys = [k for k in all_data if k.startswith("user_") and k.endswith("_lookups")]
    user_ids = []
    for k in user_keys:
        try:
            uid = int(k.replace("user_", "").replace("_lookups", ""))
            user_ids.append(uid)
        except ValueError:
            continue

    if not user_ids:
        await update.message.reply_text("📭 Нет пользователей в базе для рассылки.")
        return

    await update.message.reply_text(f"📣 Начинаю рассылку для {len(user_ids)} пользователей...")

    sent, failed = 0, 0
    for uid in user_ids:
        try:
            await context.bot.send_message(chat_id=uid, text=text)
            sent += 1
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.warning(f"Broadcast failed for {uid}: {e}")
            failed += 1

    await update.message.reply_text(
        f"✅ Рассылка завершена!\n\n"
        f"📨 Отправлено: {sent}\n"
        f"❌ Ошибок: {failed}"
    )


async def workers_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show broadcast workers health summary."""
    try:
        import aiosqlite
        db_path = os.environ.get("DB_PATH", "campaigns.db")
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            # Workers
            cur = await db.execute("SELECT worker_id, status, tasks_done, tasks_failed, last_heartbeat FROM broadcast_workers ORDER BY last_heartbeat DESC")
            wrows = await cur.fetchall()
            # Task queue counts
            cur2 = await db.execute(
                "SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status"
            )
            tcounts = {r["status"]: r["cnt"] async for r in cur2}

        import datetime as _dt
        now = _dt.datetime.utcnow()
        lines = ["📡 *Статус воркеров*\n"]
        if not wrows:
            lines.append("Нет зарегистрированных воркеров.")
            lines.append("\n▶️ Запусти: `python worker.py worker-1`")
        else:
            for w in wrows:
                ts = _dt.datetime.fromisoformat(w["last_heartbeat"].replace("Z", ""))
                age = (now - ts).total_seconds()
                alive = age < 120
                icon = "🟢" if alive else "🔴"
                lines.append(f"{icon} *{w['worker_id']}* — {w['status']}")
                lines.append(f"   ✅ {w['tasks_done']} выполнено / ❌ {w['tasks_failed']} ошибок")
                lines.append(f"   Пульс: {int(age)}с назад")

        lines.append("\n📋 *Очередь задач*")
        for status, cnt in tcounts.items():
            emoji = {"pending": "⏳", "claimed": "⚙️", "done": "✅", "failed": "❌", "cancelled": "🚫", "dead": "💀"}.get(status, "•")
            lines.append(f"  {emoji} {status}: {cnt}")

        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")


async def broadcasts_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show group broadcast campaigns status."""
    try:
        import aiosqlite
        import datetime as _dt
        db_path = os.environ.get("DB_PATH", "campaigns.db")
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT id, name, status, sent_count, failed_count, interval_seconds, next_send_at "
                "FROM group_campaigns ORDER BY updated_at DESC LIMIT 10"
            )
            rows = await cur.fetchall()

        if not rows:
            await update.message.reply_text("📭 Нет групповых рассылок.\n\nСоздай их в Mini App → вкладка Группы.")
            return

        lines = ["📡 *Групповые рассылки*\n"]
        status_icon = {"running": "🟢", "paused": "🟡", "draft": "⚪", "cancelled": "⛔", "error": "🔴"}
        from telegram import InlineKeyboardButton, InlineKeyboardMarkup
        keyboard_rows = []
        for c in rows:
            icon = status_icon.get(c["status"], "•")
            interval_h = round(c["interval_seconds"] / 3600, 1)
            next_send = ""
            if c["next_send_at"]:
                try:
                    ns = _dt.datetime.fromisoformat(c["next_send_at"].replace("Z", ""))
                    delta = (ns - _dt.datetime.utcnow()).total_seconds()
                    if delta > 0:
                        hh, mm = divmod(int(delta) // 60, 60)
                        next_send = f" · след. через {hh}ч {mm}м" if hh else f" · след. через {mm}м"
                except Exception:
                    pass
            lines.append(f"{icon} *{c['name']}* (#{c['id']})")
            lines.append(f"   ✅ {c['sent_count']} / ❌ {c['failed_count']} · каждые {interval_h}ч{next_send}")
            # Add quick-send button for running/paused campaigns
            if c["status"] in ("running", "paused", "draft"):
                keyboard_rows.append([
                    InlineKeyboardButton(f"▶ Отправить #{c['id']}", callback_data=f"gc_send:{c['id']}")
                ])

        reply_markup = InlineKeyboardMarkup(keyboard_rows) if keyboard_rows else None
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown", reply_markup=reply_markup)
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")


@admin_only
async def group_send_now(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Immediately push a group campaign task. Usage: /group_send <id>"""
    args = context.args or []
    if not args or not args[0].isdigit():
        await update.message.reply_text(
            "Использование: `/group_send <id>`\n\nСписок кампаний: /broadcasts",
            parse_mode="Markdown"
        )
        return
    camp_id = int(args[0])
    try:
        import aiosqlite
        db_path = os.environ.get("DB_PATH", "campaigns.db")
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT id, name, status FROM group_campaigns WHERE id = ?", (camp_id,))
            camp = await cur.fetchone()
        if not camp:
            await update.message.reply_text(f"❌ Кампания #{camp_id} не найдена.")
            return

        # Insert task
        async with aiosqlite.connect(db_path) as db:
            cur = await db.execute(
                "INSERT INTO tasks (task_type, campaign_id, payload, status, priority, max_attempts, created_at, scheduled_at) "
                "VALUES ('group_broadcast', ?, '{}', 'pending', 1, 3, datetime('now'), datetime('now'))",
                (camp_id,)
            )
            await db.commit()
            task_id = cur.lastrowid

        await update.message.reply_text(
            f"✅ Задача #{task_id} поставлена в очередь\n"
            f"Кампания: *{camp['name']}* (#{camp_id})\n"
            f"Статус кампании: {camp['status']}\n\n"
            f"Воркеры подхватят задачу в течение 5–10 секунд.",
            parse_mode="Markdown"
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")


_enrich_task = None
_enrich_running = False
_pending_auth = False


async def _do_enrich_single(phone: str, entry: dict, client) -> bool:
    clean = re.sub(r'\D', '', phone)
    if len(clean) < 10:
        return False
    if not (clean.startswith('7') or clean.startswith('8') or clean.startswith('+')):
        return False
    if "telegram" in entry:
        return False
    try:
        entity = await asyncio.wait_for(client.get_entity(phone), timeout=8.0)
        entry["telegram"] = {
            "username": getattr(entity, 'username', None),
            "id": str(entity.id),
            "name": f"{getattr(entity, 'first_name', '') or ''} {getattr(entity, 'last_name', '') or ''}".strip(),
            "enriched_at": datetime.now().isoformat(),
        }
        return True
    except asyncio.TimeoutError:
        return False
    except FloodWaitError as e:
        await asyncio.sleep(min(e.seconds + 5, 60))
        return False
    except Exception:
        return False


async def _enrich_users_db(client) -> int:
    """Enrich users in campaigns.db who have no @username by chat_id lookup via Telethon."""
    import sqlite3 as _sqlite3
    enriched = 0
    try:
        conn = _sqlite3.connect("campaigns.db")
        conn.row_factory = _sqlite3.Row
        users = conn.execute(
            "SELECT chat_id FROM users WHERE (username IS NULL OR username = '') LIMIT 100"
        ).fetchall()
        for u in users:
            try:
                entity = await asyncio.wait_for(client.get_entity(int(u["chat_id"])), timeout=8.0)
                username = getattr(entity, "username", None)
                if username:
                    conn.execute("UPDATE users SET username = ? WHERE chat_id = ?", (username, u["chat_id"]))
                    conn.commit()
                    enriched += 1
                await asyncio.sleep(1)
            except Exception:
                continue
        conn.close()
    except Exception:
        pass
    return enriched


async def _auto_enrich_upload(key: str, phone_entries: list, extracted: dict):
    """Background task: enrich phone entries from a freshly uploaded file."""
    try:
        client = await get_telethon_client()
        updated = False
        for entry in phone_entries:
            phone = entry.get("phone", "")
            if phone and await _do_enrich_single(phone, entry, client):
                updated = True
                await asyncio.sleep(2)
        if updated:
            db_set(key, extracted)
    except Exception:
        pass


async def _enrich_loop(bot, chat_id: int):
    global _enrich_running
    _enrich_running = True
    processed = 0
    try:
        client = await get_telethon_client()
        all_data = db_load()
        upload_keys = [k for k in all_data if k.startswith("upload_") or k.startswith("report_")]

        for key in upload_keys:
            if not _enrich_running:
                break
            record = all_data[key]
            entries = record.get("entries", [])
            updated = False
            for entry in entries:
                if not _enrich_running:
                    break
                phone = None
                for field in ["phone", "Phone", "телефон", "Телефон", "номер"]:
                    if field in entry and isinstance(entry[field], str):
                        phone = entry[field]
                        break
                if phone:
                    if await _do_enrich_single(phone, entry, client):
                        updated = True
                        processed += 1
                        await asyncio.sleep(3)
            if updated:
                all_data[key] = record
                db_save(all_data)

        # Also enrich campaigns.db users who have no @username
        users_enriched = await _enrich_users_db(client)

        await bot.send_message(
            chat_id=chat_id,
            text=(
                f"✅ Обогащение завершено!\n"
                f"📱 Номеров телефонов: *{processed}*\n"
                f"👤 Пользователей в БД: *{users_enriched}*"
            ),
            parse_mode="Markdown"
        )
    except Exception as e:
        await bot.send_message(chat_id=chat_id, text=f"❌ Ошибка обогащения:\n`{str(e)[:300]}`", parse_mode="Markdown")
    finally:
        _enrich_running = False


@admin_only
async def enrich(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global _enrich_task, _enrich_running, _pending_auth

    subcmd = context.args[0].lower() if context.args else ""

    if subcmd == "auth":
        if not TELETHON_API_ID or not TELETHON_API_HASH or not TELETHON_PHONE:
            await update.message.reply_text("❌ TELETHON_API_ID / API_HASH / PHONE не настроены в Secrets.")
            return
        await update.message.reply_text("🔐 Подключаюсь к Telegram и отправляю код...")
        try:
            client = TelegramClient("telethon_session", int(TELETHON_API_ID), TELETHON_API_HASH)
            await client.connect()
            if await client.is_user_authorized():
                await update.message.reply_text("✅ Уже авторизован! Можешь запускать /enrich start")
                await client.disconnect()
                return
            await client.send_code_request(TELETHON_PHONE)
            _pending_auth = True
            db_set("_telethon_auth_pending", True)
            await client.disconnect()
            await update.message.reply_text(
                "📲 Код отправлен на твой номер в Telegram.\n\n"
                "Отправь его боту командой:\n`/enrich code XXXXX`",
                parse_mode="Markdown"
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Ошибка авторизации:\n`{str(e)[:300]}`", parse_mode="Markdown")

    elif subcmd == "code":
        code = context.args[1] if len(context.args) > 1 else ""
        if not code:
            await update.message.reply_text("Использование: /enrich code 12345")
            return
        try:
            client = TelegramClient("telethon_session", int(TELETHON_API_ID), TELETHON_API_HASH)
            await client.connect()
            try:
                await client.sign_in(TELETHON_PHONE, code)
            except SessionPasswordNeededError:
                await update.message.reply_text(
                    "🔒 Включена 2FA. Отправь пароль:\n`/enrich 2fa ТВОЙпароль`",
                    parse_mode="Markdown"
                )
                await client.disconnect()
                return
            await client.disconnect()
            db_delete("_telethon_auth_pending")
            await update.message.reply_text("✅ Авторизация успешна! Теперь запусти /enrich start")
        except Exception as e:
            await update.message.reply_text(f"❌ Неверный код или ошибка:\n`{str(e)[:300]}`", parse_mode="Markdown")

    elif subcmd == "2fa":
        password = context.args[1] if len(context.args) > 1 else ""
        if not password:
            await update.message.reply_text("Использование: /enrich 2fa пароль")
            return
        try:
            client = TelegramClient("telethon_session", int(TELETHON_API_ID), TELETHON_API_HASH)
            await client.connect()
            await client.sign_in(password=password)
            await client.disconnect()
            db_delete("_telethon_auth_pending")
            await update.message.reply_text("✅ 2FA принята! Теперь запусти /enrich start")
        except Exception as e:
            await update.message.reply_text(f"❌ Ошибка 2FA:\n`{str(e)[:300]}`", parse_mode="Markdown")

    elif subcmd == "start":
        if _enrich_running:
            await update.message.reply_text("⚙️ Обогащение уже идёт. Используй /enrich stop чтобы остановить.")
            return
        all_data = db_load()
        upload_keys = [k for k in all_data if k.startswith("upload_") or k.startswith("report_")]
        if not upload_keys:
            await update.message.reply_text("📂 Нет загруженных файлов. Сначала загрузи файл.")
            return
        await update.message.reply_text(
            f"🚀 Запускаю обогащение по {len(upload_keys)} файлам...\n"
            "Буду искать Telegram-аккаунты для российских номеров.\n"
            "Уведомлю по завершении.",
        )
        _enrich_task = asyncio.create_task(
            _enrich_loop(context.bot, update.effective_chat.id)
        )

    elif subcmd == "stop":
        if not _enrich_running:
            await update.message.reply_text("ℹ️ Обогащение не запущено.")
            return
        _enrich_running = False
        await update.message.reply_text("⏹ Обогащение остановлено.")

    elif subcmd == "status":
        all_data = db_load()
        total_entries = sum(
            len(v.get("entries", []))
            for k, v in all_data.items()
            if k.startswith("upload_") or k.startswith("report_")
        )
        enriched = sum(
            1
            for k, v in all_data.items()
            if k.startswith("upload_") or k.startswith("report_")
            for e in v.get("entries", [])
            if "telegram" in e
        )
        status_str = "🟢 Запущено" if _enrich_running else "🔴 Остановлено"
        await update.message.reply_text(
            f"📊 *Статус обогащения:*\n\n"
            f"Состояние: {status_str}\n"
            f"Всего записей: {total_entries}\n"
            f"Обогащено (с Telegram): {enriched}\n\n"
            f"Команды:\n"
            f"`/enrich auth` — авторизация Telethon\n"
            f"`/enrich start` — запустить\n"
            f"`/enrich stop` — остановить",
            parse_mode="Markdown"
        )

    else:
        await update.message.reply_text(
            "📋 *Команды /enrich:*\n\n"
            "`/enrich auth` — авторизоваться в Telegram (первый раз)\n"
            "`/enrich code 12345` — ввести код\n"
            "`/enrich 2fa пароль` — ввести 2FA пароль\n"
            "`/enrich start` — запустить обогащение\n"
            "`/enrich stop` — остановить\n"
            "`/enrich status` — состояние и статистика",
            parse_mode="Markdown"
        )


STATUS_EMOJI = {
    "draft": "📝", "running": "🟢", "paused": "⏸",
    "done": "✅", "cancelled": "⏹", "scheduled": "📅",
}


@admin_only
async def campaign(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    subcmd = args[0].lower() if args else ""

    # ── /campaign create <name> <text...> ──────────────────────────────────
    if subcmd == "create":
        if len(args) < 3:
            await update.message.reply_text(
                "Использование: `/campaign create имя Текст сообщения`\n\n"
                "Поддерживает переменные: `{name}` `{username}`",
                parse_mode="Markdown"
            )
            return
        name = args[1]
        text = " ".join(args[2:])
        existing = await cdb.get_campaign(name)
        if existing:
            await update.message.reply_text(f"❌ Кампания «{name}» уже существует.")
            return
        cid = await cdb.create_campaign(name, text)
        await update.message.reply_text(
            f"✅ Кампания *«{name}»* создана (ID {cid})\n\n"
            f"📝 Текст:\n_{text}_\n\n"
            f"Команды:\n"
            f"`/campaign send {name}` — запустить\n"
            f"`/campaign dryrun {name}` — тест без отправки\n"
            f"`/campaign delete {name}` — удалить",
            parse_mode="Markdown"
        )

    # ── /campaign list ─────────────────────────────────────────────────────
    elif subcmd == "list":
        campaigns = await cdb.list_campaigns()
        if not campaigns:
            await update.message.reply_text(
                "📭 Нет кампаний. Создай командой:\n`/campaign create имя Текст`",
                parse_mode="Markdown"
            )
            return
        lines = ["📋 *Все кампании:*\n"]
        for c in campaigns:
            emoji = STATUS_EMOJI.get(c["status"], "❓")
            sched = f"\n   📅 Запуск: `{c['scheduled_at'][:16]}`" if c.get("scheduled_at") else ""
            tag_str = f"  🏷 `{c['scheduled_tag']}`" if c.get("scheduled_tag") else ""
            lines.append(
                f"{emoji} *{c['name']}* — {c['status']}{sched}{tag_str}\n"
                f"   ✅ {c['sent_count']} отправлено  ❌ {c['failed_count']} ошибок  "
                f"👥 {c['target_count']} получателей"
            )
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

    # ── /campaign send <name> [tag] ────────────────────────────────────────
    elif subcmd in ("send", "dryrun"):
        if len(args) < 2:
            await update.message.reply_text(
                f"Использование: `/campaign {subcmd} имя [тег]`",
                parse_mode="Markdown"
            )
            return
        name = args[1]
        tag = args[2] if len(args) > 2 else None
        c = await cdb.get_campaign(name)
        if not c:
            await update.message.reply_text(f"❌ Кампания «{name}» не найдена.")
            return
        if c["status"] == "running":
            await update.message.reply_text("⚙️ Кампания уже запущена.")
            return

        dry = subcmd == "dryrun"
        if dry:
            await cdb.update_campaign_status(c["id"], "draft", dry_run=1)
        else:
            await cdb.update_campaign_status(c["id"], "draft", dry_run=0)

        users = await cdb.get_users_by_tag(tag) if tag else await cdb.get_all_users()
        if not users:
            await update.message.reply_text(
                "📭 Нет пользователей в базе.\n\n"
                "Пользователи появляются когда они пишут боту (/start).\n"
                "Можно добавить вручную: `/campaign adduser <chat_id>`",
                parse_mode="Markdown"
            )
            return

        await update.message.reply_text(
            f"{'🔍 DRY RUN — ' if dry else ''}🚀 *Запускаю кампанию «{name}»*\n\n"
            f"👥 Получателей: {len(users)}"
            + (f"\n🏷 Тег: {tag}" if tag else "") +
            "\n\nБуду отправлять ~1 сообщение в 1.5–4 секунды.\n"
            "Уведомлю по завершении. Для паузы: `/campaign pause`",
            parse_mode="Markdown"
        )
        asyncio.create_task(
            cs.send_campaign(context.bot, c["id"], update.effective_chat.id, tag)
        )

    # ── /campaign status ───────────────────────────────────────────────────
    elif subcmd == "status":
        active_id = cs.get_active_campaign_id()
        if not active_id:
            campaigns = await cdb.list_campaigns()
            running = [c for c in campaigns if c["status"] in ("running", "paused")]
            if not running:
                await update.message.reply_text("ℹ️ Нет активных кампаний.")
                return
        else:
            state = cs.get_state(active_id)
            c = await cdb.get_campaign_by_id(active_id)
            pct = int(state["sent"] / state["total"] * 100) if state["total"] else 0
            bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
            await update.message.reply_text(
                f"📊 *Кампания «{c['name']}»*\n\n"
                f"Статус: {STATUS_EMOJI.get(state['status'], '❓')} {state['status']}\n"
                f"Прогресс: `[{bar}]` {pct}%\n"
                f"👥 Всего: {state['total']}\n"
                f"✅ Отправлено: {state['sent']}\n"
                f"❌ Ошибок: {state['failed']}\n\n"
                f"`/campaign pause` — пауза\n"
                f"`/campaign cancel` — отмена",
                parse_mode="Markdown"
            )

    # ── /campaign pause ────────────────────────────────────────────────────
    elif subcmd == "pause":
        active_id = cs.get_active_campaign_id()
        if active_id and cs.pause_campaign(active_id):
            c = await cdb.get_campaign_by_id(active_id)
            await cdb.update_campaign_status(active_id, "paused")
            await update.message.reply_text(
                f"⏸ Кампания «{c['name']}» поставлена на паузу.\n"
                "`/campaign resume` — продолжить",
                parse_mode="Markdown"
            )
        else:
            await update.message.reply_text("ℹ️ Нет активной кампании для паузы.")

    # ── /campaign resume ───────────────────────────────────────────────────
    elif subcmd == "resume":
        for cid, state in cs._active.items():
            if state["status"] == "paused":
                cs.resume_campaign(cid)
                c = await cdb.get_campaign_by_id(cid)
                await cdb.update_campaign_status(cid, "running")
                await update.message.reply_text(f"▶️ Кампания «{c['name']}» возобновлена.")
                return
        await update.message.reply_text("ℹ️ Нет приостановленной кампании.")

    # ── /campaign cancel ───────────────────────────────────────────────────
    elif subcmd == "cancel":
        active_id = cs.get_active_campaign_id()
        for cid, state in cs._active.items():
            if state["status"] in ("running", "paused"):
                cs.cancel_campaign(cid)
                c = await cdb.get_campaign_by_id(cid)
                await update.message.reply_text(f"⏹ Кампания «{c['name']}» отменена.")
                return
        await update.message.reply_text("ℹ️ Нет активной кампании для отмены.")

    # ── /campaign delete <name> ────────────────────────────────────────────
    elif subcmd == "delete":
        if len(args) < 2:
            await update.message.reply_text("Использование: `/campaign delete имя`", parse_mode="Markdown")
            return
        name = args[1]
        if await cdb.delete_campaign(name):
            await update.message.reply_text(f"🗑 Кампания «{name}» удалена.")
        else:
            await update.message.reply_text(f"❌ Не удалось удалить (не найдена или запущена).")

    # ── /campaign adduser <chat_id> [tag] ──────────────────────────────────
    elif subcmd == "adduser":
        if len(args) < 2:
            await update.message.reply_text(
                "Использование: `/campaign adduser <chat_id> [тег]`", parse_mode="Markdown"
            )
            return
        try:
            uid = int(args[1])
        except ValueError:
            await update.message.reply_text("❌ chat_id должен быть числом.")
            return
        tag = args[2] if len(args) > 2 else None
        await cdb.upsert_user(uid)
        if tag:
            await cdb.tag_user(uid, tag)
        await update.message.reply_text(
            f"✅ Пользователь `{uid}` добавлен в базу кампаний."
            + (f"\n🏷 Тег: `{tag}`" if tag else ""),
            parse_mode="Markdown"
        )

    # ── /campaign users [tag] ──────────────────────────────────────────────
    elif subcmd == "users":
        tag = args[1] if len(args) > 1 else None
        users = await cdb.get_users_by_tag(tag) if tag else await cdb.get_all_users()
        if not users:
            await update.message.reply_text("📭 Нет пользователей в базе.")
            return
        lines = [f"👥 *Пользователи в базе:* {len(users)}\n"]
        for u in users[:30]:
            uname = f"@{u['username']}" if u.get("username") else u.get("first_name") or "—"
            tags_str = ", ".join(json.loads(u.get("tags") or "[]")) or "нет"
            lines.append(f"• `{u['chat_id']}` {uname} — теги: _{tags_str}_")
        if len(users) > 30:
            lines.append(f"\n_...и ещё {len(users) - 30}_")
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

    # ── /campaign schedule <name> <YYYY-MM-DD HH:MM> [tag] ────────────────
    elif subcmd == "schedule":
        # args: ["schedule", "name", "2026-06-16", "09:00"] or
        #       ["schedule", "name", "2026-06-16", "09:00", "tag"]
        if len(args) < 4:
            await update.message.reply_text(
                "Использование:\n"
                "`/campaign schedule имя ГГГГ-ММ-ДД ЧЧ:ММ [тег]`\n\n"
                "Примеры:\n"
                "`/campaign schedule promo 2026-06-16 09:00`\n"
                "`/campaign schedule promo 2026-06-16 09:00 vip`",
                parse_mode="Markdown"
            )
            return
        name = args[1]
        date_str = args[2]
        time_str = args[3]
        tag = args[4] if len(args) > 4 else None

        try:
            scheduled_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            if scheduled_dt <= datetime.now():
                await update.message.reply_text("❌ Дата в прошлом. Укажи будущее время.")
                return
        except ValueError:
            await update.message.reply_text(
                "❌ Неверный формат даты.\n"
                "Используй: `ГГГГ-ММ-ДД ЧЧ:ММ` — например `2026-06-16 09:00`",
                parse_mode="Markdown"
            )
            return

        c = await cdb.get_campaign(name)
        if not c:
            await update.message.reply_text(f"❌ Кампания «{name}» не найдена.")
            return
        if c["status"] == "running":
            await update.message.reply_text("❌ Кампания уже запущена.")
            return

        scheduled_iso = scheduled_dt.isoformat()
        await cdb.schedule_campaign(
            c["id"], scheduled_iso,
            tag=tag, notify_chat=update.effective_chat.id
        )

        users = await cdb.get_users_by_tag(tag) if tag else await cdb.get_all_users()
        await update.message.reply_text(
            f"📅 *Кампания «{name}» запланирована!*\n\n"
            f"🕐 Запуск: `{date_str} {time_str}`\n"
            f"👥 Получателей: {len(users)}"
            + (f"\n🏷 Тег: `{tag}`" if tag else "") +
            f"\n\nОтменить: `/campaign unschedule {name}`",
            parse_mode="Markdown"
        )

    # ── /campaign unschedule <name> ────────────────────────────────────────
    elif subcmd == "unschedule":
        if len(args) < 2:
            await update.message.reply_text(
                "Использование: `/campaign unschedule имя`", parse_mode="Markdown"
            )
            return
        name = args[1]
        if await cdb.unschedule_campaign(name):
            await update.message.reply_text(f"🗑 Расписание кампании «{name}» отменено. Статус → draft.")
        else:
            await update.message.reply_text(f"❌ Кампания «{name}» не найдена или не запланирована.")

    # ── /campaign scheduled ────────────────────────────────────────────────
    elif subcmd == "scheduled":
        scheduled = await cdb.get_scheduled_campaigns()
        if not scheduled:
            await update.message.reply_text("📭 Нет запланированных кампаний.")
            return
        lines = ["📅 *Запланированные кампании:*\n"]
        for c in scheduled:
            users = await cdb.get_all_users()
            tag = c.get("scheduled_tag")
            if tag:
                users = await cdb.get_users_by_tag(tag)
            lines.append(
                f"📅 *{c['name']}*\n"
                f"   🕐 `{c['scheduled_at'][:16]}`"
                + (f"  🏷 `{tag}`" if tag else "") +
                f"\n   👥 {len(users)} получателей"
            )
        lines.append("\n`/campaign unschedule имя` — отменить")
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

    # ── /campaign logs <name> ──────────────────────────────────────────────
    elif subcmd == "logs":
        if len(args) < 2:
            await update.message.reply_text("Использование: `/campaign logs имя`", parse_mode="Markdown")
            return
        c = await cdb.get_campaign(args[1])
        if not c:
            await update.message.reply_text(f"❌ Кампания «{args[1]}» не найдена.")
            return
        sends = await cdb.get_campaign_sends(c["id"], limit=25)
        if not sends:
            await update.message.reply_text("📭 Нет записей отправки.")
            return
        lines = [f"📋 *Лог кампании «{c['name']}»* (последние {len(sends)})\n"]
        for s in sends:
            icon = "✅" if s["status"].startswith("ok") else ("🔍" if s["status"] == "dry_run" else "❌")
            name = f"@{s['username']}" if s.get("username") else s.get("first_name") or str(s["chat_id"])
            err = f" — _{s['error']}_" if s.get("error") else ""
            lines.append(f"{icon} `{s['chat_id']}` {name}{err}")
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

    # ── help ───────────────────────────────────────────────────────────────
    else:
        await update.message.reply_text(
            "📣 *Система кампаний:*\n\n"
            "*Создание и запуск:*\n"
            "`/campaign create имя Текст` — создать\n"
            "`/campaign send имя [тег]` — запустить\n"
            "`/campaign dryrun имя` — тест без отправки\n\n"
            "*Расписание:*\n"
            "`/campaign schedule имя ГГГГ-ММ-ДД ЧЧ:ММ [тег]` — запланировать\n"
            "`/campaign scheduled` — все запланированные\n"
            "`/campaign unschedule имя` — отменить расписание\n\n"
            "*Управление:*\n"
            "`/campaign list` — все кампании\n"
            "`/campaign status` — прогресс текущей\n"
            "`/campaign pause` / `resume` / `cancel`\n"
            "`/campaign delete имя` — удалить\n\n"
            "*Получатели:*\n"
            "`/campaign users [тег]` — список\n"
            "`/campaign adduser <id> [тег]` — добавить вручную\n\n"
            "*Аналитика:*\n"
            "`/campaign logs имя` — лог отправки\n\n"
            "💡 В тексте работают: `{name}` `{username}`",
            parse_mode="Markdown"
        )


def main():
    if not TOKEN:
        logger.warning("⚠️  TELEGRAM_TOKEN не задан. Бот не запущен. Добавь токен в Secrets.")
        return

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("fuel", fuel_command))
    app.add_handler(CommandHandler("menu", menu))
    app.add_handler(CommandHandler("inn", inn_lookup))
    app.add_handler(CommandHandler("ogrn", inn_lookup))
    app.add_handler(CommandHandler("weather", weather))
    app.add_handler(CommandHandler("currency", currency))
    app.add_handler(CommandHandler("ip", ip_lookup))
    app.add_handler(CommandHandler("checko", checko_hint))
    app.add_handler(CommandHandler("ref", referral))
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(CommandHandler("getdata", get_data))
    app.add_handler(CommandHandler("listdata", list_data))
    app.add_handler(CommandHandler("deldata", delete_data))
    app.add_handler(CommandHandler("search", search_data))
    app.add_handler(CommandHandler("export", export_data))
    app.add_handler(CommandHandler("broadcast",  broadcast))
    app.add_handler(CommandHandler("workers",     workers_status))
    app.add_handler(CommandHandler("broadcasts",  broadcasts_status))
    app.add_handler(CommandHandler("group_send",  group_send_now))
    app.add_handler(CommandHandler("enrich",      enrich))
    app.add_handler(CommandHandler("campaign",   campaign))

    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    asyncio.get_event_loop().run_until_complete(cdb.init_db())

    # Reset campaigns stuck in 'running' from a previous crash
    async def _reset_stuck():
        import aiosqlite
        async with aiosqlite.connect("campaigns.db") as _db:
            await _db.execute("UPDATE campaigns SET status = 'draft' WHERE status = 'running'")
            await _db.commit()
        logger.info("Stuck campaigns reset to draft.")
    asyncio.get_event_loop().run_until_complete(_reset_stuck())

    async def post_init(application):
        cs.start_scheduler(application.bot)
        try:
            from broadcastscheduler import start_broadcast_scheduler
            start_broadcast_scheduler()
            logger.info("📡 Broadcast scheduler started")
        except Exception as _e:
            logger.warning(f"⚠️  Broadcast scheduler not started: {_e}")

        worker_count = int(os.getenv("WORKER_COUNT", "0"))
        if worker_count > 0:
            try:
                from utils.supervisor import WorkerSupervisor
                _supervisor = WorkerSupervisor(worker_count=worker_count)
                _supervisor.start()
                logger.info(f"🔧 Worker supervisor started — {worker_count} worker(s)")
            except Exception as _e:
                logger.warning(f"⚠️  Worker supervisor not started: {_e}")

    app.post_init = post_init

    async def error_handler(update: object, context) -> None:
        from telegram.error import Conflict, NetworkError, RetryAfter
        err = context.error
        if isinstance(err, Conflict):
            logger.warning("⚠️ Конфликт: другой экземпляр бота занял polling. Ждём 15с...")
            import asyncio; await asyncio.sleep(15)
        elif isinstance(err, RetryAfter):
            logger.warning(f"⚠️ Flood control: ждём {err.retry_after}с")
            import asyncio; await asyncio.sleep(err.retry_after)
        elif isinstance(err, NetworkError):
            logger.warning(f"⚠️ NetworkError: {err}")
        else:
            logger.error(f"❌ Ошибка обновления: {err}", exc_info=context.error)

    app.add_error_handler(error_handler)

    telethon_auth.run_in_thread()
    logger.info("🤖 Бот запускается...")
    app.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
    )


if __name__ == "__main__":
    main()
