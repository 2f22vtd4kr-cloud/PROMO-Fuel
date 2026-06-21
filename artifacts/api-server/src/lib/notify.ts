import { logger } from "./logger";

const TELEGRAM_API = "https://api.telegram.org";

/**
 * Send a Telegram message to a chat_id using the bot token.
 * Returns true on success, false on failure (never throws).
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  parseMode: "HTML" | "Markdown" | undefined = "HTML",
): Promise<boolean> {
  const token = process.env["TELEGRAM_TOKEN"];
  if (!token) {
    logger.warn("TELEGRAM_TOKEN not set — skipping notification");
    return false;
  }
  try {
    const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    const json = (await resp.json()) as { ok: boolean; description?: string };
    if (!json.ok) {
      logger.warn({ chatId, description: json.description }, "Telegram notify failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err, chatId }, "Telegram notify error");
    return false;
  }
}

/**
 * Notify all configured admin chat IDs.
 * ADMIN_TELEGRAM_ID may be a single ID or comma-separated list.
 */
export async function notifyAdmins(text: string): Promise<void> {
  const raw = process.env["ADMIN_TELEGRAM_ID"] ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    logger.warn("ADMIN_TELEGRAM_ID not set — skipping admin notification");
    return;
  }
  await Promise.all(ids.map((id) => sendTelegramMessage(id, text)));
}
