import { useState, useEffect, useCallback, useRef } from "react";
import { ShieldCheck, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Send, X, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { getStoredSecret } from "./LockScreen";

const API = "";

interface VHStats {
  today_solved:    number;
  today_dismissed: number;
  current_pending: number;
  all_time_solved: number;
  all_time_total:  number;
}

const ACCENT  = "#2de897";
const PURPLE  = "#a855f7";
const AMBER   = "#f59e0b";
const RED     = "#ff6b7a";
const BLUE    = "#3b82f6";
const GLASS   = "rgba(255,255,255,0.055)";
const GLASS2  = "rgba(255,255,255,0.09)";
const BORDER  = "rgba(255,255,255,0.10)";
const BORDER2 = "rgba(255,255,255,0.16)";

interface ButtonRow { text: string; callback_data: string | null }

interface VerifItem {
  id: number;
  account_id: number;
  phone: string | null;
  label: string | null;
  group_username: string | null;
  group_title: string | null;
  bot_message_id: number;
  captcha_text: string | null;
  buttons_json: string | null;
  captcha_type: "button" | "text_reply";
  status: string;
  created_at: string;
}

function authHeaders(): Record<string, string> {
  const s = getStoredSecret();
  return s ? { Authorization: `Bearer ${s}` } : {};
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function parseButtons(json: string | null): ButtonRow[][] {
  if (!json) return [];
  try { return JSON.parse(json) as ButtonRow[][]; }
  catch { return []; }
}

function ageColor(ts: string): string {
  const min = (Date.now() - new Date(ts).getTime()) / 60000;
  if (min < 2)  return "#2de897";
  if (min < 5)  return "#f59e0b";
  return "#ff6b7a";
}

function playPing() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 940;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => void ctx.close(), 600);
  } catch {}
}

// ── Single captcha card ─────────────────────────────────────────────────────

