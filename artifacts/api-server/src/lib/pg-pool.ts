import pg from "pg";

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

export function getPgPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  }
  return _pool;
}

export async function deleteSessionFileFromPg(sessionFile: string): Promise<void> {
  if (!sessionFile || !process.env["DATABASE_URL"]) return;
  const bare = sessionFile.split("/").pop() ?? sessionFile;
  const filename = bare.endsWith(".session") ? bare : bare + ".session";
  try {
    const pool = getPgPool();
    await pool.query("DELETE FROM pf_session_files WHERE filename = $1", [filename]);
  } catch (e) {
    console.warn("[pg-pool] deleteSessionFileFromPg failed:", e);
  }
}
