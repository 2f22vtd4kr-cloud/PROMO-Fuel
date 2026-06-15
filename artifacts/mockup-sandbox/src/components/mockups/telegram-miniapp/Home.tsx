import { useState, useEffect } from "react";
import {
  Send, Users, TrendingUp, Zap, ChevronRight,
  CheckCircle2, Clock, AlertCircle, PlayCircle
} from "lucide-react";

const TG = {
  bg: "#17212b",
  card: "#1e2c3a",
  cardHover: "#243342",
  accent: "#5288c1",
  accentLight: "#6ba3d6",
  green: "#4dca6b",
  red: "#e04a4a",
  yellow: "#f5a623",
  text: "#ffffff",
  muted: "#7d9eb5",
  border: "#253443",
  nav: "#232e3c",
};

function StatCard({ icon: Icon, label, value, delta, color }: {
  icon: React.ElementType; label: string; value: string; delta?: string; color: string;
}) {
  return (
    <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ background: color + "22", borderRadius: 8, padding: 7, display: "flex" }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ color: TG.muted, fontSize: 12, fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
      </div>
      <div style={{ color: TG.text, fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>{value}</div>
      {delta && (
        <div style={{ color: TG.green, fontSize: 11, marginTop: 4, fontWeight: 500 }}>{delta}</div>
      )}
    </div>
  );
}

const campaigns = [
  { name: "Акция декабрь", status: "running", sent: 1240, total: 3000 },
  { name: "Новый год 2025", status: "scheduled", sent: 0, total: 5000 },
  { name: "Летняя распродажа", status: "done", sent: 2800, total: 2800 },
  { name: "Тест-драйв авто", status: "paused", sent: 340, total: 1000 },
];

const statusMeta: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  running: { icon: PlayCircle, color: TG.green, label: "Активна" },
  scheduled: { icon: Clock, color: TG.yellow, label: "Запланирована" },
  done: { icon: CheckCircle2, color: TG.muted, label: "Завершена" },
  paused: { icon: AlertCircle, color: TG.accent, label: "Пауза" },
};

export function Home() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: TG.bg, minHeight: "100vh", fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: TG.text, display: "flex", flexDirection: "column" }}>
      {/* TG header */}
      <div style={{ background: TG.card, padding: "16px 20px 14px", borderBottom: `1px solid ${TG.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>RUProbe CRM</div>
          <div style={{ fontSize: 12, color: TG.muted, marginTop: 1 }}>{time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <div style={{ background: TG.accent + "22", borderRadius: 20, padding: "5px 12px", fontSize: 12, color: TG.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: TG.green }} />
          Онлайн
        </div>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <StatCard icon={Send} label="Отправлено" value="4 380" delta="↑ 12% сегодня" color={TG.accent} />
          <StatCard icon={Users} label="Подписчики" value="8 741" color={TG.green} />
          <StatCard icon={TrendingUp} label="Open Rate" value="54.2%" color={TG.yellow} />
          <StatCard icon={Zap} label="Кампаний" value="12" color="#a78bfa" />
        </div>

        {/* Active campaigns */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Рассылки</span>
          <span style={{ fontSize: 12, color: TG.accent }}>Все →</span>
        </div>

        <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, overflow: "hidden" }}>
          {campaigns.map((c, i) => {
            const meta = statusMeta[c.status];
            const pct = c.total > 0 ? (c.sent / c.total) * 100 : 0;
            return (
              <div key={i} style={{
                padding: "13px 16px",
                borderBottom: i < campaigns.length - 1 ? `1px solid ${TG.border}` : "none",
                display: "flex", alignItems: "center", gap: 12
              }}>
                <div style={{ background: meta.color + "22", borderRadius: 8, padding: 7, display: "flex", flexShrink: 0 }}>
                  <meta.icon size={14} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ marginTop: 5, height: 3, background: TG.border, borderRadius: 2 }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: meta.color, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: TG.muted }}>{meta.label}</span>
                    <span style={{ fontSize: 11, color: TG.muted }}>{c.sent.toLocaleString()} / {c.total.toLocaleString()}</span>
                  </div>
                </div>
                <ChevronRight size={14} color={TG.muted} />
              </div>
            );
          })}
        </div>

        {/* Quick action */}
        <button style={{
          width: "100%", marginTop: 14, padding: "14px 0",
          background: `linear-gradient(135deg, ${TG.accent}, #3b6fa8)`,
          border: "none", borderRadius: 12, color: TG.text,
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          <Send size={16} /> Новая рассылка
        </button>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="home" />
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
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: TG.nav, borderTop: `1px solid ${TG.border}`,
      display: "flex", padding: "8px 0 20px"
    }}>
      {items.map(item => (
        <div key={item.id} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
          opacity: active === item.id ? 1 : 0.45,
          transition: "opacity 0.15s"
        }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 10, color: active === item.id ? TG.accentLight : TG.muted, fontWeight: active === item.id ? 600 : 400 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
