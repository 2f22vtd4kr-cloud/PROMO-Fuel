import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../lib/i18n";
import {
  Cpu, RefreshCw, Trash2, AlertTriangle, CheckCircle,
  Activity, ListTodo, Calendar, Plus, Shield, Phone, Zap, RotateCcw, Timer,
} from "lucide-react";
import {
  api, BroadcastWorker, Task, WorkersSummary,
  GroupCampaign, SenderAccount, RecoverLocksResult, WorkerCrashEvent, BannedGroup,
} from "../lib/api";
import { useSse } from "../lib/useSse";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

// ── Colour helpers ────────────────────────────────────────────────────────────

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

const sc = (s: string) => STATUS_COLOR[s] ?? "#7c8db0";

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `${d}с`;
  if (d < 3600) return `${Math.floor(d / 60)}м`;
  return `${Math.floor(d / 3600)}ч`;
}

function uptime(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `${d}с`;
  if (d < 3600) return `${Math.floor(d / 60)}м`;
  const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60);
  return m ? `${h}ч ${m}м` : `${h}ч`;
}

function formatCountdown(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (d <= 0) return "сейчас";
  if (d < 60)   return `${d}с`;
  if (d < 3600) return `${Math.floor(d / 60)}м ${d % 60}с`;
  const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60);
  return `${h}ч ${m}м`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LiveDot({ alive, working }: { alive: boolean; working: boolean }) {
  const color = !alive ? "#ff6b7a" : working ? "#6ba8e5" : "#2de897";
  return (
    <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: alive ? 1 : 0.4, boxShadow: alive ? "0 0 12px rgba(45,232,151,0.6)" : "none", animation: alive ? "pulse 2s ease-in-out infinite" : "none" }} />
      {alive && (
        <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `2px solid ${color}`, animation: "hb-ring 1.8s ease-out infinite" }} />
      )}
    </div>
  );
}

function SseBadge({ connected }: { connected: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: connected ? "#2de897" : "#ffc946", background: connected ? "rgba(45,232,151,0.08)" : "rgba(255,201,70,0.10)", border: `1px solid ${connected ? "rgba(45,232,151,0.25)" : "rgba(255,201,70,0.25)"}`, borderRadius: 20, padding: "3px 8px", fontWeight: 700 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? "#2de897" : "#ffc946", animation: connected ? "hb-ring 2s ease-out infinite" : "none" }} />
      {connected ? "live" : "polling"}
    </div>
  );
}

