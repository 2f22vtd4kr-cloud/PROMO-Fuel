import { useState, useEffect, useRef } from "react";
import { Send, Users, TrendingUp, Zap, RefreshCw, Activity } from "lucide-react";
import { api, Campaign, AnalyticsOverview } from "../lib/api";
import { TG, STATUS_META, BLUR, BLUR_HEAVY } from "../lib/theme";
import { Header } from "../components/Header";
import { CampaignRow } from "../components/CampaignRow";
import { FullSpinner } from "../components/Spinner";

/* ─── Gradient text helper ─── */
function GradText({ children, grad, style: s }: { children: React.ReactNode; grad: string; style?: React.CSSProperties }) {
  return (
    <span style={{
      background: grad, WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent", backgroundClip: "text", ...s,
    }}>{children}</span>
  );
}

/* ─── Animated ticker digit ─── */
function Ticker({ value }: { value: string }) {
  return (
    <span style={{
      display: "inline-block",
      animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
    }} key={value}>{value}</span>
  );
}

/* ─── Big stat card ─── */
function StatCard({ icon: Icon, label, value, delta, color, glow, grad, index }: {
  icon: React.ElementType; label: string; value: string;
  delta?: string; color: string; glow: string; grad: string; index: number;
}) {
  return (
    <div className={`glass-card fade-up stagger-item`}
      style={{ padding: "16px 15px 14px", animationDelay: `${index * 60}ms` }}>
      {/* Ambient glow sphere */}
      <div style={{
        position: "absolute", top: -32, right: -32, width: 96, height: 96,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Icon + label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}2e`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 14px ${glow}`,
        }}>
          <Icon size={14} color={color} strokeWidth={2.3} />
        </div>
        <span style={{ fontSize: 10.5, color: TG.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      {/* Value */}
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1 }}>
        <GradText grad={grad}>{value}</GradText>
      </div>
      {delta && (
        <div style={{
          marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
          background: `${TG.green}14`, border: `1px solid ${TG.green}22`,
          borderRadius: 8, padding: "3px 8px",
        }}>
          <Activity size={9} color={TG.green} />
          <span style={{ fontSize: 10.5, color: TG.green, fontWeight: 700 }}>{delta}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Live clock ─── */
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
    <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}>
      {hh}<span style={{ opacity: colon ? 1 : 0, transition: "opacity 0.1s" }}>:</span>{mm}
    </span>
  );
}

