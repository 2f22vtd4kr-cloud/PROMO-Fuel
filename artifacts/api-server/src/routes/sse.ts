import { Router, type IRouter, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

const router: IRouter = Router();

const clients = new Set<Response>();

function broadcastEvent(event: string, data: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(msg); } catch { clients.delete(res); }
  }
}

let lastCampaignSnap      = "";
let lastAccountSnap       = "";
let lastWorkerSnap        = "";
let lastHeartbeatSnap     = "";
let lastTaskSnap          = "";

function pollDb() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // ── Campaigns ────────────────────────────────────────────────────────────
    const campaigns = db.prepare(
      "SELECT id, name, status, sent_count, failed_count, target_count, started_at FROM campaigns ORDER BY id"
    ).all();
    const campSnap = JSON.stringify(campaigns);
    if (campSnap !== lastCampaignSnap) {
      lastCampaignSnap = campSnap;
      broadcastEvent("campaigns", campaigns);
    }

    // ── Sender accounts (includes lock columns) ───────────────────────────────
    try {
      const accounts = db.prepare(
        `SELECT id, label, phone, username, telegram_id, status,
                sent_today, sent_total, failed_total, is_banned, is_active,
                flood_wait_until, daily_limit,
                locked_by, locked_at, proxy_index, broadcasting
         FROM sender_accounts ORDER BY id`
      ).all();
      const accSnap = JSON.stringify(accounts);
      if (accSnap !== lastAccountSnap) {
        lastAccountSnap = accSnap;
        broadcastEvent("accounts", accounts);
      }
    } catch {}

    // ── Broadcast workers (process-level registry) ────────────────────────────
    try {
      const now = Date.now();
      const workers = (db.prepare(
        "SELECT * FROM broadcast_workers ORDER BY started_at DESC"
      ).all() as Record<string, unknown>[]).map(w => {
        const lh = w["last_heartbeat"] as string | null;
        const age = lh ? Math.floor((now - new Date(lh).getTime()) / 1000) : 9999;
        return { ...w, age_seconds: age, is_alive: age < 60 };
      });
      const wSnap = JSON.stringify(workers);
      if (wSnap !== lastWorkerSnap) {
        lastWorkerSnap = wSnap;
        broadcastEvent("workers", workers);
      }
    } catch {}

    // ── Worker heartbeats (dedicated table, lighter) ──────────────────────────
    try {
      const now = Date.now();
      const heartbeats = (db.prepare(
        "SELECT * FROM worker_heartbeats ORDER BY last_seen DESC"
      ).all() as Record<string, unknown>[]).map(h => {
        const ls = h["last_seen"] as string | null;
        const age = ls ? Math.floor((now - new Date(ls).getTime()) / 1000) : 9999;
        return { ...h, age_seconds: age, is_alive: age < 60 };
      });
      const hbSnap = JSON.stringify(heartbeats);
      if (hbSnap !== lastHeartbeatSnap) {
        lastHeartbeatSnap = hbSnap;
        broadcastEvent("worker_heartbeats", heartbeats);
      }
    } catch {}

    // ── Task queue ────────────────────────────────────────────────────────────
    try {
      const tasks = db.prepare(
        `SELECT id, campaign_id, status, worker_id, attempts, max_attempts,
                scheduled_at, claimed_at, error
         FROM tasks ORDER BY id DESC LIMIT 100`
      ).all();
      const tSnap = JSON.stringify(tasks);
      if (tSnap !== lastTaskSnap) {
        lastTaskSnap = tSnap;
        broadcastEvent("tasks", tasks);
      }
    } catch {}

    db.close();
  } catch {}
}

setInterval(pollDb, 2000);

router.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  clients.add(res);
  res.write(`: connected\n\n`);

  try {
    const db = new Database(DB_PATH, { readonly: true });
    const campaigns = db.prepare("SELECT id, status, sent_count, failed_count FROM campaigns ORDER BY id").all();
    db.close();
    res.write(`event: campaigns\ndata: ${JSON.stringify(campaigns)}\n\n`);
  } catch {}

  const keepAlive = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { clearInterval(keepAlive); clients.delete(res); }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
});

// Per-campaign SSE progress stream
router.get("/events/campaigns/:id/progress", (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"]), 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendUpdate = () => {
    try {
      const db = new Database(DB_PATH, { readonly: true });
      const row = db.prepare(
        "SELECT id, status, sent_count, failed_count, target_count FROM campaigns WHERE id = ?"
      ).get(id) as { id: number; status: string; sent_count: number; failed_count: number; target_count: number } | undefined;
      db.close();

      if (!row) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Campaign not found" })}\n\n`);
        clearInterval(timer);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify(row)}\n\n`);

      if (row.status === "done" || row.status === "cancelled") {
        clearInterval(timer);
        res.write(`event: done\ndata: ${JSON.stringify(row)}\n\n`);
        res.end();
      }
    } catch { /* db not ready yet */ }
  };

  sendUpdate();
  const timer = setInterval(sendUpdate, 2000);

  const keepAlive = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { clearInterval(keepAlive); }
  }, 15000);

  req.on("close", () => {
    clearInterval(timer);
    clearInterval(keepAlive);
  });
});

export { broadcastEvent };
export default router;
