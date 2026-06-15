import {
  LayoutDashboard,
  Megaphone,
  Users,
  Building2,
  Settings,
  Send,
  MailOpen,
  MousePointerClick,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TREND_DATA = [
  { name: "Пн", sent: 120000, opened: 45000, clicked: 12000 },
  { name: "Вт", sent: 180000, opened: 65000, clicked: 18000 },
  { name: "Ср", sent: 150000, opened: 58000, clicked: 15000 },
  { name: "Чт", sent: 210000, opened: 82000, clicked: 22000 },
  { name: "Пт", sent: 190000, opened: 74000, clicked: 19000 },
  { name: "Сб", sent: 90000, opened: 35000, clicked: 8000 },
  { name: "Вс", sent: 110000, opened: 41000, clicked: 9500 },
];

const CAMPAIGNS = [
  { name: "Q3 Promo Blast", reach: 450200, openRate: 24.1, ctr: 4.8, status: "Active" },
  { name: "Onboarding Sequence", reach: 12450, openRate: 48.2, ctr: 12.4, status: "Active" },
  { name: "Re-engagement 2024", reach: 89000, openRate: 18.5, ctr: 2.1, status: "Paused" },
  { name: "Weekly Newsletter", reach: 210000, openRate: 22.4, ctr: 3.5, status: "Draft" },
  { name: "VIP Announcement", reach: 5400, openRate: 64.0, ctr: 28.5, status: "Active" },
];

const FEED = [
  { user: "alex_dev", action: "открыл письмо", campaign: "Q3 Promo Blast", time: "1 мин", color: "#3b82f6" },
  { user: "maria_s", action: "перешел по ссылке", campaign: "Onboarding", time: "2 мин", color: "#10b981" },
  { user: "ivan_k", action: "отписался", campaign: "Newsletter", time: "5 мин", color: "#ef4444" },
  { user: "anna_p", action: "открыл письмо", campaign: "Q3 Promo Blast", time: "12 мин", color: "#3b82f6" },
  { user: "dmitry_v", action: "совершил покупку", campaign: "VIP Announce", time: "18 мин", color: "#a855f7" },
];

const FUNNEL = [
  { label: "Отправлено", value: "1 247 839", pct: 100, color: "#475569" },
  { label: "Доставлено",  value: "1 198 726", pct: 96,  color: "#3b82f6" },
  { label: "Открыто",     value: "291 943",   pct: 23,  color: "#10b981" },
  { label: "Кликнули",    value: "52 409",    pct: 4,   color: "#f59e0b" },
  { label: "Конверсия",   value: "18 763",    pct: 1.5, color: "#a855f7" },
];

const TABS = [
  { icon: LayoutDashboard, label: "Обзор",    active: true  },
  { icon: Megaphone,       label: "Кампании", active: false },
  { icon: Users,           label: "Аудитория",active: false },
  { icon: Building2,       label: "Аккаунты", active: false },
  { icon: Settings,        label: "Настройки",active: false },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 6, marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", margin: 0 }}>
        {title}
      </p>
    </div>
  );
}

function Delta({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 11, fontWeight: 600,
      color: positive ? "#10b981" : "#f43f5e",
      background: positive ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
      borderRadius: 4, padding: "2px 6px",
    }}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {value}
    </span>
  );
}