function VerifCard({
  item,
  onSolved,
  lang,
}: {
  item: VerifItem;
  onSolved: (id: number) => void;
  lang: string;
}) {
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [textAnswer, setAnswer]   = useState("");
  const [expanded, setExpanded]   = useState(true);
  const [done, setDone]           = useState(false);

  const buttons = parseButtons(item.buttons_json);
  const L = (en: string, ua: string) => lang === "ua" ? ua : en;

  const accountLabel = item.label
    ? `${item.label} (${item.phone ?? ""})`
    : (item.phone ?? `#${item.account_id}`);

  const groupLabel = item.group_title || item.group_username || L("Unknown group", "Невідома група");

  async function handleClick(flatIdx: number) {
    if (busy || done) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/verifications/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ verification_id: item.id, button_index: flatIdx }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? "Click failed"); }
      else { setDone(true); setTimeout(() => onSolved(item.id), 600); }
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function handleReply() {
    if (busy || done || !textAnswer.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/verifications/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ verification_id: item.id, answer: textAnswer.trim() }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? "Reply failed"); }
      else { setDone(true); setTimeout(() => onSolved(item.id), 600); }
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function handleDismiss() {
    if (busy || done) return;
    setBusy(true);
    try {
      await fetch(`${API}/api/verifications/resolve/${item.id}?action=dismissed`, {
        method: "POST",
        headers: authHeaders(),
      });
      setDone(true);
      setTimeout(() => onSolved(item.id), 400);
    } catch {}
    finally { setBusy(false); }
  }

  // Flat buttons for layout
  const flatButtons: { text: string; flatIdx: number }[] = [];
  buttons.forEach(row => row.forEach(btn => {
    flatButtons.push({ text: btn.text, flatIdx: flatButtons.length });
  }));

  const cardBg = done
    ? "rgba(45,232,151,0.08)"
    : item.captcha_type === "button"
    ? "rgba(168,85,247,0.06)"
    : "rgba(59,130,246,0.06)";

  const cardBorder = done
    ? "rgba(45,232,151,0.35)"
    : item.captcha_type === "button"
    ? "rgba(168,85,247,0.25)"
    : "rgba(59,130,246,0.25)";

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 20,
      marginBottom: 12,
      overflow: "hidden",
      transition: "all 0.3s ease",
      opacity: done ? 0.6 : 1,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 14px 13px",
          cursor: "pointer",
        }}
      >
        {/* Type badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: item.captcha_type === "button"
            ? "rgba(168,85,247,0.18)"
            : "rgba(59,130,246,0.18)",
          border: item.captcha_type === "button"
            ? "1px solid rgba(168,85,247,0.35)"
            : "1px solid rgba(59,130,246,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {done ? "✅" : item.captcha_type === "button" ? "🔘" : "✏️"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {groupLabel}
          </div>
          <div style={{ fontSize: 11, color: "rgba(160,190,230,0.55)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {accountLabel}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
            color: item.captcha_type === "button" ? PURPLE : BLUE,
            background: item.captcha_type === "button" ? "rgba(168,85,247,0.12)" : "rgba(59,130,246,0.12)",
            border: item.captcha_type === "button" ? "1px solid rgba(168,85,247,0.25)" : "1px solid rgba(59,130,246,0.25)",
            borderRadius: 6, padding: "2px 7px",
          }}>
            {item.captcha_type === "button" ? L("Button", "Кнопка") : L("Text", "Текст")}
          </div>
          <div style={{ fontSize: 9, color: ageColor(item.created_at), fontWeight: 600, transition: "color 2s" }}>{timeAgo(item.created_at)}</div>
          {expanded ? <ChevronUp size={14} color="rgba(148,163,184,0.4)" /> : <ChevronDown size={14} color="rgba(148,163,184,0.4)" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Captcha text */}
          {item.captcha_text && (
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12, padding: "10px 13px", marginBottom: 12,
              fontSize: 13, color: "rgba(226,232,255,0.85)",
              lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {item.captcha_text}
            </div>
          )}

          {/* Button captcha */}
          {item.captcha_type === "button" && flatButtons.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {flatButtons.map(({ text, flatIdx }) => (
                <button
                  key={flatIdx}
                  onClick={() => void handleClick(flatIdx)}
                  disabled={busy || done}
                  style={{
                    padding: "9px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: busy || done
                      ? "rgba(168,85,247,0.08)"
                      : "linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(139,92,246,0.2) 100%)",
                    border: "1px solid rgba(168,85,247,0.4)",
                    color: busy || done ? "rgba(196,181,253,0.4)" : "rgba(196,181,253,0.9)",
                    cursor: busy || done ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.18s",
                    boxShadow: busy || done ? "none" : "0 0 12px rgba(168,85,247,0.15)",
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          {/* Text reply captcha */}
          {item.captcha_type === "text_reply" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={textAnswer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void handleReply(); }}
                placeholder={L("Type answer…", "Введіть відповідь…")}
                disabled={busy || done}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(59,130,246,0.35)",
                  borderRadius: 12, padding: "9px 13px",
                  fontSize: 13, color: "rgba(226,232,255,0.9)",
                  fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={() => void handleReply()}
                disabled={busy || done || !textAnswer.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: textAnswer.trim() && !busy && !done
                    ? "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(37,99,235,0.45))"
                    : "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: textAnswer.trim() && !busy && !done ? "pointer" : "not-allowed",
                  transition: "all 0.18s",
                }}
              >
                <Send size={15} color={textAnswer.trim() && !busy && !done ? "#93c5fd" : "rgba(147,197,253,0.3)"} />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 10, marginBottom: 10,
              background: "rgba(255,107,122,0.1)", border: "1px solid rgba(255,107,122,0.3)",
              fontSize: 12, color: "rgba(255,180,180,0.9)",
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Done banner */}
          {done && (
            <div style={{
              padding: "8px 12px", borderRadius: 10, marginBottom: 8,
              background: "rgba(45,232,151,0.1)", border: "1px solid rgba(45,232,151,0.3)",
              fontSize: 12, fontWeight: 600, color: "rgba(45,232,151,0.9)",
            }}>
              ✅ {L("Solved! Removing…", "Вирішено! Прибираємо…")}
            </div>
          )}

          {/* Dismiss button */}
          {!done && (
            <button
              onClick={() => void handleDismiss()}
              disabled={busy}
              style={{
                fontSize: 11, color: "rgba(148,163,184,0.5)",
                background: "transparent", border: "none",
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "inherit", padding: "2px 0",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <X size={11} /> {L("Dismiss", "Відхилити")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function VerificationHubPage() {
  const { lang } = useI18n();
  const L = (en: string, ua: string) => lang === "ua" ? ua : en;

  const [items, setItems]         = useState<VerifItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [listenerBusy, setLBusy]  = useState(false);
  const [listenerMsg, setLMsg]    = useState<string | null>(null);
  const [dismissBusy,    setDismissBusy]    = useState(false);
  const [stats,          setStats]          = useState<VHStats | null>(null);
  const [activeListeners,  setActiveListeners]  = useState<number[]>([]);
  const [stopAllBusy,      setStopAllBusy]      = useState(false);
  const [hubTab,           setHubTab]           = useState<"pending" | "history">("pending");
  const [history,          setHistory]          = useState<VerifItem[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef<number>(-1);

  const fetchPending = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/api/verifications/pending`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as VerifItem[];
      const newPending = data.filter(x => x.status === "pending").length;
      if (prevCountRef.current >= 0 && newPending > prevCountRef.current) {
        playPing();
      }
      prevCountRef.current = newPending;
      setItems(data);
      setError(null);
    } catch (e) {
      if (!silent) setError(String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/verifications/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json() as VHStats);
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const [solved, dismissed] = await Promise.all([
        fetch(`${API}/api/verifications/pending?status=solved`,    { headers: authHeaders() }).then(r => r.ok ? r.json() as Promise<VerifItem[]> : []),
        fetch(`${API}/api/verifications/pending?status=dismissed`, { headers: authHeaders() }).then(r => r.ok ? r.json() as Promise<VerifItem[]> : []),
      ]);
      const merged = [...solved, ...dismissed]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);
      setHistory(merged);
    } catch {}
  }, []);

  const fetchListeners = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/verifications/listeners`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as { active: number[] };
        setActiveListeners(data.active ?? []);
      }
    } catch {}
  }, []);

  async function handleStopAll() {
    setStopAllBusy(true);
    try {
      await Promise.all(activeListeners.map(id =>
        fetch(`${API}/api/verifications/listeners/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ account_id: id }),
        }).catch(() => {}),
      ));
      setActiveListeners([]);
      setLMsg(L("✓ All listeners stopped", "✓ Всі слухачі зупинені"));
      setTimeout(() => setLMsg(null), 4000);
    } catch (e) { setLMsg(String(e)); }
    finally { setStopAllBusy(false); }
  }

  useEffect(() => {
    void fetchPending();
    void fetchStats();
    void fetchListeners();
    void fetchHistory();
    timerRef.current = setInterval(() => {
      void fetchPending(true);
      void fetchStats();
      void fetchListeners();
      void fetchHistory();
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchPending, fetchStats, fetchListeners, fetchHistory]);

  function handleSolved(id: number) {
    setItems(prev => prev.filter(x => x.id !== id));
  }

  async function handleStartAll() {
    setLBusy(true); setLMsg(null);
    try {
      const res = await fetch(`${API}/api/verifications/listeners/start-all`, {
        method: "POST", headers: authHeaders(),
      });
      const data = await res.json() as { started: number; skipped: number; total: number };
      setLMsg(L(
        `✓ Started listeners for ${data.started}/${data.total} accounts`,
        `✓ Запущено слухачів для ${data.started}/${data.total} акаунтів`,
      ));
      setTimeout(() => setLMsg(null), 5000);
    } catch (e) { setLMsg(String(e)); }
    finally { setLBusy(false); }
  }

  const pending      = items.filter(i => i.status === "pending");
  const allClear     = !loading && pending.length === 0;
  const expiredCount = pending.filter(i => (Date.now() - new Date(i.created_at).getTime()) > 5 * 60 * 1000).length;

  async function handleDismissExpired() {
    const expired = pending.filter(i => (Date.now() - new Date(i.created_at).getTime()) > 5 * 60 * 1000);
    if (!expired.length) return;
    setDismissBusy(true);
    await Promise.all(expired.map(i =>
      fetch(`${API}/api/verifications/resolve/${i.id}?action=dismissed`, {
        method: "POST", headers: authHeaders(),
      }).catch(() => {})
    ));
    setItems(prev => prev.filter(i => !expired.some(e => e.id === i.id)));
    setDismissBusy(false);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 100%)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 13,
            background: "linear-gradient(135deg, rgba(45,232,151,0.22) 0%, rgba(168,85,247,0.18) 100%)",
            border: "1px solid rgba(45,232,151,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(45,232,151,0.18)", flexShrink: 0,
          }}>
            <ShieldCheck size={18} color={ACCENT} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8ff", letterSpacing: "0.01em" }}>
              {L("Verification Hub", "Верифікація")}
            </div>
            {stats ? (
              <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                {[
                  { val: stats.today_solved,    label: L("solved","вирішено"),     color: ACCENT },
                  { val: stats.today_dismissed, label: L("dismissed","відхилено"), color: "rgba(148,163,184,0.5)" },
                  { val: stats.all_time_total,  label: L("total","всього"),        color: "rgba(148,163,184,0.35)" },
                ].map(({ val, label, color }) => (
                  <span key={label} style={{ fontSize: 10, color, fontWeight: 600 }}>
                    {val} {label}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "rgba(160,180,230,0.5)", marginTop: 1 }}>
                {L("Human-in-the-Loop captcha solver", "Вирішення капчі оператором")}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {/* Pending badge */}
            {pending.length > 0 && (
              <div style={{
                minWidth: 26, height: 26, borderRadius: 9, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.3))",
                border: "1px solid rgba(245,158,11,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#fcd34d",
                boxShadow: "0 0 14px rgba(245,158,11,0.3)",
                padding: "0 7px",
              }}>
                {pending.length}
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={() => { void fetchPending(); void fetchHistory(); }}
              style={{
                width: 34, height: 34, borderRadius: 11,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <RefreshCw size={14} color="rgba(160,180,230,0.5)" style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div style={{ display: "flex", gap: 3, marginTop: 10, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: "3px" }}>
          {(["pending", "history"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setHubTab(tab)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 9, fontSize: 11, fontWeight: 700,
                border: "none", fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                background: hubTab === tab ? "rgba(255,255,255,0.1)" : "transparent",
                color: hubTab === tab ? "#e2e8ff" : "rgba(148,163,184,0.45)",
              }}
            >
              {tab === "pending"
                ? `${L("Pending","Очікують")}${pending.length > 0 ? ` (${pending.length})` : ""}`
                : `${L("History","Історія")}${history.length > 0 ? ` (${history.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 14px 16px", scrollbarWidth: "none" }}>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes vhFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        `}</style>

        {/* Listener control */}
        <div style={{
          background: GLASS2, border: `1px solid ${BORDER2}`,
          borderRadius: 16, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(226,232,255,0.85)" }}>
                  {L("Captcha Listener", "Слухач капч")}
                </div>
                {activeListeners.length > 0 && (
                  <div style={{
                    fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6,
                    background: "rgba(45,232,151,0.15)", border: "1px solid rgba(45,232,151,0.3)",
                    color: ACCENT, letterSpacing: "0.04em",
                  }}>
                    {activeListeners.length} {L("active","активних")}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", lineHeight: 1.4, marginTop: 2 }}>
                {L(
                  "Monitors all active accounts for incoming captcha messages",
                  "Відстежує всі активні акаунти на вхідні капча-повідомлення",
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {activeListeners.length > 0 && (
                <button
                  onClick={() => void handleStopAll()}
                  disabled={stopAllBusy}
                  style={{
                    padding: "8px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: stopAllBusy ? "rgba(255,107,122,0.06)" : "rgba(255,107,122,0.12)",
                    border: "1px solid rgba(255,107,122,0.3)",
                    color: stopAllBusy ? "rgba(255,107,122,0.35)" : "rgba(255,107,122,0.85)",
                    cursor: stopAllBusy ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.03em", transition: "all 0.18s",
                  }}
                >
                  {stopAllBusy ? "…" : L("Stop All", "Зупинити")}
                </button>
              )}
              <button
                onClick={() => void handleStartAll()}
                disabled={listenerBusy}
                style={{
                  padding: "8px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: listenerBusy
                    ? "rgba(45,232,151,0.08)"
                    : "linear-gradient(135deg, rgba(45,232,151,0.3), rgba(16,185,129,0.25))",
                  border: "1px solid rgba(45,232,151,0.35)",
                  color: listenerBusy ? "rgba(45,232,151,0.4)" : "rgba(45,232,151,0.9)",
                  cursor: listenerBusy ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.03em", transition: "all 0.18s",
                }}
              >
                {listenerBusy ? L("Starting…", "Запуск…") : L("Start All", "Запустити всі")}
              </button>
            </div>
          </div>
        </div>

        {/* Listener message */}
        {listenerMsg && (
          <div style={{
            padding: "9px 13px", borderRadius: 12, marginBottom: 12,
            background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)",
            fontSize: 12, color: "rgba(45,232,151,0.85)",
            animation: "vhFadeIn 0.25s ease both",
          }}>
            {listenerMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 13px", borderRadius: 12, marginBottom: 12,
            background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)",
            display: "flex", gap: 8, alignItems: "center",
            fontSize: 12, color: "rgba(255,180,180,0.85)",
          }}>
            <AlertCircle size={14} color={RED} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Loading */}
        {hubTab === "pending" && loading && items.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 40, opacity: 0.55 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(45,232,151,0.3)", borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 13, color: "rgba(148,163,184,0.6)" }}>
              {L("Loading verifications…", "Завантаження…")}
            </div>
          </div>
        )}

        {/* All Clear */}
        {hubTab === "pending" && allClear && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            paddingTop: 40, animation: "vhFadeIn 0.4s ease both",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 24,
              background: "linear-gradient(135deg, rgba(45,232,151,0.18), rgba(16,185,129,0.12))",
              border: "1.5px solid rgba(45,232,151,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 34,
              boxShadow: "0 0 40px rgba(45,232,151,0.15)",
            }}>
              🛡️
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8ff", marginBottom: 6 }}>
                {L("All Clear", "Все чисто")}
              </div>
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.55)", lineHeight: 1.55, maxWidth: 260 }}>
                {L(
                  "No pending captcha challenges.\nPoll continues every 4 seconds.",
                  "Немає очікуючих капча-викликів.\nОпитування триває кожні 4 секунди.",
                )}
              </div>
            </div>
            {stats && (stats.today_solved > 0 || stats.today_dismissed > 0) && (
              <div style={{
                display: "flex", gap: 14, padding: "8px 16px", borderRadius: 12,
                background: "rgba(45,232,151,0.06)", border: "1px solid rgba(45,232,151,0.14)",
              }}>
                {stats.today_solved > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>{stats.today_solved}</div>
                    <div style={{ fontSize: 9, color: "rgba(45,232,151,0.55)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {L("solved","вирішено")}
                    </div>
                  </div>
                )}
                {stats.today_dismissed > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(148,163,184,0.6)" }}>{stats.today_dismissed}</div>
                    <div style={{ fontSize: 9, color: "rgba(148,163,184,0.4)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {L("dismissed","відхилено")}
                    </div>
                  </div>
                )}
                {stats.all_time_total > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(148,163,184,0.4)" }}>{stats.all_time_total}</div>
                    <div style={{ fontSize: 9, color: "rgba(148,163,184,0.3)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {L("total","всього")}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{
              display: "flex", gap: 6, alignItems: "center",
              fontSize: 10, color: "rgba(45,232,151,0.45)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, animation: "pulse 2s ease-in-out infinite" }} />
              {L("Watching for new challenges…", "Очікуємо нові виклики…")}
            </div>
          </div>
        )}

        {/* History tab */}
        {hubTab === "history" && (
          <div style={{ animation: "vhFadeIn 0.3s ease both" }}>
            {history.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 44, opacity: 0.5 }}>
                <Clock size={28} color="rgba(148,163,184,0.45)" />
                <div style={{ fontSize: 13, color: "rgba(148,163,184,0.55)" }}>
                  {L("No solved captchas yet", "Немає вирішених капч")}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", marginBottom: 4, paddingLeft: 2 }}>
                  {L(`Last ${history.length} captchas`, `Останні ${history.length} капч`)}
                </div>
                {history.map(item => {
                  const solved    = item.status === "solved";
                  const color     = solved ? ACCENT : "rgba(148,163,184,0.45)";
                  const age       = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 60000);
                  const ageStr    = age < 60 ? `${age}m` : `${Math.floor(age/60)}h`;
                  return (
                    <div key={item.id} style={{
                      background: GLASS2, border: `1px solid ${BORDER2}`,
                      borderRadius: 13, padding: "10px 12px",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                        background: solved ? "rgba(45,232,151,0.1)" : "rgba(148,163,184,0.08)",
                        border: `1px solid ${color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {solved
                          ? <CheckCircle2 size={14} color={ACCENT} />
                          : <XCircle      size={14} color="rgba(148,163,184,0.4)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.label || item.phone || `#${item.account_id}`}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(148,163,184,0.45)", marginTop: 1 }}>
                          {item.captcha_type || "captcha"}
                          {item.group_title ? ` · ${item.group_title}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontWeight: 600, color }}>{L(item.status, item.status)}</div>
                        <div>{ageStr} {L("ago","тому")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Captcha cards */}
        {hubTab === "pending" && pending.length > 0 && (
          <div style={{ animation: "vhFadeIn 0.3s ease both" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10, paddingLeft: 2, gap: 8,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(148,163,184,0.45)",
              }}>
                {L(`${pending.length} pending`, `${pending.length} очікує`)}
              </div>
              {expiredCount > 0 && (
                <button
                  onClick={() => void handleDismissExpired()}
                  disabled={dismissBusy}
                  style={{
                    fontSize: 10, fontWeight: 700,
                    background: "rgba(255,107,122,0.10)",
                    border: "1px solid rgba(255,107,122,0.30)",
                    borderRadius: 9, padding: "3px 10px",
                    color: dismissBusy ? "rgba(255,107,122,0.35)" : "rgba(255,107,122,0.85)",
                    cursor: dismissBusy ? "not-allowed" : "pointer",
                    fontFamily: "inherit", flexShrink: 0,
                    transition: "all 0.18s",
                    letterSpacing: "0.03em",
                  }}
                >
                  {dismissBusy
                    ? L("Dismissing…", "Відхиляємо…")
                    : L(`⏰ Dismiss expired (${expiredCount})`, `⏰ Відхилити застарілі (${expiredCount})`)
                  }
                </button>
              )}
            </div>
            {pending.map(item => (
              <VerifCard key={item.id} item={item} onSolved={handleSolved} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
