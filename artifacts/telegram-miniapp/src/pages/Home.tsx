import { useState, useEffect, useRef } from "react";
import { Send, Users, TrendingUp, Zap, RefreshCw, Activity } from "lucide-react";
import { api, Campaign, AnalyticsOverview } from "../lib/api";
import { TG, STATUS_META } from "../lib/theme";
import { Header } from "../components/Header";
import { CampaignRow } from "../components/CampaignRow";
import { FullSpinner } from "../components/Spinner";
import { haptic } from "../lib/haptics";

function GradText({ children, grad, style: s }: { children: React.ReactNode; grad: string; style?: React.CSSProperties }) {
  return (
    <span style={{ background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", ...s }}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, delta, color, glow, grad, index }: {
  icon: React.ElementType; label: string; value: string;
  delta?: string; color: string; glow: string; grad: string; index: number;
}) {
  return (
    <div className="lg fade-up stagger-item" style={{ padding: "16px 15px 14px" }}>
      <div style={{
        position: "absolute", top: -36, right: -36, width: 100, height: 100, borderRadius: "50%",
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, position: "relative", zIndex: 2 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: `linear-gradient(145deg,${color}22,${color}0e)`,
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 18px ${glow}, inset 0 1px 0 ${color}28`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.12),transparent)", pointerEvents: "none" }} />
          <Icon size={15} color={color} strokeWidth={2.2} style={{ position: "relative", zIndex: 1 }} />
        </div>
        <span style={{ fontSize: 10, color: TG.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 27, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1, position: "relative", zIndex: 2 }}>
        <GradText grad={grad}>{value}</GradText>
      </div>
      {delta && (
        <div style={{
          marginTop: 9, display: "inline-flex", alignItems: "center", gap: 4,
          background: `${TG.green}14`, border: `1px solid ${TG.green}24`,
          borderRadius: 8, padding: "3px 9px", position: "relative", zIndex: 2,
        }}>
          <Activity size={9} color={TG.green} />
          <span style={{ fontSize: 10, color: TG.green, fontWeight: 700 }}>{delta}</span>
        </div>
      )}
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  const [colon, setColon] = useState(true);
  useEffect(() => {
    const t = setInterval(() => { setTime(new Date()); setColon(c => !c); }, 500);
    return () => clearInterval(t);
  }, []);
  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {hh}<span style={{ opacity: colon ? 1 : 0, transition: "opacity 0.1s" }}>:</span>{mm}
    </span>
  );
}

export function HomePage({ onNewCampaign, onViewCampaigns }: {
  onNewCampaign: () => void; onViewCampaigns: () => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(manual = false) {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const [ov, cps, us] = await Promise.all([api.getOverview(), api.getCampaigns(), api.getUsers()]);
      setOverview(ov); setCampaigns(cps.slice(0, 5)); setUsers(us.length);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setInterval(() => load(), 30_000); return () => clearInterval(t); }, []);

  const STAT_CARDS = [
    { icon: Send,        label: "Отправлено", color: TG.accent,  glow: TG.accentGlow,  grad: "linear-gradient(135deg,#95c4f5,#5b96d4)", value: (overview?.totalSent ?? 0).toLocaleString("ru"), delta: overview && overview.sentDelta > 0 ? `↑ ${overview.sentDelta}%` : undefined },
    { icon: Users,       label: "Подписчики", color: TG.green,   glow: TG.greenGlow,   grad: "linear-gradient(135deg,#2de897,#17a86a)", value: users.toLocaleString("ru"), delta: undefined },
    { icon: TrendingUp,  label: "Open Rate",  color: TG.yellow,  glow: TG.yellowGlow,  grad: "linear-gradient(135deg,#ffc946,#d9852e)", value: `${(overview?.avgOpenRate ?? 0).toFixed(1)}%`, delta: undefined },
    { icon: Zap,         label: "Кампаний",   color: TG.purple,  glow: TG.purpleGlow,  grad: "linear-gradient(135deg,#c4aeff,#7c5fcf)", value: (overview?.totalCampaigns ?? 0).toString(), delta: undefined },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="RUProbe Hub"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="lg-pill" style={{ fontSize: 13, fontWeight: 700, color: TG.textSecondary, padding: "5px 11px", letterSpacing: "0.04em" }}>
              <LiveClock />
            </div>
            <button onClick={() => { haptic.light(); load(true); }} className="tap"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 11, padding: 7, display: "flex", color: TG.muted }}>
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.72s linear infinite" : "none" }} />
            </button>
            <div style={{
              background: `${TG.green}14`, border: `1px solid ${TG.green}28`,
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              borderRadius: 20, padding: "5px 11px",
              fontSize: 11, color: TG.green, fontWeight: 800,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: TG.green, boxShadow: `0 0 8px 2px ${TG.greenGlow}`, animation: "pulse 2s ease-in-out infinite" }} />
              Live
            </div>
          </div>
        }
      />

      {loading && !overview ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 13px 20px", WebkitOverflowScrolling: "touch" }}>

          {/* Hero band */}
          <div className="lg fade-up" style={{
            padding: "18px 18px 16px", marginBottom: 14,
            background: "linear-gradient(135deg, rgba(91,150,212,0.14) 0%, rgba(45,232,151,0.07) 100%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 2 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 15,
                background: "linear-gradient(145deg,rgba(91,150,212,0.32),rgba(45,232,151,0.16))",
                border: "1px solid rgba(91,150,212,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 28px rgba(91,150,212,0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
                flexShrink: 0, position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.14),transparent)", pointerEvents: "none" }} />
                <Activity size={22} color={TG.accentLight} style={{ position: "relative", zIndex: 1 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: TG.muted, fontWeight: 600, marginBottom: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {(overview?.activeCampaigns ?? 0) > 0 ? "Активных кампаний" : "Панель управления"}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.6px" }}>
                  {(overview?.activeCampaigns ?? 0) > 0 ? (
                    <GradText grad="linear-gradient(135deg,#2de897,#5b96d4)">
                      {overview!.activeCampaigns} работает
                    </GradText>
                  ) : (
                    <GradText grad="linear-gradient(135deg,#95c4f5,#c4aeff)">Всё готово</GradText>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {STAT_CARDS.map((card, i) => <StatCard key={card.label} {...card} index={i} />)}
          </div>

          {/* Section header */}
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Рассылки
            </span>
            <button onClick={() => { haptic.select(); onViewCampaigns(); }} className="tap" style={{
              fontSize: 11.5, color: TG.accentLight,
              background: `${TG.accent}14`, border: `1px solid ${TG.accent}24`,
              borderRadius: 9, padding: "4px 10px", fontWeight: 700,
            }}>
              Все →
            </button>
          </div>

          {/* Campaign list */}
          <div className="lg" style={{ marginBottom: 16 }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", position: "relative", zIndex: 2 }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>📭</div>
                <div style={{ color: TG.muted, fontSize: 13 }}>Нет рассылок</div>
              </div>
            ) : campaigns.map((c, i) => (
              <CampaignRow key={c.id} campaign={c} last={i === campaigns.length - 1} onClick={() => { haptic.select(); onViewCampaigns(); }} />
            ))}
          </div>

          {/* CTA */}
          <button onClick={() => { haptic.medium(); onNewCampaign(); }} className="tap" style={{
            width: "100%", padding: "16px 0",
            background: "linear-gradient(135deg, #5b96d4 0%, #3a6fad 55%, #2f5a9a 100%)",
            border: "none", borderRadius: 20, color: "#fff",
            fontSize: 15, fontWeight: 800, letterSpacing: "0.01em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            boxShadow: "0 8px 32px rgba(91,150,212,0.44), 0 1px 0 rgba(255,255,255,0.20) inset, 0 -1px 0 rgba(0,0,0,0.22) inset",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: "-50%", width: "40%", height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
              transform: "skewX(-18deg)", animation: "shimmerX 3s ease-in-out infinite",
            }} />
            <Send size={16} style={{ position: "relative", zIndex: 1 }} />
            <span style={{ position: "relative", zIndex: 1 }}>Новая рассылка</span>
          </button>

          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  );
}
