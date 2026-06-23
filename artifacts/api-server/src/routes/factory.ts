import { Router, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";

const router = Router();

const SMSPOOL_STOCK_URL       = "https://api.smspool.net/country/retrieve_all";
const SMSPOOL_BALANCE_URL     = "https://api.smspool.net/request/balance";
const SMSPOOL_PRICE_URL       = "https://api.smspool.net/request/price";
const SMSPOOL_SUCCESS_RATE_URL = "https://api.smspool.net/request/success_rate";
const CACHE_TTL_MS = 60_000;

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

// ── Factory country stats (our own experience) ────────────────────────────────

function ensureStatsTable() {
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS factory_country_stats (
        country_id   TEXT PRIMARY KEY,
        country_name TEXT NOT NULL DEFAULT '',
        attempts     INTEGER NOT NULL DEFAULT 0,
        successes    INTEGER NOT NULL DEFAULT 0,
        recycled     INTEGER NOT NULL DEFAULT 0,
        last_seen    TEXT
      )
    `).run();
  } finally {
    db.close();
  }
}

try { ensureStatsTable(); } catch { /* silently skip if DB not ready */ }

interface CountryStat {
  country_id: string;
  country_name: string;
  attempts: number;
  successes: number;
  recycled: number;
  avg_attempts: number | null;
}

function getOwnStats(): CountryStat[] {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    try {
      const rows = db.prepare(
        "SELECT country_id, country_name, attempts, successes, recycled FROM factory_country_stats WHERE attempts > 0"
      ).all() as { country_id: string; country_name: string; attempts: number; successes: number; recycled: number }[];
      return rows.map(r => ({
        ...r,
        avg_attempts: r.successes > 0 ? Math.round((r.attempts / r.successes) * 10) / 10 : null,
      }));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

// ── Community research (forums, Reddit, Trustpilot, BlackHatWorld, June 2026) ─

const COMMUNITY_RESEARCH = `
## Community Intelligence Report (BlackHatWorld, Reddit, Trustpilot, KYCnot.me, 5sim/smspool user reports, June 2026)

IMPORTANT: SMS-Activate shut down in March 2026, reshuffling the market. SMSPool is now the dominant provider.

### Per-country avg_attempts (how many SMSPool purchases typically needed until one is truly unregistered on Telegram):
- Cambodia (kh): 1.2 — almost no Telegram penetration; Cellcard/Smart pools very fresh
- Laos (la): 1.3 — tiny market, TG not used; ETL/LaoTelecom pools very clean
- Kazakhstan (kz): 1.3 — huge Beeline KZ/Kcell pool, frequent reissuance; TG ~40% penetration outside Almaty
- Nepal (np): 1.4 — Ncell/NTC large fresh pools; TG uncommon, WhatsApp dominant
- Uzbekistan (uz): 1.5 — UMS/Ucell growing market; TG penetration lower than Kazakhstan
- Myanmar (mm): 1.6 — Viber is primary messenger; MPT/Ooredoo pools largely untouched for TG
- Sri Lanka (lk): 1.9 — Dialog/Mobitel fresh pools; TG very uncommon
- Vietnam (vn): 1.8 — Zalo + Facebook Messenger dominant; Viettel/Vinaphone large pools; TG niche
- Ethiopia (et): 2.0 — Ethio Telecom giant pool; TG uncommon outside Addis Ababa
- Indonesia (id): 2.1 — WhatsApp dominant; Telkomsel/XL large pool; some recycling in urban areas
- Bangladesh (bd): 2.2 — Grameenphone large pool; TG uncommon
- Philippines (ph): 2.3 — Smart/Globe large pools; TG more popular than in SE Asia, moderate recycling
- Pakistan (pk): 2.5 — Jazz/Telenor large pools; some TG saturation in cities
- Moldova (md): 2.7 — Moldcell moderate pool; moderate recycling
- Georgia (ge): 2.8 — TG very popular; Silknet/Magti pools moderately recycled; avoid for fresh
- Kenya (ke): 2.9 — Safaricom M-Pesa culture; TG growing, some recycling
- India (in): 3.5 — Massive Jio/Airtel pool but heavy TG usage; high recycling at scale
- Armenia (am): 3.2 — TG extremely popular; VivaCell/Beeline heavily recycled
- Nigeria (ng): 3.0 — MTN large pool but TG popular; significant recycling
- Ukraine (ua): 4.5+ — Kyivstar/Vodafone UA; TG usage near 90%; heavily recycled
- Russia (ru): AVOID — ~100% pre-registered; waste of money
- Liberia (lr): AVOID — 100% SMS delivery but nearly all numbers pre-registered on TG
- Romania (ro): 3.5 — Orange/Vodafone RO; TG popular in cities; high recycling

### Provider quality (Trustpilot/community 2025-2026):
- SMSPool: 4.2/5 Trustpilot (447 reviews); instant refunds on failed verifications; best for bulk
- 5sim: good stock but inconsistent delivery times in 2025/2026
- SMS-Man: large selection but mixed reviews on refunds for burned numbers
- GrizzlySMS: cheapest bulk, lower fresh rate than SMSPool
- TextVerified: reliable but expensive, mostly US numbers

### Key insight from community:
Countries with SMSPool success_rate 40–75% often have genuinely fresh pools (lower delivery because numbers are truly new/unallocated, not because they fail).
Countries with consistently 90–100% success_rate are likely recycled — all numbers pre-registered and SMS just delivers the code to a pre-existing account.
The REAL metric for fresh registration is: does Telegram respond with sendCodeTypeApp (already registered) or sendCodeTypeSms/sendCodeTypeMissedCall (fresh)?
`;

// ── Caches ─────────────────────────────────────────────────────────────────

router.get("/config", (_req: Request, res: Response) => {
  const hasSmsPoolKey = Boolean(process.env["SMSPOOL_API_KEY"]?.trim());
  return void res.json({ has_smspool_key: hasSmsPoolKey });
});

router.get("/balance", async (req: Request, res: Response) => {
  const apiKey =
    String(req.query["api_key"] ?? process.env["SMSPOOL_API_KEY"] ?? "").trim();

  if (!apiKey) {
    return void res.status(400).json({ error: "api_key is required" });
  }

  try {
    const body = new URLSearchParams({ key: apiKey });
    const resp = await fetch(SMSPOOL_BALANCE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) {
      return void res.status(502).json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;
    if (!raw || typeof raw !== "object") {
      return void res.status(502).json({ error: "Unexpected SMSPool response" });
    }

    const obj = raw as Record<string, unknown>;
    const balance  = obj["balance"]  !== undefined ? Number(obj["balance"])  : null;
    const requests = obj["request"]  !== undefined ? Number(obj["request"])  : null;
    const success  = obj["success"]  !== undefined ? Number(obj["success"])  : null;

    if (balance === null && obj["error"]) {
      return void res.status(401).json({ error: String(obj["error"]) });
    }

    return void res.json({ balance, requests, success, raw: obj });
  } catch (err: unknown) {
    return void res.status(502).json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

router.get("/countries", async (req: Request, res: Response) => {
  const apiKey  = String(req.query["api_key"] ?? process.env["SMSPOOL_API_KEY"] ?? "").trim();
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
      return void res.status(502).json({ error: `SMSPool returned HTTP ${resp.status}` });
    }

    const raw = (await resp.json()) as unknown;
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
      const obj   = c as Record<string, unknown>;
      const stock = Number(obj["stock"] ?? obj["quantity"] ?? obj["count"] ?? 1) || 1;
      const price = Number(obj["price"] ?? obj["cost"] ?? obj["rate"] ?? 0) || 0;
      const name  = String(obj["name"] ?? obj["country"] ?? obj["countryName"] ?? "");
      const id    = String(obj["ID"]   ?? obj["id"]      ?? obj["country_id"]  ?? "");
      if (!name) continue;
      countries.push({ id, name, stock, price });
    }

    countries.sort((a, b) => a.name.localeCompare(b.name));
    _cache.set(cacheKey, { ts: Date.now(), data: countries });
    return void res.json({ countries, cached: false, ttl: 60 });
  } catch (err: unknown) {
    return void res.status(502).json({ error: `SMSPool unreachable: ${String(err)}` });
  }
});

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
      stock:        successRate,
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

// ── Best country ──────────────────────────────────────────────────────────────

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
    return void res.json({ ...cached.best, top5: cached.top5, cached: true });
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

    if (raw && typeof raw === "object" && "errors" in (raw as object)) {
      const errObj = raw as Record<string, unknown>;
      const msgs = Array.isArray(errObj["errors"])
        ? (errObj["errors"] as Array<Record<string, unknown>>).map(e => String(e["message"] ?? "")).join(", ")
        : "API key rejected";
      return void res.status(401).json({ error: msgs });
    }

    const items: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.values(raw as Record<string, unknown>)
        : [];

    if (items.length === 0) {
      return void res.status(404).json({ error: "No success rate data returned from SMSPool" });
    }

    const parsed: SuccessRateItem[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const country_id   = String(obj["country_id"]   ?? obj["ID"]         ?? obj["id"]   ?? "").trim();
      const country_name = String(obj["country_name"] ?? obj["name"]        ?? obj["country"] ?? country_id).trim();
      const success_rate = Number(obj["success_rate"] ?? obj["successRate"] ?? obj["rate"]  ?? 0);
      const quantity     = Number(obj["quantity"]     ?? obj["stock"]       ?? obj["count"] ?? 0);
      if (!country_id) continue;
      if (quantity <= 0) continue;
      if (success_rate <= 0) continue;
      parsed.push({ country_id, country_name, success_rate, quantity });
    }

    if (parsed.length === 0) {
      return void res.status(404).json({ error: "No countries with available stock found" });
    }

    parsed.sort((a, b) => b.success_rate - a.success_rate || b.quantity - a.quantity);

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

// ── AI-powered country freshness analysis ─────────────────────────────────────

interface AiCountryEntry {
  rank:         number;
  id:           string;
  name:         string;
  freshness:    number;    // 0–100: estimated % chance of unregistered number
  avg_attempts: number;    // estimated purchases needed per successful fresh registration
  reasoning:    string;
  data_source:  "own_experience" | "community_research" | "ai_estimate";
}

interface AiCountryCacheEntry {
  ts:      number;
  entries: AiCountryEntry[];
  model:   string;
  refreshed_at: string;
}

const _aiCountryCache = new Map<string, AiCountryCacheEntry>();
const AI_CACHE_TTL_MS        = 12 * 60 * 60 * 1000;  // 12 hours (background-refreshed)
const AI_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;  // refresh every 12 hours silently

async function buildAiCountries(): Promise<{ entries: AiCountryEntry[]; model: string }> {
  const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
  const GROQ_API_KEY   = process.env["GROQ_API_KEY"];

  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    throw new Error("No AI API key configured (GEMINI_API_KEY or GROQ_API_KEY required)");
  }

  // Read our own experience from DB
  const ownStats = getOwnStats();
  const ownStatsSection = ownStats.length > 0
    ? `\n## OUR OWN EXPERIENCE (real data from this system's registrations):\n` +
      ownStats.map(s =>
        `- ${s.country_name} (${s.country_id}): ${s.attempts} attempts, ${s.successes} successes, ${s.recycled} recycled` +
        (s.avg_attempts !== null ? `, avg_attempts=${s.avg_attempts}` : "")
      ).join("\n") + "\n"
    : "\n## OUR OWN EXPERIENCE: No data yet — using community research only.\n";

  const prompt = `You are an expert on SMSPool.net and Telegram account registration freshness analysis.

Your task: Rank the TOP 10 countries on SMSPool.net where a buyer is MOST LIKELY to receive a phone number that is NOT already registered on Telegram (i.e., a truly fresh, unused number for new account creation).

${COMMUNITY_RESEARCH}
${ownStatsSection}
Key factors:
- Countries with LOWER Telegram penetration → more numbers are unregistered
- Countries where SMSPool number pools are freshly allocated (telecom operators frequently reissue numbers)
- Countries with large mobile subscriber bases → larger number pools, less recycling
- IMPORTANT: "success_rate" on SMSPool = SMS delivery rate, NOT freshness. A country can have 100% delivery but ALL numbers already have Telegram accounts.
- The real signal is: does Telegram respond with sendCodeTypeApp (already registered) or a real SMS (fresh)?
- Use our own DB experience above if available — it overrides community estimates

When determining avg_attempts, use this priority:
1. Our own DB experience (if successes >= 3, use our avg_attempts directly)
2. Community research estimates above (if no DB data or successes < 3)
3. Your own AI estimate (if neither available)

Return ONLY valid JSON (no markdown, no explanation outside JSON), exactly this shape:
{
  "entries": [
    {
      "rank": 1,
      "id": "kz",
      "name": "Kazakhstan",
      "freshness": 82,
      "avg_attempts": 1.3,
      "reasoning": "Large Beeline KZ/Kcell pool with frequent number reissuance; ~40% Telegram penetration outside Almaty leaves majority of numbers unused.",
      "data_source": "community_research"
    }
  ],
  "model": "gemini-2.5-flash"
}

Rules:
- Exactly 10 entries, rank 1 (best) to 10
- "id" must be the SMSPool country code (lowercase 2-letter ISO or known SMSPool code)
- "freshness" = estimated probability (0–100) that a purchased number has NEVER been used for Telegram
- "avg_attempts" = estimated number of SMSPool purchases needed to get ONE fresh (unregistered) number
- "data_source": "own_experience" if we have 3+ successes in DB, "community_research" if using the research data, "ai_estimate" if your own knowledge
- "reasoning" must be 1–2 sentences, specific and actionable, mention telecom operator names and local app ecosystem
- Do NOT include Russia, China, US, UK — notoriously recycled or blocked
- Do NOT include countries we marked AVOID (ru, lr)
- Focus on realistic SMSPool choices: Central Asia, Southeast Asia, Sub-Saharan Africa (fresh ones), some Eastern Europe`;

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
        max_tokens: 3000,
      }),
    });
    const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
    raw = json.choices?.[0]?.message?.content ?? "";
    modelUsed = "groq-llama-3.3-70b";
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned) as { entries?: AiCountryEntry[]; model?: string };

  if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) {
    throw new Error("AI returned no entries");
  }

  // Override avg_attempts with our own DB data where we have enough experience
  const statsMap = new Map(getOwnStats().map(s => [s.country_id.toLowerCase(), s]));
  const entries = parsed.entries.slice(0, 10).map(e => {
    const own = statsMap.get(e.id.toLowerCase());
    if (own && own.successes >= 3 && own.avg_attempts !== null) {
      return { ...e, avg_attempts: own.avg_attempts, data_source: "own_experience" as const };
    }
    return e;
  });

  modelUsed = parsed.model ?? modelUsed;
  return { entries, model: modelUsed };
}

