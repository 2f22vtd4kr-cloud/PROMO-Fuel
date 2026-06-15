import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Route, 
  Megaphone, 
  Users, 
  Building2, 
  LayoutTemplate, 
  Settings, 
  Send, 
  MailOpen, 
  MousePointerClick, 
  Activity, 
  AlertCircle,
  Search,
  Bell,
  ChevronDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const trendData = [
  { name: '01:00', value: 1200 },
  { name: '02:00', value: 2100 },
  { name: '03:00', value: 800 },
  { name: '04:00', value: 1600 },
  { name: '05:00', value: 900 },
  { name: '06:00', value: 2400 },
  { name: '07:00', value: 3200 },
  { name: '08:00', value: 4800 },
  { name: '09:00', value: 8500 },
  { name: '10:00', value: 12400 },
  { name: '11:00', value: 15200 },
  { name: '12:00', value: 14800 },
  { name: '13:00', value: 16900 },
  { name: '14:00', value: 18500 },
];

const funnelData = [
  { name: 'Отправлено', value: 100, color: '#3b82f6' },
  { name: 'Доставлено', value: 98, color: '#10b981' },
  { name: 'Открыто', value: 23.4, color: '#f59e0b' },
  { name: 'Клики', value: 4.2, color: '#8b5cf6' },
];

const campaignsData = [
  { id: '1', name: 'Q4 B2B Enterprise Promo', status: 'Активна', sent: '145,200', openRate: '28.4%', ctr: '5.1%' },
  { id: '2', name: 'SaaS Onboarding Day 1', status: 'Активна', sent: '89,430', openRate: '42.1%', ctr: '8.4%' },
  { id: '3', name: 'Re-engagement Q3', status: 'Завершена', sent: '320,000', openRate: '12.8%', ctr: '1.2%' },
  { id: '4', name: 'Webinar Invites - Oct', status: 'Активна', sent: '45,100', openRate: '31.2%', ctr: '6.7%' },
  { id: '5', name: 'Newsletter #42', status: 'Пауза', sent: '210,500', openRate: '24.5%', ctr: '3.8%' },
];

const activityFeed = [
  { id: 1, text: 'Пользователь user@acme.ru кликнул по ссылке в "Q4 B2B Enterprise"', time: 'Только что' },
  { id: 2, text: 'Кампания "SaaS Onboarding Day 1" достигла 10,000 открытий', time: '2 мин назад' },
  { id: 3, text: 'Сбой доставки для 43 адресов в сегменте "Tech Leads"', time: '5 мин назад', error: true },
  { id: 4, text: 'Новый шаблон "Promo V2" успешно прошел модерацию', time: '12 мин назад' },
  { id: 5, text: 'A/B тест для "Newsletter #42" завершен. Победил Вариант B.', time: '24 мин назад' },
];

