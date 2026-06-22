import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../lib/i18n";
import { Plus, Play, Pause, Square, Copy, Trash2, Radio, ChevronRight, ChevronDown, ChevronUp, Clock, Send, AlertCircle, CheckCircle, BarChart2, X } from "lucide-react";
import { api, GroupCampaign, GroupCampaignLog, GroupSendStat, DailyStat, AccountGroup } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";
import { useSse } from "../lib/useSse";

const STATUS_COLOR: Record<string, string> = {
  draft:     "#7c8db0",
  running:   "#2de897",
  paused:    "#ffc946",
  cancelled: "#ff6b7a",
  ok:        "#2de897",
  sent:      "#2de897",
  failed:    "#ff6b7a",
  error:     "#ff6b7a",
};

function fmtInterval(seconds: number): string {
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} д`;
  return `${Math.floor(seconds / 604800)} нед`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}с`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  return `${Math.floor(diff / 86400)}д`;
}

function NextSendCountdown({ iso }: { iso: string }) {
  const [diff, setDiff] = useState(() => Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    setDiff(Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
    ref.current = setInterval(() => setDiff(Math.floor((new Date(iso).getTime() - Date.now()) / 1000)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [iso]);
  const fmt = diff <= 0 ? "сейчас" : diff < 60 ? `${diff}с` : diff < 3600 ? `${Math.floor(diff / 60)}м ${diff % 60}с` : `${Math.floor(diff / 3600)}ч ${Math.floor((diff % 3600) / 60)}м`;
  return (
    <div style={{ fontSize: 10, color: TG.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
      <Clock size={10} color={diff > 0 && diff <= 60 ? "#ffc946" : TG.muted} />
      <span>Следующая через <span style={{ color: diff <= 0 ? "#2de897" : diff <= 60 ? "#ffc946" : TG.textSecondary, fontWeight: 700 }}>{fmt}</span></span>
    </div>
  );
}

// ── Live Send Feed component ──────────────────────────────────────────────────

function LiveSendFeed({ sends, onRetried }: { sends: GroupCampaignLog[]; onRetried?: () => void }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [retrying,   setRetrying]   = useState(false);
  const [retryDone,  setRetryDone]  = useState<{ tasks: number; camps: number } | null>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const prevLenRef  = useRef(0);

  useEffect(() => {
    if (sends.length > prevLenRef.current && !collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLenRef.current = sends.length;
  }, [sends.length, collapsed]);

  if (sends.length === 0) return null;

  const okCount    = sends.filter(s => s.status === "ok" || s.status === "sent").length;
  const errorCount = sends.filter(s => s.status === "error" || s.status === "failed").length;

  async function handleRetry(e: React.MouseEvent) {
    e.stopPropagation();
    haptic.medium(); setRetrying(true); setRetryDone(null);
    try {
      const r = await api.retryFailedSends(24);
      haptic.success();
      setRetryDone({ tasks: r.tasks_created, camps: r.campaigns });
      onRetried?.();
      setTimeout(() => setRetryDone(null), 4000);
    } catch { haptic.error(); }
    finally { setRetrying(false); }
  }

  return (
    <GlassCard glow="rgba(45,232,151,0.12)" style={{ padding: "10px 12px", border: "1px solid rgba(45,232,151,0.22)", background: "rgba(45,232,151,0.04)" }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => { haptic.light(); setCollapsed(v => !v); }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#2de897", animation: "hb-ring 1.8s ease-out infinite" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#2de897" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#2de897" }}>Live-лента</span>
          <span style={{ fontSize: 10, color: TG.muted }}>({sends.length})</span>
          {sends.length > 0 && (() => {
            const sr = Math.round((okCount / sends.length) * 100);
            const srColor = sr >= 80 ? "#2de897" : sr >= 50 ? "#ffc946" : "#ff6b7a";
            return <span style={{ fontSize: 9, fontWeight: 700, color: srColor, background: `${srColor}15`, border: `1px solid ${srColor}35`, borderRadius: 10, padding: "1px 6px" }}>{sr}%</span>;
          })()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {okCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.10)", borderRadius: 10, padding: "1px 6px" }}>✓ {okCount}</span>
          )}
          {errorCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.10)", borderRadius: 10, padding: "1px 6px" }}>✗ {errorCount}</span>
          )}
          {errorCount > 0 && (
            <button
              onClick={handleRetry} disabled={retrying}
              style={{ fontSize: 10, fontWeight: 700, color: retryDone ? "#2de897" : "#ffc946", background: retryDone ? "rgba(45,232,151,0.12)" : "rgba(255,201,70,0.12)", border: `1px solid ${retryDone ? "rgba(45,232,151,0.30)" : "rgba(255,201,70,0.30)"}`, borderRadius: 8, padding: "3px 8px", cursor: retrying ? "not-allowed" : "pointer", opacity: retrying ? 0.6 : 1, transition: "all 0.25s" }}
            >
              {retrying ? "…" : retryDone ? `✓ ${retryDone.tasks} задач` : "↺ Повторить ошибки"}
            </button>
          )}
          {collapsed ? <ChevronDown size={14} color={TG.muted} /> : <ChevronUp size={14} color={TG.muted} />}
        </div>
      </div>

      {/* Feed rows */}
      {!collapsed && (
        <div
          ref={scrollRef}
          style={{ marginTop: 10, maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}
        >
          {sends.map(s => {
            const isOk     = s.status === "ok" || s.status === "sent";
            const isBanned = s.status === "banned";
            const dotColor = isOk ? "#2de897" : isBanned ? "#ffc946" : "#ff6b7a";
            const acct     = s.account_label || s.account_phone || (s.account_id ? `#${s.account_id}` : "—");
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "5px 6px", borderRadius: 8, background: isBanned ? "rgba(255,201,70,0.05)" : "rgba(255,255,255,0.03)", border: isBanned ? "1px solid rgba(255,201,70,0.18)" : "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ marginTop: 4, width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: dotColor, boxShadow: isOk ? "0 0 5px rgba(45,232,151,0.5)" : isBanned ? "0 0 5px rgba(255,201,70,0.5)" : "0 0 5px rgba(255,107,122,0.5)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: TG.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>
                      {isBanned && "⛔ "}{s.group_title || s.group_id}
                    </span>
                    <span style={{ fontSize: 9, color: TG.muted }}>•</span>
                    <span style={{ fontSize: 10, color: "#6ba8e5" }}>{acct}</span>
                    <span style={{ marginLeft: "auto", fontSize: 9, color: TG.muted, whiteSpace: "nowrap" }}>
                      {s.sent_at ? timeAgo(s.sent_at) + " назад" : "—"}
                    </span>
                  </div>
                  {!isOk && s.error && (
                    <div style={{ fontSize: 9, color: isBanned ? "rgba(255,201,70,0.80)" : "rgba(255,107,122,0.75)", fontFamily: "monospace", marginTop: 2, wordBreak: "break-all" }}>
                      {s.error.length > 70 ? s.error.slice(0, 70) + "…" : s.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

type ExpandTab = "logs" | "stats";

function GroupCampaignCard({
  campaign,
  onRefresh,
  onEdit,
  isActive,
  liveSends,
}: {
  campaign: GroupCampaign;
  onRefresh: () => void;
  onEdit: (id: number) => void;
  isActive?: boolean;
  liveSends?: GroupCampaignLog[];
}) {
  const [busy,         setBusy]         = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [expandTab,    setExpandTab]    = useState<ExpandTab>("logs");
  const [logs,         setLogs]         = useState<GroupCampaignLog[]>([]);
  const [stats,        setStats]        = useState<GroupSendStat[]>([]);
  const [daily,        setDaily]        = useState<DailyStat[]>([]);
  const [logsLoaded,   setLogsLoaded]   = useState(false);
  const [statsLoaded,  setStatsLoaded]  = useState(false);
  const [loadingData,  setLoadingData]  = useState(false);
  const [testGroupId,  setTestGroupId]  = useState<string | null>(null);
  const [acctGroups,   setAcctGroups]   = useState<AccountGroup[]>([]);
  const [logFilter,    setLogFilter]    = useState<"all"|"ok"|"failed"|"banned">("all");

  const color  = STATUS_COLOR[campaign.status] ?? "#7c8db0";
  const groups: string[] = (() => { try { return JSON.parse(campaign.selected_groups || "[]"); } catch { return []; } })();

  const liveCampSends = (liveSends ?? []).filter(l => l.campaign_id === campaign.id);
  const seenLogIds = new Set(logs.map(l => l.id));
  const newLiveSends = liveCampSends.filter(l => !seenLogIds.has(l.id));
  const allMergedLogs = [...newLiveSends, ...logs].slice(0, 25);
  const mergedLogs = logFilter === "all" ? allMergedLogs : allMergedLogs.filter(l => {
    if (logFilter === "ok")     return l.status === "ok" || l.status === "sent";
    if (logFilter === "failed") return l.status === "failed" || l.status === "error";
    if (logFilter === "banned") return l.status === "banned";
    return true;
  });
  const recentOk     = liveCampSends.filter(s => (s.status === "ok" || s.status === "sent")).length;
  const recentErr    = liveCampSends.filter(s => (s.status === "failed" || s.status === "error")).length;
  const recentBanned = liveCampSends.filter(s => s.status === "banned").length;
  const chartMaxVal = Math.max(...daily.map(d => d.sent + d.failed), 1);
  const chartBarW   = Math.floor(240 / Math.max(daily.length, 1)) - 2;

  // Load account groups for test-send title lookup (lazy, once)
  function ensureAcctGroups() {
    if (acctGroups.length > 0 || !campaign.sender_account_id) return;
    api.getAccountGroups(campaign.sender_account_id).then(setAcctGroups).catch(() => {});
  }

  function groupTitle(gid: string): string {
    const found = acctGroups.find(g => g.group_id === gid);
    return found?.group_title ?? gid;
  }

  async function action(act: string) {
    haptic.medium(); setBusy(true);
    try { await api.actionGroupCampaign(campaign.id, act); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  async function sendNow() {
    haptic.heavy(); setBusy(true);
    try { await api.sendNowGroupCampaign(campaign.id); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  async function duplicate() {
    haptic.medium(); setBusy(true);
    try { await api.duplicateGroupCampaign(campaign.id); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  async function remove() {
    haptic.warning(); setBusy(true);
    try { await api.deleteGroupCampaign(campaign.id); haptic.success(); onRefresh(); }
    catch { haptic.error(); setBusy(false); }
  }

  async function loadLogs(force = false) {
    if (logsLoaded && !force) return;
    setLoadingData(true);
    try { setLogs((await api.getGroupCampaignLogs(campaign.id)).slice(0, 20)); setLogsLoaded(true); }
    catch {} finally { setLoadingData(false); }
  }

  async function loadStats(force = false) {
    if (statsLoaded && !force) return;
    setLoadingData(true);
    try {
      const s = await api.getGroupCampaignStats(campaign.id);
      setStats(s.by_group);
      setDaily([...s.daily].reverse().slice(-14));
      setStatsLoaded(true);
    }
    catch {} finally { setLoadingData(false); }
  }

  async function openTab(tab: ExpandTab) {
    haptic.light();
    const wasExpanded = expanded && expandTab === tab;
    setExpandTab(tab);
    if (!expanded) setExpanded(true);
    // Force-reload when switching tabs or re-opening same tab
    if (tab === "logs") await loadLogs(wasExpanded);
    if (tab === "stats") await loadStats(wasExpanded);
  }

  async function toggleExpand() {
    haptic.light();
    if (!expanded) {
      setExpanded(true);
      // Force-reload on every re-open so data is fresh
      if (expandTab === "logs") await loadLogs(true);
      else await loadStats(true);
    } else {
      setExpanded(false);
    }
  }

  return (
    <GlassCard glow={`${color}20`} style={{ padding: 14 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={16} color={color} />
          </div>
          {isActive && (
            <div style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: "#6ba8e5", border: "2px solid #0d1117", animation: "hb-ring 1.8s ease-out infinite" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
          {isActive && (
            <div style={{ fontSize: 9, color: "#6ba8e5", fontWeight: 700, marginBottom: 1 }}>● В работе у воркера</div>
          )}
          <div style={{ fontSize: 10, color: TG.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.text_template}</div>
          {campaign.notes && <div style={{ fontSize: 9, color: "#c4aeff", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📝 {campaign.notes}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: "2px 7px" }}>
              {campaign.status.toUpperCase()}
            </span>
            <div onClick={() => { haptic.light(); onEdit(campaign.id); }} style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronRight size={13} color={TG.muted} />
            </div>
          </div>
          {isActive && (recentOk + recentErr + recentBanned) > 0 && (
            <div style={{ display: "flex", gap: 3 }}>
              {recentOk     > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 20, padding: "1px 5px" }}>✓{recentOk} live</span>}
              {recentErr    > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.12)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 20, padding: "1px 5px" }}>✗{recentErr}</span>}
              {recentBanned > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.25)", borderRadius: 20, padding: "1px 5px" }}>⛔{recentBanned}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {(() => {
        const total   = campaign.sent_count + campaign.failed_count;
        const succPct = total > 0 ? Math.round((campaign.sent_count / total) * 100) : null;
        const succColor = succPct === null ? "#7c8db0" : succPct >= 90 ? "#2de897" : succPct >= 70 ? "#ffc946" : "#ff6b7a";
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 4, marginBottom: 10 }}>
            {[
              { label: "Групп",     value: String(groups.length),                   color: "#6ba8e5" },
              { label: "Отправлено",value: String(campaign.sent_count),              color: "#2de897" },
              { label: "Ошибок",    value: String(campaign.failed_count),            color: "#ff6b7a" },
              { label: "Интервал",  value: fmtInterval(campaign.interval_seconds),  color: "#ffc946" },
              { label: "Успех",     value: succPct !== null ? `${succPct}%` : "—",  color: succColor },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 2px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 7, color: TG.muted, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Next send live countdown — ticking */}
      {campaign.next_send_at && (campaign.status === "running" || campaign.status === "paused") && (
        <NextSendCountdown iso={campaign.next_send_at} />
      )}

      {/* Last sent timestamp */}
      {campaign.last_sent_at && (
        <div style={{ fontSize: 9, color: TG.muted, textAlign: "right", marginTop: -6, marginBottom: 4 }}>
          Последний: {new Date(campaign.last_sent_at).toLocaleString("uk-UA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {campaign.status === "running" ? (
          <button onClick={() => action("pause")} disabled={busy} style={{ flex: 1, padding: "8px", borderRadius: 10, background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.3)", fontSize: 11, fontWeight: 700, color: "#ffc946", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Pause size={11} />Пауза
          </button>
        ) : campaign.status === "paused" ? (
          <button onClick={() => action("resume")} disabled={busy} style={{ flex: 1, padding: "8px", borderRadius: 10, background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.3)", fontSize: 11, fontWeight: 700, color: "#2de897", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Play size={11} />Продолжить
          </button>
        ) : (
          <button onClick={() => action("start")} disabled={busy} style={{ flex: 1, padding: "8px", borderRadius: 10, background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.3)", fontSize: 11, fontWeight: 700, color: "#2de897", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Play size={11} />Запустить
          </button>
        )}

        <button onClick={sendNow} disabled={busy} title="Отправить во все группы сейчас" style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.3)", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: busy ? 0.5 : 1 }}>
          <Send size={12} color="#6ba8e5" />
          <span style={{ fontSize: 10, color: "#6ba8e5", fontWeight: 700 }}>Сейчас</span>
        </button>

        {/* Test-send picker */}
        <div style={{ position: "relative" }}>
          <button
            disabled={busy}
            onClick={() => { ensureAcctGroups(); setTestGroupId(p => p === null ? "" : null); }}
            title="Тест в одну группу"
            style={{ padding: "8px 10px", borderRadius: 10, background: testGroupId !== null ? "rgba(196,174,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${testGroupId !== null ? "rgba(196,174,255,0.4)" : "rgba(255,255,255,0.12)"}`, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <span style={{ fontSize: 10, color: "#c4aeff", fontWeight: 700 }}>Тест</span>
          </button>
          {testGroupId !== null && (
            <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 10, minWidth: 200, background: "#141824", border: "1px solid rgba(196,174,255,0.3)", borderRadius: 12, padding: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 10, color: "#c4aeff", fontWeight: 700, marginBottom: 8 }}>ТЕСТ — выбери группу</div>
              {groups.length === 0 ? (
                <div style={{ fontSize: 11, color: TG.muted }}>Группы не выбраны</div>
              ) : (
                <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {groups.map((gid: string) => (
                    <button key={gid} onClick={async () => {
                      setTestGroupId(null);
                      haptic.heavy(); setBusy(true);
                      try { await api.testSendGroupCampaign(campaign.id, gid); haptic.success(); }
                      catch { haptic.error(); } finally { setBusy(false); }
                    }} style={{ textAlign: "left", padding: "6px 8px", borderRadius: 8, background: "rgba(196,174,255,0.08)", border: "1px solid rgba(196,174,255,0.2)", fontSize: 11, color: TG.textSecondary, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {groupTitle(gid)}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setTestGroupId(null)} style={{ marginTop: 8, width: "100%", padding: "5px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: TG.muted, cursor: "pointer" }}>Закрыть</button>
            </div>
          )}
        </div>

        {campaign.status === "running" && (
          <button onClick={() => action("stop")} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Square size={12} color="#ff6b7a" />
          </button>
        )}
        <button onClick={duplicate} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Copy size={12} color="#6ba8e5" />
        </button>
        <button onClick={remove} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.20)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={12} color="#ff6b7a" />
        </button>
      </div>

      {/* Expand bar with tab switcher */}
      <div style={{ display: "flex", gap: 5 }}>
        <button onClick={() => openTab("logs")} style={{ flex: 1, padding: "6px", background: expanded && expandTab === "logs" ? "rgba(107,168,229,0.1)" : "none", border: `1px solid ${expanded && expandTab === "logs" ? "rgba(107,168,229,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {loadingData && expandTab === "logs" ? (
            <span style={{ fontSize: 10, color: TG.muted }}>Загрузка…</span>
          ) : (
            <>
              {expanded && expandTab === "logs" ? <ChevronUp size={10} color="#6ba8e5" /> : <ChevronDown size={10} color={TG.muted} />}
              <span style={{ fontSize: 10, color: expanded && expandTab === "logs" ? "#6ba8e5" : TG.muted }}>Отправки</span>
            </>
          )}
        </button>
        <button onClick={() => openTab("stats")} style={{ flex: 1, padding: "6px", background: expanded && expandTab === "stats" ? "rgba(45,232,151,0.08)" : "none", border: `1px solid ${expanded && expandTab === "stats" ? "rgba(45,232,151,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {loadingData && expandTab === "stats" ? (
            <span style={{ fontSize: 10, color: TG.muted }}>Загрузка…</span>
          ) : (
            <>
              <BarChart2 size={10} color={expanded && expandTab === "stats" ? "#2de897" : TG.muted} />
              <span style={{ fontSize: 10, color: expanded && expandTab === "stats" ? "#2de897" : TG.muted }}>По группам</span>
              {expanded && expandTab === "stats" && <ChevronUp size={10} color="#2de897" />}
            </>
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {expandTab === "logs" ? (
            mergedLogs.length === 0 ? (
              <div style={{ fontSize: 11, color: TG.muted, textAlign: "center", padding: "8px 0" }}>Отправок ещё нет</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
                  {(["all","ok","failed","banned"] as const).map(f => {
                    const labels: Record<string, string> = { all:"Все", ok:"✓ OK", failed:"✗ Ошибки", banned:"⛔ Бан" };
                    const colors: Record<string, string> = { all:"#6ba8e5", ok:"#2de897", failed:"#ff6b7a", banned:"#ffc946" };
                    const active = logFilter === f;
                    return (
                      <button key={f} onClick={() => { haptic.light(); setLogFilter(f); }}
                        style={{ padding: "3px 8px", background: active ? `${colors[f]}18` : "none", border: `1px solid ${active ? `${colors[f]}50` : "rgba(255,255,255,0.08)"}`, borderRadius: 20, fontSize: 9, color: active ? colors[f] : TG.muted, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                        {labels[f]}
                      </button>
                    );
                  })}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => {
                    const rows = ["Группа,Статус,Ошибка,Время",
                      ...allMergedLogs.map(l => `"${l.group_title || l.group_id}",${l.status},"${l.error ?? ""}","${l.sent_at}"`)
                    ].join("\n");
                    const a = document.createElement("a");
                    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows);
                    a.download = `campaign_${campaign.id}_logs.csv`;
                    a.click();
                  }} style={{ padding: "3px 8px", background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.25)", borderRadius: 8, fontSize: 9, color: "#6ba8e5", fontWeight: 700, cursor: "pointer" }}>
                    ↓ CSV
                  </button>
                  {newLiveSends.length > 0 && (
                    <span style={{ fontSize: 9, color: "#2de897", background: "rgba(45,232,151,0.10)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                      ● live
                    </span>
                  )}
                </div>
                {mergedLogs.map((l, idx) => {
                  const isBanned = l.status === "banned";
                  const lc   = isBanned ? "#ffc946" : (STATUS_COLOR[l.status] ?? "#7c8db0");
                  const Icon = (l.status === "ok" || l.status === "sent") ? CheckCircle : AlertCircle;
                  const isNew = idx < newLiveSends.length;
                  return (
                    <div key={l.id ?? idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: isNew ? "rgba(45,232,151,0.05)" : isBanned ? "rgba(255,201,70,0.05)" : "rgba(255,255,255,0.03)", border: `1px solid ${isNew ? "rgba(45,232,151,0.18)" : isBanned ? "rgba(255,201,70,0.20)" : "rgba(255,255,255,0.07)"}`, transition: "background 0.3s" }}>
                      {isBanned ? <span style={{ fontSize: 11 }}>⛔</span> : <Icon size={11} color={lc} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: TG.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.group_title || l.group_id}</div>
                        {l.error && <div style={{ fontSize: 9, color: isBanned ? "rgba(255,201,70,0.80)" : "#ff6b7a", marginTop: 1 }}>{l.error.length > 60 ? l.error.slice(0, 60) + "…" : l.error}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
                        {isBanned && <span style={{ fontSize: 8, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.28)", borderRadius: 8, padding: "1px 5px" }}>БАН</span>}
                        <div style={{ fontSize: 9, color: TG.muted }}>{timeAgo(l.sent_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          ) : (
            stats.length === 0 && daily.length === 0 ? (
              <div style={{ fontSize: 11, color: TG.muted, textAlign: "center", padding: "8px 0" }}>Статистики пока нет</div>
            ) : (
              <>
                {stats.length > 0 && (() => {
                  const totSent   = stats.reduce((a, s) => a + s.sent, 0);
                  const totFailed = stats.reduce((a, s) => a + s.failed, 0);
                  const totAll    = totSent + totFailed;
                  const pctOk     = totAll > 0 ? Math.round((totSent / totAll) * 100) : 0;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.10)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 20, padding: "3px 8px" }}>✓ {totSent} всего</span>
                      {totFailed > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 20, padding: "3px 8px" }}>✗ {totFailed} ошибок</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, color: pctOk >= 80 ? "#2de897" : "#ffc946", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, padding: "3px 8px" }}>{pctOk}% успех</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => {
                        const rows = ["Группа,Отправлено,Ошибок,Всего,Последняя отправка",
                          ...stats.map(s => `"${s.group_title || s.group_id}",${s.sent},${s.failed},${s.total},${s.last_sent_at ?? ""}`)
                        ].join("\n");
                        const a = document.createElement("a");
                        a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows);
                        a.download = `campaign_${campaign.id}_stats.csv`;
                        a.click();
                      }} style={{ padding: "3px 8px", background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 8, fontSize: 9, color: "#2de897", fontWeight: 700, cursor: "pointer" }}>
                        ↓ CSV
                      </button>
                    </div>
                  );
                })()}
                {daily.length > 1 && (
                  <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 9, color: TG.muted, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Динамика ({daily.length} дн.)</div>
                    <svg width="100%" height="48" viewBox={`0 0 ${daily.length * (chartBarW + 2)} 48`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
                      {daily.map((d, i) => {
                        const x     = i * (chartBarW + 2);
                        const sentH = Math.max(2, Math.round((d.sent   / chartMaxVal) * 40));
                        const failH = Math.max(0, Math.round((d.failed / chartMaxVal) * 40));
                        return (
                          <g key={d.day}>
                            {d.failed > 0 && <rect x={x} y={48 - failH} width={chartBarW} height={failH} rx="2" fill="rgba(255,107,122,0.6)" />}
                            <rect x={x} y={48 - sentH - (d.failed > 0 ? failH : 0)} width={chartBarW} height={sentH} rx="2" fill="rgba(45,232,151,0.7)" />
                          </g>
                        );
                      })}
                    </svg>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ fontSize: 8, color: TG.muted }}>{daily[0]?.day?.slice(5)}</span>
                      <span style={{ fontSize: 8, color: TG.muted }}>{daily[daily.length - 1]?.day?.slice(5)}</span>
                    </div>
                  </div>
                )}
                {stats.slice(0, 8).map(s => {
                  const total = s.sent + s.failed;
                  const pct   = total > 0 ? Math.round((s.sent / total) * 100) : 0;
                  return (
                    <div key={s.group_id} style={{ padding: "7px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: TG.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.group_title || s.group_id}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "#2de897" }}>✓ {s.sent}</span>
                          {s.failed > 0 && <span style={{ fontSize: 10, color: "#ff6b7a" }}>✗ {s.failed}</span>}
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#2de897" : pct >= 50 ? "#ffc946" : "#ff6b7a", borderRadius: 3, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
                {stats.length > 8 && (
                  <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", padding: "4px 0" }}>+{stats.length - 8} групп ещё</div>
                )}
              </>
            )
          )}
        </div>
      )}
    </GlassCard>
  );
}

export function GroupBroadcastsPage({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (id: number) => void;
}) {
  const { t, lang } = useI18n();
  const [campaigns,         setCampaigns]         = useState<GroupCampaign[]>([]);
  const [activeCampaignIds, setActiveCampaignIds] = useState<Set<number>>(new Set());
  const [loading,           setLoading]           = useState(true);
  const [search,            setSearch]            = useState("");
  const [liveSends,         setLiveSends]         = useState<GroupCampaignLog[]>([]);
  const [bulkBusy,          setBulkBusy]          = useState<"pause" | "resume" | null>(null);

  const load = useCallback(async () => {
    try {
      const [camps, tasks] = await Promise.all([
        api.getGroupCampaigns(),
        api.getTasks("claimed"),
      ]);
      setCampaigns(camps);
      setActiveCampaignIds(new Set(tasks.map(t => t.campaign_id)));
    }
    catch {} finally { setLoading(false); }
  }, []);

  useSse((type, data) => {
    if (type === "group_campaigns") setCampaigns(data as GroupCampaign[]);
    if (type === "group_sends") {
      const sends = data as GroupCampaignLog[];
      setLiveSends(sends.slice(0, 40));
    }
  });

  useEffect(() => { load(); const t = setInterval(load, 12_000); return () => clearInterval(t); }, [load]);

  const running   = campaigns.filter(c => c.status === "running").length;
  const paused    = campaigns.filter(c => c.status === "paused").length;
  const done      = campaigns.filter(c => c.status === "done" || c.status === "completed").length;
  const errored   = campaigns.filter(c => c.status === "error" || c.status === "cancelled").length;
  const filtered  = search.trim() === "" ? campaigns
    : campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.text_template.toLowerCase().includes(search.toLowerCase()));

  async function bulkAction(action: "pause" | "resume") {
    haptic.medium(); setBulkBusy(action);
    try {
      const r = await api.bulkGroupCampaignAction(action);
      setCampaigns(r.campaigns);
      haptic.success();
    } catch { haptic.error(); }
    finally { setBulkBusy(null); }
  }

  return (
    <>
    <style>{`@keyframes hb-ring { 0% { opacity:.8; transform:scale(1); } 100% { opacity:0; transform:scale(2.4); } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 100px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Групповые</div>
            {running > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.10)", borderRadius: 20, padding: "2px 8px" }}>
                {running} active
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {running > 0 && (
              <button
                onClick={() => bulkAction("pause")} disabled={bulkBusy !== null}
                style={{ fontSize: 11, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.10)", border: "1px solid rgba(255,201,70,0.28)", borderRadius: 10, padding: "6px 10px", cursor: "pointer", opacity: bulkBusy ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}
              >
                {bulkBusy === "pause" ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(255,201,70,0.5)", borderTopColor: "#ffc946", animation: "spin 0.8s linear infinite" }} /> : <Pause size={11} />}
                Стоп всё
              </button>
            )}
            {paused > 0 && (
              <button
                onClick={() => bulkAction("resume")} disabled={bulkBusy !== null}
                style={{ fontSize: 11, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.10)", border: "1px solid rgba(45,232,151,0.28)", borderRadius: 10, padding: "6px 10px", cursor: "pointer", opacity: bulkBusy ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}
              >
                {bulkBusy === "resume" ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(45,232,151,0.5)", borderTopColor: "#2de897", animation: "spin 0.8s linear infinite" }} /> : <Play size={11} />}
                Старт всё
              </button>
            )}
            <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.medium(); onNew(); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} color="#2de897" />
                <span style={{ fontSize: 12, color: "#2de897", fontWeight: 700 }}>{t.common.create}</span>
              </div>
            </GlassCard>
          </div>
        </div>

        {campaigns.length > 3 && (
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`🔍 ${t.groups.searchPlaceholder}`}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 40px 10px 14px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }}
            />
            {search && (
              <button onClick={() => { setSearch(""); haptic.light(); }}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} color={TG.muted} />
              </button>
            )}
          </div>
        )}

        {!loading && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: t.campaigns.total,   value: campaigns.length,                                                                                    color: TG.text },
              { label: t.groups.running,    value: running,                                                                                              color: "#2de897" },
              { label: t.groups.paused,     value: paused,                                                                                               color: "#ffc946" },
              { label: t.groups.draft,      value: campaigns.filter(c => c.status === "draft").length,                                                   color: "#7c8db0" },
              { label: t.groups.sentTotal,  value: campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0).toLocaleString(lang === "ua" ? "uk-UA" : lang), color: "#6ba8e5" },
            ].map(s => (
              <GlassCard key={s.label} style={{ padding: "10px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 7, color: TG.muted, marginTop: 2 }}>{s.label}</div>
              </GlassCard>
            ))}
          </div>
          {(done > 0 || errored > 0) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {done > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)" }}>
                  <span style={{ fontSize: 11 }}>✅</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#2de897" }}>{done}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>завершено</span>
                </div>
              )}
              {errored > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)" }}>
                  <span style={{ fontSize: 11 }}>⛔</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#ff6b7a" }}>{errored}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>відхилено</span>
                </div>
              )}
            </div>
          )}
          </>
        )}

        {/* ── Global live send feed ───────────────────────────────── */}
        <LiveSendFeed sends={liveSends} onRetried={load} />

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(45,232,151,0.4)", borderTopColor: "#2de897", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
          </div>
        ) : campaigns.length === 0 ? (
          <GlassCard style={{ padding: "32px 16px", textAlign: "center" }}>
            <Radio size={24} color="#2de897" style={{ marginBottom: 10, opacity: 0.6 }} />
            <div style={{ fontSize: 14, color: TG.muted, marginBottom: 12 }}>{t.groups.noGroups}</div>
            <div onClick={() => { haptic.medium(); onNew(); }} style={{ fontSize: 13, color: "#2de897", fontWeight: 700, cursor: "pointer" }}>
              {t.groups.noGroupsHint}
            </div>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: TG.muted, textAlign: "center", padding: "20px 0" }}>
            {t.common.notFoundQuery(search)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(c => (
              <GroupCampaignCard key={c.id} campaign={c} onRefresh={load} onEdit={onEdit} isActive={activeCampaignIds.has(c.id)} liveSends={liveSends} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
