import { Router, type IRouter } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";
import { AUTH_SERVER_URL } from "../lib/auth-server-url";

function getDb(readonly = true) {
  return new Database(DB_PATH, { readonly });
}

function ensureTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sender_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL DEFAULT '',
      phone TEXT UNIQUE NOT NULL,
      telegram_id INTEGER,
      username TEXT,
      api_id INTEGER,
      api_hash TEXT,
      session_file TEXT,
      proxy TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      flood_wait_until TEXT,
      daily_limit INTEGER NOT NULL DEFAULT 300,
      sent_today INTEGER NOT NULL DEFAULT 0,
      sent_total INTEGER NOT NULL DEFAULT 0,
      failed_total INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_used_at TEXT,
      is_banned INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  for (const [col, def] of [
    ["api_id", "INTEGER"],
    ["api_hash", "TEXT"],
    ["flood_wait_until", "TEXT"],
    ["daily_limit", "INTEGER NOT NULL DEFAULT 300"],
  ] as [string, string][]) {
    try { db.exec(`ALTER TABLE sender_accounts ADD COLUMN ${col} ${def}`); } catch {}
  }
  db.close();
}

ensureTable();

const router: IRouter = Router();

router.get("/accounts", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM sender_accounts ORDER BY created_at DESC").all();
    db.close();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/accounts", (req, res) => {
  try {
    const db = getDb(false);
    const { phone, label, username, telegram_id, proxy, session_file, api_id, api_hash } = req.body as {
      phone: string; label?: string; username?: string;
      telegram_id?: number; proxy?: string; session_file?: string;
      api_id?: number; api_hash?: string;
    };
    if (!phone) return void res.status(400).json({ error: "phone required" });
    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO sender_accounts (phone, label, username, telegram_id, api_id, api_hash, proxy, session_file, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET label=excluded.label, username=excluded.username,
         telegram_id=excluded.telegram_id, api_id=excluded.api_id, api_hash=excluded.api_hash,
         proxy=excluded.proxy, session_file=excluded.session_file`
    ).run(phone, label ?? "", username ?? null, telegram_id ?? null, api_id ?? null, api_hash ?? null, proxy ?? null, session_file ?? null, now);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(info.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/accounts/:id", (req, res) => {
  try {
    const db = getDb(false);
    const id = parseInt(req.params.id);
    const allowed = ["label", "phone", "username", "telegram_id", "api_id", "api_hash",
                     "proxy", "proxies", "session_file", "status", "auth_status", "is_active", "is_banned",
                     "last_error", "sent_today", "sent_total", "failed_total", "last_used_at",
                     "flood_wait_until", "daily_limit"];
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return void res.status(400).json({ error: "nothing to update" });
    values.push(id);
    db.prepare(`UPDATE sender_accounts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(id);
    db.close();
    if (!row) return void res.status(404).json({});
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/accounts/:id", (req, res) => {
  try {
    const db = getDb(false);
    db.prepare("DELETE FROM sender_accounts WHERE id = ?").run(parseInt(req.params.id));
    db.close();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/accounts/:id/reset-daily", (req, res) => {
  try {
    const db = getDb(false);
    const id = parseInt(req.params.id);
    db.prepare("UPDATE sender_accounts SET sent_today = 0 WHERE id = ?").run(id);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(id);
    db.close();
    res.json(row ?? {});
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/accounts/reset-daily", (req, res) => {
  try {
    const db = getDb(false);
    db.prepare("UPDATE sender_accounts SET sent_today = 0").run();
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/accounts/:id/clear-flood", (req, res) => {
  try {
    const db = getDb(false);
    const id = parseInt(req.params.id);
    db.prepare(`UPDATE sender_accounts SET status = 'idle', flood_wait_until = NULL, last_error = NULL WHERE id = ? AND status = 'flood_wait'`).run(id);
    const row = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(id);
    db.close();
    if (!row) return void res.status(404).json({});
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/accounts/:id/logs", (req, res) => {
  try {
    const db = getDb(true);
    const rows = db.prepare(
      `SELECT s.id, s.campaign_id, s.chat_id, s.status, s.sent_at, s.error,
              c.name as campaign_name,
              u.username, u.first_name
       FROM sends s
       LEFT JOIN campaigns c ON c.id = s.campaign_id
       LEFT JOIN users u ON u.chat_id = s.chat_id
       WHERE s.account_id = ?
       ORDER BY s.sent_at DESC LIMIT 100`
    ).all(parseInt(req.params.id));
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});


async function proxyToAuthServer(path: string, body: unknown): Promise<{ status: number; data: unknown }> {
  const r = await fetch(`${AUTH_SERVER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await r.json();
  return { status: r.status, data };
}

async function getFromAuthServer(path: string): Promise<{ status: number; data: unknown }> {
  const r = await fetch(`${AUTH_SERVER_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const data = await r.json();
  return { status: r.status, data };
}

router.post("/accounts/:id/start-auth", async (req, res) => {
  try {
    const db = getDb();
    const acc = db.prepare("SELECT * FROM sender_accounts WHERE id = ?").get(parseInt(req.params.id)) as Record<string, unknown> | undefined;
    db.close();
    if (!acc) return void res.status(404).json({ error: "Account not found" });
    const { phone, api_id, api_hash } = acc;
    if (!api_id || !api_hash) return void res.status(400).json({ error: "api_id and api_hash must be set on the account first" });
    const { status, data } = await proxyToAuthServer("/start-auth", { phone, api_id, api_hash });
    if (status === 200 && (data as Record<string, unknown>).already_authorized) {
      const wdb = new Database(DB_PATH);
      wdb.prepare("UPDATE sender_accounts SET session_file = ?, username = ?, status = 'idle' WHERE id = ?")
        .run((data as Record<string, unknown>).session_file, (data as Record<string, unknown>).display_name, parseInt(req.params.id));
      wdb.close();
    }
    res.status(status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Auth server unavailable: ${String(err)}` });
  }
});

router.post("/accounts/:id/confirm-auth", async (req, res) => {
  try {
    const db = getDb();
    const acc = db.prepare("SELECT phone FROM sender_accounts WHERE id = ?").get(parseInt(req.params.id)) as { phone: string } | undefined;
    db.close();
    if (!acc) return void res.status(404).json({ error: "Account not found" });
    const { code, phone_code_hash } = req.body as { code: string; phone_code_hash: string };
    const { status, data } = await proxyToAuthServer("/confirm-auth", { phone: acc.phone, code, phone_code_hash });
    if (status === 200 && (data as Record<string, unknown>).ok) {
      const wdb = new Database(DB_PATH);
      wdb.prepare("UPDATE sender_accounts SET session_file = ?, username = ?, status = 'idle' WHERE id = ?")
        .run((data as Record<string, unknown>).session_file, (data as Record<string, unknown>).display_name, parseInt(req.params.id));
      wdb.close();
    }
    res.status(status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Auth server unavailable: ${String(err)}` });
  }
});

router.post("/accounts/:id/confirm-2fa", async (req, res) => {
  try {
    const db = getDb();
    const acc = db.prepare("SELECT phone FROM sender_accounts WHERE id = ?").get(parseInt(req.params.id)) as { phone: string } | undefined;
    db.close();
    if (!acc) return void res.status(404).json({ error: "Account not found" });
    const { password } = req.body as { password: string };
    const { status, data } = await proxyToAuthServer("/confirm-2fa", { phone: acc.phone, password });
    if (status === 200 && (data as Record<string, unknown>).ok) {
      const wdb = new Database(DB_PATH);
      wdb.prepare("UPDATE sender_accounts SET session_file = ?, username = ?, status = 'idle' WHERE id = ?")
        .run((data as Record<string, unknown>).session_file, (data as Record<string, unknown>).display_name, parseInt(req.params.id));
      wdb.close();
    }
    res.status(status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Auth server unavailable: ${String(err)}` });
  }
});

// ── Banned groups for an account (read from local DB) ────────────────────────

router.get("/accounts/:id/banned-groups", (req, res) => {
  try {
    const db = getDb(true);
    let rows: { group_id: string; group_title: string | null; ban_reason: string | null; banned_at: string | null }[] = [];
    try {
      rows = db.prepare(`
        SELECT group_id, group_title, ban_reason, banned_at
        FROM account_groups
        WHERE account_id = ? AND is_banned = 1
        ORDER BY banned_at DESC
      `).all(Number(req.params.id)) as typeof rows;
    } catch {}
    db.close();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/accounts/:id/banned-groups/:groupId", (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare(`
      UPDATE account_groups
      SET is_banned = 0, ban_reason = NULL, banned_at = NULL
      WHERE account_id = ? AND group_id = ?
    `).run(Number(req.params.id), req.params.groupId);
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Account groups — proxy to Telethon auth server ───────────────────────────

router.get("/accounts/:id/groups", async (req, res) => {
  try {
    const { status, data } = await getFromAuthServer(`/groups/${req.params.id}`);
    res.status(status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Auth server unavailable: ${String(err)}` });
  }
});

router.post("/accounts/:id/groups/refresh", async (req, res) => {
  try {
    const { status, data } = await proxyToAuthServer(`/groups/${req.params.id}/refresh`, {});
    res.status(status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Auth server unavailable: ${String(err)}` });
  }
});

// ── Per-account rate-limit window status ──────────────────────────────────────

router.get("/accounts/:id/rate-limit", (req, res) => {
  try {
    const db = getDb(true);
    const accountId = parseInt(req.params.id);

    // Check account exists
    const acc = db.prepare("SELECT id FROM sender_accounts WHERE id = ?").get(accountId);
    if (!acc) { db.close(); return void res.status(404).json({ error: "Account not found" }); }

    const windowSeconds = parseInt(process.env.ACCOUNT_RATE_LIMIT_WIN ?? "60");
    const windowMax     = parseInt(process.env.ACCOUNT_RATE_LIMIT_MAX ?? "20");

    let windowStart: string | null = null;
    let count = 0;

    try {
      const row = db.prepare(
        "SELECT window_start, count FROM account_rate_limits WHERE account_id = ?"
      ).get(accountId) as { window_start: string; count: number } | undefined;

      if (row) {
        const startMs = new Date(row.window_start).getTime();
        const nowMs   = Date.now();
        const elapsed = (nowMs - startMs) / 1000;

        if (elapsed < windowSeconds) {
          windowStart = row.window_start;
          count       = row.count;
        }
        // If window expired, count stays 0 (fresh window)
      }
    } catch {
      // table may not exist yet — return zeroed stats
    }

    db.close();

    const resetsAt = windowStart
      ? new Date(new Date(windowStart).getTime() + windowSeconds * 1000).toISOString()
      : null;

    res.json({
      account_id:      accountId,
      window_seconds:  windowSeconds,
      window_max:      windowMax,
      count,
      remaining:       Math.max(0, windowMax - count),
      window_start:    windowStart,
      resets_at:       resetsAt,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/accounts/sends-today", (_req, res) => {
  try {
    const db = getDb(true);
    const today = new Date().toISOString().slice(0, 10);
    let rows: { account_id: string; ok: number; failed: number }[] = [];
    try {
      rows = db.prepare(`
        SELECT account_id, 
               SUM(CASE WHEN status IN ('ok','sent') THEN 1 ELSE 0 END) as ok,
               SUM(CASE WHEN status IN ('failed','error') THEN 1 ELSE 0 END) as failed
        FROM group_sends
        WHERE DATE(sent_at) = ?
        GROUP BY account_id
      `).all(today) as { account_id: string; ok: number; failed: number }[];
    } catch {}
    db.close();
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

export default router;
