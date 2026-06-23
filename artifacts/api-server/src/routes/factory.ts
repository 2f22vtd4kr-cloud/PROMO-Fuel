import { Router, type Request, type Response } from "express";

const router = Router();

const SMSPOOL_STOCK_URL    = "https://api.smspool.net/country/retrieve_all";
const SMSPOOL_BALANCE_URL  = "https://api.smspool.net/request/balance";
const SMSPOOL_PRICE_URL    = "https://api.smspool.net/request/price";
const CACHE_TTL_MS = 60_000;

// Telegram service ID on SMSPool (verified: 907 = Telegram, NOT 11 which is 7-Eleven)
const TELEGRAM_SERVICE_ID = "907";

interface CountryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface ServiceStockItem {
  available: boolean;
  stock: number;
  price: number;
  service_name: string;
  cached: boolean;
}

const _cache        = new Map<string, { ts: number; data: CountryItem[] }>();
const _serviceCache = new Map<string, { ts: number; data: ServiceStockItem }>();

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
    // SMSPool balance endpoint is POST (not GET)
    const body = new URLSearchParams({ key: apiKey });
    const resp = await fetch(SMSPOOL_BALANCE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
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
  const service = String(req.query["service"] ?? TELEGRAM_SERVICE_ID).trim();

  if (!apiKey) {
    return void res.status(400).json({ error: "api_key is required" });
  }

  const cacheKey = `${apiKey}:${service}`;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return void res.json({ countries: cached.data, cached: true, ttl: 60 });
  }

  try {
    const body = new URLSearchParams({ key: apiKey, service });
    const resp = await fetch(SMSPOOL_STOCK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      return void res
        .status(502)
        .json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;

    // country/retrieve_all returns array of {ID, name} objects
    const items: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && !("success" in (raw as object))
        ? Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({
            id: k,
            ...(typeof v === "object" && v !== null ? v : {}),
          }))
        : [];

    if (items.length === 0 && raw && typeof raw === "object" && "errors" in (raw as object)) {
      const errObj = raw as Record<string, unknown>;
      const msgs = Array.isArray(errObj["errors"])
        ? (errObj["errors"] as Array<Record<string, unknown>>).map(e => String(e["message"] ?? "")).join(", ")
        : "API key rejected";
      return void res.status(401).json({ error: msgs });
    }

    const countries: CountryItem[] = [];
    for (const c of items) {
      if (!c || typeof c !== "object") continue;
      const obj = c as Record<string, unknown>;
      const stock = Number(obj["stock"] ?? obj["quantity"] ?? obj["count"] ?? 1) || 1;
      const price = Number(obj["price"] ?? obj["cost"] ?? obj["rate"] ?? 0) || 0;
      const name = String(obj["name"] ?? obj["country"] ?? obj["countryName"] ?? "");
      const id = String(obj["ID"] ?? obj["id"] ?? obj["country_id"] ?? "");
      if (!name) continue;
      countries.push({ id, name, stock, price });
    }

    countries.sort((a, b) => a.name.localeCompare(b.name));

    _cache.set(cacheKey, { ts: Date.now(), data: countries });
    return void res.json({ countries, cached: false, ttl: 60 });
  } catch (err: unknown) {
    return void res
      .status(502)
      .json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

/**
 * GET /api/factory/service-stock?api_key=KEY&country=COUNTRY_ID&service=907
 *
 * Returns real-time price + success rate for Telegram (service 907) in a specific
 * country using SMSPool GET /request/price.
 * stock field = success_rate (0-100) — used as quality indicator in the UI.
 * Results are cached 60 s per api_key+country+service combination.
 */
router.get("/service-stock", async (req: Request, res: Response) => {
  const apiKey  = String(req.query["api_key"] ?? process.env["SMSPOOL_API_KEY"] ?? "").trim();
  const country = String(req.query["country"] ?? "").trim();
  const service = String(req.query["service"] ?? TELEGRAM_SERVICE_ID).trim();

  if (!apiKey)  return void res.status(400).json({ error: "api_key is required" });
  if (!country) return void res.status(400).json({ error: "country is required" });

  const cacheKey = `${apiKey}:${country}:${service}`;
  const cached = _serviceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return void res.json({ ...cached.data, cached: true });
  }

  try {
    // Use /request/price — returns actual price + success_rate; must be POST per SMSPool API spec
    const body = new URLSearchParams({ key: apiKey, service, country });
    const resp = await fetch(SMSPOOL_PRICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) {
      return void res.status(502).json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;

    if (raw && typeof raw === "object" && "success" in (raw as object)) {
      const errObj = raw as Record<string, unknown>;
      if (errObj["success"] === 0) {
        const msgs = Array.isArray(errObj["errors"])
          ? (errObj["errors"] as Array<Record<string, unknown>>).map(e => String(e["message"] ?? "")).join(", ")
          : "Invalid API key";
        return void res.status(401).json({ error: msgs });
      }
    }

    const obj         = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
    const price       = Number(obj["price"] ?? 0);
    const successRate = Number(obj["success_rate"] ?? 0);

    const result: ServiceStockItem = {
      available:    price > 0,
      stock:        successRate,   // success_rate (0-100) used as quality indicator
      price,
      service_name: "Telegram",
      cached:       false,
    };

    _serviceCache.set(cacheKey, { ts: Date.now(), data: result });
    return void res.json(result);
  } catch (err: unknown) {
    return void res.status(502).json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

export default router;
