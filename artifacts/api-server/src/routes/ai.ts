import { Router, type IRouter, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db-path";
import { GoogleGenAI, type Tool, type Content } from "@google/genai";

interface HistoryPart {
  text?: string;
  functionCall?: unknown;
  functionResponse?: unknown;
}

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

function getGroupCampaigns(): object {
  const db = getDb();
  try {
    const camps = db.prepare(
      "SELECT id, name, status, sent_count, failed_count, selected_groups, interval_seconds, next_send_at, last_sent_at FROM group_campaigns ORDER BY status, name"
    ).all() as { id: number; name: string; status: string; sent_count: number; failed_count: number; selected_groups: string; interval_seconds: number; next_send_at: string | null; last_sent_at: string | null }[];

    let recentErrors: { group_title: string | null; error: string | null; sent_at: string }[] = [];
    try {
      recentErrors = db.prepare(
        "SELECT group_title, error, sent_at FROM group_sends WHERE (status='failed' OR status='error' OR status='banned') ORDER BY sent_at DESC LIMIT 20"
      ).all() as { group_title: string | null; error: string | null; sent_at: string }[];
    } catch {}

    return {
      campaigns: camps.map(c => ({
        ...c,
        group_count: (() => { try { return (JSON.parse(c.selected_groups) as unknown[]).length; } catch { return 0; } })(),
      })),
      total: camps.length,
      running: camps.filter(c => c.status === "running").length,
      paused: camps.filter(c => c.status === "paused").length,
      draft: camps.filter(c => c.status === "draft").length,
      recent_errors: recentErrors,
    };
  } finally {
    db.close();
  }
}

function getDmCampaignPerformance(): object {
  const db = getDb();
  try {
    const camps = db.prepare(
      "SELECT id, name, status, sent_count, failed_count, target_count, created_at FROM campaigns WHERE status != 'archived' ORDER BY sent_count DESC LIMIT 30"
    ).all() as { id: number; name: string; status: string; sent_count: number; failed_count: number; target_count: number; created_at: string }[];

    const archived = (db.prepare("SELECT COUNT(*) as n FROM campaigns WHERE status='archived'").get() as { n: number }).n;

    return {
      campaigns: camps.map(c => {
        const total = c.sent_count + c.failed_count;
        return { ...c, success_rate: total > 0 ? Math.round((c.sent_count / total) * 100) : null };
      }),
      total: camps.length,
      archived,
      running: camps.filter(c => c.status === "running").length,
      paused: camps.filter(c => c.status === "paused").length,
      draft: camps.filter(c => c.status === "draft").length,
      done: camps.filter(c => c.status === "done" || c.status === "cancelled").length,
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
  get_group_campaigns: getGroupCampaigns,
  get_dm_campaign_performance: getDmCampaignPerformance,
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
      {
        name: "get_group_campaigns",
        description: "Returns all group broadcast campaigns with their status (running/paused/draft), sent/failed counts, group count, next scheduled send time, and recent errors across all group sends. Use this to answer questions about group broadcast health, what campaigns are active, or what errors are occurring in group sends.",
      },
      {
        name: "get_dm_campaign_performance",
        description: "Returns all DM (direct message) campaigns with status, sent/failed counts, success rate %, and how many campaigns are archived. Use this to answer questions about DM campaign performance, success rates, archived campaigns, or which campaigns have errors.",
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `You are the PROMO-Fuel System Copilot — an expert assistant for a Telegram bulk-messaging platform used by fuel station operators. Your role: 1) Technical expert on SOCKS5 proxies, account management, and Telegram MTProto. 2) System monitor — when asked about account/campaign/worker state, always call your database tools, never hallucinate metrics.

## Platform Architecture
- Backend: Node.js + Express (port 8080), SQLite via Drizzle ORM, Python supervisor with multi-worker engine
- Frontend: React Telegram Mini App (port 3000), Apple Liquid Glass dark UI, Russian/Ukrainian language
- Real-time: SSE stream at /api/twa/events updates every 2s (campaigns, accounts, workers, daily_digest, group_campaigns)

## Core Features
- **DM Campaigns**: create, schedule, run/pause/cancel bulk direct-message campaigns; per-account send delay; dry-run mode; 7-day sparkline charts per campaign; duplicate via ⋯ menu
- **Group Broadcasts**: mass send to multiple Telegram groups; multi-worker parallel engine; task queue (task_queue.py); spintax support {var1|var2}; CSV log export; stats tab
- **Sender Accounts**: Telethon .session files; statuses: active/banned/session_invalid/flood_wait/proxy_failed/near_limit; bulk ZIP import; auto-revalidation every 6h; validate sessions via API
- **Workers**: Python supervisor.py manages worker processes; alive/dead tracking; MAX_CRASHES=5 with exponential backoff; SIGTERM→SIGKILL escalation
- **Analytics**: daily/weekly sent stats; audience breakdown; SVG bar charts; 7-day trend

## Recent UI Features (inform user about these)
- **Bell Status Panel** (🔔 on Home): tap bell to see live platform health overlay — workers alive/dead, active campaigns, quota used today, banned/flood accounts. Badge dot = red (ban) / yellow (flood) / green (active)
- **Campaign Completion Toasts**: automatic toast notifications when campaigns change state — 🚀 started, ✅ completed (with sent count), ⛔ cancelled. Works for both DM and group broadcasts (📡/✅/⏹). Always visible regardless of active tab
- **Daily Digest SSE**: "Sent today" on Home updates live in real-time from SSE stream; green pulsing dot confirms live connection
- **Fleet Health Score**: Accounts header shows a % bar — green ≥90%, yellow ≥70%, red <70%. Unhealthy = banned + session_invalid + proxy_failed accounts
- **Bulk Proxy Update** (🌐 Proxy button in Accounts toolbar): apply one proxy string to ALL accounts / only accounts without proxy / only proxy_failed accounts — in one tap. Supports socks5://user:pass@host:port format
- **Manual Search** (🔍 in both manuals): tap search icon to filter all slides by title or keyword, tap result to jump directly. Both System Manual and Accounts & Proxy guide have search
- **Unified Manual Chooser**: tap ? button in bottom nav → bottom sheet appears with two cards: 📖 System Manual (31 slides) and 🔐 Accounts & Proxy (9 slides). No more scattered guide buttons
- **Campaign Sparklines**: each campaign card shows a 7-bar mini chart of the last 7 days' sends
- **Campaign Archive**: DM campaigns can be archived (soft-delete) via ··· menu → Archive. Archived tab hides them from main view; they can be restored via Unarchive
- **Group Analytics Overlay**: tap any group name in the Group Broadcasts stats tab → full-screen overlay shows all-time delivery rate, FloodWait frequency, ban events, per-campaign breakdown, and 30-day daily history for that group
- **What's New slide**: Manual slide 31 summarizes all recently added features

## Proxy & Account Knowledge
SOCKS5 format: socks5://username:password@ip:port
Account quality matrix: buy .session+.json (Telethon/Pyrogram), aged 14-90+ days, with 2FA, residential/SIM origin. Avoid: tdata, fresh 0-3 day, no 2FA, datacenter IPs.
Proxy types: Static Residential (ISP) for aged accounts; Sticky Mobile SOCKS5 for fresh accounts. Always match proxy country to account phone prefix.
MTProto handshake: Worker→SOCKS5 auth tunnel→Telegram DC. Latency >300ms drops the handshake. Keep-alive ping every 60s prevents proxy idle timeout.
Safe limits: 15-60s delay between sends; 50-100 msg/day per account (warm-up: start at 20/day, +10/day per week); 10-30s stagger between account connections.

## Key Endpoints (for your reference)
- GET /api/twa/campaigns — list all campaigns
- GET /api/twa/accounts — list all sender accounts
- GET /api/twa/workers — worker status
- GET /api/twa/tasks — task queue
- POST /api/twa/campaigns/:id/action — start/pause/cancel
- POST /api/twa/accounts/bulk-import — ZIP upload
- GET /api/accounts/proxy-check — proxy health check
- GET /api/twa/events — SSE stream

Respond in the same language the user writes in (Russian, Ukrainian, or English). Be direct and precise.`;

// ── Groq fallback ─────────────────────────────────────────────────────────

const GROQ_SYSTEM_INSTRUCTION = `You are the PROMO-Fuel System Copilot running on the emergency backup engine (Groq/Llama). The primary AI engine (Gemini) is temporarily over capacity. Politely inform the user of this at the start of your response. You can still answer general operational questions about SOCKS5 proxies, Telegram bulk messaging, account management, campaign strategy, and platform troubleshooting — but you cannot query live database metrics right now. Be helpful and direct. Respond in the same language the user writes in (Ukrainian, Russian, or English).`;

function isOverloadError(err: unknown): boolean {
  const s = String(err);
  return s.includes("503") || s.includes("UNAVAILABLE") || s.includes("overloaded") ||
         s.includes("rate") || s.includes("quota") || s.includes("capacity") ||
         s.includes("high demand") || s.includes("Resource has been exhausted");
}

async function callGroqFallback(message: string, history: Content[]): Promise<string> {
  const GROQ_API_KEY = process.env["GROQ_API_KEY"];
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const openaiMessages: { role: string; content: string }[] = [
    { role: "system", content: GROQ_SYSTEM_INSTRUCTION },
  ];

  for (const item of (history ?? [])) {
    if (item.role !== "user" && item.role !== "model") continue;
    const text = (item.parts ?? [])
      .filter((p: HistoryPart) => typeof p.text === "string")
      .map((p: HistoryPart) => p.text as string)
      .join("");
    if (!text) continue;
    openaiMessages.push({ role: item.role === "model" ? "assistant" : "user", content: text });
  }

  openaiMessages.push({ role: "user", content: message });

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: openaiMessages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`);
  const data = await resp.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

// ── POST /v3/ai/chat ────────────────────────────────────────────────────────

router.post("/v3/ai/chat", async (req: Request, res: Response) => {
  const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];

  const { history, message } = req.body as {
    history?: Content[];
    message: string;
  };

  if (!message || typeof message !== "string") {
    return void res.status(400).json({ error: "message is required" });
  }

  // ── Primary: Gemini with function calling ─────────────────────────────
  if (GEMINI_API_KEY) {
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

      let iterations = 0;
      while (iterations < 5) {
        const fnCall = response.functionCalls?.[0];
        if (!fnCall) break;

        const fn = TOOL_DISPATCH[fnCall.name ?? ""];
        let toolResult: Record<string, unknown>;
        if (fn) {
          try { toolResult = fn() as Record<string, unknown>; }
          catch (e) { toolResult = { error: String(e) }; }
        } else {
          toolResult = { error: `Unknown tool: ${fnCall.name}` };
        }

        response = await chat.sendMessage({
          message: [{ functionResponse: { name: fnCall.name ?? "", response: toolResult } }],
        });
        iterations++;
      }

      const text = response.text?.() ?? "";
      return void res.json({ reply: text, history: chat.getHistory(), engine: "gemini" });

    } catch (err) {
      if (!isOverloadError(err)) {
        console.error("[ai/gemini] Non-overload error:", err);
        return void res.status(503).json({ error: "capacity" });
      }
      console.warn("[ai/gemini] Overload — falling back to Groq");
    }
  }

  // ── Fallback: Groq (text-only) ────────────────────────────────────────
  try {
    const text = await callGroqFallback(message, history ?? []);
    return void res.json({ reply: text, history: history ?? [], engine: "groq" });
  } catch (err) {
    console.error("[ai/groq] Fallback also failed:", err);
    return void res.status(503).json({ error: "capacity" });
  }
});

export default router;
