import { Router } from "express";
import http from "http";
import { getPgPool } from "../lib/pg-pool";

const router = Router();

router.get("/sync/status", async (_req, res) => {
  try {
    const pool = getPgPool();
    const result = await pool.query(
      "SELECT updated_at FROM pf_db_snapshot WHERE key = 'main'",
    );
    const row = result.rows[0];
    res.json({ ok: true, updated_at: row?.updated_at ?? null });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

router.post("/sync/now", async (_req, res) => {
  try {
    const port = process.env["PYTHON_API_PORT"] ?? "8083";
    await new Promise<void>((resolve, reject) => {
      const req2 = http.request(
        { hostname: "127.0.0.1", port: parseInt(port), path: "/internal/sync", method: "POST" },
        (r) => { r.resume(); r.on("end", resolve); r.on("error", reject); },
      );
      req2.on("error", reject);
      req2.setTimeout(12000, () => req2.destroy(new Error("timeout")));
      req2.end();
    });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

export default router;
