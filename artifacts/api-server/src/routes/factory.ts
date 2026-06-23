import { Router, type Request, type Response } from "express";

const router = Router();

const SMSPOOL_STOCK_URL       = "https://api.smspool.net/country/retrieve_all";
const SMSPOOL_BALANCE_URL     = "https://api.smspool.net/request/balance";
const SMSPOOL_PRICE_URL       = "https://api.smspool.net/request/price";
const SMSPOOL_SUCCESS_RATE_URL = "https://api.smspool.net/request/success_rate";
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

/**
 * GET /api/factory/best-country?api_key=KEY
 *
 * Queries SMSPool /request/success_rate for Telegram (service 907) across
 * all available countries, then returns the single country with the highest
 * success_rate that also has stock available.
 * Result is cached 60 s per API key.
 * Falls back to SMSPOOL_API_KEY env var when api_key is omitted.
 */

interface SuccessRateItem {
  country_id:   string;
  country_name: string;
  success_rate: number;
  quantity:     number;
}

interface BestCountryResult {
  id:           string;
  name:         string;
  success_rate: number;
  quantity:     number;
  rank:         number;
}

const _bestCountryCache = new Map<string, { ts: number; best: BestCountryResult; top5: BestCountryResult[] }>();

router.get("/best-country", async (req: Request, res: Response) => {
  const apiKey  = String(req.query["api_key"] ?? process.env["SMSPOOL_API_KEY"] ?? "").trim();
  const service = String(req.query["service"] ?? TELEGRAM_SERVICE_ID).trim();

  if (!apiKey) {
    return void res.status(400).json({ error: "api_key is required" });
  }

  const cacheKey = `${apiKey}:${service}`;
  const cached = _bestCountryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return void res.json({ ...cached.data, cached: true });
  }

  try {
    const body = new URLSearchParams({ key: apiKey, service });
    const resp = await fetch(SMSPOOL_SUCCESS_RATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      return void res.status(502).json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;

    // SMSPool returns either an array or object with an "errors" key on failure
    if (raw && typeof raw === "object" && "errors" in (raw as object)) {
      const errObj = raw as Record<string, unknown>;
      const msgs = Array.isArray(errObj["errors"])
        ? (errObj["errors"] as Array<Record<string, unknown>>).map(e => String(e["message"] ?? "")).join(", ")
        : "API key rejected";
      return void res.status(401).json({ error: msgs });
    }

    // Normalise to array — SMSPool may return an array or a keyed object
    const items: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.values(raw as Record<string, unknown>)
        : [];

    if (items.length === 0) {
      return void res.status(404).json({ error: "No success rate data returned from SMSPool" });
    }

    // Parse and filter to countries with stock > 0
    const parsed: SuccessRateItem[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;

      const country_id   = String(obj["country_id"]   ?? obj["ID"]         ?? obj["id"]   ?? "").trim();
      const country_name = String(obj["country_name"] ?? obj["name"]        ?? obj["country"] ?? country_id).trim();
      const success_rate = Number(obj["success_rate"] ?? obj["successRate"] ?? obj["rate"]  ?? 0);
      const quantity     = Number(obj["quantity"]     ?? obj["stock"]       ?? obj["count"] ?? 0);

      if (!country_id) continue;
      if (quantity <= 0) continue;          // skip out-of-stock countries
      if (success_rate <= 0) continue;      // skip zero-rate entries

      parsed.push({ country_id, country_name, success_rate, quantity });
    }

    if (parsed.length === 0) {
      return void res.status(404).json({ error: "No countries with available stock found" });
    }

    // Sort by success_rate desc, break ties by quantity
    parsed.sort((a, b) =>
      b.success_rate - a.success_rate || b.quantity - a.quantity
    );

    const top5: BestCountryResult[] = parsed.slice(0, 5).map((c, i) => ({
      id:           c.country_id,
      name:         c.country_name,
      success_rate: c.success_rate,
      quantity:     c.quantity,
      rank:         i + 1,
    }));

    const best = top5[0]!;
    _bestCountryCache.set(cacheKey, { ts: Date.now(), best, top5 });
    return void res.json({ ...best, top5, cached: false });
  } catch (err: unknown) {
    return void res.status(502).json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

// ── AI-powered country freshness analysis ────────────────────────────────────

interface AiCountryEntry {
  rank:        number;
  id:          string;   // SMSPool country code / ID
  name:        string;
  freshness:   number;   // 0–100 estimated chance of unregistered number
  reasoning:   string;   // 1–2 sentence justification
}

interface AiCountryCacheEntry {
  ts:      number;
  entries: AiCountryEntry[];
  model:   string;
}

const _aiCountryCache = new Map<string, AiCountryCacheEntry>();
const AI_CACHE_TTL_MS = 30 * 60_000; // 30 min — AI knowledge doesn't change often

router.get("/ai-countries", async (_req: Request, res: Response) => {
  const cached = _aiCountryCache.get("default");
  if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
    return void res.json({ entries: cached.entries, model: cached.model, cached: true });
  }

  const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
  const GROQ_API_KEY   = process.env["GROQ_API_KEY"];

  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    return void res.status(503).json({ error: "No AI API key configured (GEMINI_API_KEY or GROQ_API_KEY required)" });
  }

  const prompt = `You are an expert on SMSPool.net and Telegram account registration.

Your task: Rank the TOP 10 countries on SMSPool.net where a buyer is MOST LIKELY to receive a phone number that is NOT already registered on Telegram (i.e., a truly fresh, unused number for new account creation).

Key factors to consider:
- Countries with LOWER Telegram penetration/adoption → more numbers are unregistered
- Countries where SMSPool number pools are freshly allocated (telecom operators frequently reissue numbers)
- Countries with large mobile subscriber bases → larger number pools, less recycling
- Avoid countries notorious for recycled/resold Telegram numbers (e.g., Liberia, some African nations that show 100% SMS delivery but numbers are pre-owned)
- Consider real-world SMSPool user reports about registration success rates for new accounts (not SMS delivery rate, which is different)

Important distinction: "Success rate" on SMSPool = SMS delivery rate, NOT whether the number is unused. A country can have 100% delivery but ALL numbers already have Telegram accounts.

Return ONLY valid JSON (no markdown, no explanation outside the JSON), exactly this shape:
{
  "entries": [
    {
      "rank": 1,
      "id": "KZ",
      "name": "Kazakhstan",
      "freshness": 82,
      "reasoning": "Large telecom market with frequent number reissuance; relatively low Telegram penetration outside major cities."
    }
  ],
  "model": "gemini-2.5-flash"
}

Rules:
- Exactly 10 entries, rank 1 (best) to 10
- "id" must be the SMSPool country code (2-letter ISO or known SMSPool code)
- "freshness" is your estimated probability (0-100) that a purchased number has never been used for Telegram
- "reasoning" must be 1-2 sentences, specific and actionable
- Do NOT include countries like Russia, China, US, UK — they have notoriously recycled pools or are blocked
- Focus on realistic choices available on SMSPool: Central Asia, Southeast Asia, Africa (fresh-pool ones), Eastern Europe`;

  try {
    let raw = "";
    let modelUsed = "unknown";

    if (GEMINI_API_KEY) {
      const { GoogleGenAI } = await import("@google/genai");
      const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      raw = response.text ?? "";
      modelUsed = "gemini-2.5-flash";
    } else {
      // Fallback: Groq
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });
      const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
      raw = json.choices?.[0]?.message?.content ?? "";
      modelUsed = "groq-llama-3.3-70b";
    }

    // Strip markdown fences if any
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as { entries?: AiCountryEntry[]; model?: string };

    if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) {
      return void res.status(502).json({ error: "AI returned no entries" });
    }

    const entries = parsed.entries.slice(0, 10);
    modelUsed = parsed.model ?? modelUsed;
    _aiCountryCache.set("default", { ts: Date.now(), entries, model: modelUsed });
    return void res.json({ entries, model: modelUsed, cached: false });

  } catch (err: unknown) {
    return void res.status(502).json({ error: `AI analysis failed: ${String(err)}` });
  }
});

export default router;
