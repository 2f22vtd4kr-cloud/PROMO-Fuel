import { Router, type IRouter } from "express";
import multer from "multer";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ALLOWED_EXT = [".html", ".csv", ".tsv", ".json", ".jsonl"];

// Multipart file upload — stores parsed entries in uploads table
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return void res.status(400).json({ error: "No file uploaded" });

  const filename = req.file.originalname.toLowerCase();
  const ext = "." + filename.split(".").pop();
  if (!ALLOWED_EXT.includes(ext)) {
    return void res.status(400).json({ error: `Unsupported format. Allowed: ${ALLOWED_EXT.join(", ")}` });
  }

  const content = req.file.buffer.toString("utf-8");
  const key = `upload_${Date.now()}`;
  const entries: unknown[] = [];

  try {
    if (ext === ".csv" || ext === ".tsv") {
      const delimiter = ext === ".tsv" ? "\t" : ",";
      const lines = content.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return void res.status(400).json({ error: "File has no data rows" });
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ""));
      for (const line of lines.slice(1)) {
        const vals = line.split(delimiter);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          const v = (vals[i] ?? "").trim().replace(/^"|"$/g, "");
          if (v) row[h] = v;
        });
        if (Object.keys(row).length > 0) entries.push(row);
      }
    } else if (ext === ".json") {
      const data = JSON.parse(content);
      if (Array.isArray(data)) entries.push(...data);
      else entries.push(data);
    } else if (ext === ".jsonl") {
      for (const line of content.split(/\r?\n/).filter(Boolean)) {
        try { entries.push(JSON.parse(line)); } catch { /* skip malformed lines */ }
      }
    } else if (ext === ".html") {
      const phoneRe = /(?:\+7|8|7)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;
      const phones = [...new Set(content.match(phoneRe) ?? [])];
      for (const p of phones.slice(0, 500)) {
        entries.push({ phone: (p as string).replace(/[\s\-\(\)]/g, "") });
      }
    }
  } catch (e: unknown) {
    return void res.status(400).json({ error: `Parse error: ${(e as Error).message}` });
  }

  try {
    const db = new Database(DB_PATH);
    db.prepare(`
      INSERT OR REPLACE INTO uploads (key, filename, entries_json, uploaded_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(key, req.file.originalname, JSON.stringify(entries));
    db.close();
  } catch (e: unknown) {
    return void res.status(500).json({ error: `DB error: ${(e as Error).message}` });
  }

  res.json({ key, filename: req.file.originalname, count: entries.length });
});

// List previous uploads
router.get("/upload", (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    let rows: unknown[];
    try {
      rows = db.prepare(
        "SELECT key, filename, uploaded_at, imported_count, json_array_length(entries_json) as count FROM uploads ORDER BY rowid DESC"
      ).all();
    } catch {
      rows = [];
    }
    db.close();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

// JSON batch import — keeps backward compat
interface ImportUser {
  chat_id: number | string;
  username?: string;
  first_name?: string;
  tags?: string;
}

router.post("/upload/users", (req, res) => {
  try {
    const body = req.body as { users?: ImportUser[] };
    const users: ImportUser[] = Array.isArray(body.users) ? body.users : [];
    if (users.length === 0) return void res.status(400).json({ error: "users array required" });

    const db  = new Database(DB_PATH);
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (chat_id, username, first_name, first_seen, last_seen, tags)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        username   = COALESCE(excluded.username, username),
        first_name = COALESCE(excluded.first_name, first_name),
        last_seen  = excluded.last_seen,
        tags       = COALESCE(excluded.tags, tags)
    `);

    let imported = 0;
    let skipped  = 0;
    const insertMany = db.transaction((list: ImportUser[]) => {
      for (const u of list) {
        const cid = parseInt(String(u.chat_id));
        if (!cid || isNaN(cid)) { skipped++; continue; }
        stmt.run(cid, u.username ?? null, u.first_name ?? null, now, now, u.tags ?? "[]");
        imported++;
      }
    });
    insertMany(users);
    db.close();

    res.json({ ok: true, imported, skipped, total: users.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
