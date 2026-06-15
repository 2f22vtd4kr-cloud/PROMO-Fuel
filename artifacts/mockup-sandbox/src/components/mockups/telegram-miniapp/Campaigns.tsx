import { useState } from "react";
import {
  PlayCircle, PauseCircle, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Plus, Users, RefreshCw
} from "lucide-react";

const TG = {
  bg: "#17212b", card: "#1e2c3a", accent: "#5288c1", accentLight: "#6ba3d6",
  green: "#4dca6b", red: "#e04a4a", yellow: "#f5a623", orange: "#f07b3f",
  text: "#ffffff", muted: "#7d9eb5", border: "#253443", nav: "#232e3c",
};

const statusMeta: Record<string, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  running:   { icon: PlayCircle,   color: TG.green,  bg: TG.green + "22",  label: "Активна" },
  scheduled: { icon: Clock,        color: TG.yellow, bg: TG.yellow + "22", label: "Запланирована" },
  done:      { icon: CheckCircle2, color: TG.muted,  bg: TG.muted + "22",  label: "Завершена" },
  paused:    { icon: PauseCircle,  color: TG.accent, bg: TG.accent + "22", label: "Пауза" },
  draft:     { icon: AlertCircle,  color: TG.orange, bg: TG.orange + "22", label: "Черновик" },
  failed:    { icon: AlertCircle,  color: TG.red,    bg: TG.red + "22",    label: "Ошибка" },
};

const campaigns = [
  { id: 1, name: "Акция декабрь 2024", status: "running",   sent: 1240, failed: 12, total: 3000, accounts: 4 },
  { id: 2, name: "Новый год 2025",     status: "scheduled", sent: 0,    failed: 0,  total: 5000, accounts: 6 },
  { id: 3, name: "Летняя распродажа",  status: "done",      sent: 2800, failed: 43, total: 2800, accounts: 3 },
  { id: 4, name: "Тест-драйв авто",    status: "paused",    sent: 340,  failed: 5,  total: 1000, accounts: 2 },
  { id: 5, name: "Черновик Q1",        status: "draft",     sent: 0,    failed: 0,  total: 0,    accounts: 0 },
  { id: 6, name: "Ретаргет база",      status: "failed",    sent: 88,   failed: 88, total: 1200, accounts: 1 },
];

const filters = ["Все", "Активна", "Черновик", "Завершена"];

function CampaignCard({ c, expanded, onToggle }: { c: typeof campaigns[0]; expanded: boolean; onToggle: () => void }) {
  const meta = statusMeta[c.status];
  const pct = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0;
  const delivRate = c.sent > 0 ? Math.round(((c.sent - c.failed) / c.sent) * 100) : 0;

  return (
    <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ background: meta.bg, borderRadius: 9, padding: 8, display: "flex", flexShrink: 0, marginTop: 1 }}>
          <meta.icon size={15} color={meta.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
            <ChevronRight size={14} color={TG.muted} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", marginLeft: 8, flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px" }}>{meta.label}</span>
            {c.accounts > 0 && (
              <span style={{ background: TG.accent + "15", color: TG.accent, fontSize: 11, borderRadius: 6, padding: "2px 8px", display: "flex", alignItems: "center", gap: 3 }}>
                <Users size={10} /> {c.accounts} акк.
              </span>
            )}
          </div>
          {c.total > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, background: TG.border, borderRadius: 2 }}>
                <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: meta.color }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: TG.muted }}>{c.sent.toLocaleString()} / {c.total.toLocaleString()}</span>
                <span style={{ fontSize: 11, color: TG.muted }}>{pct}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${TG.border}`, padding: "12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: "Отправлено", value: c.sent.toLocaleString(), color: TG.text },
              { label: "Доставка",   value: `${delivRate}%`,          color: TG.green },
              { label: "Ошибок",     value: c.failed.toLocaleString(), color: c.failed > 0 ? TG.red : TG.muted },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", background: TG.bg, borderRadius: 8, padding: "8px 4px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: TG.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {c.status === "running" && (
              <button style={{ flex: 1, padding: "9px 0", background: TG.yellow + "22", border: `1px solid ${TG.yellow}44`, borderRadius: 9, color: TG.yellow, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ⏸ Пауза
              </button>
            )}
            {(c.status === "paused" || c.status === "draft") && (
              <button style={{ flex: 1, padding: "9px 0", background: TG.green + "22", border: `1px solid ${TG.green}44`, borderRadius: 9, color: TG.green, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ▶ Запустить
              </button>
            )}
            <button style={{ flex: 1, padding: "9px 0", background: TG.border, border: `1px solid ${TG.border}`, borderRadius: 9, color: TG.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Детали
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Campaigns() {
  const [activeFilter, setActiveFilter] = useState("Все");
  const [expanded, setExpanded] = useState<number | null>(1);

  const filtered = campaigns.filter(c => {
    if (activeFilter === "Все") return true;
    if (activeFilter === "Активна") return c.status === "running";
    if (activeFilter === "Черновик") return c.status === "draft";
    if (activeFilter === "Завершена") return c.status === "done";
    return true;
  });

  return (
    <div style={{ background: TG.bg, minHeight: "100vh", fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: TG.text, display: "flex", flexDirection: "column" }}>
      <div style={{ background: TG.card, padding: "16px 20px 14px", borderBottom: `1px solid ${TG.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Рассылки</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: "none", color: TG.muted, cursor: "pointer", padding: 4 }}>
            <RefreshCw size={17} />
          </button>
          <button style={{ background: TG.accent, border: "none", borderRadius: 8, color: TG.text, cursor: "pointer", padding: "6px 12px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={14} /> Новая
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 16px 8px", overflowX: "auto" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: 500,
            background: activeFilter === f ? TG.accent : TG.card,
            color: activeFilter === f ? TG.text : TG.muted,
          }}>{f}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 100px" }}>
        {filtered.map(c => (
          <CampaignCard key={c.id} c={c} expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} />
        ))}
      </div>

      <BottomNav active="campaigns" />
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { id: "home", icon: "⊞", label: "Главная" },
    { id: "campaigns", icon: "📢", label: "Рассылки" },
    { id: "editor", icon: "✏️", label: "Редактор" },
    { id: "accounts", icon: "👤", label: "Аккаунты" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: TG.nav, borderTop: `1px solid ${TG.border}`, display: "flex", padding: "8px 0 20px" }}>
      {items.map(item => (
        <div key={item.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", opacity: active === item.id ? 1 : 0.45 }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 10, color: active === item.id ? TG.accentLight : TG.muted, fontWeight: active === item.id ? 600 : 400 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
