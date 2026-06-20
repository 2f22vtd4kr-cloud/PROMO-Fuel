import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Pause, Play, MoreHorizontal, Clock, Copy, Trash2, Settings, ChevronDown, CheckCircle2, XCircle, SkipForward, FlaskConical, Loader2, Timer } from "lucide-react";
import { api, Campaign, SendLog } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard, StatusBadge } from "../components/GlassCard";
import { haptic } from "../lib/haptics";
import { useSse } from "../lib/useSse";

const STATUS_ORDER = ["sending", "running", "scheduled", "paused", "draft", "sent", "done"];
function statusPriority(s: string) { const i = STATUS_ORDER.indexOf(s); return i === -1 ? 99 : i; }

type LogStatus = "ok" | "ok_retry" | "blocked" | "failed" | "skipped_already_targeted" | "dry_run" | string;

function logMeta(status: LogStatus): { icon: React.ReactNode; color: string; label: string } {
  switch (status) {
    case "ok":
    case "ok_retry":
      return { icon: <CheckCircle2 size={11} />, color: TG.green,    label: "Доставлено" };
    case "blocked":
      return { icon: <XCircle size={11} />,     color: "#ff6b7a",    label: "Заблокирован" };
    case "failed":
      return { icon: <XCircle size={11} />,     color: "#ff9f40",    label: "Ошибка" };
    case "skipped_already_targeted":
      return { icon: <SkipForward size={11} />, color: TG.muted,     label: "Уже получал" };
    case "dry_run":
      return { icon: <FlaskConical size={11} />,color: "#6ba8e5",    label: "Тест" };
    default:
      return { icon: <Loader2 size={11} />,     color: TG.yellow,    label: status };
  }
}

