import { useState, useEffect } from "react";
import { X, TrendingUp, Send, Zap, Shield, Clock, ChevronRight } from "lucide-react";
import { api, GroupAnalytics } from "../lib/api";
import { TG } from "../lib/theme";
import { haptic } from "../lib/haptics";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}с`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  return `${Math.floor(diff / 86400)}д`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()}`;
}

const STATUS_COLOR: Record<string, string> = {
  running:   "#2de897",
  paused:    "#ffc946",
  draft:     "#7c8db0",
  cancelled: "#ff6b7a",
};

export function GroupAnalyticsOverlay({
  groupId,
  onClose,
}: {
  groupId: string;
  onClose: () => void;
}) {
  const [data,    setData]    = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.getGroupAnalytics(groupId)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [groupId]);

  const rateColor = !data ? "#7c8db0"
    : data.delivery_rate >= 80 ? "#2de897"
    : data.delivery_rate >= 50 ? "#ffc946"
    : "#ff6b7a";

  const history  = data?.daily_history ?? [];
  const maxSent  = Math.max(...history.map(d => d.sent + d.failed), 1);

  return (
    <div
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          300,
        background:      "rgba(5,7,16,0.88)",
        backdropFilter:  "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display:         "flex",
        flexDirection:   "column",
        overflowY:       "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) { haptic.light(); onClose(); } }}
    >
      <div style={{
        margin:          "0 auto",
        width:           "100%",
        maxWidth:        480,
        display:         "flex",
        flexDirection:   "column",
        padding:         "0 0 40px",
      }}>

        {/* Header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "18px 16px 12px",
          borderBottom:   "1px solid rgba(255,255,255,0.08)",
          flexShrink:     0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TG.text, letterSpacing: "-0.01em" }}>
              Аналитика группы
            </div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 2, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data?.group_title ?? groupId}
            </div>
          </div>
          <button
            onClick={() => { haptic.light(); onClose(); }}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.07)",
              border:     "1px solid rgba(255,255,255,0.10)",
              display:    "flex", alignItems: "center", justifyContent: "center",
              cursor:     "pointer", flexShrink: 0,
            }}
          >
            <X size={16} color={TG.muted} />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(196,174,255,0.2)", borderTopColor: "#a78bfa", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#ff6b7a", fontSize: 13 }}>
            Не удалось загрузить аналитику: {error}
          </div>
        ) : data && (
          <div style={{ padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Stat icon={<TrendingUp size={14} color={rateColor} />} label="Доставка" value={`${data.delivery_rate}%`} color={rateColor} sub={`${data.ok} из ${data.total_sends}`} />
              <Stat icon={<Send size={14} color="#6ba8e5" />} label="Всего отправок" value={data.total_sends.toLocaleString()} color="#6ba8e5" sub={`${data.failed} ошибок`} />
              <Stat icon={<Zap size={14} color="#ffc946" />} label="FloodWait" value={data.flood_wait_events.toString()} color={data.flood_wait_events > 0 ? "#ffc946" : TG.muted} sub="событий" />
              <Stat icon={<Shield size={14} color={data.bans > 0 ? "#ff6b7a" : TG.muted} />} label="Банов" value={data.bans.toString()} color={data.bans > 0 ? "#ff6b7a" : TG.muted} sub="за всё время" />
            </div>

            {/* Date range */}
            {(data.first_seen || data.last_seen) && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                <Clock size={10} color={TG.muted} />
                <span style={{ fontSize: 10, color: TG.muted }}>
                  {fmtDate(data.first_seen)} — {fmtDate(data.last_seen)}
                </span>
              </div>
            )}

            {/* 30-day history chart */}
            {history.length > 1 && (
              <div style={{
                padding: "10px 12px 8px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ fontSize: 9, color: TG.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Динамика ({history.length} дн.)
                </div>
                <svg width="100%" height="44" viewBox={`0 0 ${history.length * 10} 44`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
                  {[...history].reverse().map((d, i) => {
                    const sentH  = Math.max(2, Math.round((d.sent   / maxSent) * 38));
                    const failH  = Math.max(0, Math.round((d.failed / maxSent) * 38));
                    const x      = i * 10;
                    return (
                      <g key={d.day}>
                        {d.failed > 0 && <rect x={x + 1} y={44 - failH} width={8} height={failH} rx="2" fill="rgba(255,107,122,0.55)" />}
                        <rect x={x + 1} y={44 - sentH - (d.failed > 0 ? failH : 0)} width={8} height={sentH} rx="2" fill="rgba(45,232,151,0.65)" />
                      </g>
                    );
                  })}
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 8, color: TG.muted }}>{[...history].reverse()[0]?.day?.slice(5)}</span>
                  <span style={{ fontSize: 8, color: TG.muted }}>сегодня</span>
                </div>
              </div>
            )}

            {/* Campaigns that targeted this group */}
            {data.campaigns.length > 0 && (
              <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ padding: "10px 12px 6px", fontSize: 9, color: TG.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Кампании ({data.campaigns.length})
                </div>
                {data.campaigns.map((c, i) => {
                  const total    = c.sent + c.failed;
                  const pct      = total > 0 ? Math.round((c.sent / total) * 100) : 0;
                  const pctColor = pct >= 80 ? "#2de897" : pct >= 50 ? "#ffc946" : "#ff6b7a";
                  const sc       = STATUS_COLOR[c.status] ?? "#7c8db0";
                  return (
                    <div key={c.id} style={{
                      display:    "flex",
                      alignItems: "center",
                      gap:        8,
                      padding:    "8px 12px",
                      borderTop:  i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        {c.last_sent_at && <div style={{ fontSize: 9, color: TG.muted, marginTop: 1 }}>{timeAgo(c.last_sent_at)} назад</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#2de897" }}>✓{c.sent}</span>
                        {c.failed > 0 && <span style={{ fontSize: 10, color: "#ff6b7a" }}>✗{c.failed}</span>}
                        {total > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: pctColor, background: `${pctColor}14`, border: `1px solid ${pctColor}30`, borderRadius: 8, padding: "1px 5px" }}>
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent errors */}
            {data.recent_errors.length > 0 && (
              <div style={{ borderRadius: 14, background: "rgba(255,107,122,0.04)", border: "1px solid rgba(255,107,122,0.14)", overflow: "hidden" }}>
                <div style={{ padding: "10px 12px 6px", fontSize: 9, color: "#ff6b7a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Последние ошибки ({data.recent_errors.length})
                </div>
                {data.recent_errors.slice(0, 6).map((e, i) => (
                  <div key={i} style={{
                    padding:   "7px 12px",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                    display:   "flex",
                    alignItems:"flex-start",
                    gap:       8,
                  }}>
                    <span style={{ fontSize: 10, flexShrink: 0, marginTop: 1 }}>
                      {e.status === "banned" ? "⛔" : "✗"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: e.status === "banned" ? "#ffc946" : "#ff6b7a", wordBreak: "break-word" }}>
                        {e.error ?? e.status}
                      </div>
                      <div style={{ fontSize: 9, color: TG.muted, marginTop: 1 }}>{timeAgo(e.sent_at)} назад</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.total_sends === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: TG.muted, fontSize: 13 }}>
                Нет данных для этой группы
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      padding:    "12px",
      borderRadius: 12,
      background: `${color}08`,
      border:     `1px solid ${color}20`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 9, color: TG.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: TG.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
