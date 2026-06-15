import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ShieldCheck, ShieldOff, Activity, WifiOff, AlertTriangle,
  Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, Send,
  Phone, User, Globe, Clock, CheckCircle
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface SenderAccount {
  id: number;
  label: string;
  phone: string;
  telegram_id?: number;
  username?: string;
  session_file?: string;
  proxy?: string;
  status: string;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  last_error?: string;
  last_used_at?: string;
  is_banned: number;
  is_active: number;
  created_at: string;
}

const DAILY_LIMIT = 300;

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  idle:       { label: "Готов",        color: "hsl(160 60% 45%)", bg: "hsl(160 60% 45% / 0.12)", icon: ShieldCheck },
  sending:    { label: "Отправляет",   color: "hsl(224 76% 55%)", bg: "hsl(224 76% 55% / 0.12)", icon: Activity },
  flood_wait: { label: "FloodWait",    color: "hsl(40 90% 55%)",  bg: "hsl(40 90% 55% / 0.12)",  icon: AlertTriangle },
  banned:     { label: "Заблокирован", color: "hsl(0 62% 55%)",   bg: "hsl(0 62% 55% / 0.12)",   icon: ShieldOff },
  offline:    { label: "Офлайн",       color: "hsl(215 20% 45%)", bg: "hsl(215 20% 45% / 0.12)", icon: WifiOff },
};

