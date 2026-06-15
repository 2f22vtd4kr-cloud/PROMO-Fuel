import { useState } from "react";
import { useGetAnalyticsFunnel, useGetActivityFeed, useGetAnalyticsCohort, useGetAnalyticsOverview } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Zap, MessageSquare, Megaphone, Star } from "lucide-react";

const STAGE_ICONS = [Radio, MessageSquare, Zap, Megaphone, Star];
const STAGE_COLORS = [
  "hsl(224 76% 55%)", "hsl(260 65% 55%)", "hsl(290 55% 50%)", "hsl(320 65% 50%)", "hsl(350 65% 50%)",
];

const PREDICT = [
  { label: "Вероятность конверсии", score: 78, color: "hsl(224 76% 55%)" },
  { label: "Риск оттока", score: 23, color: "hsl(0 62.8% 55%)" },
  { label: "LTV прогноз", score: 64, color: "hsl(160 60% 45%)" },
  { label: "Склонность к действию", score: 51, color: "hsl(30 80% 55%)" },
];

export function Journey() {
  const [selectedStage, setSelectedStage] = useState(2);
  const { data: funnel, isLoading: fLoading } = useGetAnalyticsFunnel();
  const { data: activity } = useGetActivityFeed({ limit: 8 });
  const { data: cohort } = useGetAnalyticsCohort();
  const { data: overview } = useGetAnalyticsOverview();

  const stages = funnel || [];
  const sel = stages[selectedStage];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Путь клиента</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground text-sm">Customer journey — воронка вовлечения</p>
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">{overview?.totalUsers ?? "—"} активных пользователей</span>
          </div>
        </div>
      </div>

      {/* Journey Pipeline */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-1">Воронка конверсии</div>
        <div className="text-xs text-muted-foreground mb-5">Нажмите на этап для детализации</div>

        {fLoading
          ? <Skeleton className="h-32" />
          : (
            <div className="flex items-stretch gap-2">
              {stages.map((s, i) => {
                const Icon = STAGE_ICONS[i] || Star;
                const color = STAGE_COLORS[i] || "hsl(224 76% 55%)";
                const isSelected = selectedStage === i;
                return (
                  <div key={s.stage} className="flex items-center flex-1">
                    <button
                      onClick={() => setSelectedStage(i)}
                      className={`flex-1 rounded-xl p-4 border transition-all text-left ${isSelected ? "border-border/60 ring-1 ring-primary/30 scale-[1.02]" : "border-border/30 hover:border-border/60"}`}
                      style={{ background: isSelected ? `${color}12` : "hsl(217 33% 9%)" }}
                    >
                      <Icon size={18} style={{ color }} className="mb-2" />
                      <div className="text-xs font-semibold mb-0.5" style={{ color }}>{s.stage}</div>
                      <div className="text-xl font-bold tracking-tight mb-0.5">{s.count.toLocaleString("ru")}</div>
                      <div className="text-xs text-muted-foreground">{s.pct.toFixed(0)}% от охвата</div>
                      <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: color }} />
                      </div>
                    </button>
                    {i < stages.length - 1 && (
                      <div className="px-1.5 flex flex-col items-center shrink-0">
                        <span className="text-muted-foreground/40 text-lg">›</span>
                        <span className="text-[9px] text-muted-foreground/30">
                          -{stages[i + 1] ? (100 - stages[i + 1].pct).toFixed(0) : 0}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      {/* Detail Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Stage detail */}
        <div className="bg-card border border-border rounded-xl p-5">
          {sel ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                {(() => { const Icon = STAGE_ICONS[selectedStage] || Star; return <Icon size={20} style={{ color: STAGE_COLORS[selectedStage] }} />; })()}
                <div>
                  <div className="font-semibold text-sm" style={{ color: STAGE_COLORS[selectedStage] }}>{sel.stage}</div>
                  <div className="text-xs text-muted-foreground">Детализация этапа</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Пользователей</div>
                  <div className="text-2xl font-bold" style={{ color: STAGE_COLORS[selectedStage] }}>{sel.count.toLocaleString("ru")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">% от охвата</div>
                  <div className="text-2xl font-bold" style={{ color: STAGE_COLORS[selectedStage] }}>{sel.pct.toFixed(0)}%</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                {[
                  "Регистрация в боте",
                  "Использование команд",
                  "Получение кампании",
                ].map(e => (
                  <div key={e} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[selectedStage] }} />
                    {e}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                {selectedStage > 0 && stages[selectedStage - 1] && (
                  <span className="text-rose-400">
                    Потеряно с предыдущего этапа: {(stages[selectedStage - 1].count - sel.count).toLocaleString("ru")} ({(100 - sel.pct / stages[selectedStage - 1].pct * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Выберите этап</div>
          )}
        </div>

        {/* Predictive Score */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-sm">Predictive Score</div>
            <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/20">AI</span>
          </div>
          <div className="space-y-4">
            {PREDICT.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold" style={{ color: item.color }}>{item.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            Модель обновляется при каждом взаимодействии
          </div>
        </div>

        {/* Cohort */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-semibold text-sm mb-1">Когортный анализ</div>
          <div className="text-xs text-muted-foreground mb-4">Удержание по неделям, %</div>
          {cohort && cohort.length > 0 ? (
            <div>
              <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground mb-1">
                {["Когорта", "Нед 0", "Нед 1", "Нед 2", "Нед 3"].map(h => <div key={h} className="text-center">{h}</div>)}
              </div>
              {cohort.map(row => (
                <div key={row.week} className="grid grid-cols-5 gap-1 mb-1">
                  <div className="text-[10px] text-muted-foreground flex items-center">{row.week}</div>
                  {[row.w0, row.w1, row.w2, row.w3].map((v, i) => (
                    <div key={i} className="rounded text-center py-1.5 text-[10px] font-semibold"
                      style={{
                        background: v == null ? "hsl(217 33% 12%)" : `rgba(99,102,241,${(v / 100) * 0.6 + 0.1})`,
                        color: v == null ? "transparent" : "white",
                      }}>
                      {v != null ? `${v}%` : "·"}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-xs text-muted-foreground text-center">Недостаточно данных</div>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-sm">Live Activity Feed</div>
            <div className="text-xs text-muted-foreground mt-0.5">Действия пользователей в реальном времени</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>
        <div className="divide-y divide-border">
          {(activity || []).map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.dot }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{e.username ? `@${e.username}` : `user_${e.chat_id}`}</span>
                <span className="text-xs text-muted-foreground"> — {e.event}</span>
              </div>
              <span className="text-xs border border-border/50 px-2 py-0.5 rounded-full text-muted-foreground flex-shrink-0 text-[10px]">{e.stage}</span>
              <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">{e.ts}</span>
            </div>
          ))}
          {!activity?.length && <div className="py-4 text-xs text-center text-muted-foreground">Нет событий</div>}
        </div>
      </div>
    </div>
  );
}
