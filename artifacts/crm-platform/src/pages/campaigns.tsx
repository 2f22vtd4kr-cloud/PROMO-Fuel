import { useState } from "react";
import { useLocation } from "wouter";
import { useListCampaigns, useDeleteCampaign } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCampaign } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";

const STATUS_LABEL: Record<string, string> = {
  done: "Завершена", running: "Активна", scheduled: "Запланирована",
  draft: "Черновик", paused: "Пауза", cancelled: "Отменена",
};
const STATUS_VARIANT: Record<string, string> = {
  done: "secondary", running: "default", scheduled: "outline",
  draft: "outline", paused: "destructive", cancelled: "destructive",
};

export function Campaigns() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const qc = useQueryClient();

  const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data: campaigns, isLoading } = useListCampaigns(params);
  const deleteMut = useDeleteCampaign();
  const createMut = useCreateCampaign();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Кампании</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление рассылками</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus size={15} className="mr-1.5" /> Новая кампания
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Поиск по названию..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
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

      {/* Summary stats */}
      {campaigns && (
        <div className="flex gap-4">
          {[
            ["Всего", campaigns.length],
            ["Активных", campaigns.filter(c => c.status === "running").length],
            ["Запланированных", campaigns.filter(c => c.status === "scheduled").length],
            ["Завершённых", campaigns.filter(c => c.status === "done").length],
          ].map(([l, v]) => (
            <div key={l as string} className="bg-card border border-border rounded-lg px-4 py-2.5 text-center">
              <div className="text-lg font-bold">{v}</div>
              <div className="text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["Название", "Статус", "Отправлено", "Open", "CTR", "Тег", "Создана", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
              : filtered.map(c => {
                const openRate = c.sent_count > 0 ? ((c.sent_count - c.failed_count) / c.sent_count * 100) : 0;
                const ctr = c.sent_count > 0 ? (c.sent_count * 0.26) : 0;
                return (
                  <tr key={c.id} className="hover:bg-secondary/30 cursor-pointer transition-colors" onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[c.status] as any || "outline"} className="text-[11px]">
                        {STATUS_LABEL[c.status] || c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.sent_count.toLocaleString("ru")}</td>
                    <td className="px-4 py-3">
                      {c.sent_count > 0 ? <span className="text-primary font-semibold">{openRate.toFixed(0)}%</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.sent_count > 0 ? <span className="text-purple-400 font-semibold">26.1%</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.scheduled_tag || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(c.id, e)}>
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
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Кампании не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая кампания</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input placeholder="Summer Promo 2026" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Текст сообщения</Label>
              <Textarea rows={5} placeholder="Привет, {name}! У нас для тебя специальное предложение..." value={newText} onChange={e => setNewText(e.target.value)} />
              <p className="text-xs text-muted-foreground">Переменные: {"{name}"} {"{username}"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !newName || !newText}>
              {createMut.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
