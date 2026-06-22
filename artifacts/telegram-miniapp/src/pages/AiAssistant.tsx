import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles, Cpu, Paperclip, X, Trash2, Copy, Check, ShieldAlert, ShieldCheck, Loader2, ChevronRight, Clock } from "lucide-react";
import { getStoredSecret } from "./LockScreen";
import { useI18n } from "../lib/i18n";

interface Message {
  role: "user" | "model";
  text: string;
  engine?: string;
  imageUrl?: string;
  ts: Date;
}

interface HistoryPart {
  text?: string;
  functionCall?: unknown;
  functionResponse?: unknown;
}

interface HistoryItem {
  role: string;
  parts: HistoryPart[];
}

interface ActionDetails {
  function_name: string;
  arguments: Record<string, unknown>;
}

interface PendingAction {
  action_details: ActionDetails;
  history: HistoryItem[];
  engine: string;
}

interface ActionLogEntry {
  id: string;
  ts: Date;
  function_name: string;
  engine: string;
  description: string;
  outcome: "approved" | "cancelled";
  resultText: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ── Human-readable labels for mutation tools ──────────────────────────────

const TOOL_META: Record<string, { label: string; icon: string; danger: boolean; descFn: (args: Record<string, unknown>) => string }> = {
  delete_restricted_accounts: {
    label: "Delete Restricted Accounts",
    icon: "🗑️",
    danger: true,
    descFn: (a) => {
      const ids = a.account_ids as number[] | undefined;
      return `Permanently delete ${ids?.length ?? 0} account(s): ${ids?.map(i => `#${i}`).join(", ") ?? "—"}`;
    },
  },
  update_account_proxy: {
    label: "Update Account Proxy",
    icon: "🌐",
    danger: false,
    descFn: (a) => {
      const ids = a.account_ids as number[] | undefined;
      return `Set proxy on ${ids?.length ?? 0} account(s) to:\n${String(a.new_proxy_string ?? "—")}`;
    },
  },
  remove_dead_proxies: {
    label: "Remove Dead Proxies",
    icon: "🧹",
    danger: false,
    descFn: () => "Clear proxy field on ALL accounts with status proxy_failed",
  },
  pause_active_campaign: {
    label: "Pause Campaign",
    icon: "⏸️",
    danger: false,
    descFn: (a) => `Pause campaign #${a.campaign_id ?? "—"}`,
  },
  resume_campaign: {
    label: "Resume Campaign",
    icon: "▶️",
    danger: false,
    descFn: (a) => `Resume campaign #${a.campaign_id ?? "—"}`,
  },
  trigger_bulk_blast: {
    label: "Trigger Bulk Blast",
    icon: "🚀",
    danger: true,
    descFn: (a) => {
      const ids = a.account_ids as number[] | undefined;
      const targets = a.target_list as string[] | undefined;
      const msg = String(a.message_text ?? "").slice(0, 80);
      return `Send blast via ${ids?.length ?? 0} account(s) to ${targets?.length ?? 0} target(s)\nMessage: "${msg}${msg.length >= 80 ? "…" : ""}"`;
    },
  },
};

// ── Quick-reply suggestions ───────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  ua: [
    "Огляд платформи",
    "Стан акаунтів",
    "Перевірити проксі",
    "Які кампанії активні?",
    "Статус воркерів",
  ],
  en: [
    "Platform summary",
    "Account health",
    "Check failed proxies",
    "Active campaigns?",
    "Worker status",
  ],
};

// ── File → base64 helper ──────────────────────────────────────────────────

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Action Authorization Card ─────────────────────────────────────────────

