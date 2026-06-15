#!/usr/bin/env node
/**
 * Seed script — populates campaigns.db with realistic demo data.
 * Run: node scripts/seed.js
 * Safe to re-run: uses INSERT OR IGNORE / INSERT OR REPLACE.
 */

import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../campaigns.db");
const db = new Database(DB_PATH);

// ── helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hoursOffset, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── ensure tables exist ───────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    chat_id   INTEGER PRIMARY KEY,
    username  TEXT,
    first_name TEXT,
    tags      TEXT DEFAULT '[]',
    first_seen TEXT,
    last_seen  TEXT
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    text_template TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'draft',
    created_at    TEXT NOT NULL,
    started_at    TEXT,
    sent_count    INTEGER NOT NULL DEFAULT 0,
    failed_count  INTEGER NOT NULL DEFAULT 0,
    target_count  INTEGER NOT NULL DEFAULT 0,
    dry_run       INTEGER NOT NULL DEFAULT 0,
    notes         TEXT
  );
  CREATE TABLE IF NOT EXISTS sender_accounts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    label        TEXT NOT NULL DEFAULT '',
    phone        TEXT UNIQUE NOT NULL,
    telegram_id  INTEGER,
    username     TEXT,
    session_file TEXT,
    proxy        TEXT,
    status       TEXT NOT NULL DEFAULT 'idle',
    sent_today   INTEGER NOT NULL DEFAULT 0,
    sent_total   INTEGER NOT NULL DEFAULT 0,
    failed_total INTEGER NOT NULL DEFAULT 0,
    last_error   TEXT,
    last_used_at TEXT,
    is_banned    INTEGER NOT NULL DEFAULT 0,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sends (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    chat_id     INTEGER NOT NULL,
    account_id  INTEGER,
    status      TEXT NOT NULL DEFAULT 'ok',
    sent_at     TEXT NOT NULL,
    error       TEXT
  );
`);

// ── sender accounts ───────────────────────────────────────────────────────────
console.log("Seeding sender_accounts...");
const accounts = [
  { label:"PROMO_FUEL_01", phone:"+79161234567", username:"promofuel_bot1", status:"idle",    sent_today:187, sent_total:12450, failed_total:34,  is_banned:0, is_active:1 },
  { label:"PROMO_FUEL_02", phone:"+79213456789", username:"promofuel_bot2", status:"idle",    sent_today:214, sent_total:9820,  failed_total:22,  is_banned:0, is_active:1 },
  { label:"PROMO_FUEL_03", phone:"+79034567890", username:"promofuel_bot3", status:"sending", sent_today:98,  sent_total:6710,  failed_total:55,  is_banned:0, is_active:1 },
  { label:"PROMO_FUEL_04", phone:"+79255678901", username:"promofuel_bot4", status:"banned",  sent_today:300, sent_total:3000,  failed_total:290, is_banned:1, is_active:0 },
  { label:"PROMO_FUEL_05", phone:"+79686789012", username:"promofuel_bot5", status:"idle",    sent_today:45,  sent_total:1890,  failed_total:8,   is_banned:0, is_active:1 },
];
const insertAccount = db.prepare(`
  INSERT OR IGNORE INTO sender_accounts
    (label, phone, username, status, sent_today, sent_total, failed_total, is_banned, is_active, created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);
for (const a of accounts) {
  insertAccount.run(a.label, a.phone, a.username, a.status, a.sent_today, a.sent_total, a.failed_total, a.is_banned, a.is_active, daysAgo(rand(20,60)));
}
const accountIds = db.prepare("SELECT id FROM sender_accounts ORDER BY id").all().map(r => r.id);
console.log(`  → ${accountIds.length} accounts`);

// ── users ─────────────────────────────────────────────────────────────────────
console.log("Seeding users...");
const FIRST_NAMES = ["Алексей","Наталья","Дмитрий","Ирина","Сергей","Ольга","Михаил","Елена","Андрей","Татьяна","Кирилл","Юлия","Роман","Светлана","Максим","Анна","Антон","Мария","Павел","Вера","Игорь","Людмила","Денис","Оксана","Евгений"];
const USERNAMES = ["aleksey_m","natasha_k","dmitr_v","irina_spb","sergey_pr","olga_nn","misha_auto","lena_fuel","andrei_t","tatyana_v","kirill_x","julia_k","roman_av","sveta_p","max_drive","anna_r","anton_m","mariya_f","pavel_s","vera_l","igor_n","lyudmila_t","denis_b","oksana_v","evgeny_m"];
const TAG_SETS = [
  '["vip","active"]','["premium"]','["active"]','["new"]','["inactive"]',
  '["vip"]','["active","new"]','["premium","active"]','["inactive"]','["active"]',
];
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (chat_id, username, first_name, tags, first_seen, last_seen)
  VALUES (?,?,?,?,?,?)
