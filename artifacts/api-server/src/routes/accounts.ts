import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

function getDb(readonly = true) {
  return new Database(DB_PATH, { readonly });
}

function ensureTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sender_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL DEFAULT '',
      phone TEXT UNIQUE NOT NULL,
      telegram_id INTEGER,
      username TEXT,
      session_file TEXT,
      proxy TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      sent_today INTEGER NOT NULL DEFAULT 0,
      sent_total INTEGER NOT NULL DEFAULT 0,
      failed_total INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_used_at TEXT,
      is_banned INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.close();
}

ensureTable();

const router: IRouter = Router();

router.get("/accounts", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM sender_accounts ORDER BY created_at DESC").all();
    db.close();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/accounts", (req, res) => {
  try {
    const db = getDb(false);
    const { phone, label, username, telegram_id, proxy, session_file } = req.body as {
      phone: string; label?: string; username?: string;
      telegram_id?: number; proxy?: string; session_file?: string;
    };
    if (!phone) return void res.status(400).json({ error: "phone required" });
    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO sender_accounts (phone, label, username, telegram_id, proxy, session_file, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET label=excluded.label, username=excluded.username,
         telegram_id=excluded.telegram_id, proxy=excluded.proxy, session_file=excluded.session_file`
    ).run(phone, label ?? "", username ?? null, telegram_id ?? null, proxy ?? null, session_file ?? null, now);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/accounts/:id", (req, res) => {
  try {
    const db = getDb(false);
    const id = parseInt(req.params.id);
    const allowed = ["label", "phone", "username", "telegram_id", "proxy", "session_file",
                     "status", "is_active", "is_banned", "last_error", "sent_today",
                     "sent_total", "failed_total", "last_used_at"];
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return void res.status(400).json({ error: "nothing to update" });
    values.push(id);
    db.prepare(`UPDATE sender_accounts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(id);
    db.close();
    if (!row) return void res.status(404).json({});
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/accounts/:id", (req, res) => {
  try {
    const db = getDb(false);
    db.prepare("DELETE FROM sender_accounts WHERE id = ?").run(parseInt(req.params.id));
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/accounts/:id/reset-daily", (req, res) => {
  try {
    const db = getDb(false);
    const id = parseInt(req.params.id);
    db.prepare("UPDATE sender_accounts SET sent_today = 0 WHERE id = ?").run(id);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(id);
    db.close();
    res.json(row ?? {});
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/accounts/:id/logs", (req, res) => {
  try {
    const db = getDb(true);
    const rows = db.prepare(
      `SELECT s.id, s.campaign_id, s.chat_id, s.status, s.sent_at, s.error,
              c.name as campaign_name,
              u.username, u.first_name
       FROM sends s
       LEFT JOIN campaigns c ON c.id = s.campaign_id
       LEFT JOIN users u ON u.chat_id = s.chat_id
       WHERE s.account_id = ?
       ORDER BY s.sent_at DESC LIMIT 100`
    ).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

export default router;
