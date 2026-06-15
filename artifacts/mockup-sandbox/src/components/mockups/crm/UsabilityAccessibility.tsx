import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Legend, PieChart, Pie, Cell, Label
} from "recharts";
import { 
  LayoutDashboard, 
  Map, 
  Megaphone, 
  Users, 
  Briefcase, 
  FileText, 
  Settings,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
  Circle,
  Mail,
  Eye,
  MousePointerClick,
  Send,
  UserCheck
} from "lucide-react";
import "./_usability_accessibility.css";

// Data
const activityData = [
  { date: "01 Мар", sent: 150000, opened: 45000, clicked: 12000 },
  { date: "02 Мар", sent: 180000, opened: 54000, clicked: 15000 },
  { date: "03 Мар", sent: 160000, opened: 48000, clicked: 13000 },
  { date: "04 Мар", sent: 210000, opened: 65000, clicked: 18000 },
  { date: "05 Мар", sent: 190000, opened: 58000, clicked: 16000 },
  { date: "06 Мар", sent: 230000, opened: 72000, clicked: 21000 },
  { date: "07 Мар", sent: 250000, opened: 78000, clicked: 23000 },
];

const funnelData = [
  { stage: "Отправлено", count: 1247839, fill: "#1d4ed8" },
  { stage: "Доставлено", count: 1210403, fill: "#2563eb" },
  { stage: "Открыто", count: 283234, fill: "#3b82f6" },
  { stage: "Клики", count: 52409, fill: "#60a5fa" },
  { stage: "Конверсии", count: 12450, fill: "#93c5fd" },
];

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  rate: Math.floor(Math.random() * 5000) + 1000,
}));

const campaignsData = [
  { id: 1, name: "Весенняя распродажа B2B", reach: 45000, openRate: "28.4%", ctr: "5.2%", status: "active" },
  { id: 2, name: "Анонс нового API", reach: 12500, openRate: "42.1%", ctr: "12.4%", status: "completed" },
  { id: 3, name: "Реактивация спящих", reach: 85000, openRate: "15.2%", ctr: "1.8%", status: "active" },
  { id: 4, name: "Дайджест Март 2024", reach: 32000, openRate: "31.5%", ctr: "6.1%", status: "draft" },
  { id: 5, name: "Приглашение на вебинар", reach: 18000, openRate: "35.8%", ctr: "8.9%", status: "error" },
];

const feedEvents = [
  { id: 1, time: "14:23", text: "Кампания 'Весенняя распродажа' завершила рассылку", type: "success" },
  { id: 2, time: "14:15", text: "Аудитория 'IT Директора' обновлена (+240 контактов)", type: "info" },
  { id: 3, time: "13:45", text: "Ошибка доставки в домене mail.ru (Spam block)", type: "error" },
  { id: 4, time: "12:30", text: "Пользователь admin экспортировал отчет", type: "info" },
  { id: 5, time: "11:10", text: "Создан новый шаблон 'Приветственное письмо'", type: "info" },
  { id: 6, time: "10:05", text: "Автоматизация 'Брошенная корзина' активирована", type: "success" },
];

const cohortData = [
  { cohort: "01-07 Мар", size: 1240, w0: 100, w1: 45, w2: 32, w3: 28 },
  { cohort: "08-14 Мар", size: 1560, w0: 100, w1: 48, w2: 35, w3: null },
  { cohort: "15-21 Мар", size: 1120, w0: 100, w1: 42, w2: null, w3: null },
  { cohort: "22-28 Мар", size: 1890, w0: 100, w1: null, w2: null, w3: null },
];

