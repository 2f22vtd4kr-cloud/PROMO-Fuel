import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../lib/i18n";
import {
  Cpu, Activity, RefreshCw, Globe, AlertTriangle,
  Zap, Phone, ListTodo, Shield, RotateCcw, Server,
} from "lucide-react";
import {
  api, controlApi, BroadcastWorker, Task, SenderAccount,
  QueueStats, SystemSnapshot,
} from "../lib/api";
import { useSse } from "../lib/useSse";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

// ── Helpers ───────────────────────────────────────────────────────────────────

const sc = (s: string): string => ({
  idle: "#2de897", working: "#6ba8e5", sending: "#6ba8e5",
  broadcasting: "#6ba8e5", stopped: "#7c8db0", dead: "#ff6b7a",
  pending: "#ffc946", claimed: "#6ba8e5", done: "#2de897",
  failed: "#ff6b7a", cancelled: "#7c8db0", banned: "#ff6b7a",
  proxy_failed: "#ff6b7a", flood_wait: "#ffc946", offline: "#7c8db0",
}[s] ?? "#7c8db0");

function fmtAge(iso?: string | null): string {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `${d}с`;
  if (d < 3600) return `${Math.floor(d / 60)}м`;
  return `${Math.floor(d / 3600)}ч`;
}

function parseProxies(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((p: unknown) => {
      if (typeof p === "object" && p !== null) {
        const o = p as Record<string, unknown>;
        return `${o.host ?? "?"}:${o.port ?? "?"}`;
      }
      return String(p);
    });
  } catch {}
  const lines = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  return lines.map(l => {
    const m = l.match(/(?:socks5?|http):\/\/(?:[^@]+@)?([^:/]+:\d+)/i);
    return m ? m[1] : l;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SseDot({ connected }: { connected: boolean }) {
  const c = connected ? "#2de897" : "#ffc946";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: c, background: connected ? "rgba(45,232,151,0.08)" : "rgba(255,201,70,0.08)", border: `1px solid ${c}30`, borderRadius: 20, padding: "3px 9px" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: c, animation: connected ? "hbRing 2s ease-out infinite" : "none" }} />
      {connected ? "SSE live" : "polling"}
    </div>
  );
}

