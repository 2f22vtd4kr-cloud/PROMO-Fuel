import { useState } from "react";
import { useListUsers, useCreateUser, useDeleteUser, useUpdateUser } from "@workspace/api-client-react";
import { getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Tag, User } from "lucide-react";

const TAG_COLORS: Record<string, string> = {
  vip: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  inactive: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  all: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function Audience() {
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const qc = useQueryClient();

  const params = tagFilter !== "all" ? { tag: tagFilter } : undefined;
  const { data: users, isLoading } = useListUsers(params);
  const createMut = useCreateUser();
  const deleteMut = useDeleteUser();
  const updateMut = useUpdateUser();

  const filtered = (users || []).filter(u => {
    if (!q) return true;
    const name = u.username || u.first_name || String(u.chat_id);
    return name.toLowerCase().includes(q.toLowerCase()) || String(u.chat_id).includes(q);
  });

  async function handleAdd() {
    const chatId = parseInt(newId);
    if (!chatId) return;
    const tags = newTag ? JSON.stringify([newTag]) : "[]";
    await createMut.mutateAsync({ data: { chat_id: chatId, first_name: newName || undefined, tags } });
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setAddOpen(false);
    setNewId(""); setNewName(""); setNewTag("");
  }

  async function handleDelete(chatId: number) {
    if (!confirm("Удалить пользователя из аудитории?")) return;
    await deleteMut.mutateAsync({ chatId });
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
  }

  async function handleTagUser(chatId: number, currentTags: string[], tag: string) {
    const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
    await updateMut.mutateAsync({ chatId, data: { tags: JSON.stringify(newTags) } });
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
  }

  // Collect all unique tags
  const allTags = Array.from(new Set((users || []).flatMap(u => parseTags(u.tags))));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аудитория</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление получателями кампаний</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus size={15} className="mr-1.5" /> Добавить
        </Button>
      </div>

      {/* Stats */}
      {users && (
        <div className="flex gap-3">
          {[["Всего", users.length], ...allTags.map(t => [t, users.filter(u => parseTags(u.tags).includes(t)).length])].map(([l, v]) => (
            <div key={l as string} className="bg-card border border-border rounded-lg px-4 py-2.5 text-center min-w-20">
              <div className="text-lg font-bold">{v}</div>
              <div className="text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Поиск по имени или ID..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все теги</SelectItem>
            {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["Пользователь", "Chat ID", "Теги", "Добавлен", "Был онлайн", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
              : filtered.map(u => {
                const tags = parseTags(u.tags);
                const displayName = u.username ? `@${u.username}` : u.first_name || `User ${u.chat_id}`;
                return (
                  <tr key={u.chat_id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User size={13} className="text-primary" />
                        </div>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.chat_id}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.map(t => (
                          <button key={t} onClick={() => handleTagUser(u.chat_id, tags, t)}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition-opacity hover:opacity-70 ${TAG_COLORS[t] || "text-muted-foreground bg-secondary border-border"}`}>
                            {t}
                          </button>
                        ))}
                        {tags.length === 0 && <span className="text-xs text-muted-foreground/50">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.first_seen?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.last_seen?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(u.chat_id)}>
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            }
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Пользователи не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Добавить пользователя</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Telegram Chat ID <span className="text-destructive">*</span></Label>
              <Input placeholder="123456789" value={newId} onChange={e => setNewId(e.target.value)} type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>Имя (опционально)</Label>
              <Input placeholder="Алексей" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Тег (опционально)</Label>
              <Input placeholder="vip" value={newTag} onChange={e => setNewTag(e.target.value)} />
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag size={10} /> Используется для таргетированных рассылок</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={handleAdd} disabled={createMut.isPending || !newId}>
              {createMut.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
