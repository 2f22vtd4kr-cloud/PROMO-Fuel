import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Bug, Sparkles, Trash2, Copy, Check } from "lucide-react";

export interface DebugLogEntry {
  event: string;
  data: Record<string, unknown>;
  ts: number;
}

interface DebugAnalysis {
  severity: "ok" | "warning" | "error";
  summary: string;
  issues: string[];
  suggestions: string[];
  analysis: string;
  engine?: string;
}

interface Props {
  logs: DebugLogEntry[];
  onClear: () => void;
  authHeaders: () => Record<string, string>;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

function eventColor(event: string, data: Record<string, unknown>): string {
  if (event === "error") return "#ff6b7a";
  if (event === "complete") return "#2de897";
  if (event === "poll") return "#60a5fa";
  if (event === "sms_retry_prompt") return "#fb923c";
  if (event === "preflight") {
    if (data.status === "error") return "#ff6b7a";
    if (data.status === "done") return "#a78bfa";
    return "#c4b5fd";
  }
  if (event === "step") {
    const s = data.status as string;
    if (s === "done") return "#2de897";
    if (s === "running") return "#f59e0b";
    if (s === "error") return "#ff6b7a";
    return "#94a3b8";
  }
  if (event.startsWith("batch")) return "#22d3ee";
  if (event.startsWith("warmup")) return "#a855f7";
  return "#94a3b8";
}

function eventLabel(entry: DebugLogEntry): string {
  const { event, data } = entry;
  if (event === "step") {
    const msg = (data.message as string | undefined) ?? "";
    const stepName = ["", "🛒 SMSPool", "📡 Proxy", "💬 SendCode", "⏳ SMS Wait", "🤝 Sign-in", "🔒 2FA", "🪪 Profile", "💾 Save"][data.step as number] ?? `Step ${data.step}`;
    const codeType = msg.match(/SentCodeType\w+/)?.[0];
    const short = msg.length > 60 ? msg.slice(0, 60) + "…" : msg;
    return codeType
      ? `${stepName} → ${data.status} [${codeType}]`
      : `${stepName} → ${data.status}${short ? ` — ${short}` : ""}`;
  }
  if (event === "preflight") {
    const ip = data.exit_ip ? ` [${data.exit_ip}${data.is_datacenter ? " ⚠️DC" : " ✓res"}]` : "";
    return `preflight ${data.status}${ip}${data.message ? ` — ${String(data.message).slice(0, 60)}` : ""}`;
  }
  if (event === "poll") return String(data.message ?? "…").slice(0, 80);
  if (event === "error") return `❌ ${String(data.message ?? "").slice(0, 80)}`;
  if (event === "complete") return `✓ Registered: ${data.phone ?? ""}`;
  if (event === "sms_retry_prompt") {
    const msg = String(data.message ?? "");
    return msg.includes("SentCodeTypeApp") ? `⚠️ SentCodeTypeApp — ${msg.slice(0, 60)}` : `⚠️ ${msg.slice(0, 70)}`;
  }
  if (event === "batch_start") return `Batch start — ${data.total} accounts`;
  if (event === "batch_progress") return `Progress ${data.current}/${data.total} — ✓${data.succeeded} ✗${data.failed}`;
  if (event === "batch_delay") return String(data.message ?? "").slice(0, 70);
  if (event === "batch_done") return `Batch done — ✓${data.succeeded} ✗${data.failed}/${data.total}`;
  if (event === "batch_reset") return "Batch reset";
  if (event === "warmup_prompt") return `Warmup prompt — ${data.phone}`;
  if (event === "warmup_queued") return `Warmup queued — ${data.phone}`;
  return JSON.stringify(data).slice(0, 80);
}

function SeverityChip({ severity }: { severity: "ok" | "warning" | "error" }) {
  const map = {
    ok:      { icon: "✅", label: "OK",          color: "#2de897", bg: "rgba(45,232,151,0.12)", border: "rgba(45,232,151,0.3)" },
    warning: { icon: "⚠️", label: "WARNING",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
    error:   { icon: "❌", label: "ERROR",        color: "#ff6b7a", bg: "rgba(255,107,122,0.12)", border: "rgba(255,107,122,0.3)" },
  }[severity];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: map.bg, border: `1px solid ${map.border}`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 800, color: map.color,
      letterSpacing: "0.06em",
    }}>
      {map.icon} {map.label}
    </span>
  );
}

function AnalysisText({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "rgba(255,255,255,0.82)", whiteSpace: "pre-wrap" }}>
      {text.split("\n").map((line, i) => {
        const bold = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        if (line.startsWith("## ")) return <div key={i} style={{ fontWeight: 800, fontSize: 13, color: "#fff", marginTop: 10 }}>{line.slice(3)}</div>;
        if (line.startsWith("### ")) return <div key={i} style={{ fontWeight: 700, fontSize: 12.5, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>{line.slice(4)}</div>;
        return <div key={i} dangerouslySetInnerHTML={{ __html: bold || "&nbsp;" }} />;
      })}
    </div>
  );
}

