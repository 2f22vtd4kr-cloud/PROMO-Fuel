import { useState, useEffect, useCallback } from "react";
import {
  Play, Pause, Trash2, Copy, ChevronLeft,
  BarChart2, CheckCircle, XCircle, Clock, X,
  ChevronDown, ChevronUp, Users2,
} from "lucide-react";
import { api, Campaign, SendLog, AccountBreakdown } from "../lib/api";
import { TG, STATUS_META, BLUR } from "../lib/theme";
import { Header } from "../components/Header";
import { CampaignRow } from "../components/CampaignRow";
import { FullSpinner } from "../components/Spinner";
import { useSse } from "../lib/useSse";

function SendLogsPanel({ campaignId }: { campaignId: number }) {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaignLogs(campaignId).then(setLogs).catch(() => setLogs([])).finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div style={{ padding: "14px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка...</div>;
  if (logs.length === 0) return <div style={{ padding: "14px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Нет отправок</div>;

  return (
    <div style={{ maxHeight: 260, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {logs.map(log => {
        const ok = log.status === "ok";
        return (
          <div key={log.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: ok ? TG.green : TG.red, flexShrink: 0, boxShadow: `0 0 6px ${ok ? TG.greenGlow : TG.redGlow}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {log.first_name || log.username ? `${log.first_name ?? ""}${log.username ? ` @${log.username}` : ""}`.trim() : `ID ${log.chat_id}`}
              </div>
              {log.error && <div style={{ fontSize: 10, color: TG.red, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.error}</div>}
            </div>
            <div style={{ fontSize: 10, color: TG.muted, flexShrink: 0 }}>{log.sent_at ? log.sent_at.slice(11, 16) : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownPanel({ campaignId }: { campaignId: number }) {
  const [data, setData] = useState<AccountBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaignBreakdown(campaignId).then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div style={{ padding: "14px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка...</div>;
  if (data.length === 0) return <div style={{ padding: "14px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Нет данных</div>;

  return (
    <div>
      {data.map(acc => {
        const pct = acc.total > 0 ? (acc.ok / acc.total) * 100 : 0;
        const barColor = pct > 80 ? TG.green : pct > 50 ? TG.yellow : TG.red;
        return (
          <div key={acc.id} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%", color: TG.text }}>
                {acc.label || acc.phone}
              </div>
              <div style={{ fontSize: 11, color: TG.muted, flexShrink: 0 }}>
                <span style={{ color: TG.green }}>{acc.ok}</span>
                {acc.errors > 0 && <span style={{ color: TG.red }}> / {acc.errors} ош.</span>}
                <span> из {acc.total}</span>
              </div>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, boxShadow: `0 0 6px ${barColor}88` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GlassAccordion({ title, icon: Icon, iconColor, children }: {
  title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
      border: `1px solid ${open ? "rgba(255,255,255,0.13)" : TG.glassBorder}`,
      borderRadius: 18, overflow: "hidden", marginBottom: 12,
      transition: "border-color 0.2s",
    }}>
      <button onClick={() => setOpen(o => !o)} className="tap" style={{
        width: "100%", padding: "14px 16px", background: "none", border: "none",
        display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
      }}>
        <div style={{ background: iconColor + "1a", border: `1px solid ${iconColor}30`, borderRadius: 8, padding: 6, display: "flex" }}>
          <Icon size={13} color={iconColor} />
        </div>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 700, color: TG.text }}>{title}</span>
        {open ? <ChevronUp size={14} color={TG.muted} /> : <ChevronDown size={14} color={TG.muted} />}
      </button>
      {open && <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>{children}</div>}
    </div>
  );
}

function GlassToast({ msg }: { msg: string }) {
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: "rgba(20,30,50,0.92)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 14, padding: "10px 20px", fontSize: 13,
      zIndex: 999, color: TG.text,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
      whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

function DetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setCampaign(await api.getCampaign(id)); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  useSse(useCallback((type, data) => {
    if (type === "campaigns" && Array.isArray(data)) {
      const update = (data as Array<{ id: number; status: string; sent_count: number; failed_count: number; target_count: number }>).find(c => c.id === id);
      if (update) setCampaign(prev => prev ? { ...prev, ...update } : prev);
    }
  }, [id]));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  async function handleAction(newStatus: string, label: string) {
    setBusy(true);
    try { await api.actionCampaign(id, newStatus); await load(); showToast(label); }
    catch { showToast("Ошибка"); }
    setBusy(false);
  }

  async function handleDuplicate() {
    setBusy(true);
    try { await api.duplicateCampaign(id); showToast("Кампания скопирована"); }
    catch { showToast("Ошибка"); }
    setBusy(false);
  }

  async function handleDelete() {
    if (!(window as any).Telegram?.WebApp?.showConfirm) {
      if (!confirm("Удалить кампанию?")) return;
    } else {
      await new Promise<void>(resolve => {
        (window as any).Telegram.WebApp.showConfirm("Удалить кампанию?", (ok: boolean) => { if (!ok) return; resolve(); });
      });
    }
    setBusy(true);
    try { await api.deleteCampaign(id); onBack(); }
    catch { showToast("Ошибка"); }
    setBusy(false);
  }

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Кампания" right={<button onClick={onBack} className="tap" style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4 }}><ChevronLeft size={20} /></button>} />
      <FullSpinner />
    </div>
  );

  if (!campaign) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Не найдено" right={<button onClick={onBack} className="tap" style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4 }}><ChevronLeft size={20} /></button>} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TG.muted }}>Кампания не найдена</div>
    </div>
  );

  const meta = STATUS_META[campaign.status] ?? STATUS_META.draft;
  const pct = campaign.target_count > 0 ? Math.min((campaign.sent_count / campaign.target_count) * 100, 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }} className="fade-up">
      {toast && <GlassToast msg={toast} />}

      <div style={{
        background: "rgba(11,15,26,0.75)", backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 16px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <button onClick={onBack} className="tap" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, cursor: "pointer", color: TG.text, padding: 7, display: "flex", marginLeft: -2 }}>
          <ChevronLeft size={17} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.3px" }}>{campaign.name}</div>
          <div style={{ fontSize: 12, color: meta.color, marginTop: 2, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: meta.color, boxShadow: `0 0 6px ${meta.glow}` }} />
            {meta.label}
          </div>
        </div>
        {campaign.scheduled_at && (
          <div style={{ fontSize: 10, color: TG.yellow, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 9, padding: "4px 9px", flexShrink: 0 }}>
            {new Date(campaign.scheduled_at).toLocaleString("ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px", WebkitOverflowScrolling: "touch" }}>

        {/* Progress card */}
        <div style={{ background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR, border: `1px solid ${TG.glassBorder}`, borderRadius: 18, padding: "16px", marginBottom: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${meta.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: TG.muted }}>Прогресс рассылки</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: TG.text }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}bb)`, borderRadius: 4, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 0 10px ${meta.glow}` }} />
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
          {[
            { icon: BarChart2,   label: "Отправлено",   value: campaign.sent_count.toLocaleString("ru"),    color: TG.accent, glow: TG.accentGlow },
            { icon: CheckCircle, label: "Получателей",  value: campaign.target_count.toLocaleString("ru"),  color: TG.green,  glow: TG.greenGlow },
            { icon: XCircle,     label: "Ошибок",       value: campaign.failed_count.toLocaleString("ru"),  color: campaign.failed_count > 0 ? TG.red : TG.muted, glow: campaign.failed_count > 0 ? TG.redGlow : "transparent" },
            { icon: Clock,       label: "Создана",      value: campaign.created_at.slice(0, 10),            color: TG.muted,  glow: "transparent" },
          ].map(({ icon: Icon, label, value, color, glow }) => (
            <div key={label} style={{ background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR, border: `1px solid ${TG.glassBorder}`, borderRadius: 15, padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <Icon size={13} color={color} />
                <span style={{ fontSize: 11, color: TG.muted }}>{label}</span>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: TG.text, letterSpacing: "-0.3px" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Message preview */}
        <div style={{ background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR, border: `1px solid ${TG.glassBorder}`, borderRadius: 18, padding: "16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: TG.muted, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>Текст сообщения</div>
          <pre style={{ fontSize: 13, color: TG.text, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6, margin: 0 }}>
            {campaign.text_template}
          </pre>
        </div>

        {campaign.notes && (
          <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: 15, padding: "13px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: TG.yellow, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Заметки</div>
            <div style={{ fontSize: 13, color: TG.textSecondary, lineHeight: 1.55 }}>{campaign.notes}</div>
          </div>
        )}

        <GlassAccordion title="Лог отправок"  icon={BarChart2} iconColor={TG.accent}><SendLogsPanel  campaignId={id} /></GlassAccordion>
        <GlassAccordion title="По аккаунтам"  icon={Users2}    iconColor={TG.purple}><BreakdownPanel campaignId={id} /></GlassAccordion>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <button disabled={busy} onClick={() => handleAction("running", "Запущена!")} className="tap" style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #5288c1, #3b6fa8)",
              border: "none", borderRadius: 16, color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1,
              boxShadow: "0 4px 20px rgba(82,136,193,0.3), 0 1px 0 rgba(255,255,255,0.15) inset",
            }}>
              <Play size={15} fill="currentColor" /> Запустить
            </button>
          )}
          {campaign.status === "running" && (
            <button disabled={busy} onClick={() => handleAction("paused", "Поставлена на паузу")} className="tap" style={{
              width: "100%", padding: "14px",
              background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
              border: `1px solid ${TG.glassBorder}`, borderRadius: 16, color: TG.text,
              fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1,
            }}>
              <Pause size={15} /> Пауза
            </button>
          )}
          {(campaign.status === "running" || campaign.status === "paused") && (
            <button disabled={busy} onClick={() => handleAction("cancelled", "Отменена")} className="tap" style={{
              width: "100%", padding: "14px",
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 16, color: TG.red,
              fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1,
            }}>
              <X size={15} /> Отменить
            </button>
          )}
          <button disabled={busy} onClick={handleDuplicate} className="tap" style={{
            width: "100%", padding: "14px",
            background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
            border: `1px solid ${TG.glassBorder}`, borderRadius: 16, color: TG.muted,
            fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Copy size={15} /> Дублировать
          </button>
          <button disabled={busy} onClick={handleDelete} className="tap" style={{
            width: "100%", padding: "14px",
            background: "transparent", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 16, color: "rgba(248,113,113,0.7)",
            fontSize: 14, fontWeight: 500, cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Trash2 size={15} /> Удалить
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

export function CampaignsPage({ onEdit }: { onEdit: (id?: number) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try { setCampaigns(await api.getCampaigns()); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useSse(useCallback((type, data) => {
    if (type === "campaigns" && Array.isArray(data)) {
      setCampaigns(prev => {
        const updates = data as Array<{ id: number; status: string; sent_count: number; failed_count: number; target_count: number }>;
        return prev.map(c => { const u = updates.find(x => x.id === c.id); return u ? { ...c, ...u } : c; });
      });
    }
  }, []));

  if (detail !== null) return <DetailView id={detail} onBack={() => { setDetail(null); load(); }} />;

  const filters: { id: string; label: string }[] = [
    { id: "all",       label: "Все" },
    { id: "running",   label: "Активные" },
    { id: "scheduled", label: "Планы" },
    { id: "draft",     label: "Черновики" },
    { id: "done",      label: "Завершённые" },
    { id: "cancelled", label: "Отменённые" },
  ];

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Рассылки"
        subtitle={`${campaigns.length} кампаний`}
        right={
          <button onClick={() => onEdit()} className="tap" style={{
            background: "linear-gradient(135deg, #5288c1, #3b6fa8)",
            border: "none", borderRadius: 11,
            padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#fff",
            cursor: "pointer", boxShadow: "0 2px 12px rgba(82,136,193,0.3)",
          }}>
            + Новая
          </button>
        }
      />

      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 7, padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflowX: "auto", flexShrink: 0,
        WebkitOverflowScrolling: "touch",
      }}>
        {filters.map(f => {
          const isActive = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} className="tap" style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20,
              border: `1px solid ${isActive ? "rgba(82,136,193,0.4)" : "rgba(255,255,255,0.08)"}`,
              background: isActive ? "rgba(82,136,193,0.15)" : "rgba(255,255,255,0.04)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              color: isActive ? TG.accentLight : TG.muted,
              fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: "pointer",
              boxShadow: isActive ? "0 0 12px rgba(82,136,193,0.15)" : "none",
            }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: TG.muted, fontSize: 14 }}>
              Нет кампаний
            </div>
          ) : (
            <div style={{ padding: "14px" }}>
              <div style={{
                background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
                border: `1px solid ${TG.glassBorder}`,
                borderRadius: 20, overflow: "hidden",
              }}>
                {filtered.map((c, i) => (
                  <CampaignRow key={c.id} campaign={c} last={i === filtered.length - 1} onClick={() => setDetail(c.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
