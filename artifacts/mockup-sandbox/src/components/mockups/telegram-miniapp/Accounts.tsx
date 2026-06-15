import { useState } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldOff, Wifi, WifiOff,
  Plus, RefreshCw, ChevronRight, Activity, Send, AlertTriangle
} from "lucide-react";

const TG = {
  bg: "#17212b", card: "#1e2c3a", accent: "#5288c1", accentLight: "#6ba3d6",
  green: "#4dca6b", red: "#e04a4a", yellow: "#f5a623", orange: "#f07b3f",
  purple: "#a78bfa", text: "#ffffff", muted: "#7d9eb5", border: "#253443", nav: "#232e3c",
};

type AccountStatus = "idle" | "sending" | "flood_wait" | "banned" | "offline";

interface Account {
  id: number;
  label: string;
  phone: string;
  telegram_id?: number;
  username?: string;
  status: AccountStatus;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  last_error?: string;
  proxy?: string;
  is_active: boolean;
  is_banned: boolean;
  flood_wait_secs?: number;
}

const statusMeta: Record<AccountStatus, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  idle:       { icon: ShieldCheck,  color: TG.green,  bg: TG.green + "20",  label: "Готов" },
  sending:    { icon: Activity,     color: TG.accent, bg: TG.accent + "20", label: "Отправляет" },
  flood_wait: { icon: AlertTriangle,color: TG.yellow, bg: TG.yellow + "20", label: "FloodWait" },
  banned:     { icon: ShieldOff,    color: TG.red,    bg: TG.red + "20",    label: "Заблокирован" },
  offline:    { icon: WifiOff,      color: TG.muted,  bg: TG.muted + "15",  label: "Офлайн" },
};

const accounts: Account[] = [
  { id: 1, label: "Основной",     phone: "+7 916 *** **01", telegram_id: 123456789, username: "ru_sender_1", status: "sending",    sent_today: 287, sent_total: 14820, failed_total: 43, proxy: "RU-Msk-SOCKS5", is_active: true,  is_banned: false },
  { id: 2, label: "Резерв #1",    phone: "+7 495 *** **22", telegram_id: 234567890, username: "ru_sender_2", status: "idle",       sent_today: 120, sent_total: 8430,  failed_total: 12, proxy: "RU-Spb-SOCKS5", is_active: true,  is_banned: false },
  { id: 3, label: "Резерв #2",    phone: "+7 903 *** **47", telegram_id: 345678901,                          status: "flood_wait", sent_today: 302, sent_total: 5100,  failed_total: 88, proxy: "RU-Msk-SOCKS5", is_active: true,  is_banned: false, flood_wait_secs: 143, last_error: "FloodWaitError 143s" },
  { id: 4, label: "Прогрев #1",   phone: "+7 926 *** **83", telegram_id: 456789012, username: "warm_acc_1",  status: "idle",       sent_today: 50,  sent_total: 350,   failed_total: 2,  proxy: "RU-Ekb-SOCKS5", is_active: true,  is_banned: false },
  { id: 5, label: "Старый акк",   phone: "+7 985 *** **55",                                                   status: "banned",     sent_today: 0,   sent_total: 21200, failed_total: 300,                         is_active: false, is_banned: true,  last_error: "SpamBanError" },
  { id: 6, label: "Прогрев #2",   phone: "+7 977 *** **61",                                                   status: "offline",    sent_today: 0,   sent_total: 80,    failed_total: 0,  proxy: "RU-Msk-SOCKS5", is_active: false, is_banned: false },
];

const DAILY_LIMIT = 300;

