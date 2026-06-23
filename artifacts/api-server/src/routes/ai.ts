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

function getWriteDb() {
  return new Database(DB_PATH);
}

// ── Read-only tool implementations ─────────────────────────────────────────

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

// ── Mutation tool implementations ──────────────────────────────────────────

function execDeleteRestrictedAccounts(args: { account_ids: number[] }): object {
  const db = getWriteDb();
  try {
    const ids = args.account_ids;
    if (!ids?.length) return { error: "No account_ids provided" };
    const placeholders = ids.map(() => "?").join(",");
    const result = db.prepare(`DELETE FROM sender_accounts WHERE id IN (${placeholders})`).run(...ids);
    return { deleted: result.changes, account_ids: ids };
  } finally {
    db.close();
  }
}

function execUpdateAccountProxy(args: { account_ids: number[]; new_proxy_string: string }): object {
  const db = getWriteDb();
  try {
    const { account_ids, new_proxy_string } = args;
    if (!account_ids?.length) return { error: "No account_ids provided" };
    if (!new_proxy_string) return { error: "No new_proxy_string provided" };
    const placeholders = account_ids.map(() => "?").join(",");
    const result = db.prepare(`UPDATE sender_accounts SET proxy = ? WHERE id IN (${placeholders})`).run(new_proxy_string, ...account_ids);
    return { updated: result.changes, proxy: new_proxy_string, account_ids };
  } finally {
    db.close();
  }
}

function execRemoveDeadProxies(): object {
  const db = getWriteDb();
  try {
    const result = db.prepare("UPDATE sender_accounts SET proxy = NULL WHERE status = 'proxy_failed'").run();
    return { cleared: result.changes };
  } finally {
    db.close();
  }
}

function execPauseActiveCampaign(args: { campaign_id: number }): object {
  const db = getWriteDb();
  try {
    const result = db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ? AND status = 'running'").run(args.campaign_id);
    if (result.changes === 0) {
      const check = db.prepare("SELECT id, name, status FROM campaigns WHERE id = ?").get(args.campaign_id) as { id: number; name: string; status: string } | undefined;
      if (!check) return { error: `Campaign #${args.campaign_id} not found` };
      return { error: `Campaign "${check.name}" is not running (current status: ${check.status})` };
    }
    return { paused: true, campaign_id: args.campaign_id };
  } finally {
    db.close();
  }
}

function execResumeCampaign(args: { campaign_id: number }): object {
  const db = getWriteDb();
  try {
    const result = db.prepare("UPDATE campaigns SET status = 'running' WHERE id = ? AND status = 'paused'").run(args.campaign_id);
    if (result.changes === 0) {
      const check = db.prepare("SELECT id, name, status FROM campaigns WHERE id = ?").get(args.campaign_id) as { id: number; name: string; status: string } | undefined;
      if (!check) return { error: `Campaign #${args.campaign_id} not found` };
      return { error: `Campaign "${check.name}" cannot be resumed (current status: ${check.status})` };
    }
    return { resumed: true, campaign_id: args.campaign_id };
  } finally {
    db.close();
  }
}

function execTriggerBulkBlast(args: { account_ids: number[]; message_text: string; target_list: string[] }): object {
  const db = getWriteDb();
  try {
    const { account_ids, message_text, target_list } = args;
    if (!message_text?.trim()) return { error: "message_text is required" };
    const now = new Date().toISOString();
    const name = `AI Blast ${now.slice(0, 10)} ${now.slice(11, 16)}`;
    const targetCount = target_list?.length ?? 0;
    const primaryAccountId = account_ids?.[0] ?? null;
    const result = db.prepare(
      "INSERT INTO campaigns (name, message, status, target_count, sender_account_id, created_at) VALUES (?, ?, 'running', ?, ?, ?)"
    ).run(name, message_text, targetCount, primaryAccountId, now);
    return {
      created: true,
      campaign_id: result.lastInsertRowid,
      campaign_name: name,
      account_ids: account_ids ?? [],
      target_count: targetCount,
    };
  } finally {
    db.close();
  }
}

