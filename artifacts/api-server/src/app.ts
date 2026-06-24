import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import crypto from "crypto";
import http from "http";
import { existsSync } from "fs";
import { join } from "path";
import router from "./routes";
import factoryRouter from "./routes/factory";
import syncRouter from "./routes/sync";
import { logger } from "./lib/logger";
import { startWatchdog } from "./lib/watchdog";
import { twaLimiter, authLimiter, apiLimiter } from "./lib/rate-limit";
import { ensurePgTables } from "./lib/pg-guard";

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

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Applied before auth middleware so blocked requests never reach business logic.
app.use("/api/twa", twaLimiter);   // Mini App consumers  — 120 req/min  (dev: off)
app.post("/api/auth", authLimiter); // Login attempts      — 10  req/15min (always on)
app.use("/api",       apiLimiter);  // CRM/admin routes    — 300 req/min  (dev: off)

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

// ── Proxy /api/verifications/* and /api/factory/* → Python FastAPI (port 8083)
// Must be registered BEFORE the Bearer middleware so it bypasses the Node.js
// auth check — the Python server receives the headers as-is.
const PYTHON_PORT = parseInt(process.env["PYTHON_API_PORT"] ?? "8083");

function makePythonProxy(prefix: string, maxRetries = 3) {
  return (req: Request, res: Response) => {
    const targetPath = `${prefix}${req.path === "/" ? "" : req.path}`;
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    // express.json() has already consumed req body stream — re-serialise from req.body
    const bodyBuf: Buffer | null = req.body && Object.keys(req.body as object).length > 0
      ? Buffer.from(JSON.stringify(req.body), "utf-8")
      : null;

    const forwardHeaders: Record<string, string | string[] | undefined> = {
      ...req.headers,
      host: `127.0.0.1:${PYTHON_PORT}`,
    };
    if (bodyBuf) {
      forwardHeaders["content-type"]    = "application/json";
      forwardHeaders["content-length"]  = String(bodyBuf.length);
      // Remove transfer-encoding — we send a fixed-length body, not chunked
      delete forwardHeaders["transfer-encoding"];
    } else {
      delete forwardHeaders["content-length"];
      delete forwardHeaders["transfer-encoding"];
    }

    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: PYTHON_PORT,
      path: targetPath + qs,
      method: req.method,
      headers: forwardHeaders,
    };

    let attempt = 0;

    function tryRequest() {
      attempt++;
      const proxyReq = http.request(options, (proxyRes) => {
        const isSSE = (proxyRes.headers["content-type"] ?? "").includes("text/event-stream");

        res.status(proxyRes.statusCode ?? 200);
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          // Strip content-length for SSE — the stream has no fixed length
          if (isSSE && k.toLowerCase() === "content-length") continue;
          if (v !== undefined) res.setHeader(k, v);
        }

        if (isSSE) {
          // Tell every proxy layer (nginx, Replit CDN) not to buffer SSE chunks
          res.setHeader("X-Accel-Buffering", "no");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.flushHeaders();
          if (res.socket) res.socket.setNoDelay(true);
        }

        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on("error", (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        // Retry on connection-refused (Python still starting up) or reset
        if ((code === "ECONNREFUSED" || code === "ECONNRESET") && attempt < maxRetries) {
          const delay = attempt * 800;
          logger.warn({ attempt, delay, code }, `${prefix} proxy retry`);
          setTimeout(tryRequest, delay);
          return;
        }
        logger.error({ err, attempt }, `${prefix} proxy error`);
        if (!res.headersSent) {
          res.status(502).json({ error: "Python API unavailable", detail: err.message });
        }
      });

      // Write the body directly (stream already consumed by express.json)
      if (bodyBuf) {
        proxyReq.write(bodyBuf);
      }
      proxyReq.end();
    }

    tryRequest();
  };
}

app.use("/api", syncRouter);
app.use("/api/verifications", makePythonProxy("/api/verifications"));
// GET /api/factory/countries is handled natively in Node.js (no Python dependency).
// All other /api/factory/* routes (e.g. POST /register) fall through to the Python proxy.
app.use("/api/factory", factoryRouter);
app.use("/api/factory",       makePythonProxy("/api/factory"));

// ── Bearer-token middleware — only active when API_SECRET is configured ───────
if (API_SECRET) {
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const p = req.path;
    // Skip: login endpoint, TWA routes (validated above), health check, proxy store
    if (p === "/auth" || p.startsWith("/twa") || p === "/health" || p.startsWith("/proxy-store")) return next();
    const auth = (req.headers.authorization ?? "") as string;
    if (auth !== `Bearer ${API_SECRET}`) {
      return void res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });
}

app.use("/api", router);

// ── PostgreSQL table guard — runs on every boot (dev + production) ───────────
// Ensures critical tables exist even if a bad deployment migration dropped them.
// Logs CRITICAL warnings if bot-account session data or SQLite backup appears lost.
ensurePgTables().catch(err =>
  logger.error({ err }, "[pg-guard] Startup guard failed (non-fatal)"),
);

// ── Background watchdog: campaign completion + worker crash notifications ──
startWatchdog();

// ── Serve telegram-miniapp SPA ──
// Use import.meta.dirname so the path resolves correctly regardless of cwd
// (cwd differs when launched via start-api.sh vs pnpm run start from the package dir)
const WORKSPACE_ROOT = join(import.meta.dirname, "../../..");
const FRONTEND_DIST = join(WORKSPACE_ROOT, "artifacts", "telegram-miniapp", "dist");
if (existsSync(FRONTEND_DIST)) {
  // Static assets (JS/CSS) — Vite hashes them so long-term caching is safe
  app.use(express.static(FRONTEND_DIST, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        // index.html must never be cached — it references hashed asset filenames
        // that change on every build. Caching it causes "old layout" in production.
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }));
  app.get("/*path", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(join(FRONTEND_DIST, "index.html"));
  });
  logger.info({ path: FRONTEND_DIST }, "Serving frontend static files");
}

export default app;
