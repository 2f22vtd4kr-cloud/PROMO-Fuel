import React from "react";
import "./_affordances.css";
import {
  LayoutDashboard,
  Route,
  Megaphone,
  Users,
  Building2,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Download,
  RefreshCw,
  MoreVertical,
  Activity,
  ArrowRight,
  ChevronLeft
} from "lucide-react";
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

const trendData = [
  { date: "12 Мар", sent: 120000, opened: 45000, clicks: 12000 },
  { date: "13 Мар", sent: 135000, opened: 52000, clicks: 15000 },
  { date: "14 Мар", sent: 110000, opened: 41000, clicks: 10000 },
  { date: "15 Мар", sent: 160000, opened: 68000, clicks: 21000 },
  { date: "16 Мар", sent: 180000, opened: 75000, clicks: 25000 },
  { date: "17 Мар", sent: 140000, opened: 58000, clicks: 18000 },
  { date: "18 Мар", sent: 195000, opened: 82000, clicks: 29000 },
];

const donutData = [
  { name: "Opened", value: 23.4 },
  { name: "Unopened", value: 76.6 },
];

const hourlyData = [
  { hour: "08:00", value: 1200 },
  { hour: "10:00", value: 4500 },
  { hour: "12:00", value: 8900 },
  { hour: "14:00", value: 12400 },
  { hour: "16:00", value: 9200 },
  { hour: "18:00", value: 3100 },
];

const COLORS = ["#6366f1", "#374151"];