export function UsabilityAccessibility() {
  return (
    <div className="usability-accessibility-theme flex h-screen w-full bg-[#f9fafb] text-[#111827] overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#d1d5db] flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-[#d1d5db]">
          <h1 className="text-xl font-bold flex items-center gap-3">
            <Activity className="w-6 h-6 text-[#1d4ed8]" />
            RUProbe CRM
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <span className="text-xs font-bold text-[#374151] uppercase tracking-wider">Главное</span>
          </div>
          <nav className="space-y-1 px-2 mb-8">
            <NavItem icon={LayoutDashboard} label="Аналитика" active />
            <NavItem icon={Map} label="Путь клиента" />
            <NavItem icon={Megaphone} label="Кампании" />
            <NavItem icon={Users} label="Аудитория" />
            <NavItem icon={Briefcase} label="Аккаунты" />
          </nav>
          
          <div className="px-4 mb-2">
            <span className="text-xs font-bold text-[#374151] uppercase tracking-wider">Инструменты</span>
          </div>
          <nav className="space-y-1 px-2">
            <NavItem icon={FileText} label="Шаблоны" />
            <NavItem icon={Settings} label="Настройки" />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="mb-8 flex justify-between items-end border-b border-[#d1d5db] pb-4">
          <div>
            <h2 className="text-3xl font-bold text-[#111827] mb-2">Обзор аналитики</h2>
            <p className="text-[#374151] text-base">Сводные показатели по всем кампаниям</p>
          </div>
          <div className="flex items-center gap-2 bg-[#dcfce7] text-[#166534] px-4 py-2 rounded-md border border-[#bbf7d0] font-medium">
            <Circle className="w-3 h-3 fill-current" />
            <span>Система работает нормально (Live)</span>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <KpiCard 
            title="Всего отправлено" 
            value="1,247,839" 
            delta="+12.3%" 
            deltaType="positive" 
            icon={Send} 
            subtitle="Сравнение с прошлым месяцем"
          />
          <KpiCard 
            title="Аудитория" 
            value="94,210" 
            delta="+4.1%" 
            deltaType="positive" 
            icon={Users} 
            subtitle="Активных контактов"
          />
          <KpiCard 
            title="Кампаний" 
            value="47" 
            delta="-2.0%" 
            deltaType="negative" 
            icon={Megaphone} 
            subtitle="Запущено за 30 дней"
          />
          <KpiCard 
            title="Open Rate" 
            value="23.4%" 
            delta="+1.2%" 
            deltaType="positive" 
            icon={Mail} 
            subtitle="Средний показатель"
          />
          <KpiCard 
            title="CTR" 
            value="4.2%" 
            delta="-0.5%" 
            deltaType="negative" 
            icon={MousePointerClick} 
            subtitle="Переходы по ссылкам"
          />
          <KpiCard 
            title="Активных" 
            value="12" 
            delta="0%" 
            deltaType="neutral" 
            icon={Activity} 
            subtitle="Текущие рассылки"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#d1d5db] p-6">
            <h3 className="text-xl font-bold mb-6 text-[#111827]">Активность (последние 7 дней)</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} 
                    axisLine={{ stroke: '#d1d5db' }}
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} 
                    axisLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `${value / 1000}k`}
                    tickMargin={10}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827', borderRadius: '4px', fontWeight: 500, fontSize: '14px' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontWeight: 600, fontSize: '14px' }}
                  />
                  <Area type="monotone" name="Отправлено" dataKey="sent" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.1} strokeWidth={3} />
                  <Area type="monotone" name="Открыто" dataKey="opened" stroke="#047857" fill="#047857" fillOpacity={0.1} strokeWidth={3} />
                  <Area type="monotone" name="Клики" dataKey="clicked" stroke="#b45309" fill="#b45309" fillOpacity={0.1} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut */}
          <div className="bg-white rounded-lg border border-[#d1d5db] p-6 flex flex-col">
            <h3 className="text-xl font-bold mb-2 text-[#111827]">Open Rate</h3>
            <p className="text-[#374151] mb-6">Доля открытых писем от доставленных</p>
            <div className="flex-1 relative min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ name: "Открыто", value: 23.4 }, { name: "Не открыто", value: 76.6 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    <Cell fill="#1d4ed8" />
                    <Cell fill="#e5e7eb" />
                    <Label
                      content={({ viewBox }) => {
                        const { cx, cy } = viewBox as any;
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                            <tspan x={cx} y={cy - 10} className="text-3xl font-bold fill-[#111827]">23.4%</tspan>
                            <tspan x={cx} y={cy + 20} className="text-sm font-medium fill-[#374151]">Открыто</tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-6 text-[14px] font-medium">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#1d4ed8] rounded-sm"></div> <span className="text-[#111827]">Открыто (23.4%)</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#e5e7eb] rounded-sm border border-[#d1d5db]"></div> <span className="text-[#111827]">Не открыто (76.6%)</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Funnel */}
          <div className="bg-white rounded-lg border border-[#d1d5db] p-6">
            <h3 className="text-xl font-bold mb-6 text-[#111827]">Воронка конверсии</h3>
            <div className="space-y-4">
              {funnelData.map((stage, i) => {
                const max = funnelData[0].count;
                const percentOfMax = (stage.count / max) * 100;
                const prev = i > 0 ? funnelData[i-1].count : max;
                const percentOfPrev = i > 0 ? ((stage.count / prev) * 100).toFixed(1) : "100";
                
                return (
                  <div key={stage.stage} className="flex items-center gap-4 group">
                    <div className="w-32 text-right font-semibold text-[#111827] text-sm shrink-0">{stage.stage}</div>
                    <div className="flex-1 bg-[#f3f4f6] h-12 rounded-md overflow-hidden relative border border-[#e5e7eb]">
                      <div 
                        className="h-full flex items-center px-4"
                        style={{ width: `${Math.max(percentOfMax, 5)}%`, backgroundColor: stage.fill }}
                      >
                        <span className="text-white font-bold text-sm z-10 whitespace-nowrap">
                          {stage.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 text-right font-bold text-[#374151] text-sm shrink-0">
                      {i === 0 ? "100%" : `${percentOfPrev}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hourly */}
          <div className="bg-white rounded-lg border border-[#d1d5db] p-6">
            <h3 className="text-xl font-bold mb-6 text-[#111827]">Интенсивность отправки (24ч)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} 
                    axisLine={{ stroke: '#d1d5db' }}
                    interval={3}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827', fontWeight: 600 }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="rate" fill="#1d4ed8" radius={[2, 2, 0, 0]} name="Отправок/час" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Table */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#d1d5db] p-6 overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold mb-6 text-[#111827]">Топ кампаний</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#d1d5db]">
                    <th className="py-3 px-4 text-[#374151] font-bold text-sm bg-[#f9fafb]">Кампания</th>
                    <th className="py-3 px-4 text-[#374151] font-bold text-sm bg-[#f9fafb]">Охват</th>
                    <th className="py-3 px-4 text-[#374151] font-bold text-sm bg-[#f9fafb]">Open Rate</th>
                    <th className="py-3 px-4 text-[#374151] font-bold text-sm bg-[#f9fafb]">CTR</th>
                    <th className="py-3 px-4 text-[#374151] font-bold text-sm bg-[#f9fafb]">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignsData.map((row) => (
                    <tr key={row.id} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
                      <td className="py-4 px-4 font-bold text-[#111827]">{row.name}</td>
                      <td className="py-4 px-4 font-medium text-[#374151]">{row.reach.toLocaleString()}</td>
                      <td className="py-4 px-4 font-medium text-[#374151]">{row.openRate}</td>
                      <td className="py-4 px-4 font-medium text-[#374151]">{row.ctr}</td>
                      <td className="py-4 px-4">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feed */}
          <div className="bg-white rounded-lg border border-[#d1d5db] p-6">
            <h3 className="text-xl font-bold mb-6 text-[#111827]">Лента активности</h3>
            <div className="space-y-6">
              {feedEvents.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    {event.type === 'success' && <CheckCircle className="w-6 h-6 text-[#047857]" />}
                    {event.type === 'error' && <XCircle className="w-6 h-6 text-[#b45309]" />}
                    {event.type === 'info' && <AlertCircle className="w-6 h-6 text-[#1d4ed8]" />}
                    <div className="w-px h-full bg-[#d1d5db] mt-2"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-[#374151] mb-1">{event.time}</p>
                    <p className="text-base text-[#111827] font-medium leading-tight">{event.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cohorts */}
        <div className="bg-white rounded-lg border border-[#d1d5db] p-6 mb-8">
          <h3 className="text-xl font-bold mb-6 text-[#111827]">Удержание (Когорты)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-left font-bold text-[#374151] bg-[#f9fafb] border-b-2 border-[#d1d5db]">Когорта</th>
                  <th className="py-3 px-4 text-right font-bold text-[#374151] bg-[#f9fafb] border-b-2 border-[#d1d5db]">Размер</th>
                  <th className="py-3 px-4 text-center font-bold text-[#374151] bg-[#f9fafb] border-b-2 border-[#d1d5db]">Неделя 0</th>
                  <th className="py-3 px-4 text-center font-bold text-[#374151] bg-[#f9fafb] border-b-2 border-[#d1d5db]">Неделя 1</th>
                  <th className="py-3 px-4 text-center font-bold text-[#374151] bg-[#f9fafb] border-b-2 border-[#d1d5db]">Неделя 2</th>
                  <th className="py-3 px-4 text-center font-bold text-[#374151] bg-[#f9fafb] border-b-2 border-[#d1d5db]">Неделя 3</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row) => (
                  <tr key={row.cohort} className="border-b border-[#e5e7eb]">
                    <td className="py-4 px-4 font-bold text-[#111827]">{row.cohort}</td>
                    <td className="py-4 px-4 text-right font-medium text-[#374151]">{row.size}</td>
                    <CohortCell value={row.w0} />
                    <CohortCell value={row.w1} />
                    <CohortCell value={row.w2} />
                    <CohortCell value={row.w3} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

// Subcomponents

function NavItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`
        flex items-center gap-3 px-4 min-h-[48px] rounded-md transition-colors text-[15px]
        ${active 
          ? "bg-[#eff6ff] text-[#1d4ed8] font-bold border-l-4 border-[#1d4ed8]" 
          : "text-[#111827] font-medium hover:bg-[#f3f4f6] hover:text-[#111827] border-l-4 border-transparent"}
      `}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={`w-5 h-5 ${active ? "text-[#1d4ed8]" : "text-[#374151]"}`} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

function KpiCard({ title, value, delta, deltaType, icon: Icon, subtitle }: any) {
  const isPositive = deltaType === 'positive';
  const isNegative = deltaType === 'negative';
  
  return (
    <div className="bg-white p-6 rounded-lg border border-[#d1d5db] shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[#374151] font-bold text-base mb-1">{title}</h3>
          <p className="text-3xl font-extrabold text-[#111827] tracking-tight">{value}</p>
        </div>
        <div className="p-3 bg-[#f3f4f6] rounded-md border border-[#e5e7eb]">
          <Icon className="w-6 h-6 text-[#1d4ed8]" />
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 pt-4 border-t border-[#f3f4f6]">
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded font-bold text-sm border
          ${isPositive ? "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]" : 
            isNegative ? "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]" : 
            "bg-[#f3f4f6] text-[#374151] border-[#d1d5db]"}
        `}>
          {isPositive && <TrendingUp className="w-4 h-4" aria-hidden="true" />}
          {isNegative && <TrendingDown className="w-4 h-4" aria-hidden="true" />}
          <span>{delta}</span>
        </div>
        <span className="text-[#374151] text-sm font-medium">{subtitle}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#dcfce7] text-[#166534] px-3 py-1.5 rounded-md font-bold text-sm border border-[#bbf7d0]">
        <CheckCircle className="w-4 h-4" />
        Активна
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#f3f4f6] text-[#374151] px-3 py-1.5 rounded-md font-bold text-sm border border-[#d1d5db]">
        <CheckCircle className="w-4 h-4 text-[#4b5563]" />
        Завершена
      </span>
    );
  }
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#fef3c7] text-[#92400e] px-3 py-1.5 rounded-md font-bold text-sm border border-[#fde68a]">
        <FileText className="w-4 h-4" />
        Черновик
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#fee2e2] text-[#991b1b] px-3 py-1.5 rounded-md font-bold text-sm border border-[#fecaca]">
        <AlertCircle className="w-4 h-4" />
        Ошибка
      </span>
    );
  }
  return null;
}

function CohortCell({ value }: { value: number | null }) {
  if (value === null) {
    return <td className="py-4 px-4 text-center bg-[#f9fafb] text-[#9ca3af] font-medium border border-[#e5e7eb]">-</td>;
  }
  
  // High contrast background colors for cohort mapping
  let bgColor = "#ffffff";
  let textColor = "#111827";
  let borderColor = "#e5e7eb";
  
  if (value === 100) {
    bgColor = "#1e3a8a"; // Dark blue
    textColor = "#ffffff";
    borderColor = "#1e3a8a";
  } else if (value >= 45) {
    bgColor = "#bfdbfe"; // Light blue
    textColor = "#1e3a8a";
    borderColor = "#93c5fd";
  } else if (value >= 30) {
    bgColor = "#dbeafe"; // Lighter blue
    textColor = "#1e3a8a";
    borderColor = "#bfdbfe";
  } else if (value > 0) {
    bgColor = "#eff6ff"; // Lightest blue
    textColor = "#1e3a8a";
    borderColor = "#dbeafe";
  }

  return (
    <td 
      className="py-4 px-4 text-center font-bold border border-[#e5e7eb]"
      style={{ backgroundColor: bgColor, color: textColor, borderColor: borderColor }}
    >
      {value}%
    </td>
  );
}
