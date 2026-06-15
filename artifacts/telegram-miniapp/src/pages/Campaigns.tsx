import { useState, useEffect, useCallback } from "react";
import {
  Play, Pause, Trash2, Copy, ChevronLeft,
  BarChart2, CheckCircle, XCircle, Clock, X,
  ChevronDown, ChevronUp, Users2,
} from "lucide-react";
import { api, Campaign, SendLog, AccountBreakdown } from "../lib/api";
import { TG, STATUS_META } from "../lib/theme";
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

  if (loading) return (
    <div style={{ padding: "12px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка...</div>
  );

  if (logs.length === 0) return (
    <div style={{ padding: "12px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Нет отправок</div>
  );

  return (
    <div style={{ maxHeight: 260, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {logs.map(log => {
        const ok = log.status === "ok";
        return (
          <div key={log.id} style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "8px 14px",
            borderBottom: `1px solid ${TG.border}`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: ok ? TG.green : TG.red, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {log.first_name || log.username ? `${log.first_name ?? ""}${log.username ? ` @${log.username}` : ""}`.trim() : `ID ${log.chat_id}`}
              </div>
              {log.error && (
                <div style={{ fontSize: 10, color: TG.red, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.error}
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: TG.muted, flexShrink: 0 }}>
              {log.sent_at ? log.sent_at.slice(11, 16) : ""}
            </div>
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

  if (loading) return (
    <div style={{ padding: "12px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка...</div>
  );

  if (data.length === 0) return (
    <div style={{ padding: "12px", textAlign: "center", color: TG.muted, fontSize: 12 }}>Нет данных</div>
  );

  return (
    <div>
      {data.map(acc => {
        const pct = acc.total > 0 ? (acc.ok / acc.total) * 100 : 0;
        return (
          <div key={acc.id} style={{ padding: "9px 14px", borderBottom: `1px solid ${TG.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                {acc.label || acc.phone}
              </div>
              <div style={{ fontSize: 11, color: TG.muted, flexShrink: 0 }}>
                <span style={{ color: TG.green }}>{acc.ok}</span>
                {acc.errors > 0 && <span style={{ color: TG.red }}> / {acc.errors} ош.</span>}
                <span> из {acc.total}</span>
              </div>
            </div>
            <div style={{ height: 4, background: TG.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? TG.green : pct > 50 ? TG.yellow : TG.red, borderRadius: 2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Accordion({ title, icon: Icon, iconColor, children }: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "13px 14px", background: "none", border: "none",
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        }}
      >
        <Icon size={14} color={iconColor} />
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600, color: TG.text }}>{title}</span>
        {open ? <ChevronUp size={14} color={TG.muted} /> : <ChevronDown size={14} color={TG.muted} />}
      </button>
      {open && <div style={{ borderTop: `1px solid ${TG.border}` }}>{children}</div>}
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
      const update = (data as Array<{ id: number; status: string; sent_count: number; failed_count: number; target_count: number }>)
        .find(c => c.id === id);
      if (update) {
        setCampaign(prev => prev ? { ...prev, ...update } : prev);
      }
    }
  }, [id]));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function handleAction(newStatus: string, label: string) {
    setBusy(true);
    try {
      await api.actionCampaign(id, newStatus);
      await load();
      showToast(label);
    } catch { showToast("Ошибка"); }
    setBusy(false);
  }

  async function handleDuplicate() {
    setBusy(true);
    try {
      await api.duplicateCampaign(id);
      showToast("Кампания скопирована");
    } catch { showToast("Ошибка"); }
    setBusy(false);
  }

  async function handleDelete() {
    if (!(window as any).Telegram?.WebApp?.showConfirm) {
      if (!confirm("Удалить кампанию?")) return;
    } else {
      await new Promise<void>(resolve => {
        (window as any).Telegram.WebApp.showConfirm("Удалить кампанию?", (ok: boolean) => {
          if (!ok) return;
          resolve();
        });
      });
    }
    setBusy(true);
    try {
      await api.deleteCampaign(id);
      onBack();
    } catch { showToast("Ошибка"); }
    setBusy(false);
  }

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Кампания" right={
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
      } />
      <FullSpinner />
    </div>
  );

  if (!campaign) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Не найдено" right={
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
      } />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TG.muted }}>
        Кампания не найдена
      </div>
    </div>
  );

  const meta = STATUS_META[campaign.status] ?? STATUS_META.draft;
  const pct = campaign.target_count > 0 ? Math.min((campaign.sent_count / campaign.target_count) * 100, 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 10,
          padding: "8px 16px", fontSize: 13, zIndex: 999, color: TG.text,
          boxShadow: "0 4px 16px #0006",
        }}>{toast}</div>
      )}

      <div style={{ background: TG.card, borderBottom: `1px solid ${TG.border}`, padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4, marginLeft: -4 }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
          <div style={{ fontSize: 12, color: meta.color, marginTop: 1, fontWeight: 500 }}>{meta.label}</div>
        </div>
        {campaign.scheduled_at && (
          <div style={{ fontSize: 10, color: TG.yellow, background: TG.yellow + "18", borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>
            {new Date(campaign.scheduled_at).toLocaleString("ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px", WebkitOverflowScrolling: "touch" }}>

        {/* Progress */}
        <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, padding: "16px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: TG.muted }}>Прогресс рассылки</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, background: TG.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
          {[
            { icon: BarChart2, label: "Отправлено", value: campaign.sent_count.toLocaleString("ru"), color: TG.accent },
            { icon: CheckCircle, label: "Получателей", value: campaign.target_count.toLocaleString("ru"), color: TG.green },
            { icon: XCircle, label: "Ошибок", value: campaign.failed_count.toLocaleString("ru"), color: campaign.failed_count > 0 ? TG.red : TG.muted },
            { icon: Clock, label: "Создана", value: campaign.created_at.slice(0, 10), color: TG.muted },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 12, padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon size={13} color={color} />
                <span style={{ fontSize: 11, color: TG.muted }}>{label}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Message preview */}
        <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, padding: "14px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: TG.muted, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Текст сообщения</div>
          <pre style={{ fontSize: 13, color: TG.text, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.5, margin: 0 }}>
            {campaign.text_template}
          </pre>
        </div>

        {campaign.notes && (
          <div style={{ background: TG.yellow + "11", border: `1px solid ${TG.yellow}33`, borderRadius: 12, padding: "12px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: TG.yellow, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Заметки</div>
            <div style={{ fontSize: 13, color: TG.muted, lineHeight: 1.5 }}>{campaign.notes}</div>
          </div>
        )}

        {/* Send logs accordion */}
        <Accordion title="Лог отправок" icon={BarChart2} iconColor={TG.accent}>
          <SendLogsPanel campaignId={id} />
        </Accordion>

        {/* Account breakdown accordion */}
        <Accordion title="По аккаунтам" icon={Users2} iconColor={TG.purple}>
          <BreakdownPanel campaignId={id} />
        </Accordion>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <button disabled={busy} onClick={() => handleAction("running", "Запущена!")} style={{
              width: "100%", padding: "13px", borderRadius: 13,
              background: TG.accentGrad, border: "none", color: TG.text,
              fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1,
            }}>
              <Play size={15} /> Запустить
            </button>
          )}
          {campaign.status === "running" && (
            <button disabled={busy} onClick={() => handleAction("paused", "Поставлена на паузу")} style={{
              width: "100%", padding: "13px", borderRadius: 13,
              background: TG.card, border: `1px solid ${TG.border}`, color: TG.text,
              fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1,
            }}>
              <Pause size={15} /> Пауза
            </button>
          )}
          {(campaign.status === "running" || campaign.status === "paused") && (
            <button disabled={busy} onClick={() => handleAction("cancelled", "Отменена")} style={{
              width: "100%", padding: "13px", borderRadius: 13,
              background: TG.red + "22", border: `1px solid ${TG.red}44`, color: TG.red,
              fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1,
            }}>
              <X size={15} /> Отменить
            </button>
          )}
          <button disabled={busy} onClick={handleDuplicate} style={{
            width: "100%", padding: "13px", borderRadius: 13,
            background: TG.card, border: `1px solid ${TG.border}`, color: TG.muted,
            fontSize: 14, fontWeight: 500, cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Copy size={15} /> Дублировать
          </button>
          <button disabled={busy} onClick={handleDelete} style={{
            width: "100%", padding: "13px", borderRadius: 13,
            background: "transparent", border: `1px solid ${TG.red}33`, color: TG.red + "cc",
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
        return prev.map(c => {
          const u = updates.find(x => x.id === c.id);
          return u ? { ...c, ...u } : c;
        });
      });
    }
  }, []));

  if (detail !== null) {
    return <DetailView id={detail} onBack={() => { setDetail(null); load(); }} />;
  }

  const filters: { id: string; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "running", label: "Активные" },
    { id: "scheduled", label: "Планы" },
    { id: "draft", label: "Черновики" },
    { id: "done", label: "Завершённые" },
    { id: "cancelled", label: "Отменённые" },
  ];

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Рассылки"
        subtitle={`${campaigns.length} кампаний`}
        right={
          <button
            onClick={() => onEdit()}
            style={{
              background: TG.accentGrad, border: "none", borderRadius: 9,
              padding: "7px 13px", fontSize: 13, fontWeight: 700, color: TG.text,
              cursor: "pointer",
            }}
          >
            + Новая
          </button>
        }
      />

      <div style={{
        display: "flex", gap: 7, padding: "10px 14px",
        borderBottom: `1px solid ${TG.border}`,
        overflowX: "auto", flexShrink: 0,
        WebkitOverflowScrolling: "touch",
      }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flexShrink: 0, padding: "5px 13px", borderRadius: 20,
            border: `1px solid ${filter === f.id ? TG.accent : TG.border}`,
            background: filter === f.id ? TG.accent + "22" : "transparent",
            color: filter === f.id ? TG.accentLight : TG.muted,
            fontSize: 12, fontWeight: filter === f.id ? 700 : 400, cursor: "pointer",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: TG.muted, fontSize: 14 }}>
              Нет кампаний
            </div>
          ) : (
            <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, margin: 14, overflow: "hidden" }}>
              {filtered.map((c, i) => (
                <CampaignRow
                  key={c.id} campaign={c}
                  last={i === filtered.length - 1}
                  onClick={() => setDetail(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
