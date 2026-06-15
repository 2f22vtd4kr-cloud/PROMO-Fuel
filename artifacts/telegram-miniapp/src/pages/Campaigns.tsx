import { useState, useEffect, useCallback } from "react";
import {
  Play, Pause, Trash2, Copy, ChevronLeft,
  BarChart2, CheckCircle, XCircle, Clock, X,
  ChevronDown, ChevronUp, Users2,
} from "lucide-react";
import { api, Campaign, SendLog, AccountBreakdown } from "../lib/api";
import { TG, STATUS_META, BLUR, BLUR_HEAVY } from "../lib/theme";
import { Header } from "../components/Header";
import { CampaignRow } from "../components/CampaignRow";
import { FullSpinner } from "../components/Spinner";
import { useSse } from "../lib/useSse";
import { haptic } from "../lib/haptics";

function SendLogsPanel({ campaignId }: { campaignId: number }) {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getCampaignLogs(campaignId).then(setLogs).catch(() => setLogs([])).finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div style={{ padding: "16px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка...</div>;
  if (logs.length === 0) return <div style={{ padding: "16px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Нет отправок</div>;

  return (
    <div style={{ maxHeight: 280, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {logs.map((log, i) => {
        const ok = log.status === "ok";
        return (
          <div key={log.id} className="fade-up stagger-item" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 15px",
            borderBottom: i < logs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: ok ? TG.green : TG.red, boxShadow: `0 0 7px 2px ${ok ? TG.greenGlow : TG.redGlow}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {log.first_name || log.username ? `${log.first_name ?? ""}${log.username ? ` @${log.username}` : ""}`.trim() : `ID ${log.chat_id}`}
              </div>
              {log.error && <div style={{ fontSize: 10, color: TG.red, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.error}</div>}
            </div>
            <div style={{ fontSize: 10, color: TG.muted, flexShrink: 0 }}>{log.sent_at?.slice(11, 16)}</div>
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

  if (loading) return <div style={{ padding: "16px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка...</div>;
  if (data.length === 0) return <div style={{ padding: "16px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Нет данных</div>;

  return (
    <div>
      {data.map((acc, i) => {
        const pct = acc.total > 0 ? (acc.ok / acc.total) * 100 : 0;
        const barColor = pct > 80 ? TG.green : pct > 50 ? TG.yellow : TG.red;
        return (
          <div key={acc.id} style={{ padding: "10px 15px", borderBottom: i < data.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%", color: TG.text }}>{acc.label || acc.phone}</div>
              <div style={{ fontSize: 11, color: TG.muted, flexShrink: 0 }}>
                <span style={{ color: TG.green }}>{acc.ok}</span>
                {acc.errors > 0 && <span style={{ color: TG.red }}> / {acc.errors}</span>}
                <span> / {acc.total}</span>
              </div>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.055)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, boxShadow: `0 0 8px ${barColor}88` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GlassAccordion({ title, icon: Icon, iconColor, children }: { title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg" style={{ marginBottom: 12, borderRadius: 20 }}>
      <button onClick={() => { haptic.select(); setOpen(o => !o); }} className="tap" style={{
        width: "100%", padding: "14px 16px", background: "none", border: "none",
        display: "flex", alignItems: "center", gap: 9, cursor: "pointer", position: "relative", zIndex: 2,
      }}>
        <div style={{ background: `${iconColor}1a`, border: `1px solid ${iconColor}30`, borderRadius: 9, padding: 6, display: "flex" }}>
          <Icon size={13} color={iconColor} />
        </div>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 700, color: TG.text }}>{title}</span>
        {open ? <ChevronUp size={13} color={TG.muted} /> : <ChevronDown size={13} color={TG.muted} />}
      </button>
      {open && <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", position: "relative", zIndex: 2 }}>{children}</div>}
    </div>
  );
}

function GlassToast({ msg }: { msg: string }) {
  return (
    <div style={{
      position: "fixed", top: 22, left: "50%", transform: "translateX(-50%)",
      background: "rgba(10,14,26,0.95)", backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY,
      border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: "11px 22px",
      fontSize: 13, zIndex: 999, color: TG.text, fontWeight: 600,
      boxShadow: "0 12px 44px rgba(0,0,0,0.50)", animation: "toastIn 0.32s cubic-bezier(0.16,1,0.3,1) both",
      whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

function ActionBtn({ onClick, disabled, children, variant = "ghost" }: { onClick: () => void; disabled: boolean; children: React.ReactNode; variant?: "primary" | "ghost" | "danger" | "green" }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "linear-gradient(135deg,#5b96d4,#3a6fad)", border: "none", color: "#fff", boxShadow: "0 6px 24px rgba(91,150,212,0.36), 0 1px 0 rgba(255,255,255,0.18) inset" },
    green:   { background: "rgba(45,232,151,0.09)", border: "1px solid rgba(45,232,151,0.28)", color: TG.green },
    ghost:   { background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.11)", color: TG.textSecondary },
    danger:  { background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.24)", color: TG.red },
  };
  return (
    <button onClick={() => { haptic.light(); onClick(); }} disabled={disabled} className="tap" style={{
      width: "100%", padding: "14px", borderRadius: 18, fontSize: 14, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      opacity: disabled ? 0.65 : 1, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
      ...styles[variant],
    }}>
      {children}
    </button>
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
      const update = (data as any[]).find((c: any) => c.id === id);
      if (update) setCampaign(prev => prev ? { ...prev, ...update } : prev);
    }
  }, [id]));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  async function handleAction(status: string, label: string) {
    setBusy(true);
    try { await api.actionCampaign(id, status); await load(); haptic.success(); showToast(label); }
    catch { haptic.error(); showToast("Ошибка"); }
    setBusy(false);
  }

  async function handleDuplicate() {
    setBusy(true);
    try { await api.duplicateCampaign(id); haptic.success(); showToast("Кампания скопирована"); }
    catch { haptic.error(); showToast("Ошибка"); }
    setBusy(false);
  }

  async function handleDelete() {
    if (!(window as any).Telegram?.WebApp?.showConfirm) {
      if (!confirm("Удалить кампанию?")) return;
    } else {
      await new Promise<void>(res => {
        (window as any).Telegram.WebApp.showConfirm("Удалить кампанию?", (ok: boolean) => { if (!ok) return; res(); });
      });
    }
    setBusy(true);
    try { await api.deleteCampaign(id); haptic.success(); onBack(); }
    catch { haptic.error(); showToast("Ошибка"); }
    setBusy(false);
  }

  const backBtn = (
    <button onClick={() => { haptic.light(); onBack(); }} className="tap" style={{
      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 11, cursor: "pointer", color: TG.text, padding: 8, display: "flex",
    }}>
      <ChevronLeft size={17} />
    </button>
  );

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Кампания" right={backBtn} />
      <FullSpinner />
    </div>
  );
  if (!campaign) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Не найдено" right={backBtn} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TG.muted }}>Кампания не найдена</div>
    </div>
  );

  const meta = STATUS_META[campaign.status] ?? STATUS_META.draft;
  const pct = campaign.target_count > 0 ? Math.min((campaign.sent_count / campaign.target_count) * 100, 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }} className="fade-up">
      {toast && <GlassToast msg={toast} />}
      <div style={{
        background: "rgba(8,11,20,0.78)", backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY,
        borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "13px 16px",
        display: "flex", alignItems: "center", gap: 11, flexShrink: 0, position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)", pointerEvents: "none" }} />
        {backBtn}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.4px", background: "linear-gradient(135deg,#eef2ff,rgba(200,220,255,0.80))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{campaign.name}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: meta.color, boxShadow: `0 0 7px 2px ${meta.glow}` }} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </div>
        </div>
        {campaign.scheduled_at && (
          <div style={{ fontSize: 10, color: TG.yellow, background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.24)", borderRadius: 10, padding: "4px 9px", flexShrink: 0 }}>
            {new Date(campaign.scheduled_at).toLocaleString("ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px", WebkitOverflowScrolling: "touch" }}>
        {/* Progress */}
        <div className="lg" style={{ padding: "16px", marginBottom: 12 }}>
          <div style={{ position: "absolute", top: -28, right: -28, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle,${meta.glow} 0%,transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, position: "relative", zIndex: 2 }}>
            <span style={{ fontSize: 12, color: TG.muted, fontWeight: 600 }}>Прогресс рассылки</span>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px", background: meta.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.055)", borderRadius: 4, overflow: "hidden", position: "relative", zIndex: 2 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: meta.grad, borderRadius: 4, transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 0 14px ${meta.glow}` }} />
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
          {[
            { icon: BarChart2,   label: "Отправлено",  value: campaign.sent_count.toLocaleString("ru"),   color: TG.accent, grad: "linear-gradient(135deg,#95c4f5,#5b96d4)" },
            { icon: CheckCircle, label: "Получателей", value: campaign.target_count.toLocaleString("ru"), color: TG.green,  grad: "linear-gradient(135deg,#2de897,#17a86a)" },
            { icon: XCircle,     label: "Ошибок",      value: campaign.failed_count.toLocaleString("ru"), color: campaign.failed_count > 0 ? TG.red : TG.muted, grad: campaign.failed_count > 0 ? "linear-gradient(135deg,#ff6b7a,#c03040)" : "linear-gradient(135deg,#8aa3c0,#607080)" },
            { icon: Clock,       label: "Создана",     value: campaign.created_at.slice(0, 10),           color: TG.muted,  grad: "linear-gradient(135deg,#8aa3c0,#607080)" },
          ].map(({ icon: Icon, label, value, color, grad }) => (
            <div key={label} className="lg" style={{ padding: "12px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, position: "relative", zIndex: 2 }}>
                <Icon size={12} color={color} />
                <span style={{ fontSize: 10, color: TG.muted, fontWeight: 600 }}>{label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", position: "relative", zIndex: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="lg" style={{ padding: "15px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: TG.muted, fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.10em", position: "relative", zIndex: 2 }}>Текст сообщения</div>
          <pre style={{ fontSize: 13, color: TG.text, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, margin: 0, position: "relative", zIndex: 2 }}>{campaign.text_template}</pre>
        </div>

        {campaign.notes && (
          <div style={{ background: "rgba(255,201,70,0.08)", border: "1px solid rgba(255,201,70,0.20)", backdropFilter: BLUR, WebkitBackdropFilter: BLUR, borderRadius: 18, padding: "13px 15px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: TG.yellow, fontWeight: 800, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.10em" }}>Заметки</div>
            <div style={{ fontSize: 13, color: TG.textSecondary, lineHeight: 1.6 }}>{campaign.notes}</div>
          </div>
        )}

        <GlassAccordion title="Лог отправок" icon={BarChart2} iconColor={TG.accent}><SendLogsPanel campaignId={id} /></GlassAccordion>
        <GlassAccordion title="По аккаунтам" icon={Users2}    iconColor={TG.purple}><BreakdownPanel campaignId={id} /></GlassAccordion>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <ActionBtn onClick={() => handleAction("running", "Запущена!")} disabled={busy} variant="primary">
              <Play size={15} fill="currentColor" /> Запустить
            </ActionBtn>
          )}
          {campaign.status === "running" && (
            <ActionBtn onClick={() => handleAction("paused", "На паузе")} disabled={busy} variant="ghost">
              <Pause size={15} /> Пауза
            </ActionBtn>
          )}
          {(campaign.status === "running" || campaign.status === "paused") && (
            <ActionBtn onClick={() => handleAction("cancelled", "Отменена")} disabled={busy} variant="danger">
              <X size={15} /> Отменить
            </ActionBtn>
          )}
          <ActionBtn onClick={handleDuplicate} disabled={busy} variant="ghost">
            <Copy size={15} /> Дублировать
          </ActionBtn>
          <ActionBtn onClick={handleDelete} disabled={busy} variant="danger">
            <Trash2 size={15} /> Удалить
          </ActionBtn>
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
        const updates = data as any[];
        return prev.map(c => { const u = updates.find((x: any) => x.id === c.id); return u ? { ...c, ...u } : c; });
      });
    }
  }, []));

  if (detail !== null) return <DetailView id={detail} onBack={() => { setDetail(null); load(); }} />;

  const filters: { id: string; label: string; color?: string }[] = [
    { id: "all",       label: "Все" },
    { id: "running",   label: "Активные",   color: TG.green },
    { id: "scheduled", label: "Планы",      color: TG.yellow },
    { id: "draft",     label: "Черновики" },
    { id: "done",      label: "Завершённые" },
    { id: "cancelled", label: "Отменённые", color: TG.red },
  ];
  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Рассылки"
        subtitle={`${campaigns.length} кампаний`}
        right={
          <button onClick={() => { haptic.medium(); onEdit(); }} className="tap" style={{
            background: "linear-gradient(135deg,#5b96d4,#3a6fad)",
            border: "none", borderRadius: 13, padding: "7px 14px",
            fontSize: 13, fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 18px rgba(91,150,212,0.36)",
          }}>
            + Новая
          </button>
        }
      />

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", flexShrink: 0, WebkitOverflowScrolling: "touch" }}>
        {filters.map(f => {
          const isActive = filter === f.id;
          const c = f.color ?? TG.accent;
          return (
            <button key={f.id} onClick={() => { haptic.select(); setFilter(f.id); }} className="tap" style={{
              flexShrink: 0, padding: "5px 14px", borderRadius: 20,
              border: `1px solid ${isActive ? `${c}42` : "rgba(255,255,255,0.08)"}`,
              background: isActive ? `${c}16` : "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              color: isActive ? c : TG.muted,
              fontSize: 11.5, fontWeight: isActive ? 800 : 400,
              boxShadow: isActive ? `0 0 16px ${c}20` : "none",
            }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ color: TG.muted, fontSize: 14 }}>Нет кампаний</div>
            </div>
          ) : (
            <div style={{ padding: "14px" }}>
              <div className="lg" style={{ borderRadius: 24 }}>
                {filtered.map((c, i) => (
                  <CampaignRow key={c.id} campaign={c} last={i === filtered.length - 1} onClick={() => { haptic.select(); setDetail(c.id); }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
