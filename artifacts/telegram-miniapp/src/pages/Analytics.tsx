import { useState, useEffect } from "react";
import { TrendingUp, Send, BarChart2, Target, RefreshCw, Zap } from "lucide-react";
import { api, AnalyticsOverview } from "../lib/api";
import { TG } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";
import { haptic } from "../lib/haptics";

interface TrendPoint { date: string; sent: number; }
interface TopCampaign { id: number; name: string; sent_count: number; failed_count: number; }

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 3) : 3;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "flex-end" }}>
        <div style={{
          width: "100%", borderRadius: "4px 4px 2px 2px",
          height: `${pct}%`,
          background: `linear-gradient(180deg,${color} 0%,${color}88 100%)`,
          boxShadow: `0 0 10px ${color}66`,
          transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          minHeight: 4,
        }} />
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, grad, color, glow, index }: {
  icon: React.ElementType; label: string; value: string;
  grad: string; color: string; glow: string; index: number;
}) {
  return (
    <div className="lg fade-up stagger-item" style={{ padding: "15px 14px" }}>
      <div style={{ position: "absolute", top: -32, right: -32, width: 88, height: 88, borderRadius: "50%", background: `radial-gradient(circle,${glow} 0%,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, position: "relative", zIndex: 2 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(145deg,${color}20,${color}0c)`,
          border: `1px solid ${color}2e`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 14px ${glow}, inset 0 1px 0 ${color}24`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.12),transparent)", pointerEvents: "none" }} />
          <Icon size={13} color={color} strokeWidth={2.2} style={{ position: "relative", zIndex: 1 }} />
        </div>
        <span style={{ fontSize: 9.5, color: TG.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.8px", lineHeight: 1, background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", position: "relative", zIndex: 2 }}>
        {value}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(manual = false) {
    if (manual) { setRefreshing(true); haptic.light(); } else setLoading(true);
    try {
      const [ov, tr, top] = await Promise.all([
        api.getOverview(),
        fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/analytics/trend`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/analytics/top-campaigns`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOverview(ov);
      setTrend(Array.isArray(tr) ? tr.slice(-14) : []);
      setTopCampaigns(Array.isArray(top) ? top.slice(0, 5) : []);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const maxTrend = trend.length > 0 ? Math.max(...trend.map(t => t.sent), 1) : 1;

  const TILES = [
    { icon: Send,       label: "Отправлено",    value: (overview?.totalSent ?? 0).toLocaleString("ru"),         grad: "linear-gradient(135deg,#95c4f5,#5b96d4)", color: TG.accent,  glow: TG.accentGlow },
    { icon: BarChart2,  label: "Кампаний",      value: (overview?.totalCampaigns ?? 0).toString(),              grad: "linear-gradient(135deg,#c4aeff,#7c5fcf)", color: TG.purple,  glow: TG.purpleGlow },
    { icon: TrendingUp, label: "Open Rate",     value: `${(overview?.avgOpenRate ?? 0).toFixed(1)}%`,           grad: "linear-gradient(135deg,#ffc946,#d9852e)", color: TG.yellow,  glow: TG.yellowGlow },
    { icon: Target,     label: "Avg CTR",       value: `${(overview?.avgCtr ?? 0).toFixed(1)}%`,                grad: "linear-gradient(135deg,#2de897,#17a86a)", color: TG.green,   glow: TG.greenGlow },
    { icon: Zap,        label: "Активных",      value: (overview?.activeCampaigns ?? 0).toString(),             grad: "linear-gradient(135deg,#ff9d6e,#e07040)", color: "#ff9d6e",  glow: "rgba(255,157,110,0.55)" },
    { icon: TrendingUp, label: "Δ сегодня",     value: overview && overview.sentDelta > 0 ? `+${overview.sentDelta}%` : "—", grad: "linear-gradient(135deg,#95c4f5,#c4aeff)", color: TG.accent, glow: TG.accentGlow },
  ];

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Аналитика" />
      <FullSpinner />
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Аналитика"
        subtitle="Статистика рассылок"
        accent="linear-gradient(135deg,#ffc946 0%,#ff9d6e 100%)"
        right={
          <button onClick={() => load(true)} className="tap" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 11, padding: 7, display: "flex", color: TG.muted }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.72s linear infinite" : "none" }} />
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 13px 20px", WebkitOverflowScrolling: "touch" }}>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 18 }}>
          {TILES.map((tile, i) => <StatTile key={tile.label} {...tile} index={i} />)}
        </div>

        {/* Trend chart */}
        {trend.length > 0 && (
          <div className="lg fade-up" style={{ padding: "16px 15px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 2 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: TG.text }}>Динамика отправок</div>
                <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>Последние {trend.length} дней</div>
              </div>
              <div style={{ fontSize: 10, color: TG.accentLight, background: `${TG.accent}14`, border: `1px solid ${TG.accent}24`, borderRadius: 8, padding: "3px 9px", fontWeight: 700 }}>
                14 дней
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80, position: "relative", zIndex: 2 }}>
              {trend.map((pt, i) => {
                const pct = maxTrend > 0 ? Math.max((pt.sent / maxTrend) * 100, 3) : 3;
                const isToday = i === trend.length - 1;
                return (
                  <div key={pt.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{
                      width: "100%", borderRadius: "3px 3px 2px 2px",
                      height: `${pct}%`,
                      background: isToday
                        ? "linear-gradient(180deg,#ffc946,#d9852e)"
                        : `linear-gradient(180deg,${TG.accent}cc,${TG.accent}44)`,
                      boxShadow: isToday ? "0 0 12px rgba(255,201,70,0.60)" : `0 0 6px ${TG.accentGlow}`,
                      minHeight: 4,
                      transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                    }} />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div style={{ display: "flex", gap: 4, marginTop: 6, position: "relative", zIndex: 2 }}>
              {trend.map((pt, i) => {
                const isToday = i === trend.length - 1;
                const day = new Date(pt.date).getDate();
                const showLabel = i === 0 || i === Math.floor(trend.length / 2) || i === trend.length - 1;
                return (
                  <div key={pt.date} style={{ flex: 1, textAlign: "center", fontSize: 8.5, color: isToday ? TG.yellow : (showLabel ? TG.muted : "transparent"), fontWeight: isToday ? 800 : 400 }}>
                    {showLabel ? (isToday ? "Сег" : day) : ""}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top campaigns */}
        {topCampaigns.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              Топ рассылок
            </div>
            <div className="lg" style={{ borderRadius: 24 }}>
              {topCampaigns.map((c, i) => {
                const total = c.sent_count + c.failed_count;
                const pct = total > 0 ? (c.sent_count / total) * 100 : 0;
                const max = topCampaigns[0]?.sent_count ?? 1;
                const barW = max > 0 ? (c.sent_count / max) * 100 : 0;
                return (
                  <div key={c.id} style={{ padding: "12px 15px", borderBottom: i < topCampaigns.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", position: "relative", zIndex: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "64%", color: TG.text }}>{c.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: TG.accentLight }}>{c.sent_count.toLocaleString("ru")}</span>
                        <span style={{ fontSize: 10, color: pct > 90 ? TG.green : pct > 70 ? TG.yellow : TG.red, background: pct > 90 ? `${TG.green}14` : pct > 70 ? `${TG.yellow}14` : `${TG.red}14`, border: `1px solid ${pct > 90 ? TG.green : pct > 70 ? TG.yellow : TG.red}28`, borderRadius: 7, padding: "1px 6px", fontWeight: 700 }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.055)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barW}%`, background: `linear-gradient(90deg,${TG.accent},${TG.accentLight})`, borderRadius: 2, transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 0 8px ${TG.accentGlow}` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {trend.length === 0 && topCampaigns.length === 0 && (
          <div className="lg fade-up" style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
            <div style={{ color: TG.muted, fontSize: 14, lineHeight: 1.55, position: "relative", zIndex: 2 }}>
              Данных пока нет.<br />Запустите первую рассылку.
            </div>
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
