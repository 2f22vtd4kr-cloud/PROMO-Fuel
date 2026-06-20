import { useState, useEffect, useCallback, useRef } from "react";
import { Cpu, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, Activity, ListTodo, Calendar, Plus, Zap, Shield, Phone } from "lucide-react";
import { api, BroadcastWorker, Task, WorkersSummary, GroupCampaign, SenderAccount, RecoverLocksResult } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const STATUS_COLOR: Record<string, string> = {
  idle:         "#2de897",
  working:      "#6ba8e5",
  sending:      "#6ba8e5",
  broadcasting: "#6ba8e5",
  stopped:      "#7c8db0",
  dead:         "#ff6b7a",
  pending:      "#ffc946",
  claimed:      "#6ba8e5",
  done:         "#2de897",
  failed:       "#ff6b7a",
  cancelled:    "#7c8db0",
  banned:       "#ff6b7a",
  proxy_failed: "#ff6b7a",
  flood_wait:   "#ffc946",
};

function statusColor(s: string) {
  return STATUS_COLOR[s] ?? "#7c8db0";
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  return `${Math.floor(diff / 3600)}ч назад`;
}

function uptime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}с`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
}

/** Animated heartbeat dot — pulses green for alive workers */
function HeartbeatDot({ alive, working }: { alive: boolean; working: boolean }) {
  const color = !alive ? "#ff6b7a" : working ? "#6ba8e5" : "#2de897";
  return (
    <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, opacity: alive ? 1 : 0.5,
      }} />
      {alive && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: "50%",
          border: `2px solid ${color}`,
          animation: "hb-ring 1.8s ease-out infinite",
        }} />
      )}
    </div>
  );
}

function WorkerCard({ worker, onDelete }: { worker: BroadcastWorker; onDelete: () => void }) {
  const [busy, setBusy] = useState(false);
  const alive   = worker.is_alive ?? false;
  const working = alive && worker.status === "working";
  const color   = alive ? statusColor(worker.status) : "#ff6b7a";
  const glow    = alive ? `${color}30` : "rgba(255,107,122,0.20)";

  async function remove() {
    haptic.warning(); setBusy(true);
    try { await api.deleteWorker(worker.worker_id); haptic.success(); onDelete(); }
    catch { haptic.error(); setBusy(false); }
  }

  return (
    <GlassCard glow={glow} style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <HeartbeatDot alive={alive} working={working} />
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Cpu size={14} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>{worker.worker_id}</div>
          <div style={{ fontSize: 10, color: TG.muted }}>
            {worker.pid ? `PID ${worker.pid}` : "—"}
            {worker.started_at && alive && (
              <span style={{ marginLeft: 6 }}>⏱ {uptime(worker.started_at)}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: "2px 8px" }}>
            {alive ? worker.status : "dead"}
          </span>
          {(!alive || worker.status === "stopped") && (
            <button onClick={remove} disabled={busy} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1 }}>
              <Trash2 size={12} color="#ff6b7a" />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[
          { label: "Выполнено", value: String(worker.tasks_done),    color: "#2de897" },
          { label: "Ошибок",    value: String(worker.tasks_failed),  color: "#ff6b7a" },
          { label: "Пульс",     value: worker.last_heartbeat ? timeAgo(worker.last_heartbeat) : "—", color: alive ? "#6ba8e5" : "#ff6b7a" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 4px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {worker.current_task && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#6ba8e5", display: "flex", alignItems: "center", gap: 4 }}>
          <Activity size={10} />
          Задача #{worker.current_task}
        </div>
      )}
      {worker.last_error && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#ff6b7a", background: "rgba(255,107,122,0.08)", borderRadius: 8, padding: "6px 8px", wordBreak: "break-word" }}>
          {worker.last_error}
        </div>
      )}
      {!alive && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <button onClick={() => { navigator.clipboard?.writeText(`python worker.py ${worker.worker_id}`).catch(() => {}); haptic.light(); }}
            style={{ fontSize: 9, color: "#6ba8e5", background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.2)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontFamily: "monospace" }}>
            📋 python worker.py {worker.worker_id}
          </button>
        </div>
      )}
    </GlassCard>
  );
}

function TaskRow({ task, onAction }: { task: Task; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const color = statusColor(task.status);

  async function retry() {
    haptic.medium(); setBusy(true);
    try { await api.retryTask(task.id); haptic.success(); onAction(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  async function cancel() {
    haptic.warning(); setBusy(true);
    try { await api.cancelTask(task.id); haptic.success(); onAction(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
      <span style={{ fontSize: 10, color, background: `${color}18`, borderRadius: 20, padding: "2px 7px", fontWeight: 700, flexShrink: 0 }}>{task.status}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: TG.text }}>#{task.id} — кампания {task.campaign_id}{task.worker_id && task.status === "claimed" ? <span style={{ color: "#ffc946", fontSize: 10, marginLeft: 5 }}>@ {task.worker_id}</span> : null}</div>
        {task.scheduled_at && task.status === "pending" && (() => {
          const diff = Math.floor((new Date(task.scheduled_at!).getTime() - Date.now()) / 1000);
          if (diff > 5) return <div style={{ fontSize: 10, color: "#ffc946" }}>⏰ через {formatCountdown(task.scheduled_at)}</div>;
          return null;
        })()}
        {task.error && <div style={{ fontSize: 10, color: "#ff6b7a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.error}</div>}
      </div>
      <div style={{ fontSize: 9, color: TG.muted, flexShrink: 0 }}>{task.attempts}/{task.max_attempts}</div>
      {(task.status === "failed" || task.status === "dead") && (
        <button onClick={retry} disabled={busy} style={{ fontSize: 10, color: "#6ba8e5", background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.3)", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
          Повтор
        </button>
      )}
      {(task.status === "pending" || task.status === "claimed") && (
        <button onClick={cancel} disabled={busy} style={{ fontSize: 10, color: "#ff6b7a", background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
          Отмена
        </button>
      )}
    </div>
  );
}

function formatCountdown(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  const diff = Math.floor((new Date(isoStr).getTime() - Date.now()) / 1000);
  if (diff <= 0) return "сейчас";
  if (diff < 60)   return `${diff}с`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м ${diff % 60}с`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}ч ${m}м`;
}

function ScheduledCampaignRow({ c }: { c: GroupCampaign }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const color = c.status === "running" ? "#2de897" : c.status === "paused" ? "#ffc946" : "#7c8db0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#c8d8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
        <div style={{ fontSize: 10, color: "#7c8db0", marginTop: 1 }}>
          {c.sent_count} отправлено · {c.failed_count} ошибок
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.next_send_at ? "#ffc946" : "#7c8db0" }}>
          {formatCountdown(c.next_send_at)}
        </div>
        <div style={{ fontSize: 9, color: "#7c8db0" }}>следующая</div>
      </div>
    </div>
  );
}

/** Spawn worker button — calls POST /workers/spawn */
function SpawnWorkerButton({ onSpawned }: { onSpawned: () => void }) {
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Запустить воркер");

  async function spawn() {
    haptic.medium();
    setBusy(true);
    setLabel("Запуск…");
    try {
      const result = await api.spawnWorker();
      haptic.success();
      setLabel(`✓ ${result.worker_id} запущен`);
      setTimeout(() => setLabel("Запустить воркер"), 3000);
      onSpawned();
    } catch {
      haptic.error();
      setLabel("Ошибка запуска");
      setTimeout(() => setLabel("Запустить воркер"), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={spawn} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 12, background: busy ? "rgba(45,232,151,0.07)" : "rgba(45,232,151,0.13)", border: "1px solid rgba(45,232,151,0.35)", color: "#2de897", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, transition: "opacity 0.2s" }}>
      {busy ? <Zap size={13} color="#2de897" /> : <Plus size={13} color="#2de897" />}
      {label}
    </button>
  );
}

/** Recover Stale Locks button — calls POST /workers/recover-locks */
function RecoverLocksButton({ onDone }: { onDone: () => void }) {
  const [busy,   setBusy]   = useState(false);
  const [result, setResult] = useState<RecoverLocksResult | null>(null);

  async function recover() {
    haptic.medium();
    setBusy(true);
    try {
      const r = await api.recoverLocks();
      haptic.success();
      setResult(r);
      onDone();
      setTimeout(() => setResult(null), 5000);
    } catch {
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={recover} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px 14px", borderRadius: 12, background: busy ? "rgba(255,201,70,0.05)" : "rgba(255,201,70,0.10)", border: "1px solid rgba(255,201,70,0.30)", color: "#ffc946", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <Shield size={13} color="#ffc946" />
        {busy ? "Освобождаем блокировки…" : "🔓 Освободить застрявшие блокировки"}
      </button>
      {result && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#ffc946", background: "rgba(255,201,70,0.08)", border: "1px solid rgba(255,201,70,0.20)", borderRadius: 10, padding: "8px 12px" }}>
          ✓ Освобождено аккаунтов: <b>{result.released_accounts}</b> · Сброшено задач: <b>{result.reset_tasks}</b>
          {result.stale.length > 0 && (
            <div style={{ marginTop: 4, color: TG.muted }}>
              {result.stale.map(s => `${s.phone} (→ ${s.locked_by})`).join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Account row — color-coded by status */
function AccountRow({ account }: { account: SenderAccount }) {
  const st = account.status;
  const locked = !!account.locked_by;
  const color  = st === "idle" && !locked
    ? "#2de897"       // green — available
    : locked || st === "broadcasting" || st === "sending"
    ? "#ffc946"       // yellow — locked
    : "#ff6b7a";      // red — banned / proxy_failed / etc.

  const rowBg = st === "idle" && !locked
    ? "rgba(45,232,151,0.04)"
    : locked || st === "broadcasting"
    ? "rgba(255,201,70,0.05)"
    : "rgba(255,107,122,0.06)";

  // Parse first proxy from the proxies field for display
  let proxyDisplay = "—";
  try {
    const p = account.proxy || account.proxies;
    if (p) {
      const parsed = typeof p === "string" && p.startsWith("[") ? JSON.parse(p)[0] : p;
      if (parsed?.host) proxyDisplay = `${parsed.host}:${parsed.port}`;
      else if (typeof p === "string" && p.includes("://")) proxyDisplay = p.split("@").pop()?.split("://")[1] ?? p;
    }
  } catch {}

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: rowBg, border: `1px solid ${color}25`, marginBottom: 4 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <Phone size={11} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: TG.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {account.phone}
          {account.label ? <span style={{ marginLeft: 5, fontSize: 10, color: TG.muted }}>({account.label})</span> : null}
        </div>
        <div style={{ fontSize: 10, color: TG.muted, marginTop: 1 }}>
          {locked
            ? <span style={{ color: "#ffc946" }}>🔒 {account.locked_by}</span>
            : <span style={{ color: "#2de897" }}>свободен</span>
          }
          {proxyDisplay !== "—" && (
            <span style={{ marginLeft: 8 }}>🌐 {proxyDisplay}
              {account.proxy_index !== undefined && account.proxy_index > 0
                ? <span style={{ opacity: 0.6 }}> [#{account.proxy_index}]</span>
                : null
              }
            </span>
          )}
          {account.last_used_at && (
            <span style={{ marginLeft: 8, opacity: 0.7 }}>{timeAgo(account.last_used_at)}</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 7px", flexShrink: 0 }}>
        {account.broadcasting ? "⚡ live" : st}
      </span>
    </div>
  );
}

export function WorkersPage() {
  const [workers,   setWorkers]   = useState<BroadcastWorker[]>([]);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [summary,   setSummary]   = useState<WorkersSummary | null>(null);
  const [scheduled, setScheduled] = useState<GroupCampaign[]>([]);
  const [accounts,  setAccounts]  = useState<SenderAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [taskTab,   setTaskTab]   = useState<"all" | "pending" | "claimed" | "failed">("all");
  const [showAccounts, setShowAccounts] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, t, s, gc, accts] = await Promise.all([
        api.getWorkers(),
        api.getTasks(),
        api.getWorkersSummary(),
        api.getGroupCampaigns(),
        api.getAccounts(),
      ]);
      setWorkers(w);
      setTasks(t);
      setSummary(s);
      setAccounts(accts);
      setScheduled(gc.filter(c => c.status === "running" || c.status === "paused").sort((a, b) => {
        if (!a.next_send_at) return 1;
        if (!b.next_send_at) return -1;
        return new Date(a.next_send_at).getTime() - new Date(b.next_send_at).getTime();
      }));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 10_000);  // 10-second refresh per spec
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const filteredTasks = taskTab === "all" ? tasks.slice(0, 50)
    : tasks.filter(t => t.status === taskTab).slice(0, 50);

  const aliveWorkers = workers.filter(w => w.is_alive);
  const deadWorkers  = workers.filter(w => !w.is_alive);
  const lockedAccounts = accounts.filter(a => a.locked_by);

  return (
    <>
      {/* Heartbeat pulse keyframe — injected once */}
      <style>{`
        @keyframes hb-ring {
          0%   { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0;   transform: scale(2.4); }
        }
      `}</style>

      <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 100px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>
              Воркеры
              {aliveWorkers.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: "#2de897" }}>
                  {aliveWorkers.length} активных
                </span>
              )}
            </div>
            <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.light(); load(); }}>
              <RefreshCw size={14} color="#6ba8e5" />
            </GlassCard>
          </div>

          {/* Summary grid */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
              {[
                { label: "Живых",   value: summary.alive_workers,                       color: "#2de897" },
                { label: "Очередь", value: summary.tasks_pending,                       color: "#ffc946" },
                { label: "Готово",  value: summary.tasks_done,                          color: "#6ba8e5" },
                { label: "Ошибок",  value: summary.tasks_failed + summary.tasks_dead,   color: "#ff6b7a" },
              ].map(s => (
                <GlassCard key={s.label} style={{ padding: "10px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
                </GlassCard>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(107,168,229,0.4)", borderTopColor: "#6ba8e5", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : (
            <>
              {/* Active workers */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                  Активные воркеры {aliveWorkers.length > 0 && `(${aliveWorkers.length})`}
                </div>
                {aliveWorkers.length === 0 ? (
                  <GlassCard style={{ padding: "20px 16px", textAlign: "center" }}>
                    <AlertTriangle size={20} color="#ffc946" style={{ marginBottom: 8, opacity: 0.7 }} />
                    <div style={{ fontSize: 13, color: TG.muted }}>Нет активных воркеров</div>
                    <div style={{ fontSize: 11, color: TG.textSecondary, marginTop: 6, lineHeight: 1.5 }}>
                      Нажми «Запустить воркер» ↓ или выполни команду в терминале
                    </div>
                  </GlassCard>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {aliveWorkers.map(w => <WorkerCard key={w.worker_id} worker={w} onDelete={load} />)}
                  </div>
                )}
              </div>

              {/* Spawn + Recover buttons row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SpawnWorkerButton onSpawned={() => { setTimeout(load, 2000); }} />
                <RecoverLocksButton onDone={load} />
              </div>

              {/* Accounts panel */}
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: "pointer" }}
                  onClick={() => { haptic.light(); setShowAccounts(v => !v); }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={12} />
                    Аккаунты ({accounts.length})
                    {lockedAccounts.length > 0 && (
                      <span style={{ fontSize: 10, color: "#ffc946", background: "rgba(255,201,70,0.12)", borderRadius: 20, padding: "1px 7px" }}>
                        🔒 {lockedAccounts.length}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#6ba8e5" }}>{showAccounts ? "▲" : "▼"}</span>
                </div>

                {showAccounts && (
                  <GlassCard style={{ padding: "8px 10px" }}>
                    {accounts.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "12px 0", fontSize: 12, color: TG.muted }}>Нет аккаунтов</div>
                    ) : (
                      <div>
                        {/* Legend */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 10, color: TG.muted }}>
                          <span><span style={{ color: "#2de897" }}>●</span> свободен</span>
                          <span><span style={{ color: "#ffc946" }}>●</span> заблокирован</span>
                          <span><span style={{ color: "#ff6b7a" }}>●</span> ошибка</span>
                        </div>
                        {accounts.map(a => <AccountRow key={a.id} account={a} />)}
                      </div>
                    )}
                  </GlassCard>
                )}
              </div>

              {/* Dead/stopped workers */}
              {deadWorkers.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    Остановленные ({deadWorkers.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {deadWorkers.map(w => <WorkerCard key={w.worker_id} worker={w} onDelete={load} />)}
                  </div>
                </div>
              )}

              {/* Task queue */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <ListTodo size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />Очередь задач
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["all", "pending", "claimed", "failed"] as const).map(s => (
                      <button key={s} onClick={() => setTaskTab(s)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, border: `1px solid ${taskTab === s ? "#6ba8e5" : "rgba(255,255,255,0.12)"}`, background: taskTab === s ? "rgba(107,168,229,0.15)" : "transparent", color: taskTab === s ? "#6ba8e5" : TG.muted, cursor: "pointer", fontWeight: 600 }}>
                        {s === "all" ? "Все" : s === "pending" ? "Ожид." : s === "claimed" ? "В работе" : "Ошибки"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk task actions */}
                {tasks.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {tasks.some(t => t.status === "failed" || t.status === "dead") && (
                      <button onClick={async () => {
                        haptic.medium();
                        const r = await api.bulkRetryTasks();
                        haptic.success(); load();
                        alert(`♻️ Перезапущено ${r.updated} задач`);
                      }} style={{ flex: 1, padding: "7px", background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.3)", borderRadius: 10, color: "#6ba8e5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        ♻️ Повтор всех ошибок
                      </button>
                    )}
                    {tasks.some(t => t.status === "pending" || t.status === "claimed") && (
                      <button onClick={async () => {
                        haptic.warning();
                        const r = await api.bulkCancelTasks();
                        haptic.success(); load();
                        alert(`🚫 Отменено ${r.updated} задач`);
                      }} style={{ flex: 1, padding: "7px", background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 10, color: "#ff6b7a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        🚫 Отменить все
                      </button>
                    )}
                  </div>
                )}

                {filteredTasks.length === 0 ? (
                  <GlassCard style={{ padding: "16px", textAlign: "center" }}>
                    <CheckCircle size={16} color="#2de897" style={{ marginBottom: 6, opacity: 0.7 }} />
                    <div style={{ fontSize: 12, color: TG.muted }}>Задач нет</div>
                  </GlassCard>
                ) : (
                  <div>
                    {filteredTasks.map(t => <TaskRow key={t.id} task={t} onAction={load} />)}
                  </div>
                )}
              </div>

              {/* Scheduled campaigns */}
              {scheduled.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Calendar size={12} color={TG.muted} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Расписание ({scheduled.length})
                    </div>
                  </div>
                  <GlassCard style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {scheduled.slice(0, 10).map(c => <ScheduledCampaignRow key={c.id} c={c} />)}
                      {scheduled.length > 10 && (
                        <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", padding: "4px 0" }}>
                          +{scheduled.length - 10} ещё
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Bulk cleanup */}
              {deadWorkers.length > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      haptic.warning();
                      await Promise.all(deadWorkers.map(w => api.deleteWorker(w.worker_id)));
                      haptic.success(); load();
                    }}
                    style={{ flex: 1, padding: "9px", background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 10, color: "#ff6b7a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    🧹 Удалить остановленные ({deadWorkers.length})
                  </button>
                </div>
              )}

              {/* How to run hint */}
              <GlassCard style={{ padding: "14px", background: "rgba(107,168,229,0.05)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6ba8e5", marginBottom: 6 }}>
                  Ручной запуск в терминале
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: TG.textSecondary, lineHeight: 2 }}>
                  python worker.py worker-1<br />
                  python worker.py worker-2<br />
                  <span style={{ color: TG.muted, fontFamily: "inherit", fontSize: 10 }}>
                    Или через supervisor: WORKER_COUNT=2 python main.py
                  </span>
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </>
  );
}
