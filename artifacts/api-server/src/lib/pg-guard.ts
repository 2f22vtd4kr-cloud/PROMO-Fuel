/**
 * pg-guard.ts — critical PostgreSQL table guard
 *
 * Runs at API server startup (every boot, dev + production).
 * Ensures the 3 persistent PostgreSQL tables always exist, even if a bad
 * deployment migration accidentally dropped them.  Also cross-checks data
 * integrity and emits CRITICAL warnings if session files or the SQLite
 * backup appear to have been lost.
 *
 * Call order in app.ts:  await ensurePgTables()  before any route is used.
 */

import { getPgPool } from "./pg-pool.js";
import { logger } from "./logger.js";
import Database from "better-sqlite3";
import { DB_PATH } from "./db-path.js";

// ── Table DDL ─────────────────────────────────────────────────────────────────

const DDL_SAVED_PROXIES = `
  CREATE TABLE IF NOT EXISTS saved_proxies (
    id               SERIAL PRIMARY KEY,
    country_code     TEXT        NOT NULL,
    label            TEXT        NOT NULL DEFAULT '',
    proxy_string     TEXT        NOT NULL,
    last_session_num INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_saved_proxies_country ON saved_proxies(country_code);
`;

const DDL_PF_DB_SNAPSHOT = `
  CREATE TABLE IF NOT EXISTS pf_db_snapshot (
    key        TEXT    PRIMARY KEY,
    db_data    BYTEA   NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const DDL_PF_SESSION_FILES = `
  CREATE TABLE IF NOT EXISTS pf_session_files (
    filename   TEXT    PRIMARY KEY,
    data       BYTEA   NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function pgCount(table: string): Promise<number> {
  const pool = getPgPool();
  const { rows } = await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return parseInt(rows[0]?.n ?? "0", 10);
}

function sqliteAccountCount(): number {
  try {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    const row = db.prepare("SELECT COUNT(*) AS n FROM sender_accounts").get() as { n: number } | undefined;
    db.close();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function ensurePgTables(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    logger.warn("[pg-guard] DATABASE_URL not set — skipping PostgreSQL table guard");
    return;
  }

  const pool = getPgPool();

  // ── Step 1: ensure all 3 tables exist ─────────────────────────────────────
  try {
    await pool.query(DDL_SAVED_PROXIES);
    logger.info("[pg-guard] ✓ saved_proxies table OK");
  } catch (err) {
    logger.error({ err }, "[pg-guard] FAILED to create saved_proxies — proxies may be unavailable");
  }

  try {
    await pool.query(DDL_PF_DB_SNAPSHOT);
    logger.info("[pg-guard] ✓ pf_db_snapshot table OK");
  } catch (err) {
    logger.error({ err }, "[pg-guard] FAILED to create pf_db_snapshot — SQLite backup unavailable");
  }

  try {
    await pool.query(DDL_PF_SESSION_FILES);
    logger.info("[pg-guard] ✓ pf_session_files table OK");
  } catch (err) {
    logger.error({ err }, "[pg-guard] FAILED to create pf_session_files — bot account sessions unavailable");
  }

  // ── Step 2: data-integrity cross-check ────────────────────────────────────
  try {
    const [sessionCount, snapshotCount, proxyCount] = await Promise.all([
      pgCount("pf_session_files"),
      pgCount("pf_db_snapshot"),
      pgCount("saved_proxies"),
    ]);

    const sqliteAccounts = sqliteAccountCount();

    // Session files missing while bot accounts exist → critical data loss signal
    if (sessionCount === 0 && sqliteAccounts > 0) {
      logger.error(
        { sqliteAccounts },
        "[pg-guard] ⛔ CRITICAL: pf_session_files is EMPTY but SQLite has " +
        sqliteAccounts + " sender_account(s). " +
        "Bot account Telegram sessions may have been lost (bad migration or first deploy). " +
        "Accounts will need to be re-authenticated."
      );
    } else if (sessionCount === 0) {
      logger.warn("[pg-guard] ⚠ pf_session_files is empty — no bot account sessions stored yet");
    } else {
      logger.info({ sessionCount }, "[pg-guard] ✓ pf_session_files has " + sessionCount + " session(s)");
    }

    // SQLite snapshot missing
    if (snapshotCount === 0) {
      logger.warn(
        "[pg-guard] ⚠ pf_db_snapshot is empty — SQLite DB has not been backed up to PostgreSQL yet " +
        "(normal on first run; db_sync.py will write the first snapshot shortly)"
      );
    } else {
      logger.info({ snapshotCount }, "[pg-guard] ✓ pf_db_snapshot present (" + snapshotCount + " snapshot(s))");
    }

    // Proxies — informational only
    if (proxyCount === 0) {
      logger.warn("[pg-guard] ⚠ saved_proxies is empty — add proxies in the Accounts → Proxies panel");
    } else {
      logger.info({ proxyCount }, "[pg-guard] ✓ saved_proxies has " + proxyCount + " proxy entry/entries");
    }
  } catch (err) {
    logger.warn({ err }, "[pg-guard] Data integrity check failed (non-fatal)");
  }
}
