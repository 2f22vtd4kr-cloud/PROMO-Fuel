import { useState, useEffect, useCallback } from "react";
import { BarChart2, RefreshCw, Trash2 } from "lucide-react";

const GLASS  = "rgba(255,255,255,0.055)";
const GLASS2 = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.10)";
const GREEN  = "#2de897";
const RED    = "#ff6b7a";
const AMBER  = "#f59e0b";
const BLUE   = "#3b82f6";

interface CredRow {
  api_id:  number;
  label:   string;
  sms_ok:  number;
  app:     number;
  timeout: number;
}

function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: 700, color, minWidth: 22, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export function CredStatsPanel({ authHeaders, lang }: {
  authHeaders: () => Record<string, string>;
  lang: string;
}) {
  const L = (en: string, ua: string) => lang === "ua" ? ua : en;

  const [rows, setRows]         = useState<CredRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/factory/cred-stats", { headers: authHeaders() });
      if (r.ok) setRows(await r.json());
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const reset = async () => {
    setResetting(true);
    try {
      await fetch("/api/factory/cred-stats/reset", { method: "POST", headers: authHeaders() });
      setRows([]);
    } finally {
      setResetting(false);
    }
  };

  const totalEvents = rows.reduce((s, r) => s + r.sms_ok + r.app + r.timeout, 0);

  return (
    <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>

      <div
        onClick={() => { setCollapsed(v => !v); if (collapsed) fetch_(); }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", borderBottom: collapsed ? "none" : `1px solid ${BORDER}` }}
      >
        <BarChart2 size={15} color={BLUE} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
            {L("Credential Stats", "Статистика credentials")}
          </div>
          {totalEvents > 0 && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
              {rows.length} {L("api_ids", "api_id")} · {totalEvents} {L("events", "подій")}
            </div>
          )}
          {totalEvents === 0 && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>
              {L("No data yet — run the factory first", "Запустіть фабрику для збору даних")}
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); fetch_(); }}
          disabled={loading}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: "rgba(255,255,255,0.3)" }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
        </button>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{collapsed ? "▼" : "▲"}</span>
      </div>

      {!collapsed && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

          {rows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "18px 0", fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
              {L("No events recorded this session", "Подій ще не зафіксовано")}
            </div>
          ) : rows.map(row => {
            const total = row.sms_ok + row.app + row.timeout;
            const successPct = total > 0 ? Math.round((row.sms_ok / total) * 100) : 0;
            const statusColor = successPct >= 60 ? GREEN : successPct >= 30 ? AMBER : RED;
            return (
              <div
                key={row.api_id}
                style={{ background: GLASS2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{row.label}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 7 }}>{row.api_id}</span>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: statusColor,
                    background: `${statusColor}15`, border: `1px solid ${statusColor}35`,
                    borderRadius: 8, padding: "2px 8px",
                  }}>
                    {successPct}%
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {L("SMS OK", "SMS ОК")}
                    </span>
                    <MiniBar value={row.sms_ok} total={total} color={GREEN} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {L("Blocked", "Блок")}
                    </span>
                    <MiniBar value={row.app} total={total} color={RED} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {L("Timeout", "Таймаут")}
                    </span>
                    <MiniBar value={row.timeout} total={total} color={AMBER} />
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length > 0 && (
            <button
              onClick={reset} disabled={resetting}
              style={{ width: "100%", background: "rgba(255,107,122,0.06)", border: "1px solid rgba(255,107,122,0.18)", borderRadius: 12, padding: "9px 14px", fontSize: 11, fontWeight: 700, color: resetting ? "rgba(255,107,122,0.35)" : RED, cursor: resetting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}
            >
              {resetting
                ? <><div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${RED}35`, borderTopColor: RED, animation: "spin 0.8s linear infinite" }} />{L("Clearing…", "Очищення…")}</>
                : <><Trash2 size={12} />{L("Reset stats", "Скинути статистику")}</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}
