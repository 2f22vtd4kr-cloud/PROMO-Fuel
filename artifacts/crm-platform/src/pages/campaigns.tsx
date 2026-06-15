import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useListCampaigns, useDeleteCampaign, useCreateCampaign, useUpdateCampaign } from "@workspace/api-client-react";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Trash2, ChevronRight, Bold, Italic, Code,
  Hash, Eye, EyeOff, Play, Pause, Copy, Check, Zap
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignSSE } from "@/hooks/use-sse";

const STATUS_LABEL: Record<string, string> = {
  done: "Завершена", running: "Активна", scheduled: "Запланирована",
  draft: "Черновик", paused: "Пауза", cancelled: "Отменена",
};
const STATUS_VARIANT: Record<string, string> = {
  done: "secondary", running: "default", scheduled: "outline",
  draft: "outline", paused: "destructive", cancelled: "destructive",
};

const TEMPLATES = [
  { label: "Акция", icon: "🎉", text: "🎉 Привет, {first_name}!\n\nСпециально для тебя — скидка 20% на всё до конца недели.\n\nПромокод: {promo}\n\n👉 Не упусти шанс!" },
  { label: "Приглашение", icon: "📅", text: "👋 Привет, {first_name}!\n\nПриглашаем тебя на наш закрытый вебинар.\n📅 Суббота, 12:00 МСК\n\nТвой код: {ref_code}\n\nБудем ждать!" },
  { label: "Напоминание", icon: "⏰", text: "⏰ {first_name}, не забудь!\n\nТвоя подписка истекает через 3 дня. Продли сейчас со скидкой 15%.\n\n👇 Нажми чтобы продлить" },
  { label: "Ретаргет", icon: "🔁", text: "👋 {first_name}!\n\nТы смотрел наш продукт, но ещё не приобрёл. Сегодня последний день акции — скидка 30%!\n\n🔗 Забрать скидку" },
  { label: "Анонс", icon: "🚀", text: "🚀 Большие новости, {first_name}!\n\nМы запускаем нечто особенное совсем скоро. Ты в числе первых, кто об этом узнаёт.\n\n📣 Следи за обновлениями!" },
];

const VARIABLES = ["{first_name}", "{username}", "{promo}", "{ref_code}"];

function renderPreview(text: string) {
  return text
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g, '<code style="background:hsl(217 33% 17%);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/\n/g, "<br/>");
}

