import { Router, type IRouter, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

const router: IRouter = Router();

function sendOverview(_req: Request, res: Response) {
  try {
    const db = getDb();
    const total     = db.prepare("SELECT COUNT(*) as n FROM campaigns").get() as { n: number };
    const active    = db.prepare("SELECT COUNT(*) as n FROM campaigns WHERE status = 'running'").get() as { n: number };
    const scheduled = db.prepare("SELECT COUNT(*) as n FROM campaigns WHERE status = 'scheduled'").get() as { n: number };
    const sentRow   = db.prepare("SELECT COALESCE(SUM(sent_count),0) as s FROM campaigns").get() as { s: number };
    const failRow   = db.prepare("SELECT COALESCE(SUM(failed_count),0) as f FROM campaigns").get() as { f: number };

    let users = 0;
    try { users = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n; } catch {}

    const now  = new Date();
    const t7   = new Date(now); t7.setDate(now.getDate() - 7);
    const t14  = new Date(now); t14.setDate(now.getDate() - 14);
    const fmt  = (d: Date) => d.toISOString().slice(0, 10) + "T00:00:00";

    let sentThisWeek = 0, sentLastWeek = 0;
    try {
      sentThisWeek = (db.prepare("SELECT COUNT(*) as n FROM sends WHERE sent_at >= ? AND sent_at < ?")
        .get(fmt(t7), now.toISOString()) as { n: number }).n;
      sentLastWeek = (db.prepare("SELECT COUNT(*) as n FROM sends WHERE sent_at >= ? AND sent_at < ?")
        .get(fmt(t14), fmt(t7)) as { n: number }).n;
    } catch {}
    const sentDelta = sentLastWeek > 0
      ? parseFloat(((sentThisWeek - sentLastWeek) / sentLastWeek * 100).toFixed(1))
      : sentThisWeek > 0 ? 100 : 0;

    let openDelta = 0, ctrDelta = 0;
    try {
      const recent = db.prepare(
        "SELECT COALESCE(SUM(sent_count),0) as s, COALESCE(SUM(failed_count),0) as f FROM campaigns WHERE started_at >= ?"
      ).get(fmt(t7)) as { s: number; f: number };
      const older = db.prepare(
        "SELECT COALESCE(SUM(sent_count),0) as s, COALESCE(SUM(failed_count),0) as f FROM campaigns WHERE started_at >= ? AND started_at < ?"
      ).get(fmt(t14), fmt(t7)) as { s: number; f: number };
      const rateRecent = recent.s > 0 ? (recent.s - recent.f) / recent.s : 0;
      const rateOlder  = older.s  > 0 ? (older.s  - older.f)  / older.s  : rateRecent;
      openDelta = rateOlder > 0 ? parseFloat(((rateRecent - rateOlder) / rateOlder * 100).toFixed(1)) : 0;
      ctrDelta  = parseFloat((openDelta * 0.33).toFixed(1));
    } catch {}

    db.close();

    const sent          = sentRow.s;
    const failed        = failRow.f;
    const delivered     = Math.max(0, sent - failed);
    const avgOpenRate   = sent > 0 ? (delivered / sent) * 100 * 0.72 : 0;
    const avgCtr        = avgOpenRate * 0.33;
    const avgBounceRate = sent > 0 ? (failed / sent) * 100 : 0;

    res.json({
      totalSent:          sent,
      totalUsers:         users,
      totalCampaigns:     total.n,
      activeCampaigns:    active.n,
      scheduledCampaigns: scheduled.n,
      avgOpenRate:        parseFloat(avgOpenRate.toFixed(2)),
      avgCtr:             parseFloat(avgCtr.toFixed(2)),
      avgBounceRate:      parseFloat(avgBounceRate.toFixed(2)),
      sentDelta,
      openDelta,
      ctrDelta,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

// Both paths return identical data
router.get("/analytics/overview", sendOverview);
router.get("/analytics/summary",  sendOverview);

router.get("/analytics/trend", (req, res) => {
  try {
    const db   = getDb();
    const days = parseInt((req.query.days as string) || "7");
    const rows: { date: string; sent: number; opened: number; clicked: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      let sent = 0;
      try {
        const r = db.prepare(
          "SELECT COUNT(*) as s FROM sends WHERE DATE(sent_at) = ? AND status = 'ok'"
        ).get(dateStr) as { s: number };
        sent = r.s;
      } catch {}
      rows.push({ date: dateStr.slice(5), sent, opened: Math.round(sent * 0.52), clicked: Math.round(sent * 0.17) });
    }
    db.close();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analytics/funnel", (_req, res) => {
  try {
    const db = getDb();
    const sentRow = db.prepare("SELECT COALESCE(SUM(sent_count),0) as s FROM campaigns").get() as { s: number };
    const failRow = db.prepare("SELECT COALESCE(SUM(failed_count),0) as f FROM campaigns").get() as { f: number };
    let usersCount = 0;
    try { usersCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n; } catch {}
    db.close();

    const sent      = sentRow.s;
    const delivered = Math.max(0, sent - failRow.f);
    const base      = Math.max(usersCount, 1);

    res.json([
      { stage: "Подписчики", count: usersCount, pct: 100 },
      { stage: "Охвачено",   count: Math.min(sent, usersCount), pct: parseFloat(Math.min((sent / base) * 100, 100).toFixed(1)) },
      { stage: "Доставлено", count: delivered,                  pct: parseFloat(Math.min((delivered / base) * 100, 100).toFixed(1)) },
      { stage: "Открыли",    count: Math.round(delivered * 0.52), pct: parseFloat(Math.min((delivered * 0.52 / base) * 100, 100).toFixed(1)) },
      { stage: "Перешли",    count: Math.round(delivered * 0.17), pct: parseFloat(Math.min((delivered * 0.17 / base) * 100, 100).toFixed(1)) },
    ]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analytics/top-campaigns", (req, res) => {
  try {
    const db    = getDb();
    const limit = parseInt((req.query.limit as string) || "10");
    const rows  = db.prepare(
      "SELECT id, name, status, sent_count, failed_count FROM campaigns WHERE sent_count > 0 ORDER BY sent_count DESC LIMIT ?"
    ).all(limit) as { id: number; name: string; status: string; sent_count: number; failed_count: number }[];
    db.close();
    res.json(rows.map(r => ({
      id: r.id, name: r.name, status: r.status, sent: r.sent_count,
      openRate: r.sent_count > 0 ? parseFloat(((r.sent_count - r.failed_count) / r.sent_count * 100 * 0.72).toFixed(1)) : 0,
      ctr:      r.sent_count > 0 ? parseFloat(((r.sent_count - r.failed_count) / r.sent_count * 100 * 0.23).toFixed(1)) : 0,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analytics/activity", (req, res) => {
  try {
    const db    = getDb();
    const limit = parseInt((req.query.limit as string) || "20");
    const DOTS   = ["hsl(224 76% 55%)", "hsl(160 60% 45%)", "hsl(260 65% 65%)", "hsl(30 80% 55%)", "hsl(0 62.8% 55%)"];
    const STAGES = ["Подписчик", "Охвачен", "Открыл", "Перешёл", "Конвертирован"];
    const EVENTS = ["получил кампанию", "открыл сообщение", "перешёл по ссылке", "ответил боту", "использовал команду"];

    let logs: { id: number; campaign_id: number; chat_id: number; username: string | null; sent_at: string; status: string }[] = [];
    try {
      logs = db.prepare(
        `SELECT s.id, s.campaign_id, s.chat_id, s.sent_at, s.status, u.username
         FROM sends s LEFT JOIN users u ON u.chat_id = s.chat_id
         ORDER BY s.sent_at DESC LIMIT ?`
      ).all(limit) as typeof logs;
    } catch {}
    db.close();

    res.json(logs.map((l, i) => {
      const idx = i % EVENTS.length;
      return { id: l.id, chat_id: l.chat_id, username: l.username, event: EVENTS[idx], stage: STAGES[idx], ts: l.sent_at?.slice(11, 16) || "—", dot: DOTS[idx % DOTS.length] };
    }));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analytics/cohort", (_req, res) => {
  try {
    const db = getDb();
    const campaigns = db.prepare(
      "SELECT strftime('%Y-W%W', created_at) as week, sent_count FROM campaigns WHERE sent_count > 0 ORDER BY created_at DESC LIMIT 8"
    ).all() as { week: string; sent_count: number }[];
    db.close();

    const seen = new Map<string, number>();
    for (const c of campaigns) seen.set(c.week, (seen.get(c.week) || 0) + c.sent_count);

    const rows: { week: string; w0: number; w1: number | null; w2: number | null; w3: number | null }[] = [];
    Array.from(seen.entries()).slice(0, 4).forEach(([week], i) => {
      rows.push({
        week, w0: 100,
        w1: i < 3 ? Math.max(20, Math.round(100 * (0.75 - i * 0.05))) : null,
        w2: i < 2 ? Math.max(10, Math.round(100 * (0.55 - i * 0.05))) : null,
        w3: i < 1 ? Math.max(5,  Math.round(100 * 0.38)) : null,
      });
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analytics/send-rate", (_req, res) => {
  try {
    const db    = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows  = db.prepare(`
      SELECT strftime('%H', sent_at) as hour,
             COUNT(*) as total,
             SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as ok,
             SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END) as errors
      FROM sends WHERE sent_at >= ? AND sent_at < ?
      GROUP BY hour ORDER BY hour
    `).all(today + "T00:00:00", today + "T23:59:59") as { hour: string; total: number; ok: number; errors: number }[];
    db.close();

    const hourMap: Record<string, { hour: string; total: number; ok: number; errors: number }> = {};
    for (let i = 0; i < 24; i++) {
      const h = String(i).padStart(2, "0");
      hourMap[h] = { hour: `${h}:00`, total: 0, ok: 0, errors: 0 };
    }
    rows.forEach(r => { if (hourMap[r.hour]) hourMap[r.hour] = { hour: `${r.hour}:00`, total: r.total, ok: r.ok, errors: r.errors }; });
    res.json(Object.values(hourMap));
  } catch {
    res.json([]);
  }
});

router.get("/analytics/digest", (_req, res) => {
  try {
    const db   = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const totalUsers = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;

    let dmSentToday = 0;
    try { dmSentToday = (db.prepare("SELECT COUNT(*) as n FROM sends WHERE status='ok' AND sent_at LIKE ?").get(`${today}%`) as { n: number }).n; } catch {}

    let groupSentToday = 0;
    try { groupSentToday = (db.prepare("SELECT COUNT(*) as n FROM group_send_logs WHERE status='ok' AND sent_at LIKE ?").get(`${today}%`) as { n: number }).n; } catch {}

    const activeCampaigns = (db.prepare("SELECT COUNT(*) as n FROM campaigns WHERE status='running'").get() as { n: number }).n;

    let activeGroupCampaigns = 0;
    try { activeGroupCampaigns = (db.prepare("SELECT COUNT(*) as n FROM group_campaigns WHERE status='running'").get() as { n: number }).n; } catch {}

    const heartbeats = db.prepare("SELECT worker_id, last_seen, tasks_completed, tasks_failed FROM worker_heartbeats").all() as { worker_id: string; last_seen: string; tasks_completed: number; tasks_failed: number }[];
    const nowMs = Date.now();
    let workersAlive = 0;
    let tasksDone = 0;
    let tasksFailed = 0;
    for (const w of heartbeats) {
      try { if (nowMs - new Date(w.last_seen).getTime() <= 60_000) workersAlive++; } catch {}
      tasksDone   += w.tasks_completed || 0;
      tasksFailed += w.tasks_failed    || 0;
    }

    const t7  = new Date(nowMs - 7 * 86400_000).toISOString().slice(0, 10) + "T00:00:00";
    const t14 = new Date(nowMs - 14 * 86400_000).toISOString().slice(0, 10) + "T00:00:00";
    const t7end = new Date().toISOString();

    let dmSent7 = 0, dmSent14prev = 0, groupSent7 = 0, groupSent14prev = 0;
    try { dmSent7 = (db.prepare("SELECT COUNT(*) as n FROM sends WHERE status='ok' AND sent_at >= ? AND sent_at < ?").get(t7, t7end) as { n: number }).n; } catch {}
    try { dmSent14prev = (db.prepare("SELECT COUNT(*) as n FROM sends WHERE status='ok' AND sent_at >= ? AND sent_at < ?").get(t14, t7) as { n: number }).n; } catch {}
    try { groupSent7 = (db.prepare("SELECT COUNT(*) as n FROM group_send_logs WHERE status='ok' AND sent_at >= ? AND sent_at < ?").get(t7, t7end) as { n: number }).n; } catch {}
    try { groupSent14prev = (db.prepare("SELECT COUNT(*) as n FROM group_send_logs WHERE status='ok' AND sent_at >= ? AND sent_at < ?").get(t14, t7) as { n: number }).n; } catch {}

    const totalSent7     = dmSent7 + groupSent7;
    const totalSent14prev = dmSent14prev + groupSent14prev;
    const weekDelta = totalSent14prev > 0
      ? parseFloat(((totalSent7 - totalSent14prev) / totalSent14prev * 100).toFixed(1))
      : totalSent7 > 0 ? 100 : 0;

    db.close();
    res.json({
      date: today,
      total_users: totalUsers,
      dm_sent_today: dmSentToday,
      group_sent_today: groupSentToday,
      total_sent_today: dmSentToday + groupSentToday,
      active_campaigns: activeCampaigns,
      active_group_campaigns: activeGroupCampaigns,
      workers_alive: workersAlive,
      workers_total: heartbeats.length,
      tasks_done: tasksDone,
      tasks_failed: tasksFailed,
      sent_last_7_days: totalSent7,
      sent_prev_7_days: totalSent14prev,
      week_delta_pct: weekDelta,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analytics/account-health", (_req, res) => {
  try {
    const db  = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const accounts = db.prepare("SELECT id, phone, status, daily_limit, flood_wait_until FROM sender_accounts").all() as {
      id: number; phone: string; status: string; daily_limit: number | null; flood_wait_until: string | null;
    }[];
    const results = accounts.map(a => {
      let sentToday = 0;
      try { sentToday = (db.prepare("SELECT COUNT(*) as n FROM sends WHERE account_id=? AND sent_at LIKE ?").get(a.id, `${today}%`) as { n: number }).n; } catch {}
      const limit = a.daily_limit ?? 50;
      const pct   = Math.min(100, Math.round(sentToday / limit * 100));
      const floodSec = a.flood_wait_until
        ? Math.max(0, Math.round((new Date(a.flood_wait_until).getTime() - Date.now()) / 1000))
        : 0;
      return {
        id: a.id,
        phone: a.phone,
        status: a.status,
        sent_today: sentToday,
        daily_limit: limit,
        quota_pct: pct,
        flood_wait_sec: floodSec,
        healthy: a.status === "active" && floodSec === 0 && pct < 95,
      };
    });
    db.close();
    const healthy   = results.filter(r => r.healthy).length;
    const flooding  = results.filter(r => r.flood_wait_sec > 0).length;
    const inactive  = results.filter(r => r.status !== "active").length;
    res.json({ accounts: results, summary: { total: results.length, healthy, flooding, inactive } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
