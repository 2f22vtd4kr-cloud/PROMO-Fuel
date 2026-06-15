import { useState, useEffect } from "react";
import { Send, Users, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { api, Campaign, AnalyticsOverview } from "../lib/api";
import { TG, STATUS_META } from "../lib/theme";
import { Header } from "../components/Header";
import { CampaignRow } from "../components/CampaignRow";
import { FullSpinner } from "../components/Spinner";

function StatCard({ icon: Icon, label, value, delta, color }: {
  icon: React.ElementType; label: string; value: string; delta?: string; color: string;
}) {
  return (
    <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ background: color + "22", borderRadius: 8, padding: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ color: TG.muted, fontSize: 11, fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
      </div>
      <div style={{ color: TG.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>{value}</div>
      {delta && (
        <div style={{ color: TG.green, fontSize: 11, marginTop: 4, fontWeight: 500 }}>{delta}</div>
      )}
    </div>
  );
}

export function HomePage({ onNewCampaign, onViewCampaigns }: {
  onNewCampaign: () => void;
  onViewCampaigns: () => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [ov, cps, us] = await Promise.all([
        api.getOverview(),
        api.getCampaigns(),
        api.getUsers(),
      ]);
      setOverview(ov);
      setCampaigns(cps.slice(0, 5));
      setUsers(us.length);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="RUProbe CRM"
        subtitle={timeStr}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={load} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, color: TG.muted }}>
              <RefreshCw size={14} />
            </button>
            <div style={{
              background: TG.accent + "22", borderRadius: 20, padding: "5px 11px",
              fontSize: 12, color: TG.accent, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: TG.green }} />
              Онлайн
            </div>
          </div>
        }
      />

      {loading && !overview ? (
        <FullSpinner />
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 16px", WebkitOverflowScrolling: "touch" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 18 }}>
            <StatCard
              icon={Send} label="Отправлено" color={TG.accent}
              value={(overview?.totalSent ?? 0).toLocaleString("ru")}
              delta={overview && overview.sentDelta > 0 ? `↑ ${overview.sentDelta}% сегодня` : undefined}
            />
            <StatCard icon={Users} label="Подписчики" color={TG.green}
              value={users.toLocaleString("ru")} />
            <StatCard icon={TrendingUp} label="Open Rate" color={TG.yellow}
              value={`${(overview?.avgOpenRate ?? 0).toFixed(1)}%`} />
            <StatCard icon={Zap} label="Кампаний" color={TG.purple}
              value={(overview?.totalCampaigns ?? 0).toString()} />
          </div>

          {/* Campaigns */}
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Рассылки</span>
            <button onClick={onViewCampaigns} style={{ fontSize: 12, color: TG.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
              Все →
            </button>
          </div>

          <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: TG.muted, fontSize: 13 }}>
                Нет кампаний
              </div>
            ) : campaigns.map((c, i) => (
              <CampaignRow
                key={c.id} campaign={c}
                last={i === campaigns.length - 1}
                onClick={onViewCampaigns}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onNewCampaign}
            style={{
              width: "100%", padding: "14px 0",
              background: TG.accentGrad,
              border: "none", borderRadius: 13, color: TG.text,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Send size={16} /> Новая рассылка
          </button>
        </div>
      )}
    </div>
  );
}
