import { useState } from "react";

const campaigns = [
  {
    id: 1, name: "Summer Sale 2026", status: "done", tag: "all",
    sent: 4200, open: 72.4, ctr: 33.8, bounce: 1.2, unsub: 0.4, rev: 142000,
    scheduled: null, created: "10 июн",
  },
  {
    id: 2, name: "Retention Q2", status: "running", tag: "vip",
    sent: 1820, open: 65.1, ctr: 28.3, bounce: 0.8, unsub: 0.2, rev: 42500,
    scheduled: null, created: "14 июн",
  },
  {
    id: 3, name: "VIP Summer Promo", status: "scheduled", tag: "vip",
    sent: 0, open: 0, ctr: 0, bounce: 0, unsub: 0, rev: 0,
    scheduled: "2026-06-17 09:00", created: "15 июн",
  },
  {
    id: 4, name: "Weekly Digest #24", status: "draft", tag: "all",
    sent: 0, open: 0, ctr: 0, bounce: 0, unsub: 0, rev: 0,
    scheduled: null, created: "15 июн",
  },
  {
    id: 5, name: "Win-Back Inactive", status: "paused", tag: "inactive",
    sent: 890, open: 41.2, ctr: 15.6, bounce: 3.1, unsub: 1.8, rev: 8200,
    scheduled: null, created: "12 июн",
  },
];

