import React from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, LabelList
} from 'recharts';
import { 
  Activity, Users, Send, MousePointerClick, CheckCircle2, TrendingUp, Settings, 
  LayoutDashboard, Route, Mail, Target, Building2, LayoutTemplate
} from 'lucide-react';
import './_usability_hierarchy.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Аналитика', active: true },
  { icon: Route, label: 'Путь клиента' },
  { icon: Mail, label: 'Кампании' },
  { icon: Target, label: 'Аудитория' },
  { icon: Building2, label: 'Аккаунты' },
  { icon: LayoutTemplate, label: 'Шаблоны' },
  { icon: Settings, label: 'Настройки' },
];

const trendData = [
  { day: 'Пн', отправлено: 35000, открыто: 12000, клики: 4000 },
  { day: 'Вт', отправлено: 42000, открыто: 15000, клики: 5000 },
  { day: 'Ср', отправлено: 38000, открыто: 13000, клики: 4500 },
  { day: 'Чт', отправлено: 51000, открыто: 18000, клики: 6200 },
  { day: 'Пт', отправлено: 47210, открыто: 16500, клики: 5800 },
];

const hourlyData = [
  { hour: '08:00', sends: 1200 },
  { hour: '10:00', sends: 5000 },
  { hour: '12:00', sends: 8500 },
  { hour: '14:00', sends: 4200 },
  { hour: '16:00', sends: 6000 },
  { hour: '18:00', sends: 2100 },
];

const funnelData = [
  { stage: 'Отправлено', value: 1247839 },
  { stage: 'Доставлено', value: 1198000 },
  { stage: 'Открыто', value: 280000 },
  { stage: 'Клики', value: 52000 },
  { stage: 'Конверсия', value: 12400 },
];

const topCampaigns = [
  { name: 'Black Friday 2024', reach: '245,000', openRate: '28.4%', ctr: '6.2%', status: 'Активна', isActive: true },
  { name: 'Onboarding Sequence', reach: '12,400', openRate: '45.1%', ctr: '12.4%', status: 'Активна', isActive: true },
  { name: 'Q3 Newsletter', reach: '84,000', openRate: '19.2%', ctr: '3.1%', status: 'Завершена', isActive: false },
  { name: 'Win-back Campaign', reach: '34,200', openRate: '15.8%', ctr: '2.0%', status: 'Активна', isActive: true },
  { name: 'Product Update: AI', reach: '112,000', openRate: '31.5%', ctr: '8.7%', status: 'Завершена', isActive: false },
];

const activityFeed = [
  { time: 'Только что', event: 'Кампания "Black Friday 2024" достигла 50k открытий', color: '#10b981' },
  { time: '5 мин назад', event: 'Пользователь alex@example.com сконвертировался', color: '#3b82f6' },
  { time: '12 мин назад', event: 'Запущена A/B версия "Onboarding Sequence"', color: '#8b5cf6' },
  { time: '1 час назад', event: 'Импорт 12,000 контактов завершен', color: '#3b82f6' },
  { time: '2 часа назад', event: 'Сбой отправки: превышен лимит API (AWS SES)', color: '#ef4444' },
  { time: '3 часа назад', event: 'Автоматический отчет за неделю отправлен', color: '#64748b' },
];

