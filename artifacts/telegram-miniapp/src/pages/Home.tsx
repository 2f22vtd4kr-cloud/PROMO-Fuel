import { useState, useEffect } from "react";
import { Send, Users, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { api, Campaign, AnalyticsOverview } from "../lib/api";
import { TG, STATUS_META, BLUR } from "../lib/theme";
import { Header } from "../components/Header";
import { CampaignRow } from "../components/CampaignRow";
import { FullSpinner } from "../components/Spinner";

function StatCard({ icon: Icon, label, value, delta, color, glow }: {
  icon: React.ElementType; label: string; value: string; delta?: string; color: string; glow: string;
}) {
  return (
    <div className="fade-up" style={{
      background: TG.glass,
      backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
      border: `1px solid ${TG.glassBorder}`,
      borderRadius: 20,
      padding: "16px 14px 14px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -24, right: -24,
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{
          background: color + "1a", border: `1px solid ${color}30`,
          borderRadius: 10, padding: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={14} color={color} strokeWidth={2.2} />
        </div>
        <span style={{ color: TG.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ color: TG.text, fontSize: 24, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1 }}>{value}</div>
      {delta && (
        <div style={{ color: TG.green, fontSize: 11, marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

export function HomePage({ onNewCampaign, onViewCampaigns }: {
  onNewCampaign: () => void; onViewCampaigns: () => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      const [ov, cps, us] = await Promise.all([
        api.getOverview(), api.getCampaigns(), api.getUsers(),
      ]);
      setOverview(ov);
      setCampaigns(cps.slice(0, 5));
      setUsers(us.length);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setInterval(() => load(), 30_000); return () => clearInterval(t); }, []);

  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="RUProbe CRM"
        subtitle={timeStr}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button
              onClick={() => load(true)}
              className="tap"
              style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 6, display: "flex" }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 0.75s linear infinite" : "none" }} />
            </button>
            <div style={{
              background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              borderRadius: 20, padding: "5px 11px",
              fontSize: 12, color: TG.green, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: TG.green, boxShadow: `0 0 6px ${TG.greenGlow}` }} />
              Онлайн
            </div>
          </div>
        }
      />

      {loading && !overview ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 20px", WebkitOverflowScrolling: "touch" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <StatCard icon={Send}       label="Отправлено" color={TG.accent} glow={TG.accentGlow}
              value={(overview?.totalSent ?? 0).toLocaleString("ru")}
              delta={overview && overview.sentDelta > 0 ? `↑ ${overview.sentDelta}% сегодня` : undefined}
            />
            <StatCard icon={Users}      label="Подписчики" color={TG.green}  glow={TG.greenGlow}
              value={users.toLocaleString("ru")}
            />
            <StatCard icon={TrendingUp} label="Open Rate"  color={TG.yellow} glow={TG.yellowGlow}
              value={`${(overview?.avgOpenRate ?? 0).toFixed(1)}%`}
            />
            <StatCard icon={Zap}        label="Кампаний"   color={TG.purple} glow={TG.purpleGlow}
              value={(overview?.totalCampaigns ?? 0).toString()}
            />
          </div>

          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Рассылки</span>
            <button onClick={onViewCampaigns} className="tap" style={{
              fontSize: 12, color: TG.accentLight, background: "rgba(82,136,193,0.12)",
              border: "1px solid rgba(82,136,193,0.2)", borderRadius: 10,
              padding: "4px 10px", cursor: "pointer", fontWeight: 600,
            }}>
              Все →
            </button>
          </div>

          <div style={{
            background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
            border: `1px solid ${TG.glassBorder}`,
            borderRadius: 20, overflow: "hidden", marginBottom: 16,
          }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: TG.muted, fontSize: 13 }}>
                Нет кампаний
              </div>
            ) : campaigns.map((c, i) => (
              <CampaignRow key={c.id} campaign={c} last={i === campaigns.length - 1} onClick={onViewCampaigns} />
            ))}
          </div>

          <button
            onClick={onNewCampaign}
            className="tap"
            style={{
              width: "100%", padding: "15px 0",
              background: "linear-gradient(135deg, #5288c1 0%, #3b6fa8 100%)",
              border: "none", borderRadius: 16, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
              boxShadow: "0 4px 24px rgba(82,136,193,0.35), 0 1px 0 rgba(255,255,255,0.15) inset",
              letterSpacing: "0.01em",
            }}
          >
            <Send size={16} /> Новая рассылка
          </button>
        </div>
      )}
    </div>
  );
}