function AccountCard({ acc, expanded, onToggle }: { acc: Account; expanded: boolean; onToggle: () => void }) {
  const meta = statusMeta[acc.status];
  const dailyPct = Math.min((acc.sent_today / DAILY_LIMIT) * 100, 100);
  const barColor = dailyPct > 90 ? TG.red : dailyPct > 70 ? TG.yellow : TG.green;

  return (
    <div style={{ background: TG.card, border: `1px solid ${acc.is_banned ? TG.red + "44" : TG.border}`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 20, background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <meta.icon size={18} color={meta.color} />
          </div>
          <div style={{
            position: "absolute", bottom: -1, right: -1, width: 12, height: 12,
            borderRadius: 6, background: meta.color, border: `2px solid ${TG.card}`
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{acc.label}</span>
            {acc.username && <span style={{ fontSize: 11, color: TG.accent }}>@{acc.username}</span>}
          </div>
          <div style={{ fontSize: 11, color: TG.muted, marginBottom: 5 }}>{acc.phone}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px" }}>{meta.label}</span>
            {acc.status === "sending" && (
              <span style={{ fontSize: 10, color: TG.muted }}>{acc.sent_today} / {DAILY_LIMIT} сег.</span>
            )}
            {acc.flood_wait_secs && (
              <span style={{ fontSize: 10, color: TG.yellow }}>⏱ {acc.flood_wait_secs}s</span>
            )}
          </div>
        </div>

        <ChevronRight size={14} color={TG.muted} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${TG.border}`, padding: "12px 16px" }}>
          {/* Daily limit bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: TG.muted }}>Лимит сегодня</span>
              <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{acc.sent_today} / {DAILY_LIMIT}</span>
            </div>
            <div style={{ height: 4, background: TG.border, borderRadius: 2 }}>
              <div style={{ height: 4, borderRadius: 2, width: `${dailyPct}%`, background: barColor, transition: "width 0.4s" }} />
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Всего",    value: acc.sent_total.toLocaleString(),   icon: Send,          color: TG.text },
              { label: "Ошибок",   value: acc.failed_total.toLocaleString(), icon: ShieldAlert,   color: acc.failed_total > 0 ? TG.red : TG.muted },
              { label: "Успех %",  value: acc.sent_total > 0 ? `${Math.round(((acc.sent_total - acc.failed_total) / acc.sent_total) * 100)}%` : "—", icon: Wifi, color: TG.green },
            ].map(s => (
              <div key={s.label} style={{ background: TG.bg, borderRadius: 9, padding: "8px 6px", textAlign: "center" }}>
                <s.icon size={13} color={s.color} style={{ marginBottom: 3 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: TG.muted }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div style={{ background: TG.bg, borderRadius: 9, padding: "8px 12px", marginBottom: 10, fontSize: 11 }}>
            {acc.telegram_id && (
              <div style={{ display: "flex", justifyContent: "space-between", color: TG.muted, marginBottom: 4 }}>
                <span>Telegram ID</span><span style={{ color: TG.text, fontFamily: "monospace" }}>{acc.telegram_id}</span>
              </div>
            )}
            {acc.proxy && (
              <div style={{ display: "flex", justifyContent: "space-between", color: TG.muted, marginBottom: acc.last_error ? 4 : 0 }}>
                <span>Прокси</span><span style={{ color: TG.green }}>{acc.proxy}</span>
              </div>
            )}
            {acc.last_error && (
              <div style={{ display: "flex", justifyContent: "space-between", color: TG.muted }}>
                <span>Ошибка</span><span style={{ color: TG.red, maxWidth: 160, textAlign: "right" }}>{acc.last_error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            {acc.is_active && !acc.is_banned && (
              <button style={{ flex: 1, padding: "9px 0", background: TG.yellow + "22", border: `1px solid ${TG.yellow}44`, borderRadius: 9, color: TG.yellow, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Пауза
              </button>
            )}
            {!acc.is_active && !acc.is_banned && (
              <button style={{ flex: 1, padding: "9px 0", background: TG.green + "22", border: `1px solid ${TG.green}44`, borderRadius: 9, color: TG.green, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Включить
              </button>
            )}
            <button style={{ flex: 1, padding: "9px 0", background: TG.border, border: `1px solid ${TG.border}`, borderRadius: 9, color: TG.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Настройки
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Accounts() {
  const [expanded, setExpanded] = useState<number | null>(1);
  const active = accounts.filter(a => a.is_active && !a.is_banned).length;
  const sending = accounts.filter(a => a.status === "sending").length;
  const banned = accounts.filter(a => a.is_banned).length;

  return (
    <div style={{ background: TG.bg, minHeight: "100vh", fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: TG.text, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: TG.card, padding: "16px 20px 14px", borderBottom: `1px solid ${TG.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Аккаунты</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: "none", color: TG.muted, cursor: "pointer", padding: 4 }}>
            <RefreshCw size={17} />
          </button>
          <button style={{ background: TG.accent, border: "none", borderRadius: 8, color: TG.text, cursor: "pointer", padding: "6px 12px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={14} /> Добавить
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 8px" }}>
        {[
          { label: `${active} активных`, color: TG.green, bg: TG.green + "18" },
          { label: `${sending} шлёт`,    color: TG.accent, bg: TG.accent + "18" },
          { label: `${banned} забанен`,  color: TG.red,   bg: TG.red + "18" },
        ].map(chip => (
          <div key={chip.label} style={{ background: chip.bg, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: chip.color }}>
            {chip.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 100px" }}>
        {accounts.map(acc => (
          <AccountCard
            key={acc.id} acc={acc}
            expanded={expanded === acc.id}
            onToggle={() => setExpanded(expanded === acc.id ? null : acc.id)}
          />
        ))}
      </div>

      <BottomNav active="accounts" />
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
