import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

const router: IRouter = Router();

interface ImportUser {
  chat_id: number | string;
  username?: string;
  first_name?: string;
  tags?: string;
}

router.post("/upload/users", (req, res) => {
  try {
    const body = req.body as { users?: ImportUser[] };
    const users: ImportUser[] = Array.isArray(body.users) ? body.users : [];
    if (users.length === 0) return void res.status(400).json({ error: "users array required" });

    const db  = new Database(DB_PATH);
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (chat_id, username, first_name, first_seen, last_seen, tags)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        username   = COALESCE(excluded.username, username),
        first_name = COALESCE(excluded.first_name, first_name),
        last_seen  = excluded.last_seen,
        tags       = COALESCE(excluded.tags, tags)
    `);

    let imported = 0;
    let skipped  = 0;
    const insertMany = db.transaction((list: ImportUser[]) => {
      for (const u of list) {
        const cid = parseInt(String(u.chat_id));
        if (!cid || isNaN(cid)) { skipped++; continue; }
        stmt.run(
          cid,
          u.username  ?? null,
          u.first_name ?? null,
          now, now,
          u.tags ?? "[]"
        );
        imported++;
      }
    });
    insertMany(users);
    db.close();

    res.json({ ok: true, imported, skipped, total: users.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