function RestartWorkerButton({ workerId, onRestarted }: { workerId: string; onRestarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function restart() {
    haptic.medium(); setBusy(true);
    try {
      await api.spawnWorker(workerId);
      haptic.success(); setDone(true);
      setTimeout(() => { setDone(false); onRestarted(); }, 2500);
    } catch {
      haptic.error();
    } finally { setBusy(false); }
  }

  return (
    <button
      onClick={restart} disabled={busy || done}
      style={{ fontSize: 10, color: done ? "#2de897" : "#ffc946", background: done ? "rgba(45,232,151,0.10)" : "rgba(255,201,70,0.10)", border: `1px solid ${done ? "rgba(45,232,151,0.3)" : "rgba(255,201,70,0.3)"}`, borderRadius: 6, padding: "4px 9px", cursor: busy ? "not-allowed" : "pointer", fontWeight: 700, opacity: busy ? 0.6 : 1, transition: "all 0.2s" }}
    >
      {done ? "✓ Запущен" : busy ? "…" : "▶ Restart"}
    </button>
  );
}

function WorkerCard({ worker, index = 0, onDelete, accounts = [], accountStats = {} }: { worker: BroadcastWorker; index?: number; onDelete: () => void; accounts?: SenderAccount[]; accountStats?: Record<string, { ok: number; failed: number }> }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const alive   = worker.is_alive ?? false;
  const working = alive && worker.status === "working";
  const color   = alive ? sc(worker.status) : "#ff6b7a";
  const topAccentColor = alive ? "rgba(45,232,151,1)" : "rgba(255,107,122,1)";

  const linkedAccount = accounts.find(a => a.locked_by === worker.worker_id);
  const sendsToday    = linkedAccount ? accountStats[String(linkedAccount.id)] : undefined;
  const todayTotal    = (sendsToday?.ok ?? 0) + (sendsToday?.failed ?? 0);

  async function remove() {
    haptic.warning(); setBusy(true);
    try { await api.deleteWorker(worker.worker_id); haptic.success(); onDelete(); }
    catch { haptic.error(); setBusy(false); }
  }

  return (
    <GlassCard glow={`${color}28`} style={{ padding: 14, animation: `slideUp 0.35s ease-out calc(${index} * 0.06s) both` }}>
      <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: "1px", background: `linear-gradient(90deg,transparent,${topAccentColor},transparent)`, zIndex: 4 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <LiveDot alive={alive} working={working} />
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Cpu size={15} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>{worker.worker_id}</div>
          <div style={{ fontSize: 10, color: TG.muted }}>
            {worker.pid ? `PID ${worker.pid}` : "—"}
            {worker.started_at && alive && <span style={{ marginLeft: 6 }}>⏱ {uptime(worker.started_at)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px" }}>
            {alive ? worker.status : "dead"}
          </span>
          {(!alive || worker.status === "stopped") && (
            <button onClick={remove} disabled={busy} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.22)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: busy ? 0.4 : 1 }}>
              <Trash2 size={12} color="#ff6b7a" />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        {[
          { label: "Выполнено", value: String(worker.tasks_done),   color: "#2de897" },
          { label: "Ошибок",    value: String(worker.tasks_failed), color: "#ff6b7a" },
          { label: "Пульс",     value: worker.last_heartbeat ? timeAgo(worker.last_heartbeat) : "—", color: alive ? "#6ba8e5" : "#ff6b7a" },
          {
            label: "Сегодня",
            value: sendsToday
              ? todayTotal === 0
                ? "0"
                : sendsToday.failed > 0
                  ? `${sendsToday.ok}+${sendsToday.failed}`
                  : String(sendsToday.ok)
              : "—",
            color: !sendsToday || todayTotal === 0 ? TG.muted : sendsToday.failed > 0 ? "#ffc946" : "#2de897",
          },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 4px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {worker.current_task && working && (
        <div style={{ marginTop: 10, padding: "6px 8px", borderRadius: 8, background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.20)", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ba8e5", flexShrink: 0, animation: "pulse 1.2s ease-in-out infinite" }} />
          <Activity size={9} color="#6ba8e5" />
          <span style={{ fontSize: 10, color: "#6ba8e5", fontWeight: 700 }}>{t.workers.workerTaskRunning} #{worker.current_task}</span>
          {worker.status === "working" && <span style={{ fontSize: 9, color: TG.muted, marginLeft: "auto" }}>{t.workers.inProgress}</span>}
        </div>
      )}
      {worker.last_error && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#ff6b7a", background: "rgba(255,107,122,0.08)", borderRadius: 8, padding: "6px 8px", wordBreak: "break-word" }}>
          {worker.last_error}
        </div>
      )}
      {!alive && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <RestartWorkerButton workerId={worker.worker_id} onRestarted={onDelete} />
          <button
            onClick={() => { navigator.clipboard?.writeText(`python worker.py ${worker.worker_id}`).catch(() => {}); haptic.light(); }}
            style={{ fontSize: 9, color: "#6ba8e5", background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.2)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontFamily: "monospace" }}
          >
            📋 python worker.py {worker.worker_id}
          </button>
        </div>
      )}
    </GlassCard>
  );
}

