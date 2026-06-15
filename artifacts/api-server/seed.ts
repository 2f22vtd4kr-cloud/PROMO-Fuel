import Database from "better-sqlite3";
import { resolve } from "path";

const DB_PATH = resolve(process.cwd(), "../../campaigns.db");
const db = new Database(DB_PATH);

function daysAgo(n: number, hoursOffset = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hoursOffset, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    chat_id    INTEGER PRIMARY KEY,
    username   TEXT,
    first_name TEXT,
    tags       TEXT DEFAULT '[]',
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
const accData = [
  { label:"PROMO_FUEL_01", phone:"+79161234567", username:"promofuel_bot1", status:"idle",    sent_today:187, sent_total:12450, failed_total:34,  is_banned:0, is_active:1 },
  { label:"PROMO_FUEL_02", phone:"+79213456789", username:"promofuel_bot2", status:"idle",    sent_today:214, sent_total:9820,  failed_total:22,  is_banned:0, is_active:1 },
  { label:"PROMO_FUEL_03", phone:"+79034567890", username:"promofuel_bot3", status:"sending", sent_today:98,  sent_total:6710,  failed_total:55,  is_banned:0, is_active:1 },
  { label:"PROMO_FUEL_04", phone:"+79255678901", username:"promofuel_bot4", status:"banned",  sent_today:300, sent_total:3000,  failed_total:290, is_banned:1, is_active:0 },
  { label:"PROMO_FUEL_05", phone:"+79686789012", username:"promofuel_bot5", status:"idle",    sent_today:45,  sent_total:1890,  failed_total:8,   is_banned:0, is_active:1 },
];
const insAcc = db.prepare(
  `INSERT OR IGNORE INTO sender_accounts (label,phone,username,status,sent_today,sent_total,failed_total,is_banned,is_active,created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?)`
);
for (const a of accData)
  insAcc.run(a.label,a.phone,a.username,a.status,a.sent_today,a.sent_total,a.failed_total,a.is_banned,a.is_active,daysAgo(rand(20,50)));
const accountIds = (db.prepare("SELECT id FROM sender_accounts ORDER BY id").all() as {id:number}[]).map(r => r.id);
console.log(`  → ${accountIds.length} accounts`);

// ── users ─────────────────────────────────────────────────────────────────────
console.log("Seeding users...");
const NAMES   = ["Алексей","Наталья","Дмитрий","Ирина","Сергей","Ольга","Михаил","Елена","Андрей","Татьяна","Кирилл","Юлия","Роман","Светлана","Максим","Анна","Антон","Мария","Павел","Вера","Игорь","Людмила","Денис","Оксана","Евгений"];
const HANDLES = ["aleksey_m","natasha_k","dmitr_v","irina_spb","sergey_pr","olga_nn","misha_auto","lena_fuel","andrei_t","tatyana_v","kirill_x","julia_k","roman_av","sveta_p","max_drive","anna_r","anton_m","mariya_f","pavel_s","vera_l","igor_n","lyudmila_t","denis_b","oksana_v","evgeny_m"];
const TAGSETS = ['["vip","active"]','["premium"]','["active"]','["new"]','["inactive"]','["vip"]','["active","new"]','["premium","active"]','["inactive"]','["active"]'];
const insUser = db.prepare(`INSERT OR IGNORE INTO users (chat_id,username,first_name,tags,first_seen,last_seen) VALUES (?,?,?,?,?,?)`);
const chatIds: number[] = [];
for (let i = 0; i < 80; i++) {
  const id = 100000000 + i * 1337 + rand(1, 50);
  insUser.run(id, HANDLES[i % HANDLES.length] + (i > 24 ? i : ""), NAMES[i % NAMES.length], TAGSETS[i % TAGSETS.length], daysAgo(rand(5,60)), daysAgo(rand(0,4)));
  chatIds.push(id);
}
console.log(`  → ${chatIds.length} users`);

// ── campaigns ─────────────────────────────────────────────────────────────────
console.log("Seeding campaigns...");
const existC = (db.prepare("SELECT COUNT(*) as n FROM campaigns").get() as {n:number}).n;
const campIds: {id:number; sent_count:number; failed_count:number; started_at:string|null}[] = [];
if (existC > 0) {
  console.log(`  → skipped (${existC} already exist)`);
  const rows = db.prepare("SELECT id, sent_count, failed_count, started_at FROM campaigns WHERE sent_count > 0").all() as typeof campIds;
  campIds.push(...rows);
} else {
  const insCamp = db.prepare(
    `INSERT INTO campaigns (name,text_template,status,created_at,started_at,sent_count,failed_count,target_count)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const camps = [
    { name:"АИ-95 скидка 3₽/л — июнь", tmpl:"🔥 Скидка 3₽/л на АИ-95 сегодня! Покажите это сообщение на кассе. Действует до 23:59.", status:"done",      ago:6, pct:1.0,  target:1200 },
    { name:"Дизель выгода — выходные",  tmpl:"⛽ Дизель по специальной цене в эти выходные! Скидка 2₽/л только для постоянных клиентов.", status:"done",      ago:4, pct:0.95, target:800  },
    { name:"АИ-98 только для VIP",      tmpl:"✨ Только для VIP: АИ-98 по цене АИ-95 сегодня с 09:00 до 18:00.",  status:"done",      ago:2, pct:1.0,  target:300  },
    { name:"Кэшбэк 5% — акция недели", tmpl:"💰 Кэшбэк 5% на любое топливо всю неделю! Подключите карту лояльности.", status:"running",   ago:1, pct:0.62, target:950  },
    { name:"Автомойка бесплатно",       tmpl:"🚗 Бесплатная мойка при заправке от 30л! Акция сегодня и завтра.",   status:"running",   ago:0, pct:0.31, target:750  },
    { name:"АИ-92 скидка — выходные",   tmpl:"🎉 Скидка 4₽/л на АИ-92 в эти выходные!",                           status:"scheduled", ago:0, pct:0,    target:1100 },
    { name:"Новый сезон — новые цены",  tmpl:"🌟 Летние цены на все виды топлива! Проверьте обновлённые тарифы.", status:"draft",     ago:0, pct:0,    target:0    },
  ];
  for (const c of camps) {
    const sent = Math.round(c.target * c.pct);
    const info = insCamp.run(c.name, c.tmpl, c.status, daysAgo(c.ago + 1, 9), c.pct > 0 ? daysAgo(c.ago, 10) : null, sent, Math.round(sent * 0.04), c.target);
    if (sent > 0) campIds.push({ id: Number(info.lastInsertRowid), sent_count: sent, failed_count: Math.round(sent*0.04), started_at: daysAgo(c.ago, 10) });
  }
  console.log(`  → ${camps.length} campaigns`);
}

// ── sends ─────────────────────────────────────────────────────────────────────
console.log("Seeding sends...");
const existS = (db.prepare("SELECT COUNT(*) as n FROM sends").get() as {n:number}).n;
if (existS > 100) {
  console.log(`  → skipped (${existS} already exist)`);
} else {
  const insSend = db.prepare(`INSERT INTO sends (campaign_id,chat_id,account_id,status,sent_at) VALUES (?,?,?,?,?)`);
  const batch = db.transaction((rows: {c:number;u:number;a:number;s:string;t:string}[]) => {
    for (const r of rows) insSend.run(r.c, r.u, r.a, r.s, r.t);
  });
  const rows: {c:number;u:number;a:number;s:string;t:string}[] = [];
  for (const camp of campIds) {
    const total = Math.min(camp.sent_count, 250);
    const failRate = camp.failed_count / Math.max(camp.sent_count, 1);
    const base = camp.started_at ? new Date(camp.started_at).getTime() : Date.now();
    for (let i = 0; i < total; i++)
      rows.push({ c: camp.id, u: chatIds[i % chatIds.length], a: accountIds[i % accountIds.length], s: Math.random() < failRate ? "error" : "ok", t: new Date(base + i * 4500).toISOString() });
  }
  batch(rows);
  console.log(`  → ${rows.length} send records`);
}

db.close();
console.log("✅ Seed complete.");
