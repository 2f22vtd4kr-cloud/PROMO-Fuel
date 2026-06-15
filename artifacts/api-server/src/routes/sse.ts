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

let lastCampaignSnap = "";
let lastAccountSnap = "";

function pollDb() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const campaigns = db.prepare("SELECT id, name, status, sent_count, failed_count, target_count FROM campaigns ORDER BY id").all();
    const campSnap = JSON.stringify(campaigns);
    if (campSnap !== lastCampaignSnap) {
      lastCampaignSnap = campSnap;
      broadcastEvent("campaigns", campaigns);
    }

    try {
      const accounts = db.prepare("SELECT id, label, phone, username, telegram_id, status, sent_today, sent_total, failed_total, is_banned, is_active FROM sender_accounts ORDER BY id").all();
      const accSnap = JSON.stringify(accounts);
      if (accSnap !== lastAccountSnap) {
        lastAccountSnap = accSnap;
        broadcastEvent("accounts", accounts);
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