// ── Tool registries ────────────────────────────────────────────────────────

const READ_DISPATCH: Record<string, () => object> = {
  get_platform_summary: getPlatformSummary,
  check_failed_proxies: checkFailedProxies,
  get_account_status_by_country: getAccountStatusByCountry,
  get_group_campaigns: getGroupCampaigns,
  get_dm_campaign_performance: getDmCampaignPerformance,
};

type MutationArgs = Record<string, unknown>;

const MUTATION_DISPATCH: Record<string, (args: MutationArgs) => object> = {
  delete_restricted_accounts: (a) => execDeleteRestrictedAccounts(a as { account_ids: number[] }),
  update_account_proxy: (a) => execUpdateAccountProxy(a as { account_ids: number[]; new_proxy_string: string }),
  remove_dead_proxies: () => execRemoveDeadProxies(),
  pause_active_campaign: (a) => execPauseActiveCampaign(a as { campaign_id: number }),
  resume_campaign: (a) => execResumeCampaign(a as { campaign_id: number }),
  trigger_bulk_blast: (a) => execTriggerBulkBlast(a as { account_ids: number[]; message_text: string; target_list: string[] }),
};

const MUTATION_TOOL_NAMES = new Set(Object.keys(MUTATION_DISPATCH));

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
        description: "Returns all group broadcast campaigns with their status (running/paused/draft), sent/failed counts, group count, next scheduled send time, and recent errors across all group sends.",
      },
      {
        name: "get_dm_campaign_performance",
        description: "Returns all DM (direct message) campaigns with status, sent/failed counts, success rate %, and how many campaigns are archived.",
      },
      {
        name: "delete_restricted_accounts",
        description: "⚠️ MUTATION — Permanently deletes sender accounts by their IDs. Use for accounts that are banned, session_invalid, or otherwise unrecoverable. Always call get_platform_summary or check_failed_proxies first to confirm IDs.",
        parameters: {
          type: "object" as const,
          properties: {
            account_ids: {
              type: "array",
              items: { type: "integer" },
              description: "Array of sender_account IDs to delete",
            },
          },
          required: ["account_ids"],
        },
      },
      {
        name: "update_account_proxy",
        description: "⚠️ MUTATION — Sets a new SOCKS5 proxy string on one or more accounts. Use when the user wants to fix proxy_failed accounts or bulk-assign a new proxy.",
        parameters: {
          type: "object" as const,
          properties: {
            account_ids: {
              type: "array",
              items: { type: "integer" },
              description: "Array of sender_account IDs to update",
            },
            new_proxy_string: {
              type: "string",
              description: "SOCKS5 proxy string in format: socks5://user:pass@host:port",
            },
          },
          required: ["account_ids", "new_proxy_string"],
        },
      },
      {
        name: "remove_dead_proxies",
        description: "⚠️ MUTATION — Clears the proxy field on ALL accounts currently in 'proxy_failed' status. Use to bulk-clean accounts with dead proxies.",
        parameters: { type: "object" as const, properties: {} },
      },
      {
        name: "pause_active_campaign",
        description: "⚠️ MUTATION — Pauses a currently running DM campaign by its ID.",
        parameters: {
          type: "object" as const,
          properties: {
            campaign_id: { type: "integer", description: "ID of the DM campaign to pause" },
          },
          required: ["campaign_id"],
        },
      },
      {
        name: "resume_campaign",
        description: "⚠️ MUTATION — Resumes a paused DM campaign by its ID.",
        parameters: {
          type: "object" as const,
          properties: {
            campaign_id: { type: "integer", description: "ID of the DM campaign to resume" },
          },
          required: ["campaign_id"],
        },
      },
      {
        name: "trigger_bulk_blast",
        description: "⚠️ MUTATION — Creates and immediately starts a new bulk DM campaign with the given message text, sender account IDs, and list of target usernames/phone numbers.",
        parameters: {
          type: "object" as const,
          properties: {
            account_ids: {
              type: "array",
              items: { type: "integer" },
              description: "Sender account IDs to use for this blast",
            },
            message_text: {
              type: "string",
              description: "The message content to send",
            },
            target_list: {
              type: "array",
              items: { type: "string" },
              description: "List of target Telegram usernames or phone numbers",
            },
          },
          required: ["account_ids", "message_text", "target_list"],
        },
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `You are the PROMO-Fuel System Copilot — an expert assistant for a Telegram bulk-messaging platform used by fuel station operators. Your role: 1) Technical expert on SOCKS5 proxies, account management, and Telegram MTProto. 2) System monitor — when asked about account/campaign/worker state, always call your database tools, never hallucinate metrics. 3) Autonomous operator — you can propose and execute account, proxy, and campaign actions when the user requests them.

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

## Mutation / Action Tools (require user approval before execution)
You have access to the following mutation tools. When the user asks you to take an action, always:
1. First call the relevant read tool to gather IDs and confirm the current state.
2. Then call the appropriate mutation tool with exact IDs.
3. Execution will be paused for human approval — do NOT say you've completed the action yet.

Available mutations:
- **delete_restricted_accounts(account_ids)** — permanently deletes accounts. Use for banned/session_invalid accounts only.
- **update_account_proxy(account_ids, new_proxy_string)** — assigns a new SOCKS5 proxy to accounts.
- **remove_dead_proxies()** — clears proxy field on all proxy_failed accounts.
- **pause_active_campaign(campaign_id)** — pauses a running campaign.
- **resume_campaign(campaign_id)** — resumes a paused campaign.
- **trigger_bulk_blast(account_ids, message_text, target_list)** — creates and starts a new DM campaign.

## Proxy & Account Knowledge
SOCKS5 format: socks5://username:password@ip:port
Account quality matrix: buy .session+.json (Telethon/Pyrogram), aged 14-90+ days, with 2FA, residential/SIM origin. Avoid: tdata, fresh 0-3 day, no 2FA, datacenter IPs.
Proxy types: Static Residential (ISP) for aged accounts; Sticky Mobile SOCKS5 for fresh accounts. Always match proxy country to account phone prefix.
MTProto handshake: Worker→SOCKS5 auth tunnel→Telegram DC. Latency >300ms drops the handshake. Keep-alive ping every 60s prevents proxy idle timeout.
Safe limits: 15-60s delay between sends; 50-100 msg/day per account (warm-up: start at 20/day, +10/day per week); 10-30s stagger between account connections.

## Verification Hub (Human-in-the-Loop Captcha System)
- **Tab**: "Verify" (teal 🛡️ icon in bottom nav) — polls /api/verifications/pending every 4 seconds
- Anti-bot captchas intercepted by the Telethon listener are stored as \`pending_verifications\` in SQLite
- Two captcha types: \`button\` (inline keyboard) and \`text_reply\` (math/question)
- Operator resolves them manually in the Verification Hub UI
- Listener must be started: POST /api/verifications/listeners/start-all
- API: GET /api/verifications/pending — list challenges; POST /api/verifications/click — click button; POST /api/verifications/reply — send text answer
- When a user asks "any pending captchas?" query /api/verifications/pending to check (or advise them to go to the Verify tab)
- **Push Alerts**: when a new captcha is detected the system sends a Telegram bot message to ADMIN_TELEGRAM_ID (env var). Requires TELEGRAM_TOKEN + ADMIN_TELEGRAM_ID to be set. Rate-limited: max one alert per account per 60 seconds. Optionally set MINIAPP_URL for a deep link in the alert.
- **/captcha bot command**: typing /captcha shows pending count + expired count (>5 min) + last 3 solved/dismissed history (account, type, status) + one-tap WebApp button at MINIAPP_URL#verify. Switched to HTML parse_mode for safe formatting.
- **Smart Hub UI**: age colour on timestamp (green <2min, amber 2–5min, red >5min smooth CSS); ⏰ Dismiss Expired (N) bulk-dismiss button when any captcha >5min; 940 Hz Web Audio ping on new arrival; live stats row in header (today solved / dismissed / all-time total) from GET /api/verifications/stats; BottomNav ShieldCheck icon shows animated red badge with pending count (polls every 30s from App.tsx)
- GET /api/verifications/stats returns { today_solved, today_dismissed, current_pending, all_time_solved, all_time_total }
- GET /api/verifications/listeners returns { active: [account_id, ...] } — list of account IDs with running listeners
- POST /api/verifications/listeners/stop with { account_id } stops a single listener; Stop All calls this for each active ID in parallel
- Listener card shows green "N active" pill badge; Stop All (red) appears only when activeListeners.length > 0
- All Clear panel shows today solved/dismissed/total scoreboard when stats are non-zero
- VerificationHub has two tabs: Pending (active challenges) and History (last 50 solved/dismissed); fetched every 4s
- History tab shows compact list: account label/phone, captcha_type, group_title, status, age in minutes/hours
- Home page shows a "Verification" activity strip card (red when pending > 0, green otherwise); tapping navigates to verify tab
- To check if push alerts are configured: verify TELEGRAM_TOKEN and ADMIN_TELEGRAM_ID environment variables are set

## Account Factory (Automated Account Registration)
- **Location**: Accounts page → "···" overflow menu → "🏭 Account Factory"
- **Endpoint**: POST /api/factory/register (Python FastAPI, port 8083, proxied through Node.js) — returns SSE stream (text/event-stream)
- **Proxy pre-check (runs BEFORE Step 1)**: factory opens a real SOCKS5 socket to Telegram DC1 (149.154.167.91:443, timeout 12s) before purchasing any SMSPool number. SSE event: \`preflight\` with status "running"→"done"/"error". If it fails → pipeline aborts with no SMSPool balance spent. User must fix proxy string and retry.
- **Country availability checker**: GET /api/factory/countries?api_key=KEY&service=11 → returns \`{countries:[{id,name,stock,price}], cached:bool, ttl:60}\` sorted cheapest first. Results cached 60s per API key. UI button "📊 Check Stock" next to the Country field — opens an inline panel showing live stock (🟢>50 🟡10-50 🔴<10) and USD price per number; clicking a row auto-selects the country. Shows a search filter. Requires SMSPool API key to be filled in first. **This endpoint is implemented natively in Node.js (artifacts/api-server/src/routes/factory.ts) — it does NOT depend on the Python supervisor and works even when Python is offline.**
- **Full pipeline (7 steps, fully automated)**:
  1. Purchase real phone number from SMSPool API (service=11=Telegram)
  2. Init Telethon client with random device fingerprint + SOCKS5 proxy tunnel
  3. client.send_code_request(phone) — request Telegram verification code
  4. Poll SMSPool /sms/check every 5s, auto-cancel after 120s timeout
  5. client.sign_in(code) or client.sign_up(first_name, last_name) for fresh numbers
  6. client.edit_2fa(new_password=...) — immediate 2FA security
  7. Save .session + .json to ./sessions/ + INSERT into sender_accounts with auth_status='active'
- **Batch mode**: quantity field (1–10) registers accounts sequentially with 12s cooldown between each
- **Required env vars**: TELETHON_API_ID, TELETHON_API_HASH (can also be entered in the form)
- **Error guards**: PhoneNumberBannedError → auto-cancel SMSPool order (no charge); SMS timeout → auto-cancel; SessionPasswordNeededError → number already registered
- **SMSPool**: smspool.net — buy with crypto/card; service ID 11 = Telegram; Ukraine/Kazakhstan cheapest
- **Proxy**: socks5://user:pass@ip:port format; Decodo (smartproxy.com) residential/mobile; match country to phone
- **Proxy Store**: saved_proxies table stores SOCKS5 proxy strings per country; API: GET /api/proxy-store?country=XX (autofill chips), POST /api/proxy-store (save), PATCH /api/proxy-store/:id/session-num (auto-called after batch to update last session number), DELETE /api/proxy-store/:id. When a saved proxy is selected via autofill chip, sessionStartNum auto-sets to last_session_num+1 so sessions never reuse. After batch_done, last_session_num is patched silently.
- **On success**: .session file + .json metadata written; CRM row inserted with 2FA pass, session_file, proxy, auth_status='active', is_active=1
- **Warmup Mode Selector** (first card in the form, before API key):
  - 🚫 **No Warmup** (\`warmup_mode: "none"\`) — skip warmup entirely; account goes straight to active
  - 🔥 **Warmup All** (\`warmup_mode: "all"\`) — auto-queue 48h warmup for every account after creation (default)
  - ❓ **Ask Per Account** (\`warmup_mode: "ask"\`) — a popup appears after each account is created; user decides per-account. The backend yields a \`warmup_prompt\` SSE event; user clicks "🔥 Start Warmup" or "Skip" in the modal.
- **Manual**: 📚 → "🏭 Account Factory" guide (13 pages) — covers SMSPool setup, proxy selection, credentials, warmup modes, batch mode, error types, best practices

## Key Endpoints (for your reference)
- GET /api/twa/campaigns — list all campaigns
- GET /api/twa/accounts — list all sender accounts
- GET /api/twa/workers — worker status
- GET /api/twa/tasks — task queue
- POST /api/twa/campaigns/:id/action — start/pause/cancel
- POST /api/twa/accounts/bulk-import — ZIP upload
- GET /api/accounts/proxy-check — proxy health check
- GET /api/twa/events — SSE stream
- GET /api/verifications/pending — pending captcha challenges (Python FastAPI port 8083)
- POST /api/verifications/listeners/start-all — start Telethon captcha listeners for all active accounts
- POST /api/factory/register — Account Factory SSE stream (Python FastAPI port 8083)

Respond in the same language the user writes in (Russian, Ukrainian, or English). Be direct and precise.`;

// ── Groq tool definitions (OpenAI format) ─────────────────────────────────

const GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_platform_summary",
      description: "Returns total numbers of connected accounts, their statuses (active, banned, flood_wait), active proxies count, overall DM and group message transmission statistics, active campaigns count, and worker process health.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "check_failed_proxies",
      description: "Queries the database for accounts with proxy connectivity errors (proxy_failed status), flood wait restrictions, and ban status. Returns detailed per-account error info including proxy strings and last error messages.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_account_status_by_country",
      description: "Returns a breakdown of all connected accounts grouped by country prefix. Shows working vs restricted accounts per country.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_group_campaigns",
      description: "Returns all group broadcast campaigns with status, sent/failed counts, group count, next send time, and recent errors.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dm_campaign_performance",
      description: "Returns all DM campaigns with status, sent/failed counts, success rate %, and archived count.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_restricted_accounts",
      description: "⚠️ MUTATION — Permanently deletes sender accounts by IDs. Use for banned/session_invalid/unrecoverable accounts only.",
      parameters: {
        type: "object",
        properties: {
          account_ids: { type: "array", items: { type: "integer" }, description: "Array of sender_account IDs to delete" },
        },
        required: ["account_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_account_proxy",
      description: "⚠️ MUTATION — Sets a new SOCKS5 proxy string on one or more accounts.",
      parameters: {
        type: "object",
        properties: {
          account_ids: { type: "array", items: { type: "integer" }, description: "Sender account IDs to update" },
          new_proxy_string: { type: "string", description: "SOCKS5 proxy string: socks5://user:pass@host:port" },
        },
        required: ["account_ids", "new_proxy_string"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_dead_proxies",
      description: "⚠️ MUTATION — Clears the proxy field on ALL accounts in 'proxy_failed' status.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "pause_active_campaign",
      description: "⚠️ MUTATION — Pauses a currently running DM campaign by its ID.",
      parameters: {
        type: "object",
        properties: {
          campaign_id: { type: "integer", description: "ID of the campaign to pause" },
        },
        required: ["campaign_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resume_campaign",
      description: "⚠️ MUTATION — Resumes a paused DM campaign by its ID.",
      parameters: {
        type: "object",
        properties: {
          campaign_id: { type: "integer", description: "ID of the campaign to resume" },
        },
        required: ["campaign_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_bulk_blast",
      description: "⚠️ MUTATION — Creates and starts a new bulk DM campaign with the given message, accounts, and targets.",
      parameters: {
        type: "object",
        properties: {
          account_ids: { type: "array", items: { type: "integer" }, description: "Sender account IDs" },
          message_text: { type: "string", description: "Message content to send" },
          target_list: { type: "array", items: { type: "string" }, description: "Target usernames or phone numbers" },
        },
        required: ["account_ids", "message_text", "target_list"],
      },
    },
  },
];

// ── Groq types ─────────────────────────────────────────────────────────────

type GroqContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | GroqContentPart[];
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface GroqResponse {
  choices: { message: GroqMessage & { content: string } }[];
}

interface MutationInterceptResult {
  __type: "mutation_intercept";
  function_name: string;
  arguments: MutationArgs;
}

// ── Groq API helper ────────────────────────────────────────────────────────

async function groqRequest(messages: GroqMessage[], withVision: boolean): Promise<GroqResponse> {
  const GROQ_API_KEY = process.env["GROQ_API_KEY"];
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const model = withVision
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: GROQ_TOOLS,
      tool_choice: "auto",
      max_tokens: 1536,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Groq HTTP ${resp.status}: ${body.slice(0, 200)}`);
  }
  return resp.json() as Promise<GroqResponse>;
}

// ── Groq with full tool calling ────────────────────────────────────────────

async function callGroqWithTools(
  message: string,
  history: Content[],
  imageBase64?: string,
  imageMimeType?: string,
): Promise<string | MutationInterceptResult> {
  const withVision = !!imageBase64;

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_INSTRUCTION },
  ];

  for (const item of (history ?? [])) {
    if (item.role !== "user" && item.role !== "model") continue;
    const text = (item.parts ?? [])
      .filter((p: HistoryPart) => typeof p.text === "string")
      .map((p: HistoryPart) => p.text as string)
      .join("");
    if (!text) continue;
    messages.push({ role: item.role === "model" ? "assistant" : "user", content: text });
  }

  const userContent: GroqContentPart[] = [{ type: "text", text: message }];
  if (imageBase64 && imageMimeType) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${imageMimeType};base64,${imageBase64}` },
    });
  }
  messages.push({ role: "user", content: userContent.length === 1 ? message : userContent });

  let iterations = 0;
  while (iterations < 5) {
    const data = await groqRequest(messages, withVision && iterations === 0);
    const choice = data.choices[0];
    const toolCalls = choice?.message?.tool_calls;

    if (!toolCalls?.length) {
      return choice?.message?.content ?? "";
    }

    // Intercept the first mutation tool call — stop the loop and return for approval
    const mutationCall = toolCalls.find(tc => MUTATION_TOOL_NAMES.has(tc.function.name));
    if (mutationCall) {
      let args: MutationArgs = {};
      try { args = JSON.parse(mutationCall.function.arguments || "{}") as MutationArgs; }
      catch { /* keep empty args */ }
      return { __type: "mutation_intercept", function_name: mutationCall.function.name, arguments: args };
    }

    // Read-only tools: execute and continue
    messages.push(choice.message as GroqMessage);

    for (const tc of toolCalls) {
      const fn = READ_DISPATCH[tc.function.name ?? ""];
      let result: object;
      try { result = fn ? fn() : { error: `Unknown tool: ${tc.function.name}` }; }
      catch (e) { result = { error: String(e) }; }

      messages.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: tc.id,
        name: tc.function.name,
      });
    }

    iterations++;
  }

  return "";
}

