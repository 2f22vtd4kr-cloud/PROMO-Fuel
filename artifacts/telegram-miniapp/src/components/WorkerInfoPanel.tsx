import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, RefreshCw, Cpu, Activity, AlertTriangle, CheckCircle,
  Shield, Phone, Zap, Timer, XCircle, Copy, RotateCcw,
  ChevronRight, Database, Radio,
} from "lucide-react";
import { api, BroadcastWorker, Task, WorkerCrashEvent } from "../lib/api";
import { TG } from "../lib/theme";
import { haptic } from "../lib/haptics";

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}с назад`;
  if (s < 3600) return `${Math.floor(s / 60)}м назад`;
  if (s < 86400) return `${Math.floor(s / 3600)}ч назад`;
  return `${Math.floor(s / 86400)}д назад`;
}

function uptime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return `${s}с`;
  if (s < 3600) return `${Math.floor(s / 60)}м ${s % 60}с`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}ч ${m}м`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " +
           d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

const STATUS_COLOR: Record<string, string> = {
  idle: "#2de897", working: "#6ba8e5", sleeping: "#c4aeff",
  stopped: "#ffc946", error: "#ff6b7a", starting: "#ffc946",
};
function sc(s: string) { return STATUS_COLOR[s] ?? "rgba(160,190,230,0.45)"; }

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{ color: "rgba(107,168,229,0.7)", display: "flex" }}>{icon}</div>
      <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(107,168,229,0.7)", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 10, color: TG.muted, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "1px 7px", marginLeft: "auto" }}>{count}</span>
      )}
      <div style={{ flex: 1, height: 1, background: "rgba(107,168,229,0.15)", marginLeft: 4 }} />
    </div>
  );
}

// ── Vitals row ────────────────────────────────────────────────────────────────

function VitalPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 6px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: color ?? TG.text }}>{value}</div>
      <div style={{ fontSize: 9, color: TG.muted, textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task & { campaign_name?: string } }) {
  const STATUS_C: Record<string, string> = {
    done: "#2de897", failed: "#ff6b7a", dead: "#ff6b7a",
    claimed: "#6ba8e5", pending: "#ffc946", cancelled: "rgba(160,190,230,0.4)",
  };
  const col = STATUS_C[task.status] ?? TG.muted;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 10px", borderRadius: 10,
      background: `${col}08`, border: `1px solid ${col}20`,
    }}>
      <div style={{ marginTop: 1, flexShrink: 0 }}>
        {task.status === "done"      && <CheckCircle size={13} color="#2de897" />}
        {task.status === "failed"    && <XCircle     size={13} color="#ff6b7a" />}
        {task.status === "dead"      && <XCircle     size={13} color="#ff6b7a" />}
        {task.status === "claimed"   && <Activity    size={13} color="#6ba8e5" style={{ animation: "pulse 1.2s ease-in-out infinite" }} />}
        {task.status === "pending"   && <Timer       size={13} color="#ffc946" />}
        {task.status === "cancelled" && <XCircle     size={13} color="rgba(160,190,230,0.4)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>#{task.id}</span>
          {task.campaign_name && (
            <span style={{ fontSize: 10, color: TG.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {task.campaign_name}
            </span>
          )}
          <span style={{ fontSize: 9, color: TG.muted, flexShrink: 0 }}>
            {task.created_at ? timeAgo(task.created_at) : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: col, background: `${col}14`, borderRadius: 6, padding: "1px 6px" }}>{task.status.toUpperCase()}</span>
          {task.attempts > 1 && <span style={{ fontSize: 9, color: "#ffc946" }}>попыток: {task.attempts}/{task.max_attempts}</span>}
        </div>
        {task.error && (
          <div style={{ marginTop: 4, fontSize: 9, color: "#ff6b7a", lineHeight: 1.4, wordBreak: "break-word", opacity: 0.85 }}>
            {task.error.slice(0, 180)}{task.error.length > 180 ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Crash row ──────────────────────────────────────────────────────────────────

function CrashRow({ c }: { c: WorkerCrashEvent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => c.error && setExpanded(e => !e)}
      style={{
        padding: "8px 10px", borderRadius: 10,
        background: "rgba(255,107,122,0.06)", border: "1px solid rgba(255,107,122,0.18)",
        cursor: c.error ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={12} color="#ff6b7a" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a" }}>
          Краш #{c.restart_num}
        </span>
        <span style={{ fontSize: 10, color: TG.muted }}>{fmtDateTime(c.crashed_at)}</span>
        {c.error && <ChevronRight size={12} color={TG.muted} style={{ marginLeft: "auto", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />}
      </div>
      {expanded && c.error && (
        <div style={{ marginTop: 6, fontSize: 9, color: "#ff6b7a", fontFamily: "monospace", lineHeight: 1.5, wordBreak: "break-word", opacity: 0.85, background: "rgba(255,107,122,0.05)", borderRadius: 6, padding: "6px 8px" }}>
          {c.error}
        </div>
      )}
    </div>
  );
}

// ── Heartbeat live counter ─────────────────────────────────────────────────────

function HeartbeatAge({ lastHeartbeat }: { lastHeartbeat: string | undefined }) {
  const [secs, setSecs] = useState(() => lastHeartbeat ? Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000) : 9999);
  useEffect(() => {
    if (!lastHeartbeat) return;
    setSecs(Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000));
    const id = setInterval(() => setSecs(Math.floor((Date.now() - new Date(lastHeartbeat!).getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastHeartbeat]);
  const alive = secs < 90;
  const col = alive ? (secs < 30 ? "#2de897" : "#ffc946") : "#ff6b7a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: `${col}0d`, border: `1px solid ${col}30` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: alive ? `0 0 8px ${col}` : "none", animation: alive ? "pulse 1.4s ease-in-out infinite" : "none", flexShrink: 0 }} />
      <Radio size={13} color={col} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: col }}>
          {alive ? "Живой" : "Мёртвый"} — пульс {secs}с назад
        </div>
        <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>
          порог: &lt;90с = живой | последний в {lastHeartbeat ? fmtTime(lastHeartbeat) : "—"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: 4, height: i < Math.min(10, Math.ceil((90 - Math.min(secs, 90)) / 9)) ? 16 : 6, borderRadius: 2, background: i < Math.min(10, Math.ceil((90 - Math.min(secs, 90)) / 9)) ? col : "rgba(255,255,255,0.08)", transition: "height 0.3s, background 0.3s" }} />
        ))}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface WorkerDetail {
  worker: BroadcastWorker;
  locked_account: Record<string, unknown> | null;
  recent_tasks: (Task & { campaign_name?: string })[];
  crashes: WorkerCrashEvent[];
  sends_today: { ok: number; failed: number } | null;
}

export function WorkerInfoPanel({ workerId, onClose, onDelete }: {
  workerId: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [data,    setData]    = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [restartBusy, setRestartBusy] = useState(false);
  const [restartDone, setRestartDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.getWorkerDetail(workerId);
      setData(d);
      setError("");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  async function restart() {
    haptic.medium(); setRestartBusy(true);
    try {
      await api.spawnWorker(workerId);
      haptic.success(); setRestartDone(true);
      setTimeout(() => setRestartDone(false), 3000);
      load();
    } catch { haptic.error(); }
    setRestartBusy(false);
  }

  function copyCmd() {
    navigator.clipboard?.writeText(`python worker.py ${workerId}`).catch(() => {});
    haptic.light();
  }

  const w      = data?.worker;
  const acc    = data?.locked_account;
  const tasks  = data?.recent_tasks ?? [];
  const crashes = data?.crashes ?? [];
  const alive  = w?.is_alive ?? false;
  const color  = alive ? sc(w?.status ?? "idle") : "#ff6b7a";

  const doneTasks   = tasks.filter(t => t.status === "done").length;
  const failedTasks = tasks.filter(t => t.status === "failed" || t.status === "dead").length;
  const totalTasks  = tasks.length;
  const quotaPct    = acc && Number(acc.daily_limit) > 0
    ? Math.min(100, Math.round((Number(acc.sent_today) / Number(acc.daily_limit)) * 100))
    : 0;
  const quotaColor  = quotaPct >= 90 ? "#ff6b7a" : quotaPct >= 70 ? "#ffc946" : "#2de897";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(4,6,14,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      animation: "fadeIn 0.18s ease",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Cpu size={17} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {workerId}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: "1px 8px" }}>
              {w ? (alive ? w.status.toUpperCase() : "DEAD") : "…"}
            </span>
            {w?.pid && <span style={{ fontSize: 9, color: TG.muted }}>PID {w.pid}</span>}
            {w?.crash_count !== undefined && w.crash_count > 0 && (
              <span style={{ fontSize: 9, color: "#ffc946" }}>💥 {w.crash_count} крашей</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => { haptic.light(); load(); }}
            style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            title="Обновить"
          >
            <RefreshCw size={13} color="#6ba8e5" />
          </button>
          <button
            onClick={() => { haptic.light(); onClose(); }}
            style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={15} color={TG.muted} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", padding: "14px 14px 32px" }}>

        {loading && !data && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${TG.green}30`, borderTopColor: TG.green, animation: "spin 0.7s linear infinite" }} />
            <span style={{ fontSize: 12, color: TG.muted }}>Загрузка данных воркера…</span>
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)", fontSize: 12, color: "#ff6b7a", marginBottom: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {data && w && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ── Heartbeat ── */}
            <HeartbeatAge lastHeartbeat={w.last_heartbeat} />

            {/* ── Vitals ── */}
            <div>
              <SectionHeader icon={<Zap size={13} />} label="Показатели" />
              <div style={{ display: "flex", gap: 6 }}>
                <VitalPill label="Задач выполнено" value={String(w.tasks_done)} color="#2de897" />
                <VitalPill label="Ошибок" value={String(w.tasks_failed)} color={w.tasks_failed > 0 ? "#ff6b7a" : TG.muted} />
                <VitalPill label="Крашей" value={String(w.crash_count ?? 0)} color={(w.crash_count ?? 0) > 0 ? "#ffc946" : TG.muted} />
                <VitalPill label="Аптайм" value={w.started_at ? uptime(w.started_at) : "—"} color="#6ba8e5" />
              </div>
            </div>

            {/* ── Active task ── */}
            {w.current_task && alive && (
              <div>
                <SectionHeader icon={<Activity size={13} />} label="Активная задача" />
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(107,168,229,0.07)", border: "1px solid rgba(107,168,229,0.22)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6ba8e5", animation: "pulse 1.2s ease-in-out infinite", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6ba8e5" }}>Задача #{w.current_task}</div>
                    <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>Статус: {w.status}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Last error ── */}
            {w.last_error && (
              <div>
                <SectionHeader icon={<AlertTriangle size={13} />} label="Последняя ошибка" />
                <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.22)", fontSize: 11, color: "#ff6b7a", fontFamily: "monospace", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {w.last_error}
                </div>
              </div>
            )}

            {/* ── Linked Telegram account ── */}
            <div>
              <SectionHeader icon={<Shield size={13} />} label="Привязанный аккаунт" />
              {acc ? (
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden" }}>
                  {/* Account header row */}
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(107,168,229,0.14)", border: "1px solid rgba(107,168,229,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Phone size={16} color="#6ba8e5" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {String(acc.label || acc.phone)}
                      </div>
                      <div style={{ fontSize: 10, color: TG.muted }}>{String(acc.phone)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: acc.session_file ? "#2de897" : "#ffc946",
                        background: acc.session_file ? "rgba(45,232,151,0.12)" : "rgba(255,201,70,0.12)",
                        border: `1px solid ${acc.session_file ? "rgba(45,232,151,0.3)" : "rgba(255,201,70,0.3)"}`,
                        borderRadius: 20, padding: "2px 8px",
                      }}>
                        {acc.session_file ? "✓ АВТОРИЗОВАН" : "НЕТ СЕССИИ"}
                      </span>
                      <span style={{ fontSize: 9, color: TG.muted }}>{String(acc.status).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* API info */}
                  <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {[
                      { label: "API ID", value: acc.api_id ? String(acc.api_id) : "—" },
                      { label: "Proxy", value: acc.proxy ? "✓" : "Нет" },
                      { label: "Активен", value: acc.is_active ? "Да" : "Нет" },
                    ].map(r => (
                      <div key={r.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TG.text }}>{r.value}</div>
                        <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{r.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quota bar */}
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: TG.muted }}>Дневной лимит</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: quotaColor }}>
                        {String(acc.sent_today ?? 0)} / {String(acc.daily_limit ?? "∞")} · {quotaPct}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${quotaPct}%`, borderRadius: 2, background: `linear-gradient(90deg,${quotaColor},${quotaColor}99)`, boxShadow: `0 0 6px ${quotaColor}55`, transition: "width 0.6s ease" }} />
                    </div>
                    {data.sends_today && (
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: "#2de897" }}>✓ {data.sends_today.ok} отправлено сегодня</span>
                        {data.sends_today.failed > 0 && <span style={{ fontSize: 10, color: "#ff6b7a" }}>✗ {data.sends_today.failed} ошибок</span>}
                      </div>
                    )}
                    {acc.flood_wait_until && (
                      <div style={{ marginTop: 8, fontSize: 10, color: "#ffc946", background: "rgba(255,201,70,0.09)", border: "1px solid rgba(255,201,70,0.25)", borderRadius: 8, padding: "5px 10px" }}>
                        ⏳ FloodWait до {fmtTime(String(acc.flood_wait_until))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 12, color: TG.muted, textAlign: "center" }}>
                  Нет привязанного аккаунта
                </div>
              )}
            </div>

            {/* ── Recent tasks (per-worker) ── */}
            <div>
              <SectionHeader icon={<Database size={13} />} label="Задачи воркера" count={totalTasks} />

              {/* mini stats */}
              {totalTasks > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "rgba(45,232,151,0.07)", border: "1px solid rgba(45,232,151,0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#2de897" }}>{doneTasks}</div>
                    <div style={{ fontSize: 9, color: TG.muted }}>Успешно</div>
                  </div>
                  <div style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#ff6b7a" }}>{failedTasks}</div>
                    <div style={{ fontSize: 9, color: TG.muted }}>Ошибок</div>
                  </div>
                  <div style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#ffc946" }}>{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</div>
                    <div style={{ fontSize: 9, color: TG.muted }}>Успех</div>
                  </div>
                </div>
              )}

              {tasks.length === 0 ? (
                <div style={{ padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 12, color: TG.muted, textAlign: "center" }}>
                  Задачи не найдены
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {tasks.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              )}
            </div>

            {/* ── Crash history ── */}
            <div>
              <SectionHeader icon={<AlertTriangle size={13} />} label="История крашей" count={crashes.length} />
              {crashes.length === 0 ? (
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(45,232,151,0.05)", border: "1px solid rgba(45,232,151,0.18)", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={14} color="#2de897" />
                  <span style={{ fontSize: 12, color: "#2de897" }}>Крашей не зафиксировано</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {crashes.map(c => <CrashRow key={c.id} c={c} />)}
                </div>
              )}
            </div>

            {/* ── Telethon session info ── */}
            <div>
              <SectionHeader icon={<Radio size={13} />} label="Telethon / Сессия" />
              <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden" }}>
                {[
                  { label: "Воркер ID", value: workerId, mono: true },
                  { label: "PID процесса", value: w.pid ? `${w.pid}` : "— (мёртв)", color: alive ? TG.text : "#ff6b7a" },
                  { label: "Запущен", value: w.started_at ? fmtDateTime(w.started_at) : "—" },
                  { label: "Последний пульс", value: w.last_heartbeat ? fmtDateTime(w.last_heartbeat) : "—" },
                  { label: "Возраст пульса", value: w.heartbeat_age_seconds !== undefined ? `${w.heartbeat_age_seconds}с` : "—", color: alive ? "#2de897" : "#ff6b7a" },
                  { label: "Статус", value: alive ? w.status : "dead", color },
                  { label: "Задач выполнено", value: String(w.tasks_done), color: "#2de897" },
                  { label: "Задач с ошибкой", value: String(w.tasks_failed), color: w.tasks_failed > 0 ? "#ff6b7a" : TG.muted },
                  { label: "Крашей всего", value: String(w.crash_count ?? 0), color: (w.crash_count ?? 0) > 0 ? "#ffc946" : TG.muted },
                  { label: "Команда запуска", value: `python worker.py ${workerId}`, mono: true, small: true },
                ].map((row, i) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "9px 14px", borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ fontSize: 10, color: TG.muted, flexShrink: 0 }}>{row.label}</span>
                    <span style={{
                      fontSize: row.small ? 9 : 11, fontWeight: 600,
                      color: row.color ?? TG.text,
                      fontFamily: row.mono ? "monospace" : "inherit",
                      textAlign: "right", wordBreak: "break-all",
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Fixed bottom actions */}
      <div style={{
        padding: "12px 14px calc(env(safe-area-inset-bottom,0px) + 12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 8, flexShrink: 0,
        background: "rgba(7,9,15,0.95)",
      }}>
        <button
          onClick={restart}
          disabled={restartBusy || alive}
          title={alive ? "Воркер уже запущен" : "Перезапустить"}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 13,
            background: alive ? "rgba(255,255,255,0.04)" : "rgba(45,232,151,0.13)",
            border: `1px solid ${alive ? "rgba(255,255,255,0.09)" : "rgba(45,232,151,0.35)"}`,
            fontSize: 12, fontWeight: 700, color: alive ? TG.muted : "#2de897",
            cursor: alive ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {restartBusy ? (
            <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(45,232,151,0.3)", borderTopColor: "#2de897", animation: "spin 0.7s linear infinite" }} />
          ) : restartDone ? (
            <CheckCircle size={13} />
          ) : (
            <RotateCcw size={13} />
          )}
          {restartDone ? "Запущен!" : restartBusy ? "Запуск…" : "Перезапустить"}
        </button>
        <button
          onClick={copyCmd}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 13,
            background: "rgba(107,168,229,0.10)",
            border: "1px solid rgba(107,168,229,0.28)",
            fontSize: 12, fontWeight: 700, color: "#6ba8e5",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Copy size={13} />
          Скопировать cmd
        </button>
        <button
          onClick={() => { haptic.light(); onClose(); onDelete(); }}
          style={{
            width: 44, padding: "11px 0", borderRadius: 13,
            background: "rgba(255,107,122,0.10)",
            border: "1px solid rgba(255,107,122,0.28)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Удалить воркер"
        >
          <XCircle size={15} color="#ff6b7a" />
        </button>
      </div>
    </div>
  );
}
