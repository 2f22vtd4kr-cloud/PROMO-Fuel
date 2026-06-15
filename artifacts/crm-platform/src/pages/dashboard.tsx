import { useGetAnalyticsOverview, useGetAnalyticsTrend, useGetAnalyticsFunnel, useGetTopCampaigns, useGetActivityFeed, useGetAnalyticsCohort } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Send, Users, Megaphone, Mail, MousePointerClick, Zap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

const FUNNEL_COLORS = ["hsl(224 76% 55%)", "hsl(260 65% 55%)", "hsl(300 55% 50%)", "hsl(330 65% 50%)", "hsl(0 65% 50%)"];
const REFETCH_MS = 30_000;

function DeltaBadge({ delta }: { delta?: number }) {
  if (delta == null) return null;
  const up = delta >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, delta, color }: { label: string; value: string; icon: any; delta?: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg" style={{ background: `${color}22` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <DeltaBadge delta={delta} />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function RunningBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Активна
      </span>
    );
  }
  const STATUS_COLOR: Record<string, string> = {
    done: "default", scheduled: "outline", draft: "outline", paused: "destructive", cancelled: "destructive",
  };
  const STATUS_LABEL: Record<string, string> = {
    done: "Завершена", scheduled: "Запланирована", draft: "Черновик", paused: "Пауза", cancelled: "Отменена",
  };
  return (
    <Badge variant={STATUS_COLOR[status] as any || "outline"} className="text-[10px]">
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

function RefreshIndicator({ lastRefresh }: { lastRefresh: Date }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
  const next = Math.max(0, REFETCH_MS / 1000 - secs);
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw size={11} className={secs < 2 ? "animate-spin text-emerald-400" : ""} />
      <span>Обновление через {next}с</span>
    </div>
  );
}

