/**
 * Background watchdog — polls SQLite every 60 s and fires Telegram push
 * notifications for:
 *   1. Campaigns that just reached status `completed` or `failed`
 *   2. Workers whose heartbeat went stale (dead) after previously being alive
 *
 * Notification deduplication is handled via the `notifications_sent` table
 * so restarts never produce duplicate alerts.
 */

import Database from "better-sqlite3";
import { DB_PATH } from "./db-path";
import { notifyAdmins } from "./notify";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 60_000;
const WORKER_DEAD_THRESHOLD_S = 120;

function ensureNotificationsTable(db: InstanceType<typeof Database>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications_sent (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type  TEXT    NOT NULL,
      entity_id   TEXT    NOT NULL,
      sent_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (event_type, entity_id)
    )
  `);
}

function markSent(
  db: InstanceType<typeof Database>,
  eventType: string,
  entityId: string,
): void {
  db.prepare(
    "INSERT OR IGNORE INTO notifications_sent (event_type, entity_id) VALUES (?, ?)",
  ).run(eventType, entityId);
}

function alreadySent(
  db: InstanceType<typeof Database>,
  eventType: string,
  entityId: string,
): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM notifications_sent WHERE event_type = ? AND entity_id = ?",
    )
    .get(eventType, entityId);
  return !!row;
}

async function checkCampaigns(): Promise<void> {
  let db: InstanceType<typeof Database> | null = null;
  try {
    db = new Database(DB_PATH);
    ensureNotificationsTable(db);

    const campaigns = db
      .prepare(
        `SELECT id, name, status, sent_count, failed_count, target_count
         FROM campaigns
         WHERE status IN ('completed', 'failed')`,
      )
      .all() as {
      id: number;
      name: string;
      status: string;
      sent_count: number;
      failed_count: number;
      target_count: number;
    }[];

    for (const c of campaigns) {
      const key = `campaign_${c.status}_${c.id}`;
      if (alreadySent(db, "campaign", key)) continue;

      const emoji = c.status === "completed" ? "✅" : "❌";
      const statusLabel = c.status === "completed" ? "завершена" : "завершилась с ошибкой";
      const text =
        `${emoji} <b>Кампания ${statusLabel}</b>\n` +
        `📋 <b>${escapeHtml(c.name)}</b>\n\n` +
        `• Отправлено: <b>${c.sent_count}</b>\n` +
        `• Ошибок: <b>${c.failed_count}</b>\n` +
        `• Всего целей: <b>${c.target_count}</b>`;

      await notifyAdmins(text);
      markSent(db, "campaign", key);
      logger.info({ campaign_id: c.id, status: c.status }, "Campaign notification sent");
    }
  } catch (err) {
    logger.warn({ err }, "watchdog: campaign check error");
  } finally {
    db?.close();
  }
}

async function checkWorkers(): Promise<void> {
  let db: InstanceType<typeof Database> | null = null;
  try {
    db = new Database(DB_PATH);
    ensureNotificationsTable(db);

    const workers = db
      .prepare("SELECT worker_id, pid, last_heartbeat, last_error FROM broadcast_workers")
      .all() as {
      worker_id: string;
      pid: number | null;
      last_heartbeat: string | null;
      last_error: string | null;
    }[];

    const now = Date.now();
    for (const w of workers) {
      const hb = w.last_heartbeat ? new Date(w.last_heartbeat).getTime() : 0;
      const ageSeconds = Math.floor((now - hb) / 1000);
      const isDead = ageSeconds > WORKER_DEAD_THRESHOLD_S;

      if (!isDead) {
        // Worker is alive — clear any previous dead notification so we can
        // re-notify if it dies again later.
        db.prepare(
          "DELETE FROM notifications_sent WHERE event_type = 'worker_dead' AND entity_id = ?",
        ).run(w.worker_id);
        continue;
      }

      const key = w.worker_id;
      if (alreadySent(db, "worker_dead", key)) continue;

      const errorNote = w.last_error ? `\n⚠️ Последняя ошибка: <code>${escapeHtml(w.last_error.slice(0, 200))}</code>` : "";
      const text =
        `🔴 <b>Воркер упал</b>\n` +
        `🤖 <b>${escapeHtml(w.worker_id)}</b> (PID ${w.pid ?? "—"})\n\n` +
        `Нет heartbeat уже <b>${Math.round(ageSeconds / 60)} мин</b>.${errorNote}\n\n` +
        `Перезапустите воркер вручную или через панель управления.`;

      await notifyAdmins(text);
      markSent(db, "worker_dead", key);
      logger.info({ worker_id: w.worker_id, age_seconds: ageSeconds }, "Worker dead notification sent");
    }
  } catch (err) {
    logger.warn({ err }, "watchdog: worker check error");
  } finally {
    db?.close();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startWatchdog(): void {
  if (timer) return;
  logger.info("Watchdog started — polling every 60 s for campaign/worker events");

  async function poll() {
    await checkCampaigns();
    await checkWorkers();
  }

  // Run once immediately, then on interval
  poll().catch((e) => logger.warn({ e }, "watchdog: initial poll error"));
  timer = setInterval(() => {
    poll().catch((e) => logger.warn({ e }, "watchdog: poll error"));
  }, POLL_INTERVAL_MS);
}

export function stopWatchdog(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
