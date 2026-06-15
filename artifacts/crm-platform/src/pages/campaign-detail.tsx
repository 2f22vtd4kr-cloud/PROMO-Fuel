import { useState, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCampaign, useListSendLogs, useUpdateCampaign } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  StickyNote,
  ArrowLeft, Send, Mail, AlertTriangle, Calendar, Tag,
  CheckCircle, XCircle, Clock, Edit2, Play, Pause, User, Download,
  BarChart2, List, Settings, Shield
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const STATUS_LABEL: Record<string, string> = {
  done: "Завершена", running: "Активна", scheduled: "Запланирована",
  draft: "Черновик", paused: "Пауза", cancelled: "Отменена",
};
const STATUS_VARIANT: Record<string, string> = {
  done: "secondary", running: "default", scheduled: "outline",
  draft: "outline", paused: "destructive", cancelled: "destructive",
};

interface AccountBreakdown {
  id: number; label: string; phone: string; username?: string;
  total: number; ok: number; errors: number;
}

function AccountBreakdownTable({ campaignId }: { campaignId: number }) {
  const [rows, setRows] = useState<AccountBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/account-breakdown`);
      if (res.ok) setRows(await res.json());
    } catch { }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!rows.length) return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      <Shield size={24} className="mx-auto mb-2 opacity-30" />
      Данные по аккаунтам появятся после запуска рассылки
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            {["Аккаунт", "Телефон", "Отправлено", "Успешно", "Ошибки", "Доставка"].map(h => (
              <th key={h} className="pb-2 text-left font-medium px-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(r => {
            const delivRate = r.total > 0 ? Math.round((r.ok / r.total) * 100) : 0;
            return (
              <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                <td className="py-2.5 px-2 font-medium">{r.label || r.username || `#${r.id}`}</td>
                <td className="py-2.5 px-2 font-mono text-muted-foreground">{r.phone}</td>
                <td className="py-2.5 px-2 font-semibold">{r.total}</td>
                <td className="py-2.5 px-2 text-emerald-400">{r.ok}</td>
                <td className="py-2.5 px-2 text-rose-400">{r.errors || "—"}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2">
                    <Progress value={delivRate} className="h-1.5 w-20" />
                    <span className="font-medium">{delivRate}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditCampaignDialog({ campaign, open, onClose, onSaved }: {
  campaign: { id: number; name: string; text_template: string; notes?: string };
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [text, setText] = useState(campaign.text_template);
  const [notes, setNotes] = useState(campaign.notes ?? "");
  const updateMut = useUpdateCampaign();

  useEffect(() => {
    setName(campaign.name);
    setText(campaign.text_template);
    setNotes(campaign.notes ?? "");
  }, [campaign]);

  async function handleSave() {
    await updateMut.mutateAsync({ id: campaign.id, data: { name, text_template: text, notes } as any });
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Редактировать кампанию</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Название</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Текст сообщения</Label>
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {["{first_name}", "{username}", "{promo}"].map(v => (
                <button key={v} onClick={() => setText(p => p + v)} className="text-[11px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-mono hover:bg-primary/20">
                  {v}
                </button>
              ))}
            </div>
            <Textarea rows={8} value={text} onChange={e => setText(e.target.value)} className="font-mono text-sm resize-none" />
            <div className="text-[11px] text-muted-foreground">{text.length} симв.</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Заметки / описание</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm resize-none" placeholder="Внутренние заметки (не отправляются)..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" disabled={updateMut.isPending || !name || !text} onClick={handleSave}>
            {updateMut.isPending ? "Сохраняем..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({ campaignId, open, onClose, onSaved }: {
  campaignId: number; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSchedule() {
    if (!scheduledAt) return;
    setBusy(true);
    await fetch(`${API_BASE}/api/campaigns/${campaignId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled", scheduled_at: scheduledAt, scheduled_tag: tag || null }),
    });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Запланировать рассылку</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Дата и время запуска</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Тег аудитории (опционально)</Label>
            <Input placeholder="vip, all, promo..." value={tag} onChange={e => setTag(e.target.value)} className="text-sm" />
            <p className="text-[11px] text-muted-foreground">Если указан — рассылка только по этому тегу</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" disabled={busy || !scheduledAt} onClick={handleSchedule}>
            {busy ? "Планируем..." : "Запланировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id || "0");
  const { data: campaign, isLoading, refetch } = useGetCampaign(id, { query: { refetchInterval: 5_000 } });
  const { data: logs, refetch: refetchLogs } = useListSendLogs(id, { query: { refetchInterval: 5_000 } });
  const updateMut = useUpdateCampaign();
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testChatId, setTestChatId] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function sendTest() {
    if (!testChatId.trim()) return;
    setTestBusy(true); setTestResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/campaigns/${id}/test-send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: testChatId.trim() }),
      });
      const d = await r.json();
      setTestResult(d.ok ? "✓ Тест-запрос отправлен (SSE → бот)" : d.error || "Ошибка");
    } catch { setTestResult("Ошибка сети"); } finally { setTestBusy(false); }
  }

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

  async function toggleStatus() {
    const next = campaign!.status === "running" ? "paused" : "running";
    await updateMut.mutateAsync({ id, data: { status: next } });
    refetch();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/campaigns")}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight truncate">{campaign.name}</h1>
            <button onClick={() => setEditOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <Edit2 size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={(STATUS_VARIANT[campaign.status] as any) || "outline"} className="text-[11px]">
              {campaign.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />}
              {STATUS_LABEL[campaign.status] || campaign.status}
            </Badge>
            {campaign.scheduled_tag && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Tag size={10} /> {campaign.scheduled_tag}
              </span>
            )}
            {campaign.created_at && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={10} /> {campaign.created_at.slice(0, 10)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button size="sm" onClick={toggleStatus}>
              <Play size={13} className="mr-1.5" /> {campaign.status === "draft" ? "Запустить" : "Продолжить"}
            </Button>
          )}
          {campaign.status === "running" && (
            <Button variant="outline" size="sm" onClick={toggleStatus}>
              <Pause size={13} className="mr-1.5" /> Пауза
            </Button>
          )}
          {(campaign.status === "running" || campaign.status === "paused") && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!confirm("Отменить кампанию?")) return;
                await updateMut.mutateAsync({ id, data: { status: "cancelled" } });
                refetch();
              }}>
              Отменить
            </Button>
          )}
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              <Calendar size={13} className="mr-1.5" /> Запланировать
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setTestOpen(true); setTestResult(null); }}>
            <Send size={13} className="mr-1.5" /> Тест
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Progress bar */}
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
              <span className="flex items-center gap-1">
                <Clock size={10} />
                ~{Math.ceil((campaign.target_count - campaign.sent_count) * 2.75 / 60)} мин
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scheduled info */}
      {campaign.status === "scheduled" && campaign.scheduled_at && (
        <div className="bg-secondary/30 border border-border rounded-xl p-5 flex items-center gap-4">
          <Calendar size={28} className="text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Автозапуск запланирован</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              <strong className="text-foreground">{campaign.scheduled_at.slice(0, 16).replace("T", " ")}</strong>
              {campaign.scheduled_tag && <span className="ml-2">• тег: <strong className="text-foreground">{campaign.scheduled_tag}</strong></span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => updateMut.mutate({ id, data: { status: "draft", scheduled_at: null as any } })}>
            Отменить
          </Button>
        </div>
      )}

      {/* Tabs: Logs / Accounts / Template */}
      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <List size={13} /> Лог отправки
            {logs?.length ? <span className="ml-1 text-[10px] bg-secondary rounded-full px-1.5">{logs.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-1.5">
            <BarChart2 size={13} /> По аккаунтам
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-1.5">
            <Settings size={13} /> Шаблон
          </TabsTrigger>
        </TabsList>

        {/* Send logs */}
        <TabsContent value="logs">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-sm">Лог отправки</div>
              <div className="flex items-center gap-3">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11} /> {okLogs} успешно</span>
                  <span className="flex items-center gap-1 text-rose-400"><XCircle size={11} /> {errLogs} ошибок</span>
                </div>
                {logs && logs.length > 0 && (
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => {
                      const rows = [
                        ["id", "chat_id", "username", "first_name", "status", "sent_at", "error"],
                        ...logs.map(l => [l.id, l.chat_id, l.username ?? "", l.first_name ?? "", l.status, l.sent_at ?? "", l.error ?? ""])
                      ];
                      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `logs_campaign_${id}_${new Date().toISOString().slice(0,10)}.csv`;
                      a.click();
                    }}>
                    <Download size={11} className="mr-1" /> CSV
                  </Button>
                )}
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
                            <td className="py-2 px-2 font-medium">
                              <div className="flex items-center gap-1.5">
                                <User size={11} className="text-muted-foreground" />
                                {l.username ? `@${l.username}` : l.first_name || "—"}
                              </div>
                            </td>
                            <td className="py-2 px-2 font-mono text-muted-foreground">{l.chat_id}</td>
                            <td className="py-2 px-2 text-muted-foreground">{l.sent_at?.slice(11, 19)}</td>
                            <td className="py-2 px-2 text-rose-400 max-w-[200px] truncate">{l.error || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </TabsContent>

        {/* Account breakdown */}
        <TabsContent value="accounts">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="font-semibold text-sm mb-4">Разбивка по аккаунтам-отправителям</div>
            <AccountBreakdownTable campaignId={id} />
          </div>
        </TabsContent>

        {/* Template */}
        <TabsContent value="template">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Текст сообщения</div>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit2 size={12} className="mr-1.5" /> Редактировать
              </Button>
            </div>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 rounded-lg p-4 leading-relaxed">
              {campaign.text_template}
            </pre>
            {(campaign as any).notes && (
              <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <StickyNote size={13} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-yellow-400 font-medium mb-0.5">Заметки</div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{(campaign as any).notes}</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <div className="font-semibold text-foreground">{campaign.text_template.length}</div>
                <div>символов</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <div className="font-semibold text-foreground">{campaign.text_template.split("\n").length}</div>
                <div>строк</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <div className="font-semibold text-foreground">{(campaign.text_template.match(/\{[^}]+\}/g) ?? []).length}</div>
                <div>переменных</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {campaign && (
        <EditCampaignDialog
          campaign={campaign as any}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => { refetch(); refetchLogs(); }}
        />
      )}
      <ScheduleDialog
        campaignId={id}
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSaved={() => refetch()}
      />
      {/* Test Send Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Тестовая отправка</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Введите Telegram chat_id получателя. Бот отправит текст кампании этому пользователю.</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Chat ID получателя</Label>
              <Input value={testChatId} onChange={e => setTestChatId(e.target.value)} placeholder="123456789" onKeyDown={e => e.key === "Enter" && sendTest()} />
            </div>
            {testResult && (
              <div className={`text-xs p-2.5 rounded-lg border ${testResult.startsWith("✓") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400"}`}>
                {testResult}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTestOpen(false)}>Закрыть</Button>
            <Button size="sm" disabled={testBusy || !testChatId.trim()} onClick={sendTest}>
              {testBusy ? "Отправляем..." : "Отправить тест"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