export function FactoryDebugPanel({ logs, onClear, authHeaders }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DebugAnalysis | null>(null);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, open]);

  async function analyze() {
    if (!logs.length) return;
    setLoading(true);
    setAnalysisErr(null);
    setAnalysis(null);
    setShowAnalysis(true);
    try {
      const resp = await fetch("/api/v3/ai/factory-debug", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ events: logs, question: question.trim() || undefined }),
      });
      const json = await resp.json() as DebugAnalysis & { error?: string };
      if (!resp.ok || json.error) throw new Error(json.error ?? `HTTP ${resp.status}`);
      setAnalysis(json);
    } catch (e) {
      setAnalysisErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  function copyLog() {
    const text = logs.map(e => `[${fmtTime(e.ts)}] ${e.event}: ${JSON.stringify(e.data)}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const hasError = logs.some(e => e.event === "error" || (e.event === "step" && e.data.status === "error"));
  const hasRecycled = logs.some(e => e.event === "sms_retry_prompt");
  const hasDcIp = logs.some(e => e.event === "preflight" && e.data.is_datacenter === true);
  const pulseColor = hasDcIp || hasError ? "#ff6b7a" : hasRecycled ? "#fb923c" : logs.length > 0 ? "#2de897" : "#64748b";

  return (
    <div style={{
      margin: "14px 0 4px",
      borderRadius: 18,
      overflow: "hidden",
      border: `1px solid ${open ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.10)"}`,
      background: open
        ? "linear-gradient(180deg, rgba(30,27,75,0.65) 0%, rgba(15,13,50,0.80) 100%)"
        : "rgba(255,255,255,0.04)",
      backdropFilter: "blur(16px)",
      transition: "border-color 0.25s, background 0.25s",
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 9,
          background: "none", border: "none", cursor: "pointer",
          padding: "11px 14px", fontFamily: "inherit",
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 9,
          background: "rgba(99,102,241,0.18)",
          border: "1px solid rgba(99,102,241,0.35)",
          flexShrink: 0,
        }}>
          <Bug size={14} color="#a5b4fc" />
        </span>

        <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.03em" }}>
          Debug Log
        </span>

        {logs.length > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 22, height: 18, borderRadius: 9, padding: "0 6px",
            background: `${pulseColor}25`,
            border: `1px solid ${pulseColor}55`,
            fontSize: 10, fontWeight: 800, color: pulseColor,
          }}>
            {logs.length}
          </span>
        )}

        {hasDcIp && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.12)", border: "1px solid rgba(255,107,122,0.3)", borderRadius: 8, padding: "2px 7px" }}>
            DC IP!
          </span>
        )}
        {hasRecycled && !hasDcIp && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#fb923c", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 8, padding: "2px 7px" }}>
            recycled
          </span>
        )}

        <span style={{ flex: 1 }} />

        {open && logs.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); copyLog(); }}
            onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); copyLog(); } }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, color: copied ? "#2de897" : "rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "3px 8px",
              cursor: "pointer", transition: "color 0.2s",
            }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </span>
        )}

        {open && logs.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onClear(); setAnalysis(null); setShowAnalysis(false); }}
            onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); onClear(); } }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, color: "rgba(255,107,122,0.7)",
              background: "rgba(255,107,122,0.07)", borderRadius: 8, padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            <Trash2 size={10} />
            Clear
          </span>
        )}

        <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 2, display: "flex" }}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {open && (
        <div style={{ padding: "0 12px 14px" }}>

          {/* Event log */}
          <div
            ref={scrollRef}
            style={{
              height: logs.length === 0 ? 48 : 220,
              overflowY: "auto",
              background: "rgba(0,0,0,0.35)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "8px 0",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 10.5,
              lineHeight: 1.6,
            }}
          >
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.22)", padding: "8px 0", fontSize: 11 }}>
                No events yet — start a registration
              </div>
            ) : (
              logs.map((entry, i) => {
                const color = eventColor(entry.event, entry.data);
                const label = eventLabel(entry);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "1.5px 10px",
                      background: i === logs.length - 1 ? "rgba(99,102,241,0.08)" : "transparent",
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0, fontSize: 9.5, paddingTop: 1 }}>
                      {fmtTime(entry.ts)}
                    </span>
                    <span style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 800,
                      color, background: `${color}18`,
                      border: `1px solid ${color}35`,
                      borderRadius: 5, padding: "0px 5px", letterSpacing: "0.04em",
                      minWidth: 52, textAlign: "center", lineHeight: "16px",
                    }}>
                      {entry.event === "step"
                        ? `step ${entry.data.step}`
                        : entry.event.replace("batch_", "bt/").replace("warmup_", "wu/")}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.78)", flex: 1, wordBreak: "break-word" }}>
                      {label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* AI Section */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 1, background: "rgba(99,102,241,0.18)", marginBottom: 10,
              position: "relative",
            }}>
              <span style={{
                position: "absolute", left: "50%", transform: "translateX(-50%)",
                background: "rgba(30,27,75,0.9)", padding: "0 8px",
                fontSize: 9.5, color: "rgba(160,160,200,0.5)", letterSpacing: "0.08em",
                fontWeight: 700,
              }}>
                AI ANALYSIS
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !loading && logs.length > 0) void analyze(); }}
                placeholder="Ask about this session… (optional)"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 12, padding: "9px 12px",
                  fontSize: 12, color: "rgba(255,255,255,0.85)",
                  fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={() => void analyze()}
                disabled={loading || logs.length === 0}
                style={{
                  flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 6,
                  background: loading || logs.length === 0
                    ? "rgba(99,102,241,0.08)"
                    : "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.55))",
                  border: `1px solid ${loading || logs.length === 0 ? "rgba(99,102,241,0.2)" : "rgba(139,92,246,0.5)"}`,
                  borderRadius: 12, padding: "9px 14px",
                  fontSize: 12, fontWeight: 700, color: loading || logs.length === 0 ? "rgba(160,160,255,0.35)" : "#e0e7ff",
                  cursor: loading || logs.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: loading || logs.length === 0 ? "none" : "0 0 18px rgba(99,102,241,0.3)",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 12, height: 12, borderRadius: "50%",
                      border: "2px solid rgba(139,92,246,0.3)",
                      borderTopColor: "#a78bfa",
                      animation: "spin 0.8s linear infinite",
                      flexShrink: 0,
                    }} />
                    Аналіз…
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Аналіз AI
                  </>
                )}
              </button>
            </div>

            {/* Analysis result */}
            {showAnalysis && (
              <div style={{
                marginTop: 10,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(99,102,241,0.22)",
                borderRadius: 14,
                overflow: "hidden",
              }}>
                {loading && !analysis && (
                  <div style={{
                    padding: "18px 16px",
                    display: "flex", alignItems: "center", gap: 10,
                    color: "rgba(160,160,255,0.6)", fontSize: 12,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(139,92,246,0.2)",
                      borderTopColor: "#a78bfa",
                      animation: "spin 0.8s linear infinite",
                      flexShrink: 0,
                    }} />
                    Gemini аналізує сесію…
                  </div>
                )}

                {analysisErr && (
                  <div style={{ padding: "14px 16px", color: "#ff6b7a", fontSize: 12 }}>
                    ❌ {analysisErr}
                  </div>
                )}

                {analysis && (
                  <div>
                    {/* Header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px 8px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(99,102,241,0.08)",
                    }}>
                      <SeverityChip severity={analysis.severity} />
                      <span style={{ flex: 1 }} />
                      {analysis.engine && (
                        <span style={{
                          fontSize: 9.5, fontWeight: 700,
                          color: analysis.engine === "gemini" ? "#34d399" : "#fb923c",
                          background: analysis.engine === "gemini" ? "rgba(52,211,153,0.1)" : "rgba(251,146,60,0.1)",
                          border: `1px solid ${analysis.engine === "gemini" ? "rgba(52,211,153,0.3)" : "rgba(251,146,60,0.3)"}`,
                          borderRadius: 6, padding: "2px 7px", letterSpacing: "0.05em",
                        }}>
                          {analysis.engine.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Summary */}
                    <div style={{ padding: "10px 14px 0", fontSize: 12.5, color: "rgba(255,255,255,0.9)", lineHeight: 1.6, fontWeight: 500 }}>
                      {analysis.summary}
                    </div>

                    {/* Issues */}
                    {analysis.issues.length > 0 && (
                      <div style={{ padding: "8px 14px 0" }}>
                        {analysis.issues.map((issue, i) => (
                          <div key={i} style={{
                            display: "flex", gap: 7, alignItems: "flex-start",
                            fontSize: 12, color: "rgba(255,160,160,0.9)", lineHeight: 1.6,
                            marginBottom: 3,
                          }}>
                            <span style={{ color: "#ff6b7a", flexShrink: 0, marginTop: 2 }}>▸</span>
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {analysis.suggestions.length > 0 && (
                      <div style={{ padding: "6px 14px 0" }}>
                        {analysis.suggestions.map((s, i) => (
                          <div key={i} style={{
                            display: "flex", gap: 7, alignItems: "flex-start",
                            fontSize: 12, color: "rgba(160,240,200,0.9)", lineHeight: 1.6,
                            marginBottom: 3,
                          }}>
                            <span style={{ color: "#2de897", flexShrink: 0, marginTop: 2 }}>✓</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detailed analysis — collapsible */}
                    {analysis.analysis && analysis.analysis !== analysis.summary && (
                      <DetailedAnalysis text={analysis.analysis} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailedAnalysis({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          padding: "8px 14px", fontFamily: "inherit",
          color: "rgba(160,160,200,0.6)", fontSize: 11, fontWeight: 600,
        }}
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? "Hide detailed analysis" : "Show detailed analysis"}
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <AnalysisText text={text} />
        </div>
      )}
    </div>
  );
}
