import { useState, useRef, useEffect } from "react";
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
import { Plus, Search, Trash2, Tag, User, Download, Upload } from "lucide-react";

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
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTag, setBulkTag] = useState("");
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

  function toggleSelect(chatId: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u.chat_id)));
    }
  }

  async function handleBulkTag() {
    if (!bulkTag.trim() || selected.size === 0) return;
    const tag = bulkTag.trim();
    for (const chatId of selected) {
      const user = (users || []).find(u => u.chat_id === chatId);
      if (!user) continue;
      const tags = parseTags(user.tags);
      if (!tags.includes(tag)) {
        await updateMut.mutateAsync({ chatId, data: { tags: JSON.stringify([...tags, tag]) } });
      }
    }
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setSelected(new Set());
    setBulkTag("");
  }

  async function handleBulkDelete() {
    if (!confirm(`Удалить ${selected.size} пользователей?`)) return;
    for (const chatId of selected) {
      await deleteMut.mutateAsync({ chatId });
    }
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setSelected(new Set());
  }

  // Collect all unique tags
  const allTags = Array.from(new Set((users || []).flatMap(u => parseTags(u.tags))));

  function exportCSV() {
    if (!users?.length) return;
    const rows = [
      ["chat_id", "username", "first_name", "tags", "first_seen", "last_seen"],
      ...(users || []).map(u => [
        u.chat_id,
        u.username ?? "",
        u.first_name ?? "",
        parseTags(u.tags).join(";"),
        u.first_seen?.slice(0, 10) ?? "",
        u.last_seen?.slice(0, 10) ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audience_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1); // skip header
    let added = 0;
    for (const line of lines) {
      const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
      const [chatIdStr, username, first_name, tagsRaw] = cols;
      const chatId = parseInt(chatIdStr);
      if (!chatId || isNaN(chatId)) continue;
      const tags = tagsRaw ? JSON.stringify(tagsRaw.split(";").filter(Boolean)) : "[]";
      try {
        await createMut.mutateAsync({ data: { chat_id: chatId, username: username || undefined, first_name: first_name || undefined, tags } });
        added++;
      } catch { }
    }
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    alert(`Импортировано: ${added} пользователей`);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аудитория</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление получателями кампаний</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!users?.length}>
            <Download size={13} className="mr-1.5" /> Экспорт CSV
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span><Upload size={13} className="mr-1.5" /> Импорт CSV</span>
            </Button>
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus size={15} className="mr-1.5" /> Добавить
          </Button>
        </div>
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
          <Input ref={searchRef} className="pl-9 h-9 text-sm" placeholder="Поиск по имени или ID... [/]" value={q} onChange={e => setQ(e.target.value)} />
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

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-medium text-primary">{selected.size} выбрано</span>
          <div className="flex items-center gap-2 ml-auto">
            <Input
              className="h-7 text-xs w-32"
              placeholder="Тег..."
              value={bulkTag}
              onChange={e => setBulkTag(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleBulkTag(); }}
            />
            <Button size="sm" className="h-7 text-xs" disabled={!bulkTag.trim()} onClick={handleBulkTag}>
              <Tag size={11} className="mr-1" /> Добавить тег
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleBulkDelete}>
              <Trash2 size={11} className="mr-1" /> Удалить
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
              Отменить
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-3 text-left w-8">
                <input type="checkbox" className="rounded"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              {["Пользователь", "Chat ID", "Теги", "Добавлен", "Был онлайн", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
              : filtered.map(u => {
                const tags = parseTags(u.tags);
                const displayName = u.username ? `@${u.username}` : u.first_name || `User ${u.chat_id}`;
                const isSelected = selected.has(u.chat_id);
                return (
                  <tr key={u.chat_id} className={`hover:bg-secondary/20 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" checked={isSelected} onChange={() => toggleSelect(u.chat_id)} />
                    </td>
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Пользователи не найдены</td></tr>
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
