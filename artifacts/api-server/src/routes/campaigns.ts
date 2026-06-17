import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";
import { broadcastEvent } from "./sse";

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
    const { name, text_template, sender_account_id, send_delay_seconds, scheduled_at, scheduled_tag } = req.body as {
      name: string; text_template: string;
      sender_account_id?: number; send_delay_seconds?: number; scheduled_at?: string; scheduled_tag?: string;
    };
    if (!name || !text_template) return void res.status(400).json({ error: "name and text_template required" });
    const now = new Date().toISOString();
    for (const [col, def] of [["sender_account_id", "INTEGER"], ["send_delay_seconds", "INTEGER DEFAULT 15"]] as [string, string][]) {
      try { db.exec(`ALTER TABLE campaigns ADD COLUMN ${col} ${def}`); } catch {}
    }
    const info = db.prepare(
      `INSERT INTO campaigns (name, text_template, status, created_at, sent_count, failed_count, target_count, dry_run, sender_account_id, send_delay_seconds, scheduled_at, scheduled_tag)
       VALUES (?, ?, 'draft', ?, 0, 0, 0, 0, ?, ?, ?, ?)`
    ).run(name, text_template, now, sender_account_id ?? null, send_delay_seconds ?? 15, scheduled_at ?? null, scheduled_tag ?? null);
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
    const { name, text_template, status, notes, sender_account_id, send_delay_seconds } = req.body as {
      name?: string; text_template?: string; status?: string; notes?: string;
      sender_account_id?: number | null; send_delay_seconds?: number;
    };
    const fields: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (text_template !== undefined) { fields.push("text_template = ?"); values.push(text_template); }
    if (status !== undefined) { fields.push("status = ?"); values.push(status); }
    if (notes !== undefined) { fields.push("notes = ?"); values.push(notes); }
    if (sender_account_id !== undefined) { fields.push("sender_account_id = ?"); values.push(sender_account_id ?? null); }
    if (send_delay_seconds !== undefined) { fields.push("send_delay_seconds = ?"); values.push(send_delay_seconds); }
    if ((req.body as Record<string, unknown>).scheduled_tag !== undefined) { fields.push("scheduled_tag = ?"); values.push((req.body as Record<string, unknown>).scheduled_tag ?? null); }
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

router.post("/campaigns/:id/duplicate", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = new Database(DB_PATH);
    const src = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!src) { db.close(); return void res.status(404).json({ error: "Not found" }); }
    const now = new Date().toISOString();
    const result = db.prepare(
      `INSERT INTO campaigns (name, text_template, status, created_at, sent_count, failed_count, target_count, dry_run, sender_account_id, send_delay_seconds)
       VALUES (?, ?, 'draft', ?, 0, 0, 0, ?, ?, ?)`
    ).run(`Копия: ${src.name}`, src.text_template, now, src.dry_run ?? 0, src.sender_account_id ?? null, src.send_delay_seconds ?? 15);
    const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(result.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/campaigns/:id/reset", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = new Database(DB_PATH);
    const c = db.prepare("SELECT status FROM campaigns WHERE id = ?").get(id) as { status: string } | undefined;
    if (!c) { db.close(); return void res.status(404).json({ error: "Campaign not found" }); }
    if (c.status === "running") { db.close(); return void res.status(400).json({ error: "Cannot reset a running campaign" }); }
    db.prepare("UPDATE campaigns SET status = 'draft', sent_count = 0, failed_count = 0, target_count = 0 WHERE id = ?").run(id);
    db.prepare("DELETE FROM sends WHERE campaign_id = ?").run(id);
    db.close();
    res.json({ ok: true });
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
  if (action === "pause")   action = "paused";
  if (action === "resume")  action = "running";
  if (action === "start")   action = "running";
  if (action === "cancel")  action = "cancelled";
  const allowed = ["running", "paused", "cancelled", "draft", "scheduled"];
  if (!action || !allowed.includes(action)) return void res.status(400).json({ error: "invalid action" });
  try {
    const db = new Database(DB_PATH);
    const camp = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    if (!camp) return void res.status(404).json({ error: "not found" });
    const extra: Record<string, unknown> = {};
    if (action === "running" && !camp.started_at) extra.started_at = new Date().toISOString();
    // When starting a campaign, ensure notify_chat is set to ADMIN_TELEGRAM_ID
    if (action === "running" && !camp.notify_chat) {
      const adminId = parseInt(process.env["ADMIN_TELEGRAM_ID"] ?? "0");
      if (adminId) extra.notify_chat = adminId;
    }
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

// Dedicated action shortcuts (spec-compatible aliases for /action)
router.post("/campaigns/:id/start", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const camp = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    if (!camp) return void res.status(404).json({ error: "not found" });
    if (!["draft", "paused"].includes(camp.status)) {
      db.close();
      return void res.status(409).json({ error: `Cannot start a campaign with status '${camp.status}'` });
    }
    const now = new Date().toISOString();
    const extra: Record<string, unknown> = { status: "running" };
    if (!camp.started_at) extra.started_at = now;
    if (!camp.notify_chat) {
      const adminId = parseInt(process.env["ADMIN_TELEGRAM_ID"] ?? "0");
      if (adminId) extra.notify_chat = adminId;
    }
    const sets = Object.keys(extra).map(k => `${k} = ?`).join(", ");
    db.prepare(`UPDATE campaigns SET ${sets} WHERE id = ?`).run(...Object.values(extra), camp.id);
    const updated = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(camp.id);
    db.close();
    broadcastEvent("campaigns", [updated]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/campaigns/:id/pause", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ? AND status = 'running'").run(parseInt(req.params.id));
    const updated = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id));
    db.close();
    broadcastEvent("campaigns", [updated]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/campaigns/:id/cancel", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("UPDATE campaigns SET status = 'cancelled' WHERE id = ? AND status IN ('running','paused','draft')").run(parseInt(req.params.id));
    const updated = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id));
    db.close();
    broadcastEvent("campaigns", [updated]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// /sends alias for /logs (spec-compatible)
router.get("/campaigns/:id/sends", (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt((req.query.limit as string) ?? "200"), 1000);
    const rows = db.prepare(`
      SELECT s.id, s.campaign_id, s.chat_id, s.account_id, s.status, s.sent_at, s.error,
             u.username, u.first_name
      FROM sends s
      LEFT JOIN users u ON u.chat_id = s.chat_id
      WHERE s.campaign_id = ?
      ORDER BY s.sent_at DESC LIMIT ?
    `).all(parseInt(req.params.id), limit);
    db.close();
    res.json(rows);
  } catch (err) { res.json([]); }
});

router.post("/campaigns/:id/test-send", (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    db.close();
    if (!campaign) return void res.status(404).json({ error: "not found" });
    const { chat_id } = req.body as { chat_id?: number | string };
    if (!chat_id) return void res.status(400).json({ error: "chat_id required" });
    broadcastEvent("test_send_queued", { campaign_id: campaign.id, chat_id: String(chat_id) });
    res.json({ ok: true, message: "Test send event queued via SSE" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