// ── POST /api/v3/ai/chat ───────────────────────────────────────────────────

router.post("/v3/ai/chat", async (req: Request, res: Response) => {
  const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];

  const { history, message, imageBase64, imageMimeType } = req.body as {
    history?: Content[];
    message: string;
    imageBase64?: string;
    imageMimeType?: string;
  };

  if (!message || typeof message !== "string") {
    return void res.status(400).json({ error: "message is required" });
  }

  // ── Primary: Gemini with function calling + vision ────────────────────
  if (GEMINI_API_KEY) {
    try {
      const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const chat = genai.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: TOOLS },
        history: history ?? [],
      });

      type GeminiPart =
        | { text: string }
        | { inlineData: { mimeType: string; data: string } };

      const parts: GeminiPart[] = [{ text: message }];
      if (imageBase64 && imageMimeType) {
        parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
      }

      let response = await chat.sendMessage({ message: parts as Parameters<typeof chat.sendMessage>[0]["message"] });

      let iterations = 0;
      while (iterations < 5) {
        const fnCall = response.functionCalls?.[0];
        if (!fnCall) break;

        // Intercept mutation tool calls — pause for user approval
        if (MUTATION_TOOL_NAMES.has(fnCall.name ?? "")) {
          return void res.json({
            status: "pending_user_approval",
            action_details: {
              function_name: fnCall.name ?? "",
              arguments: (fnCall.args ?? {}) as MutationArgs,
            },
            history: chat.getHistory(),
            engine: "gemini",
          });
        }

        // Read-only tools: execute immediately
        const fn = READ_DISPATCH[fnCall.name ?? ""];
        let toolResult: Record<string, unknown>;
        try { toolResult = fn ? (fn() as Record<string, unknown>) : { error: `Unknown tool: ${fnCall.name}` }; }
        catch (e) { toolResult = { error: String(e) }; }

        response = await chat.sendMessage({
          message: [{ functionResponse: { name: fnCall.name ?? "", response: toolResult } }],
        });
        iterations++;
      }

      const text = response.text ?? "";
      return void res.json({ reply: text, history: chat.getHistory(), engine: "gemini" });

    } catch (err) {
      const errStr = String(err);
      // Only fall through to Groq on transient/capacity errors
      if (!errStr.includes("503") && !errStr.includes("overloaded") && !errStr.includes("UNAVAILABLE") && !errStr.includes("fetch")) {
        console.error("[ai/gemini] Non-transient error:", errStr.slice(0, 200));
      } else {
        console.warn("[ai/gemini] Transient error, falling back to Groq:", errStr.slice(0, 120));
      }
    }
  }

  // ── Fallback: Groq with full tool calling + vision ────────────────────
  try {
    const result = await callGroqWithTools(message, history ?? [], imageBase64, imageMimeType);

    if (typeof result === "object" && result.__type === "mutation_intercept") {
      return void res.json({
        status: "pending_user_approval",
        action_details: {
          function_name: result.function_name,
          arguments: result.arguments,
        },
        history: history ?? [],
        engine: "groq",
      });
    }

    return void res.json({ reply: result, history: history ?? [], engine: "groq" });
  } catch (err) {
    console.error("[ai/groq] Fallback also failed:", err);
    return void res.status(503).json({ error: "capacity" });
  }
});

