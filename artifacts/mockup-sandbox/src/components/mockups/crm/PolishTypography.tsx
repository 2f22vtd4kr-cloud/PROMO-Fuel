import React from "react";
import { 
  BarChart3, 
  Users, 
  Megaphone, 
  MailOpen, 
  MousePointerClick, 
  Activity,
  LayoutDashboard,
  Route,
  Target,
  Settings,
  LayoutTemplate,
  Building2,
  TrendingUp,
  ArrowRight,
  Send,
  MoreHorizontal
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from "recharts";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Аналитика", active: true },
  { icon: Route, label: "Путь клиента" },
  { icon: Megaphone, label: "Кампании" },
  { icon: Users, label: "Аудитория" },
  { icon: Building2, label: "Аккаунты" },
  { icon: LayoutTemplate, label: "Шаблоны" },
  { icon: Settings, label: "Настройки" },
];

const TREND_DATA = [
  { name: "Пн", sent: 120000, opened: 45000, clicked: 12000 },
  { name: "Вт", sent: 180000, opened: 65000, clicked: 18000 },
  { name: "Ср", sent: 150000, opened: 58000, clicked: 15000 },
  { name: "Чт", sent: 210000, opened: 82000, clicked: 22000 },
  { name: "Пт", sent: 190000, opened: 74000, clicked: 19000 },
  { name: "Сб", sent: 90000, opened: 35000, clicked: 8000 },
  { name: "Вс", sent: 110000, opened: 41000, clicked: 9500 },
];

const HOURLY_DATA = Array.from({ length: 24 }).map((_, i) => ({
  hour: `${i}:00`,
  rate: Math.floor(Math.random() * 5000) + 1000
}));

const CAMPAIGNS = [
  { name: "Q3 Promo Blast", reach: 450200, openRate: 24.1, ctr: 4.8, status: "Active" },
  { name: "Onboarding Sequence", reach: 12450, openRate: 48.2, ctr: 12.4, status: "Active" },
  { name: "Re-engagement 2024", reach: 89000, openRate: 18.5, ctr: 2.1, status: "Paused" },
  { name: "Weekly Newsletter", reach: 210000, openRate: 22.4, ctr: 3.5, status: "Draft" },
  { name: "VIP Announcement", reach: 5400, openRate: 64.0, ctr: 28.5, status: "Active" },
];

const FEED = [
  { user: "alex_dev", action: "открыл письмо", campaign: "Q3 Promo Blast", time: "1 мин назад", color: "bg-blue-500" },
  { user: "maria_s", action: "перешел по ссылке", campaign: "Onboarding Sequence", time: "2 мин назад", color: "bg-emerald-500" },
  { user: "ivan_k", action: "отписался", campaign: "Weekly Newsletter", time: "5 мин назад", color: "bg-red-500" },
  { user: "anna_p", action: "открыл письмо", campaign: "Q3 Promo Blast", time: "12 мин назад", color: "bg-blue-500" },
  { user: "dmitry_v", action: "совершил покупку", campaign: "VIP Announcement", time: "18 мин назад", color: "bg-purple-500" },
  { user: "elena_m", action: "открыл письмо", campaign: "Onboarding Sequence", time: "22 мин назад", color: "bg-blue-500" },
];

const RETENTION = [
  { cohort: "Sep 01", sizes: ["100%", "45%", "32%", "28%"] },
  { cohort: "Sep 08", sizes: ["100%", "48%", "35%", "-"] },
  { cohort: "Sep 15", sizes: ["100%", "42%", "-", "-"] },
  { cohort: "Sep 22", sizes: ["100%", "-", "-", "-"] },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 border-b border-white/10 pb-2">
      <h2 className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
        {title}
      </h2>
    </div>
  );
}