const STATUS = {
  done: { label: "Завершена", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  running: { label: "Запущена", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  scheduled: { label: "Запланирована", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  draft: { label: "Черновик", color: "text-white/40", bg: "bg-white/5 border-white/10" },
  paused: { label: "Пауза", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

const users = [
  { id: 1, name: "Алексей М.", tag: "vip", joined: "10 июн", campaigns: 3, open: "84%", status: "active" },
  { id: 2, name: "Мария К.", tag: "all", joined: "8 июн", campaigns: 5, open: "71%", status: "active" },
  { id: 3, name: "Иван П.", tag: "inactive", joined: "2 мар", campaigns: 12, open: "22%", status: "risk" },
  { id: 4, name: "Анна С.", tag: "vip", joined: "15 мая", campaigns: 7, open: "91%", status: "active" },
  { id: 5, name: "Дмитрий Л.", tag: "all", joined: "1 июн", campaigns: 2, open: "55%", status: "new" },
];

export function CampaignManager() {
  const [tab, setTab] = useState<"campaigns"|"users"|"create">("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<number|null>(2);

  const sel = campaigns.find(c => c.id === selectedCampaign);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between bg-[#13131f] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">R</div>
          <span className="font-semibold text-lg tracking-tight">RUProbe CRM</span>
          <span className="ml-2 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Campaigns</span>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
          <span>+</span> Новая кампания
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex gap-1 bg-[#13131f] flex-shrink-0">
        {([["campaigns","📣 Кампании"],["users","👥 Аудитория"],["create","✏️ Создать"]] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab===t
              ? "border-indigo-500 text-white" : "border-transparent text-white/40 hover:text-white/60"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === "campaigns" && (
          <>
            {/* Campaign List */}
            <div className="w-80 border-r border-white/8 overflow-y-auto flex-shrink-0">
              {/* Stats bar */}
              <div className="px-4 py-3 border-b border-white/8 grid grid-cols-3 gap-2 text-center">
                {[["5","Кампаний"],["6 020","Отправлено"],["₽192К","Выручка"]].map(([v,l])=>(
                  <div key={l}>
                    <div className="text-base font-bold text-white">{v}</div>
                    <div className="text-[10px] text-white/30">{l}</div>
                  </div>
                ))}
              </div>
              {campaigns.map(c => {
                const st = STATUS[c.status as keyof typeof STATUS];
                return (
                  <button key={c.id} onClick={() => setSelectedCampaign(c.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-all ${selectedCampaign===c.id ? "bg-indigo-600/10 border-l-2 border-l-indigo-500" : "hover:bg-white/3"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-xs font-semibold text-white/80 leading-tight">{c.name}</div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      {c.sent > 0 && <span>📤 {c.sent.toLocaleString("ru")}</span>}
                      {c.open > 0 && <span>📬 {c.open}%</span>}
                      {c.scheduled && <span>📅 {c.scheduled.slice(0,10)}</span>}
                      <span className="ml-auto">{c.created}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Campaign Detail */}
            <div className="flex-1 overflow-y-auto p-6">
              {sel ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{sel.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS[sel.status as keyof typeof STATUS].bg} ${STATUS[sel.status as keyof typeof STATUS].color}`}>
                          {STATUS[sel.status as keyof typeof STATUS].label}
                        </span>
                        <span className="text-xs text-white/30">Тег: <strong className="text-white/50">{sel.tag}</strong></span>
                        <span className="text-xs text-white/30">Создана {sel.created}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {sel.status === "running" && (
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">⏸ Пауза</button>
                      )}
                      {sel.status === "paused" && (
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">▶ Продолжить</button>
                      )}
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10">✏️ Изменить</button>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  {sel.sent > 0 && (
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: "Отправлено", value: sel.sent.toLocaleString("ru"), icon: "📤", color: "text-white" },
                        { label: "Open Rate", value: `${sel.open}%`, icon: "📬", color: "text-indigo-400" },
                        { label: "CTR", value: `${sel.ctr}%`, icon: "🖱️", color: "text-violet-400" },
                        { label: "Bounce", value: `${sel.bounce}%`, icon: "↩️", color: "text-rose-400" },
                        { label: "Выручка", value: `₽${(sel.rev/1000).toFixed(0)}К`, icon: "💰", color: "text-emerald-400" },
                      ].map(m => (
                        <div key={m.label} className="bg-[#1a1a2e] border border-white/8 rounded-xl p-4 text-center">
                          <div className="text-lg mb-1">{m.icon}</div>
                          <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                          <div className="text-[10px] text-white/30 mt-0.5">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress bar for running */}
                  {sel.status === "running" && (
                    <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-white/50">Прогресс отправки</span>
                        <span className="text-white/70">1 820 / 3 100</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all" style={{ width: "58.7%" }}/>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/30 mt-1.5">
                        <span>58.7% завершено</span>
                        <span>~4 мин до конца</span>
                      </div>
                    </div>
                  )}

                  {/* Scheduled info */}
                  {sel.status === "scheduled" && (
                    <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-3xl">📅</span>
                      <div>
                        <div className="font-semibold text-sm text-violet-300">Автозапуск запланирован</div>
                        <div className="text-xs text-white/50 mt-0.5">Дата и время: <strong className="text-violet-300">{sel.scheduled}</strong></div>
                        <div className="text-xs text-white/40 mt-1">Планировщик проверяет каждые 30 секунд и запустит рассылку автоматически</div>
                      </div>
                    </div>
                  )}

                  {/* Send log preview */}
                  {sel.sent > 0 && (
                    <div className="bg-[#1a1a2e] border border-white/8 rounded-xl p-4">
                      <div className="text-xs font-semibold text-white/60 mb-3">Последние отправки</div>
                      <div className="space-y-2">
                        {[
                          { id: "user_4821", name: "Алексей М.", status: "ok", time: "10:42" },
                          { id: "user_1203", name: "Мария К.", status: "ok", time: "10:42" },
                          { id: "user_7761", name: "Пётр В.", status: "ok", time: "10:43" },
                          { id: "user_9010", name: "Анна С.", status: "ok", time: "10:43" },
                          { id: "user_3344", name: "—", status: "error", time: "10:44" },
                        ].map((r, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs text-white/50">
                            <span className={r.status === "ok" ? "text-emerald-400" : "text-rose-400"}>{r.status === "ok" ? "✓" : "✗"}</span>
                            <span className="font-mono text-[10px] text-white/25">{r.id}</span>
                            <span className="flex-1">{r.name}</span>
                            <span className="text-white/25">{r.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-white/20 text-sm">
                  Выберите кампанию
                </div>
              )}
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="flex-1 p-6">
            <div className="mb-4 flex items-center gap-3">
              <input placeholder="Поиск по имени или ID..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-indigo-500/50"/>
              {["all","vip","inactive"].map(t => (
                <button key={t} className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/70 transition-colors">
                  {t === "all" ? "Все" : t === "vip" ? "VIP" : "Неактивные"}
                </button>
              ))}
            </div>
            <div className="bg-[#1a1a2e] border border-white/8 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-white/30">
                    {["Пользователь","Тег","Добавлен","Кампаний","Open Rate","Статус"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 font-medium text-white/80">{u.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          u.tag === "vip" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
                          u.tag === "inactive" ? "bg-rose-500/15 text-rose-400 border-rose-500/20" :
                          "bg-white/5 text-white/40 border-white/10"}`}>{u.tag}</span>
                      </td>
                      <td className="px-4 py-3 text-white/40">{u.joined}</td>
                      <td className="px-4 py-3 text-white/60">{u.campaigns}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${parseInt(u.open) > 70 ? "text-emerald-400" : parseInt(u.open) > 50 ? "text-indigo-400" : "text-rose-400"}`}>{u.open}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          u.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          u.status === "risk" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                          {u.status === "active" ? "Активен" : u.status === "risk" ? "Риск оттока" : "Новый"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "create" && (
          <div className="flex-1 p-6 max-w-2xl">
            <div className="font-semibold text-sm mb-5">Новая кампания</div>
            <div className="space-y-4">
              {[["Название кампании","text","Summer Promo 2026"],["Тег аудитории","text","vip"],["Дата (опц.)","date",""],["Время (опц.)","time",""]].map(([l,t,p])=>(
                <div key={l as string}>
                  <label className="text-xs text-white/40 mb-1.5 block">{l}</label>
                  <input type={t as string} placeholder={p as string}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"/>
                </div>
              ))}
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Текст сообщения</label>
                <textarea rows={5} placeholder="Привет, {name}! У нас для тебя специальное предложение..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors resize-none"/>
                <div className="text-[10px] text-white/20 mt-1">Переменные: {"{name}"} {"{username}"}</div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Создать кампанию</button>
                <button className="px-4 bg-white/5 text-white/50 text-sm py-2.5 rounded-lg border border-white/10 hover:bg-white/8 transition-colors">Dry Run</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
