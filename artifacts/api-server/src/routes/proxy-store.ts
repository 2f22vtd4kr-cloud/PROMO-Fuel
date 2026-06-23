import { Router, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

const router = Router();

interface ProxyEntry {
  id: number;
  country_code: string;
  label: string;
  proxy_string: string;
  last_session_num: number;
  created_at: string;
  updated_at: string;
}

function getDb(readonly = true) {
  return new Database(DB_PATH, { readonly });
}

function ensureTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_proxies (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code     TEXT    NOT NULL,
      label            TEXT    NOT NULL DEFAULT '',
      proxy_string     TEXT    NOT NULL,
      last_session_num INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_saved_proxies_country ON saved_proxies(country_code);
  `);
  db.close();
}

ensureTable();

/**
 * GET /api/proxy-store
 * List all saved proxies, optionally filtered by ?country=ua
 */
router.get("/proxy-store", (req: Request, res: Response) => {
  const { country } = req.query as { country?: string };
  const db = getDb();
  try {
    const rows = country
      ? db.prepare("SELECT * FROM saved_proxies WHERE country_code = ? ORDER BY updated_at DESC").all(country.trim())
      : db.prepare("SELECT * FROM saved_proxies ORDER BY country_code ASC, updated_at DESC").all();
    res.json(rows);
  } finally {
    db.close();
  }
});

/**
 * POST /api/proxy-store
 * Body: { country_code, proxy_string, label? }
 */
router.post("/proxy-store", (req: Request, res: Response) => {
  const { country_code, proxy_string, label = "" } = req.body as {
    country_code?: string; proxy_string?: string; label?: string;
  };
  if (!country_code?.trim() || !proxy_string?.trim()) {
    return void res.status(400).json({ error: "country_code and proxy_string are required" });
  }
  const db = new Database(DB_PATH);
  try {
    const result = db
      .prepare("INSERT INTO saved_proxies (country_code, label, proxy_string) VALUES (?, ?, ?)")
      .run(country_code.trim(), (label ?? "").trim(), proxy_string.trim());
    const row = db.prepare("SELECT * FROM saved_proxies WHERE id = ?").get(result.lastInsertRowid) as ProxyEntry;
    res.json(row);
  } finally {
    db.close();
  }
});

/**
 * PUT /api/proxy-store/:id
 * Body: { proxy_string?, label? }
 */
router.put("/proxy-store/:id", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: "Invalid id" });
  const { proxy_string, label } = req.body as { proxy_string?: string; label?: string };
  const db = new Database(DB_PATH);
  try {
    const fields: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];
    if (proxy_string !== undefined) { fields.push("proxy_string = ?"); values.push(proxy_string.trim()); }
    if (label !== undefined)        { fields.push("label = ?");        values.push(label.trim()); }
    if (values.length === 0) return void res.status(400).json({ error: "Nothing to update" });
    values.push(id);
    db.prepare(`UPDATE saved_proxies SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM saved_proxies WHERE id = ?").get(id);
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } finally {
    db.close();
  }
});

/**
 * PATCH /api/proxy-store/:id/session-num
 * Body: { last_session_num }  — called automatically after a successful batch run
 */
router.patch("/proxy-store/:id/session-num", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { last_session_num } = req.body as { last_session_num?: number };
  if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: "Invalid id" });
  if (!Number.isInteger(last_session_num) || (last_session_num as number) < 0) {
    return void res.status(400).json({ error: "last_session_num must be a non-negative integer" });
  }
  const db = new Database(DB_PATH);
  try {
    db.prepare(
      "UPDATE saved_proxies SET last_session_num = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(last_session_num, id);
    const row = db.prepare("SELECT * FROM saved_proxies WHERE id = ?").get(id);
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } finally {
    db.close();
  }
});

/**
 * DELETE /api/proxy-store/:id
 */
router.delete("/proxy-store/:id", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: "Invalid id" });
  const db = new Database(DB_PATH);
  try {
    const row = db.prepare("SELECT id FROM saved_proxies WHERE id = ?").get(id);
    if (!row) return void res.status(404).json({ error: "Not found" });
    db.prepare("DELETE FROM saved_proxies WHERE id = ?").run(id);
    res.json({ deleted: true, id });
  } finally {
    db.close();
  }
});

export default router;
