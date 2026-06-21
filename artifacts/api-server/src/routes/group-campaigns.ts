import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";
import { AUTH_SERVER_URL } from "../lib/auth-server-url";

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
      min_delay_seconds REAL DEFAULT 2.5,
      max_delay_seconds REAL DEFAULT 6.0,
      daily_limit       INTEGER DEFAULT 0,
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
    const resp = await fetch(`${AUTH_SERVER_URL}/groups/${accountId}/refresh`, {
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
    const { name, text_template, sender_account_id, selected_groups, interval_seconds, notes,
            media_url, media_type, inline_buttons, pin_message,
            min_delay_seconds, max_delay_seconds, daily_limit } = req.body as {
      name: string; text_template: string;
      sender_account_id?: number; selected_groups?: string;
      interval_seconds?: number; notes?: string;
      media_url?: string; media_type?: string; inline_buttons?: string; pin_message?: number;
      min_delay_seconds?: number; max_delay_seconds?: number; daily_limit?: number;
    };
    if (!name || !text_template) return void res.status(400).json({ error: "name and text_template required" });
    const info = db.prepare(`
      INSERT INTO group_campaigns (name, text_template, status, sender_account_id, selected_groups,
                                   interval_seconds, notes, media_url, media_type, inline_buttons, pin_message,
                                   min_delay_seconds, max_delay_seconds, daily_limit)
      VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, text_template,
      sender_account_id ?? null,
      selected_groups ?? "[]",
      interval_seconds ?? 86400,
      notes ?? "",
      media_url ?? null,
      media_type ?? null,
      inline_buttons ?? "[]",
      pin_message ?? 0,
      min_delay_seconds ?? 2.5,
      max_delay_seconds ?? 6.0,
      daily_limit ?? 0
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
    const allowed = ["name", "text_template", "sender_account_id", "selected_groups", "interval_seconds",
                     "notes", "status", "media_url", "media_type", "inline_buttons", "pin_message",
                     "next_send_at", "min_delay_seconds", "max_delay_seconds", "daily_limit"];
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
      INSERT INTO group_campaigns (name, text_template, status, sender_account_id, selected_groups,
                                   interval_seconds, notes, media_url, media_type, inline_buttons, pin_message,
                                   min_delay_seconds, max_delay_seconds, daily_limit)
      VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `${src.name} (копия)`, src.text_template,
      src.sender_account_id ?? null,
      src.selected_groups ?? "[]",
      src.interval_seconds ?? 86400,
      src.notes ?? "",
      src.media_url ?? null,
      src.media_type ?? null,
      src.inline_buttons ?? "[]",
      src.pin_message ?? 0,
      src.min_delay_seconds ?? 2.5,
      src.max_delay_seconds ?? 6.0,
      src.daily_limit ?? 0
    );
    const row = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/group-campaigns/:id/send-now", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const id = parseInt(req.params.id);
    const camp = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(id) as any;
    if (!camp) { db.close(); return void res.status(404).json({ error: "not found" }); }

    // If draft, start it first
    if (camp.status === "draft" || camp.status === "cancelled") {
      const now = new Date().toISOString();
      db.prepare("UPDATE group_campaigns SET status='running', next_send_at=?, updated_at=? WHERE id=?")
        .run(now, now, id);
    }

    // Push a task directly into the queue
    const info = db.prepare(`
      INSERT INTO tasks (task_type, campaign_id, payload, status, priority, max_attempts, created_at, scheduled_at)
      VALUES ('group_broadcast', ?, '{}', 'pending', 1, 3, datetime('now'), datetime('now'))
    `).run(id);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json({ ok: true, task });
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

router.get("/group-campaigns/:id/stats", (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const byGroup = db.prepare(`
      SELECT group_id, group_title,
             COUNT(*) AS total,
             SUM(CASE WHEN status='ok' OR status='sent' THEN 1 ELSE 0 END) AS sent,
             SUM(CASE WHEN status='failed' OR status='error' THEN 1 ELSE 0 END) AS failed,
             MAX(sent_at) AS last_sent_at
      FROM group_sends WHERE campaign_id = ?
      GROUP BY group_id ORDER BY sent DESC LIMIT 100
    `).all(id);
    const daily = db.prepare(`
      SELECT substr(sent_at,1,10) AS day,
             SUM(CASE WHEN status='ok' OR status='sent' THEN 1 ELSE 0 END) AS sent,
             SUM(CASE WHEN status='failed' OR status='error' THEN 1 ELSE 0 END) AS failed
      FROM group_sends WHERE campaign_id = ?
      GROUP BY day ORDER BY day DESC LIMIT 30
    `).all(id);
    db.close();
    res.json({ by_group: byGroup, daily });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/group-campaigns/retry-failed-sends", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const { window_hours = 24 } = req.body as { window_hours?: number };
    const since = new Date(Date.now() - window_hours * 3600 * 1000).toISOString();

    // Find campaigns with failed sends in the time window
    const failedRows = db.prepare(`
      SELECT campaign_id, group_id, group_title
      FROM group_sends
      WHERE (status = 'failed' OR status = 'error')
        AND sent_at >= ?
      GROUP BY campaign_id, group_id
      ORDER BY campaign_id
    `).all(since) as { campaign_id: number; group_id: string; group_title: string | null }[];

    if (failedRows.length === 0) {
      db.close();
      return void res.json({ ok: true, tasks_created: 0, campaigns: 0 });
    }

    // Group by campaign
    const byCampaign = new Map<number, string[]>();
    for (const r of failedRows) {
      if (!byCampaign.has(r.campaign_id)) byCampaign.set(r.campaign_id, []);
      byCampaign.get(r.campaign_id)!.push(r.group_id);
    }

    // Create a priority task per campaign with the specific failed group_ids
    const tasks: unknown[] = [];
    for (const [campaignId, groupIds] of byCampaign) {
      const camp = db.prepare("SELECT id, status FROM group_campaigns WHERE id = ?").get(campaignId) as { id: number; status: string } | undefined;
      if (!camp) continue;
      const info = db.prepare(`
        INSERT INTO tasks (task_type, campaign_id, payload, status, priority, max_attempts, created_at, scheduled_at)
        VALUES ('group_broadcast', ?, ?, 'pending', 2, 3, datetime('now'), datetime('now'))
      `).run(campaignId, JSON.stringify({ retry: true, group_ids: groupIds }));
      tasks.push({ task_id: info.lastInsertRowid, campaign_id: campaignId, group_count: groupIds.length });
    }
    db.close();
    res.status(201).json({ ok: true, tasks_created: tasks.length, campaigns: byCampaign.size, tasks });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/group-campaigns/bulk-action", (req, res) => {
  try {
    const { action, ids } = req.body as { action: string; ids?: number[] };
    const statusMap: Record<string, string> = { pause: "paused", resume: "running", stop: "cancelled" };
    const newStatus = statusMap[action];
    if (!newStatus) return void res.status(400).json({ error: "invalid action" });

    const db = new Database(DB_PATH);
    const now = new Date().toISOString();
    let updated = 0;
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      updated = db.prepare(
        `UPDATE group_campaigns SET status = ?, updated_at = ? WHERE id IN (${placeholders})`
      ).run(newStatus, now, ...ids).changes;
    } else {
      // all running/paused campaigns
      const filter = action === "pause" ? "running" : "paused";
      updated = db.prepare(
        `UPDATE group_campaigns SET status = ?, updated_at = ? WHERE status = ?`
      ).run(newStatus, now, filter).changes;
    }
    const all = db.prepare("SELECT * FROM group_campaigns ORDER BY created_at DESC").all();
    db.close();
    res.json({ ok: true, updated, campaigns: all });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/group-campaigns/:id/test-send", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const id = parseInt(req.params.id);
    const { group_id } = req.body as { group_id?: string };
    if (!group_id) { db.close(); return void res.status(400).json({ error: "group_id required" }); }

    const camp = db.prepare("SELECT * FROM group_campaigns WHERE id = ?").get(id) as any;
    if (!camp) { db.close(); return void res.status(404).json({ error: "not found" }); }

    const info = db.prepare(`
      INSERT INTO tasks (task_type, campaign_id, payload, status, priority, max_attempts, created_at, scheduled_at)
      VALUES ('group_broadcast', ?, ?, 'pending', 0, 1, datetime('now'), datetime('now'))
    `).run(id, JSON.stringify({ test: true, group_ids: [group_id] }));

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json({ ok: true, task });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
