import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

function getDb(readonly = true) {
  return new Database(DB_PATH, { readonly });
}

function ensureTables() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_workers (
      worker_id      TEXT PRIMARY KEY,
      pid            INTEGER,
      status         TEXT NOT NULL DEFAULT 'idle',
      current_task   INTEGER,
      tasks_done     INTEGER NOT NULL DEFAULT 0,
      tasks_failed   INTEGER NOT NULL DEFAULT 0,
      started_at     TEXT NOT NULL DEFAULT (datetime('now')),
      last_heartbeat TEXT NOT NULL DEFAULT (datetime('now')),
      last_error     TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_type     TEXT    NOT NULL DEFAULT 'group_broadcast',
      campaign_id   INTEGER NOT NULL,
      payload       TEXT    NOT NULL DEFAULT '{}',
      status        TEXT    NOT NULL DEFAULT 'pending',
      priority      INTEGER NOT NULL DEFAULT 5,
      worker_id     TEXT,
      claimed_at    TEXT,
      started_at    TEXT,
      finished_at   TEXT,
      attempts      INTEGER NOT NULL DEFAULT 0,
      max_attempts  INTEGER NOT NULL DEFAULT 3,
      error         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      scheduled_at  TEXT
    );
  `);
  db.close();
}

ensureTables();

const router: IRouter = Router();

// ── Worker health ──────────────────────────────────────────────────────────

router.get("/workers", (_req, res) => {
  try {
    const db = getDb();
    const workers = db.prepare(
      "SELECT * FROM broadcast_workers ORDER BY started_at DESC"
    ).all() as Record<string, unknown>[];
    db.close();

    // Annotate with live/dead status based on heartbeat age
    const now = Date.now();
    const annotated = workers.map((w) => {
      const hb = w.last_heartbeat as string | null;
      const ageSeconds = hb
        ? Math.floor((now - new Date(hb).getTime()) / 1000)
        : 9999;
      return {
        ...w,
        heartbeat_age_seconds: ageSeconds,
        is_alive: ageSeconds < 90,
      };
    });
    res.json(annotated);
  } catch (err) {
    res.json([]);
  }
});

router.get("/workers/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM broadcast_workers WHERE worker_id = ?")
      .get(req.params.id) as Record<string, unknown> | undefined;
    db.close();
    if (!row) return void res.status(404).json({ error: "Worker not found" });
    const hb = row.last_heartbeat as string | null;
    const ageSeconds = hb ? Math.floor((Date.now() - new Date(hb).getTime()) / 1000) : 9999;
    res.json({ ...row, heartbeat_age_seconds: ageSeconds, is_alive: ageSeconds < 90 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Remove a stale worker record
router.delete("/workers/:id", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare("DELETE FROM broadcast_workers WHERE worker_id = ?").run(req.params.id);
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Task queue ─────────────────────────────────────────────────────────────

router.get("/tasks", (req, res) => {
  try {
    const db     = getDb();
    const status = req.query.status as string | undefined;
    const limit  = parseInt(String(req.query.limit ?? "100"));
    const rows   = status
      ? db.prepare("SELECT * FROM tasks WHERE status=? ORDER BY created_at DESC LIMIT ?").all(status, limit)
      : db.prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?").all(limit);
    db.close();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.get("/tasks/:id", (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(parseInt(req.params.id));
    db.close();
    if (!row) return void res.status(404).json({ error: "Task not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Re-queue a failed/dead task
router.post("/tasks/:id/retry", (req, res) => {
  try {
    const db  = new Database(DB_PATH);
    const id  = parseInt(req.params.id);
    const row = db.prepare("SELECT * FROM tasks WHERE id=?").get(id) as Record<string, unknown> | undefined;
    if (!row) { db.close(); return void res.status(404).json({ error: "Not found" }); }
    if (!["failed", "dead"].includes(String(row.status))) {
      db.close();
      return void res.status(400).json({ error: "Only failed/dead tasks can be retried" });
    }
    db.prepare(
      "UPDATE tasks SET status='pending', worker_id=NULL, claimed_at=NULL, error=NULL WHERE id=?"
    ).run(id);
    const updated = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
    db.close();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Cancel a pending/claimed task
router.post("/tasks/:id/cancel", (req, res) => {
  try {
    const db  = new Database(DB_PATH);
    const id  = parseInt(req.params.id);
    db.prepare(
      "UPDATE tasks SET status='cancelled', finished_at=? WHERE id=? AND status IN ('pending','claimed')"
    ).run(new Date().toISOString(), id);
    const row = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
    db.close();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Manually push a task for a campaign
router.post("/tasks", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const { campaign_id, payload, priority, scheduled_at } = req.body as {
      campaign_id: number;
      payload?: Record<string, unknown>;
      priority?: number;
      scheduled_at?: string;
    };
    if (!campaign_id) return void res.status(400).json({ error: "campaign_id required" });
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO tasks (task_type, campaign_id, payload, status, priority, scheduled_at, created_at)
      VALUES ('group_broadcast', ?, ?, 'pending', ?, ?, ?)
    `).run(
      campaign_id,
      JSON.stringify(payload ?? {}),
      priority ?? 5,
      scheduled_at ?? null,
      now
    );
    const row = db.prepare("SELECT * FROM tasks WHERE id=?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Bulk retry all failed/dead tasks
router.post("/tasks/bulk-retry", (_req, res) => {
  try {
    const db  = new Database(DB_PATH);
    const now = new Date().toISOString();
    const info = db.prepare(
      "UPDATE tasks SET status='pending', worker_id=NULL, claimed_at=NULL, error=NULL, scheduled_at=? WHERE status IN ('failed','dead')"
    ).run(now);
    db.close();
    res.json({ updated: info.changes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Bulk cancel all pending/claimed tasks
router.post("/tasks/bulk-cancel", (_req, res) => {
  try {
    const db  = new Database(DB_PATH);
    const now = new Date().toISOString();
    const info = db.prepare(
      "UPDATE tasks SET status='cancelled', finished_at=? WHERE status IN ('pending','claimed')"
    ).run(now);
    db.close();
    res.json({ updated: info.changes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Spawn a new worker subprocess ──────────────────────────────────────────

router.post("/workers/spawn", (req, res) => {
  try {
    const db = getDb();
    // Find highest existing worker number to auto-increment
    const rows = db.prepare(
      "SELECT worker_id FROM broadcast_workers ORDER BY started_at DESC"
    ).all() as { worker_id: string }[];
    db.close();

    const body = req.body as { worker_id?: string };
    let workerId = body.worker_id?.trim();

    if (!workerId) {
      // Auto-generate: find max worker-N number
      const nums = rows
        .map((r) => {
          const m = r.worker_id.match(/^worker-(\d+)$/);
          return m ? parseInt(m[1]) : 0;
        })
        .filter(Boolean);
      const next = nums.length ? Math.max(...nums) + 1 : 1;
      workerId = `worker-${next}`;
    }

    const { spawn } = require("child_process") as typeof import("child_process");
    const proc = spawn("python", ["worker.py", workerId], {
      detached: true,
      stdio:    "inherit",
      env:      process.env,
      cwd:      process.cwd(),
    });
    proc.unref();

    res.status(201).json({
      ok:        true,
      worker_id: workerId,
      pid:       proc.pid ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Summary stats ──────────────────────────────────────────────────────────

router.get("/workers-summary", (_req, res) => {
  try {
    const db     = getDb();
    const workers = db.prepare("SELECT * FROM broadcast_workers").all() as Record<string, unknown>[];
    const tasks   = db.prepare(`
      SELECT
        SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='claimed'  THEN 1 ELSE 0 END) as claimed,
        SUM(CASE WHEN status='done'     THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status='failed'   THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='dead'     THEN 1 ELSE 0 END) as dead
      FROM tasks
    `).get() as Record<string, number>;
    db.close();

    const now = Date.now();
    const alive = workers.filter((w) => {
      const hb = w.last_heartbeat as string | null;
      return hb && (now - new Date(hb).getTime()) / 1000 < 90;
    }).length;

    res.json({
      total_workers: workers.length,
      alive_workers: alive,
      dead_workers:  workers.length - alive,
      tasks_pending: tasks?.pending ?? 0,
      tasks_claimed: tasks?.claimed ?? 0,
      tasks_done:    tasks?.done    ?? 0,
      tasks_failed:  tasks?.failed  ?? 0,
      tasks_dead:    tasks?.dead    ?? 0,
    });
  } catch {
    res.json({});
  }
});

export default router;
