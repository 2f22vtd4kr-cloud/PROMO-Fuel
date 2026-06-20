import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

function getDb(readonly = true) {
  return new Database(DB_PATH, { readonly });
}

function ensureTables() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_campaigns (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      text_template     TEXT NOT NULL,
      status            TEXT DEFAULT 'draft',
      sender_account_id INTEGER,
      selected_groups   TEXT DEFAULT '[]',
      interval_seconds  INTEGER DEFAULT 86400,
      next_send_at      TEXT,
      last_sent_at      TEXT,
      sent_count        INTEGER DEFAULT 0,
      failed_count      INTEGER DEFAULT 0,
      notes             TEXT DEFAULT '',
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS group_sends (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      group_id    TEXT    NOT NULL,
      group_title TEXT,
      account_id  INTEGER,
      status      TEXT    NOT NULL,
      error       TEXT,
      sent_at     TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS account_groups (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id   INTEGER NOT NULL,
      group_id     TEXT    NOT NULL,
      group_title  TEXT,
      group_type   TEXT    DEFAULT 'group',
      member_count INTEGER DEFAULT 0,
      username     TEXT,
      is_active    INTEGER DEFAULT 1,
      refreshed_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(account_id, group_id)
    );
  `);
  db.close();
}

ensureTables();

const router: IRouter = Router();

// ── Groups for an account ──────────────────────────────────────────────────

router.get("/accounts/:id/groups", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT * FROM account_groups WHERE account_id = ? AND is_active = 1 ORDER BY group_title ASC"
    ).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

router.post("/accounts/:id/groups/refresh", async (req, res) => {
  const accountId = parseInt(req.params.id);
  try {
    const resp = await fetch(`http://127.0.0.1:8082/groups/${accountId}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return void res.status(resp.status).json({ error: txt });
    }
    const data = await resp.json() as Record<string, unknown>;
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: "Group refresh service unavailable. Make sure the account is authorized." });
  }
});

// ── Group campaigns CRUD ───────────────────────────────────────────────────

router.get("/group-campaigns", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM group_campaigns ORDER BY created_at DESC").all();
    db.close();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.get("/group-campaigns/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(parseInt(req.params.id));
    db.close();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: String(err) });
  }
});

router.post("/group-campaigns", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const { name, text_template, sender_account_id, selected_groups, interval_seconds, notes } = req.body as {
      name: string; text_template: string;
      sender_account_id?: number; selected_groups?: string;
      interval_seconds?: number; notes?: string;
    };
    if (!name || !text_template) return void res.status(400).json({ error: "name and text_template required" });
    const info = db.prepare(`
      INSERT INTO group_campaigns (name, text_template, status, sender_account_id, selected_groups, interval_seconds, notes)
      VALUES (?, ?, 'draft', ?, ?, ?, ?)
    `).run(
      name, text_template,
      sender_account_id ?? null,
      selected_groups ?? "[]",
      interval_seconds ?? 86400,
      notes ?? ""
    );
    const row = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/group-campaigns/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;
    const allowed = ["name", "text_template", "sender_account_id", "selected_groups", "interval_seconds", "notes", "status"];
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    }
    if (fields.length === 0) return void res.status(400).json({ error: "nothing to update" });
    fields.push("updated_at = ?"); values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE group_campaigns SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(id);
    db.close();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/group-campaigns/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("DELETE FROM group_campaigns WHERE id = ?").run(parseInt(req.params.id));
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/group-campaigns/:id/action", (req, res) => {
  const { action } = req.body as { action: string };
  const statusMap: Record<string, string> = {
    start: "running", resume: "running", pause: "paused", stop: "draft", cancel: "cancelled",
  };
  const newStatus = statusMap[action] ?? action;
  const allowed = ["running", "paused", "draft", "cancelled"];
  if (!allowed.includes(newStatus)) return void res.status(400).json({ error: "invalid action" });
  try {
    const db = new Database(DB_PATH);
    const camp = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    if (!camp) { db.close(); return void res.status(404).json({ error: "not found" }); }
    const now = new Date().toISOString();
    const extra: Record<string, unknown> = { status: newStatus, updated_at: now };
    if (newStatus === "running" && !camp.next_send_at) {
      extra.next_send_at = now; // trigger immediately on first start
    }
    const sets = Object.keys(extra).map(k => `${k} = ?`).join(", ");
    db.prepare(`UPDATE group_campaigns SET ${sets} WHERE id = ?`).run(...Object.values(extra), camp.id);
    const updated = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(camp.id);
    db.close();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/group-campaigns/:id/duplicate", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const src = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(parseInt(req.params.id)) as any;
    if (!src) { db.close(); return void res.status(404).json({ error: "not found" }); }
    const info = db.prepare(`
      INSERT INTO group_campaigns (name, text_template, status, sender_account_id, selected_groups, interval_seconds, notes)
      VALUES (?, ?, 'draft', ?, ?, ?, ?)
    `).run(`${src.name} (копия)`, src.text_template, src.sender_account_id ?? null, src.selected_groups ?? "[]", src.interval_seconds ?? 86400, src.notes ?? "");
    const row = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/group-campaigns/:id/logs", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM group_sends WHERE campaign_id = ? ORDER BY sent_at DESC LIMIT 200
    `).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

export default router;