/* ─── Page ─── */
export function HomePage({ onNewCampaign, onViewCampaigns }: {
  onNewCampaign: () => void; onViewCampaigns: () => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const spinRef = useRef<HTMLDivElement>(null);

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
    {
      icon: Send,       label: "Отправлено", color: TG.accent,  glow: TG.accentGlow,
      grad: "linear-gradient(135deg,#85b8ef,#5b96d4)",
      value: (overview?.totalSent ?? 0).toLocaleString("ru"),
      delta: overview && overview.sentDelta > 0 ? `↑ ${overview.sentDelta}% сегодня` : undefined,
    },
    {
      icon: Users,      label: "Подписчики", color: TG.green,   glow: TG.greenGlow,
      grad: "linear-gradient(135deg,#2de897,#17a86a)",
      value: users.toLocaleString("ru"), delta: undefined,
    },
    {
      icon: TrendingUp, label: "Open Rate",  color: TG.yellow,  glow: TG.yellowGlow,
      grad: "linear-gradient(135deg,#ffc946,#d9852e)",
      value: `${(overview?.avgOpenRate ?? 0).toFixed(1)}%`, delta: undefined,
    },
    {
      icon: Zap,        label: "Кампаний",   color: TG.purple,  glow: TG.purpleGlow,
      grad: "linear-gradient(135deg,#b39dff,#7c5fcf)",
      value: (overview?.totalCampaigns ?? 0).toString(), delta: undefined,
    },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="RUProbe CRM"
        subtitle=""
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {/* Clock */}
            <div style={{
              fontSize: 13, fontWeight: 700, color: TG.textSecondary,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10, padding: "5px 10px", letterSpacing: "0.04em",
            }}>
              <LiveClock />
            </div>
            {/* Refresh */}
            <button onClick={() => load(true)} className="tap"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 7, display: "flex", color: TG.muted }}>
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.72s linear infinite" : "none" }} />
            </button>
            {/* Online badge */}
            <div style={{
              background: `${TG.green}14`, border: `1px solid ${TG.green}2a`,
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              borderRadius: 20, padding: "5px 11px",
              fontSize: 11.5, color: TG.green, fontWeight: 800,
              display: "flex", alignItems: "center", gap: 5,
              letterSpacing: "0.02em",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: TG.green, boxShadow: `0 0 8px 2px ${TG.greenGlow}`, animation: "pulse 2s ease-in-out infinite" }} />
              Онлайн
            </div>
          </div>
        }
      />

      {loading && !overview ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 20px", WebkitOverflowScrolling: "touch" }}>

          {/* Hero band */}
          <div className="glass-card fade-up" style={{
            padding: "18px 18px 16px", marginBottom: 14,
            background: "linear-gradient(135deg, rgba(91,150,212,0.12) 0%, rgba(45,232,151,0.06) 100%)",
            border: "1px solid rgba(91,150,212,0.22)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: "linear-gradient(135deg,rgba(91,150,212,0.28),rgba(45,232,151,0.14))",
                border: "1px solid rgba(91,150,212,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(91,150,212,0.3)",
                flexShrink: 0,
              }}>
                <Activity size={20} color={TG.accentLight} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: TG.muted, fontWeight: 600, marginBottom: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {(overview?.activeCampaigns ?? 0) > 0 ? "Активных кампаний" : "Добро пожаловать"}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.6px" }}>
                  {(overview?.activeCampaigns ?? 0) > 0 ? (
                    <GradText grad="linear-gradient(135deg,#2de897,#5b96d4)">
                      {overview!.activeCampaigns} сейчас работает
                    </GradText>
                  ) : (
                    <GradText grad="linear-gradient(135deg,#85b8ef,#b39dff)">Всё тихо</GradText>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {STAT_CARDS.map((card, i) => (
              <StatCard key={card.label} {...card} index={i} />
            ))}
          </div>

          {/* Section header */}
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Рассылки
            </span>
            <button onClick={onViewCampaigns} className="tap" style={{
              fontSize: 11.5, color: TG.accentLight,
              background: `${TG.accent}15`, border: `1px solid ${TG.accent}25`,
              borderRadius: 9, padding: "4px 10px",
              fontWeight: 700, letterSpacing: "0.02em",
            }}>
              Все →
            </button>
          </div>

          {/* Campaign list card */}
          <div className="glass-card" style={{ marginBottom: 16 }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                <div style={{ color: TG.muted, fontSize: 13 }}>Нет рассылок</div>
              </div>
            ) : campaigns.map((c, i) => (
              <CampaignRow key={c.id} campaign={c} last={i === campaigns.length - 1} onClick={onViewCampaigns} />
            ))}
          </div>

          {/* CTA */}
          <button onClick={onNewCampaign} className="tap" style={{
            width: "100%", padding: "16px 0",
            background: "linear-gradient(135deg, #5b96d4 0%, #3a6fad 100%)",
            border: "none", borderRadius: 18, color: "#fff",
            fontSize: 15, fontWeight: 800, letterSpacing: "0.01em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            boxShadow: "0 6px 28px rgba(91,150,212,0.4), 0 1px 0 rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
            position: "relative", overflow: "hidden",
          }}>
            {/* Shine sweep */}
            <div style={{
              position: "absolute", top: 0, left: "-40%", width: "40%", height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
              transform: "skewX(-20deg)",
              animation: "shimmer 3s ease-in-out infinite",
            }} />
            <Send size={16} />
            Новая рассылка
          </button>

          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  );
}
