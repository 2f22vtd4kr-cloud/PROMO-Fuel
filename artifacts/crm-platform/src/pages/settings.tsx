import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Settings, Zap, Shield, Clock, RefreshCw,
  Database, BarChart2, AlertTriangle, CheckCircle
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Config {
  daily_limit_per_account: number;
  delay_between_sends_min: number;
  delay_between_sends_max: number;
  batch_size: number;
  flood_wait_multiplier: number;
  max_retries: number;
  sse_poll_interval: number;
}

const DEFAULTS: Config = {
  daily_limit_per_account: 300,
  delay_between_sends_min: 2,
  delay_between_sends_max: 8,
  batch_size: 50,
  flood_wait_multiplier: 1.2,
  max_retries: 3,
  sse_poll_interval: 2,
};

interface StatsSnapshot {
  campaigns: number;
  running: number;
  users: number;
  accounts: number;
  active_accounts: number;
  total_sent: number;
  templates: number;
}

interface DailyStats {
  accounts: Array<{ id: number; label: string; phone: string; username?: string; sent_today: number; sent_total: number; failed_total: number; status: string; is_active: number; is_banned: number }>;
  today_sends: { total: number; ok: number; errors: number };
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold text-sm" style={{ color }}>{value}</span>
    </div>
  );
}

