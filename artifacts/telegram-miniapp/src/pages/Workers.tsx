import { useState, useEffect, useCallback } from "react";
import { Cpu, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, Activity, ListTodo } from "lucide-react";
import { api, BroadcastWorker, Task, WorkersSummary } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const STATUS_COLOR: Record<string, string> = {
  idle:      "#2de897",
  working:   "#6ba8e5",
  stopped:   "#7c8db0",
  dead:      "#ff6b7a",
  pending:   "#ffc946",
  claimed:   "#6ba8e5",
  done:      "#2de897",
  failed:    "#ff6b7a",
  cancelled: "#7c8db0",
};

function statusColor(s: string) {
  return STATUS_COLOR[s] ?? "#7c8db0";
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  return `${Math.floor(diff / 3600)}ч назад`;
}

function WorkerCard({ worker, onDelete }: { worker: BroadcastWorker; onDelete: () => void }) {
  const [busy, setBusy] = useState(false);
  const alive   = worker.is_alive ?? false;
  const color   = alive ? statusColor(worker.status) : "#ff6b7a";
  const glow    = alive ? `${color}35` : "rgba(255,107,122,0.25)";

  async function remove() {
    haptic.warning(); setBusy(true);
    try { await api.deleteWorker(worker.worker_id); haptic.success(); onDelete(); }
    catch { haptic.error(); setBusy(false); }
  }

  return (
    <GlassCard glow={glow} style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Cpu size={16} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>{worker.worker_id}</div>
          <div style={{ fontSize: 10, color: TG.muted }}>PID {worker.pid ?? "—"}</div>
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
          { label: "Выполнено", value: String(worker.tasks_done), color: "#2de897" },
          { label: "Ошибок",    value: String(worker.tasks_failed), color: "#ff6b7a" },
          { label: "Пульс",     value: worker.last_heartbeat ? timeAgo(worker.last_heartbeat) : "—", color: alive ? "#6ba8e5" : "#ff6b7a" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 4px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {worker.current_task && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#6ba8e5" }}>
          <Activity size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
          Задача #{worker.current_task}
        </div>
      )}
      {worker.last_error && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#ff6b7a", background: "rgba(255,107,122,0.08)", borderRadius: 8, padding: "6px 8px", wordBreak: "break-word" }}>
          {worker.last_error}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: TG.muted }}>
        Запущен: {worker.started_at ? new Date(worker.started_at).toLocaleString("ru") : "—"}
      </div>
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
        <div style={{ fontSize: 12, color: TG.text }}>#{task.id} — кампания {task.campaign_id}</div>
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

export function WorkersPage() {
  const [workers,  setWorkers]  = useState<BroadcastWorker[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [summary,  setSummary]  = useState<WorkersSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [taskTab,  setTaskTab]  = useState<"all" | "pending" | "failed">("all");

  const load = useCallback(async () => {
    try {
      const [w, t, s] = await Promise.all([
        api.getWorkers(),
        api.getTasks(),
        api.getWorkersSummary(),
      ]);
      setWorkers(w);
      setTasks(t);
      setSummary(s);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);

  const filteredTasks = taskTab === "all" ? tasks.slice(0, 50)
    : tasks.filter(t => t.status === taskTab).slice(0, 50);

  const aliveWorkers = workers.filter(w => w.is_alive);
  const deadWorkers  = workers.filter(w => !w.is_alive);

  return (
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Воркеры</div>
          <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.light(); load(); }}>
            <RefreshCw size={14} color="#6ba8e5" />
          </GlassCard>
        </div>

        {/* Summary grid */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "Живых", value: summary.alive_workers, color: "#2de897" },
              { label: "Очередь", value: summary.tasks_pending, color: "#ffc946" },
              { label: "Готово", value: summary.tasks_done, color: "#6ba8e5" },
              { label: "Ошибок", value: summary.tasks_failed + summary.tasks_dead, color: "#ff6b7a" },
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
                    Запусти: <span style={{ fontFamily: "monospace", color: "#6ba8e5" }}>python worker.py worker-1</span>
                  </div>
                </GlassCard>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {aliveWorkers.map(w => <WorkerCard key={w.worker_id} worker={w} onDelete={load} />)}
                </div>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <ListTodo size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />Очередь задач
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["all", "pending", "failed"] as const).map(s => (
                    <button key={s} onClick={() => setTaskTab(s)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, border: `1px solid ${taskTab === s ? "#6ba8e5" : "rgba(255,255,255,0.12)"}`, background: taskTab === s ? "rgba(107,168,229,0.15)" : "transparent", color: taskTab === s ? "#6ba8e5" : TG.muted, cursor: "pointer", fontWeight: 600 }}>
                      {s === "all" ? "Все" : s === "pending" ? "Ожид." : "Ошибки"}
                    </button>
                  ))}
                </div>
              </div>

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

            {/* How to run hint */}
            <GlassCard style={{ padding: "14px", background: "rgba(107,168,229,0.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6ba8e5", marginBottom: 6 }}>Как запустить воркер</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: TG.textSecondary, lineHeight: 2 }}>
                python worker.py worker-1<br />
                python worker.py worker-2<br />
                <span style={{ color: TG.muted }}>-- несколько воркеров параллельно</span>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
}