export function UsabilityAffordances() {
  return (
    <div className="affordances-theme h-screen w-full flex overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#374151] bg-[#111827] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#374151] justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded bg-[#6366f1] flex items-center justify-center text-white">
              RP
            </div>
            <span>RUProbe</span>
          </div>
          <button className="w-8 h-8 rounded border border-[#374151] flex items-center justify-center hover:bg-[#1f2937] transition-colors">
            <ChevronLeft size={16} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-4 mt-2 px-2">
            Меню
          </div>
          <a
            href="#"
            className="flex items-center justify-between px-3 py-2 rounded bg-[#1f2937] text-white font-bold relative group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6366f1] rounded-l"></div>
            <div className="flex items-center gap-3">
              <LayoutDashboard size={18} className="text-[#6366f1]" />
              Аналитика
            </div>
            <ChevronLeft size={16} className="text-[#6366f1]" />
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-[#9ca3af] hover:text-white hover:border-[#374151] border border-transparent transition-all group cursor-pointer"
            style={{ borderColor: "#374151" }} // simulating hover affordance on one item
          >
            <Route size={18} />
            Путь клиента
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-[#9ca3af] hover:text-white border border-transparent hover:border-[#374151] transition-all cursor-pointer"
          >
            <Megaphone size={18} />
            Кампании
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-[#9ca3af] hover:text-white border border-transparent hover:border-[#374151] transition-all cursor-pointer"
          >
            <Users size={18} />
            Аудитория
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-[#9ca3af] hover:text-white border border-transparent hover:border-[#374151] transition-all cursor-pointer"
          >
            <Building2 size={18} />
            Аккаунты
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-[#9ca3af] hover:text-white border border-transparent hover:border-[#374151] transition-all cursor-pointer"
          >
            <FileText size={18} />
            Шаблоны
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-[#9ca3af] hover:text-white border border-transparent hover:border-[#374151] transition-all cursor-pointer mt-8"
          >
            <Settings size={18} />
            Настройки
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#111827]">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">Обзор аналитики</h1>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1f2937] border border-[#374151] text-xs font-medium text-[#10b981]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                  </span>
                  Live
                </div>
              </div>
              <p className="text-[#9ca3af]">Сводные показатели по всем кампаниям</p>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-secondary">
                <RefreshCw size={16} />
                <span>Обновить</span>
              </button>
              <button className="btn-primary">
                <Download size={16} />
                <span>Экспорт данных</span>
              </button>
            </div>
          </header>

          {/* Controls above KPI */}
          <div className="flex justify-end">
            <button className="pill hover:border-[#6366f1] hover:text-[#6366f1] transition-colors">
              7 дней <ChevronDown size={14} />
            </button>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Всего отправлено", value: "1,247,839", trend: "+12.5%" },
              { label: "Аудитория", value: "94,210", trend: "+2.1%" },
              { label: "Кампаний", value: "47", trend: "+5" },
              { label: "Open Rate", value: "23.4%", trend: "+1.2%" },
              { label: "CTR", value: "4.2%", trend: "-0.4%", negative: true },
              { label: "Активных", value: "12", trend: "0" },
            ].map((kpi, i) => (
              <div key={i} className="card p-5 hover:border-[#4b5563] transition-colors cursor-pointer relative group">
                <div className="text-[#9ca3af] mb-1 font-medium">{kpi.label}</div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-white">{kpi.value}</div>
                  <div
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      kpi.negative
                        ? "bg-[#ef4444]/10 text-[#ef4444]"
                        : kpi.trend === "0"
                        ? "bg-[#374151] text-[#9ca3af]"
                        : "bg-[#10b981]/10 text-[#10b981]"
                    }`}
                  >
                    {kpi.trend}
                  </div>
                </div>
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={16} className="text-[#6366f1]" />
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-2 p-5 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Активность (7 дней)</h3>
                <div className="flex items-center gap-2">
                  <button className="pill active">7 дней</button>
                  <button className="pill">30 дней</button>
                  <button className="pill">90 дней</button>
                </div>
              </div>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#374151" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", borderRadius: "0.5rem" }}
                      itemStyle={{ color: "#f9fafb" }}
                    />
                    <Area type="monotone" dataKey="sent" stroke="#4b5563" fillOpacity={1} fill="url(#colorSent)" />
                    <Area type="monotone" dataKey="opened" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5 flex flex-col">
              <h3 className="font-semibold text-white mb-6">Open Rate</h3>
              <div className="flex-1 min-h-[200px] relative flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-white">23.4%</span>
                  <span className="text-xs text-[#9ca3af]">Средний</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Funnel */}
            <div className="card p-5">
              <h3 className="font-semibold text-white mb-6">Воронка конверсии</h3>
              <div className="space-y-4">
                {[
                  { label: "Sent", value: "1,247,839", pct: "100%", w: "100%" },
                  { label: "Delivered", value: "1,230,112", pct: "98.6%", w: "98%" },
                  { label: "Opened", value: "288,140", pct: "23.4%", w: "75%" },
                  { label: "Clicked", value: "52,410", pct: "4.2%", w: "45%" },
                  { label: "Converted", value: "12,180", pct: "0.9%", w: "20%" },
                ].map((stage, i) => (
                  <div key={i} className="relative group cursor-pointer">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9ca3af] font-medium group-hover:text-white transition-colors">{stage.label}</span>
                      <span className="text-white font-medium">{stage.value} ({stage.pct})</span>
                    </div>
                    <div className="h-2 w-full bg-[#374151] rounded-full overflow-hidden">
                      <div className="h-full bg-[#6366f1] rounded-full transition-all group-hover:bg-[#4f46e5]" style={{ width: stage.w }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Send Rate */}
            <div className="card p-5">
               <h3 className="font-semibold text-white mb-6">Отправки по часам</h3>
               <div className="h-[220px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151" }} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Campaigns */}
            <div className="card lg:col-span-2 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[#374151] flex justify-between items-center bg-[#1f2937]">
                <h3 className="font-semibold text-white">Топ кампании</h3>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary text-xs py-1.5">
                    <Filter size={14} /> Фильтр
                  </button>
                  <button className="btn-secondary text-xs py-1.5">
                    <ArrowUpDown size={14} /> Сортировка
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#374151] text-[#9ca3af] text-xs bg-[#111827]">
                      <th className="font-medium p-4 py-3">Кампания</th>
                      <th className="font-medium p-4 py-3">Охват</th>
                      <th className="font-medium p-4 py-3">Open Rate</th>
                      <th className="font-medium p-4 py-3">CTR</th>
                      <th className="font-medium p-4 py-3">Статус</th>
                      <th className="font-medium p-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Q3 B2B Webinar Promo", reach: "45,000", open: "28.4%", ctr: "5.1%", status: "Active" },
                      { name: "SaaS Onboarding Day 1", reach: "12,400", open: "42.1%", ctr: "8.4%", status: "Active", active: true },
                      { name: "Re-engagement Batch 4", reach: "89,000", open: "14.2%", ctr: "1.2%", status: "Paused" },
                      { name: "Product Update 2.4", reach: "112,000", open: "26.8%", ctr: "4.9%", status: "Completed" },
                      { name: "Weekly Digest W42", reach: "65,000", open: "22.1%", ctr: "3.8%", status: "Draft" },
                    ].map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[#374151] cursor-pointer group transition-colors relative ${
                          row.active ? "bg-[#374151]/40" : "hover:bg-[#374151]/20"
                        }`}
                      >
                        {row.active && <td className="absolute left-0 top-0 bottom-0 w-1 bg-[#6366f1]"></td>}
                        <td className="p-4 py-3 font-medium text-white">{row.name}</td>
                        <td className="p-4 py-3 text-[#9ca3af]">{row.reach}</td>
                        <td className="p-4 py-3 text-white">{row.open}</td>
                        <td className="p-4 py-3 text-white">{row.ctr}</td>
                        <td className="p-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              row.status === "Active"
                                ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                                : row.status === "Paused"
                                ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
                                : row.status === "Draft"
                                ? "bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20"
                                : "bg-[#374151] text-[#9ca3af] border border-[#4b5563]"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="p-4 py-3 text-right">
                          <button className="w-8 h-8 rounded border border-transparent group-hover:border-[#4b5563] group-hover:bg-[#1f2937] flex items-center justify-center text-[#9ca3af] transition-all">
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Feed */}
            <div className="card p-5 flex flex-col">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-semibold text-white flex items-center gap-2">
                   <Activity size={18} className="text-[#6366f1]" />
                   Live Лента
                 </h3>
                 <button className="p-1 rounded hover:bg-[#374151] border border-transparent hover:border-[#4b5563] text-[#9ca3af]">
                   <MoreVertical size={16} />
                 </button>
               </div>
               <div className="space-y-4 flex-1">
                 {[
                   { user: "alex@company.ru", action: "opened email", campaign: "Q3 B2B...", time: "Только что", color: "#6366f1" },
                   { user: "m.ivanov@tech.ru", action: "clicked link", campaign: "Product Update...", time: "2 мин назад", color: "#10b981" },
                   { user: "sales@startup.io", action: "unsubscribed", campaign: "Weekly Digest...", time: "5 мин назад", color: "#ef4444" },
                   { user: "k.smirnov@ent.ru", action: "opened email", campaign: "Q3 B2B...", time: "12 мин назад", color: "#6366f1" },
                   { user: "info@agency.ru", action: "bounced", campaign: "Re-engagement...", time: "18 мин назад", color: "#f59e0b" },
                   { user: "d.popov@retail.ru", action: "clicked link", campaign: "Product Update...", time: "22 мин назад", color: "#10b981" },
                 ].map((event, i) => (
                   <div key={i} className="flex gap-3 text-sm group cursor-pointer p-2 -mx-2 rounded hover:bg-[#374151]/30 border border-transparent hover:border-[#374151]/50 transition-colors">
                     <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: event.color }}></div>
                     <div className="flex-1">
                       <div className="text-white font-medium">{event.user}</div>
                       <div className="text-[#9ca3af] text-xs">{event.action} <span className="text-[#6366f1]">{event.campaign}</span></div>
                     </div>
                     <div className="text-right flex flex-col items-end justify-between">
                       <div className="text-xs text-[#9ca3af] whitespace-nowrap">{event.time}</div>
                       <div className="text-xs text-[#6366f1] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Подробнее ›</div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Cohort Analysis */}
          <div className="card p-5">
             <h3 className="font-semibold text-white mb-6">Удержание (Когорты)</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-3 font-medium text-[#9ca3af] border-b border-[#374151]">Когорта</th>
                      <th className="p-3 font-medium text-[#9ca3af] border-b border-[#374151]">Размер</th>
                      <th className="p-3 font-medium text-[#9ca3af] border-b border-[#374151]">Неделя 0</th>
                      <th className="p-3 font-medium text-[#9ca3af] border-b border-[#374151]">Неделя 1</th>
                      <th className="p-3 font-medium text-[#9ca3af] border-b border-[#374151]">Неделя 2</th>
                      <th className="p-3 font-medium text-[#9ca3af] border-b border-[#374151]">Неделя 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cohort: "Jan 1 - Jan 7", size: "1,200", w0: 100, w1: 45, w2: 32, w3: 24 },
                      { cohort: "Jan 8 - Jan 14", size: "1,450", w0: 100, w1: 48, w2: 35, w3: 21 },
                      { cohort: "Jan 15 - Jan 21", size: "1,100", w0: 100, w1: 42, w2: 28, w3: null },
                      { cohort: "Jan 22 - Jan 28", size: "1,600", w0: 100, w1: 52, w2: null, w3: null },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-[#374151]/50 group cursor-pointer hover:bg-[#374151]/20">
                        <td className="p-3 text-white font-medium group-hover:text-[#6366f1] transition-colors">{row.cohort}</td>
                        <td className="p-3 text-[#9ca3af]">{row.size}</td>
                        <td className="p-3"><div className="bg-[#6366f1] text-white p-2 rounded text-center" style={{ opacity: row.w0 / 100 }}>{row.w0}%</div></td>
                        <td className="p-3">{row.w1 && <div className="bg-[#6366f1] text-white p-2 rounded text-center" style={{ opacity: Math.max(0.2, row.w1 / 100) }}>{row.w1}%</div>}</td>
                        <td className="p-3">{row.w2 && <div className="bg-[#6366f1] text-white p-2 rounded text-center" style={{ opacity: Math.max(0.2, row.w2 / 100) }}>{row.w2}%</div>}</td>
                        <td className="p-3">{row.w3 && <div className="bg-[#6366f1] text-white p-2 rounded text-center" style={{ opacity: Math.max(0.2, row.w3 / 100) }}>{row.w3}%</div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
