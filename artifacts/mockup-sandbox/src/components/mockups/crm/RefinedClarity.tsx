import React from "react";
import { 
  BarChart, Activity, Users, Send, MailOpen, MousePointerClick, 
  Settings, LayoutTemplate, Building2, Map, CheckCircle2, 
  AlertCircle, XCircle, ChevronDown, Bell, Search,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import "./_clarity.css";

const trendData = [
  { name: "01 Мар", sent: 120000, opened: 45000, clicked: 12000 },
  { name: "02 Мар", sent: 145000, opened: 52000, clicked: 15000 },
  { name: "03 Мар", sent: 130000, opened: 48000, clicked: 13500 },
  { name: "04 Мар", sent: 180000, opened: 65000, clicked: 18000 },
  { name: "05 Мар", sent: 195000, opened: 71000, clicked: 21000 },
  { name: "06 Мар", sent: 210000, opened: 78000, clicked: 24000 },
  { name: "07 Мар", sent: 250000, opened: 92000, clicked: 28000 },
];

const funnelData = [
  { name: "Отправлено", value: 1247839, color: "#94a3b8" },
  { name: "Доставлено", value: 1198540, color: "#64748b" },
  { name: "Открыто", value: 291994, color: "#4f46e5" },
  { name: "Клики", value: 52409, color: "#16a34a" },
];

const campaigns = [
  { id: "CMP-001", name: "Весенняя распродажа B2B", status: "active", sent: "450,000", openRate: "24.5%", ctr: "4.8%" },
  { id: "CMP-002", name: "Обновление платформы v2.4", status: "completed", sent: "125,000", openRate: "38.2%", ctr: "8.1%" },
  { id: "CMP-003", name: "Реактивация спящих клиентов", status: "active", sent: "85,000", openRate: "18.4%", ctr: "2.1%" },
  { id: "CMP-004", name: "Приглашение на вебинар", status: "warning", sent: "32,000", openRate: "12.0%", ctr: "1.5%" },
  { id: "CMP-005", name: "Дайджест за Март", status: "draft", sent: "-", openRate: "-", ctr: "-" },
];

const activities = [
  { time: "14:32", event: "Кампания 'Весенняя распродажа B2B' достигла 50% отправки" },
  { time: "13:15", event: "Экспорт аудитории 'Активные пользователи' завершен" },
  { time: "11:45", event: "Алексей С. создал новый шаблон 'Welcome Email v3'" },
  { time: "10:30", event: "Автоматизация 'Onboarding' запущена для 142 новых аккаунтов" },
  { time: "09:12", event: "Ошибка доставки в кампании 'Тест А/Б': превышен лимит bounce rate" },
];

const statusConfig = {
  active: { color: "var(--rc-success)", bg: "var(--rc-success-light)" },
  completed: { color: "var(--rc-text-muted)", bg: "#f1f5f9" },
  warning: { color: "var(--rc-warning)", bg: "var(--rc-warning-light)" },
  draft: { color: "var(--rc-text-muted)", bg: "#f1f5f9" },
  error: { color: "var(--rc-error)", bg: "var(--rc-error-light)" },
};

export function RefinedClarity() {
  return (
    <div className="theme-refined-clarity flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-[#1e293b] font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-[#4f46e5] rounded-lg flex items-center justify-center text-white">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            RUProbe
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3 px-2">Главное меню</div>
          <nav>
            <a href="#" className="rc-sidebar-item active">
              <BarChart size={18} />
              Аналитика
            </a>
            <a href="#" className="rc-sidebar-item">
              <Map size={18} />
              Путь клиента
            </a>
            <a href="#" className="rc-sidebar-item">
              <Send size={18} />
              Кампании
            </a>
            <a href="#" className="rc-sidebar-item">
              <Users size={18} />
              Аудитория
            </a>
            <a href="#" className="rc-sidebar-item">
              <Building2 size={18} />
              Аккаунты
            </a>
          </nav>

          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mt-8 mb-3 px-2">Контент</div>
          <nav>
            <a href="#" className="rc-sidebar-item">
              <LayoutTemplate size={18} />
              Шаблоны
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-[#e2e8f0]">
          <a href="#" className="rc-sidebar-item">
            <Settings size={18} />
            Настройки
          </a>
          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm">
              ИП
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">Иван Петров</div>
              <div className="text-xs text-slate-500 truncate">Администратор</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-semibold text-[#1e293b]">Обзор аналитики</h1>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Поиск кампаний..." 
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
              />
            </div>
            
            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
              За последние 30 дней
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard title="Отправлено" value="1,247,839" trend="+12.5%" trendUp={true} icon={<Send size={18} className="text-slate-600" />} iconBg="bg-slate-100" />
              <KpiCard title="Открытий" value="291,994" trend="+4.2%" trendUp={true} icon={<MailOpen size={18} className="text-indigo-600" />} iconBg="bg-indigo-100" />
              <KpiCard title="Кликов" value="52,409" trend="-1.1%" trendUp={false} icon={<MousePointerClick size={18} className="text-blue-600" />} iconBg="bg-blue-100" />
              <KpiCard title="Открываемость" value="23.4%" trend="+0.8%" trendUp={true} icon={<PieChartIcon size={18} className="text-emerald-600" />} iconBg="bg-emerald-100" />
              <KpiCard title="CTR" value="4.2%" trend="+0.2%" trendUp={true} icon={<Activity size={18} className="text-amber-600" />} iconBg="bg-amber-100" />
              <KpiCard title="Активных кампаний" value="847" trend="+12" trendUp={true} icon={<Users size={18} className="text-purple-600" />} iconBg="bg-purple-100" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rc-card p-6 lg:col-span-2 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Динамика вовлеченности</h2>
                    <p className="text-sm text-slate-500 mt-1">Отправки, открытия и клики за период</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div><span className="text-slate-600">Отправлено</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div><span className="text-slate-600">Открытия</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-slate-600">Клики</span></div>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `${val / 1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#1e293b', fontSize: '13px', fontWeight: 500 }}
                        labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="sent" stroke="#cbd5e1" fill="transparent" strokeWidth={2} />
                      <Area type="monotone" dataKey="opened" stroke="#4f46e5" fill="url(#colorOpened)" strokeWidth={2} />
                      <Area type="monotone" dataKey="clicked" stroke="#10b981" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rc-card p-6 flex flex-col">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-slate-900">Воронка конверсии</h2>
                  <p className="text-sm text-slate-500 mt-1">Отправлено vs. Целевые действия</p>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="space-y-4">
                    {funnelData.map((item, i) => (
                      <div key={i} className="relative">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-slate-700">{item.name}</span>
                          <span className="text-slate-900 font-semibold">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${(item.value / funnelData[0].value) * 100}%`,
                              backgroundColor: item.color
                            }}
                          ></div>
                        </div>
                        {i > 0 && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 mt-6 mr-1">
                            {((item.value / funnelData[i-1].value) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Table */}
              <div className="rc-card lg:col-span-2 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
                  <h2 className="text-base font-semibold text-slate-900">Топ кампаний</h2>
                  <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">Все кампании &rarr;</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="rc-table w-full">
                    <thead>
                      <tr>
                        <th>Название кампании</th>
                        <th>Статус</th>
                        <th>Отправлено</th>
                        <th>Open Rate</th>
                        <th>CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((camp) => (
                        <tr key={camp.id}>
                          <td>
                            <div className="font-medium text-slate-900">{camp.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{camp.id}</div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2 text-sm capitalize">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig[camp.status as keyof typeof statusConfig]?.color || '#cbd5e1' }}></div>
                              <span className="text-slate-600">{camp.status}</span>
                            </div>
                          </td>
                          <td className="font-medium tabular-nums">{camp.sent}</td>
                          <td className="tabular-nums">{camp.openRate}</td>
                          <td className="tabular-nums">{camp.ctr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feed */}
              <div className="rc-card flex flex-col h-[400px]">
                <div className="p-5 border-b border-[#e2e8f0] bg-white sticky top-0">
                  <h2 className="text-base font-semibold text-slate-900">Лента активности</h2>
                </div>
                <div className="p-5 overflow-y-auto">
                  <div className="relative pl-3 border-l-2 border-slate-100 space-y-6">
                    {activities.map((act, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white"></div>
                        <div className="text-xs font-semibold text-slate-400 mb-1">{act.time}</div>
                        <div className="text-sm text-slate-700 leading-relaxed">{act.event}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ title, value, trend, trendUp, icon, iconBg }: any) {
  return (
    <div className="rc-card p-5">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
          {trend}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      </div>
    </div>
  );
}
