import { useState, useEffect, useCallback } from "react";
import { Plus, Play, Pause, Square, Copy, Trash2, Radio, ChevronRight, ChevronDown, ChevronUp, Clock, Send, AlertCircle, CheckCircle, BarChart2 } from "lucide-react";
import { api, GroupCampaign, GroupCampaignLog, GroupSendStat, DailyStat } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

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

type ExpandTab = "logs" | "stats";

function GroupCampaignCard({
  campaign,
  onRefresh,
  onEdit,
}: {
  campaign: GroupCampaign;
  onRefresh: () => void;
  onEdit: (id: number) => void;
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

  const color  = STATUS_COLOR[campaign.status] ?? "#7c8db0";
  const groups = (() => { try { return JSON.parse(campaign.selected_groups || "[]"); } catch { return []; } })();

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

  async function loadLogs() {
    if (logsLoaded) return;
    setLoadingData(true);
    try { setLogs((await api.getGroupCampaignLogs(campaign.id)).slice(0, 12)); setLogsLoaded(true); }
    catch {} finally { setLoadingData(false); }
  }

  async function loadStats() {
    if (statsLoaded) return;
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
    setExpandTab(tab);
    if (!expanded) setExpanded(true);
    if (tab === "logs") await loadLogs();
    if (tab === "stats") await loadStats();
  }

  async function toggleExpand() {
    haptic.light();
    if (!expanded) {
      setExpanded(true);
      if (expandTab === "logs") await loadLogs();
      else await loadStats();
    } else {
      setExpanded(false);
    }
  }

  return (
    <GlassCard glow={`${color}20`} style={{ padding: 14 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Radio size={16} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
          <div style={{ fontSize: 10, color: TG.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.text_template}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: "2px 7px" }}>
            {campaign.status.toUpperCase()}
          </span>
          <div onClick={() => { haptic.light(); onEdit(campaign.id); }} style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight size={13} color={TG.muted} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
        {[
          { label: "Групп",     value: groups.length,                          color: "#6ba8e5" },
          { label: "Отправлено",value: campaign.sent_count,                    color: "#2de897" },
          { label: "Ошибок",    value: campaign.failed_count,                  color: "#ff6b7a" },
          { label: "Интервал",  value: fmtInterval(campaign.interval_seconds), color: "#ffc946" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 3px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 8, color: TG.muted, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Next send */}
      {campaign.next_send_at && campaign.status === "running" && (
        <div style={{ fontSize: 10, color: TG.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} />
          Следующая: {new Date(campaign.next_send_at).toLocaleString("ru")}
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

        <button onClick={sendNow} disabled={busy} title="Отправить сейчас" style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.3)", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: busy ? 0.5 : 1 }}>
          <Send size={12} color="#6ba8e5" />
          <span style={{ fontSize: 10, color: "#6ba8e5", fontWeight: 700 }}>Сейчас</span>
        </button>

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
            logs.length === 0 ? (
              <div style={{ fontSize: 11, color: TG.muted, textAlign: "center", padding: "8px 0" }}>Отправок ещё нет</div>
            ) : (
              logs.map(l => {
                const lc = STATUS_COLOR[l.status] ?? "#7c8db0";
                const Icon = l.status === "ok" || l.status === "sent" ? CheckCircle : AlertCircle;
                return (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Icon size={11} color={lc} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: TG.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.group_title || l.group_id}</div>
                      {l.error && <div style={{ fontSize: 9, color: "#ff6b7a", marginTop: 1 }}>{l.error}</div>}
                    </div>
                    <div style={{ fontSize: 9, color: TG.muted, flexShrink: 0 }}>{timeAgo(l.sent_at)}</div>
                  </div>
                );
              })
            )
          ) : (
            stats.length === 0 && daily.length === 0 ? (
              <div style={{ fontSize: 11, color: TG.muted, textAlign: "center", padding: "8px 0" }}>Статистики пока нет</div>
            ) : (
              <>
                {/* Daily sends mini bar chart */}
                {daily.length > 1 && (() => {
                  const maxVal = Math.max(...daily.map(d => d.sent + d.failed), 1);
                  const barW = Math.floor(240 / daily.length) - 2;
                  return (
                    <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ fontSize: 9, color: TG.muted, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Динамика ({daily.length} дн.)
                      </div>
                      <svg width="100%" height="48" viewBox={`0 0 ${daily.length * (barW + 2)} 48`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
                        {daily.map((d, i) => {
                          const x = i * (barW + 2);
                          const sentH  = Math.max(2, Math.round((d.sent   / maxVal) * 40));
                          const failH  = Math.max(0, Math.round((d.failed / maxVal) * 40));
                          return (
                            <g key={d.day}>
                              {d.failed > 0 && <rect x={x} y={48 - failH} width={barW} height={failH} rx="2" fill="rgba(255,107,122,0.6)" />}
                              <rect x={x} y={48 - sentH - (d.failed > 0 ? failH : 0)} width={barW} height={sentH} rx="2" fill="rgba(45,232,151,0.7)" />
                            </g>
                          );
                        })}
                      </svg>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span style={{ fontSize: 8, color: TG.muted }}>{daily[0]?.day?.slice(5)}</span>
                        <span style={{ fontSize: 8, color: TG.muted }}>{daily[daily.length - 1]?.day?.slice(5)}</span>
                      </div>
                    </div>
                  );
                })()}
                {/* Top groups list */}
                {stats.slice(0, 8).map(s => {
                  const total = s.sent + s.failed;
                  const pct = total > 0 ? Math.round((s.sent / total) * 100) : 0;
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
                  <div style={{ fontSize: 10, color: TG.muted, textAlign: "center", padding: "4px 0" }}>
                    +{stats.length - 8} групп ещё
                  </div>
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
  const [campaigns, setCampaigns] = useState<GroupCampaign[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    try { setCampaigns(await api.getGroupCampaigns()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);

  const running = campaigns.filter(c => c.status === "running").length;
  const paused  = campaigns.filter(c => c.status === "paused").length;

  return (
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 100px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Групповые</div>
          <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.medium(); onNew(); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} color="#2de897" />
              <span style={{ fontSize: 12, color: "#2de897", fontWeight: 700 }}>Создать</span>
            </div>
          </GlassCard>
        </div>

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "Всего",    value: campaigns.length,                                       color: TG.text },
              { label: "Активных", value: running,                                                color: "#2de897" },
              { label: "Пауза",    value: paused,                                                 color: "#ffc946" },
              { label: "Черновик", value: campaigns.filter(c => c.status === "draft").length,    color: "#7c8db0" },
            ].map(s => (
              <GlassCard key={s.label} style={{ padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 8, color: TG.muted, marginTop: 2 }}>{s.label}</div>
              </GlassCard>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(45,232,151,0.4)", borderTopColor: "#2de897", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
          </div>
        ) : campaigns.length === 0 ? (
          <GlassCard style={{ padding: "32px 16px", textAlign: "center" }}>
            <Radio size={24} color="#2de897" style={{ marginBottom: 10, opacity: 0.6 }} />
            <div style={{ fontSize: 14, color: TG.muted, marginBottom: 12 }}>Нет групповых рассылок</div>
            <div onClick={() => { haptic.medium(); onNew(); }} style={{ fontSize: 13, color: "#2de897", fontWeight: 700, cursor: "pointer" }}>
              + Создать первую
            </div>
          </GlassCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {campaigns.map(c => (
              <GroupCampaignCard key={c.id} campaign={c} onRefresh={load} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