export function RefinedDepth() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0f1e] text-slate-300 font-sans selection:bg-[#3b82f6]/30">
      <style>{`
        .glass-sidebar {
          background: linear-gradient(180deg, rgba(30, 45, 74, 0.4) 0%, rgba(10, 15, 30, 0.8) 100%);
          backdrop-filter: blur(12px);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glow-card-blue {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px -5px rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .glow-card-emerald {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px -5px rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .glow-card-amber {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px -5px rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .glow-card-violet {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px -5px rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .panel-bg {
          background-color: #111827;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
        }
        .pulse-live {
          animation: pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .font-mono-numbers {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="glass-sidebar w-64 flex flex-col h-full z-10 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Activity size={18} className="text-white" />
            </div>
            RUProbe
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <NavItem icon={<BarChart3 size={18} />} label="Аналитика" active />
          <NavItem icon={<Route size={18} />} label="Путь клиента" />
          <NavItem icon={<Megaphone size={18} />} label="Кампании" />
          <NavItem icon={<Users size={18} />} label="Аудитория" />
          <NavItem icon={<Building2 size={18} />} label="Аккаунты" />
          <NavItem icon={<LayoutTemplate size={18} />} label="Шаблоны" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <NavItem icon={<Settings size={18} />} label="Настройки" />
          
          <div className="mt-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-white">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-slate-400 truncate">admin@ruprobe.ru</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#3b82f6]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#8b5cf6]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur z-10 shrink-0">
          <h1 className="text-xl font-semibold text-white tracking-wide">Обзор производительности</h1>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Поиск..." 
                className="bg-[#111827] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/50 transition-all w-64 placeholder:text-slate-500 font-mono-numbers"
              />
            </div>
            <button className="relative p-2 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#3b82f6] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 z-10">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard 
                title="ОТПРАВЛЕНО" 
                value="1,247,839" 
                change="+12.5%" 
                icon={<Send size={20} className="text-[#3b82f6]" />} 
                className="glow-card-blue bg-[#111827]"
                accentColor="text-[#3b82f6]"
              />
              <KpiCard 
                title="ОТКРЫВАЕМОСТЬ" 
                value="23.4%" 
                change="+2.1%" 
                icon={<MailOpen size={20} className="text-[#10b981]" />} 
                className="glow-card-emerald bg-[#111827]"
                accentColor="text-[#10b981]"
              />
              <KpiCard 
                title="КЛИКИ (CTR)" 
                value="4.2%" 
                change="-0.4%" 
                icon={<MousePointerClick size={20} className="text-[#f59e0b]" />} 
                className="glow-card-amber bg-[#111827]"
                accentColor="text-[#f59e0b]"
                negative
              />
              <KpiCard 
                title="АКТИВНЫЕ КАМПАНИИ" 
                value="847" 
                change="+12" 
                icon={<Activity size={20} className="text-[#8b5cf6]" />} 
                className="glow-card-violet bg-[#111827]"
                accentColor="text-[#8b5cf6]"
              />
              <KpiCard 
                title="ОТПИСКИ" 
                value="0.8%" 
                change="-0.1%" 
                icon={<AlertCircle size={20} className="text-[#ef4444]" />} 
                className="glow-card-emerald bg-[#111827]"
                accentColor="text-[#ef4444]"
              />
              <KpiCard 
                title="АУДИТОРИЯ" 
                value="3.2M" 
                change="+1.5%" 
                icon={<Users size={20} className="text-[#06b6d4]" />} 
                className="glow-card-blue bg-[#111827]"
                accentColor="text-[#06b6d4]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Chart */}
              <div className="lg:col-span-2 panel-bg rounded-xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Тенденция отправки</h2>
                    <div className="text-2xl font-bold text-white font-mono-numbers mt-1">
                      18,500 <span className="text-sm font-normal text-[#10b981]">+8.4% / час</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['24Ч', '7Д', '30Д'].map((range, i) => (
                      <button key={range} className={`px-3 py-1 text-xs font-bold rounded ${i === 0 ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-slate-500 hover:text-slate-300'}`}>
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => \`\${val/1000}k\`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0a0f1e', borderColor: 'rgba(59,130,246,0.3)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Feed */}
              <div className="panel-bg rounded-xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Live Активность</h2>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-live shadow-[0_0_8px_#10b981]"></span>
                    <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">Live</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {activityFeed.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start group">
                      <div className="mt-1">
                        {item.error ? (
                          <AlertCircle size={14} className="text-red-400" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-1.5 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm leading-relaxed \${item.error ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-300 transition-colors'}`}>
                          {item.text}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono-numbers mt-1 uppercase">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Funnel Chart */}
              <div className="panel-bg rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-6">Воронка конверсии</h2>
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelData}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                      barSize={24}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: 'rgba(255,255,255,0.02)'}}
                        contentStyle={{ backgroundColor: '#0a0f1e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Campaigns Table */}
              <div className="lg:col-span-2 panel-bg rounded-xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111827]">
                  <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Топ Кампании</h2>
                  <button className="text-xs font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                    Смотреть все →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#0a0f1e]/50 border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      <tr>
                        <th className="px-6 py-3">Название</th>
                        <th className="px-6 py-3">Статус</th>
                        <th className="px-6 py-3 text-right">Отправлено</th>
                        <th className="px-6 py-3 text-right">Открытия</th>
                        <th className="px-6 py-3 text-right">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {campaignsData.map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 font-medium text-slate-200">{campaign.name}</td>
                          <td className="px-6 py-4">
                            <span className={\`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                              \${campaign.status === 'Активна' ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 
                                campaign.status === 'Пауза' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20' : 
                                'bg-slate-800 text-slate-400 border border-slate-700'}\`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono-numbers text-slate-300">{campaign.sent}</td>
                          <td className="px-6 py-4 text-right font-mono-numbers text-slate-300">{campaign.openRate}</td>
                          <td className="px-6 py-4 text-right font-mono-numbers text-[#3b82f6] font-bold group-hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all">{campaign.ctr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={\`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
        \${active 
          ? 'bg-[#3b82f6]/10 text-white shadow-[inset_2px_0_0_#3b82f6]' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }
      \`}
    >
      <span className={\`\${active ? 'text-[#3b82f6]' : 'text-slate-500'}\`}>
        {icon}
      </span>
      {label}
    </a>
  );
}

function KpiCard({ title, value, change, icon, className, accentColor, negative = false }: any) {
  return (
    <div className={\`rounded-xl p-5 relative overflow-hidden \${className}\`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">{title}</h3>
        <div className="p-2 rounded-lg bg-[#0a0f1e] border border-white/5 shadow-inner">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-white font-mono-numbers tracking-tight">{value}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={\`text-xs font-bold px-1.5 py-0.5 rounded flex items-center \${negative ? 'bg-red-500/10 text-red-400' : 'bg-[#10b981]/10 text-[#10b981]'}\`}>
            {change}
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">vs прошлый месяц</span>
        </div>
      </div>
    </div>
  );
}