export function Dashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const queryOpts = { query: { refetchInterval: REFETCH_MS, onSuccess: () => setLastRefresh(new Date()) } };

  const { data: overview, isLoading: ovLoading } = useGetAnalyticsOverview({ query: { refetchInterval: REFETCH_MS } });
  const { data: trend, isLoading: trendLoading } = useGetAnalyticsTrend({ days: 7 }, { query: { refetchInterval: REFETCH_MS } });
  const { data: funnel } = useGetAnalyticsFunnel({ query: { refetchInterval: REFETCH_MS } });
  const { data: topCampaigns } = useGetTopCampaigns({ limit: 5 }, { query: { refetchInterval: REFETCH_MS } });
  const { data: activity } = useGetActivityFeed({ limit: 8 }, { query: { refetchInterval: REFETCH_MS } });
  const { data: cohort } = useGetAnalyticsCohort({ query: { refetchInterval: REFETCH_MS } });

  const pieData = overview
    ? [{ name: "Open Rate", value: overview.avgOpenRate }, { name: "Не открыто", value: 100 - overview.avgOpenRate }]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Обзор аналитики</h1>
          <p className="text-muted-foreground text-sm mt-1">Сводные показатели по всем кампаниям</p>
        </div>
        <RefreshIndicator lastRefresh={lastRefresh} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {ovLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : overview && (
            <>
              <MetricCard label="Всего отправлено" value={overview.totalSent.toLocaleString("ru")} icon={Send} delta={overview.sentDelta} color="hsl(224 76% 55%)" />
              <MetricCard label="Аудитория" value={overview.totalUsers.toLocaleString("ru")} icon={Users} color="hsl(260 65% 55%)" />
              <MetricCard label="Кампаний" value={overview.totalCampaigns.toString()} icon={Megaphone} color="hsl(300 55% 50%)" />
              <MetricCard label="Open Rate" value={`${overview.avgOpenRate.toFixed(1)}%`} icon={Mail} delta={overview.openDelta} color="hsl(160 60% 45%)" />
              <MetricCard label="CTR" value={`${overview.avgCtr.toFixed(1)}%`} icon={MousePointerClick} delta={overview.ctrDelta} color="hsl(30 80% 55%)" />
              <MetricCard label="Активных" value={overview.activeCampaigns.toString()} icon={Zap} color="hsl(50 90% 50%)" />
            </>
          )
        }
      </div>

      {/* Trend + Open Rate */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="mb-4">
            <div className="font-semibold text-sm">Активность за 7 дней</div>
            <div className="text-xs text-muted-foreground mt-0.5">Отправка, открытия, клики</div>
          </div>
          {trendLoading
            ? <Skeleton className="h-48" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend || []}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(224 76% 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(224 76% 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(260 65% 65%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(260 65% 65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(215 20.2% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 20.2% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 17%)", borderRadius: 8, color: "hsl(210 40% 98%)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" stroke="hsl(224 76% 55%)" fill="url(#gSent)" strokeWidth={2} name="Отправлено" />
                  <Area type="monotone" dataKey="opened" stroke="hsl(260 65% 65%)" fill="url(#gOpen)" strokeWidth={2} name="Открыто" />
                  <Area type="monotone" dataKey="clicked" stroke="hsl(160 60% 45%)" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Клики" />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="font-semibold text-sm mb-1">Open Rate</div>
          <div className="text-xs text-muted-foreground mb-3">Средний по кампаниям</div>
          {overview && (
            <div className="flex flex-col items-center flex-1 justify-center">
              <PieChart width={160} height={160}>
                <Pie data={pieData} cx={80} cy={80} innerRadius={55} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  <Cell fill="hsl(224 76% 55%)" />
                  <Cell fill="hsl(217 33% 17%)" />
                </Pie>
              </PieChart>
              <div className="text-4xl font-bold -mt-3">{overview.avgOpenRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">Open Rate</div>
              <div className="mt-4 w-full space-y-2">
                {[
                  ["CTR", `${overview.avgCtr.toFixed(1)}%`, "hsl(260 65% 65%)"],
                  ["Bounce Rate", `${overview.avgBounceRate.toFixed(1)}%`, "hsl(0 62.8% 55%)"],
                ].map(([l, v, c]) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                      {l}
                    </span>
                    <span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Funnel + Top Campaigns */}
      <div className="grid grid-cols-5 gap-4">
        {/* Funnel */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="font-semibold text-sm mb-1">Воронка конверсии</div>
          <div className="text-xs text-muted-foreground mb-5">Этапы customer journey</div>
          <div className="space-y-3">
            {(funnel || []).map((f, i) => (
              <div key={f.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{f.stage}</span>
                  <span className="font-medium">{f.count.toLocaleString("ru")} <span className="text-muted-foreground">({f.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-6 rounded-md bg-secondary overflow-hidden">
                  <div className="h-full rounded-md" style={{ width: `${f.pct}%`, background: FUNNEL_COLORS[i] || "hsl(224 76% 55%)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="col-span-3 bg-card border border-border rounded-xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-semibold text-sm">Топ кампании</div>
              <div className="text-xs text-muted-foreground mt-0.5">По open rate</div>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {["Кампания", "Охват", "Open Rate", "CTR", "Статус"].map(h => (
                  <th key={h} className="pb-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(topCampaigns || []).map(c => (
                <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-muted-foreground">{c.sent.toLocaleString("ru")}</td>
                  <td className="py-2.5">
                    <span className="text-primary font-semibold">{c.openRate.toFixed(1)}%</span>
                  </td>
                  <td className="py-2.5">
                    <span className="text-purple-400 font-semibold">{c.ctr.toFixed(1)}%</span>
                  </td>
                  <td className="py-2.5">
                    <RunningBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Feed + Cohort */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-sm">Live Activity Feed</div>
              <div className="text-xs text-muted-foreground mt-0.5">Последние события</div>
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
                <span className="text-xs text-muted-foreground flex-shrink-0">{e.stage}</span>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{e.ts}</span>
              </div>
            ))}
            {!activity?.length && <div className="py-4 text-xs text-muted-foreground text-center">Нет событий</div>}
          </div>
        </div>

        {/* Cohort */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="font-semibold text-sm mb-1">Когортный анализ</div>
          <div className="text-xs text-muted-foreground mb-4">Удержание по неделям, %</div>
          {cohort && cohort.length > 0 ? (
            <div>
              <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground mb-1">
                {["", "Нед 0", "Нед 1", "Нед 2", "Нед 3"].map(h => (
                  <div key={h} className="text-center">{h}</div>
                ))}
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
    </div>
  );
}