export default function PolishTypography() {
  return (
    <div className="flex h-screen bg-[#0d1117] text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#161b22] border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center mr-3">
            <Activity size={18} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide text-white">RUProbe CRM</span>
        </div>
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.active 
                  ? "bg-blue-600/10 text-blue-500 font-medium" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium">
              AD
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-200">Admin User</div>
              <div className="text-xs text-slate-500">admin@ruprobe.ru</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-semibold text-white">Обзор аналитики</h1>
          <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live SSE</span>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[1400px] mx-auto space-y-8">
            
            {/* KPIs */}
            <section>
              <SectionHeader title="Ключевые показатели" />
              <div className="grid grid-cols-6 gap-4">
                {/* 7-digit number */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <Send size={16} className="text-blue-400" />
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">+8.3%</span>
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono tracking-tight text-white mb-1">1,247,839</div>
                    <div className="text-sm font-medium text-slate-300">Всего отправлено</div>
                    <div className="text-[11px] text-slate-500">за все время</div>
                  </div>
                </div>

                {/* 5-digit number */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <Users size={16} className="text-purple-400" />
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">+2.1%</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-white mb-1">94,210</div>
                    <div className="text-sm font-medium text-slate-300">Аудитория</div>
                    <div className="text-[11px] text-slate-500">уникальных контактов</div>
                  </div>
                </div>

                {/* 2-digit number */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <Megaphone size={16} className="text-amber-400" />
                    <span className="text-xs font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">0.0%</span>
                  </div>
                  <div>
                    <div className="text-4xl font-bold tabular-nums text-white mb-1">47</div>
                    <div className="text-sm font-medium text-slate-300">Кампаний</div>
                    <div className="text-[11px] text-slate-500">активных в этом месяце</div>
                  </div>
                </div>

                {/* Percentage */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <MailOpen size={16} className="text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">+1.2%</span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white mb-1">23.4<span className="text-xl text-slate-500">%</span></div>
                    <div className="text-sm font-medium text-slate-300">Open Rate</div>
                    <div className="text-[11px] text-slate-500">средний показатель</div>
                  </div>
                </div>

                {/* Percentage */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <MousePointerClick size={16} className="text-cyan-400" />
                    <span className="text-xs font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">−0.8%</span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white mb-1">4.2<span className="text-xl text-slate-500">%</span></div>
                    <div className="text-sm font-medium text-slate-300">CTR</div>
                    <div className="text-[11px] text-slate-500">клики к отправленным</div>
                  </div>
                </div>

                {/* 2-digit number */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <Activity size={16} className="text-rose-400" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold tabular-nums text-white mb-1">12</div>
                    <div className="text-sm font-medium text-slate-300">Активных</div>
                    <div className="text-[11px] text-slate-500">сейчас на сайте</div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeader title="Активность" />
              <div className="grid grid-cols-3 gap-4">
                {/* Area Chart */}
                <div className="col-span-2 bg-[#161b22] border border-white/5 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-base font-semibold text-white">Динамика вовлеченности</h3>
                      <p className="text-xs text-slate-500 mt-1">Отправки, открытия и клики за 7 дней</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium px-2 py-1 rounded-full flex items-center">
                      <TrendingUp size={12} className="mr-1" />
                      ↑ 8.3% за 7 дней
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={TREND_DATA} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                          labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                        <Area type="monotone" dataKey="opened" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut & Stats */}
                <div className="col-span-1 bg-[#161b22] border border-white/5 rounded-xl p-5 flex flex-col">
                  <div>
                    <h3 className="text-base font-semibold text-white">Эффективность</h3>
                    <p className="text-xs text-slate-500 mt-1">Конверсия рассылок</p>
                  </div>
                  <div className="flex-1 flex flex-col justify-center items-center mt-4">
                    <div className="h-40 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[{ value: 23.4 }, { value: 76.6 }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={75}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#1e293b" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-white tracking-tight">23.4<span className="text-lg text-slate-500">%</span></span>
                        <span className="text-[11px] text-slate-400">Open Rate</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full mt-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold font-mono text-white mb-0.5">4.2%</div>
                        <div className="text-[11px] text-slate-500">Click Rate</div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold font-mono text-white mb-0.5">12.1%</div>
                        <div className="text-[11px] text-slate-500">Bounce Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeader title="Кампании и воронка" />
              <div className="grid grid-cols-3 gap-4">
                {/* Table */}
                <div className="col-span-2 bg-[#161b22] border border-white/5 rounded-xl flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-white/5">
                    <h3 className="text-base font-semibold text-white">Последние кампании</h3>
                    <p className="text-xs text-slate-500 mt-1">Топ 5 по охвату за месяц</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-5 py-3 text-[11px] tracking-wider uppercase font-medium text-slate-500">Название</th>
                          <th className="px-5 py-3 text-[11px] tracking-wider uppercase font-medium text-slate-500">Охват</th>
                          <th className="px-5 py-3 text-[11px] tracking-wider uppercase font-medium text-slate-500">Open Rate</th>
                          <th className="px-5 py-3 text-[11px] tracking-wider uppercase font-medium text-slate-500">CTR</th>
                          <th className="px-5 py-3 text-[11px] tracking-wider uppercase font-medium text-slate-500">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CAMPAIGNS.map((c, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3 text-sm font-medium text-slate-200">{c.name}</td>
                            <td className="px-5 py-3 text-sm font-mono tabular-nums text-slate-300">{c.reach.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm font-mono tabular-nums text-slate-300">{c.openRate}%</td>
                            <td className="px-5 py-3 text-sm font-mono tabular-nums text-slate-300">{c.ctr}%</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                                c.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-slate-500/10 text-slate-400'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Funnel */}
                <div className="col-span-1 bg-[#161b22] border border-white/5 rounded-xl p-5">
                  <div className="mb-6">
                    <h3 className="text-base font-semibold text-white">Воронка конверсии</h3>
                    <p className="text-xs text-slate-500 mt-1">От отправки до целевого действия</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Отправлено", value: "1,247,839", pct: "100%", color: "bg-slate-600", width: "100%" },
                      { label: "Доставлено", value: "1,198,726", pct: "96%", color: "bg-blue-600", width: "96%" },
                      { label: "Открыто", value: "291,943", pct: "23%", color: "bg-emerald-500", width: "60%" },
                      { label: "Кликнули", value: "52,409", pct: "4%", color: "bg-amber-500", width: "25%" },
                      { label: "Конверсия", value: "18,763", pct: "1.5%", color: "bg-purple-500", width: "12%" },
                    ].map((step, i) => (
                      <div key={i} className="relative">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-sm font-medium text-slate-300">{step.label}</span>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-xs text-slate-500">{step.pct}</span>
                            <span className="text-sm font-mono tabular-nums font-bold text-white">{step.value}</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${step.color}`} style={{ width: step.width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeader title="События" />
              <div className="grid grid-cols-2 gap-4">
                {/* Live Feed */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-5">
                   <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-semibold text-white">Лента событий</h3>
                      <p className="text-xs text-slate-500 mt-1">Режиме реального времени</p>
                    </div>
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {FEED.map((item, i) => (
                      <div key={i} className="flex items-start">
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${item.color} mr-3 shrink-0`}></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-300">
                            <span className="font-medium text-white">{item.user}</span> {item.action} в кампании <span className="text-slate-400">{item.campaign}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cohorts */}
                <div className="bg-[#161b22] border border-white/5 rounded-xl p-5">
                   <div className="mb-6">
                    <h3 className="text-base font-semibold text-white">Retention</h3>
                    <p className="text-xs text-slate-500 mt-1">По неделям (сентябрь)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider w-20">Когорта</th>
                          {[0, 1, 2, 3].map(w => (
                            <th key={w} className="px-2 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider text-center">W{w}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {RETENTION.map((row, i) => (
                          <tr key={i}>
                            <td className="px-2 py-2 text-xs font-medium text-slate-400">{row.cohort}</td>
                            {row.sizes.map((val, j) => {
                              const pct = parseInt(val) || 0;
                              const bgOpacity = val === '-' ? 0 : Math.max(0.1, pct / 100);
                              return (
                                <td key={j} className="p-1">
                                  <div 
                                    className="h-8 rounded flex items-center justify-center text-xs font-mono"
                                    style={{ 
                                      backgroundColor: val === '-' ? 'transparent' : `rgba(59, 130, 246, ${bgOpacity * 0.5})`,
                                      color: val === '-' ? '#475569' : '#e2e8f0'
                                    }}
                                  >
                                    {val}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
            
          </div>
        </div>
      </div>
    </div>
  );
}