export function UsabilityHierarchy() {
  return (
    <div className="theme-usability-hierarchy flex h-screen w-full overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar flex flex-col border-r border-subtle">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            RUProbe CRM
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item, i) => (
            <div 
              key={i} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium cursor-pointer ${
                item.active ? 'sidebar-nav-active' : 'sidebar-nav-inactive text-primary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-subtle mt-auto">
          <div className="flex items-center gap-3 sidebar-nav-inactive cursor-pointer px-4 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">ИВ</div>
            <div>
              <div className="text-sm font-medium text-primary">Иван Волков</div>
              <div className="text-xs text-secondary">admin@ruprobe.ru</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-body p-8 space-y-12">
        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Обзор аналитики</h2>
            <p className="text-secondary text-base">Сводные показатели по всем кампаниям</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/20 border border-blue-500/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-blue-400 font-medium">Live</span>
          </div>
        </header>

        {/* Tier 1 & Tier 2 KPIs */}
        <section className="grid grid-cols-6 gap-6">
          {/* Tier 1: Primary KPIs */}
          <div className="col-span-3 bg-card rounded-2xl p-8 border border-blue-500/30 tier1-glow flex flex-col justify-between">
            <div className="text-secondary text-lg font-medium mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" /> Всего отправлено
            </div>
            <div className="text-6xl font-bold text-white tracking-tighter">1,247,839</div>
          </div>
          <div className="col-span-3 bg-card rounded-2xl p-8 border border-blue-500/30 tier1-glow flex flex-col justify-between">
            <div className="text-secondary text-lg font-medium mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" /> Open Rate
            </div>
            <div className="text-6xl font-bold text-white tracking-tighter">23.4%</div>
          </div>

          {/* Tier 2: Secondary KPIs */}
          <div className="col-span-2 bg-card rounded-xl p-6 border border-subtle">
            <div className="text-secondary font-medium mb-2">Аудитория</div>
            <div className="text-3xl font-semibold text-white">94,210</div>
          </div>
          <div className="col-span-2 bg-card rounded-xl p-6 border border-subtle">
            <div className="text-secondary font-medium mb-2">Кампаний</div>
            <div className="text-3xl font-semibold text-white">47</div>
          </div>
          <div className="col-span-1 bg-card rounded-xl p-6 border border-subtle">
            <div className="text-secondary font-medium mb-2">CTR</div>
            <div className="text-3xl font-semibold text-white">4.2%</div>
          </div>
          <div className="col-span-1 bg-card rounded-xl p-6 border border-subtle">
            <div className="text-secondary font-medium mb-2">Активных</div>
            <div className="text-3xl font-semibold text-white">12</div>
          </div>
        </section>

        {/* Tier 2: Main Charts */}
        <div className="grid grid-cols-3 gap-8">
          <section className="col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">Динамика активности</h3>
            <div className="bg-card border border-subtle rounded-xl p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 40, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSends" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Area type="monotone" dataKey="отправлено" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSends)" />
                  <Area type="monotone" dataKey="открыто" stroke="#10b981" strokeWidth={2} fill="none" />
                  <Area type="monotone" dataKey="клики" stroke="#8b5cf6" strokeWidth={2} fill="none" />
                  
                  {/* Annotation for current data point */}
                  <ReferenceDot x="Пт" y={47210} r={6} fill="#3b82f6" stroke="#0d1117" strokeWidth={2} />
                  <text x="75%" y="15%" fill="#e2e8f0" fontSize="14" fontWeight="bold" textAnchor="middle" className="bg-body px-2">
                    Сегодня: 47,210 отправлено
                  </text>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="col-span-1 space-y-6">
            <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">Эффективность</h3>
            <div className="bg-card border border-subtle rounded-xl p-6 h-[400px] flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{name: 'Open', value: 23.4}, {name: 'Unopened', value: 76.6}]}
                    cx="50%" cy="50%" innerRadius={80} outerRadius={110}
                    dataKey="value" stroke="none"
                    startAngle={90} endAngle={-270}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#1f2937" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-4xl font-bold text-white">23.4%</div>
                <div className="text-sm text-secondary">Open Rate</div>
              </div>
            </div>
          </section>
        </div>

        {/* Tier 3: Supporting Details */}
        <div className="grid grid-cols-3 gap-8 tier3-opacity">
          
          <section className="col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">Топ кампаний</h3>
            <div className="bg-card border border-subtle rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-subtle bg-[#1a202c]">
                    <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Кампания</th>
                    <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Охват</th>
                    <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Open Rate</th>
                    <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">CTR</th>
                    <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {topCampaigns.map((camp, i) => (
                    <tr key={i} className={`hover:bg-[#1f2937] transition-colors ${camp.isActive ? 'font-bold text-white' : 'text-secondary'}`}>
                      <td className="p-4">{camp.name}</td>
                      <td className="p-4">{camp.reach}</td>
                      <td className="p-4">{camp.openRate}</td>
                      <td className="p-4">{camp.ctr}</td>
                      <td className="p-4 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${camp.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                        {camp.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="col-span-1 space-y-6">
            <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">Лента активности</h3>
            <div className="bg-card border border-subtle rounded-xl p-6 h-full">
              <div className="space-y-6">
                {activityFeed.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="text-sm text-primary mb-1">{item.event}</p>
                      <p className="text-xs text-tertiary">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
        
        {/* Further Details: Funnel & Cohort & Hourly */}
        <div className="grid grid-cols-3 gap-8 tier3-opacity">
          
          <section className="col-span-1 space-y-6">
             <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">Воронка</h3>
             <div className="bg-card border border-subtle rounded-xl p-6 flex flex-col gap-4">
                {funnelData.map((f, i) => {
                  const max = funnelData[0].value;
                  const percent = (f.value / max) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-secondary">{f.stage}</span>
                        <span className="text-primary">{f.value.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full bg-[#1f2937] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
             </div>
          </section>

          <section className="col-span-1 space-y-6">
             <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">По часам</h3>
             <div className="bg-card border border-subtle rounded-xl p-6 h-full">
               <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData}>
                    <XAxis dataKey="hour" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#161b22', borderColor: '#30363d'}} />
                    <Bar dataKey="sends" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
             </div>
          </section>

          <section className="col-span-1 space-y-6">
             <h3 className="text-sm font-bold text-secondary tracking-widest pl-4 section-divider uppercase">Когорты (Retention)</h3>
             <div className="bg-card border border-subtle rounded-xl p-4 overflow-x-auto text-xs">
                <table className="w-full text-center">
                  <thead>
                    <tr>
                      <th className="p-2 text-secondary text-left font-normal">Когорта</th>
                      <th className="p-2 text-secondary font-normal">W0</th>
                      <th className="p-2 text-secondary font-normal">W1</th>
                      <th className="p-2 text-secondary font-normal">W2</th>
                      <th className="p-2 text-secondary font-normal">W3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 text-left text-secondary border-b border-subtle">Окт 01</td>
                      <td className="p-2 bg-blue-500/80 text-white">100%</td>
                      <td className="p-2 bg-blue-500/60 text-white">45%</td>
                      <td className="p-2 bg-blue-500/40 text-white">28%</td>
                      <td className="p-2 bg-blue-500/20 text-white">12%</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-left text-secondary border-b border-subtle">Окт 08</td>
                      <td className="p-2 bg-blue-500/80 text-white">100%</td>
                      <td className="p-2 bg-blue-500/50 text-white">38%</td>
                      <td className="p-2 bg-blue-500/30 text-white">22%</td>
                      <td className="p-2 bg-gray-800 text-secondary">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-left text-secondary border-b border-subtle">Окт 15</td>
                      <td className="p-2 bg-blue-500/80 text-white">100%</td>
                      <td className="p-2 bg-blue-500/65 text-white">51%</td>
                      <td className="p-2 bg-gray-800 text-secondary">-</td>
                      <td className="p-2 bg-gray-800 text-secondary">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-left text-secondary border-b border-subtle">Окт 22</td>
                      <td className="p-2 bg-blue-500/80 text-white">100%</td>
                      <td className="p-2 bg-gray-800 text-secondary">-</td>
                      <td className="p-2 bg-gray-800 text-secondary">-</td>
                      <td className="p-2 bg-gray-800 text-secondary">-</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </section>

        </div>

      </main>
    </div>
  );
}