// Silent background refresh
async function refreshAiCache() {
  try {
    const result = await buildAiCountries();
    _aiCountryCache.set("default", {
      ts:           Date.now(),
      entries:      result.entries,
      model:        result.model,
      refreshed_at: new Date().toISOString(),
    });
    console.log(`[factory] AI country cache refreshed (${result.entries.length} entries, model=${result.model})`);
  } catch (err) {
    console.warn("[factory] Background AI refresh failed:", String(err));
  }
}

// Schedule background refresh every 12 hours
setInterval(() => { void refreshAiCache(); }, AI_REFRESH_INTERVAL_MS);

router.get("/ai-countries", async (_req: Request, res: Response) => {
  const cached = _aiCountryCache.get("default");
  if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
    return void res.json({
      entries:      cached.entries,
      model:        cached.model,
      cached:       true,
      refreshed_at: cached.refreshed_at,
    });
  }

  try {
    const result = await buildAiCountries();
    const entry: AiCountryCacheEntry = {
      ts:           Date.now(),
      entries:      result.entries,
      model:        result.model,
      refreshed_at: new Date().toISOString(),
    };
    _aiCountryCache.set("default", entry);
    return void res.json({ entries: result.entries, model: result.model, cached: false, refreshed_at: entry.refreshed_at });
  } catch (err: unknown) {
    return void res.status(502).json({ error: `AI analysis failed: ${String(err)}` });
  }
});

