import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import crypto from "crypto";
import { existsSync } from "fs";
import { join } from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { startWatchdog } from "./lib/watchdog";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Login endpoint — must come BEFORE auth middleware ──
app.post("/api/auth", (req: Request, res: Response) => {
  const { secret } = req.body as { secret?: string };
  const API_SECRET = process.env["API_SECRET"] ?? "";
  if (!API_SECRET || secret === API_SECRET) {
    return void res.json({ ok: true });
  }
  return void res.status(401).json({ error: "Неверный пароль" });
});

// ── TWA HMAC validation (for /api/twa/* routes) ──
function validateTWAInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");
    const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const expected  = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    return expected === hash;
  } catch {
    return false;
  }
}

const NODE_ENV        = process.env["NODE_ENV"] ?? "development";
const TELEGRAM_TOKEN  = process.env["TELEGRAM_TOKEN"] ?? "";
const API_SECRET      = process.env["API_SECRET"] ?? "";

// TWA middleware — skip HMAC in dev or when token not configured
app.use("/api/twa", (req: Request, res: Response, next: NextFunction) => {
  if (NODE_ENV === "development" || !TELEGRAM_TOKEN) return next();
  const initData = (req.headers["x-telegram-init-data"] as string) ?? "";
  if (!validateTWAInitData(initData, TELEGRAM_TOKEN)) {
    return void res.status(403).json({ error: "Forbidden: invalid TWA initData" });
  }
  next();
});

// Bearer-token middleware — only active when API_SECRET is configured
if (API_SECRET) {
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const p = req.path;
    // Skip: login endpoint, TWA routes (validated above), health check
    if (p === "/auth" || p.startsWith("/twa") || p === "/health") return next();
    const auth = (req.headers.authorization ?? "") as string;
    if (auth !== `Bearer ${API_SECRET}`) {
      return void res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });
}

app.use("/api", router);

// ── Serve telegram-miniapp SPA in production ──
const FRONTEND_DIST = join(process.cwd(), "artifacts", "telegram-miniapp", "dist");
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("/*path", (_req, res) => {
    res.sendFile(join(FRONTEND_DIST, "index.html"));
  });
  logger.info({ path: FRONTEND_DIST }, "Serving frontend static files");
}

export default app;
