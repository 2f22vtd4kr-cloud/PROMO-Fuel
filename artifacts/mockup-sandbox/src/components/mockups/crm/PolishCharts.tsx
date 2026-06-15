import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  Mail,
  PieChart as PieChartIcon,
  Settings,
  Users,
  Target
} from "lucide-react";

// --- Data ---
const areaData = [
  { name: "Пн", sent: 120000, opened: 45000, clicked: 12000 },
  { name: "Вт", sent: 180000, opened: 68000, clicked: 18000 },
  { name: "Ср", sent: 150000, opened: 55000, clicked: 14000 },
  { name: "Чт", sent: 210000, opened: 82000, clicked: 24000 },
  { name: "Пт", sent: 190000, opened: 71000, clicked: 19000 },
  { name: "Сб", sent: 90000,  opened: 30000, clicked: 8000 },
  { name: "Вс", sent: 110000, opened: 38000, clicked: 9500 },
];

const pieData = [
  { name: "Opened", value: 23.4, fill: "#10b981" },
  { name: "Unopened", value: 76.6, fill: "#1f2937" }
];

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  ok: Math.floor(Math.random() * 5000) + 1000,
  error: Math.floor(Math.random() * 200)
}));

const funnelData = [
  { stage: "Отправлено", value: 1247839, percentage: 100, color: "from-blue-600 to-blue-500", h: "h-8" },
  { stage: "Доставлено", value: 1198726, percentage: 96, color: "from-blue-500 to-teal-500", h: "h-7" },
  { stage: "Открыто", value: 291943, percentage: 23.4, color: "from-teal-500 to-emerald-500", h: "h-6" },
  { stage: "Кликнули", value: 52409, percentage: 4.2, color: "from-emerald-500 to-green-500", h: "h-5" },
  { stage: "Конверсия", value: 18763, percentage: 1.5, color: "from-green-500 to-green-400", h: "h-4" },
];

const campaigns = [
  { name: "Black Friday Promo", reach: "450k", open: "28.4%", ctr: "5.2%", status: "Активна" },
  { name: "Welcome Series A", reach: "12k", open: "45.1%", ctr: "12.4%", status: "Активна" },
  { name: "Inactive Reactivation", reach: "85k", open: "12.3%", ctr: "1.1%", status: "Завершена" },
  { name: "Weekly Newsletter", reach: "320k", open: "24.8%", ctr: "3.8%", status: "Пауза" },
  { name: "VIP Announcement", reach: "5k", open: "68.2%", ctr: "24.5%", status: "Активна" },
];

const activities = [
  { user: "alex_m", event: "Создал кампанию", target: "Holiday Special", time: "2 мин назад", color: "bg-blue-500" },
  { user: "system", event: "Завершена рассылка", target: "Weekly Digest", time: "15 мин назад", color: "bg-green-500" },
  { user: "maria_k", event: "Изменил шаблон", target: "Welcome Email", time: "1 час назад", color: "bg-amber-500" },
  { user: "system", event: "Ошибка доставки", target: "Bounce > 5%", time: "2 часа назад", color: "bg-red-500" },
  { user: "igor_v", event: "Экспорт аудитории", target: "VIP Users", time: "3 часа назад", color: "bg-purple-500" },
  { user: "system", event: "А/В тест завершен", target: "Subject Line Test", time: "5 часов назад", color: "bg-emerald-500" },
];

const cohortData = [
  { name: "Nov 1-7", size: 1420, weeks: [100, 42, 28, 15] },
  { name: "Nov 8-14", size: 1850, weeks: [100, 45, 31, 18] },
  { name: "Nov 15-21", size: 1200, weeks: [100, 38, 25, 0] },
  { name: "Nov 22-28", size: 2100, weeks: [100, 48, 0, 0] },
];