function ActionAuthorizationCard({
  pending,
  onCancel,
  onApprove,
}: {
  pending: PendingAction;
  onCancel: () => void;
  onApprove: (result: string) => void;
}) {
  const { lang } = useI18n();
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = TOOL_META[pending.action_details.function_name] ?? {
    label: pending.action_details.function_name,
    icon: "⚙️",
    danger: false,
    descFn: (a: Record<string, unknown>) => JSON.stringify(a, null, 2),
  };

  const description = meta.descFn(pending.action_details.arguments);

  async function handleApprove() {
    setExecuting(true);
    setError(null);
    try {
      const secret = getStoredSecret();
      const res = await fetch(`${API_BASE}/api/v3/ai/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          function_name: pending.action_details.function_name,
          arguments: pending.action_details.arguments,
        }),
      });

      const data = await res.json() as { success: boolean; result?: Record<string, unknown>; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? `HTTP ${res.status}`);
        setExecuting(false);
        return;
      }

      // Build a human-readable success message
      const r = data.result ?? {};
      let successMsg = "";
      const fn = pending.action_details.function_name;
      if (fn === "delete_restricted_accounts") {
        successMsg = lang === "ua"
          ? `✅ Видалено ${r.deleted ?? 0} акаунт(ів).`
          : `✅ Deleted ${r.deleted ?? 0} account(s).`;
      } else if (fn === "update_account_proxy") {
        successMsg = lang === "ua"
          ? `✅ Проксі оновлено на ${r.updated ?? 0} акаунт(ах).`
          : `✅ Proxy updated on ${r.updated ?? 0} account(s).`;
      } else if (fn === "remove_dead_proxies") {
        successMsg = lang === "ua"
          ? `✅ Очищено проксі на ${r.cleared ?? 0} акаунт(ах) з proxy_failed.`
          : `✅ Cleared dead proxies on ${r.cleared ?? 0} account(s).`;
      } else if (fn === "pause_active_campaign") {
        successMsg = lang === "ua"
          ? `✅ Кампанію #${r.campaign_id ?? ""} призупинено.`
          : `✅ Campaign #${r.campaign_id ?? ""} paused.`;
      } else if (fn === "resume_campaign") {
        successMsg = lang === "ua"
          ? `✅ Кампанію #${r.campaign_id ?? ""} відновлено.`
          : `✅ Campaign #${r.campaign_id ?? ""} resumed.`;
      } else if (fn === "trigger_bulk_blast") {
        successMsg = lang === "ua"
          ? `✅ Нову кампанію "${String(r.campaign_name ?? "")}" (#${r.campaign_id ?? ""}) запущено для ${r.target_count ?? 0} отримувач(ів).`
          : `✅ New campaign "${String(r.campaign_name ?? "")}" (#${r.campaign_id ?? ""}) launched for ${r.target_count ?? 0} target(s).`;
      } else {
        successMsg = `✅ ${meta.label} completed.\n${JSON.stringify(r, null, 2)}`;
      }

      onApprove(successMsg);
    } catch (e) {
      setError(String(e));
      setExecuting(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      animation: "aiFadeIn 0.22s ease both",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        margin: "0 12px 24px",
        borderRadius: 24,
        background: "linear-gradient(160deg, rgba(18,14,35,0.98) 0%, rgba(10,8,22,0.98) 100%)",
        border: meta.danger
          ? "1.5px solid rgba(239,68,68,0.45)"
          : "1.5px solid rgba(139,92,246,0.45)",
        boxShadow: meta.danger
          ? "0 0 60px rgba(239,68,68,0.2), 0 24px 60px rgba(0,0,0,0.6)"
          : "0 0 60px rgba(139,92,246,0.15), 0 24px 60px rgba(0,0,0,0.6)",
        padding: "20px 20px 20px",
        animation: "authCardSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <style>{`
          @keyframes authCardSlideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: meta.danger
              ? "linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.2) 100%)"
              : "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.2) 100%)",
            border: meta.danger
              ? "1px solid rgba(239,68,68,0.35)"
              : "1px solid rgba(139,92,246,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            boxShadow: meta.danger
              ? "0 0 20px rgba(239,68,68,0.2)"
              : "0 0 20px rgba(139,92,246,0.2)",
          }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.danger ? "rgba(252,165,165,0.7)" : "rgba(196,181,253,0.7)", marginBottom: 2 }}>
              {lang === "ua" ? "Запит на дію" : "Action Request"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8ff", letterSpacing: "0.01em" }}>
              {meta.label}
            </div>
          </div>
          {meta.danger
            ? <ShieldAlert size={20} color="rgba(252,165,165,0.6)" />
            : <ShieldCheck size={20} color="rgba(196,181,253,0.6)" />
          }
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: meta.danger ? "rgba(239,68,68,0.2)" : "rgba(139,92,246,0.2)", marginBottom: 16 }} />

        {/* Action description */}
        <div style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(148,163,184,0.55)", marginBottom: 8 }}>
            {lang === "ua" ? "Деталі операції" : "Operation Details"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(226,232,255,0.85)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace" }}>
            {description}
          </div>
        </div>

        {/* Engine badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", letterSpacing: "0.04em" }}>
            {lang === "ua" ? "Запропоновано:" : "Proposed by:"}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: pending.engine === "groq" ? "rgba(167,139,250,0.7)" : "rgba(96,165,250,0.7)",
            letterSpacing: "0.04em",
            background: pending.engine === "groq" ? "rgba(139,92,246,0.1)" : "rgba(59,130,246,0.1)",
            border: pending.engine === "groq" ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(59,130,246,0.2)",
            borderRadius: 6,
            padding: "2px 7px",
          }}>
            {pending.engine === "groq" ? "⚡ Groq · Llama" : "✦ Gemini 2.5 Flash"}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div style={{
            padding: "10px 13px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "rgba(252,165,165,0.9)",
            fontSize: 12,
            lineHeight: 1.5,
            marginBottom: 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={executing}
            style={{
              flex: 1,
              padding: "13px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(186,200,230,0.8)",
              fontSize: 14,
              fontWeight: 600,
              cursor: executing ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.18s",
              opacity: executing ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              if (!executing) {
                (e.currentTarget).style.background = "rgba(255,255,255,0.09)";
                (e.currentTarget).style.borderColor = "rgba(255,255,255,0.2)";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget).style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            {lang === "ua" ? "Скасувати" : "Cancel Request"}
          </button>

          {/* Approve */}
          <button
            onClick={() => void handleApprove()}
            disabled={executing}
            style={{
              flex: 1.4,
              padding: "13px 12px",
              borderRadius: 14,
              background: meta.danger
                ? executing ? "rgba(185,28,28,0.4)" : "linear-gradient(135deg, rgba(239,68,68,0.6) 0%, rgba(185,28,28,0.55) 100%)"
                : executing ? "rgba(109,40,217,0.4)" : "linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(99,102,241,0.55) 100%)",
              border: meta.danger
                ? "1px solid rgba(239,68,68,0.5)"
                : "1px solid rgba(139,92,246,0.5)",
              color: "#e2e8ff",
              fontSize: 14,
              fontWeight: 700,
              cursor: executing ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              transition: "all 0.18s",
              boxShadow: meta.danger
                ? executing ? "none" : "0 0 20px rgba(239,68,68,0.25)"
                : executing ? "none" : "0 0 20px rgba(139,92,246,0.3)",
            }}
          >
            {executing
              ? <><Loader2 size={15} color="#c4b5fd" style={{ animation: "spin 0.8s linear infinite" }} /> {lang === "ua" ? "Виконую…" : "Executing…"}</>
              : <>{lang === "ua" ? "Підтвердити та виконати" : "Approve & Execute"} <ChevronRight size={15} /></>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Action History Panel ──────────────────────────────────────────────────

function ActionHistoryPanel({ log, lang, onClear }: { log: ActionLogEntry[]; lang: string; onClear: () => void }) {
  if (log.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: 0.55, animation: "aiFadeIn 0.25s ease both" }}>
        <Clock size={34} color="#a78bfa" />
        <div style={{ fontSize: 13, color: "rgba(180,200,240,0.7)", textAlign: "center", lineHeight: 1.5 }}>
          {lang === "ua" ? "Журнал дій порожній.\nТут з'являться всі підтверджені\nта скасовані операції AI." : "No actions recorded yet.\nApproved and cancelled AI operations\nwill appear here."}
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 8, scrollbarWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {lang === "ua" ? `${log.length} запис${log.length === 1 ? "" : "ів"}` : `${log.length} entr${log.length === 1 ? "y" : "ies"}`}
        </div>
        <button
          onClick={onClear}
          style={{
            fontSize: 11, color: "rgba(252,165,165,0.7)", background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "3px 10px",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {lang === "ua" ? "Очистити все" : "Clear all"}
        </button>
      </div>
      {log.map(entry => {
        const meta = TOOL_META[entry.function_name] ?? { label: entry.function_name, icon: "⚙️", danger: false, descFn: () => "" };
        const approved = entry.outcome === "approved";
        return (
          <div key={entry.id} style={{
            padding: "11px 14px", borderRadius: 16, flexShrink: 0,
            background: approved
              ? "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
              : "rgba(255,255,255,0.025)",
            border: approved
              ? `1px solid ${meta.danger ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.25)"}`
              : "1px solid rgba(255,255,255,0.07)",
            animation: "aiFadeIn 0.25s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: approved ? "#e2e8ff" : "rgba(180,200,230,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {meta.label}
                </div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0,
                color: approved ? "rgba(74,222,128,0.85)" : "rgba(252,165,165,0.65)",
                background: approved ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: approved ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.2)",
                borderRadius: 6, padding: "2px 7px",
              }}>
                {approved ? (lang === "ua" ? "✓ Виконано" : "✓ Done") : (lang === "ua" ? "✗ Скасовано" : "✗ Cancelled")}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(180,200,230,0.5)", lineHeight: 1.5, marginBottom: 7, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 9px" }}>
              {entry.description}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(120,140,180,0.38)" }}>
                {entry.ts.toLocaleDateString(lang === "ua" ? "uk-UA" : "en-GB", { day: "2-digit", month: "short" })}
                {" · "}
                {entry.ts.toLocaleTimeString(lang === "ua" ? "uk-UA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ fontSize: 9, letterSpacing: "0.04em", color: entry.engine === "groq" ? "rgba(167,139,250,0.5)" : "rgba(96,165,250,0.5)" }}>
                {entry.engine === "groq" ? "⚡ Groq" : "✦ Gemini"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function AiAssistantPage() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: lang === "ua"
        ? "Привіт! Я PROMO-Fuel System Copilot. Можу допомогти з управлінням акаунтами, проксі SOCKS5, кампаніями та моніторингом платформи. Тепер я також можу виконувати дії — призупиняти кампанії, оновлювати проксі, видаляти заблоковані акаунти. Перед виконанням завжди буде запит на підтвердження."
        : "Hi! I'm PROMO-Fuel System Copilot. I can help with account management, SOCKS5 proxies, campaigns, and platform monitoring. I can now also take actions — pause campaigns, update proxies, delete restricted accounts. Every action requires your approval before execution.",
      ts: new Date(),
    },
  ]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [history, setHistory]           = useState<HistoryItem[]>([]);
  const [attachedImage, setAttached]    = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem("pf_action_log");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<ActionLogEntry & { ts: string }>;
      return parsed.map(e => ({ ...e, ts: new Date(e.ts) }));
    } catch { return []; }
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  function addLogEntry(entry: ActionLogEntry) {
    setActionLog(prev => {
      const next = [entry, ...prev].slice(0, 100);
      try { localStorage.setItem("pf_action_log", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function clearLog() {
    setActionLog([]);
    try { localStorage.removeItem("pf_action_log"); } catch {}
  }

  const GREETING: Message = {
    role: "model",
    text: lang === "ua"
      ? "Привіт! Я PROMO-Fuel System Copilot. Можу допомогти з управлінням акаунтами, проксі SOCKS5, кампаніями та моніторингом платформи. Тепер я також можу виконувати дії — призупиняти кампанії, оновлювати проксі, видаляти заблоковані акаунти. Перед виконанням завжди буде запит на підтвердження."
      : "Hi! I'm PROMO-Fuel System Copilot. I can help with account management, SOCKS5 proxies, campaigns, and platform monitoring. I can now also take actions — pause campaigns, update proxies, delete restricted accounts. Every action requires your approval before execution.",
    ts: new Date(),
  };

  function resetChat() {
    setMessages([GREETING]);
    setHistory([]);
    setInput("");
    setAttached(null);
    setPendingAction(null);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingAction]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToBase64(file).then(setAttached).catch(console.error);
    e.target.value = "";
  }

  function removeAttachment() {
    setAttached(null);
  }

  // ── Send ────────────────────────────────────────────────────────────────

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if ((!text && !attachedImage) || loading) return;

    const img = attachedImage;
    const sentAt = new Date();
    if (!override) setInput("");
    setAttached(null);
    setMessages(prev => [...prev, { role: "user", text: text || "📎", imageUrl: img?.dataUrl, ts: sentAt }]);
    setLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const CAPACITY_MSG = lang === "ua"
      ? "⚠️ Асистент тимчасово перевантажений. Спробуйте ще раз за хвилину."
      : "⚠️ The Assistant is temporarily over capacity. Please try again in a moment.";

    try {
      const secret = getStoredSecret();
      const body: Record<string, unknown> = { message: text || "Please analyze the attached image.", history };
      if (img) {
        body.imageBase64   = img.base64;
        body.imageMimeType = img.mimeType;
      }

      const res = await fetch(`${API_BASE}/api/v3/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "model", text: CAPACITY_MSG, ts: new Date() }]);
        return;
      }

      const data = await res.json() as {
        reply?: string;
        history?: HistoryItem[];
        engine?: string;
        status?: string;
        action_details?: ActionDetails;
      };

      // ── Human-in-the-loop gate ───────────────────────────────────────
      if (data.status === "pending_user_approval" && data.action_details) {
        const actionLabel = TOOL_META[data.action_details.function_name]?.label ?? data.action_details.function_name;
        const bridgeMsg = lang === "ua"
          ? `🔒 AI хоче виконати дію: **${actionLabel}**. Перегляньте деталі нижче та підтвердіть або скасуйте.`
          : `🔒 AI wants to perform: **${actionLabel}**. Review the details below and approve or cancel.`;

        setMessages(prev => [...prev, {
          role: "model",
          text: bridgeMsg,
          engine: data.engine,
          ts: new Date(),
        }]);
        setHistory(data.history ?? history);
        setPendingAction({
          action_details: data.action_details,
          history: data.history ?? history,
          engine: data.engine ?? "gemini",
        });
        return;
      }

      setMessages(prev => [...prev, {
        role: "model",
        text: data.reply ?? CAPACITY_MSG,
        engine: data.engine,
        ts: new Date(),
      }]);
      setHistory(data.history ?? []);

    } catch {
      setMessages(prev => [...prev, { role: "model", text: CAPACITY_MSG, ts: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, history, attachedImage, lang]);

  // ── Action approval/cancel handlers ─────────────────────────────────────

  function handleActionCancel() {
    if (pendingAction) {
      const meta = TOOL_META[pendingAction.action_details.function_name];
      addLogEntry({
        id: `${Date.now()}-${Math.random()}`,
        ts: new Date(),
        function_name: pendingAction.action_details.function_name,
        engine: pendingAction.engine,
        description: meta?.descFn(pendingAction.action_details.arguments) ?? JSON.stringify(pendingAction.action_details.arguments),
        outcome: "cancelled",
        resultText: lang === "ua" ? "❌ Дію скасовано." : "❌ Action cancelled.",
      });
    }
    const cancelMsg = lang === "ua" ? "❌ Дію скасовано." : "❌ Action cancelled.";
    setMessages(prev => [...prev, { role: "model", text: cancelMsg, ts: new Date() }]);
    setPendingAction(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleActionApprove(successMsg: string) {
    if (pendingAction) {
      const meta = TOOL_META[pendingAction.action_details.function_name];
      addLogEntry({
        id: `${Date.now()}-${Math.random()}`,
        ts: new Date(),
        function_name: pendingAction.action_details.function_name,
        engine: pendingAction.engine,
        description: meta?.descFn(pendingAction.action_details.arguments) ?? JSON.stringify(pendingAction.action_details.arguments),
        outcome: "approved",
        resultText: successMsg,
      });
    }
    setPendingAction(null);
    setMessages(prev => [...prev, { role: "model", text: successMsg, ts: new Date() }]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const canSend = (input.trim().length > 0 || attachedImage !== null) && !loading && !pendingAction;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)",
            border: "1px solid rgba(139,92,246,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(139,92,246,0.25)", flexShrink: 0,
          }}>
            <Cpu size={18} color="#a78bfa" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8ff", letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: 6 }}>
              {lang === "ua" ? "AI Помічник" : "AI Assistant"}
              <Sparkles size={13} color="#a78bfa" style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.55)", marginTop: 1 }}>
              PROMO-Fuel System Copilot · Autonomous Mode
            </div>
          </div>
          {/* History toggle */}
          <button
            onClick={() => setShowHistory(h => !h)}
            title={lang === "ua" ? "Журнал дій" : "Action history"}
            style={{
              position: "relative",
              width: 34, height: 34, borderRadius: 11,
              background: showHistory ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
              border: showHistory ? "1px solid rgba(139,92,246,0.45)" : "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.18s",
            }}
          >
            <Clock size={15} color={showHistory ? "#a78bfa" : "rgba(160,180,230,0.5)"} />
            {actionLog.length > 0 && !showHistory && (
              <div style={{
                position: "absolute", top: -4, right: -4,
                width: 16, height: 16, borderRadius: "50%",
                background: "linear-gradient(135deg, #a78bfa, #6366f1)",
                border: "2px solid rgba(7,9,15,1)",
                fontSize: 8, fontWeight: 700, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {actionLog.length > 99 ? "99" : actionLog.length}
              </div>
            )}
          </button>

          {messages.length > 1 && !showHistory && (
            <button
              onClick={resetChat}
              disabled={loading}
              title={lang === "ua" ? "Очистити чат" : "Clear chat"}
              style={{
                width: 34, height: 34, borderRadius: 11,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget).style.background = "rgba(239,68,68,0.12)";
                (e.currentTarget).style.borderColor = "rgba(239,68,68,0.3)";
              }}
              onMouseLeave={e => {
                (e.currentTarget).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <Trash2 size={15} color="rgba(160,180,230,0.5)" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes aiTyping  { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes aiFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── History panel ──────────────────────────────────────────────── */}
      {showHistory && (
        <ActionHistoryPanel log={actionLog} lang={lang} onClear={clearLog} />
      )}

      {/* ── Messages ───────────────────────────────────────────────────── */}
      {!showHistory && (
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, animation: "aiFadeIn 0.3s ease both" }}>

            {msg.role === "model" && (
              <div style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.35) 100%)",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(139,92,246,0.2)",
              }}>
                <Bot size={14} color="#a78bfa" />
              </div>
            )}

            <div style={{
              maxWidth: "78%",
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 3,
            }}>
              <div style={{
                padding: msg.imageUrl ? "6px" : "10px 13px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.3) 100%)"
                  : "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
                border: msg.role === "user" ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: msg.role === "user" ? "0 4px 16px rgba(59,130,246,0.15)" : "0 4px 16px rgba(0,0,0,0.25)",
                display: "flex",
                flexDirection: "column",
              }}>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="attachment"
                    style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 12, objectFit: "contain", marginBottom: msg.text && msg.text !== "📎" ? 6 : 0 }}
                  />
                )}
                {msg.text && msg.text !== "📎" && (
                  <div style={{ padding: msg.imageUrl ? "4px 7px 4px" : "0" }}>
                    <MessageContent text={msg.text} />
                  </div>
                )}
                {msg.role === "model" && msg.text && msg.text !== "📎" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                    <CopyButton text={msg.text} />
                    {msg.engine === "groq" && (
                      <div style={{ fontSize: 9, color: "rgba(167,139,250,0.5)", letterSpacing: "0.04em", paddingRight: 2 }}>
                        ⚡ Groq · Llama
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{
                fontSize: 10,
                color: "rgba(120,140,180,0.38)",
                letterSpacing: "0.02em",
                paddingLeft: msg.role === "user" ? 0 : 2,
                paddingRight: msg.role === "user" ? 2 : 0,
              }}>
                {msg.ts.toLocaleTimeString(lang === "ua" ? "uk-UA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 8, animation: "aiFadeIn 0.3s ease both" }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: "linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.35) 100%)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={14} color="#a78bfa" />
            </div>
            <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "aiTyping 1.4s ease-in-out infinite", animationDelay: `${d * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && !pendingAction && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "4px 0 8px", animation: "aiFadeIn 0.4s ease 0.15s both" }}>
            {(SUGGESTIONS[lang] ?? SUGGESTIONS["en"]).map((chip, i) => (
              <button
                key={i}
                onClick={() => void send(chip)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.12) 100%)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "rgba(196,181,253,0.9)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transition: "all 0.18s ease",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  (e.currentTarget).style.background = "linear-gradient(135deg, rgba(139,92,246,0.28) 0%, rgba(59,130,246,0.22) 100%)";
                  (e.currentTarget).style.borderColor = "rgba(139,92,246,0.55)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget).style.background = "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.12) 100%)";
                  (e.currentTarget).style.borderColor = "rgba(139,92,246,0.3)";
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      )}

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: "8px 12px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(0deg, rgba(7,9,15,0.8) 0%, transparent 100%)" }}>

        {attachedImage && (
          <div style={{ marginBottom: 8, position: "relative", display: "inline-block" }}>
            <img
              src={attachedImage.dataUrl}
              alt="preview"
              style={{ height: 64, borderRadius: 10, border: "1px solid rgba(139,92,246,0.4)", objectFit: "cover", display: "block" }}
            />
            <button
              onClick={removeAttachment}
              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            >
              <X size={10} color="rgba(220,235,255,0.8)" />
            </button>
          </div>
        )}

        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          background: pendingAction
            ? "linear-gradient(145deg, rgba(139,92,246,0.06) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          border: pendingAction ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(255,255,255,0.14)",
          borderRadius: 20, padding: "8px 8px 8px 14px",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset",
          opacity: pendingAction ? 0.6 : 1,
          transition: "all 0.2s",
        }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading || !!pendingAction}
            title={lang === "ua" ? "Прикріпити зображення" : "Attach image"}
            style={{ width: 32, height: 32, borderRadius: 10, background: attachedImage ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${attachedImage ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: (loading || pendingAction) ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.18s" }}
          >
            <Paperclip size={14} color={attachedImage ? "#a78bfa" : "rgba(160,180,230,0.4)"} />
          </button>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              pendingAction
                ? (lang === "ua" ? "Підтвердіть або скасуйте дію вище…" : "Approve or cancel the action above…")
                : (lang === "ua" ? "Запитайте або дайте команду: призупини кампанію, оновити проксі…" : "Ask or command: pause campaign, update proxy, delete banned…")
            }
            rows={1}
            disabled={loading || !!pendingAction}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "rgba(220,235,255,0.92)", fontSize: 14, lineHeight: "1.5", resize: "none", maxHeight: 120, overflowY: "auto", scrollbarWidth: "none", fontFamily: "inherit", paddingTop: 2 }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />

          <button
            onClick={() => void send()}
            disabled={!canSend}
            style={{ width: 36, height: 36, borderRadius: 13, background: canSend ? "linear-gradient(135deg, rgba(139,92,246,0.7) 0%, rgba(59,130,246,0.65) 100%)" : "rgba(255,255,255,0.06)", border: canSend ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSend ? "pointer" : "not-allowed", flexShrink: 0, transition: "all 0.22s ease", boxShadow: canSend ? "0 0 16px rgba(139,92,246,0.3)" : "none" }}
          >
            <Send size={16} color={canSend ? "#c4b5fd" : "rgba(160,180,230,0.3)"} />
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: "rgba(120,140,180,0.4)", marginTop: 6, letterSpacing: "0.03em" }}>
          {pendingAction
            ? (lang === "ua" ? "⚠️ Очікується підтвердження дії" : "⚠️ Awaiting action approval")
            : (lang === "ua" ? "Enter — надіслати · Shift+Enter — новий рядок" : "Enter — send · Shift+Enter — new line")
          }
        </div>
      </div>

      {/* ── Action Authorization Card overlay ───────────────────────────── */}
      {pendingAction && (
        <ActionAuthorizationCard
          pending={pendingAction}
          onCancel={handleActionCancel}
          onApprove={handleActionApprove}
        />
      )}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy"
      style={{
        marginTop: 6,
        padding: "3px 8px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 8,
        background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
        cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        alignSelf: "flex-start",
      }}
    >
      {copied
        ? <Check size={11} color="rgba(74,222,128,0.9)" />
        : <Copy size={11} color="rgba(160,180,230,0.45)" />}
      <span style={{
        fontSize: 10,
        color: copied ? "rgba(74,222,128,0.9)" : "rgba(160,180,230,0.4)",
        letterSpacing: "0.03em",
        transition: "color 0.18s",
      }}>
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

// ── Message content renderer ──────────────────────────────────────────────

function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(220,235,255,0.9)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "#e2e8ff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 5, padding: "1px 5px", fontSize: 12, color: "#c4b5fd", fontFamily: "monospace" }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