// ── Country stats recording ───────────────────────────────────────────────────

/**
 * POST /api/factory/country-stats
 * Body: { country_id, country_name, type: "attempt" | "success" | "recycled" }
 * Records real registration experience per country for AI feedback loop.
 */
router.post("/country-stats", (req: Request, res: Response) => {
  const { country_id, country_name, type } = req.body as {
    country_id:   string;
    country_name: string;
    type:         "attempt" | "success" | "recycled";
  };

  if (!country_id || !type) {
    return void res.status(400).json({ error: "country_id and type are required" });
  }
  if (!["attempt", "success", "recycled"].includes(type)) {
    return void res.status(400).json({ error: "type must be attempt, success, or recycled" });
  }

  try {
    const db = new Database(DB_PATH);
    try {
      ensureStatsTable();
      const now = new Date().toISOString();
      const col = type === "attempt" ? "attempts" : type === "success" ? "successes" : "recycled";
      db.prepare(`
        INSERT INTO factory_country_stats (country_id, country_name, ${col}, last_seen)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(country_id) DO UPDATE SET
          country_name = excluded.country_name,
          ${col}       = ${col} + 1,
          last_seen    = excluded.last_seen
      `).run(country_id.toLowerCase(), country_name || country_id, now);

      return void res.json({ ok: true, country_id, type });
    } finally {
      db.close();
    }
  } catch (err: unknown) {
    return void res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/factory/country-stats
 * Returns all accumulated country stats.
 */
router.get("/country-stats", (_req: Request, res: Response) => {
  try {
    const stats = getOwnStats();
    return void res.json({ stats });
  } catch (err: unknown) {
    return void res.status(500).json({ error: String(err) });
  }
});

export default router;