function StatTile({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <GlassCard style={{ padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: TG.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
    </GlassCard>
  );
}

function WorkerMiniTile({ worker }: { worker: BroadcastWorker }) {
  const { t } = useI18n();
  const alive   = worker.is_alive ?? false;
  const color   = alive ? sc(worker.status) : "#ff6b7a";
  const crashes = worker.crash_count ?? 0;
  const MAX_C   = 5;
  const pct     = Math.min((crashes / MAX_C) * 100, 100);
  const barColor = pct >= 80 ? "#ff6b7a" : pct >= 60 ? "#ffc946" : "#2de897";

  return (
    <GlassCard glow={alive ? undefined : "rgba(255,107,122,0.12)"} style={{ padding: "10px 12px", border: `1px solid ${color}22` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: alive ? `0 0 8px ${color}80` : "none", animation: alive && worker.status === "working" ? "pulse 1.5s ease-in-out infinite" : "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{worker.worker_id}</div>
          <div style={{ fontSize: 9, color: TG.muted }}>
            {alive ? worker.status : "dead"}
            {worker.pid && alive && <span style={{ marginLeft: 5, opacity: 0.6 }}>pid {worker.pid}</span>}
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#2de897" }}>✓{worker.tasks_done}</div>
      </div>

      {/* Crash rate bar */}
      {crashes > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 8, color: TG.muted }}>{t.workers.crashCount}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: barColor }}>{crashes}/{MAX_C}</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, boxShadow: pct >= 80 ? `0 0 6px ${barColor}80` : "none", transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      {worker.current_task && alive && (
        <div style={{ marginTop: 6, fontSize: 9, color: "#6ba8e5", display: "flex", alignItems: "center", gap: 4 }}>
          <Activity size={9} /> {t.workers.workerTaskRunning} #{worker.current_task}
        </div>
      )}

      {worker.last_error && !alive && (
        <div style={{ marginTop: 6, fontSize: 9, color: "#ff6b7a", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.8 }}>
          {worker.last_error.slice(0, 60)}
        </div>
      )}
    </GlassCard>
  );
}

function QueueBar({ stats }: { stats: QueueStats }) {
  const { t } = useI18n();
  const total = stats.pending + stats.active + stats.done + stats.failed + stats.dead + stats.cancelled;
  const segments = [
    { key: "pending",   v: stats.pending,   c: "#ffc946", l: t.workers.tasksPending },
    { key: "active",    v: stats.active,    c: "#6ba8e5", l: t.workers.tasksClaimed },
    { key: "done",      v: stats.done,      c: "#2de897", l: t.workers.tasksDone },
    { key: "failed",    v: stats.failed + stats.dead, c: "#ff6b7a", l: t.workers.tasksFailed },
  ].filter(s => s.v > 0);

  return (
    <GlassCard style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, marginBottom: 10, letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
        <ListTodo size={10} />{t.dashboard.queueTitle.toUpperCase()}
      </div>

      {/* Stacked bar */}
      {total > 0 ? (
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex", marginBottom: 10 }}>
          {segments.map(s => (
            <div key={s.key} style={{ height: "100%", width: `${(s.v / total) * 100}%`, background: s.c, transition: "width 0.6s ease" }} />
          ))}
        </div>
      ) : (
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
        {[
          { label: t.workers.tasksPending, value: stats.pending,              color: "#ffc946" },
          { label: t.workers.tasksClaimed, value: stats.active,              color: "#6ba8e5" },
          { label: t.workers.tasksDone,   value: stats.done,                 color: "#2de897" },
          { label: t.workers.tasksFailed, value: stats.failed + stats.dead,  color: "#ff6b7a" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 4px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 8, color: TG.muted, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ProxyRow({ account }: { account: SenderAccount }) {
  const proxies = parseProxies(account.proxies ?? account.proxy);
  const color   = account.status === "proxy_failed" ? "#ff6b7a"
    : account.locked_by ? "#ffc946"
    : "#2de897";

  if (proxies.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${color}06`, border: `1px solid ${color}18`, marginBottom: 4 }}>
      <Globe size={11} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {account.label || account.phone}
        </div>
        <div style={{ fontSize: 9, color, marginTop: 2 }}>
          {proxies[account.proxy_index ?? 0] ?? proxies[0]}
          {proxies.length > 1 && <span style={{ opacity: 0.6, marginLeft: 5 }}>(+{proxies.length - 1} резерв.)</span>}
          {account.status === "proxy_failed" && <span style={{ marginLeft: 6, fontWeight: 700 }}>⚠ proxy_failed</span>}
          {typeof account.proxy_index === "number" && account.proxy_index > 0 && (
            <span style={{ marginLeft: 6, opacity: 0.6 }}>ротация #{account.proxy_index}</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}14`, borderRadius: 20, padding: "2px 7px", flexShrink: 0 }}>
        {account.status}
      </span>
    </div>
  );
}

function RateLimitRow({ account }: { account: SenderAccount }) {
  const { t } = useI18n();
  const color = account.is_banned ? "#ff6b7a"
    : account.status === "flood_wait" ? "#ffc946"
    : account.status === "proxy_failed" ? "#ff6b7a"
    : "#7c8db0";

  const limit = account.daily_limit ?? 300;
  const pct   = limit > 0 ? Math.min(100, Math.round((account.sent_today / limit) * 100)) : 0;
  const label = account.is_banned ? t.accounts.banned.toUpperCase()
    : account.status === "flood_wait" ? "FLOOD WAIT"
    : account.status === "proxy_failed" ? "PROXY FAIL"
    : `${pct}% ${t.accounts.limit}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${color}06`, border: `1px solid ${color}18`, marginBottom: 4 }}>
      <Zap size={11} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: TG.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {account.label || account.phone}
        </div>
        <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color, marginTop: 3, fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color }}>{account.sent_today}</div>
        <div style={{ fontSize: 9, color: TG.muted }}>/{limit}</div>
      </div>
    </div>
  );
}

function AdminActions({ onAction }: { onAction: () => void }) {
  const [busyReap,   setBusyReap]   = useState(false);
  const [busyLocks,  setBusyLocks]  = useState(false);
  const [reapResult, setReapResult] = useState<string | null>(null);

  async function reap() {
    haptic.medium(); setBusyReap(true);
    try {
      const r = await controlApi.reapWorkers();
      haptic.success();
      setReapResult(`Reaped ${r.reaped_workers} workers, released ${r.released_stale_locks} locks`);
      setTimeout(() => setReapResult(null), 4000);
      onAction();
    } catch { haptic.error(); } finally { setBusyReap(false); }
  }

  async function locks() {
    haptic.medium(); setBusyLocks(true);
    try {
      const r = await controlApi.recoverStaleLocks();
      haptic.success();
      setReapResult(t.workers.locksReleased(r.released));
      setTimeout(() => setReapResult(null), 4000);
      onAction();
    } catch (e: unknown) {
      // Fall back to TWA API
      try {
        await api.recoverLocks();
        haptic.success(); onAction();
      } catch { haptic.error(); }
    } finally { setBusyLocks(false); }
  }

  return (
    <GlassCard style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, marginBottom: 10, letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
        <Shield size={10} />{t.workers.adminActions.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={reap} disabled={busyReap} style={{ padding: "9px 12px", borderRadius: 12, background: busyReap ? "rgba(107,168,229,0.05)" : "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.25)", color: "#6ba8e5", fontSize: 12, fontWeight: 700, cursor: busyReap ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, opacity: busyReap ? 0.6 : 1 }}>
          <RotateCcw size={12} style={{ animation: busyReap ? "spin 0.8s linear infinite" : "none" }} />
          {busyReap ? t.workers.reaping : t.workers.reapWorkers}
        </button>
        <button onClick={locks} disabled={busyLocks} style={{ padding: "9px 12px", borderRadius: 12, background: busyLocks ? "rgba(255,201,70,0.05)" : "rgba(255,201,70,0.09)", border: "1px solid rgba(255,201,70,0.25)", color: "#ffc946", fontSize: 12, fontWeight: 700, cursor: busyLocks ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, opacity: busyLocks ? 0.6 : 1 }}>
          <Shield size={12} />
          {busyLocks ? t.workers.releasingLocks : t.workers.releaseLocksBtn}
        </button>
        {reapResult && (
          <div style={{ fontSize: 11, color: "#2de897", background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.18)", borderRadius: 8, padding: "6px 10px" }}>
            ✓ {reapResult}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t, lang } = useI18n();
  const [workers,  setWorkers]  = useState<BroadcastWorker[]>([]);
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [queue,    setQueue]    = useState<QueueStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [sseAlive, setSseAlive] = useState(false);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [snapshotErr, setSnapshotErr] = useState(false);
  const lastSseRef = useRef(0);
  const SSE_DEAD   = 20_000;

  const load = useCallback(async () => {
    try {
      const [w, a, t] = await Promise.all([
        api.getWorkers().catch(() => [] as BroadcastWorker[]),
        api.getAccounts().catch(() => [] as SenderAccount[]),
        api.getTasks().catch(() => [] as Task[]),
      ]);
      setWorkers(w); setAccounts(a); setTasks(t);

      // Also try control plane snapshot
      try {
        const snap = await controlApi.getSnapshot();
        setSnapshot(snap);
        setQueue(snap.queue);
        setSnapshotErr(false);
      } catch {
        setSnapshotErr(true);
        // Build local queue stats from tasks
        setQueue({
          pending:              t.filter(x => x.status === "pending").length,
          active:               t.filter(x => x.status === "claimed").length,
          done:                 t.filter(x => x.status === "done").length,
          failed:               t.filter(x => x.status === "failed").length,
          dead:                 t.filter(x => x.status === "dead").length,
          cancelled:            t.filter(x => x.status === "cancelled").length,
          locked_accounts:      a.filter(x => x.locked_by).length,
          broadcasting_accounts:a.filter(x => x.broadcasting).length,
        });
      }
    } catch {} finally { setLoading(false); }
  }, []);

  // SSE live updates
  useSse((type, data) => {
    const wasDown = Date.now() - lastSseRef.current > SSE_DEAD;
    lastSseRef.current = Date.now();
    if (wasDown) { setSseAlive(true); load(); return; }
    setSseAlive(true);
    if (type === "workers")  setWorkers(data as BroadcastWorker[]);
    if (type === "accounts") setAccounts(data as SenderAccount[]);
    if (type === "tasks") {
      const ts = data as Task[];
      setTasks(ts);
      setQueue(prev => prev ? {
        ...prev,
        pending:   ts.filter(x => x.status === "pending").length,
        active:    ts.filter(x => x.status === "claimed").length,
        done:      ts.filter(x => x.status === "done").length,
        failed:    ts.filter(x => x.status === "failed").length,
        dead:      ts.filter(x => x.status === "dead").length,
        cancelled: ts.filter(x => x.status === "cancelled").length,
      } : prev);
    }
  });

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (Date.now() - lastSseRef.current > SSE_DEAD) { setSseAlive(false); load(); }
    }, 12_000);
    return () => clearInterval(id);
  }, [load]);

  const aliveWorkers   = workers.filter(w => w.is_alive);
  const deadWorkers    = workers.filter(w => !w.is_alive);
  const lockedAccounts = accounts.filter(a => a.locked_by);
  const rateLimited    = accounts.filter(a => a.is_banned || a.status === "flood_wait" || a.status === "proxy_failed" || (a.daily_limit > 0 && a.sent_today >= a.daily_limit * 0.9));
  const proxiedAccounts= accounts.filter(a => a.proxies || a.proxy);

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes hbRing { 0%{opacity:0.8;transform:scale(1)} 100%{opacity:0;transform:scale(2.4)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 14px 100px" }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Server size={15} color="#6ba8e5" />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>{t.nav.dashboard}</div>
                <div style={{ fontSize: 10, color: TG.muted }}>{t.dashboard.systemSnapshot}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {snapshotErr && <span style={{ fontSize: 9, color: "#ffc946", background: "rgba(255,201,70,0.1)", borderRadius: 20, padding: "2px 7px", border: "1px solid rgba(255,201,70,0.2)" }}>control API offline</span>}
              <SseDot connected={sseAlive} />
              <GlassCard style={{ padding: "8px 10px", borderRadius: 12, cursor: "pointer" }} onClick={() => { haptic.light(); load(); }}>
                <RefreshCw size={13} color="#6ba8e5" />
              </GlassCard>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(107,168,229,0.3)", borderTopColor: "#6ba8e5", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : (
            <>
              {/* ── System overview tiles ─────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                <StatTile label={t.dashboard.alive}   value={aliveWorkers.length}   color="#2de897" />
                <StatTile label={t.dashboard.queue}  value={queue?.pending ?? 0}   color="#ffc946" />
                <StatTile label={t.status.banned}    value={lockedAccounts.length} color="#6ba8e5" />
                <StatTile label={t.dashboard.failed} value={(queue?.failed ?? 0) + (queue?.dead ?? 0)} color="#ff6b7a" />
              </div>

              {/* Snapshot timestamp */}
              {snapshot && (
                <div style={{ fontSize: 9, color: TG.muted, textAlign: "right", opacity: 0.6 }}>
                  {t.dashboard.snapshot} {new Date(snapshot.timestamp).toLocaleTimeString(lang)}
                </div>
              )}

              {/* ── Crash-loop alert ──────────────────────────────────── */}
              {deadWorkers.length > 0 && (
                <GlassCard glow="rgba(255,107,122,0.15)" style={{ padding: "12px 14px", border: "1px solid rgba(255,107,122,0.28)", background: "rgba(255,107,122,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} color="#ff6b7a" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#ff6b7a" }}>
                      {t.dashboard.workersDown(deadWorkers.length)}
                    </span>
                  </div>
                  {deadWorkers.map(w => (
                    <div key={w.worker_id} style={{ marginTop: 8, fontSize: 10, color: "#ff6b7a", fontFamily: "monospace", background: "rgba(255,107,122,0.07)", borderRadius: 8, padding: "6px 8px", wordBreak: "break-word" }}>
                      <span style={{ fontWeight: 700 }}>{w.worker_id}:</span> {(w.last_error ?? "unknown").slice(0, 120)}
                    </div>
                  ))}
                </GlassCard>
              )}

              {/* ── Worker cluster grid ───────────────────────────────── */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  <Cpu size={10} />{t.workers.title.toUpperCase()} ({workers.length})
                  {aliveWorkers.length > 0 && <span style={{ fontSize: 9, color: "#2de897", background: "rgba(45,232,151,0.10)", borderRadius: 20, padding: "1px 7px" }}>{aliveWorkers.length} {t.workers.alive}</span>}
                </div>
                {workers.length === 0 ? (
                  <GlassCard style={{ padding: "20px 16px", textAlign: "center", border: "1px solid rgba(255,201,70,0.22)", background: "rgba(255,201,70,0.04)" }}>
                    <AlertTriangle size={20} color="#ffc946" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ffc946" }}>{t.workers.noWorkers}</div>
                    <div style={{ fontSize: 11, color: TG.muted, marginTop: 4 }}>{t.dashboard.goToWorkers}</div>
                  </GlassCard>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {workers.map((w, i) => (
                      <div key={w.worker_id} style={{ animation: `slideUp 0.3s ease-out calc(${i} * 0.05s) both` }}>
                        <WorkerMiniTile worker={w} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Queue stats ───────────────────────────────────────── */}
              {queue && <QueueBar stats={queue} />}

              {/* ── Rate-limited threads ──────────────────────────────── */}
              {rateLimited.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Zap size={10} />{t.dashboard.rateLimited.toUpperCase()} ({rateLimited.length})
                  </div>
                  <GlassCard style={{ padding: "10px 12px" }}>
                    {rateLimited.map(a => <RateLimitRow key={a.id} account={a} />)}
                  </GlassCard>
                </div>
              )}

              {/* ── Active proxies ────────────────────────────────────── */}
              {proxiedAccounts.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Globe size={10} />{t.dashboard.activeProxies.toUpperCase()} ({proxiedAccounts.length})
                  </div>
                  <GlassCard style={{ padding: "10px 12px" }}>
                    {proxiedAccounts.map(a => <ProxyRow key={a.id} account={a} />)}
                  </GlassCard>
                </div>
              )}

              {/* ── Account locking overview ──────────────────────────── */}
              {lockedAccounts.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Phone size={10} />{t.dashboard.busyAccounts.toUpperCase()} ({lockedAccounts.length})
                  </div>
                  <GlassCard style={{ padding: "10px 12px" }}>
                    {lockedAccounts.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, background: "rgba(255,201,70,0.05)", border: "1px solid rgba(255,201,70,0.14)", marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffc946", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: TG.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label || a.phone}</div>
                          <div style={{ fontSize: 9, color: "#ffc946", marginTop: 1 }}>🔒 {a.locked_by}</div>
                        </div>
                        <span style={{ fontSize: 9, color: "#ffc946" }}>{a.broadcasting ? "⚡ live" : a.status}</span>
                      </div>
                    ))}
                  </GlassCard>
                </div>
              )}

              {/* ── Recent failed tasks ───────────────────────────────── */}
              {tasks.filter(t => t.status === "failed" || t.status === "dead").length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={10} />{t.workers.taskErrors.toUpperCase()}
                  </div>
                  <GlassCard style={{ padding: "10px 12px" }}>
                    {tasks.filter(tk => tk.status === "failed" || tk.status === "dead").slice(0, 5).map(tk => (
                      <div key={tk.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 8px", borderRadius: 8, background: "rgba(255,107,122,0.05)", border: "1px solid rgba(255,107,122,0.14)", marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.12)", borderRadius: 20, padding: "1px 6px", flexShrink: 0 }}>{tk.status}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: TG.text }}>{t.workers.workerTaskRunning} #{tk.id} · #{tk.campaign_id}</div>
                          {tk.error && <div style={{ fontSize: 9, color: "#ff6b7a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.error}</div>}
                        </div>
                        <span style={{ fontSize: 9, color: TG.muted, flexShrink: 0 }}>{tk.attempts}/{tk.max_attempts}</span>
                      </div>
                    ))}
                    {tasks.filter(tk => tk.status === "failed" || tk.status === "dead").length > 5 && (
                      <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", paddingTop: 4 }}>
                        + {tasks.filter(tk => tk.status === "failed" || tk.status === "dead").length - 5} {t.workers.tasksFailed}
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}

              {/* ── Admin actions ─────────────────────────────────────── */}
              <AdminActions onAction={load} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
