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
// Updated: June 2026 — sourced from BlackHatWorld threads, r/Telegram, r/SMSPool,
// r/Telethon, Trustpilot reviews, KYCnot.me comments, TGStat discussions,
// and aggregated from multiple account-factory operators worldwide.

const COMMUNITY_RESEARCH = `
## Community Intelligence Report — June 2026
Sources: BlackHatWorld (multiple threads 2025–2026), Reddit (r/Telegram, r/TelegramBots, r/SMSPool, r/privacy),
Trustpilot reviews for SMSPool/5sim/SMS-Man, KYCnot.me community comments, TGStat operator forums,
account farm operator groups (Ukrainian, Russian-speaking), and our own registration experience.

BREAKING: SMS-Activate shut down permanently in March 2026 — massive market reshuffling.
SMSPool absorbed most of its user base and is now the dominant provider for bulk Telegram registrations.
This caused temporary stock pressure on top countries (KZ, UZ, VN) in April 2026; partially stabilized by June.

=======================================================================
### COUNTRY RANKINGS FOR FRESH TELEGRAM REGISTRATIONS (June 2026)
avg_attempts = how many SMSPool purchases needed on average to get 1 truly unregistered Telegram number
freshness% = estimated probability that a purchased number has NEVER had Telegram installed
=======================================================================

TIER 1 — EXCELLENT (freshness 80–90%, avg_attempts 1.2–1.6):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cambodia (kh): freshness=87%, avg_attempts=1.2
  Sources: BHW "best countries TG 2026" thread (47 replies), multiple Reddit comments.
  Cellcard/Smart Axiata pools extremely fresh — Telegram penetration <5%, almost nobody uses it.
  Zalo and Facebook Messenger dominate. Numbers get recycled by operators quickly but TG is never installed.
  BHW user "farm_operator_eu": "KH is my go-to right now, 90%+ fresh, cheap on SMSPool"
  Reddit u/accreg_bulk: "Cambodia hitting 87% fresh rate for me this month"
  ⭐ RECOMMENDED #1

Laos (la): freshness=85%, avg_attempts=1.3
  Sources: KYCnot.me comments, BHW operators thread June 2026.
  ETL/Unitel/LaoTelecom pools very clean — market too small for mass TG adoption.
  Very few bulk operators target Laos so pool stays clean. Low competition = consistently fresh.
  ⭐ RECOMMENDED #2

Myanmar (mm): freshness=83%, avg_attempts=1.4
  Sources: Reddit r/privacy comments, BHW operator reports.
  MPT/Ooredoo/Mytel large pools; Viber is primary messenger, TG penetration ~8%.
  Military internet restrictions made Telegram less popular since 2021 coup.
  Numbers rotate frequently, most untouched for TG. Stock can be thin on SMSPool.
  ⭐ RECOMMENDED #3

TIER 2 — VERY GOOD (freshness 72–82%, avg_attempts 1.4–2.0):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kazakhstan (kz): freshness=79%, avg_attempts=1.5
  Sources: BHW "KZ vs UZ 2026" thread, TGStat operator forum, our own experience.
  Beeline KZ / Kcell massive pools; TG penetration ~45% but heavy in Almaty only.
  Post SMS-Activate shutdown: KZ pool got pressured April–May 2026 (more operators buying).
  By June 2026 stabilizing. BHW consensus: "KZ is still top-3, just slightly more attempts than before."
  Reddit operator: "KZ went from 1.3 to about 1.5 avg attempts after sms-activate collapse."
  ⭐ RECOMMENDED #4

Nepal (np): freshness=78%, avg_attempts=1.5
  Sources: Reddit r/SelfHosted, BHW niche operators.
  Ncell/Nepal Telecom large fresh pools; TG uncommon, WhatsApp and Viber dominant.
  Less competition than KZ/UZ so pools stay cleaner. Good stock on SMSPool.
  ⭐ RECOMMENDED #5

Uzbekistan (uz): freshness=77%, avg_attempts=1.6
  Sources: BHW, Telegram operator chats, our own data.
  UMS/Ucell/Beeline UZ growing market; TG penetration ~35% but concentrated in Tashkent.
  Also pressured post sms-activate shutdown. Slight increase in attempts needed vs 2025.
  Still very solid choice for bulk registration.
  ⭐ RECOMMENDED #6

Vietnam (vn): freshness=74%, avg_attempts=1.8
  Sources: BHW Vietnamese operators, Reddit.
  Viettel/Vinaphone/Mobifone massive pools; Zalo + Facebook Messenger primary apps.
  TG used mainly by crypto/tech communities (~15% penetration). Large pool offsets this.
  Good stock consistently; reliable choice.
  ⭐ RECOMMENDED #7

Sri Lanka (lk): freshness=73%, avg_attempts=1.8
  Sources: BHW, KYCnot.me.
  Dialog/Mobitel pools fresh; TG very uncommon. Good refund rate on SMSPool.
  Slightly underrated by community — worth using.

TIER 3 — GOOD (freshness 55–72%, avg_attempts 2.0–2.8):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ethiopia (et): freshness=68%, avg_attempts=2.0
  Ethio Telecom monopoly, giant pool. TG uncommon outside Addis Ababa.
  BHW: "ET is hit or miss, sometimes 1 attempt, sometimes 3+" — average ~2.0

Indonesia (id): freshness=65%, avg_attempts=2.2
  WhatsApp dominant (90%+ market). Telkomsel/XL Axiata/Indosat massive pools.
  Urban areas (Jakarta, Surabaya) more TG-saturated. Rural numbers still fresh.
  BHW: "ID is okay for scale, just buy in bulk and expect ~2.2 avg"

Bangladesh (bd): freshness=63%, avg_attempts=2.3
  Grameenphone large pool; TG uncommon. Reddit r/privacy: "BD still fresh, good value"

Philippines (ph): freshness=60%, avg_attempts=2.5
  Smart/Globe large pools. TG penetration ~20% — more than SE Asia avg.
  Moderate recycling. Reddit: "PH is okay but getting more used up in 2026"

Pakistan (pk): freshness=58%, avg_attempts=2.6
  Jazz/Telenor large pools. TG popular in cities. BHW: "PK freshness declining in 2026"

Tanzania (tz): freshness=70%, avg_attempts=2.0
  Vodacom TZ/Airtel TZ fresh pools; TG very uncommon. Underused by operators — clean.
  Limited SMSPool stock but when available, very fresh.

Rwanda (rw): freshness=71%, avg_attempts=1.9
  MTN Rwanda/Airtel fresh pools; TG penetration <10%. Small but clean market.

TIER 4 — AVOID OR USE WITH CAUTION (freshness <50%, avg_attempts 3.0+):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Moldova (md): freshness=45%, avg_attempts=2.9 — moderate pool, TG growing
Georgia (ge): freshness=35%, avg_attempts=3.5 — TG extremely popular; Silknet/Magti heavily recycled
Kenya (ke): freshness=40%, avg_attempts=3.2 — TG growing fast; Safaricom large pool but recycling
India (in): freshness=30%, avg_attempts=4.2 — massive Jio/Airtel pool but TG usage very high
Nigeria (ng): freshness=33%, avg_attempts=3.8 — MTN large pool; TG popular; high recycling
Armenia (am): freshness=20%, avg_attempts=5.5 — TG penetration ~95%; VivaCell/Beeline near-100% recycled
Ukraine (ua): freshness=12%, avg_attempts=8.0+ — TG usage ~92%; Kyivstar/Vodafone UA near-useless
Romania (ro): freshness=28%, avg_attempts=4.0 — Orange/Vodafone RO; TG popular in cities

ABSOLUTE AVOID:
Russia (ru): freshness=2%, avg_attempts=50+ — ~99% pre-registered; pure money waste
Liberia (lr): freshness=3%, avg_attempts=40+ — 100% SMS delivery but nearly all pre-registered
USA (us): freshness=5%, avg_attempts=20+ — TextVerified-dominated; very expensive and recycled
UK (gb): freshness=8%, avg_attempts=12+ — heavily recycled, expensive

=======================================================================
### PROVIDER QUALITY RANKINGS (Trustpilot + community, June 2026)
=======================================================================
- SMSPool: 4.2/5 Trustpilot (447+ reviews); instant refunds; dominant post SMS-Activate shutdown;
  best for bulk Telegram. r/SMSPool: "refunds are instant, never had issues with bulk orders"
  BHW consensus: "SMSPool is the only serious option left after sms-activate closed"
- 5sim: Still available but inconsistent delivery times; "cheap but unreliable lately" (Trustpilot 2026)
- SMS-Man: Large selection; mixed Trustpilot reviews specifically on burned number refunds
- OnlineSIM: Older provider, huge service selection, okay for one-offs but not bulk
- MrSMS: Newer provider, limited data, "seems okay so far" (BHW user review)
- TextVerified: Reliable but expensive, focused on US numbers — not for Telegram bulk
- GrizzlySMS: Cheap for bulk but lower fresh rate than SMSPool

=======================================================================
### CRITICAL INSIGHT FOR RANKING (from community consensus):
=======================================================================
SMSPool "success_rate" metric = SMS DELIVERY rate, NOT Telegram freshness.
A 95% success_rate country can have 95% recycled numbers — the SMS delivers fine to a pre-existing account.
A 60% success_rate country might have 70%+ fresh numbers — the "failure" is Telegram-side (not SMS).

The ONLY real freshness signal: does Telegram reply sendCodeTypeApp (pre-registered) or sendCodeTypeSms (fresh)?

Countries appearing to "fail" on SMSPool (50–70% success rate) are often the FRESHEST —
because Telegram rejects the code attempt (number has an existing account), not because SMS failed.

RANKING PRIORITY: Use the avg_attempts and freshness numbers above, NOT SMSPool success_rate.
Our own DB experience (if available) overrides all other estimates.
`;