function MessageEditor({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = before) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || "текст";
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  function insertVariable(v: string) {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    onChange(value.slice(0, pos) + v + value.slice(pos));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + v.length, pos + v.length); }, 0);
  }

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const charCount = value.length;
  const varCount = (value.match(/\{[^}]+\}/g) ?? []).length;

  return (
    <div className="space-y-2">
      {/* Template picker */}
      <div className="flex gap-1.5 flex-wrap">
        {TEMPLATES.map(t => (
          <button key={t.label} onClick={() => onChange(t.text)} className="text-xs px-2.5 py-1 rounded-md border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {[
            { icon: Bold,   tip: "Bold (*text*)",     fn: () => wrap("*") },
            { icon: Italic, tip: "Italic (_text_)",   fn: () => wrap("_") },
            { icon: Code,   tip: "Code (`text`)",     fn: () => wrap("`") },
          ].map(({ icon: Icon, tip, fn }) => (
            <button key={tip} onClick={fn} title={tip} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Icon size={13} />
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border mx-1" />
        <div className="flex items-center gap-1 flex-wrap">
          <Hash size={12} className="text-muted-foreground" />
          {VARIABLES.map(v => (
            <button key={v} onClick={() => insertVariable(v)} className="text-[11px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">
              {v}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Копировать">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          <button onClick={() => setPreview(p => !p)} className={`p-1.5 rounded transition-colors ${preview ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`} title={preview ? "Режим кода" : "Предпросмотр"}>
            {preview ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      {/* Variables */}
      {preview ? (
        <div className="min-h-[160px] bg-secondary/30 border border-border rounded-lg p-3 text-sm leading-relaxed">
          <div className="text-[10px] text-primary font-semibold uppercase tracking-widest mb-2">Preview — вид у получателя</div>
          <div dangerouslySetInnerHTML={{ __html: renderPreview(
            value
              .replace(/\{first_name\}/g, "Иван")
              .replace(/\{username\}/g, "ivan_ru")
              .replace(/\{promo\}/g, "SALE20")
              .replace(/\{ref_code\}/g, "REF-8812")
          ) }} />
        </div>
      ) : (
        <Textarea
          ref={taRef}
          rows={7}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Текст рассылки... Используй *жирный*, _курсив_, `код`"
          className="font-mono text-sm resize-none leading-relaxed"
        />
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span>{charCount} симв.</span>
        <span>{value.split("\n").length} строк</span>
        {varCount > 0 && <span className="text-primary">{varCount} перем.</span>}
        {charCount > 4096 && <span className="text-rose-400 font-semibold">⚠ Превышен лимит TG (4096)</span>}
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Активна
      </span>
    );
  }
  return (
    <Badge variant={(STATUS_VARIANT[status] as any) || "outline"} className="text-[11px]">
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

export function Campaigns() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const qc = useQueryClient();

  useCampaignSSE();

  const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data: campaigns, isLoading } = useListCampaigns(params);
  const deleteMut = useDeleteCampaign();
  const createMut = useCreateCampaign();
  const updateMut = useUpdateCampaign();

  const filtered = (campaigns || []).filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase())
  );

  async function handleCreate() {
    if (!newName.trim() || !newText.trim()) return;
    await createMut.mutateAsync({ data: { name: newName.trim(), text_template: newText.trim() } });
    qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
    setCreateOpen(false);
    setNewName(""); setNewText("");
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Удалить кампанию?")) return;
    await deleteMut.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
  }

  async function handleDuplicate(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/campaigns/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
    }
  }

  async function toggleStatus(id: number, status: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = status === "running" ? "paused" : "running";
    await updateMut.mutateAsync({ id, data: { status: next } });
    qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Кампании</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Управление рассылками
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live SSE
            </span>
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus size={15} className="mr-1.5" /> Новая кампания
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input ref={searchRef} className="pl-9 h-9 text-sm" placeholder="Поиск... [/]" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="draft">Черновики</SelectItem>
            <SelectItem value="running">Активные</SelectItem>
            <SelectItem value="scheduled">Запланированные</SelectItem>
            <SelectItem value="paused">На паузе</SelectItem>
            <SelectItem value="done">Завершённые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {campaigns && (
        <div className="flex gap-3 flex-wrap">
          {[
            ["Всего", campaigns.length, ""],
            ["Активных", campaigns.filter(c => c.status === "running").length, "text-emerald-400"],
            ["Запланированных", campaigns.filter(c => c.status === "scheduled").length, "text-yellow-400"],
            ["Завершённых", campaigns.filter(c => c.status === "done").length, "text-muted-foreground"],
          ].map(([l, v, cls]) => (
            <div key={l as string} className="bg-card border border-border rounded-lg px-4 py-2.5 text-center min-w-[90px]">
              <div className={`text-lg font-bold ${cls}`}>{v}</div>
              <div className="text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["Название", "Статус", "Прогресс", "Отправлено", "Ошибки", "Создана", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
              : filtered.map(c => {
                const pct = c.target_count > 0 ? Math.round((c.sent_count / c.target_count) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-secondary/30 cursor-pointer transition-colors" onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{c.name}</td>
                    <td className="px-4 py-3"><CampaignStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 w-32">
                      {c.target_count > 0
                        ? <div className="space-y-1">
                            <Progress value={pct} className="h-1.5" />
                            <div className="text-[10px] text-muted-foreground">{pct}%</div>
                          </div>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.sent_count.toLocaleString("ru")}</td>
                    <td className="px-4 py-3">
                      {c.failed_count > 0
                        ? <span className="text-rose-400 font-medium">{c.failed_count.toLocaleString("ru")}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(c.status === "running" || c.status === "paused" || c.status === "draft") && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => toggleStatus(c.id, c.status, e)}>
                            {c.status === "running" ? <Pause size={13} /> : <Play size={13} />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Дублировать"
                          onClick={(e) => handleDuplicate(c.id, e)}>
                          <Copy size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(c.id, e)}>
                          <Trash2 size={13} />
                        </Button>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                );
              })
            }
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Кампании не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap size={16} className="text-primary" /> Новая кампания
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="text">
            <TabsList className="mb-4">
              <TabsTrigger value="text">Сообщение</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Название кампании</Label>
                <Input placeholder="Акция декабрь 2024" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Текст сообщения</Label>
                <MessageEditor value={newText} onChange={setNewText} />
              </div>
            </TabsContent>
            <TabsContent value="settings" className="space-y-4 mt-0">
              <div className="bg-secondary/30 border border-border rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Параметры запуска</p>
                <p>Настройка аккаунтов, прокси и расписания доступна на странице кампании после создания.</p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !newName || !newText}>
              {createMut.isPending ? "Создание..." : "Создать кампанию"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
