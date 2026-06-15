import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

const router: IRouter = Router();

router.get("/audience", (req, res) => {
  try {
    const db      = getDb();
    const page    = Math.max(1, parseInt((req.query.page  as string) || "1"));
    const limit   = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || "100")));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) ?? "").trim();
    const tag     = ((req.query.tag    as string) ?? "").trim();

    let where = "1=1";
    const params: unknown[] = [];

    if (tag) {
      where += " AND tags LIKE ?";
      params.push(`%${tag}%`);
    }
    if (search) {
      where += " AND (username LIKE ? OR first_name LIKE ? OR CAST(chat_id AS TEXT) LIKE ?)";
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const total = (db.prepare(`SELECT COUNT(*) as n FROM users WHERE ${where}`).get(...params) as { n: number }).n;
    const rows  = db.prepare(
      `SELECT chat_id, username, first_name, first_seen, last_seen, tags
       FROM users WHERE ${where}
       ORDER BY last_seen DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    db.close();
    res.json({ total, page, limit, rows });
  } catch (err) {
    res.json({ total: 0, page: 1, limit: 100, rows: [], error: String(err) });
  }
});

export default router;
