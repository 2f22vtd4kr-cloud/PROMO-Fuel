import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import path from "path";

const BOT_DB_PATH = path.resolve(process.cwd(), "../../campaigns.db");

function getDb(readonly = true) {
  return new Database(BOT_DB_PATH, { readonly });
}

const router: IRouter = Router();

router.get("/users", (req, res) => {
  try {
    const db = getDb();
    const { tag } = req.query as { tag?: string };
    let rows;
    if (tag) {
      rows = db.prepare(
        "SELECT chat_id, username, first_name, first_seen, last_seen, tags FROM users WHERE tags LIKE ? ORDER BY last_seen DESC"
      ).all(`%${tag}%`);
    } else {
      rows = db.prepare(
        "SELECT chat_id, username, first_name, first_seen, last_seen, tags FROM users ORDER BY last_seen DESC LIMIT 500"
      ).all();
    }
    db.close();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.post("/users", (req, res) => {
  try {
    const db = getDb(false);
    const { chat_id, username, first_name, tags } = req.body as {
      chat_id: number; username?: string; first_name?: string; tags?: string;
    };
    if (!chat_id) return void res.status(400).json({ error: "chat_id required" });
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (chat_id, username, first_name, first_seen, last_seen, tags)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET tags = excluded.tags, last_seen = excluded.last_seen`
    ).run(chat_id, username ?? null, first_name ?? null, now, now, tags ?? "[]");
    const row = db.prepare("SELECT * FROM users WHERE chat_id = ?").get(chat_id);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/users/:chatId", (req, res) => {
  try {
    const db = getDb(false);
    const chatId = parseInt(req.params.chatId);
    const { tags, username, first_name } = req.body as { tags?: string; username?: string; first_name?: string };
    const fields: string[] = [];
    const values: unknown[] = [];
    if (tags !== undefined) { fields.push("tags = ?"); values.push(tags); }
    if (username !== undefined) { fields.push("username = ?"); values.push(username); }
    if (first_name !== undefined) { fields.push("first_name = ?"); values.push(first_name); }
    if (fields.length === 0) return void res.status(400).json({ error: "nothing to update" });
    values.push(chatId);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE chat_id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM users WHERE chat_id = ?").get(chatId);
    db.close();
    res.json(row ?? {});
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/users/:chatId", (req, res) => {
  try {
    const db = getDb(false);
    db.prepare("DELETE FROM users WHERE chat_id = ?").run(parseInt(req.params.chatId));
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/users/import", (req, res) => {
  try {
    const db = getDb(false);
    const { users } = req.body as { users: { chat_id: number; username?: string; first_name?: string; tags?: string }[] };
    if (!Array.isArray(users) || users.length === 0) {
      return void res.status(400).json({ error: "users array required" });
    }
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO users (chat_id, username, first_name, first_seen, last_seen, tags)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         username = COALESCE(excluded.username, username),
         first_name = COALESCE(excluded.first_name, first_name),
         last_seen = excluded.last_seen,
         tags = CASE WHEN excluded.tags != '[]' THEN excluded.tags ELSE tags END`
    );
    let imported = 0;
    let skipped = 0;
    const insert = db.transaction(() => {
      for (const u of users) {
        if (!u.chat_id) { skipped++; continue; }
        stmt.run(u.chat_id, u.username ?? null, u.first_name ?? null, now, now, u.tags ?? "[]");
        imported++;
      }
    });
    insert();
    db.close();
    res.json({ ok: true, imported, skipped, total: users.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
