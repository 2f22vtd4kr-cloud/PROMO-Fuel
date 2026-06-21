import { useState, useEffect } from "react";
import { Bell, Megaphone, BarChart2, ArrowUpRight, Gift, Users2, TrendingUp, Shield, Flame, Radio, Cpu } from "lucide-react";
import { api, Campaign, AnalyticsOverview, WorkersSummary, DailyDigest } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";
import { useI18n } from "../lib/i18n";

export function HomePage({ onNewCampaign, onViewCampaigns, onNavigate }: {
  onNewCampaign: () => void;
  onViewCampaigns: () => void;
  onNavigate: (tab: string) => void;
}) {
  const [overview,       setOverview]       = useState<AnalyticsOverview | null>(null);
  const [digest,         setDigest]         = useState<DailyDigest | null>(null);
  const [campaigns,      setCampaigns]      = useState<Campaign[]>([]);
  const [groupCampaigns, setGroupCampaigns] = useState(0);
  const [users,          setUsers]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [workers,        setWorkers]        = useState<WorkersSummary | null>(null);
  const [bannedAcctCount, setBannedAcctCount] = useState(0);
  const [quotaPct,        setQuotaPct]        = useState<number | null>(null);
  const [floodedCount,    setFloodedCount]    = useState(0);
  const [lastRefreshed,  setLastRefreshed]  = useState<Date | null>(null);
  const [upcomingCamps,  setUpcomingCamps]  = useState<{ id: number; name: string; scheduled_at: string; target_count: number }[]>([]);
  const { t, lang } = useI18n();

  useEffect(() => {
    Promise.all([api.getOverview(), api.getCampaigns(), api.getUsers(), api.getWorkersSummary(), api.getGroupCampaigns(), api.getAccounts(), api.getDailyDigest(), api.getUpcomingCampaigns()])
      .then(([ov, cps, us, ws, gcs, accts, dg, upcoming]) => {
        setOverview(ov);
        setDigest(dg);
        setCampaigns(cps.slice(0, 3));
        setUsers(us.length);
        setWorkers(ws);
        setGroupCampaigns(gcs.filter(g => g.status === "running").length);
        setBannedAcctCount(accts.filter((a: { is_banned: number }) => a.is_banned === 1).length);
        const totalSent  = accts.reduce((s: number, a: { sent_today: number }) => s + (a.sent_today || 0), 0);
        const totalLimit = accts.reduce((s: number, a: { daily_limit: number }) => s + (a.daily_limit || 300), 0);
        setQuotaPct(totalLimit > 0 ? Math.min(100, Math.round(totalSent / totalLimit * 100)) : null);
        setFloodedCount(accts.filter((a: { flood_wait_until: string | null }) => !!a.flood_wait_until).length);
        setUpcomingCamps(Array.isArray(upcoming) ? upcoming : []);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLastRefreshed(new Date()); });
    const t = setInterval(() => {
      api.getOverview().then(setOverview).catch(() => {});
      api.getDailyDigest().then(setDigest).catch(() => {});
      api.getWorkersSummary().then(setWorkers).catch(() => {});
      api.getGroupCampaigns().then(gcs => setGroupCampaigns(gcs.filter(g => g.status === "running").length)).catch(() => {});
      setLastRefreshed(new Date());
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const todaySent = digest ? digest.total_sent_today : null;
  const weekDelta = digest ? digest.week_delta_pct : null;

  const stats = [
    {
      label: t.home.statSent,
      value: overview ? (overview.totalSent >= 1000 ? `${(overview.totalSent / 1000).toFixed(0)}K` : String(overview.totalSent)) : "—",
      sub: todaySent !== null
        ? (todaySent > 0 ? `+${todaySent} ${t.common.today}` : t.common.allTime)
        : (overview && overview.sentDelta > 0 ? `+${overview.sentDelta}% ${t.common.today}` : t.common.allTime),
      color: TG.green,
      glow: TG.greenGlow,
      icon: Gift,
    },
    {
      label: t.home.statActive,
      value: overview ? String(overview.activeCampaigns) : "—",
      sub: t.home.campaigns,
      color: "#ff9f40",
      glow: "rgba(255,159,64,0.38)",
      icon: Flame,
    },
    {
      label: t.home.statReach,
      value: users >= 1000 ? `${(users / 1000).toFixed(1)}K` : String(users),
      sub: t.home.users,
      color: TG.accent ?? "#6ba8e5",
      glow: "rgba(107,168,229,0.38)",
      icon: Users2,
    },
    {
      label: t.home.statConversion,
      value: overview ? `${overview.avgOpenRate.toFixed(0)}%` : "—",
      sub: overview && overview.avgCtr ? `CTR ${overview.avgCtr.toFixed(1)}%` : "open rate",
      color: TG.purple,
      glow: TG.purpleGlow,
      icon: TrendingUp,
    },
  ];

  const quickActions = [
    { label: t.home.quickActions.newCampaign, icon: Megaphone, color: TG.green,              glow: TG.greenGlow,                action: () => { haptic.medium(); onNewCampaign(); } },
    { label: t.home.quickActions.groups,      icon: Radio,     color: "#ffc946",             glow: "rgba(255,201,70,0.38)",     action: () => { haptic.light(); onNavigate("groups"); } },
    { label: t.home.quickActions.stats,       icon: BarChart2, color: TG.accent ?? "#6ba8e5", glow: "rgba(107,168,229,0.38)",   action: () => { haptic.light(); onNavigate("analytics"); } },
    { label: t.home.quickActions.audience,    icon: Users2,    color: "#c4aeff",             glow: "rgba(196,174,255,0.38)",    action: () => { haptic.light(); onNavigate("audience"); } },
    { label: t.home.quickActions.accounts,    icon: Shield,    color: "#ff7eb3",             glow: "rgba(255,126,179,0.38)",    action: () => { haptic.light(); onNavigate("accounts"); } },
    { label: t.home.quickActions.workers,     icon: Cpu,       color: "#a78bfa",             glow: "rgba(167,139,250,0.38)",    action: () => { haptic.light(); onNavigate("workers"); } },
  ];

  const sparklineHeights = [4, 8, 6, 12, 8, 10, 16];

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", backgroundImage: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(26,34,53,0.8) 0%, transparent 60%)' }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: "24px" }}>

          {/* Welcome header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(to bottom, rgba(6,8,16,0.95) 0%, transparent 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: "14px 14px 10px" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>
                {t.home.welcome}
              </div>
              <div style={{ fontSize: 12, color: TG.textSecondary, marginTop: 2 }}>
                {t.home.personalCabinet}
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

          {/* Last-refresh timestamp */}
          {lastRefreshed && (
            <div style={{ fontSize: 9, color: TG.muted, textAlign: "right", paddingRight: 16, marginTop: -6 }}>
              {t.home.updatedAt} {lastRefreshed.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}

          {/* Worker dots strip */}
          {workers && (
            workers.alive_workers === 0 ? (
              <div
                onClick={() => { haptic.medium(); onNavigate("workers"); }}
                style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 14px", padding: "8px 12px", borderRadius: 12, background: "rgba(255,201,70,0.07)", border: "1px solid rgba(255,201,70,0.30)", cursor: "pointer", animation: "slideUp 0.4s ease-out" }}
              >
                <span style={{ fontSize: 13 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ffc946" }}>{t.home.noWorkers}</div>
                  <div style={{ fontSize: 10, color: TG.muted }}>{t.home.noWorkersHint}</div>
                </div>
                <ArrowUpRight size={14} color="#ffc946" />
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, margin: "0 14px", alignItems: "center", animation: "slideUp 0.4s ease-out" }}>
                {Array.from({ length: workers.alive_workers + workers.dead_workers }).map((_, i) => {
                  const isAlive = i < workers.alive_workers;
                  return (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: isAlive ? "#2de897" : "#ff6b7a", boxShadow: isAlive ? "0 0 8px rgba(45,232,151,0.6)" : "none" }} />
                  );
                })}
                <div style={{ fontSize: 10, color: TG.muted, marginLeft: 4, fontWeight: 600 }}>
                  {t.home.workerActive(workers.alive_workers)}
                </div>
                {groupCampaigns > 0 && (
                  <div style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "#6ba8e5", background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.25)", borderRadius: 20, padding: "2px 7px" }}>
                    {t.home.groupsOnAir(groupCampaigns)}
                  </div>
                )}
              </div>
            )
          )}

          {/* Banned accounts warning */}
          {bannedAcctCount > 0 && (
            <div
              onClick={() => { haptic.medium(); onNavigate("workers"); }}
              style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 14px", padding: "8px 12px", borderRadius: 12, background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.30)", cursor: "pointer", animation: "slideUp 0.4s ease-out" }}
            >
              <span style={{ fontSize: 13 }}>⛔</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b7a" }}>
                  {bannedAcctCount === 1 ? t.home.bannedAccount : t.home.bannedAccountsMulti(bannedAcctCount)}
                </div>
                <div style={{ fontSize: 10, color: TG.muted }}>{t.home.bannedHint}</div>
              </div>
              <ArrowUpRight size={14} color="#ff6b7a" />
            </div>
          )}

          {/* Account quota bar — shown when at least one account exists */}
          {quotaPct !== null && (
            <div
              onClick={() => { haptic.light(); onNavigate("accounts"); }}
              style={{ margin: "0 14px", padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", animation: "slideUp 0.4s ease-out" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: TG.muted }}>{t.home.quotaSent}</span>
                  {floodedCount > 0 && (
                    <span style={{ fontSize: 9, color: "#ffc946", background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.25)", borderRadius: 8, padding: "1px 5px" }}>⏳ {floodedCount} flood</span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: quotaPct >= 90 ? "#ff6b7a" : quotaPct >= 70 ? "#ffc946" : "#2de897" }}>{quotaPct}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${quotaPct}%`, background: quotaPct >= 90 ? "linear-gradient(90deg,#ff6b7a,#ff9f7a)" : quotaPct >= 70 ? "linear-gradient(90deg,#ffc946,#ffdd86)" : "linear-gradient(90deg,#2de897,#6ba8e5)", transition: "width 0.6s ease" }} />
              </div>
            </div>
          )}

          {/* Upcoming scheduled campaigns widget */}
          {upcomingCamps.length > 0 && (
            <div
              onClick={() => { haptic.light(); onNavigate("campaigns"); }}
              style={{ margin: "0 14px", padding: "9px 12px", borderRadius: 12, background: "rgba(196,174,255,0.06)", border: "1px solid rgba(196,174,255,0.18)", cursor: "pointer", animation: "slideUp 0.4s ease-out 0.05s both" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#c4aeff" }}>{t.home.scheduledLabel}</span>
                <span style={{ fontSize: 9, color: "rgba(196,174,255,0.6)" }}>{t.home.scheduledSuffix(upcomingCamps.length)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {upcomingCamps.slice(0, 2).map(c => {
                  const dt = new Date(c.scheduled_at);
                  const now = Date.now();
                  const delta = dt.getTime() - now;
                  const hh = Math.floor(delta / 3600000);
                  const mm = Math.floor((delta % 3600000) / 60000);
                  const timeStr = dt.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
                  const countdown = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
                  return (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: TG.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "60%" }}>{c.name}</span>
                      <span style={{ fontSize: 10, color: "rgba(196,174,255,0.8)", flexShrink: 0 }}>{timeStr} · {countdown}</span>
                    </div>
                  );
                })}
                {upcomingCamps.length > 2 && (
                  <span style={{ fontSize: 9, color: "rgba(196,174,255,0.5)" }}>+{upcomingCamps.length - 2} {t.common.more}</span>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Fuel gauge / conversion ring — shown only when campaigns are active */}
            {!loading && overview && overview.activeCampaigns > 0 && (
              <div className="glass-card-v2" style={{ display: 'flex', alignItems: 'center', gap: '1rem', animation: "slideUp 0.4s ease-out 0.1s both" }}>
            <div className="conversion-ring">
              <span className="rate">{overview.avgOpenRate.toFixed(0)}%</span>
              <span className="rate-label">conv.</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {overview.activeCampaigns} активных кампаний
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                {t.home.sentAndBase(overview.totalSent.toLocaleString(lang), users.toLocaleString(lang))}
              </div>
            </div>
            <span className="status-badge status-running">Live</span>
          </div>
        )}

        {/* Stats 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {stats.map((s, i) => {
            const Icon = s.icon;
            const navTarget = i === 0 ? "campaigns" : i === 1 ? "campaigns" : i === 2 ? "audience" : "analytics";
            return (
              <GlassCard key={s.label} glow={`${s.glow}30`} style={{ padding: "14px 14px 12px", position: "relative", animation: `slideUp 0.4s ease-out ${i * 0.1 + 0.2}s both`, cursor: "pointer" }} onClick={() => { haptic.light(); onNavigate(navTarget); }}>
                <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`, opacity: 0.8 }} />
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
                <div style={{ fontSize: 22, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {loading ? <span style={{ opacity: 0.3 }}>—</span> : s.value}
                </div>
                <div style={{ fontSize: 10, color: TG.muted, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{s.sub}</span>
                  {i === 0 && weekDelta !== null && weekDelta !== 0 ? (
                    <span style={{
                      fontSize: 9, fontWeight: 800, borderRadius: 20, padding: "1px 6px",
                      background: weekDelta > 0 ? "rgba(45,232,151,0.14)" : "rgba(255,107,107,0.14)",
                      border: `1px solid ${weekDelta > 0 ? "rgba(45,232,151,0.35)" : "rgba(255,107,107,0.35)"}`,
                      color: weekDelta > 0 ? "#2de897" : "#ff6b7a",
                    }}>
                      {weekDelta > 0 ? "+" : ""}{weekDelta}% нед.
                    </span>
                  ) : (
                    <svg width="27" height="16" viewBox="0 0 27 16">
                      {sparklineHeights.map((h, idx) => (
                        <rect
                          key={idx}
                          x={idx * 4}
                          y={16 - h}
                          width="3"
                          height={h}
                          fill={s.color}
                          opacity={idx === sparklineHeights.length - 1 ? 1 : 0.4}
                          rx="1"
                        />
                      ))}
                    </svg>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Worker health strip */}
        {workers && (
          <div onClick={() => { haptic.light(); onNavigate("workers"); }} style={{ cursor: "pointer" }}>
            <GlassCard
              glow={workers.alive_workers > 0 ? "rgba(45,232,151,0.18)" : "rgba(255,107,122,0.18)"}
              style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 9, background: workers.alive_workers > 0 ? "rgba(45,232,151,0.15)" : "rgba(255,107,122,0.12)", border: `1px solid ${workers.alive_workers > 0 ? "rgba(45,232,151,0.35)" : "rgba(255,107,122,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cpu size={14} color={workers.alive_workers > 0 ? "#2de897" : "#ff6b7a"} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TG.text }}>
                  {t.nav.workers}: <span style={{ color: workers.alive_workers > 0 ? "#2de897" : "#ff6b7a" }}>{workers.alive_workers} {t.workers.alive}</span>
                  {workers.dead_workers > 0 && <span style={{ color: "#ff6b7a", marginLeft: 6 }}>· {workers.dead_workers} {t.workers.dead}</span>}
                  {groupCampaigns > 0 && <span style={{ color: "#ffc946", marginLeft: 6 }}>· {groupCampaigns} {t.groups.title.toLowerCase()}</span>}
                </div>
                <div style={{ fontSize: 10, color: TG.muted, marginTop: 1 }}>
                  {workers.tasks_pending > 0
                    ? `${workers.tasks_pending} ${t.workers.tasksPending} · ${workers.tasks_done} ${t.workers.tasksDone}`
                    : `${t.workers.tasksPending}: 0 · ${workers.tasks_done} ${t.workers.tasksDone}`}
                </div>
              </div>
              <ArrowUpRight size={12} color={TG.muted} />
            </GlassCard>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            {lang === "ru" ? "Быстрые действия" : lang === "uk" ? "Швидкі дії" : "Quick Actions"}
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

        {/* Group campaigns quick strip */}
        {groupCampaigns > 0 && (
          <div onClick={() => { haptic.light(); onNavigate("groups"); }} style={{ cursor: "pointer" }}>
            <GlassCard glow="rgba(255,201,70,0.14)" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(255,201,70,0.14)", border: "1px solid rgba(255,201,70,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Radio size={14} color="#ffc946" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TG.text }}>
                  {t.groups.title}: <span style={{ color: "#ffc946" }}>{groupCampaigns} {t.groups.running.toLowerCase()}</span>
                </div>
                <div style={{ fontSize: 10, color: TG.muted, marginTop: 1 }}>{lang === "ru" ? "Нажми для управления" : lang === "uk" ? "Натисніть для керування" : "Tap to manage"}</div>
              </div>
              <ArrowUpRight size={12} color={TG.muted} />
            </GlassCard>
          </div>
        )}

        {/* Active campaigns */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {t.home.recentCampaigns}
            </div>
            <span onClick={() => { haptic.light(); onViewCampaigns(); }} style={{ fontSize: 11, color: TG.accent ?? "#6ba8e5", fontWeight: 600, cursor: "pointer" }}>{t.home.viewAll} →</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${TG.green}40`, borderTopColor: TG.green, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : campaigns.length === 0 ? (
            <GlassCard style={{ padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: TG.muted }}>{t.home.noCampaigns}</div>
              <div onClick={() => { haptic.medium(); onNewCampaign(); }} style={{ marginTop: 10, fontSize: 12, color: TG.green, fontWeight: 700, cursor: "pointer" }}>+ {t.campaigns.newCampaign}</div>
            </GlassCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {campaigns.map((c, i) => {
                const colors = ["#6ba8e5", "#2de897", "#ff9f40"];
                const glows = ["rgba(107,168,229,0.38)", "rgba(45,232,151,0.38)", "rgba(255,159,64,0.38)"];
                const color = colors[i % colors.length]!;
                const glow = glows[i % glows.length]!;
                const badge = c.status === "running" ? t.status.running.toUpperCase() : c.status === "paused" ? t.status.paused.toUpperCase() : t.status.draft.toUpperCase();
                const badgeColor = c.status === "running" ? "#2de897" : c.status === "paused" ? "#ffc946" : "#7c8db0";
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
                        color: badgeColor, background: `${badgeColor}20`,
                        border: `1px solid ${badgeColor}40`,
                        borderRadius: 20, padding: "2px 8px", flexShrink: 0,
                      }}>{badge}</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: TG.muted }}>{lang === "ru" ? "Использовано" : lang === "uk" ? "Використано" : "Used"}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {pct > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}35`, borderRadius: 8, padding: "1px 5px" }}>{pct}%</span>
                          )}
                          <span style={{ fontSize: 10, color, fontWeight: 700 }}>
                            {claimed.toLocaleString("ru")} / {total.toLocaleString("ru")}
                          </span>
                        </div>
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
      </div>
    </>
  );
}