export function SettingsPage() {
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<"ok" | "error" | "loading">("loading");
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const { toast } = useToast();

  const fetchDailyStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats/daily`);
      if (res.ok) setDailyStats(await res.json());
    } catch { }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [camps, users, accounts, templates] = await Promise.all([
        fetch(`${API_BASE}/api/campaigns`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/users`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/accounts`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/templates`).then(r => r.json()).catch(() => []),
      ]);
      setStats({
        campaigns: camps.length,
        running: camps.filter((c: any) => c.status === "running").length,
        users: users.length,
        accounts: accounts.length,
        active_accounts: accounts.filter((a: any) => a.is_active && !a.is_banned).length,
        total_sent: camps.reduce((s: number, c: any) => s + (c.sent_count || 0), 0),
        templates: templates.length,
      });
    } catch { }
    setLoadingStats(false);
  }, []);

  const checkHealth = useCallback(async () => {
    setHealth("loading");
    try {
      const res = await fetch(`${API_BASE}/api/healthz`);
      setHealth(res.ok ? "ok" : "error");
    } catch {
      setHealth("error");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    checkHealth();
    fetchDailyStats();
    const iv = setInterval(fetchDailyStats, 15_000);
    // Load persisted config from localStorage
    const saved = localStorage.getItem("ruprobe_config");
    if (saved) {
      try { setConfig({ ...DEFAULTS, ...JSON.parse(saved) }); } catch { }
    }
    return () => clearInterval(iv);
  }, [fetchStats, checkHealth, fetchDailyStats]);

  function handleChange(key: keyof Config, value: string) {
    setConfig(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }

  function handleSave() {
    setSaving(true);
    localStorage.setItem("ruprobe_config", JSON.stringify(config));
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Настройки сохранены", description: "Конфигурация применена", duration: 2000 });
    }, 400);
  }

  function handleReset() {
    setConfig(DEFAULTS);
    localStorage.removeItem("ruprobe_config");
    toast({ title: "Сброшено", description: "Настройки по умолчанию", duration: 2000 });
  }

  const FIELDS: { key: keyof Config; label: string; description: string; unit: string; min: number; step: number }[] = [
    { key: "daily_limit_per_account", label: "Дневной лимит на аккаунт", description: "Максимум сообщений за 24ч с одного аккаунта", unit: "сообщ.", min: 1, step: 10 },
    { key: "delay_between_sends_min", label: "Мин. задержка между отправками", description: "Минимальное время ожидания между отправками (в секундах)", unit: "сек", min: 0.5, step: 0.5 },
    { key: "delay_between_sends_max", label: "Макс. задержка между отправками", description: "Максимальное время ожидания (случайный диапазон)", unit: "сек", min: 1, step: 0.5 },
    { key: "batch_size", label: "Размер батча", description: "Сколько сообщений отправлять за один проход", unit: "сообщ.", min: 1, step: 5 },
    { key: "flood_wait_multiplier", label: "Flood wait мультипликатор", description: "Множитель к времени ожидания при FloodWait", unit: "x", min: 1, step: 0.1 },
    { key: "max_retries", label: "Максимум повторных попыток", description: "Сколько раз повторить при временной ошибке", unit: "раз", min: 0, step: 1 },
    { key: "sse_poll_interval", label: "Интервал SSE-опроса БД", description: "Как часто API-сервер проверяет БД для SSE-обновлений", unit: "сек", min: 1, step: 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground text-sm mt-1">Конфигурация рассылок и системы</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchStats(); checkHealth(); }}>
            <RefreshCw size={13} className="mr-1.5" /> Обновить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={16} className="text-primary" />
              <span className="font-semibold text-sm">Параметры рассылки</span>
            </div>
            <div className="space-y-5">
              {FIELDS.map(f => (
                <div key={f.key} className="grid grid-cols-2 gap-4 items-start">
                  <div>
                    <Label className="text-sm font-medium">{f.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={f.min}
                      step={f.step}
                      value={config[f.key]}
                      onChange={e => handleChange(f.key, e.target.value)}
                      className="h-8 text-sm max-w-[100px]"
                    />
                    <span className="text-xs text-muted-foreground">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-border">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить настройки"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                По умолчанию
              </Button>
            </div>
          </div>

          {/* Rate estimator */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-muted-foreground" />
              <span className="font-semibold text-sm">Расчёт производительности</span>
            </div>
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Скорость (1 акк.)",
                    value: `~${Math.round(3600 / ((config.delay_between_sends_min + config.delay_between_sends_max) / 2))} сообщ./ч`,
                    color: "hsl(224 76% 55%)",
                  },
                  {
                    label: "Скорость (все акк.)",
                    value: `~${Math.round(stats.active_accounts * 3600 / ((config.delay_between_sends_min + config.delay_between_sends_max) / 2)).toLocaleString("ru")} сообщ./ч`,
                    color: "hsl(160 60% 45%)",
                  },
                  {
                    label: "Дневная ёмкость",
                    value: `~${(stats.active_accounts * config.daily_limit_per_account).toLocaleString("ru")} сообщ.`,
                    color: "hsl(40 90% 55%)",
                  },
                ].map(m => (
                  <div key={m.label} className="bg-secondary/30 rounded-lg p-3">
                    <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: stats + health */}
        <div className="space-y-4">
          {/* API Health */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={16} className="text-muted-foreground" />
              <span className="font-semibold text-sm">Состояние системы</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${health === "ok" ? "bg-emerald-400" : health === "error" ? "bg-rose-400" : "bg-yellow-400"} ${health !== "loading" ? "animate-none" : "animate-pulse"}`} />
              <div>
                <div className="font-medium text-sm">{health === "ok" ? "API Server Online" : health === "error" ? "API Server Offline" : "Проверяем..."}</div>
                <div className="text-xs text-muted-foreground">{API_BASE || "localhost:8080"}</div>
              </div>
              {health === "ok" ? <CheckCircle size={14} className="ml-auto text-emerald-400" /> : health === "error" ? <AlertTriangle size={14} className="ml-auto text-rose-400" /> : null}
            </div>
          </div>

          {/* DB Stats */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-muted-foreground" />
              <span className="font-semibold text-sm">Статистика БД</span>
            </div>
            {loadingStats
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1 rounded" />)
              : stats && (
                <>
                  <StatRow label="Кампаний" value={stats.campaigns} />
                  <StatRow label="Активных кампаний" value={stats.running} color="hsl(160 60% 45%)" />
                  <StatRow label="Аудитория" value={stats.users.toLocaleString("ru")} />
                  <StatRow label="Аккаунтов" value={stats.accounts} />
                  <StatRow label="Активных аккаунтов" value={stats.active_accounts} color="hsl(160 60% 45%)" />
                  <StatRow label="Всего отправлено" value={stats.total_sent.toLocaleString("ru")} color="hsl(224 76% 55%)" />
                  <StatRow label="Шаблонов" value={stats.templates} />
                </>
              )
            }
          </div>

          {/* Daily Stats */}
          {dailyStats && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">Активность сегодня</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400 font-medium">{dailyStats.today_sends?.ok ?? 0} ✓</span>
                  {(dailyStats.today_sends?.errors ?? 0) > 0 && <span className="text-rose-400 font-medium">{dailyStats.today_sends.errors} ✗</span>}
                  <span className="text-muted-foreground">{dailyStats.today_sends?.total ?? 0} всего</span>
                </div>
              </div>
              <div className="space-y-2">
                {dailyStats.accounts.filter(a => a.sent_today > 0 || a.is_active).slice(0, 8).map(a => {
                  const pct = Math.min((a.sent_today / 300) * 100, 100);
                  const color = a.is_banned ? "hsl(0 62% 55%)" : pct > 90 ? "hsl(0 62% 55%)" : pct > 70 ? "hsl(40 90% 55%)" : "hsl(160 60% 45%)";
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground w-28 truncate flex-shrink-0">{a.label || a.phone}</div>
                      <div className="flex-1 min-w-0">
                        <Progress value={pct} className="h-1.5" style={{ "--progress-fg": color } as React.CSSProperties} />
                      </div>
                      <div className="text-xs font-medium w-16 text-right flex-shrink-0" style={{ color }}>{a.sent_today} / 300</div>
                    </div>
                  );
                })}
                {dailyStats.accounts.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-2">Нет активных аккаунтов</div>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-secondary/20 border border-border rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                Настройки задержек хранятся локально и используются Python-скриптом рассылки.
                Изменение лимитов вступает в силу при следующем запуске кампании.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
