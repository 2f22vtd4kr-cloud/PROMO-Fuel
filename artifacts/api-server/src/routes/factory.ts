import { Router, type Request, type Response } from "express";

const router = Router();

const SMSPOOL_STOCK_URL    = "https://api.smspool.net/request/countrystock";
const SMSPOOL_BALANCE_URL  = "https://api.smspool.net/request/balance";
const CACHE_TTL_MS = 60_000;

interface CountryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

const _cache = new Map<string, { ts: number; data: CountryItem[] }>();

/**
 * GET /api/factory/config
 *
 * Returns server-level factory configuration visible to the frontend.
 * Never exposes the actual key value — only its existence.
 */
router.get("/config", (_req: Request, res: Response) => {
  const hasSmsPoolKey = Boolean(process.env["SMSPOOL_API_KEY"]?.trim());
  return void res.json({ has_smspool_key: hasSmsPoolKey });
});

/**
 * GET /api/factory/balance?api_key=KEY
 *
 * Returns SMSPool account balance and order history stats.
 * Falls back to SMSPOOL_API_KEY env var when api_key is omitted.
 */
router.get("/balance", async (req: Request, res: Response) => {
  const apiKey =
    String(req.query["api_key"] ?? process.env["SMSPOOL_API_KEY"] ?? "").trim();

  if (!apiKey) {
    return void res.status(400).json({ error: "api_key is required" });
  }

  try {
    const url = new URL(SMSPOOL_BALANCE_URL);
    url.searchParams.set("key", apiKey);

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) {
      return void res
        .status(502)
        .json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;

    if (!raw || typeof raw !== "object") {
      return void res.status(502).json({ error: "Unexpected SMSPool response" });
    }

    const obj = raw as Record<string, unknown>;

    // SMSPool balance endpoint returns { balance, request, success, ... }
    const balance = obj["balance"] !== undefined ? Number(obj["balance"]) : null;
    const requests = obj["request"] !== undefined ? Number(obj["request"]) : null;
    const success  = obj["success"]  !== undefined ? Number(obj["success"])  : null;

    if (balance === null && obj["error"]) {
      return void res.status(401).json({ error: String(obj["error"]) });
    }

    return void res.json({ balance, requests, success, raw: obj });
  } catch (err: unknown) {
    return void res
      .status(502)
      .json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

/**
 * GET /api/factory/countries?api_key=KEY&service=11
 *
 * Fetches real-time Telegram number stock + price from SMSPool.
 * Results are cached in-memory for 60 s per API key.
 * Implemented directly in Node.js so it works even when the Python
 * supervisor is not running.
 * When api_key is omitted, falls back to SMSPOOL_API_KEY env var.
 */
router.get("/countries", async (req: Request, res: Response) => {
  const apiKey =
    String(req.query["api_key"] ?? process.env["SMSPOOL_API_KEY"] ?? "").trim();
  const service = String(req.query["service"] ?? "11").trim();

  if (!apiKey) {
    return void res.status(400).json({ error: "api_key is required" });
  }

  const cacheKey = `${apiKey}:${service}`;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return void res.json({ countries: cached.data, cached: true, ttl: 60 });
  }

  try {
    const url = new URL(SMSPOOL_STOCK_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("service", service);

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      return void res
        .status(502)
        .json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;

    const items: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({
            id: k,
            ...(typeof v === "object" && v !== null ? v : {}),
          }))
        : [];

    const countries: CountryItem[] = [];
    for (const c of items) {
      if (!c || typeof c !== "object") continue;
      const obj = c as Record<string, unknown>;
      const stock =
        Number(
          obj["stock"] ?? obj["quantity"] ?? obj["count"] ?? 0,
        ) || 0;
      const price =
        Number(obj["price"] ?? obj["cost"] ?? obj["rate"] ?? 0) || 0;
      const name = String(
        obj["name"] ?? obj["country"] ?? obj["countryName"] ?? "",
      );
      const id = String(
        obj["ID"] ?? obj["id"] ?? obj["country_id"] ?? "",
      );
      if (!name || stock === 0) continue;
      countries.push({ id, name, stock, price });
    }

    countries.sort((a, b) => a.price - b.price || b.stock - a.stock);

    _cache.set(cacheKey, { ts: Date.now(), data: countries });
    return void res.json({ countries, cached: false, ttl: 60 });
  } catch (err: unknown) {
    return void res
      .status(502)
      .json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

export default router;
