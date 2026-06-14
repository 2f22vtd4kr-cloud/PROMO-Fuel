import os
import re
import csv
import json
import time
import logging
import requests
import aiohttp
from io import StringIO
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    filters, ContextTypes, CallbackQueryHandler
)

TOKEN = os.getenv("TELEGRAM_TOKEN")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

DB_FILE = "bot_db.json"

def db_load():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def db_save(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

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
    args = context.args
    referrer = None
    if args and args[0].startswith("ref"):
        try:
            referrer = int(args[0][3:])
            ref_key = f"ref_{referrer}_count"
            db_set(ref_key, db_get(ref_key, 0) + 1)
        except ValueError:
            pass

    welcome = (
        "👋 Привет! Я *RUProbeHelper* — бот для работы с публичными открытыми данными.\n\n"
        "📋 *Команды:*\n"
        "/inn `[ИНН/ОГРН]` — поиск организации\n"
        "/weather `[город]` — погода\n"
        "/currency — курсы валют (ЦБ РФ)\n"
        "/ip `[адрес]` — инфо по IP\n"
        "/ref — твоя реферальная ссылка\n"
        "/stats — твоя статистика\n"
        "/checko — ресурсы для глубокого поиска\n"
        "/help — все команды\n\n"
        "📁 Отправь файл (.html/.csv/.json/.jsonl/.tsv) — сохраню данные в базу.\n\n"
        "✅ Только открытые источники. Никаких приватных баз."
    )
    if referrer:
        welcome += f"\n\n_(Ты пришёл по реферальной ссылке пользователя {referrer})_"

    await update.message.reply_text(welcome, parse_mode="Markdown")
    await send_promo(update)


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
        "/fuel — о проекте fuel-tickets-ru"
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")


async def fuel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_promo(update)


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


async def currency(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await _fetch_currency(update.message)
    await send_promo(update)


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


async def delete_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Использование: /deldata `ключ`", parse_mode="Markdown")
        return
    key = context.args[0].strip()
    if db_delete(key):
        await update.message.reply_text(f"🗑 Ключ `{key}` успешно удалён.", parse_mode="Markdown")
    else:
        await update.message.reply_text("❌ Ключ не найден.")


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


def main():
    if not TOKEN:
        raise ValueError("TELEGRAM_TOKEN не задан. Добавь его в Secrets.")

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

    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    logger.info("🤖 Бот запускается...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
