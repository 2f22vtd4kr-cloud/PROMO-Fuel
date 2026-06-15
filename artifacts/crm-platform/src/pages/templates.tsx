import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Check, Trash2, Edit2, TrendingUp, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const VARIABLES = ["{first_name}", "{username}", "{promo}", "{ref_code}"];

interface Template {
  id: number;
  name: string;
  icon: string;
  text: string;
  tags: string;
  use_count: number;
  created_at: string;
  updated_at: string;
}

function TemplateCard({ tpl, onCopy, onDelete, onEdit }: {
  tpl: Template;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const tags: string[] = JSON.parse(tpl.tags || "[]");
  const vars = tpl.text.match(/\{[^}]+\}/g) ?? [];
  const uniqueVars = [...new Set(vars)];

  function handleCopy() {
    navigator.clipboard.writeText(tpl.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy();
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{tpl.icon}</span>
          <div>
            <div className="font-semibold text-sm">{tpl.name}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp size={10} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{tpl.use_count} использований</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onEdit}>
            <Edit2 size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed bg-secondary/30 rounded-lg p-3 max-h-[120px] overflow-hidden relative">
        {tpl.text}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-secondary/30 to-transparent rounded-b-lg" />
      </pre>

      <div className="flex items-center gap-2 flex-wrap">
        {tags.map(t => (
          <Badge key={t} variant="outline" className="text-[10px] py-0">{t}</Badge>
        ))}
        {uniqueVars.map(v => (
          <span key={v} className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-mono">{v}</span>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleCopy}>
        {copied ? <><Check size={12} className="mr-1.5 text-emerald-400" /> Скопировано!</> : <><Copy size={12} className="mr-1.5" /> Скопировать текст</>}
      </Button>
    </div>
  );
}

function EditTemplateDialog({
  open, template, onClose, onSaved,
}: { open: boolean; template?: Template; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [icon, setIcon] = useState(template?.icon ?? "📝");
  const [text, setText] = useState(template?.text ?? "");
  const [tags, setTags] = useState((template ? JSON.parse(template.tags || "[]") : []).join(", "));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name); setIcon(template.icon);
      setText(template.text); setTags(JSON.parse(template.tags || "[]").join(", "));
    } else {
      setName(""); setIcon("📝"); setText(""); setTags("");
    }
  }, [template]);

  async function handleSave() {
    if (!name.trim() || !text.trim()) return;
    setBusy(true);
    const tagsArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const body = { name: name.trim(), icon: icon.trim() || "📝", text: text.trim(), tags: tagsArr };
    if (template) {
      await fetch(`${API_BASE}/api/templates/${template.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch(`${API_BASE}/api/templates`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{template ? "Редактировать шаблон" : "Новый шаблон"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-3">
            <div className="space-y-1 w-16">
              <Label className="text-xs">Эмодзи</Label>
              <Input value={icon} onChange={e => setIcon(e.target.value)} className="text-center text-xl h-9" maxLength={2} />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Акция, Приглашение..." className="h-9" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Текст сообщения</Label>
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {VARIABLES.map(v => (
                <button key={v} onClick={() => setText(p => p + v)} className="text-[11px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-mono hover:bg-primary/20 transition-colors">
                  {v}
                </button>
              ))}
            </div>
            <Textarea rows={7} value={text} onChange={e => setText(e.target.value)} placeholder="Текст с переменными {first_name}..." className="font-mono text-sm resize-none" />
            <div className="text-[11px] text-muted-foreground">{text.length} символов</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Теги (через запятую)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="promo, sale, event" className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" disabled={busy || !name.trim() || !text.trim()} onClick={handleSave}>
            {busy ? "Сохраняем..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Template | undefined>();
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/templates`);
      setTemplates(await res.json());
    } catch { setTemplates([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function handleDelete(id: number) {
    if (!confirm("Удалить шаблон?")) return;
    await fetch(`${API_BASE}/api/templates/${id}`, { method: "DELETE" });
    fetch_();
  }

  async function handleCopy(id: number) {
    await fetch(`${API_BASE}/api/templates/${id}/use`, { method: "POST" });
    toast({ title: "Скопировано!", description: "Текст шаблона в буфере обмена", duration: 2000 });
    fetch_();
  }

  const allTags = Array.from(new Set(templates.flatMap(t => JSON.parse(t.tags || "[]") as string[])));

  const filtered = templates.filter(t => {
    const matchQ = t.name.toLowerCase().includes(q.toLowerCase()) || t.text.toLowerCase().includes(q.toLowerCase());
    const tags: string[] = JSON.parse(t.tags || "[]");
    const matchTag = tagFilter === "all" || tags.includes(tagFilter);
    return matchQ && matchTag;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Шаблоны сообщений</h1>
          <p className="text-muted-foreground text-sm mt-1">Готовые тексты для рассылок с переменными</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(undefined); setEditOpen(true); }}>
          <Plus size={13} className="mr-1.5" /> Новый шаблон
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Поиск по шаблонам..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTagFilter("all")}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tagFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              Все
            </button>
            {allTags.map(tag => (
              <button key={tag}
                onClick={() => setTagFilter(prev => prev === tag ? "all" : tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tagFilter === tag ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading
        ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl}
                onCopy={() => handleCopy(tpl.id)}
                onDelete={() => handleDelete(tpl.id)}
                onEdit={() => { setEditing(tpl); setEditOpen(true); }}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 py-16 text-center text-muted-foreground">
                <div className="text-4xl mb-3">📭</div>
                <div>Шаблоны не найдены</div>
              </div>
            )}
          </div>
      }

      <EditTemplateDialog
        open={editOpen}
        template={editing}
        onClose={() => setEditOpen(false)}
        onSaved={fetch_}
      />
    </div>
  );
}