function LogsPanel({ campaignId, isActive }: { campaignId: number; isActive: boolean }) {
  const [logs, setLogs]                   = useState<SendLog[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown]         = useState<import("../lib/api").AccountBreakdown[]>([]);
  const bottomRef                         = useRef<HTMLDivElement>(null);
  const prevLen                           = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await api.getCampaignLogs(campaignId);
      setLogs(data);
    } catch {} finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => {
    load();
    if (!isActive) return;
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [load, isActive]);

  useEffect(() => {
    if (!showBreakdown) return;
    api.getCampaignBreakdown(campaignId).then(setBreakdown).catch(() => {});
  }, [showBreakdown, campaignId]);

  // Auto-scroll to bottom when new entries arrive (active only)
  useEffect(() => {
    if (isActive && logs.length > prevLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLen.current = logs.length;
  }, [logs.length, isActive]);

  const ok      = logs.filter(l => l.status === "ok" || l.status === "ok_retry").length;
  const failed  = logs.filter(l => l.status === "failed" || l.status === "blocked").length;
  const skipped = logs.filter(l => l.status === "skipped_already_targeted").length;
  const dry     = logs.filter(l => l.status === "dry_run").length;

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>

      {/* Summary chips + CSV export */}
      {!loading && logs.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          {ok > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: TG.green, background: `${TG.green}18`, border: `1px solid ${TG.green}35`, borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={9} /> {ok} доставлено
            </span>
          )}
          {failed > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.14)", border: "1px solid rgba(255,107,122,0.35)", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
              <XCircle size={9} /> {failed} ошибок
            </span>
          )}
          {skipped > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: TG.muted, background: "rgba(160,190,230,0.10)", border: "1px solid rgba(160,190,230,0.20)", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
              <SkipForward size={9} /> {skipped} пропущено
            </span>
          )}
          {dry > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6ba8e5", background: "rgba(107,168,229,0.14)", border: "1px solid rgba(107,168,229,0.30)", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
              <FlaskConical size={9} /> {dry} тест
            </span>
          )}
          {isActive && (
            <span style={{ fontSize: 10, fontWeight: 700, color: TG.yellow, background: `${TG.yellow}14`, border: `1px solid ${TG.yellow}35`, borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
              <Loader2 size={9} style={{ animation: "spin 1s linear infinite" }} /> в процессе
            </span>
          )}
          <span
            onClick={() => {
              haptic.light();
              const header = "id,chat_id,username,first_name,status,sent_at,error\n";
              const rows = logs.map(l =>
                [l.id, l.chat_id, l.username ?? "", l.first_name ?? "", l.status, l.sent_at ?? "", (l as any).error ?? ""]
                  .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
              ).join("\n");
              const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `logs_${campaignId}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: TG.muted, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, padding: "3px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            ↓ CSV
          </span>
        </div>
      )}

      {/* Log rows */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${TG.green}40`, borderTopColor: TG.green, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", fontSize: 11, color: TG.muted, padding: "12px 0" }}>
          Отправок пока нет
        </div>
      ) : (
        <div style={{ maxHeight: 210, overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 4 }}>
          {logs.map(log => {
            const { icon, color, label } = logMeta(log.status);
            const name = log.first_name ?? (log.username ? `@${log.username}` : `ID ${log.chat_id}`);
            const time = log.sent_at
              ? new Date(log.sent_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "";
            return (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color, display: "flex", flexShrink: 0 }}>{icon}</span>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: TG.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {name}
                </span>
                <span style={{ fontSize: 9, color: TG.muted, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 9, color: TG.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{time}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onEdit, onRefresh }: {
  campaign: Campaign; onEdit: (id: number) => void; onRefresh: () => void;
}) {
  const [busy, setBusy]         = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const isActive   = campaign.status === "running" || campaign.status === "sending";
  const isPaused   = campaign.status === "paused";
  const isDone     = campaign.status === "done" || campaign.status === "cancelled";
  const isEditable = campaign.status === "draft" || campaign.status === "scheduled";
  const hasLogs    = isActive || isPaused || isDone;
  const isDryRun   = Boolean(campaign.dry_run);
  const pct = campaign.target_count > 0
    ? Math.min(100, Math.round(campaign.sent_count / campaign.target_count * 100)) : 0;
  const color = isActive ? TG.green : isPaused ? "#6ba8e5" : "rgba(160,190,230,0.40)";

  async function togglePause() {
    haptic.medium(); setBusy(true);
    try { await api.actionCampaign(campaign.id, isActive ? "pause" : "resume"); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }
  async function launchDraft() {
    haptic.medium(); setBusy(true);
    try { await api.actionCampaign(campaign.id, "running"); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }
  async function duplicate() {
    haptic.medium(); setMenuOpen(false);
    try { await api.duplicateCampaign(campaign.id); haptic.success(); onRefresh(); } catch { haptic.error(); }
  }
  async function deleteCampaign() {
    haptic.warning(); setMenuOpen(false);
    try { await api.deleteCampaign(campaign.id); haptic.success(); onRefresh(); } catch { haptic.error(); }
  }

  const d = new Date(campaign.scheduled_at ?? campaign.created_at);
  const dateStr = campaign.scheduled_at
    ? `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`
    : d.toLocaleDateString("ru");

  return (
    <GlassCard style={{ padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, marginBottom: 5, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {campaign.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <StatusBadge status={campaign.status} />
            {isDryRun && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#6ba8e5", background: "rgba(107,168,229,0.14)", border: "1px solid rgba(107,168,229,0.30)", borderRadius: 8, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                <FlaskConical size={8} /> Dry Run
              </span>
            )}
            {campaign.send_delay_seconds && campaign.send_delay_seconds !== 15 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: TG.muted, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                <Timer size={8} /> {campaign.send_delay_seconds}с
              </span>
            )}
            {(campaign as any).scheduled_tag && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#c4aeff", background: "rgba(196,174,255,0.13)", border: "1px solid rgba(196,174,255,0.30)", borderRadius: 8, padding: "2px 6px" }}>
                #{(campaign as any).scheduled_tag}
              </span>
            )}
            <span style={{ fontSize: 10, color: TG.muted, display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={9} /> {dateStr}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          {(isActive || isPaused) && (
            <div onClick={togglePause} style={{ width: 28, height: 28, borderRadius: 9, background: `${isActive ? TG.green : "#6ba8e5"}18`, border: `1px solid ${isActive ? TG.green : "#6ba8e5"}35`, display: "flex", alignItems: "center", justifyContent: "center", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}>
              {isActive ? <Pause size={12} color={TG.green} /> : <Play size={12} color="#6ba8e5" />}
            </div>
          )}
          {campaign.status === "draft" && (
            <div onClick={launchDraft} style={{ height: 28, borderRadius: 9, background: `${TG.green}20`, border: `1px solid ${TG.green}40`, display: "flex", alignItems: "center", justifyContent: "center", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, padding: "0 10px", gap: 5 }}>
              <Play size={11} color={TG.green} />
              <span style={{ fontSize: 10, fontWeight: 700, color: TG.green }}>Запустить</span>
            </div>
          )}
          {isEditable && (
            <div onClick={() => { haptic.light(); onEdit(campaign.id); }} style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Settings size={12} color={TG.muted} />
            </div>
          )}
          <div onClick={() => { haptic.light(); setMenuOpen(o => !o); }} style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
            <MoreHorizontal size={13} color={TG.muted} />
            {menuOpen && (
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 32, right: 0, zIndex: 50, background: "rgba(7,9,20,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, overflow: "hidden", minWidth: 160, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                <div onClick={duplicate} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <Copy size={13} color={TG.muted} /><span style={{ fontSize: 13, color: TG.text }}>Дублировать</span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
                <div onClick={deleteCampaign} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <Trash2 size={13} color="#ff6b7a" /><span style={{ fontSize: 13, color: "#ff6b7a" }}>Удалить</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar + ETA */}
      {campaign.target_count > 0 && (() => {
        let etaStr = "";
        let rateStr = "";
        if (isActive && campaign.started_at && campaign.sent_count > 0) {
          const elapsedSec = (Date.now() - new Date(campaign.started_at).getTime()) / 1000;
          const rate = campaign.sent_count / elapsedSec;
          const remaining = campaign.target_count - campaign.sent_count;
          const etaSec = rate > 0 ? Math.round(remaining / rate) : 0;
          if (etaSec > 0) {
            const h = Math.floor(etaSec / 3600);
            const m = Math.floor((etaSec % 3600) / 60);
            const s = etaSec % 60;
            etaStr = h > 0 ? `~${h}ч ${m}м` : m > 0 ? `~${m}м ${s}с` : `~${s}с`;
          }
          rateStr = rate >= 1 ? `${rate.toFixed(1)}/с` : `${(rate * 60).toFixed(1)}/мин`;
        }
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: TG.muted }}>Отправлено</span>
                {rateStr && <span style={{ fontSize: 9, color: color, fontWeight: 700, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 8, padding: "1px 5px" }}>{rateStr}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {etaStr && <span style={{ fontSize: 9, color: TG.muted }}>осталось {etaStr}</span>}
                <span style={{ fontSize: 10, color, fontWeight: 700 }}>
                  {campaign.sent_count.toLocaleString("ru")} / {campaign.target_count.toLocaleString("ru")} ({pct}%)
                </span>
              </div>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}aa)`, boxShadow: pct > 0 ? `0 0 6px ${color}88` : "none", transition: "width 0.6s ease" }} />
            </div>
          </div>
        );
      })()}

      {/* Notes */}
      {campaign.notes && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,200,50,0.07)", border: "1px solid rgba(255,200,50,0.18)", borderRadius: 9, fontSize: 11, color: TG.muted, lineHeight: 1.45, wordBreak: "break-word", display: "flex", alignItems: "flex-start", gap: 6 }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>📝</span>
          <span>{campaign.notes}</span>
        </div>
      )}

      {/* Text preview toggle */}
      {campaign.text_template && (
        <div style={{ marginTop: 10 }}>
          <div onClick={() => { haptic.light(); setShowText(p => !p); }} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <span style={{ fontSize: 10, color: "#6ba8e5", fontWeight: 600 }}>{showText ? "Скрыть текст" : "Показать текст"}</span>
            <span style={{ fontSize: 10, color: "#6ba8e5", transform: showText ? "rotate(180deg)" : "rotate(0)", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
          </div>
          {showText && (
            <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(107,168,229,0.07)", border: "1px solid rgba(107,168,229,0.18)", borderRadius: 10, fontSize: 12, color: TG.textSecondary, lineHeight: 1.55, wordBreak: "break-word" }}>
              {campaign.text_template}
            </div>
          )}
        </div>
      )}

      {/* Logs toggle */}
      {hasLogs && (
        <div style={{ marginTop: 10 }}>
          <div
            onClick={() => { haptic.light(); setShowLogs(p => !p); }}
            style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? TG.green : TG.muted }}>
              {showLogs ? "Скрыть логи" : "Логи отправок"}
            </span>
            {isActive && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TG.green, display: "inline-block", boxShadow: `0 0 6px ${TG.green}` }} />
            )}
            <ChevronDown
              size={11}
              color={isActive ? TG.green : TG.muted}
              style={{ transform: showLogs ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
            />
          </div>
          {showLogs && <LogsPanel campaignId={campaign.id} isActive={isActive} />}
        </div>
      )}
    </GlassCard>
  );
}

const STATUS_TABS = [
  { key: "all",      label: "Все" },
  { key: "active",   label: "Активные" },
  { key: "draft",    label: "Черновики" },
  { key: "done",     label: "Завершённые" },
] as const;
type StatusTab = typeof STATUS_TABS[number]["key"];

export function CampaignsPage({ onEdit }: { onEdit: (id?: number) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [tab, setTab]             = useState<StatusTab>("all");

  const load = useCallback(async () => {
    try {
      const cs = await api.getCampaigns();
      setCampaigns(cs.sort((a, b) => statusPriority(a.status) - statusPriority(b.status)));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live SSE updates for campaign counts & status — no full reload needed
  useSse((type, data) => {
    if (type === "campaigns" && Array.isArray(data)) {
      setCampaigns(prev => {
        const updated = prev.map(c => {
          const live = (data as Campaign[]).find(l => l.id === c.id);
          return live ? { ...c, status: live.status, sent_count: live.sent_count, failed_count: live.failed_count, target_count: live.target_count } : c;
        });
        return [...updated].sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
      });
    }
  });

  const active    = campaigns.filter(c => c.status === "running" || c.status === "sending").length;
  const scheduled = campaigns.filter(c => c.status === "scheduled").length;
  const paused    = campaigns.filter(c => c.status === "paused").length;

  const tabFiltered = campaigns.filter(c => {
    if (tab === "active")   return c.status === "running" || c.status === "sending" || c.status === "paused" || c.status === "scheduled";
    if (tab === "draft")    return c.status === "draft";
    if (tab === "done")     return c.status === "done" || c.status === "cancelled";
    return true;
  });

  return (
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 24px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Рассылки</div>
          <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.medium(); onEdit(); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} color={TG.green} />
              <span style={{ fontSize: 12, color: TG.green, fontWeight: 700 }}>Создать</span>
            </div>
          </GlassCard>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {STATUS_TABS.map(t => {
            const isActive = t.key === tab;
            const cnt = t.key === "all" ? campaigns.length
              : t.key === "active" ? campaigns.filter(c => ["running","sending","paused","scheduled"].includes(c.status)).length
              : t.key === "draft"  ? campaigns.filter(c => c.status === "draft").length
              : campaigns.filter(c => c.status === "done" || c.status === "cancelled").length;
            return (
              <button key={t.key} onClick={() => { haptic.light(); setTab(t.key); setSearch(""); }} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1px solid ${isActive ? TG.green + "55" : "rgba(255,255,255,0.10)"}`,
                background: isActive ? `${TG.green}18` : "rgba(255,255,255,0.04)",
                color: isActive ? TG.green : TG.muted, cursor: "pointer",
              }}>{t.label}{cnt > 0 ? ` (${cnt})` : ""}</button>
            );
          })}
        </div>

        {campaigns.length > 3 && (
          <div style={{ position: "relative" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px 9px 34px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12, color: TG.text, fontSize: 12, outline: "none",
              }}
            />
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        )}

        {!loading && active > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: TG.green, background: `${TG.green}18`, border: `1px solid ${TG.green}35`, borderRadius: 20, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: TG.green, display: "inline-block", boxShadow: `0 0 6px ${TG.green}`, animation: "pulse 1.5s ease-in-out infinite" }} />{active} активных</span>
            {scheduled > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: TG.yellow, background: `${TG.yellow}18`, border: `1px solid ${TG.yellow}35`, borderRadius: 20, padding: "4px 10px" }}>{scheduled} запланир.</span>}
            {paused > 0    && <span style={{ fontSize: 10, fontWeight: 700, color: "#6ba8e5", background: "rgba(107,168,229,0.18)", border: "1px solid rgba(107,168,229,0.35)", borderRadius: 20, padding: "4px 10px" }}>{paused} на паузе</span>}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${TG.green}40`, borderTopColor: TG.green, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
          </div>
        ) : campaigns.length === 0 ? (
          <GlassCard style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: TG.muted, marginBottom: 12 }}>Кампаний пока нет</div>
            <div onClick={() => { haptic.medium(); onEdit(); }} style={{ fontSize: 13, color: TG.green, fontWeight: 700, cursor: "pointer" }}>+ Создать первую кампанию</div>
          </GlassCard>
        ) : (() => {
          const q = search.trim().toLowerCase();
          const filtered = q ? tabFiltered.filter(c => c.name.toLowerCase().includes(q)) : tabFiltered;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.length === 0 ? (
                <GlassCard style={{ padding: "24px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: TG.muted }}>
                    {q ? `Ничего не найдено по «${search}»` : "Нет кампаний в этой категории"}
                  </div>
                </GlassCard>
              ) : filtered.map(c => <CampaignCard key={c.id} campaign={c} onEdit={onEdit} onRefresh={load} />)}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
