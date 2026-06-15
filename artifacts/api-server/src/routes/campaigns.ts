import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import path from "path";
import { broadcastEvent } from "./sse";

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
    const { name, text_template, status, notes } = req.body as { name?: string; text_template?: string; status?: string; notes?: string };
    const fields: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (text_template !== undefined) { fields.push("text_template = ?"); values.push(text_template); }
    if (status !== undefined) { fields.push("status = ?"); values.push(status); }
    if (notes !== undefined) { fields.push("notes = ?"); values.push(notes); }
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
      `SELECT s.id, s.campaign_id, s.chat_id, s.account_id, s.status, s.sent_at, s.error,
              u.username, u.first_name
       FROM sends s
       LEFT JOIN users u ON u.chat_id = s.chat_id
       WHERE s.campaign_id = ?
       ORDER BY s.sent_at DESC LIMIT 500`
    ).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

router.get("/campaigns/:id/account-breakdown", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      `SELECT
         sa.id, sa.label, sa.phone, sa.username,
         COUNT(*) as total,
         SUM(CASE WHEN s.status = 'ok' THEN 1 ELSE 0 END) as ok,
         SUM(CASE WHEN s.status != 'ok' THEN 1 ELSE 0 END) as errors
       FROM sends s
       JOIN sender_accounts sa ON sa.id = s.account_id
       WHERE s.campaign_id = ?
       GROUP BY s.account_id
       ORDER BY total DESC`
    ).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

router.post("/accounts/reset-all-daily", (_req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("UPDATE sender_accounts SET sent_today = 0").run();
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/campaigns/:id/action", (req, res) => {
  let { action } = req.body as { action: string };
  // accept friendly aliases from older clients
  if (action === "pause")   action = "paused";
  if (action === "resume")  action = "running";
  if (action === "start")   action = "running";
  if (action === "cancel")  action = "cancelled";
  const allowed = ["running", "paused", "cancelled", "draft", "scheduled"];
  if (!action || !allowed.includes(action)) return void res.status(400).json({ error: "invalid action" });
  try {
    const db = new Database(DB_PATH);
    const camp = db.prepare("SELECT id, status FROM campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    if (!camp) return void res.status(404).json({ error: "not found" });
    const extra: Record<string, unknown> = {};
    if (action === "running" && !camp.started_at) extra.started_at = new Date().toISOString();
    const sets = ["status = ?", ...Object.keys(extra).map(k => `${k} = ?`)].join(", ");
    db.prepare(`UPDATE campaigns SET ${sets} WHERE id = ?`).run(action, ...Object.values(extra), camp.id);
    const updated = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(camp.id);
    db.close();
    broadcastEvent("campaigns", [updated]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/campaigns/:id/duplicate", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const src = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    if (!src) return void res.status(404).json({ error: "not found" });
    const now = new Date().toISOString();
    const newName = `${src.name} (копия)`;
    const info = db.prepare(
      `INSERT INTO campaigns (name, text_template, status, created_at, sent_count, failed_count, target_count, dry_run)
       VALUES (?, ?, 'draft', ?, 0, 0, 0, 0)`
    ).run(newName, src.text_template, now);
    const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/stats/daily", (_req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const today = new Date().toISOString().slice(0, 10);
    const accounts = db.prepare(`
      SELECT id, label, phone, username, sent_today, sent_total, failed_total, status, is_active, is_banned
      FROM sender_accounts ORDER BY sent_today DESC
    `).all();
    const sends = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as ok,
             SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END) as errors
      FROM sends WHERE sent_at >= ?
    `).get(today + "T00:00:00") as any;
    db.close();
    res.json({ accounts, today_sends: sends });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/campaigns/:id/test-send", (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    db.close();
    if (!campaign) return void res.status(404).json({ error: "not found" });
    const { chat_id } = req.body as { chat_id?: number | string };
    if (!chat_id) return void res.status(400).json({ error: "chat_id required" });
    broadcastEvent({ type: "test_send_queued", campaign_id: campaign.id, chat_id: String(chat_id) });
    res.json({ ok: true, message: "Test send event queued via SSE" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