// ── Caches ─────────────────────────────────────────────────────────────────

router.get("/config", (_req: Request, res: Response) => {
  const hasSmsPoolKey = Boolean(process.env["SMSPOOL_API_KEY"]?.trim());
  return void res.json({ has_smspool_key: hasSmsPoolKey });
});

router.get("/health", async (_req: Request, res: Response) => {
  const smspool_key_set = Boolean(process.env["SMSPOOL_API_KEY"]?.trim());
  const pythonPort = process.env["PYTHON_API_PORT"] ?? "8083";

  let python_socks = false;
  let python_socks_version: string | null = null;
  let proxy_count = 0;
  let python_online = false;

  try {
    const pyResp = await fetch(`http://127.0.0.1:${pythonPort}/api/factory/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (pyResp.ok) {
      const d = (await pyResp.json()) as Record<string, unknown>;
      python_socks         = Boolean(d["python_socks"]);
      python_socks_version = (d["python_socks_version"] as string | null) ?? null;
      proxy_count          = Number(d["proxy_count"] ?? 0);
      python_online        = true;
    }
  } catch {
    /* Python offline or timeout — return partial data */
  }

  return void res.json({ smspool_key_set, python_socks, python_socks_version, proxy_count, python_online });
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
const AI_CACHE_TTL_MS        = 12 * 60 * 60 * 1000;  // 12 hours (twice daily refresh)
const AI_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;  // refresh every 12 hours (twice per day)
// Cache version — bump to force regeneration after research data update
const AI_CACHE_VERSION = "v3-jun2026";

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

  const prompt = `You are a specialized analyst for SMSPool.net Telegram account registration freshness.
Your rankings MUST be based on the community research data provided below — do NOT rely on your general training data.
The community research contains real numbers from BlackHatWorld, Reddit, Trustpilot, and operator forums collected in June 2026.

Your task: Produce the TOP 10 countries on SMSPool.net ranked by freshness (probability a purchased number is NOT registered on Telegram).

${COMMUNITY_RESEARCH}
${ownStatsSection}

STRICT RULES FOR avg_attempts and freshness:
1. If our own DB experience has successes >= 3: USE THAT avg_attempts value exactly. Do not override it.
2. If community research has explicit data for the country: USE THOSE numbers (freshness%, avg_attempts).
   Do NOT invent different numbers — copy them from the research above.
3. Only if a country appears in neither source: use your AI estimate.
4. The ranking order MUST follow the tier system in the community research above (Tier 1 > Tier 2 > Tier 3).
   Do NOT reorder countries from the same tier based on your own knowledge.

FORBIDDEN: Do NOT include Russia (ru), Liberia (lr), USA (us), UK (gb), China (cn), Armenia (am) — all are known bad choices.
FORBIDDEN: Do NOT use SMSPool's "success_rate" metric as a proxy for freshness — it only measures SMS delivery, not Telegram freshness.

Return ONLY valid JSON (no markdown, no explanation outside JSON), exactly this shape:
{
  "entries": [
    {
      "rank": 1,
      "id": "kh",
      "name": "Cambodia",
      "freshness": 87,
      "avg_attempts": 1.2,
      "reasoning": "Cellcard/Smart Axiata pools extremely fresh; Telegram penetration <5% as Zalo and Facebook Messenger dominate. BHW operators confirm 87%+ fresh rate in June 2026.",
      "data_source": "community_research"
    }
  ],
  "model": "gemini-2.5-flash"
}

Rules:
- Exactly 10 entries, rank 1 (best) to 10
- "id" must be the SMSPool country code (lowercase 2-letter ISO or known SMSPool code)
- "freshness" = exact value from community research or own DB (do not round differently)
- "avg_attempts" = exact value from community research or own DB
- "data_source": "own_experience" if own DB has 3+ successes, "community_research" if from research data above, "ai_estimate" ONLY if country not in research
- "reasoning" must be 1–2 sentences citing the community source and telecom operators — be specific
- Top 3 must come from Tier 1 countries in the research (Cambodia, Laos, Myanmar) unless own DB overrides`;

  let raw = "";
  let modelUsed = "unknown";
  let geminiError: string | null = null;

  // ── Try Gemini first ───────────────────────────────────────────────────────
  if (GEMINI_API_KEY) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      raw = response.text ?? "";
      modelUsed = "gemini-2.5-flash";
    } catch (err: unknown) {
      geminiError = String(err);
      const isTransient = /503|502|UNAVAILABLE|high demand|overloaded|quota|rate.?limit|exceeded/i.test(geminiError);
      if (!isTransient || !GROQ_API_KEY) {
        // Non-transient error, or no Groq fallback available — rethrow
        throw err;
      }
      console.warn("[factory/gemini] Transient error, falling back to Groq:", geminiError.slice(0, 160));
    }
  }

  // ── Fallback to Groq (runs when Gemini key absent OR Gemini had a transient error) ──
  if (!raw && GROQ_API_KEY) {
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
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Groq HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
    raw = json.choices?.[0]?.message?.content ?? "";
    modelUsed = `groq-llama-3.3-70b${geminiError ? " (gemini-fallback)" : ""}`;
  }

  if (!raw) {
    throw new Error(geminiError ?? "No AI key configured");
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
  const cacheKey = `default_${AI_CACHE_VERSION}`;
  const cached = _aiCountryCache.get(cacheKey);
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
    _aiCountryCache.set(`default_${AI_CACHE_VERSION}`, entry);
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

/**
 * GET /api/factory/avatar-counts
 * Proxies to Python to return pending avatar counts per gender.
 */
router.get("/avatar-counts", async (_req: Request, res: Response) => {
  const pythonPort = process.env["PYTHON_API_PORT"] ?? "8083";
  try {
    const r = await fetch(`http://127.0.0.1:${pythonPort}/api/factory/avatar-counts`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await r.json();
    return void res.json(data);
  } catch (err: unknown) {
    return void res.status(502).json({ error: String(err) });
  }
});

/**
 * POST /api/factory/upload-avatars
 * Proxies multipart upload to Python backend.
 */
router.post("/upload-avatars", async (req: Request, res: Response) => {
  const pythonPort = process.env["PYTHON_API_PORT"] ?? "8083";
  try {
    const contentType = req.headers["content-type"] ?? "";
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    await new Promise<void>((resolve, reject) => {
      req.on("end", resolve);
      req.on("error", reject);
    });
    const body = Buffer.concat(chunks);
    const r = await fetch(`http://127.0.0.1:${pythonPort}/api/factory/upload-avatars`, {
      method: "POST",
      headers: { "content-type": contentType },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    return void res.status(r.ok ? 200 : r.status).json(data);
  } catch (err: unknown) {
    return void res.status(502).json({ error: String(err) });
  }
});

export default router;
