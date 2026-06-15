import { Router, type IRouter, type Request, type Response } from "express";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "../../campaigns.db");

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

export { broadcastEvent };
export default router;
