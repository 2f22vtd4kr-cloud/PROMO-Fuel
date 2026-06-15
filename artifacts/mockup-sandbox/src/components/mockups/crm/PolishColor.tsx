import React from "react";
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { 
  LayoutDashboard, Users, Send, Target, Settings, FileText, 
  Mail, MousePointerClick, Activity, ArrowUpRight, ArrowDownRight, Circle
} from "lucide-react";

// --- Theme Colors ---
const COLORS = {
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  bg: "#0d1117",
  card: "#161b22",
  border: "rgba(255,255,255,0.08)",
  text: "#e6edf3",
  muted: "#7d8590",
};

// --- Mock Data ---
const areaData = [
  { name: "Пн", sent: 150000, opened: 45000, clicks: 12000 },
  { name: "Вт", sent: 230000, opened: 68000, clicks: 18000 },
  { name: "Ср", sent: 180000, opened: 54000, clicks: 14000 },
  { name: "Чт", sent: 290000, opened: 89000, clicks: 22000 },
  { name: "Пт", sent: 210000, opened: 65000, clicks: 16000 },
  { name: "Сб", sent: 110000, opened: 35000, clicks: 9000 },
  { name: "Вс", sent: 90000, opened: 28000, clicks: 7000 },
];

const hourlyData = [
  { time: "08:00", sent: 12000, errors: 200 },
  { time: "10:00", sent: 45000, errors: 800 },
  { time: "12:00", sent: 89000, errors: 1200 },
  { time: "14:00", sent: 76000, errors: 900 },
  { time: "16:00", sent: 54000, errors: 600 },
  { time: "18:00", sent: 23000, errors: 300 },
];

const funnelData = [
  { stage: "Отправлено", value: 1247839, percentage: 100 },
  { stage: "Доставлено", value: 1198726, percentage: 96 },
  { stage: "Открыто", value: 291943, percentage: 23.4 },
  { stage: "Кликнули", value: 52409, percentage: 4.2 },
  { stage: "Конверсия", value: 18763, percentage: 1.5 },
];

const campaignsData = [
  { name: "Black Friday Promo", reach: "450K", open: "28.4%", ctr: "5.2%", status: "Активна" },
  { name: "Welcome Series V2", reach: "12K", open: "42.1%", ctr: "8.4%", status: "Активна" },
  { name: "Win-back Campaign", reach: "85K", open: "15.2%", ctr: "1.8%", status: "Пауза" },
  { name: "Weekly Newsletter", reach: "210K", open: "24.8%", ctr: "3.9%", status: "Активна" },
  { name: "Product Launch", reach: "180K", open: "31.5%", ctr: "6.1%", status: "Завершена" },
];

const activityFeed = [
  { user: "system", event: "Рассылка завершена", target: "Black Friday Promo", time: "2 мин назад", type: "success" },
  { user: "anna_m", event: "Запуск кампании", target: "Welcome Series V2", time: "15 мин назад", type: "info" },
  { user: "system", event: "Скачок отписок", target: "Weekly Newsletter", time: "1 час назад", type: "warning" },
  { user: "ivan_d", event: "Изменение шаблона", target: "Win-back Campaign", time: "2 часа назад", type: "info" },
  { user: "system", event: "Ошибка доставки", target: "150 контактов", time: "3 часа назад", type: "warning" },
];

const cohortData = [
  [100, 42, 38, 31, 24],
  [100, 45, 41, 35, 28],
  [100, 39, 34, 28, 22],
  [100, 48, 44, 39, 35]
];

const pieData = [
  { name: 'Opened', value: 23.4, color: COLORS.emerald },
  { name: 'Unopened', value: 76.6, color: COLORS.border },
];

// --- Components ---

