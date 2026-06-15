import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "../../campaigns.db");

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

const router: IRouter = Router();

router.get("/campaigns", (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query as { status?: string };
    let rows;
    if (status) {
      rows = db.prepare("SELECT * FROM campaigns WHERE status = ? ORDER BY created_at DESC").all(status);
    } else {
      rows = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all();
    }
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

router.post("/campaigns", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const { name, text_template } = req.body as { name: string; text_template: string };
    if (!name || !text_template) return void res.status(400).json({ error: "name and text_template required" });
    const now = new Date().toISOString();
    const info = db.prepare(
      "INSERT INTO campaigns (name, text_template, status, created_at, sent_count, failed_count, target_count, dry_run) VALUES (?, ?, 'draft', ?, 0, 0, 0, 0)"
    ).run(name, text_template, now);
    const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/campaigns/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id));
    db.close();
    if (!row) return void res.status(404).json({});
    res.json(row);
  } catch (err) {
    res.status(404).json({});
  }
});

router.put("/campaigns/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const id = parseInt(req.params.id);
    const { name, text_template, status } = req.body as { name?: string; text_template?: string; status?: string };
    const fields: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (text_template !== undefined) { fields.push("text_template = ?"); values.push(text_template); }
    if (status !== undefined) { fields.push("status = ?"); values.push(status); }
    if (fields.length === 0) return void res.status(400).json({ error: "nothing to update" });
    values.push(id);
    db.prepare(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id);
    db.close();
    if (!row) return void res.status(404).json({});
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/campaigns/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("DELETE FROM campaigns WHERE id = ?").run(parseInt(req.params.id));
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/campaigns/:id/logs", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      `SELECT s.id, s.campaign_id, s.chat_id, s.status, s.sent_at, s.error,
              u.username, u.first_name
       FROM sends s
       LEFT JOIN users u ON u.chat_id = s.chat_id
       WHERE s.campaign_id = ?
       ORDER BY s.sent_at DESC LIMIT 50`
    ).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

export default router;
