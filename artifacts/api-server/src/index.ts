import { execSync } from "child_process";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function killPortHolder(p: number): boolean {
  try {
    const out = execSync(`ss -tlnp 'sport = :${p}' 2>/dev/null || true`, {
      encoding: "utf8",
    });
    const pidMatch = out.match(/pid=(\d+)/);
    if (pidMatch) {
      const pid = pidMatch[1];
      if (pid && pid !== String(process.pid)) {
        execSync(`kill -9 ${pid} 2>/dev/null || true`);
        logger.warn({ pid: Number(pid), port: p }, "Killed conflicting process holding port");
        return true;
      }
    }
  } catch {
  }
  try {
    execSync(`fuser -k ${p}/tcp 2>/dev/null || true`);
    logger.warn({ port: p }, "Cleared port via fuser");
    return true;
  } catch {
    return false;
  }
}

function startServer(attempt: number): void {
  const server = app.listen(port, "0.0.0.0", () => {
    logger.info({ port, attempt }, "Server listening");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.warn({ port, attempt }, `EADDRINUSE on port ${port} (attempt ${attempt}/${MAX_RETRIES})`);

      if (attempt >= MAX_RETRIES) {
        logger.error({ port }, "Port still in use after max retries — giving up");
        process.exit(1);
      }

      server.close(() => {
        killPortHolder(port);
        setTimeout(() => startServer(attempt + 1), RETRY_DELAY_MS);
      });
    } else {
      logger.error({ err }, "Fatal server error");
      process.exit(1);
    }
  });
}

startServer(1);
