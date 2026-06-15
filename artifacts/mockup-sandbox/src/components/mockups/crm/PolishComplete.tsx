import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  LayoutDashboard,
  Route,
  Megaphone,
  Users,
  Building2,
  FileText,
  Settings,
} from "lucide-react";

// --- Colors ---
const COLOR_BLUE = "#3b82f6";
const COLOR_EMERALD = "#10b981";
const COLOR_AMBER = "#f59e0b";
const COLOR_BG = "#0d1117";
const COLOR_CARD = "#161b22";
const BORDER_COLOR = "rgba(255,255,255,0.07)";

// --- Data ---
const areaData = [
  { time: "00:00", sent: 4000, opened: 2400, clicked: 1000 },
  { time: "04:00", sent: 3000, opened: 1398, clicked: 800 },
  { time: "08:00", sent: 2000, opened: 9800, clicked: 2000 },
  { time: "12:00", sent: 2780, opened: 3908, clicked: 1500 },
  { time: "16:00", sent: 1890, opened: 4800, clicked: 1200 },
  { time: "20:00", sent: 2390, opened: 3800, clicked: 1100 },
  { time: "24:00", sent: 3490, opened: 4300, clicked: 1700 },
];

const donutData = [
  { name: "Opened", value: 23.4, color: COLOR_EMERALD },
  { name: "Unopened", value: 76.6, color: "rgba(255,255,255,0.1)" },
];

const funnelData = [
  { label: "Отправлено", value: 1247839, percentage: 100, color: COLOR_BLUE },
  { label: "Доставлено", value: 1198726, percentage: 96, color: "#3b82f6cc" },
  { label: "Открыто", value: 291943, percentage: 23.4, color: "#10b98199" },
  { label: "Кликнули", value: 52409, percentage: 4.2, color: "#10b981cc" },
  { label: "Конверсия", value: 18763, percentage: 1.5, color: COLOR_EMERALD },
];

const campaignsData = [
  { name: "Promo_Q4_Final", reach: 45200, openRate: "28.4%", ctr: "5.2%", status: "Active" },
  { name: "Welcome_Series_B", reach: 12400, openRate: "42.1%", ctr: "12.4%", status: "Active" },
  { name: "Re-engagement_Winback", reach: 89000, openRate: "15.2%", ctr: "1.8%", status: "Warning" },
  { name: "Newsletter_Oct", reach: 245000, openRate: "22.4%", ctr: "3.1%", status: "Finished" },
  { name: "Black_Friday_Teaser", reach: 500000, openRate: "31.2%", ctr: "6.4%", status: "Active" },
];

const activityFeed = [
  { user: "alex_dev", event: "Запустил кампанию", stage: "Promo_Q4", time: "14:23", color: COLOR_BLUE },
  { user: "maria_m", event: "Изменила шаблон", stage: "Welcome_B", time: "14:15", color: COLOR_AMBER },
  { user: "system", event: "Массовая отправка", stage: "Newsletter", time: "13:00", color: COLOR_BLUE },
  { user: "ivan_ops", event: "Остановил рассылку", stage: "Winback", time: "12:45", color: COLOR_AMBER },
  { user: "system", event: "Достигнут лимит", stage: "API", time: "11:30", color: COLOR_AMBER },
  { user: "alex_dev", event: "Создал сегмент", stage: "VIP", time: "10:15", color: COLOR_EMERALD },
];

const cohortData = [
  { date: "Oct 1-7", sizes: [100, 45, 32, 28, 25] },
  { date: "Oct 8-14", sizes: [100, 48, 35, 30, 0] },
  { date: "Oct 15-21", sizes: [100, 52, 38, 0, 0] },
  { date: "Oct 22-28", sizes: [100, 55, 0, 0, 0] },
];

const hourlyBarData = [
  { time: "00", value: 120 }, { time: "01", value: 80 }, { time: "02", value: 50 },
  { time: "03", value: 30 }, { time: "04", value: 20 }, { time: "05", value: 40 },
  { time: "06", value: 90 }, { time: "07", value: 210 }, { time: "08", value: 450 },
  { time: "09", value: 680 }, { time: "10", value: 850 }, { time: "11", value: 920 },
  { time: "12", value: 890 }, { time: "13", value: 810 }, { time: "14", value: 780 },
  { time: "15", value: 820 }, { time: "16", value: 950 }, { time: "17", value: 1100 },
  { time: "18", value: 850 }, { time: "19", value: 600 }, { time: "20", value: 450 },
  { time: "21", value: 320 }, { time: "22", value: 210 }, { time: "23", value: 150 },
];

