import { useState, useEffect, useCallback } from "react";
import { Plus, Play, Pause, Square, Copy, Trash2, Radio, ChevronRight, Clock, Send } from "lucide-react";
import { api, GroupCampaign } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard, StatusBadge } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const STATUS_COLOR: Record<string, string> = {
  draft:     "#7c8db0",
  running:   "#2de897",
  paused:    "#ffc946",
  cancelled: "#ff6b7a",
};

function fmtInterval(seconds: number): string {
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} д`;
  return `${Math.floor(seconds / 604800)} нед`;
}

function GroupCampaignCard({
  campaign,
  onRefresh,
  onEdit,
}: {
  campaign: GroupCampaign;
  onRefresh: () => void;
  onEdit: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const color = STATUS_COLOR[campaign.status] ?? "#7c8db0";
  const groups = (() => { try { return JSON.parse(campaign.selected_groups || "[]"); } catch { return []; } })();

  async function action(act: string) {
    haptic.medium(); setBusy(true);
    try { await api.actionGroupCampaign(campaign.id, act); haptic.success(); onRefresh(); }
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

  return (
    <GlassCard glow={`${color}20`} style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Radio size={16} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
          <div style={{ fontSize: 10, color: TG.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.text_template}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: "2px 8px" }}>
            {campaign.status.toUpperCase()}
          </span>
          <div onClick={() => { haptic.light(); onEdit(campaign.id); }} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight size={13} color={TG.muted} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
        {[
          { label: "Групп",     value: groups.length,             color: "#6ba8e5" },
          { label: "Отправлено",value: campaign.sent_count,       color: "#2de897" },
          { label: "Ошибок",    value: campaign.failed_count,     color: "#ff6b7a" },
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
      <div style={{ display: "flex", gap: 6 }}>
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

        {campaign.status === "running" && (
          <button onClick={() => action("stop")} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Square size={12} color="#ff6b7a" />
          </button>
        )}
        <button onClick={duplicate} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Copy size={12} color="#6ba8e5" />
        </button>
        <button onClick={remove} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.20)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={12} color="#ff6b7a" />
        </button>
      </div>
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
  const total   = campaigns.length;

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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Всего",   value: total,   color: TG.text },
              { label: "Активных",value: running, color: "#2de897" },
              { label: "Drafted", value: campaigns.filter(c => c.status === "draft").length, color: "#7c8db0" },
            ].map(s => (
              <GlassCard key={s.label} style={{ padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
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