// --- Custom Components ---
const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-gray-800 rounded-lg shadow-xl p-3 text-sm">
        <div className="text-gray-400 mb-2">{label}</div>
        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-1 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300 capitalize w-20">{entry.name}:</span>
              <span className="text-white font-medium">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-gray-800 rounded-lg shadow-xl p-2 text-xs">
        <div className="text-gray-400 mb-1">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4 py-0.5">
            <span className="text-gray-300">{entry.name === 'ok' ? 'Успешно' : 'Ошибки'}</span>
            <span className="text-white font-medium">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PolishCharts() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 flex font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-gray-800/60 flex flex-col hidden md:flex shrink-0">
        <div className="p-5 border-b border-gray-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-wide">RUProbe CRM</span>
        </div>
        
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md bg-blue-500/10 text-blue-400 font-medium">
            <LayoutDashboard className="w-4 h-4" /> Аналитика
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <Target className="w-4 h-4" /> Путь клиента
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <Mail className="w-4 h-4" /> Кампании
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <Users className="w-4 h-4" /> Аудитория
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <BarChart3 className="w-4 h-4" /> Аккаунты
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <PieChartIcon className="w-4 h-4" /> Шаблоны
          </a>
        </nav>
        
        <div className="p-4 border-t border-gray-800/60">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <Settings className="w-4 h-4" /> Настройки
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-800/60 flex items-center justify-between px-6 shrink-0 bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-white">Обзор аналитики</h1>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-400">Live SSE</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#161b22] p-4 rounded-xl border border-gray-800/60">
                <div className="text-xs text-gray-400 mb-1">Всего отправлено</div>
                <div className="text-xl font-bold text-white">1,247,839</div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">↑ 8.3%</div>
              </div>
              <div className="bg-[#161b22] p-4 rounded-xl border border-gray-800/60">
                <div className="text-xs text-gray-400 mb-1">Аудитория</div>
                <div className="text-xl font-bold text-white">94,210</div>
                <div className="text-xs text-gray-500 mt-1">—</div>
              </div>
              <div className="bg-[#161b22] p-4 rounded-xl border border-gray-800/60">
                <div className="text-xs text-gray-400 mb-1">Кампаний</div>
                <div className="text-xl font-bold text-white">47</div>
                <div className="text-xs text-gray-500 mt-1">Активных 12</div>
              </div>
              <div className="bg-[#161b22] p-4 rounded-xl border border-gray-800/60">
                <div className="text-xs text-gray-400 mb-1">Open Rate</div>
                <div className="text-xl font-bold text-white">23.4%</div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">↑ 1.2%</div>
              </div>
              <div className="bg-[#161b22] p-4 rounded-xl border border-gray-800/60">
                <div className="text-xs text-gray-400 mb-1">CTR</div>
                <div className="text-xl font-bold text-white">4.2%</div>
                <div className="text-xs text-red-400 mt-1 flex items-center gap-1">↓ 0.8%</div>
              </div>
              <div className="bg-[#161b22] p-4 rounded-xl border border-gray-800/60">
                <div className="text-xs text-gray-400 mb-1">Активных</div>
                <div className="text-xl font-bold text-white">12</div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">↑ 2</div>
              </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Area Chart */}
              <div className="bg-[#161b22] p-5 rounded-xl border border-gray-800/60 lg:col-span-2 flex flex-col">
                <h2 className="text-sm font-medium text-white mb-6">Динамика (7 дней)</h2>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={areaData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <ReferenceLine y={50000} stroke="rgba(255,255,255,0.06)" />
                      <ReferenceLine y={100000} stroke="rgba(255,255,255,0.06)" />
                      <ReferenceLine y={150000} stroke="rgba(255,255,255,0.06)" />
                      <Area type="monotone" dataKey="sent" name="Отправлено" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} />
                      <Area type="monotone" dataKey="opened" name="Открыто" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} />
                      <Area type="monotone" dataKey="clicked" name="Клики" stroke="#f59e0b" strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-800/40">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                    <span className="text-xs text-gray-400">Отправлено</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                    <span className="text-xs text-gray-400">Открыто</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                    <span className="text-xs text-gray-400">Клики</span>
                  </div>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="bg-[#161b22] p-5 rounded-xl border border-gray-800/60 flex flex-col">
                <h2 className="text-sm font-medium text-white mb-2">Эффективность</h2>
                <div className="relative flex-1 flex items-center justify-center min-h-[180px]">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={78}
                        stroke="none"
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-white leading-none">23.4%</span>
                    <div className="w-8 h-px bg-gray-700 my-1"></div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Open Rate</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-[#0d1117] rounded-lg p-3 border-l-2 border-amber-500 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">CTR</span>
                    <span className="text-lg font-semibold text-white leading-none">4.2%</span>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3 border-l-2 border-red-500 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bounce</span>
                    <span className="text-lg font-semibold text-white leading-none">12.1%</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Funnel & Hourly Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Funnel */}
              <div className="bg-[#161b22] p-5 rounded-xl border border-gray-800/60">
                <h2 className="text-sm font-medium text-white mb-6">Воронка конверсии</h2>
                <div className="space-y-4">
                  {funnelData.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{item.stage}</span>
                        <span className="text-white font-medium">{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-[#0d1117] rounded-full overflow-hidden flex items-center">
                        <div 
                          className={`bg-gradient-to-r ${item.color} ${item.h} rounded-full flex items-center px-2 transition-all duration-500 ease-out`}
                          style={{ width: `${Math.max(item.percentage, 2)}%` }}
                        >
                          {item.percentage > 15 && (
                            <span className="text-[10px] font-bold text-white/90 drop-shadow-sm ml-auto">
                              {item.percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Activity */}
              <div className="bg-[#161b22] p-5 rounded-xl border border-gray-800/60">
                <h2 className="text-sm font-medium text-white mb-4">Отправка по часам</h2>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} interval={3} dy={5} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
                      <ReferenceLine y={2000} stroke="rgba(255,255,255,0.06)" />
                      <ReferenceLine y={4000} stroke="rgba(255,255,255,0.06)" />
                      <Bar dataKey="ok" stackId="a" fill="#3b82f6" barSize={12} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="error" stackId="b" fill="#ef4444" barSize={12} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] text-gray-400 uppercase">Успешно</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[10px] text-gray-400 uppercase">Ошибки</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Grid: Tables & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Campaigns Table */}
              <div className="bg-[#161b22] rounded-xl border border-gray-800/60 lg:col-span-2 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-800/60 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-white">Топ кампаний</h2>
                  <button className="text-xs text-blue-400 hover:text-blue-300">Смотреть все</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-[#0d1117]/50 border-b border-gray-800/60">
                      <tr>
                        <th className="px-4 py-3 font-medium">Кампания</th>
                        <th className="px-4 py-3 font-medium">Охват</th>
                        <th className="px-4 py-3 font-medium">Open Rate</th>
                        <th className="px-4 py-3 font-medium">CTR</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {campaigns.map((c, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-200">{c.name}</td>
                          <td className="px-4 py-3 text-gray-400">{c.reach}</td>
                          <td className="px-4 py-3 text-gray-400">{c.open}</td>
                          <td className="px-4 py-3 text-gray-400">{c.ctr}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium
                              ${c.status === 'Активна' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                c.status === 'Пауза' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-[#161b22] rounded-xl border border-gray-800/60 p-4 flex flex-col">
                <h2 className="text-sm font-medium text-white mb-4">Активность</h2>
                <div className="flex-1 space-y-4">
                  {activities.map((act, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="relative mt-1">
                        <div className={`w-2 h-2 rounded-full ${act.color} ring-4 ring-[#161b22] z-10 relative`}></div>
                        {i !== activities.length - 1 && (
                          <div className="absolute top-2 left-1/2 -ml-px w-px h-full bg-gray-800"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300">{act.user}</span>
                          <span className="text-[10px] text-gray-500">{act.time}</span>
                        </div>
                        <div className="text-sm text-white mt-0.5">{act.event}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{act.target}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Cohort Analysis */}
            <div className="bg-[#161b22] rounded-xl border border-gray-800/60 overflow-hidden">
              <div className="p-4 border-b border-gray-800/60">
                <h2 className="text-sm font-medium text-white">Когортный анализ (Удержание)</h2>
              </div>
              <div className="p-4 overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex text-xs text-gray-500 mb-2">
                    <div className="w-32">Когорта</div>
                    <div className="w-20 text-right pr-4">Размер</div>
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      <div className="text-center">Неделя 0</div>
                      <div className="text-center">Неделя 1</div>
                      <div className="text-center">Неделя 2</div>
                      <div className="text-center">Неделя 3</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {cohortData.map((cohort, i) => (
                      <div key={i} className="flex items-center text-sm">
                        <div className="w-32 text-gray-300 font-medium">{cohort.name}</div>
                        <div className="w-20 text-right pr-4 text-gray-400">{cohort.size}</div>
                        <div className="flex-1 grid grid-cols-4 gap-1">
                          {cohort.weeks.map((val, j) => (
                            <div 
                              key={j} 
                              className={`h-8 flex items-center justify-center rounded text-xs font-medium transition-colors
                                ${val === 0 ? 'bg-[#0d1117] text-transparent' : 
                                  val > 80 ? 'bg-blue-600 text-white' : 
                                  val > 40 ? 'bg-blue-600/60 text-white/90' : 
                                  val > 20 ? 'bg-blue-600/40 text-white/80' : 
                                  'bg-blue-600/20 text-white/60'}`}
                            >
                              {val > 0 ? `${val}%` : ''}
                            </div>
                          ))}
                        </div>
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