// --- Subcomponents ---

const SectionHeader = ({ title }: { title: string }) => (
  <div className="mb-4">
    <h3 className="text-[10px] uppercase tracking-widest text-white/60 font-semibold mb-2">{title}</h3>
    <div style={{ height: 1, backgroundColor: BORDER_COLOR }} className="w-full" />
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    style={{ backgroundColor: COLOR_CARD, borderColor: BORDER_COLOR }}
    className={\`border rounded-xl p-4 \${className}\`}
  >
    {children}
  </div>
);

const KPICard = ({ title, value, change, isPositive, valueClass }: any) => (
  <Card className="flex flex-col justify-between">
    <div className="text-white/60 text-sm font-medium mb-2">{title}</div>
    <div className="flex items-end justify-between">
      <div className={\`text-white font-bold tracking-tight \${valueClass}\`}>{value}</div>
      {change && (
        <div
          style={{ color: isPositive ? COLOR_EMERALD : COLOR_AMBER }}
          className="text-sm font-medium mb-1"
        >
          {change}
        </div>
      )}
    </div>
  </Card>
);

export function PolishComplete() {
  return (
    <div style={{ backgroundColor: COLOR_BG, color: "white" }} className="flex h-screen overflow-hidden font-sans">
      {/* Sidebar */}
      <div
        style={{
          background: "linear-gradient(180deg, #161b22 0%, #0f1621 100%)",
          borderColor: BORDER_COLOR,
        }}
        className="w-64 border-r flex flex-col shrink-0"
      >
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">RU</span>
            </div>
            RUProbe CRM
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {[
            { name: "Аналитика", icon: LayoutDashboard, active: true },
            { name: "Путь клиента", icon: Route },
            { name: "Кампании", icon: Megaphone },
            { name: "Аудитория", icon: Users },
            { name: "Аккаунты", icon: Building2 },
            { name: "Шаблоны", icon: FileText },
          ].map((item) => (
            <button
              key={item.name}
              style={{
                backgroundColor: item.active ? COLOR_BLUE : "transparent",
                color: item.active ? "white" : "rgba(255,255,255,0.6)",
              }}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors \${
                !item.active ? "hover:bg-white/5 hover:text-white" : ""
              }\`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: BORDER_COLOR }}>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
            Настройки
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Обзор аналитики</h2>
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-sm font-medium border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live SSE
            </div>
          </div>

          {/* МЕТРИКИ ZONE */}
          <div>
            <SectionHeader title="Метрики" />
            <div className="grid grid-cols-6 gap-4">
              <KPICard title="Всего отправлено" value="1,247,839" change="+8.3%" isPositive={true} valueClass="text-xl font-mono" />
              <KPICard title="Аудитория" value="94,210" valueClass="text-2xl" />
              <KPICard title="Кампаний" value="47" valueClass="text-4xl" />
              <KPICard title="Open Rate" value="23.4%" change="+1.2%" isPositive={true} valueClass="text-2xl" />
              <KPICard title="CTR" value="4.2%" change="−0.8%" isPositive={false} valueClass="text-2xl" />
              <KPICard title="Активных" value="12" valueClass="text-4xl" />
            </div>
          </div>

          {/* АКТИВНОСТЬ ZONE */}
          <div>
            <SectionHeader title="Активность" />
            <div className="grid grid-cols-3 gap-4">
              {/* Area Chart */}
              <Card className="col-span-2">
                <h3 className="text-base font-semibold mb-4">Активность (7 дней)</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLOR_BLUE} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLOR_BLUE} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLOR_EMERALD} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLOR_EMERALD} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => \`\${val / 1000}k\`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: COLOR_CARD, borderColor: BORDER_COLOR, borderRadius: 8, fontSize: 12 }}
                        itemStyle={{ color: "white" }}
                      />
                      <Area type="monotone" dataKey="sent" stroke={COLOR_BLUE} strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                      <Area type="monotone" dataKey="opened" stroke={COLOR_EMERALD} strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center mt-2 text-[11px] text-white/60 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_BLUE }}/> Отправлено</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_EMERALD }}/> Открыто</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_AMBER }}/> Клики</div>
                </div>
              </Card>

              {/* Donut Chart */}
              <Card className="flex flex-col">
                <h3 className="text-base font-semibold mb-4">Эффективность</h3>
                <div className="flex-1 relative min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius="70%"
                        outerRadius="90%"
                        stroke="none"
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">23.4%</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/60 mt-1">Open Rate</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">CTR</div>
                    <div className="text-lg font-bold" style={{ color: COLOR_EMERALD }}>4.2%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">Bounce Rate</div>
                    <div className="text-lg font-bold" style={{ color: COLOR_AMBER }}>12.1%</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* КАМПАНИИ ZONE */}
          <div>
            <SectionHeader title="Кампании" />
            <div className="grid grid-cols-3 gap-4">
              {/* Funnel */}
              <Card className="flex flex-col">
                <h3 className="text-base font-semibold mb-4">Воронка конверсии</h3>
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  {funnelData.map((stage, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/80">{stage.label}</span>
                        <span className="font-mono text-white/60">{stage.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-6 bg-white/5 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out flex items-center px-2 justify-end"
                          style={{
                            width: \`\${stage.percentage}%\`,
                            backgroundColor: stage.color,
                            minWidth: '2rem'
                          }}
                        >
                          <span className="text-[10px] font-bold text-white/90 drop-shadow-md">{stage.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Table */}
              <Card className="col-span-2 overflow-hidden flex flex-col">
                <h3 className="text-base font-semibold mb-4">Последние кампании</h3>
                <div className="flex-1 -mx-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: BORDER_COLOR }}>
                        <th className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/60 font-medium">Кампания</th>
                        <th className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/60 font-medium text-right">Охват</th>
                        <th className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/60 font-medium text-right">Open Rate</th>
                        <th className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/60 font-medium text-right">CTR</th>
                        <th className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/60 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignsData.map((campaign, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: BORDER_COLOR }}>
                          <td className="px-4 py-3 text-sm font-medium">{campaign.name}</td>
                          <td className="px-4 py-3 text-sm font-mono text-right">{campaign.reach.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-mono text-right">{campaign.openRate}</td>
                          <td className="px-4 py-3 text-sm font-mono text-right">{campaign.ctr}</td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: campaign.status === 'Active' ? \`\${COLOR_EMERALD}20\` : campaign.status === 'Warning' ? \`\${COLOR_AMBER}20\` : 'rgba(255,255,255,0.1)',
                                color: campaign.status === 'Active' ? COLOR_EMERALD : campaign.status === 'Warning' ? COLOR_AMBER : 'rgba(255,255,255,0.6)'
                              }}
                            >
                              {campaign.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>

          {/* СОБЫТИЯ ZONE */}
          <div>
            <SectionHeader title="События" />
            <div className="grid grid-cols-2 gap-4">
              {/* Activity Feed */}
              <Card>
                <h3 className="text-base font-semibold mb-4">Живая лента</h3>
                <div className="space-y-3">
                  {activityFeed.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm py-1">
                      <div className="flex items-center gap-2 w-1/4 shrink-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-white/80 font-medium truncate">{item.user}</span>
                      </div>
                      <div className="flex-1 text-white/60 truncate">{item.event}</div>
                      <div className="shrink-0">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
                          style={{ backgroundColor: \`\${item.color}15\`, color: item.color }}
                        >
                          {item.stage}
                        </span>
                      </div>
                      <div className="w-12 text-right font-mono text-[11px] opacity-60 shrink-0">{item.time}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex flex-col gap-4">
                {/* Hourly Chart */}
                <Card>
                  <h3 className="text-base font-semibold mb-4">Отправки по часам</h3>
                  <div style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{ backgroundColor: COLOR_CARD, borderColor: BORDER_COLOR, borderRadius: 8, fontSize: 12 }}
                          itemStyle={{ color: "white" }}
                        />
                        <Bar dataKey="value" fill={COLOR_BLUE} radius={[2, 2, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Cohort Grid */}
                <Card>
                  <h3 className="text-base font-semibold mb-4">Удержание (Когорты)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="text-left font-medium text-white/40 pb-2 w-24">Когорта</th>
                          {[0, 1, 2, 3, 4].map(w => (
                            <th key={w} className="text-center font-medium text-white/40 pb-2 w-12">Неделя {w}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cohortData.map((row, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-white/80 font-medium">{row.date}</td>
                            {row.sizes.map((val, j) => {
                              if (val === 0) return <td key={j} className="p-0.5"><div className="h-6 rounded bg-white/5" /></td>;
                              const isFull = j === 0;
                              return (
                                <td key={j} className="p-0.5">
                                  <div
                                    className={\`h-6 rounded flex items-center justify-center font-mono text-[10px] \${isFull ? 'font-bold text-white' : 'text-emerald-50'}\`}
                                    style={{
                                      backgroundColor: isFull ? '#047857' : \`rgba(16,185,129,\${val / 100})\`
                                    }}
                                  >
                                    {val}%
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