function StatusBadge({ status, is_banned, is_active }: { status: string; is_banned: number; is_active: number }) {
  const resolved = is_banned ? "banned" : !is_active ? "offline" : status;
  const meta = STATUS_META[resolved] ?? STATUS_META.offline;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
      style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}33` }}>
      {resolved === "sending" && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: meta.color }} />}
      {resolved !== "sending" && <Icon size={11} />}
      {meta.label}
    </span>
  );
}

function AccountHistory({ accId }: { accId: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/accounts/${accId}/logs`)
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accId]);

  if (loading) return <Skeleton className="h-20 w-full rounded-lg" />;
  if (!logs.length) return (
    <div className="text-xs text-muted-foreground text-center py-3 bg-secondary/20 rounded-lg">Нет истории отправок</div>
  );

  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-2">История отправок (последние {logs.length})</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {["", "Кампания", "Пользователь", "Время", "Статус"].map(h => (
                <th key={h} className="pb-1.5 text-left font-medium px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.slice(0, 8).map((l: any) => {
              const ok = l.status === "ok" || l.status?.startsWith("ok");
              return (
                <tr key={l.id} className="hover:bg-secondary/20">
                  <td className="py-1.5 px-2">
                    {ok ? <CheckCircle size={11} className="text-emerald-400" /> : <AlertTriangle size={11} className="text-rose-400" />}
                  </td>
                  <td className="py-1.5 px-2 max-w-[120px] truncate text-muted-foreground">{l.campaign_name || "—"}</td>
                  <td className="py-1.5 px-2 text-muted-foreground">{l.username ? `@${l.username}` : l.first_name || l.chat_id}</td>
                  <td className="py-1.5 px-2 text-muted-foreground">{l.sent_at?.slice(11, 19)}</td>
                  <td className="py-1.5 px-2">{ok ? <span className="text-emerald-400">OK</span> : <span className="text-rose-400 truncate max-w-[100px]">{l.error || "ошибка"}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountRow({ acc, onRefresh }: { acc: SenderAccount; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const dailyPct = Math.min((acc.sent_today / DAILY_LIMIT) * 100, 100);
  const barColor = dailyPct > 90 ? "hsl(0 62% 55%)" : dailyPct > 70 ? "hsl(40 90% 55%)" : "hsl(160 60% 45%)";
  const delivRate = acc.sent_total > 0 ? ((acc.sent_total - acc.failed_total) / acc.sent_total * 100).toFixed(0) : "—";

  async function patchAccount(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`${API_BASE}/api/accounts/${acc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onRefresh();
    setBusy(false);
  }

  async function deleteAccount() {
    if (!confirm(`Удалить аккаунт ${acc.label || acc.phone}?`)) return;
    await fetch(`${API_BASE}/api/accounts/${acc.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-2 transition-all">
      <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: STATUS_META[acc.is_banned ? "banned" : !acc.is_active ? "offline" : acc.status]?.bg ?? "hsl(215 20% 20%)" }}>
            <User size={18} style={{ color: STATUS_META[acc.is_banned ? "banned" : !acc.is_active ? "offline" : acc.status]?.color }} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
            style={{ background: STATUS_META[acc.is_banned ? "banned" : !acc.is_active ? "offline" : acc.status]?.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{acc.label || "Без названия"}</span>
            {acc.username && <span className="text-xs text-primary">@{acc.username}</span>}
            {acc.telegram_id && <span className="text-xs text-muted-foreground font-mono">{acc.telegram_id}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{acc.phone}</span>
          </div>
        </div>

        {/* Status + daily */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground mb-1">{acc.sent_today} / {DAILY_LIMIT} сег.</div>
            <Progress value={dailyPct} className="h-1.5 w-24" style={{ "--progress-fg": barColor } as React.CSSProperties} />
          </div>
          <StatusBadge status={acc.status} is_banned={acc.is_banned} is_active={acc.is_active} />
          {expanded ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Отправлено всего", value: acc.sent_total.toLocaleString("ru"), icon: Send, color: "hsl(224 76% 55%)" },
              { label: "Ошибок", value: acc.failed_total.toLocaleString("ru"), icon: AlertTriangle, color: acc.failed_total > 0 ? "hsl(0 62% 55%)" : "hsl(215 20% 45%)" },
              { label: "Доставка", value: `${delivRate}%`, icon: ShieldCheck, color: "hsl(160 60% 45%)" },
              { label: "Сегодня", value: acc.sent_today.toString(), icon: Clock, color: "hsl(40 90% 55%)" },
            ].map(m => (
              <div key={m.label} className="bg-secondary/30 border border-border rounded-lg p-3 flex flex-col gap-1.5">
                <m.icon size={14} style={{ color: m.color }} />
                <div className="text-lg font-bold">{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {acc.proxy && (
              <div className="flex items-start gap-2">
                <Globe size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Прокси</div><div className="font-medium text-xs mt-0.5">{acc.proxy}</div></div>
              </div>
            )}
            {acc.session_file && (
              <div className="flex items-start gap-2">
                <ShieldCheck size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Сессия</div><div className="font-medium text-xs mt-0.5 font-mono">{acc.session_file}</div></div>
              </div>
            )}
            {acc.last_used_at && (
              <div className="flex items-start gap-2">
                <Clock size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Последнее использование</div><div className="font-medium text-xs mt-0.5">{acc.last_used_at.slice(0, 16).replace("T", " ")}</div></div>
              </div>
            )}
            {acc.last_error && (
              <div className="col-span-2 flex items-start gap-2">
                <AlertTriangle size={13} className="text-rose-400 mt-0.5 flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Последняя ошибка</div><div className="text-xs mt-0.5 text-rose-400 font-mono">{acc.last_error}</div></div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {acc.is_active && !acc.is_banned && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => patchAccount({ is_active: 0, status: "offline" })}>
                Деактивировать
              </Button>
            )}
            {!acc.is_active && !acc.is_banned && (
              <Button size="sm" disabled={busy} onClick={() => patchAccount({ is_active: 1, status: "idle" })}>
                Активировать
              </Button>
            )}
            {acc.is_banned && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => patchAccount({ is_banned: 0, status: "idle", is_active: 1 })}>
                Снять бан
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => patchAccount({ sent_today: 0 })}>
              Сброс дневного лимита
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" disabled={busy} onClick={deleteAccount}>
              <Trash2 size={13} className="mr-1" /> Удалить
            </Button>
          </div>

          {/* Send History */}
          <AccountHistory accId={acc.id} />
        </div>
      )}
    </div>
  );
}

function AddAccountDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ phone: "", label: "", username: "", telegram_id: "", proxy: "", session_file: "" });
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!form.phone.trim()) return;
    setBusy(true);
    await fetch(`${API_BASE}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: form.phone.trim(),
        label: form.label.trim(),
        username: form.username.trim() || undefined,
        telegram_id: form.telegram_id ? parseInt(form.telegram_id) : undefined,
        proxy: form.proxy.trim() || undefined,
        session_file: form.session_file.trim() || undefined,
      }),
    });
    setBusy(false);
    setForm({ phone: "", label: "", username: "", telegram_id: "", proxy: "", session_file: "" });
    onCreated();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить аккаунт-отправитель</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { key: "phone", label: "Номер телефона *", placeholder: "+7 916 123 4567" },
            { key: "label", label: "Метка (название)", placeholder: "Основной аккаунт" },
            { key: "username", label: "Username", placeholder: "ru_sender_1" },
            { key: "telegram_id", label: "Telegram ID", placeholder: "123456789" },
            { key: "proxy", label: "Прокси (SOCKS5)", placeholder: "socks5://user:pass@host:port" },
            { key: "session_file", label: "Файл сессии", placeholder: "session_ru_1.session" },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                className="h-8 text-sm"
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" disabled={busy || !form.phone.trim()} onClick={handleSubmit}>
            {busy ? "Сохраняем..." : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts`);
      setAccounts(await res.json());
    } catch { setAccounts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const active = accounts.filter(a => a.is_active && !a.is_banned);
  const sending = accounts.filter(a => a.status === "sending");
  const banned = accounts.filter(a => a.is_banned);
  const totalSentToday = accounts.reduce((s, a) => s + a.sent_today, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аккаунты-отправители</h1>
          <p className="text-muted-foreground text-sm mt-1">Userbot аккаунты для рассылки через Telethon</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            await fetch(`${API_BASE}/api/accounts/reset-all-daily`, { method: "POST" });
            fetchAccounts();
          }}>
            Сброс всех лимитов
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAccounts}>
            <RefreshCw size={13} className="mr-1.5" /> Обновить
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={13} className="mr-1.5" /> Добавить аккаунт
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Активных", value: active.length, color: "hsl(160 60% 45%)" },
          { label: "Отправляют", value: sending.length, color: "hsl(224 76% 55%)" },
          { label: "Заблокировано", value: banned.length, color: "hsl(0 62% 55%)" },
          { label: "Отправлено сегодня", value: totalSentToday.toLocaleString("ru"), color: "hsl(40 90% 55%)" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Account list */}
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl mb-2" />)
        : accounts.length === 0
          ? (
            <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-4 text-center">
              <ShieldCheck size={40} className="text-muted-foreground/40" />
              <div>
                <div className="font-semibold">Нет аккаунтов</div>
                <div className="text-sm text-muted-foreground mt-1">Добавьте первый аккаунт-отправитель для рассылок</div>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={13} className="mr-1.5" /> Добавить аккаунт</Button>
            </div>
          )
          : accounts.map(acc => (
            <AccountRow key={acc.id} acc={acc} onRefresh={fetchAccounts} />
          ))
      }

      <AddAccountDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchAccounts} />
    </div>
  );
}