// ── POST /api/v3/ai/execute ────────────────────────────────────────────────
// Executes a pre-approved mutation action from the frontend confirmation gate.

router.post("/v3/ai/execute", (req: Request, res: Response) => {
  const { function_name, arguments: args } = req.body as {
    function_name: string;
    arguments: MutationArgs;
  };

  if (!function_name || typeof function_name !== "string") {
    return void res.status(400).json({ error: "function_name is required" });
  }

  if (!MUTATION_TOOL_NAMES.has(function_name)) {
    return void res.status(400).json({ error: `"${function_name}" is not a registered mutation tool` });
  }

  const fn = MUTATION_DISPATCH[function_name];
  try {
    const result = fn(args ?? {});
    return void res.json({ success: true, function_name, result });
  } catch (err) {
    console.error(`[ai/execute] ${function_name} failed:`, err);
    return void res.status(500).json({ success: false, error: String(err) });
  }
});

// ── POST /api/v3/spintax/generate ─────────────────────────────────────────

const SPINTAX_SYSTEM_PROMPT = `You are an expert copywriter and anti-detection automation engineer for PROMO-Fuel. Your job is to take a base message and convert it into a deeply varied, highly complex Spintax string using '{option1|option2|option3}' syntax.

You must vary individual words, rewrite entire sentence phrases, shift clause ordering, and use nested spintax structures '{{nested1|nested2}|option3}' where appropriate to maximize variation combinations. Aim for at least 6-10 distinct variation groups that produce hundreds of unique message permutations.

CRITICAL: Output ONLY the final valid spintax string. Do not include markdown code blocks (\`\`\`), do not include any conversational introductions or explanations, and ensure every single opening bracket '{' has a matching closing bracket '}' so it does not break the recursive parser in lib/spintax.ts.

Tone guidance:
- casual: conversational, warm, informal — use contractions, emoji-friendly phrasing
- professional: clear, respectful, business-appropriate — formal grammar, no slang
- direct: concise, action-oriented, no fluff — short punchy sentences, strong CTAs`;

