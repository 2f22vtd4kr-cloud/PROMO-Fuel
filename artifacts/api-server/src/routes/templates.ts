import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

function ensureTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      icon       TEXT DEFAULT '📝',
      text       TEXT NOT NULL,
      tags       TEXT DEFAULT '[]',
      use_count  INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Seed built-in templates if empty
  const count = (db.prepare("SELECT COUNT(*) as n FROM message_templates").get() as any).n;
  if (count === 0) {
    const ins = db.prepare("INSERT INTO message_templates (name, icon, text, tags) VALUES (?, ?, ?, ?)");
    const seeds = [
      ["Акция", "🎉", "🎉 Привет, {first_name}!\n\nСпециально для тебя — скидка 20% на всё до конца недели.\n\nПромокод: {promo}\n\n👉 Не упусти шанс!", '["promo","sale"]'],
      ["Приглашение", "📅", "👋 Привет, {first_name}!\n\nПриглашаем тебя на наш закрытый вебинар.\n📅 Суббота, 12:00 МСК\n\nТвой код: {ref_code}\n\nБудем ждать!", '["event","invite"]'],
      ["Напоминание", "⏰", "⏰ {first_name}, не забудь!\n\nТвоя подписка истекает через 3 дня. Продли сейчас со скидкой 15%.\n\n👇 Нажми чтобы продлить", '["reminder","subscription"]'],
      ["Ретаргет", "🔁", "👋 {first_name}!\n\nТы смотрел наш продукт, но ещё не приобрёл. Сегодня последний день акции — скидка 30%!\n\n🔗 Забрать скидку", '["retarget"]'],
      ["Анонс", "🚀", "🚀 Большие новости, {first_name}!\n\nМы запускаем нечто особенное совсем скоро. Ты в числе первых, кто об этом узнаёт.\n\n📣 Следи за обновлениями!", '["announcement"]'],
      ["Поздравление", "🎂", "🎂 С днём рождения, {first_name}!\n\nМы рады быть частью твоего особенного дня. В честь праздника — подарок: промокод {promo} на 25% скидку.\n\n🎁 Используй до конца месяца!", '["birthday","promo"]'],
    ];
    for (const [name, icon, text, tags] of seeds) ins.run(name, icon, text, tags);
  }
  db.close();
}

ensureTable();

const router: IRouter = Router();

router.get("/templates", (_req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT * FROM message_templates ORDER BY use_count DESC, created_at DESC").all();
    db.close();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/templates", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const { name, icon, text, tags } = req.body as { name: string; icon?: string; text: string; tags?: string[] };
    if (!name || !text) return void res.status(400).json({ error: "name and text required" });
    const now = new Date().toISOString();
    const info = db.prepare(
      "INSERT INTO message_templates (name, icon, text, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(name, icon ?? "📝", text, JSON.stringify(tags ?? []), now, now);
    const row = db.prepare("SELECT * FROM message_templates WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/templates/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const id = parseInt(req.params.id);
    const { name, icon, text, tags } = req.body as { name?: string; icon?: string; text?: string; tags?: string[] };
    const fields: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];
    if (name) { fields.push("name = ?"); values.push(name); }
    if (icon) { fields.push("icon = ?"); values.push(icon); }
    if (text) { fields.push("text = ?"); values.push(text); }
    if (tags) { fields.push("tags = ?"); values.push(JSON.stringify(tags)); }
    values.push(id);
    db.prepare(`UPDATE message_templates SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM message_templates WHERE id = ?").get(id);
    db.close();
    if (!row) return void res.status(404).json({});
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/templates/:id/use", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("UPDATE message_templates SET use_count = use_count + 1 WHERE id = ?").run(parseInt(req.params.id));
    const row = db.prepare("SELECT * FROM message_templates WHERE id = ?").get(parseInt(req.params.id));
    db.close();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/templates/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("DELETE FROM message_templates WHERE id = ?").run(parseInt(req.params.id));
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