`);
const chatIds = [];
for (let i = 0; i < 80; i++) {
  const chatId = 100000000 + i * 1337 + rand(1, 100);
  const nameIdx = i % FIRST_NAMES.length;
  const ago = rand(0, 60);
  insertUser.run(
    chatId,
    USERNAMES[nameIdx] + (i > 24 ? String(i) : ""),
    FIRST_NAMES[nameIdx],
    TAG_SETS[i % TAG_SETS.length],
    daysAgo(ago + 1),
    daysAgo(rand(0, ago))
  );
  chatIds.push(chatId);
}
console.log(`  → ${chatIds.length} users`);

// ── campaigns ─────────────────────────────────────────────────────────────────
console.log("Seeding campaigns...");
// Check if campaigns already seeded
const existing = db.prepare("SELECT COUNT(*) as n FROM campaigns").get().n;
if (existing > 0) {
  console.log(`  → skipped (${existing} already exist)`);
} else {
  const insertCamp = db.prepare(`
    INSERT INTO campaigns (name, text_template, status, created_at, started_at, sent_count, failed_count, target_count)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const campaigns = [
    { name:"АИ-95 скидка 3₽/л — июнь", template:"🔥 Скидка 3₽/л на АИ-95 сегодня! Покажите это сообщение на кассе. Действует до 23:59.", status:"done",      daysAgo:6, sentPct:1.0,  target:1200 },
    { name:"Дизель выгода — выходные",  template:"⛽ Дизель по специальной цене в эти выходные! Скидка 2₽/л только для постоянных клиентов.", status:"done",      daysAgo:4, sentPct:0.95, target:800  },
    { name:"АИ-98 премиум клиентам",    template:"✨ Только для VIP клиентов: АИ-98 по цене АИ-95 сегодня с 09:00 до 18:00.", status:"done",      daysAgo:2, sentPct:1.0,  target:300  },
    { name:"Кэшбэк 5% — акция недели", template:"💰 Кэшбэк 5% на любое топливо всю неделю! Подключите карту лояльности и экономьте.", status:"running",   daysAgo:1, sentPct:0.6,  target:950  },
    { name:"Автомойка бесплатно",       template:"🚗 Бесплатная автомойка при заправке от 30л! Акция действует сегодня и завтра.", status:"running",   daysAgo:0, sentPct:0.3,  target:750  },
    { name:"АИ-92 скидка выходные",     template:"🎉 Скидка 4₽/л на АИ-92 в эти выходные! Торопитесь — мест ограниченно.", status:"scheduled", daysAgo:0, sentPct:0,    target:1100 },
    { name:"Новый сезон — новые цены",  template:"🌟 Летние цены на все виды топлива! Проверьте наши обновлённые тарифы.", status:"draft",     daysAgo:0, sentPct:0,    target:0    },
  ];
  for (const c of campaigns) {
    const sent   = Math.round(c.target * c.sentPct);
    const failed = Math.round(sent * 0.04);
    const createdAt  = daysAgo(c.daysAgo + 1, 9);
    const startedAt  = c.sentPct > 0 ? daysAgo(c.daysAgo, 10) : null;
    insertCamp.run(c.name, c.template, c.status, createdAt, startedAt, sent, failed, c.target);
  }
  console.log(`  → ${campaigns.length} campaigns`);
}

// ── sends ─────────────────────────────────────────────────────────────────────
console.log("Seeding sends...");
const existingSends = db.prepare("SELECT COUNT(*) as n FROM sends").get().n;
if (existingSends > 100) {
  console.log(`  → skipped (${existingSends} already exist)`);
} else {
  const camps = db.prepare("SELECT id, sent_count, failed_count, started_at FROM campaigns WHERE sent_count > 0").all();
  const insertSend = db.prepare(`
    INSERT INTO sends (campaign_id, chat_id, account_id, status, sent_at) VALUES (?,?,?,?,?)
  `);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insertSend.run(r.campaign_id, r.chat_id, r.account_id, r.status, r.sent_at);
  });

  const rows = [];
  for (const c of camps) {
    const total = Math.min(c.sent_count, 200); // cap at 200 per campaign for perf
    const failRate = c.failed_count / Math.max(c.sent_count, 1);
    const baseDate = c.started_at ? new Date(c.started_at) : new Date();
    for (let i = 0; i < total; i++) {
      const chatId = chatIds[i % chatIds.length];
      const accountId = accountIds[i % accountIds.length];
      const status = Math.random() < failRate ? "error" : "ok";
      const sentAt = new Date(baseDate.getTime() + i * 4500).toISOString();
      rows.push({ campaign_id: c.id, chat_id: chatId, account_id: accountId, status, sent_at: sentAt });
    }
  }
  insertMany(rows);
  console.log(`  → ${rows.length} send records`);
}

db.close();
console.log("✅ Seed complete.");
