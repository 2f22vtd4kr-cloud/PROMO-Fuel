import { useParams, useLocation } from "wouter";
import { useGetCampaign, useListSendLogs, useUpdateCampaign } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Send, Mail, AlertTriangle, Calendar, Tag, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  done: "Завершена", running: "Активна", scheduled: "Запланирована",
  draft: "Черновик", paused: "Пауза", cancelled: "Отменена",
};
const STATUS_VARIANT: Record<string, string> = {
  done: "secondary", running: "default", scheduled: "outline",
  draft: "outline", paused: "destructive", cancelled: "destructive",
};

export function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id || "0");
  const { data: campaign, isLoading } = useGetCampaign(id);
  const { data: logs } = useListSendLogs(id);
  const updateMut = useUpdateCampaign();

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  if (!campaign) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-2xl text-muted-foreground">Кампания не найдена</div>
      <Button variant="outline" onClick={() => navigate("/campaigns")}>Назад</Button>
    </div>
  );

  const progress = campaign.target_count > 0
    ? Math.round((campaign.sent_count / campaign.target_count) * 100)
    : 0;

  const okLogs = (logs || []).filter(l => l.status === "ok" || l.status.startsWith("ok")).length;
  const errLogs = (logs || []).filter(l => l.status === "error" || l.status.startsWith("error")).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/campaigns")}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_VARIANT[campaign.status] as any || "outline"} className="text-[11px]">
              {STATUS_LABEL[campaign.status] || campaign.status}
            </Badge>
            {campaign.scheduled_tag && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Tag size={11} /> {campaign.scheduled_tag}
              </span>
            )}
            {campaign.created_at && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={11} /> {campaign.created_at.slice(0, 10)}
              </span>
            )}
          </div>
        </div>
        {campaign.status === "running" && (
          <Button variant="outline" size="sm" onClick={() => updateMut.mutate({ id, data: { status: "paused" } })}>
            Пауза
          </Button>
        )}
        {campaign.status === "paused" && (
          <Button size="sm" onClick={() => updateMut.mutate({ id, data: { status: "running" } })}>
            Продолжить
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Отправлено", value: campaign.sent_count.toLocaleString("ru"), icon: Send, color: "hsl(224 76% 55%)" },
          { label: "Получателей", value: campaign.target_count.toLocaleString("ru"), icon: Mail, color: "hsl(260 65% 65%)" },
          { label: "Успешно", value: okLogs.toLocaleString("ru"), icon: CheckCircle, color: "hsl(160 60% 45%)" },
          { label: "Ошибок", value: campaign.failed_count.toLocaleString("ru"), icon: XCircle, color: "hsl(0 62.8% 55%)" },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="p-2 rounded-lg w-fit" style={{ background: `${m.color}22` }}>
              <m.icon size={15} style={{ color: m.color }} />
            </div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {campaign.status === "running" && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Прогресс отправки</span>
            <span className="font-medium">{campaign.sent_count} / {campaign.target_count}</span>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>{progress}% завершено</span>
            {campaign.target_count > campaign.sent_count && (
              <span className="flex items-center gap-1"><Clock size={10} /> ~{Math.ceil((campaign.target_count - campaign.sent_count) * 2.75 / 60)} мин</span>
            )}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {campaign.status === "scheduled" && campaign.scheduled_at && (
        <div className="bg-secondary/30 border border-border rounded-xl p-5 flex items-center gap-4">
          <Calendar size={28} className="text-primary flex-shrink-0" />
          <div>
            <div className="font-semibold">Автозапуск запланирован</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Дата и время: <strong className="text-foreground">{campaign.scheduled_at.slice(0, 16).replace("T", " ")}</strong>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Планировщик проверяет каждые 30 секунд и запустит рассылку автоматически
            </div>
          </div>
        </div>
      )}

      {/* Message template */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">Текст сообщения</div>
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 rounded-lg p-4">
          {campaign.text_template}
        </pre>
      </div>

      {/* Send logs */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-sm">Лог отправки</div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11} /> {okLogs} успешно</span>
            <span className="flex items-center gap-1 text-rose-400"><XCircle size={11} /> {errLogs} ошибок</span>
          </div>
        </div>
        {!logs?.length
          ? <div className="py-6 text-center text-sm text-muted-foreground">Нет записей отправки</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    {["Статус", "Пользователь", "Chat ID", "Время", "Ошибка"].map(h => (
                      <th key={h} className="pb-2 text-left font-medium px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(l => {
                    const ok = l.status === "ok" || l.status.startsWith("ok");
                    return (
                      <tr key={l.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-2 px-2">
                          {ok
                            ? <CheckCircle size={13} className="text-emerald-400" />
                            : <XCircle size={13} className="text-rose-400" />
                          }
                        </td>
                        <td className="py-2 px-2 font-medium">{l.username ? `@${l.username}` : l.first_name || "—"}</td>
                        <td className="py-2 px-2 font-mono text-muted-foreground">{l.chat_id}</td>
                        <td className="py-2 px-2 text-muted-foreground">{l.sent_at?.slice(11, 16)}</td>
                        <td className="py-2 px-2 text-rose-400">{l.error || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