router.post("/v3/spintax/generate", async (req: Request, res: Response) => {
  const { seed_text, tone = "casual" } = req.body as { seed_text?: string; tone?: string };

  if (!seed_text || typeof seed_text !== "string" || seed_text.trim().length < 5) {
    return void res.status(400).json({ error: "seed_text is required (min 5 chars)" });
  }

  const validTones = ["casual", "professional", "direct"];
  const safeTone = validTones.includes(tone) ? tone : "casual";
  const userPrompt = `Tone: ${safeTone}\n\nBase message:\n${seed_text.trim()}`;

  const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
  const GROQ_API_KEY   = process.env["GROQ_API_KEY"];

  // ── Primary: Gemini 2.5 Flash ─────────────────────────────────────────
  if (GEMINI_API_KEY) {
    try {
      const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: SPINTAX_SYSTEM_PROMPT,
          temperature: 1.0,
          maxOutputTokens: 2048,
        },
      });
      const spintax = (response.text ?? "").trim();
      if (spintax.length > 10) {
        return void res.json({ spintax, engine: "gemini" });
      }
    } catch (err) {
      const errStr = String(err);
      if (!errStr.includes("503") && !errStr.includes("overloaded") && !errStr.includes("UNAVAILABLE")) {
        console.error("[spintax/gemini] Error:", errStr.slice(0, 200));
      } else {
        console.warn("[spintax/gemini] Transient, falling back to Groq");
      }
    }
  }

  // ── Fallback: Groq Llama 3.3 70B ─────────────────────────────────────
  if (!GROQ_API_KEY) {
    return void res.status(503).json({ error: "No AI keys configured" });
  }
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 1.0,
        max_tokens: 2048,
        messages: [
          { role: "system", content: SPINTAX_SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
      }),
    });
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[spintax/groq] HTTP error:", groqRes.status, errText.slice(0, 200));
      return void res.status(503).json({ error: "capacity" });
    }
    const groqData = await groqRes.json() as { choices?: Array<{ message?: { content?: string } }> };
    const spintax = (groqData.choices?.[0]?.message?.content ?? "").trim();
    return void res.json({ spintax, engine: "groq" });
  } catch (err) {
    console.error("[spintax/groq] Failed:", err);
    return void res.status(503).json({ error: "capacity" });
  }
});

export default router;