const DeltaBadge = ({ value, positive }: { value: string; positive: boolean }) => (
  <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ml-2 ${
    positive ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
  }`}>
    {positive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
    {value}
  </span>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div 
    style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
    className={`rounded-xl border p-5 ${className}`}
  >
    {children}
  </div>
);

export default function PolishColor() {
  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.text }} className="min-h-screen flex font-sans">
      
      {/* Sidebar */}
      <div 
        style={{ backgroundColor: "#11151b", borderColor: COLORS.border }}
        className="w-64 flex-shrink-0 border-r flex flex-col"
      >
        <div className="h-16 flex items-center px-6 border-b" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: COLORS.blue }}>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span>RUProbe CRM</span>
          </div>
        </div>
        <div className="flex-1 py-4 px-3 space-y-1">
          {[
            { icon: LayoutDashboard, label: "Аналитика", active: true },
            { icon: Users, label: "Путь клиента" },
            { icon: Send, label: "Кампании" },
            { icon: Target, label: "Аудитория" },
            { icon: Mail, label: "Аккаунты" },
            { icon: FileText, label: "Шаблоны" },
            { icon: Settings, label: "Настройки" },
          ].map((item, i) => (
            <button
              key={i}
              style={item.active ? { backgroundColor: `${COLORS.blue}15`, color: COLORS.blue } : { color: COLORS.muted }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header 
          style={{ backgroundColor: COLORS.bg, borderColor: COLORS.border }}
          className="h-16 border-b flex items-center justify-between px-8 shrink-0 z-10"
        >
          <h1 className="text-xl font-semibold">Обзор аналитики</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${COLORS.emerald}15`, border: `1px solid ${COLORS.emerald}30` }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.emerald }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: COLORS.emerald }}></span>
              </span>
              <span className="text-xs font-medium" style={{ color: COLORS.emerald }}>Live SSE</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border" style={{ borderColor: COLORS.border }} />
          </div>
        </header>

        {/* Dashboard Scroll Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* KPI Row - 6 Cards */}
            <div className="grid grid-cols-6 gap-4">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: COLORS.muted }}>Всего отправлено</p>
                    <div className="mt-1 flex items-baseline">
                      <h3 className="text-2xl font-bold">1.24M</h3>
                      <DeltaBadge value="8.3%" positive={true} />
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.blue}15`, color: COLORS.blue }}>
                    <Send className="w-4 h-4" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: COLORS.muted }}>Аудитория</p>
                    <div className="mt-1 flex items-baseline">
                      <h3 className="text-2xl font-bold">94.2K</h3>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.blue}15`, color: COLORS.blue }}>
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: COLORS.muted }}>Кампаний</p>
                    <div className="mt-1 flex items-baseline">
                      <h3 className="text-2xl font-bold">47</h3>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.blue}15`, color: COLORS.blue }}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: COLORS.muted }}>Open Rate</p>
                    <div className="mt-1 flex items-baseline">
                      <h3 className="text-2xl font-bold">23.4%</h3>
                      <DeltaBadge value="1.2%" positive={true} />
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.emerald}15`, color: COLORS.emerald }}>
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: COLORS.muted }}>Активных</p>
                    <div className="mt-1 flex items-baseline">
                      <h3 className="text-2xl font-bold">12</h3>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.emerald}15`, color: COLORS.emerald }}>
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: COLORS.muted }}>CTR</p>
                    <div className="mt-1 flex items-baseline">
                      <h3 className="text-2xl font-bold">4.2%</h3>
                      <DeltaBadge value="0.8%" positive={false} />
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.amber}15`, color: COLORS.amber }}>
                    <MousePointerClick className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-4 gap-6">
              {/* Main Area Chart */}
              <Card className="col-span-2 flex flex-col min-h-[360px]">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Активность (7 дней)</h3>
                </div>
                <div className="flex-1 min-h-0 relative -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} dx={-10} tickFormatter={v => `${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: '8px', color: COLORS.text }}
                        itemStyle={{ color: COLORS.text }}
                      />
                      <Area type="monotone" dataKey="sent" name="Отправлено" stroke={COLORS.blue} strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                      <Area type="monotone" dataKey="opened" name="Открыто" stroke={COLORS.emerald} strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                      <Area type="monotone" dataKey="clicks" name="Клики" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="4 4" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Donut Chart */}
              <Card className="col-span-1 flex flex-col items-center">
                <div className="w-full mb-4">
                  <h3 className="text-sm font-semibold">Вовлеченность</h3>
                </div>
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold" style={{ color: COLORS.emerald }}>23.4%</span>
                    <span className="text-[10px] uppercase font-medium tracking-wider" style={{ color: COLORS.muted }}>Open Rate</span>
                  </div>
                </div>
                <div className="w-full mt-6 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-sm font-semibold" style={{ color: COLORS.amber }}>4.2%</div>
                    <div className="text-[10px] mt-1" style={{ color: COLORS.muted }}>CTR</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-sm font-semibold" style={{ color: COLORS.amber }}>12.1%</div>
                    <div className="text-[10px] mt-1" style={{ color: COLORS.muted }}>Bounce Rate</div>
                  </div>
                </div>
              </Card>

              {/* Conversion Funnel */}
              <Card className="col-span-1">
                <h3 className="text-sm font-semibold mb-6">Воронка</h3>
                <div className="space-y-4">
                  {funnelData.map((item, idx) => {
                    let barColor;
                    if (idx <= 1) barColor = COLORS.blue;
                    else if (idx <= 2) barColor = COLORS.emerald;
                    else barColor = COLORS.amber;

                    return (
                      <div key={idx} className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{item.stage}</span>
                          <span style={{ color: COLORS.muted }}>{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${COLORS.border}` }}>
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(item.percentage, 2)}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Row 3: Table & More */}
            <div className="grid grid-cols-3 gap-6">
              {/* Campaigns Table */}
              <Card className="col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Активные кампании</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase border-b" style={{ color: COLORS.muted, borderColor: COLORS.border }}>
                      <tr>
                        <th className="py-3 px-4 font-medium">Название</th>
                        <th className="py-3 px-4 font-medium text-right">Охват</th>
                        <th className="py-3 px-4 font-medium text-right">Open Rate</th>
                        <th className="py-3 px-4 font-medium text-right">CTR</th>
                        <th className="py-3 px-4 font-medium text-center">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: COLORS.border }}>
                      {campaignsData.map((campaign, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{campaign.name}</td>
                          <td className="py-3 px-4 text-right" style={{ color: COLORS.muted }}>{campaign.reach}</td>
                          <td className="py-3 px-4 text-right">{campaign.open}</td>
                          <td className="py-3 px-4 text-right">{campaign.ctr}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              campaign.status === 'Активна' 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : campaign.status === 'Пауза' 
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-white/10 text-slate-400'
                            }`}>
                              {campaign.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Cohort Heatmap */}
              <Card className="col-span-1">
                <h3 className="text-sm font-semibold mb-4">Retention когорт</h3>
                <div className="space-y-1">
                  <div className="flex gap-1 mb-2">
                    <div className="w-16 text-[10px] font-medium text-center" style={{ color: COLORS.muted }}>Когорта</div>
                    {[1, 2, 3, 4].map(w => (
                      <div key={w} className="flex-1 text-[10px] font-medium text-center" style={{ color: COLORS.muted }}>Нед {w}</div>
                    ))}
                  </div>
                  {cohortData.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1 h-8">
                      <div className="w-16 flex items-center justify-center text-[10px]" style={{ color: COLORS.muted }}>
                        Окт {rIdx + 1}
                      </div>
                      {row.map((val, cIdx) => {
                        const opacity = Math.max(0.1, val / 100);
                        return (
                          <div 
                            key={cIdx} 
                            className="flex-1 rounded flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: `rgba(16, 185, 129, ${opacity})` }}
                          >
                            {val}%
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Row 4: Feed & Hourly */}
            <div className="grid grid-cols-2 gap-6">
              {/* Hourly Rate */}
              <Card>
                <h3 className="text-sm font-semibold mb-4">Отправки по часам</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} dy={5} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: '8px', color: COLORS.text }}
                      />
                      <Bar dataKey="sent" name="Отправлено" stackId="a" fill={COLORS.blue} radius={[0, 0, 4, 4]} />
                      <Bar dataKey="errors" name="Ошибки" stackId="a" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Live Activity Feed */}
              <Card>
                <h3 className="text-sm font-semibold mb-4">Live лента</h3>
                <div className="space-y-4">
                  {activityFeed.map((activity, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="mt-1">
                        {activity.type === 'success' && <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />}
                        {activity.type === 'info' && <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />}
                        {activity.type === 'warning' && <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />}
                      </div>
                      <div>
                        <p>
                          <span className="font-medium text-white">{activity.user}</span>
                          <span style={{ color: COLORS.muted }}> — {activity.event}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: COLORS.text }}>{activity.target}</span>
                          <span className="text-[10px]" style={{ color: COLORS.muted }}>• {activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