export function PolishTypographyMobile() {
  const pieData = [{ value: 23.4 }, { value: 76.6 }];

  return (
    <div style={{
      width: 390, height: 844,
      background: "#0d1117", color: "#e2e8f0",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 52, flexShrink: 0,
        background: "#161b22",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Activity size={14} color="white" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "white" }}>RUProbe CRM</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 20, padding: "3px 10px",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#10b981", display: "inline-block",
            animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "#10b981" }}>Live</span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Page title */}
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
            Обзор аналитики
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
            Сводные показатели по всем кампаниям
          </p>
        </div>

        {/* ── KPI cards — 2 cols ── */}
        <section>
          <SectionHeader title="Ключевые показатели" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

            {/* Отправлено — 7-digit → text-base mono */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(59,130,246,0.12)" }}>
                  <Send size={13} color="#3b82f6" />
                </div>
                <Delta value="+8.3%" positive />
              </div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
                1 247 839
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>Отправлено</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>за все время</div>
            </div>

            {/* Аудитория — 5-digit */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(168,85,247,0.12)" }}>
                  <Users size={13} color="#a855f7" />
                </div>
                <Delta value="+2.1%" positive />
              </div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 700, color: "white" }}>
                94 210
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>Аудитория</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>контактов</div>
            </div>

            {/* Open Rate — percentage */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(16,185,129,0.12)" }}>
                  <MailOpen size={13} color="#10b981" />
                </div>
                <Delta value="+1.2%" positive />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>
                23.4<span style={{ fontSize: 15, color: "#64748b", fontWeight: 500 }}>%</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>Open Rate</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>средний %</div>
            </div>

            {/* CTR — percentage */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(245,158,11,0.12)" }}>
                  <MousePointerClick size={13} color="#f59e0b" />
                </div>
                <Delta value="−0.8%" positive={false} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>
                4.2<span style={{ fontSize: 15, color: "#64748b", fontWeight: 500 }}>%</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>CTR</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>клики / отправленные</div>
            </div>

            {/* Кампаний — 2-digit → big */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(251,191,36,0.12)", display: "inline-flex" }}>
                  <Megaphone size={13} color="#fbbf24" />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "white", lineHeight: 1 }}>47</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 4 }}>Кампаний</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>всего активных</div>
            </div>

            {/* Активных — 2-digit */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(244,63,94,0.12)", display: "inline-flex" }}>
                  <Activity size={13} color="#f43f5e" />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "white", lineHeight: 1 }}>12</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 4 }}>Активных</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>сейчас онлайн</div>
            </div>

          </div>
        </section>

        {/* ── Trend chart ── */}
        <section>
          <SectionHeader title="Активность" />
          <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 12px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "white" }}>Динамика за 7 дней</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>Отправки и открытия</p>
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                color: "#10b981", fontSize: 10, fontWeight: 600,
                borderRadius: 20, padding: "3px 8px",
              }}>
                <TrendingUp size={10} /> ↑ 8.3%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={TREND_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="mSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Area type="monotone" dataKey="sent"   stroke="#3b82f6" strokeWidth={2} fill="url(#mSent)" dot={false} />
                <Area type="monotone" dataKey="opened" stroke="#10b981" strokeWidth={2} fill="url(#mOpen)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Inline legend */}
            <div style={{ display: "flex", gap: 14, marginTop: 6, paddingLeft: 4 }}>
              {[["#3b82f6","Отправлено"],["#10b981","Открыто"]].map(([c,l]) => (
                <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c as string, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#64748b" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Donut ── */}
        <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 12px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "white" }}>Эффективность</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* donut */}
            <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={48}
                    startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                    <Cell fill="#3b82f6" />
                    <Cell fill="#1e293b" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "white", lineHeight: 1 }}>23.4<span style={{ fontSize: 12, color: "#64748b" }}>%</span></span>
                <span style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Open Rate</span>
              </div>
            </div>
            {/* stats */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Click Rate",   value: "4.2%",  color: "#a855f7" },
                { label: "Bounce Rate",  value: "12.1%", color: "#f43f5e" },
                { label: "Конверсия",    value: "1.5%",  color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 3, height: 28, background: s.color, borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</span>
                  </div>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 700, color: "white" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Funnel ── */}
        <section>
          <SectionHeader title="Воронка конверсии" />
          <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FUNNEL.map((f, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{f.label}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "#475569" }}>{f.pct}%</span>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 700, color: "white" }}>{f.value}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "#1e293b", borderRadius: 9999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${f.pct === 100 ? 100 : f.pct * 0.85 + 10}%`, background: f.color, borderRadius: 9999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Top campaigns — card rows ── */}
        <section>
          <SectionHeader title="Кампании" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {CAMPAIGNS.map((c, i) => (
              <div key={i} style={{
                background: "#161b22", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "10px 12px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{c.reach.toLocaleString("ru")} охват</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 700, color: "#3b82f6" }}>{c.openRate}%</div>
                    <div style={{ fontSize: 9, color: "#475569" }}>open</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{c.ctr}%</div>
                    <div style={{ fontSize: 9, color: "#475569" }}>ctr</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                    background: c.status === "Active" ? "rgba(16,185,129,0.12)" : c.status === "Paused" ? "rgba(245,158,11,0.12)" : "rgba(100,116,139,0.12)",
                    color: c.status === "Active" ? "#10b981" : c.status === "Paused" ? "#f59e0b" : "#64748b",
                  }}>
                    {c.status === "Active" ? "Активна" : c.status === "Paused" ? "Пауза" : "Черновик"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live feed ── */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionHeader title="Лента событий" />
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0, marginBottom: 8 }} />
          </div>
          <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
            {FEED.map((e, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 12px",
                borderBottom: i < FEED.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: e.color, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#e2e8f0", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600, color: "white" }}>@{e.user}</span>
                    {" "}{e.action}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "#475569" }}>{e.campaign}</p>
                </div>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#475569", flexShrink: 0 }}>{e.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* bottom spacer for nav */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Bottom tab bar ── */}
      <div style={{
        height: 60, flexShrink: 0,
        background: "#161b22",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
      }}>
        {TABS.map((tab, i) => (
          <button key={i} style={{
            flex: 1, height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, border: "none", background: "transparent", cursor: "pointer",
            color: tab.active ? "#3b82f6" : "#475569",
          }}>
            <tab.icon size={tab.active ? 18 : 17} />
            <span style={{ fontSize: 9, fontWeight: tab.active ? 600 : 400, letterSpacing: "0.01em" }}>{tab.label}</span>
            {tab.active && (
              <span style={{ position: "absolute", bottom: 0, width: 28, height: 2, background: "#3b82f6", borderRadius: "2px 2px 0 0" }} />
            )}
          </button>
        ))}
      </div>

    </div>
  );
}
