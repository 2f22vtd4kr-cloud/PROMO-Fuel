import { Router, type IRouter, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";
import { GoogleGenAI, type Tool, type Content } from "@google/genai";

const router: IRouter = Router();

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

// ── Tool implementations (read-only DB queries) ────────────────────────────

function getPlatformSummary(): object {
  const db = getDb();
  try {
    const totalAccounts = (db.prepare("SELECT COUNT(*) as n FROM sender_accounts").get() as { n: number }).n;
    const activeAccounts = (db.prepare("SELECT COUNT(*) as n FROM sender_accounts WHERE status = 'idle' OR status = 'active'").get() as { n: number }).n;

    let totalProxies = 0;
    let activeProxies = 0;
    try {
      totalProxies = (db.prepare("SELECT COUNT(*) as n FROM sender_accounts WHERE proxy IS NOT NULL AND proxy != ''").get() as { n: number }).n;
      activeProxies = (db.prepare("SELECT COUNT(*) as n FROM sender_accounts WHERE (status='idle' OR status='active') AND proxy IS NOT NULL AND proxy != ''").get() as { n: number }).n;
    } catch { /* proxies column may differ */ }

    const totalSent = (db.prepare("SELECT COALESCE(SUM(sent_count),0) as s FROM campaigns").get() as { s: number }).s;
    const totalFailed = (db.prepare("SELECT COALESCE(SUM(failed_count),0) as f FROM campaigns").get() as { f: number }).f;

    let groupSent = 0;
    try { groupSent = (db.prepare("SELECT COUNT(*) as n FROM group_send_logs WHERE status='ok'").get() as { n: number }).n; } catch {}

    const activeCampaigns = (db.prepare("SELECT COUNT(*) as n FROM campaigns WHERE status='running'").get() as { n: number }).n;
    let activeGroupCampaigns = 0;
    try { activeGroupCampaigns = (db.prepare("SELECT COUNT(*) as n FROM group_campaigns WHERE status='running'").get() as { n: number }).n; } catch {}

    const heartbeats = db.prepare("SELECT worker_id, last_seen FROM worker_heartbeats").all() as { worker_id: string; last_seen: string }[];
    const nowMs = Date.now();
    const workersAlive = heartbeats.filter(w => {
      try { return nowMs - new Date(w.last_seen).getTime() <= 60_000; } catch { return false; }
    }).length;

    return {
      total_accounts: totalAccounts,
      active_accounts: activeAccounts,
      banned_accounts: (db.prepare("SELECT COUNT(*) as n FROM sender_accounts WHERE status='banned'").get() as { n: number }).n,
      flood_wait_accounts: (db.prepare("SELECT COUNT(*) as n FROM sender_accounts WHERE status='flood_wait'").get() as { n: number }).n,
      total_proxies: totalProxies,
      active_proxies: activeProxies,
      total_dm_sent: totalSent,
      total_dm_failed: totalFailed,
      total_group_sent: groupSent,
      active_dm_campaigns: activeCampaigns,
      active_group_campaigns: activeGroupCampaigns,
      workers_alive: workersAlive,
      workers_total: heartbeats.length,
    };
  } finally {
    db.close();
  }
}

function checkFailedProxies(): object {
  const db = getDb();
  try {
    const proxyFailed = db.prepare(
      "SELECT id, phone, label, proxy, status, last_error FROM sender_accounts WHERE status = 'proxy_failed' OR last_error LIKE '%proxy%' OR last_error LIKE '%SOCKS%' OR last_error LIKE '%connect%' ORDER BY id DESC LIMIT 30"
    ).all() as { id: number; phone: string; label: string | null; proxy: string | null; status: string; last_error: string | null }[];

    const floodWait = db.prepare(
      "SELECT id, phone, label, status, flood_wait_until FROM sender_accounts WHERE status='flood_wait' AND flood_wait_until IS NOT NULL ORDER BY flood_wait_until ASC"
    ).all() as { id: number; phone: string; label: string | null; status: string; flood_wait_until: string }[];

    const banned = db.prepare(
      "SELECT COUNT(*) as n FROM sender_accounts WHERE status='banned'"
    ).get() as { n: number };

    return {
      proxy_failed_accounts: proxyFailed.map(a => ({
        id: a.id,
        phone: a.phone,
        label: a.label,
        proxy: a.proxy,
        status: a.status,
        last_error: a.last_error,
      })),
      proxy_failed_count: proxyFailed.length,
      flood_wait_accounts: floodWait.map(a => ({
        id: a.id,
        phone: a.phone,
        label: a.label,
        flood_wait_until: a.flood_wait_until,
        seconds_remaining: Math.max(0, Math.round((new Date(a.flood_wait_until).getTime() - Date.now()) / 1000)),
      })),
      flood_wait_count: floodWait.length,
      banned_count: banned.n,
    };
  } finally {
    db.close();
  }
}

function getAccountStatusByCountry(): object {
  const db = getDb();
  try {
    const accounts = db.prepare(
      "SELECT id, phone, status FROM sender_accounts"
    ).all() as { id: number; phone: string; status: string }[];

    const countryMap: Record<string, { code: string; name: string; total: number; active: number; banned: number; flood_wait: number; proxy_failed: number; other: number }> = {};

    const COUNTRY_CODES: [string, string][] = [
      ["+7",  "Russia/KZ"],
      ["+380","Ukraine"],
      ["+375","Belarus"],
      ["+374","Armenia"],
      ["+995","Georgia"],
      ["+998","Uzbekistan"],
      ["+44", "UK"],
      ["+48", "Poland"],
      ["+49", "Germany"],
      ["+1",  "US/CA"],
      ["+90", "Turkey"],
      ["+33", "France"],
      ["+34", "Spain"],
      ["+39", "Italy"],
      ["+31", "Netherlands"],
    ];

    for (const acc of accounts) {
      const phone = acc.phone.replace(/\s+/g, "");
      let matched = "Other";
      let code = "";
      for (const [prefix, name] of COUNTRY_CODES) {
        if (phone.startsWith(prefix)) {
          matched = name;
          code = prefix;
          break;
        }
      }
      if (!countryMap[matched]) {
        countryMap[matched] = { code, name: matched, total: 0, active: 0, banned: 0, flood_wait: 0, proxy_failed: 0, other: 0 };
      }
      countryMap[matched].total++;
      if (acc.status === "idle" || acc.status === "active") countryMap[matched].active++;
      else if (acc.status === "banned") countryMap[matched].banned++;
      else if (acc.status === "flood_wait") countryMap[matched].flood_wait++;
      else if (acc.status === "proxy_failed") countryMap[matched].proxy_failed++;
      else countryMap[matched].other++;
    }

    const breakdown = Object.values(countryMap).sort((a, b) => b.total - a.total);
    return {
      total_accounts: accounts.length,
      breakdown,
      summary: {
        countries_with_accounts: breakdown.filter(c => c.total > 0).length,
        healthiest_country: breakdown.sort((a, b) => (b.active / Math.max(b.total, 1)) - (a.active / Math.max(a.total, 1)))[0]?.name ?? "N/A",
        most_problematic_country: breakdown.sort((a, b) => (b.banned + b.proxy_failed) - (a.banned + a.proxy_failed))[0]?.name ?? "N/A",
      },
    };
  } finally {
    db.close();
  }
}

// ── Tool dispatch map ──────────────────────────────────────────────────────

const TOOL_DISPATCH: Record<string, () => object> = {
  get_platform_summary: getPlatformSummary,
  check_failed_proxies: checkFailedProxies,
  get_account_status_by_country: getAccountStatusByCountry,
};

// ── Gemini tool definitions ────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_platform_summary",
        description: "Returns total numbers of connected accounts, their statuses (active, banned, flood_wait), active proxies count, overall DM and group message transmission statistics, active campaigns count, and worker process health.",
      },
      {
        name: "check_failed_proxies",
        description: "Queries the database for accounts with proxy connectivity errors (proxy_failed status), flood wait restrictions, and ban status. Returns detailed per-account error info including proxy strings and last error messages.",
      },
      {
        name: "get_account_status_by_country",
        description: "Returns a breakdown of all connected accounts grouped by country prefix (e.g., Russia +7, UK +44, Poland +48). Shows working vs restricted (banned/flood_wait/proxy_failed) accounts per country.",
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `You are the PROMO-Fuel System Copilot. Your role is twofold: 1) Act as a technical expert guiding the user on SOCKS5 proxy formats and account management based on our manual. 2) Act as a system monitor. Whenever the user asks about the state of their accounts, proxies, or campaigns, proactively invoke your database tools to fetch real-time information and deliver an accurate data analysis. Do not hallucinate metrics—always fetch them.

SOCKS5 proxy format: socks5://user:pass@host:port or socks5://host:port
Accounts are Telegram user sessions managed via Telethon MTProto.
Respond in the same language the user writes in (Russian, Ukrainian, or English).`;

// ── POST /v3/ai/chat ────────────────────────────────────────────────────────

router.post("/v3/ai/chat", async (req: Request, res: Response) => {
  const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
  if (!GEMINI_API_KEY) {
    return void res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  }

  const { history, message } = req.body as {
    history?: Content[];
    message: string;
  };

  if (!message || typeof message !== "string") {
    return void res.status(400).json({ error: "message is required" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: TOOLS,
      },
      history: history ?? [],
    });

    let response = await chat.sendMessage({ message });

    // ── Function calling execution loop ──────────────────────────────────
    let iterations = 0;
    while (iterations < 5) {
      const fnCall = response.functionCalls?.[0];
      if (!fnCall) break;

      const fn = TOOL_DISPATCH[fnCall.name ?? ""];
      let toolResult: Record<string, unknown>;
      if (fn) {
        try {
          toolResult = fn() as Record<string, unknown>;
        } catch (e) {
          toolResult = { error: String(e) };
        }
      } else {
        toolResult = { error: `Unknown tool: ${fnCall.name}` };
      }

      response = await chat.sendMessage({
        message: [
          {
            functionResponse: {
              name: fnCall.name ?? "",
              response: toolResult,
            },
          },
        ],
      });

      iterations++;
    }

    const text = response.text?.() ?? "";
    const updatedHistory = chat.getHistory();

    return void res.json({ reply: text, history: updatedHistory });
  } catch (err) {
    console.error("[ai] Error:", err);
    return void res.status(500).json({ error: String(err) });
  }
});

export default router;
