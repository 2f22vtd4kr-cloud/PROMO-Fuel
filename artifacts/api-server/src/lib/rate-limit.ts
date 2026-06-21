import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

interface WindowEntry {
  count: number;
  windowStart: number;
}

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  skipInDev?: boolean;
}

const NODE_ENV = process.env["NODE_ENV"] ?? "development";

function createLimiter(opts: RateLimiterOptions) {
  const store = new Map<string, WindowEntry>();

  // Purge stale entries every 5× the window to keep memory bounded
  setInterval(() => {
    const cutoff = Date.now() - opts.windowMs;
    for (const [key, entry] of store) {
      if (entry.windowStart < cutoff) store.delete(key);
    }
  }, opts.windowMs * 5).unref();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    if (opts.skipInDev && NODE_ENV === "development") return next();

    // Prefer forwarded IP (Replit proxy) then socket address
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now - entry.windowStart >= opts.windowMs) {
      entry = { count: 1, windowStart: now };
      store.set(ip, entry);
      return next();
    }

    entry.count += 1;

    if (entry.count > opts.max) {
      const retryAfterSec = Math.ceil((opts.windowMs - (now - entry.windowStart)) / 1000);
      logger.warn({ ip, path: req.path, count: entry.count }, "[rate-limit] blocked");
      res.setHeader("Retry-After", String(retryAfterSec));
      res.setHeader("X-RateLimit-Limit",     String(opts.max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset",
        new Date(entry.windowStart + opts.windowMs).toUTCString());
      return void res.status(429).json({ error: opts.message });
    }

    res.setHeader("X-RateLimit-Limit",     String(opts.max));
    res.setHeader("X-RateLimit-Remaining", String(opts.max - entry.count));
    next();
  };
}

// ── Pre-built limiters ────────────────────────────────────────────────────────

const TWA_MAX  = parseInt(process.env["RATE_LIMIT_TWA_MAX"]  ?? "120");  // per minute
const AUTH_MAX = parseInt(process.env["RATE_LIMIT_AUTH_MAX"] ?? "10");   // per 15 min
const API_MAX  = parseInt(process.env["RATE_LIMIT_API_MAX"]  ?? "300");  // per minute

/**
 * Mini App consumer routes — 120 req/min per IP (generous for real users).
 * Skipped in development.
 */
export const twaLimiter = createLimiter({
  windowMs:  60_000,
  max:       TWA_MAX,
  message:   "Слишком много запросов. Попробуйте через минуту.",
  skipInDev: true,
});

/**
 * Login endpoint — 10 attempts per 15 min per IP (blocks credential stuffing).
 * Active in all environments.
 */
export const authLimiter = createLimiter({
  windowMs:  15 * 60_000,
  max:       AUTH_MAX,
  message:   "Слишком много попыток входа. Попробуйте через 15 минут.",
  skipInDev: false,
});

/**
 * All other Bearer-protected CRM/admin routes — 300 req/min per IP.
 * Skipped in development.
 */
export const apiLimiter = createLimiter({
  windowMs:  60_000,
  max:       API_MAX,
  message:   "Слишком много запросов. Попробуйте через минуту.",
  skipInDev: true,
});
