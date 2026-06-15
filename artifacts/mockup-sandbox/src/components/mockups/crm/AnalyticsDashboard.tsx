import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const deliveries = [
  { d: "10 июн", sent: 420, opened: 310, clicked: 142 },
  { d: "11 июн", sent: 380, opened: 260, clicked: 98 },
  { d: "12 июн", sent: 610, opened: 490, clicked: 221 },
  { d: "13 июн", sent: 540, opened: 390, clicked: 175 },
  { d: "14 июн", sent: 720, opened: 580, clicked: 290 },
  { d: "15 июн", sent: 830, opened: 640, clicked: 318 },
];

const funnel = [
  { stage: "Охват", count: 12_400, pct: 100, color: "#6366f1" },
  { stage: "Доставлено", count: 11_200, pct: 90, color: "#8b5cf6" },
  { stage: "Открыто", count: 6_800, pct: 61, color: "#a78bfa" },
  { stage: "Клик", count: 2_900, pct: 26, color: "#c4b5fd" },
  { stage: "Конверсия", count: 870, pct: 7.8, color: "#ddd6fe" },
];

const pie = [
  { name: "Открыто", value: 61, color: "#6366f1" },
  { name: "Не открыто", value: 39, color: "#e5e7eb" },
];

const topCampaigns = [
  { name: "Summer Sale", sent: 4200, open: "72%", ctr: "34%", rev: "₽142 000" },
  { name: "Retention Q2", sent: 3100, open: "65%", ctr: "28%", rev: "₽98 500" },
  { name: "VIP Promo", sent: 890, open: "81%", ctr: "52%", rev: "₽76 200" },
  { name: "Weekly Digest", sent: 6700, open: "44%", ctr: "18%", rev: "₽31 000" },
];

const METRIC_CARDS = [
  { label: "Всего отправлено", value: "84 230", delta: "+12%", up: true, icon: "📤" },
  { label: "Open Rate", value: "61.4%", delta: "+4.2%", up: true, icon: "📬" },
  { label: "Click-Through Rate", value: "26.1%", delta: "+1.8%", up: true, icon: "🖱️" },
  { label: "Отписались", value: "0.8%", delta: "-0.3%", up: true, icon: "🚪" },
  { label: "Конверсия", value: "7.8%", delta: "+0.6%", up: true, icon: "⭐" },
  { label: "Выручка", value: "₽347 700", delta: "+23%", up: true, icon: "💰" },
];

export function AnalyticsDashboard() {
  const [range, setRange] = useState("7d");

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between bg-[#13131f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">R</div>
          <span className="font-semibold text-lg tracking-tight">RUProbe CRM</span>
          <span className="ml-4 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Marketing Hub</span>
        </div>
        <div className="flex items-center gap-2">
          {["7d","30d","90d"].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${range===r ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-6 gap-3">
          {METRIC_CARDS.map(m => (
            <div key={m.label} className="bg-[#1a1a2e] border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{m.icon}</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${m.up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                  {m.delta}
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight mb-1">{m.value}</div>
              <div className="text-xs text-white/40">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Area Chart */}
          <div className="col-span-2 bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-sm">Активность кампаний</div>
                <div className="text-xs text-white/40 mt-0.5">Отправка / Открытия / Клики</div>
              </div>
              <div className="flex gap-3 text-xs">
                {[["#6366f1","Отправлено"],["#a78bfa","Открыто"],["#34d399","Клики"]].map(([c,l])=>(
                  <span key={l} className="flex items-center gap-1.5 text-white/50">
                    <span className="w-2 h-2 rounded-full" style={{background: c as string}}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={deliveries}>
                <defs>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="d" tick={{fill:"rgba(255,255,255,0.3)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#1e1e3a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"white",fontSize:12}}/>
                <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="url(#gs)" strokeWidth={2}/>
                <Area type="monotone" dataKey="opened" stroke="#a78bfa" fill="url(#go)" strokeWidth={2}/>
                <Area type="monotone" dataKey="clicked" stroke="#34d399" fill="none" strokeWidth={2} strokeDasharray="4 2"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1">Open Rate</div>
            <div className="text-xs text-white/40 mb-4">Средний по всем кампаниям</div>
            <div className="flex flex-col items-center">
              <PieChart width={160} height={160}>
                <Pie data={pie} cx={80} cy={80} innerRadius={55} outerRadius={75} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {pie.map((e,i) => <Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
              <div className="text-4xl font-bold -mt-3 tracking-tight">61.4%</div>
              <div className="text-xs text-white/40 mt-1">+4.2 пп к прошлому периоду</div>
              <div className="mt-4 w-full space-y-2">
                {[["Open Rate","61.4%","#6366f1"],["Bounce Rate","2.1%","#f43f5e"],["Spam Rate","0.3%","#f97316"]].map(([l,v,c])=>(
                  <div key={l} className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-white/50"><span className="w-2 h-2 rounded-full" style={{background:c as string}}/>{l}</span>
                    <span className="font-medium text-white/70">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Funnel + Table */}
        <div className="grid grid-cols-5 gap-4">
          {/* Conversion Funnel */}
          <div className="col-span-2 bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1">Воронка конверсии</div>
            <div className="text-xs text-white/40 mb-5">Customer journey pipeline</div>
            <div className="space-y-2">
              {funnel.map((f, i) => (
                <div key={f.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/60">{f.stage}</span>
                    <span className="font-medium">{f.count.toLocaleString("ru")} <span className="text-white/30">({f.pct}%)</span></span>
                  </div>
                  <div className="h-7 rounded-lg overflow-hidden bg-white/5">
                    <div className="h-full rounded-lg flex items-center px-2 text-xs font-semibold transition-all"
                      style={{width:`${f.pct}%`, background:f.color, opacity: 1 - i*0.08}}>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/8 flex justify-between text-xs text-white/40">
              <span>Потеря на этапах</span>
              <span className="text-rose-400 font-medium">92.2% выбыло</span>
            </div>
          </div>

          {/* Top Campaigns Table */}
          <div className="col-span-3 bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-sm">Топ кампании</div>
                <div className="text-xs text-white/40 mt-0.5">По выручке и вовлечению</div>
              </div>
              <button className="text-xs text-indigo-400 hover:text-indigo-300">Все кампании →</button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/8">
                  {["Кампания","Охват","Open","CTR","Выручка"].map(h=>(
                    <th key={h} className="pb-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topCampaigns.map(c => (
                  <tr key={c.name} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 font-medium text-white/80">{c.name}</td>
                    <td className="py-3 text-white/50">{c.sent.toLocaleString("ru")}</td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 font-semibold">{c.open}</span>
                    </td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 font-semibold">{c.ctr}</span>
                    </td>
                    <td className="py-3 text-emerald-400 font-semibold">{c.rev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mini bar chart */}
            <div className="mt-4 pt-4 border-t border-white/8">
              <div className="text-xs text-white/30 mb-2">Выручка по кампаниям (₽)</div>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={topCampaigns} barSize={20}>
                  <Bar dataKey="sent" fill="#6366f1" radius={[3,3,0,0]}/>
                  <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.25)",fontSize:9}} axisLine={false} tickLine={false}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
