import { Router, type Request, type Response } from "express";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

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

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_proxies (
      id               SERIAL PRIMARY KEY,
      country_code     TEXT    NOT NULL,
      label            TEXT    NOT NULL DEFAULT '',
      proxy_string     TEXT    NOT NULL,
      last_session_num INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_saved_proxies_country ON saved_proxies(country_code);
  `);
}

ensureTable().catch(err => console.error("[proxy-store] ensureTable error:", err));

/**
 * GET /api/proxy-store
 * List all saved proxies, optionally filtered by ?country=ua
 */
router.get("/proxy-store", async (req: Request, res: Response) => {
  const { country } = req.query as { country?: string };
  try {
    const result = country
      ? await pool.query<ProxyEntry>(
          "SELECT * FROM saved_proxies WHERE country_code = $1 ORDER BY updated_at DESC",
          [country.trim()]
        )
      : await pool.query<ProxyEntry>(
          "SELECT * FROM saved_proxies ORDER BY country_code ASC, updated_at DESC"
        );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/proxy-store
 * Body: { country_code, proxy_string, label? }
 */
router.post("/proxy-store", async (req: Request, res: Response) => {
  const { country_code, proxy_string, label = "" } = req.body as {
    country_code?: string; proxy_string?: string; label?: string;
  };
  if (!country_code?.trim() || !proxy_string?.trim()) {
    return void res.status(400).json({ error: "country_code and proxy_string are required" });
  }
  try {
    const result = await pool.query<ProxyEntry>(
      "INSERT INTO saved_proxies (country_code, label, proxy_string) VALUES ($1, $2, $3) RETURNING *",
      [country_code.trim(), (label ?? "").trim(), proxy_string.trim()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * PUT /api/proxy-store/:id
 * Body: { proxy_string?, label? }
 */
router.put("/proxy-store/:id", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: "Invalid id" });
  const { proxy_string, label } = req.body as { proxy_string?: string; label?: string };

  const fields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let idx = 1;
  if (proxy_string !== undefined) { fields.push(`proxy_string = $${idx++}`); values.push(proxy_string.trim()); }
  if (label !== undefined)        { fields.push(`label = $${idx++}`);        values.push(label.trim()); }
  if (values.length === 0) return void res.status(400).json({ error: "Nothing to update" });
  values.push(id);

  try {
    const result = await pool.query<ProxyEntry>(
      `UPDATE saved_proxies SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return void res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * PATCH /api/proxy-store/:id/session-num
 * Body: { last_session_num }  — called automatically after a successful batch run
 */
router.patch("/proxy-store/:id/session-num", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { last_session_num } = req.body as { last_session_num?: number };
  if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: "Invalid id" });
  if (!Number.isInteger(last_session_num) || (last_session_num as number) < 0) {
    return void res.status(400).json({ error: "last_session_num must be a non-negative integer" });
  }
  try {
    const result = await pool.query<ProxyEntry>(
      "UPDATE saved_proxies SET last_session_num = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [last_session_num, id]
    );
    if (result.rows.length === 0) return void res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /api/proxy-store/:id
 */
router.delete("/proxy-store/:id", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: "Invalid id" });
  try {
    const result = await pool.query(
      "DELETE FROM saved_proxies WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) return void res.status(404).json({ error: "Not found" });
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
