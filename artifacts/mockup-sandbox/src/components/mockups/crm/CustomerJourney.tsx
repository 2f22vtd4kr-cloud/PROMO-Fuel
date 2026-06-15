import { useState } from "react";

const stages = [
  {
    id: "awareness", label: "Охват", icon: "📡", color: "#6366f1", bg: "rgba(99,102,241,0.12)",
    count: 12400, pct: 100,
    events: ["Первый контакт с ботом", "Источник: реферал", "Органический поиск"],
    avg: "0 ч",
  },
  {
    id: "engaged", label: "Вовлечение", icon: "💬", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",
    count: 9100, pct: 73,
    events: ["/start команда", "Просмотр меню", "Первый запрос"],
    avg: "4 мин",
  },
  {
    id: "active", label: "Активный", icon: "⚡", color: "#a855f7", bg: "rgba(168,85,247,0.12)",
    count: 6800, pct: 55,
    events: ["Регулярные сессии", "Использование OSINT", "Загрузка файлов"],
    avg: "2 дня",
  },
  {
    id: "campaign", label: "Кампания", icon: "📣", color: "#d946ef", bg: "rgba(217,70,239,0.12)",
    count: 4100, pct: 33,
    events: ["Получил рассылку", "Открыл сообщение", "Перешёл по ссылке"],
    avg: "5 дней",
  },
  {
    id: "converted", label: "Конверсия", icon: "⭐", color: "#ec4899", bg: "rgba(236,72,153,0.12)",
    count: 870, pct: 7,
    events: ["Целевое действие", "Повторная покупка", "Реферал"],
    avg: "12 дней",
  },
];

const timeline = [
  { time: "Сейчас", user: "user_4821", event: "Открыл сообщение кампании «Summer Sale»", stage: "Кампания", dot: "#d946ef" },
  { time: "2 мин", user: "user_1203", event: "Перешёл по ссылке в боте", stage: "Конверсия", dot: "#ec4899" },
  { time: "5 мин", user: "user_9010", event: "Первый запуск /start", stage: "Охват", dot: "#6366f1" },
  { time: "8 мин", user: "user_3344", event: "Использовал /inn поиск", stage: "Активный", dot: "#a855f7" },
  { time: "11 мин", user: "user_7761", event: "Получил кампанию «Retention Q2»", stage: "Кампания", dot: "#d946ef" },
  { time: "15 мин", user: "user_2290", event: "Реферальный переход", stage: "Охват", dot: "#6366f1" },
];

export function CustomerJourney() {
  const [active, setActive] = useState("campaign");
  const sel = stages.find(s => s.id === active)!;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between bg-[#13131f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">R</div>
          <span className="font-semibold text-lg tracking-tight">RUProbe CRM</span>
          <span className="ml-2 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Customer Journey</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-xs text-white/40">Real-time • 847 активных сессий</span>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Journey Pipeline */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-1">Путь клиента</div>
          <div className="text-xs text-white/40 mb-5">Кликните на этап для детализации</div>

          <div className="flex items-stretch gap-0">
            {stages.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => setActive(s.id)}
                  className={`flex-1 rounded-xl p-4 border transition-all text-left ${active === s.id
                    ? "border-white/30 shadow-lg scale-[1.02]"
                    : "border-white/8 hover:border-white/15"}`}
                  style={{ background: active === s.id ? s.bg : "rgba(255,255,255,0.03)" }}
                >
                  <div className="text-xl mb-2">{s.icon}</div>
                  <div className="text-xs font-semibold mb-1" style={{ color: s.color }}>{s.label}</div>
                  <div className="text-xl font-bold tracking-tight mb-0.5">{s.count.toLocaleString("ru")}</div>
                  <div className="text-xs text-white/30">{s.pct}% от охвата</div>
                  {/* drop bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }}/>
                  </div>
                </button>
                {i < stages.length - 1 && (
                  <div className="px-1 flex flex-col items-center">
                    <div className="text-white/20 text-lg">›</div>
                    <div className="text-[9px] text-white/20 mt-0.5 whitespace-nowrap">
                      -{Math.round(100 - stages[i+1].pct)}%
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Selected stage detail */}
          <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-5" style={{ borderColor: `${sel.color}40` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{sel.icon}</span>
              <div>
                <div className="font-semibold text-sm" style={{ color: sel.color }}>{sel.label}</div>
                <div className="text-xs text-white/40">Ср. время на этапе: {sel.avg}</div>
              </div>
            </div>
            <div className="space-y-2">
              {sel.events.map(e => (
                <div key={e} className="flex items-center gap-2 text-xs text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sel.color }}/>
                  {e}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-2 gap-3">
              {[["Пользователей", sel.count.toLocaleString("ru")],["Конверсия", `${sel.pct}%`]].map(([l,v])=>(
                <div key={l}>
                  <div className="text-xs text-white/30 mb-0.5">{l}</div>
                  <div className="text-lg font-bold" style={{ color: sel.color }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictive score */}
          <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-sm">Predictive Score</div>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">AI</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Вероятность конверсии", score: 78, color: "#6366f1" },
                { label: "Риск оттока", score: 23, color: "#f43f5e" },
                { label: "LTV прогноз", score: 64, color: "#34d399" },
                { label: "Склонность к покупке", score: 51, color: "#f59e0b" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/50">{item.label}</span>
                    <span className="font-semibold" style={{ color: item.color }}>{item.score}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, background: item.color }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cohort */}
          <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1">Когортный анализ</div>
            <div className="text-xs text-white/40 mb-4">Удержание по неделям</div>
            <div className="grid grid-cols-5 gap-1 text-[9px]">
              {["","Нед 1","Нед 2","Нед 3","Нед 4"].map(h => (
                <div key={h} className="text-white/30 font-medium text-center pb-1">{h}</div>
              ))}
              {[
                ["Июн 1", 100, 68, 52, 41],
                ["Июн 2", 100, 71, 55, 44],
                ["Июн 3", 100, 64, 48, 38],
                ["Июн 4", 100, 73, 58, null],
                ["Июн 5", 100, 69, null, null],
              ].map(([week, ...vals]) => (
                <>
                  <div key={week as string} className="text-white/30 text-center py-1 self-center">{week}</div>
                  {vals.map((v, i) => (
                    <div key={i} className="rounded text-center py-1.5 font-semibold"
                      style={{
                        background: v == null ? "rgba(255,255,255,0.03)" : `rgba(99,102,241,${(v as number)/100 * 0.6 + 0.1})`,
                        color: v == null ? "transparent" : "white",
                        fontSize: 9,
                      }}>
                      {v != null ? `${v}%` : "·"}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-sm">Live Activity Feed</div>
              <div className="text-xs text-white/40 mt-0.5">Действия пользователей в реальном времени</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {timeline.map((e, i) => (
              <div key={i} className="flex items-center gap-4 py-2.5">
                <span className="text-xs text-white/25 w-10 flex-shrink-0">{e.time}</span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.dot }}/>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-white/70">{e.user}</span>
                  <span className="text-xs text-white/40"> — {e.event}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/40 flex-shrink-0">{e.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