function TaskRow({ task, onAction, campaignName }: { task: Task; onAction: () => void; campaignName?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const color = sc(task.status);

  async function retry()  { haptic.medium(); setBusy(true); try { await api.retryTask(task.id);  haptic.success(); onAction(); } catch { haptic.error(); } finally { setBusy(false); } }
  async function cancel() { haptic.warning(); setBusy(true); try { await api.cancelTask(task.id); haptic.success(); onAction(); } catch { haptic.error(); } finally { setBusy(false); } }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
      <span style={{ fontSize: 10, color, background: `${color}18`, borderRadius: 20, padding: "2px 7px", fontWeight: 700, flexShrink: 0 }}>{task.status}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {campaignName
            ? <span style={{ fontWeight: 600 }}>{campaignName}</span>
            : <span style={{ color: TG.muted }}>{t.workers.campaignLabel} #{task.campaign_id}</span>
          }
          {task.worker_id && task.status === "claimed" && <span style={{ color: "#ffc946", fontSize: 10, marginLeft: 5 }}>@ {task.worker_id}</span>}
        </div>
        <div style={{ fontSize: 9, color: TG.muted }}>
          {t.workers.workerTaskRunning} #{task.id}
          {task.scheduled_at && task.status === "pending" && (() => {
            const diff = Math.floor((new Date(task.scheduled_at!).getTime() - Date.now()) / 1000);
            return diff > 5 ? <span style={{ color: "#ffc946", marginLeft: 5 }}>⏰ через {formatCountdown(task.scheduled_at)}</span> : null;
          })()}
        </div>
        {task.error && <div style={{ fontSize: 10, color: "#ff6b7a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.error}</div>}
      </div>
      <div style={{ fontSize: 9, color: TG.muted, flexShrink: 0 }}>{task.attempts}/{task.max_attempts}</div>
      {(task.status === "failed" || task.status === "dead") && (
        <button onClick={retry} disabled={busy} style={{ fontSize: 10, color: "#6ba8e5", background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.3)", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>{t.common.retry}</button>
      )}
      {(task.status === "pending" || task.status === "claimed") && (
        <button onClick={cancel} disabled={busy} style={{ fontSize: 10, color: "#ff6b7a", background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>{t.common.cancel}</button>
      )}
    </div>
  );
}

function ScheduledCampaignRow({ c }: { c: GroupCampaign }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const color = c.status === "running" ? "#2de897" : c.status === "paused" ? "#ffc946" : "#7c8db0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#c8d8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
        <div style={{ fontSize: 10, color: "#7c8db0", marginTop: 1 }}>{c.sent_count} отправлено · {c.failed_count} ошибок</div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.next_send_at ? "#ffc946" : "#7c8db0" }}>{formatCountdown(c.next_send_at)}</div>
        <div style={{ fontSize: 9, color: "#7c8db0" }}>след.</div>
      </div>
    </div>
  );
}

function SpawnWorkerButton({ onSpawned, prominent = false }: { onSpawned: () => void; prominent?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Запустить воркер");

  async function spawn() {
    haptic.medium(); setBusy(true); setLabel("Запуск…");
    try {
      const r = await api.spawnWorker();
      haptic.success();
      setLabel(`✓ ${r.worker_id} запущен`);
      setTimeout(() => setLabel("Запустить воркер"), 3000);
      onSpawned();
    } catch {
      haptic.error(); setLabel("Ошибка запуска");
      setTimeout(() => setLabel("Запустить воркер"), 2500);
    } finally { setBusy(false); }
  }

  const bg     = busy ? "rgba(45,232,151,0.06)" : prominent ? "rgba(45,232,151,0.20)" : "rgba(45,232,151,0.12)";
  const border = prominent ? "1px solid rgba(45,232,151,0.55)" : "1px solid rgba(45,232,151,0.30)";
  const shadow = prominent && !busy ? "0 0 18px rgba(45,232,151,0.25)" : "none";

  return (
    <button onClick={spawn} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: prominent ? "13px 14px" : "10px 14px", borderRadius: 12, background: bg, border, boxShadow: shadow, color: "#2de897", fontSize: prominent ? 13 : 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, transition: "opacity 0.2s, background 0.2s", width: "100%" }}>
      {busy ? <Zap size={13} color="#2de897" /> : <Plus size={prominent ? 15 : 13} color="#2de897" />}
      {label}
    </button>
  );
}

function RecoverLocksButton({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RecoverLocksResult | null>(null);

  async function recover() {
    haptic.medium(); setBusy(true);
    try {
      const r = await api.recoverLocks();
      haptic.success(); setResult(r); onDone();
      setTimeout(() => setResult(null), 5000);
    } catch { haptic.error(); } finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={recover} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px 14px", borderRadius: 12, background: busy ? "rgba(255,201,70,0.05)" : "rgba(255,201,70,0.09)", border: "1px solid rgba(255,201,70,0.27)", color: "#ffc946", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <Shield size={13} color="#ffc946" />
        {busy ? t.workers.releasingLocks : t.workers.releaseLocksBtn}
      </button>
      {result && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#ffc946", background: "rgba(255,201,70,0.08)", border: "1px solid rgba(255,201,70,0.18)", borderRadius: 10, padding: "8px 12px" }}>
          ✓ {t.accounts.title}: <b>{result.released_accounts}</b> · {t.workers.tasks}: <b>{result.reset_tasks}</b>
          {result.stale.length > 0 && <div style={{ marginTop: 4, color: TG.muted }}>{result.stale.map(s => `${s.phone} (${s.locked_by})`).join(", ")}</div>}
        </div>
      )}
    </div>
  );
}

function AccountRow({ account, sendsToday }: { account: SenderAccount; sendsToday?: { ok: number; failed: number } }) {
  const locked = !!account.locked_by;
  const st     = account.status;
  const color  = (st === "idle" && !locked) ? "#2de897"
    : (locked || st === "broadcasting" || st === "sending") ? "#ffc946"
    : "#ff6b7a";

  const [expanded,     setExpanded]     = useState(false);
  const [bannedGroups, setBannedGroups] = useState<BannedGroup[]>([]);
  const [banLoading,   setBanLoading]   = useState(false);
  const [liftingId,    setLiftingId]    = useState<string | null>(null);

  async function loadBanned() {
    setBanLoading(true);
    try { setBannedGroups(await api.getBannedGroups(account.id)); } catch {}
    finally { setBanLoading(false); }
  }

  function toggle() {
    haptic.light();
    if (!expanded) loadBanned();
    setExpanded(v => !v);
  }

  async function liftBan(groupId: string) {
    haptic.medium();
    setLiftingId(groupId);
    try {
      await api.liftGroupBan(account.id, groupId);
      setBannedGroups(prev => prev.filter(g => g.group_id !== groupId));
      haptic.success();
    } catch { haptic.error(); }
    finally { setLiftingId(null); }
  }

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
    <div style={{ borderRadius: 10, background: color === "#2de897" ? "rgba(45,232,151,0.04)" : color === "#ffc946" ? "rgba(255,201,70,0.05)" : "rgba(255,107,122,0.05)", border: `1px solid ${color}22`, marginBottom: 4, overflow: "hidden" }}>
      {/* ── Main row (tap to expand) ── */}
      <div onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <Phone size={11} color={color} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: TG.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {account.phone}
            {account.label && <span style={{ marginLeft: 5, fontSize: 10, color: TG.muted }}>({account.label})</span>}
          </div>
          <div style={{ fontSize: 10, color: TG.muted, marginTop: 1 }}>
            {locked ? <span style={{ color: "#ffc946" }}>🔒 {account.locked_by}</span> : <span style={{ color: "#2de897" }}>свободен</span>}
            {proxyDisplay !== "—" && (
              <span style={{ marginLeft: 8 }}>
                🌐 {proxyDisplay}
                {account.proxy_index !== undefined && account.proxy_index > 0 && <span style={{ opacity: 0.6 }}> [#{account.proxy_index}]</span>}
              </span>
            )}
            {account.last_used_at && <span style={{ marginLeft: 8, opacity: 0.65 }}>{timeAgo(account.last_used_at)} назад</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}14`, border: `1px solid ${color}28`, borderRadius: 20, padding: "2px 7px" }}>
            {account.broadcasting ? "⚡ live" : st}
          </span>
          {sendsToday && (sendsToday.ok + sendsToday.failed) > 0 && (
            <span style={{ fontSize: 8, color: TG.muted }}>
              <span style={{ color: "#2de897" }}>✓{sendsToday.ok}</span>
              {sendsToday.failed > 0 && <span style={{ color: "#ff6b7a", marginLeft: 3 }}>✗{sendsToday.failed}</span>}
              {" сегодня"}
            </span>
          )}
          <span style={{ fontSize: 8, color: TG.muted, opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded: Banned groups panel ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${color}18`, padding: "10px 12px", background: "rgba(0,0,0,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", display: "flex", alignItems: "center", gap: 5 }}>
              ⛔ Заблокированные группы
              {bannedGroups.length > 0 && (
                <span style={{ background: "rgba(255,107,122,0.18)", border: "1px solid rgba(255,107,122,0.35)", borderRadius: 20, padding: "1px 6px" }}>{bannedGroups.length}</span>
              )}
            </span>
            <button onClick={(e) => { e.stopPropagation(); loadBanned(); }} style={{ fontSize: 9, color: "#6ba8e5", background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.25)", borderRadius: 8, padding: "3px 7px", cursor: "pointer" }}>
              обновить
            </button>
          </div>

          {banLoading && (
            <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", padding: "8px 0" }}>загрузка…</div>
          )}

          {!banLoading && bannedGroups.length === 0 && (
            <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", padding: "8px 0", opacity: 0.6 }}>
              Нет заблокированных групп ✓
            </div>
          )}

          {!banLoading && bannedGroups.map(g => (
            <div key={g.group_id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 8px", borderRadius: 8, background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.15)", marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.group_title || g.group_id}
                </div>
                <div style={{ fontSize: 9, color: "#ff6b7a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.ban_reason || "Заблокирован"}
                </div>
                {g.banned_at && (
                  <div style={{ fontSize: 8, color: TG.muted, marginTop: 1 }}>
                    {new Date(g.banned_at).toLocaleDateString("uk-UA")}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); liftBan(g.group_id); }}
                disabled={liftingId === g.group_id}
                style={{ fontSize: 9, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.10)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", opacity: liftingId === g.group_id ? 0.5 : 1, flexShrink: 0 }}
              >
                {liftingId === g.group_id ? "…" : "Разблокировать"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rate-limit summary strip ──────────────────────────────────────────────────

type RLData = { account_id: number; count: number; window_max: number; remaining: number };

function RateLimitSummaryStrip({ accounts }: { accounts: SenderAccount[] }) {
  const [rateLimits, setRateLimits] = useState<Record<number, RLData>>({});
  const accountsRef = useRef<SenderAccount[]>([]);
  const activeAccounts = accounts.filter(a => a.is_active && a.status !== "banned");
  accountsRef.current = activeAccounts;

  const fetchAll = useCallback(async () => {
    const accts = accountsRef.current;
    if (!accts.length) return;
    const results = await Promise.allSettled(accts.map(a => api.getAccountRateLimit(a.id)));
    const map: Record<number, RLData> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") map[accts[i].id] = r.value;
    });
    setRateLimits(map);
  }, []);

  useEffect(() => {
    fetchAll();
    const poll = setInterval(fetchAll, 15_000);
    return () => clearInterval(poll);
  }, [fetchAll]);

  if (!activeAccounts.length) return null;

  return (
    <GlassCard style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Timer size={12} color="#6ba8e5" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6ba8e5" }}>Скорость / мин — все аккаунты</span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: TG.muted }}>обновл. 15с</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {activeAccounts.map(a => {
          const rl        = rateLimits[a.id];
          const count     = rl?.count ?? 0;
          const max       = rl?.window_max ?? 20;
          const pct       = Math.min(100, (count / max) * 100);
          const rem       = rl ? rl.remaining / rl.window_max : 1;
          const isFlooded = a.status === "flood_wait" ||
            !!(a.flood_wait_until && new Date(a.flood_wait_until) > new Date());
          const color = isFlooded
            ? "#ffc946"
            : !rl || count === 0
              ? "#7c8db0"
              : rem > 0.5 ? "#2de897" : rem > 0.25 ? "#ffc946" : "#ff6b7a";
          return (
            <div key={a.id} style={{
              borderRadius: 8, padding: "7px 9px",
              background: isFlooded
                ? "rgba(255,201,70,0.09)"
                : count > 0 ? `${color}0d` : "rgba(255,255,255,0.03)",
              border: `1px solid ${isFlooded ? "rgba(255,201,70,0.35)" : count > 0 ? color + "25" : "rgba(255,255,255,0.07)"}`,
              position: "relative",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: TG.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>
                  {a.label || a.phone.slice(-8)}
                </span>
                {isFlooded ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.15)", border: "1px solid rgba(255,201,70,0.30)", borderRadius: 4, padding: "1px 5px", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
                    <Timer size={8} color="#ffc946" />flood
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>
                    {!rl ? "…" : `${count}/${max}`}
                  </span>
                )}
              </div>
              <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                {isFlooded ? (
                  <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#ffc946,#ffa94d)", borderRadius: 1, animation: "pulse 1.4s ease-in-out infinite" }} />
                ) : (
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 1, transition: "width 0.6s ease" }} />
                )}
              </div>
              {isFlooded && (
                <div style={{ marginTop: 4, fontSize: 8, color: "#ffc946", opacity: 0.75 }}>
                  ⏳ flood wait — пауза
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

const MAX_CRASHES = 5; // must match worker.py MAX_CRASHES

// ── Main page ─────────────────────────────────────────────────────────────────

export function WorkersPage() {
  const { t, lang } = useI18n();
  const [workers,      setWorkers]      = useState<BroadcastWorker[]>([]);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [summary,      setSummary]      = useState<WorkersSummary | null>(null);
  const [scheduled,    setScheduled]    = useState<GroupCampaign[]>([]);
  const [accounts,      setAccounts]      = useState<SenderAccount[]>([]);
  const [accountStats,  setAccountStats]  = useState<Record<string, { ok: number; failed: number }>>({});
  const [loading,       setLoading]       = useState(true);
  const [taskTab,       setTaskTab]       = useState<"all" | "pending" | "claimed" | "failed">("all");
  const [taskSearch,    setTaskSearch]    = useState("");
  const [showAccounts,  setShowAccounts]  = useState(false);
  const [sseAlive,      setSseAlive]      = useState(false);
  const [crashHistory,  setCrashHistory]  = useState<WorkerCrashEvent[]>([]);
  const lastSseRef = useRef(0);   // monotonic ms of last received SSE event
  const SSE_DEAD_MS = 20_000;     // treat SSE as dead if no event for 20s

  // ── Full REST load (initial + fallback) ──────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [w, t, s, gc, accts, crashes, acctStats] = await Promise.all([
        api.getWorkers(),
        api.getTasks(),
        api.getWorkersSummary(),
        api.getGroupCampaigns(),
        api.getAccounts(),
        api.getWorkerCrashHistory(),
        api.getAccountSendsToday().catch(() => [] as { account_id: string; ok: number; failed: number }[]),
      ]);
      setWorkers(w);
      setTasks(t);
      setSummary(s);
      setAccounts(accts);
      setCrashHistory(crashes);
      const statsMap: Record<string, { ok: number; failed: number }> = {};
      acctStats.forEach(s => { statsMap[s.account_id] = { ok: s.ok, failed: s.failed }; });
      setAccountStats(statsMap);
      setScheduled(
        gc.filter(c => c.status === "running" || c.status === "paused")
          .sort((a, b) => {
            if (!a.next_send_at) return 1;
            if (!b.next_send_at) return -1;
            return new Date(a.next_send_at).getTime() - new Date(b.next_send_at).getTime();
          })
      );
    } catch {}
    finally { setLoading(false); }
  }, []);

  // ── SSE live updates ──────────────────────────────────────────────────────
  useSse((type, data) => {
    const wasDown = Date.now() - lastSseRef.current > SSE_DEAD_MS;
    lastSseRef.current = Date.now();

    if (wasDown) {
      // SSE reconnected after an outage — do a full REST reload to resync all state
      setSseAlive(true);
      load();
      return;
    }

    setSseAlive(true);

    if (type === "workers") {
      const ws = data as BroadcastWorker[];
      setWorkers(prev => {
        // Auto-refresh crash history if any worker's crash_count increased
        const prevMap = new Map(prev.map(w => [w.worker_id, w.crash_count ?? 0]));
        const needsRefresh = ws.some(w => (w.crash_count ?? 0) > (prevMap.get(w.worker_id) ?? 0));
        if (needsRefresh) api.getWorkerCrashHistory().then(h => setCrashHistory(h)).catch(() => {});
        return ws;
      });
      setSummary(prev => {
        if (!prev) return prev;
        return { ...prev, alive_workers: ws.filter(w => w.is_alive).length };
      });
    }
    if (type === "group_campaigns") {
      const gcs = data as GroupCampaign[];
      setScheduled(
        gcs.filter(c => c.status === "running" || c.status === "paused")
          .sort((a, b) => {
            if (!a.next_send_at) return 1;
            if (!b.next_send_at) return -1;
            return new Date(a.next_send_at).getTime() - new Date(b.next_send_at).getTime();
          })
      );
    }
    if (type === "accounts") setAccounts(data as SenderAccount[]);
    if (type === "tasks") {
      const ts = data as Task[];
      setTasks(ts);
      setSummary(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks_pending: ts.filter(t => t.status === "pending").length,
          tasks_done:    ts.filter(t => t.status === "done").length,
          tasks_failed:  ts.filter(t => t.status === "failed").length,
          tasks_dead:    ts.filter(t => t.status === "dead").length,
        };
      });
    }
  });

  // ── Initial load + watchdog: poll when SSE is silent ─────────────────────
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      const age = Date.now() - lastSseRef.current;
      if (age > SSE_DEAD_MS) {
        // SSE has been silent — mark badge as disconnected and poll REST
        setSseAlive(false);
        load();
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const filteredTasks = (taskTab === "all" ? tasks : tasks.filter(t => t.status === taskTab))
    .filter(t => !taskSearch.trim() || String(t.campaign_id).includes(taskSearch) || String(t.id).includes(taskSearch) || (t.error ?? "").toLowerCase().includes(taskSearch.toLowerCase()))
    .slice(0, 50);
  const aliveWorkers  = workers.filter(w => w.is_alive);
  const deadWorkers   = workers.filter(w => !w.is_alive);
  const lockedAccounts = accounts.filter(a => a.locked_by);

  return (
    <>
      <style>{`
        @keyframes hb-ring {
          0%   { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0;   transform: scale(2.4); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 100px" }}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>{t.nav.workers}</div>
              {aliveWorkers.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.10)", borderRadius: 20, padding: "2px 9px" }}>
                  {aliveWorkers.length} активных
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SseBadge connected={sseAlive} />
              <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.light(); load(); }}>
                <RefreshCw size={14} color="#6ba8e5" />
              </GlassCard>
            </div>
          </div>

          {/* ── Summary tiles ───────────────────────────────────────── */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 5 }}>
              {[
                { label: "Живых",    value: summary.alive_workers,                      color: "#2de897" },
                { label: "Активных", value: tasks.filter(t => t.status === "claimed").length, color: "#6ba8e5" },
                { label: "Очередь",  value: summary.tasks_pending,                      color: "#ffc946" },
                { label: "Готово",   value: summary.tasks_done,                         color: "#2de897" },
                { label: "Ошибок",   value: summary.tasks_failed + summary.tasks_dead,  color: "#ff6b7a" },
              ].map(s => (
                <GlassCard key={s.label} style={{ padding: "9px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 8, color: TG.muted, marginTop: 2 }}>{s.label}</div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* ── Rate-limit summary strip ────────────────────────── */}
          {accounts.length > 0 && <RateLimitSummaryStrip accounts={accounts} />}

          {/* ── Crash-loop alert banner ─────────────────────────── */}
          {!loading && deadWorkers.length > 0 && (
            <GlassCard glow="rgba(255,107,122,0.18)" style={{ padding: "12px 14px", border: "1px solid rgba(255,107,122,0.30)", background: "rgba(255,107,122,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <AlertTriangle size={14} color="#ff6b7a" />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#ff6b7a" }}>
                  {deadWorkers.length === 1 ? "Воркер упал" : `${deadWorkers.length} воркера упали`} — аварийное завершение
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deadWorkers.map(w => {
                  const wCrashes = crashHistory.filter(c => c.worker_id === w.worker_id);
                  const crashCount = w.crash_count ?? wCrashes.length;
                  const pct = Math.min((crashCount / MAX_CRASHES) * 100, 100);
                  const barColor = pct >= 80 ? "#ff6b7a" : pct >= 60 ? "#ffc946" : "#6ba8e5";
                  const rateLimitTripped = crashCount >= MAX_CRASHES;
                  return (
                    <div key={w.worker_id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.20)" }}>
                      {/* Header row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <RotateCcw size={11} color="#ff6b7a" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#ff6b7a" }}>{w.worker_id}</span>
                        </div>
                        <RestartWorkerButton workerId={w.worker_id} onRestarted={load} />
                      </div>

                      {/* Rate-limit indicator */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: TG.muted }}>Рестартов</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: barColor }}>
                            {crashCount} / {MAX_CRASHES}
                            {rateLimitTripped && <span style={{ marginLeft: 4, color: "#ff6b7a" }}>⚠ лимит исчерпан</span>}
                            {!rateLimitTripped && pct >= 60 && <span style={{ marginLeft: 4, color: "#ffc946" }}>⚡ почти лимит</span>}
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: barColor, transition: "width 0.5s ease, background 0.3s ease", boxShadow: pct >= 80 ? `0 0 8px ${barColor}80` : "none" }} />
                        </div>
                      </div>

                      {/* Last error */}
                      {w.last_error && (
                        <div style={{ fontSize: 10, color: "rgba(255,107,122,0.80)", fontFamily: "monospace", wordBreak: "break-word", marginBottom: wCrashes.length > 0 ? 8 : 0, padding: "4px 6px", background: "rgba(0,0,0,0.20)", borderRadius: 6 }}>
                          {w.last_error.length > 140 ? w.last_error.slice(0, 140) + "…" : w.last_error}
                        </div>
                      )}

                      {/* Crash history timeline */}
                      {wCrashes.length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>История рестартов</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {wCrashes.slice(0, 5).map((c, idx) => (
                              <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                <div style={{ marginTop: 3, width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: idx === 0 ? "#ff6b7a" : "rgba(255,107,122,0.40)", boxShadow: idx === 0 ? "0 0 6px rgba(255,107,122,0.5)" : "none" }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, color: TG.textSecondary }}>
                                    <span style={{ color: idx === 0 ? "#ffc946" : TG.muted }}>{timeAgo(c.crashed_at)} назад</span>
                                    <span style={{ marginLeft: 6, color: "#ff6b7a", opacity: 0.7 }}>#{c.restart_num}</span>
                                    {c.error && (
                                      <span style={{ display: "block", fontSize: 9, fontFamily: "monospace", color: "rgba(255,107,122,0.60)", marginTop: 1, wordBreak: "break-all" }}>
                                        {c.error.length > 80 ? c.error.slice(0, 80) + "…" : c.error}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(107,168,229,0.4)", borderTopColor: "#6ba8e5", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : (
            <>
              {/* ── Active workers ──────────────────────────────────── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                  {t.workers.liveWorkers} {aliveWorkers.length > 0 && `(${aliveWorkers.length})`}
                </div>
                {aliveWorkers.length === 0 ? (
                  <GlassCard style={{ padding: "18px 16px", border: "1px solid rgba(255,201,70,0.30)", background: "rgba(255,201,70,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <AlertTriangle size={18} color="#ffc946" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#ffc946" }}>{t.home.noWorkers}</div>
                        <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>{t.workers.noWorkersDesc}</div>
                      </div>
                    </div>
                    <SpawnWorkerButton onSpawned={() => setTimeout(load, 2000)} prominent />
                  </GlassCard>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(45,232,151,0.1)", borderRadius: 12, fontSize: 10, fontWeight: 700, color: "#2de897" }}><Cpu size={12} /> {aliveWorkers.length} {t.workers.aliveShort}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(255,107,122,0.1)", borderRadius: 12, fontSize: 10, fontWeight: 700, color: "#ff6b7a" }}><AlertTriangle size={12} /> {deadWorkers.length} {t.workers.deadShort}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(107,168,229,0.1)", borderRadius: 12, fontSize: 10, fontWeight: 700, color: "#6ba8e5" }}><CheckCircle size={12} /> {workers.reduce((acc, w) => acc + (w.tasks_done || 0), 0)} {t.workers.tasksShort}</div>
                    </div>
                    {aliveWorkers.map((w, i) => <WorkerCard key={w.worker_id} worker={w} index={i} onDelete={load} accounts={accounts} accountStats={accountStats} />)}
                  </div>
                )}
              </div>

              {/* ── Action buttons ──────────────────────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {aliveWorkers.length > 0 && (
                  <SpawnWorkerButton onSpawned={() => setTimeout(load, 2000)} />
                )}
                <RecoverLocksButton onDone={load} />
              </div>

              {/* ── Accounts panel (collapsible) ────────────────────── */}
              <div>
                <div
                  onClick={() => { haptic.light(); setShowAccounts(v => !v); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: "pointer" }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={11} />
                    {t.nav.accounts} ({accounts.length})
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
                      <div style={{ textAlign: "center", padding: "12px 0", fontSize: 12, color: TG.muted }}>{t.accounts.noAccounts}</div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 10, color: TG.muted, flexWrap: "wrap" }}>
                          <span><span style={{ color: "#2de897" }}>●</span> {t.workers.free}</span>
                          <span><span style={{ color: "#ffc946" }}>●</span> {t.workers.inProgress}</span>
                          <span><span style={{ color: "#ff6b7a" }}>●</span> {t.status.banned.toLowerCase()}</span>
                          {accounts.some(a => a.status === "proxy_failed") && (
                            <span style={{ color: "#ff6b7a", fontWeight: 700 }}>⚠️ proxy_failed: {accounts.filter(a => a.status === "proxy_failed").length}</span>
                          )}
                        </div>
                        {accounts.map(a => <AccountRow key={a.id} account={a} sendsToday={accountStats[String(a.id)]} />)}
                      </>
                    )}
                  </GlassCard>
                )}
              </div>

              {/* ── Dead workers ────────────────────────────────────── */}
              {deadWorkers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                    Остановленные ({deadWorkers.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {deadWorkers.map((w, i) => <WorkerCard key={w.worker_id} worker={w} index={aliveWorkers.length + i} onDelete={load} />)}
                  </div>
                </div>
              )}

              {/* ── Task queue ──────────────────────────────────────── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
                    <ListTodo size={11} /> Очередь задач {tasks.length > 0 && <span style={{ fontWeight: 700, color: "#6ba8e5", background: "rgba(107,168,229,0.12)", borderRadius: 20, padding: "1px 6px", fontSize: 9 }}>{tasks.length}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {(["all", "pending", "claimed", "failed"] as const).map(s => (
                      <button key={s} onClick={() => setTaskTab(s)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, border: `1px solid ${taskTab === s ? "#6ba8e5" : "rgba(255,255,255,0.11)"}`, background: taskTab === s ? "rgba(107,168,229,0.15)" : "transparent", color: taskTab === s ? "#6ba8e5" : TG.muted, cursor: "pointer", fontWeight: 600 }}>
                        {s === "all" ? "Все" : s === "pending" ? "Ожид." : s === "claimed" ? "В работе" : "Ошибки"}
                      </button>
                    ))}
                  </div>
                </div>
                {tasks.length > 5 && (
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <input
                      value={taskSearch} onChange={e => setTaskSearch(e.target.value)}
                      placeholder={`🔍 ${t.workers.taskSearchPlaceholder}`}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "8px 36px 8px 12px", fontSize: 12, color: TG.text, outline: "none", boxSizing: "border-box" }}
                    />
                    {taskSearch && (
                      <button onClick={() => { setTaskSearch(""); haptic.light(); }}
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: TG.muted, fontSize: 13, display: "flex", alignItems: "center" }}>
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {tasks.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {tasks.some(t => t.status === "failed" || t.status === "dead") && (
                      <button onClick={async () => { haptic.medium(); const r = await api.bulkRetryTasks(); haptic.success(); load(); alert(`♻️ Перезапущено ${r.updated} задач`); }}
                        style={{ flex: 1, padding: "7px", background: "rgba(107,168,229,0.09)", border: "1px solid rgba(107,168,229,0.28)", borderRadius: 10, color: "#6ba8e5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        ♻️ Повтор всех ошибок
                      </button>
                    )}
                    {tasks.some(t => t.status === "pending" || t.status === "claimed") && (
                      <button onClick={async () => { haptic.warning(); const r = await api.bulkCancelTasks(); haptic.success(); load(); alert(`🚫 Отменено ${r.updated} задач`); }}
                        style={{ flex: 1, padding: "7px", background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.22)", borderRadius: 10, color: "#ff6b7a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        🚫 Отменить все
                      </button>
                    )}
                  </div>
                )}

                {filteredTasks.length === 0 ? (
                  <GlassCard style={{ padding: 16, textAlign: "center" }}>
                    <CheckCircle size={16} color="#2de897" style={{ marginBottom: 6, opacity: 0.7 }} />
                    <div style={{ fontSize: 12, color: TG.muted }}>Задач нет</div>
                  </GlassCard>
                ) : (
                  <div>{filteredTasks.map(t => <TaskRow key={t.id} task={t} onAction={load} campaignName={scheduled.find(c => c.id === t.campaign_id)?.name} />)}</div>
                )}
              </div>

              {/* ── Scheduled campaigns ─────────────────────────────── */}
              {scheduled.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Calendar size={11} /> Расписание ({scheduled.length})
                  </div>
                  <GlassCard style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {scheduled.slice(0, 10).map(c => <ScheduledCampaignRow key={c.id} c={c} />)}
                      {scheduled.length > 10 && <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", padding: "4px 0" }}>+{scheduled.length - 10} ещё</div>}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ── Bulk cleanup ────────────────────────────────────── */}
              {deadWorkers.length > 0 && (
                <button
                  onClick={async () => { haptic.warning(); await Promise.all(deadWorkers.map(w => api.deleteWorker(w.worker_id))); haptic.success(); load(); }}
                  style={{ width: "100%", padding: "9px", background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.22)", borderRadius: 10, color: "#ff6b7a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  🧹 Удалить остановленные ({deadWorkers.length})
                </button>
              )}

              {/* ── How to run hint ─────────────────────────────────── */}
              <GlassCard style={{ padding: 14, background: "rgba(107,168,229,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6ba8e5", marginBottom: 6 }}>Ручной запуск</div>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: TG.textSecondary, lineHeight: 2 }}>
                  python worker.py worker-1<br />
                  python worker.py worker-2<br />
                  <span style={{ color: TG.muted, fontFamily: "inherit", fontSize: 10 }}>Или: WORKER_COUNT=2 python main.py</span>
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </>
  );
}
