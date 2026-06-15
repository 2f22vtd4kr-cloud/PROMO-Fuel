import { useState, useEffect } from "react";
import { Bell, Megaphone, BarChart2, ArrowUpRight, Gift, Users2, TrendingUp, Shield, Flame, Fuel } from "lucide-react";
import { api, Campaign, AnalyticsOverview } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

export function HomePage({ onNewCampaign, onViewCampaigns, onNavigate }: {
  onNewCampaign: () => void;
  onViewCampaigns: () => void;
  onNavigate: (tab: string) => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOverview(), api.getCampaigns(), api.getUsers()])
      .then(([ov, cps, us]) => {
        setOverview(ov);
        setCampaigns(cps.slice(0, 3));
        setUsers(us.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    const t = setInterval(() => {
      api.getOverview().then(setOverview).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const stats = [
    {
      label: "Отправлено",
      value: overview ? (overview.totalSent >= 1000 ? `${(overview.totalSent / 1000).toFixed(0)}K` : String(overview.totalSent)) : "—",
      sub: overview && overview.sentDelta > 0 ? `+${overview.sentDelta}% сегодня` : "за всё время",
      color: TG.green,
      glow: TG.greenGlow,
      icon: Gift,
    },
    {
      label: "Активных",
      value: overview ? String(overview.activeCampaigns) : "—",
      sub: "кампании",
      color: "#ff9f40",
      glow: "rgba(255,159,64,0.38)",
      icon: Flame,
    },
    {
      label: "Охват",
      value: users >= 1000 ? `${(users / 1000).toFixed(1)}K` : String(users),
      sub: "пользователей",
      color: TG.accent ?? "#6ba8e5",
      glow: "rgba(107,168,229,0.38)",
      icon: Users2,
    },
    {
      label: "Конверсия",
      value: overview ? `${overview.avgOpenRate.toFixed(0)}%` : "—",
      sub: overview && overview.avgCtr ? `CTR ${overview.avgCtr.toFixed(1)}%` : "open rate",
      color: TG.purple,
      glow: TG.purpleGlow,
      icon: TrendingUp,
    },
  ];

  const quickActions = [
    { label: "Новая рассылка", icon: Megaphone, color: TG.green,          glow: TG.greenGlow,                action: () => { haptic.medium(); onNewCampaign(); } },
    { label: "Статистика",     icon: BarChart2, color: TG.accent ?? "#6ba8e5", glow: "rgba(107,168,229,0.38)", action: () => { haptic.light(); onNavigate("analytics"); } },
    { label: "Аудитория",      icon: Users2,    color: "#c4aeff",          glow: "rgba(196,174,255,0.38)",    action: () => { haptic.light(); onNavigate("audience"); } },
    { label: "Аккаунты",       icon: Shield,    color: "#ff7eb3",          glow: "rgba(255,126,179,0.38)",    action: () => { haptic.light(); onNavigate("accounts"); } },
  ];

  return (
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 24px" }}>

        {/* Welcome header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>
              Добро пожаловать 👋
            </div>
            <div style={{ fontSize: 12, color: TG.textSecondary, marginTop: 2 }}>
              PROMO-Fuel • Личный кабинет
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <GlassCard style={{ padding: "8px 10px", borderRadius: 14 }}>
              <Bell size={17} color={TG.accent ?? "#6ba8e5"} style={{ display: "block" }} />
            </GlassCard>
            {!loading && (overview?.activeCampaigns ?? 0) > 0 && (
              <div style={{
                position: "absolute", top: -3, right: -3,
                width: 8, height: 8, borderRadius: "50%",
                background: TG.green,
                boxShadow: `0 0 6px 2px ${TG.greenGlow}`,
                border: "1.5px solid #07090f",
              }} />
            )}
          </div>
        </div>

        {/* Stats 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.label} glow={`${s.glow}30`} style={{ padding: "14px 14px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 10,
                    background: `${s.color}18`,
                    border: `1px solid ${s.color}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 12px ${s.glow}`,
                  }}>
                    <Icon size={14} color={s.color} />
                  </div>
                  <ArrowUpRight size={12} color={s.color} style={{ opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {loading ? <span style={{ opacity: 0.3 }}>—</span> : s.value}
                </div>
                <div style={{ fontSize: 10, color: TG.muted, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>
              </GlassCard>
            );
          })}
        </div>

        {/* Quick actions */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Быстрые действия
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.label} style={{ flexShrink: 0 }} onClick={a.action}>
                  <GlassCard glow={`${a.glow}28`} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, minWidth: 72, cursor: "pointer" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: `linear-gradient(145deg,${a.color}30 0%,${a.color}10 100%)`,
                      border: `1px solid ${a.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 16px ${a.glow}50`,
                    }}>
                      <Icon size={16} color={a.color} />
                    </div>
                    <span style={{ fontSize: 9, color: TG.textSecondary, fontWeight: 700, textAlign: "center", letterSpacing: "0.02em", lineHeight: 1.2, maxWidth: 64 }}>
                      {a.label}
                    </span>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active campaigns */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Активные акции
            </div>
            <span onClick={() => { haptic.light(); onViewCampaigns(); }} style={{ fontSize: 11, color: TG.accent ?? "#6ba8e5", fontWeight: 600, cursor: "pointer" }}>Все →</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${TG.green}40`, borderTopColor: TG.green, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : campaigns.length === 0 ? (
            <GlassCard style={{ padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: TG.muted }}>Нет активных кампаний</div>
              <div onClick={() => { haptic.medium(); onNewCampaign(); }} style={{ marginTop: 10, fontSize: 12, color: TG.green, fontWeight: 700, cursor: "pointer" }}>+ Создать кампанию</div>
            </GlassCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {campaigns.map((c, i) => {
                const colors = ["#6ba8e5", "#2de897", "#ff9f40"];
                const glows = ["rgba(107,168,229,0.38)", "rgba(45,232,151,0.38)", "rgba(255,159,64,0.38)"];
                const badges = ["ТОП", "АКТИВНА", "НОВАЯ"];
                const color = colors[i % colors.length]!;
                const glow = glows[i % glows.length]!;
                const badge = badges[i % badges.length]!;
                const claimed = c.sent_count;
                const total = c.target_count || 1;
                const pct = Math.min(100, Math.round(claimed / total * 100));
                return (
                  <GlassCard key={c.id} glow={`${glow}20`} style={{ padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ flex: 1, marginRight: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 9,
                            background: `linear-gradient(145deg,${color}35 0%,${color}15 100%)`,
                            border: `1px solid ${color}50`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 0 12px ${glow}40`,
                          }}>
                            <Fuel size={13} color={color} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>{c.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: TG.textSecondary, marginLeft: 35, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 180 }}>
                          {c.text_template}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                        color: color, background: `${color}20`,
                        border: `1px solid ${color}40`,
                        borderRadius: 20, padding: "2px 8px", flexShrink: 0,
                      }}>{badge}</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: TG.muted }}>Использовано</span>
                        <span style={{ fontSize: 10, color: color, fontWeight: 700 }}>
                          {claimed.toLocaleString("ru")} / {total.toLocaleString("ru")}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 2, width: `${pct}%`,
                          background: `linear-gradient(90deg,${color},${color}bb)`,
                          boxShadow: `0 0 8px ${glow}`,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
