const TG = {
  bg: "#07090f", text: "#e8f0ff", textSecondary: "#8faac8",
  muted: "rgba(160,190,230,0.45)", green: "#2de897", blue: "#6ba8e5",
  yellow: "#ffc946", red: "#ff6b7a", purple: "#c4aeff", pink: "#ff7eb3",
};

const glass = {
  background: "linear-gradient(145deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.03) 100%)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.11)",
  borderRadius: 18,
  boxShadow: "0 2px 0 rgba(255,255,255,0.08) inset,0 8px 32px rgba(0,0,0,0.38)",
} as React.CSSProperties;

const accounts = [
  {
    id: 1, phone: "+7 903 *** 4421", label: "Основной", status: "broadcasting",
    authorized: true, session: "session_1.session", api_id: 12345678,
    sentToday: 847, limit: 1000, proxyCount: 2, workerLocked: 1,
  },
  {
    id: 2, phone: "+7 916 *** 7755", label: "Резервный", status: "sending",
    authorized: true, session: "session_2.session", api_id: 87654321,
    sentToday: 612, limit: 800, proxyCount: 1, workerLocked: 2,
  },
  {
    id: 3, phone: "+7 926 *** 1122", label: "Дополнительный", status: "idle",
    authorized: true, session: "session_3.session", api_id: 11223344,
    sentToday: 0, limit: 500, proxyCount: 3, workerLocked: null,
  },
  {
    id: 4, phone: "+7 985 *** 3300", label: "Новый", status: "offline",
    authorized: false, session: null, api_id: 99887766,
    sentToday: 0, limit: 300, proxyCount: 0, workerLocked: null,
  },
  {
    id: 5, phone: "+7 977 *** 8810", label: "Резерв 2", status: "banned",
    authorized: true, session: "session_5.session", api_id: 55443322,
    sentToday: 0, limit: 400, proxyCount: 1, workerLocked: null,
  },
];

const statusColor: Record<string, string> = {
  idle: TG.green, sending: TG.blue, banned: TG.red,
  offline: TG.muted as string, broadcasting: TG.blue, flood_wait: TG.yellow,
};
const statusLabel: Record<string, string> = {
  idle: "Ожидание", sending: "Отправка", banned: "Забанен",
  offline: "Оффлайн", broadcasting: "Рассылка", flood_wait: "FloodWait",
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

export function SessionsScreen() {
  return (
    <div style={{ height: "100dvh", background: TG.bg, overflowY: "auto", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", WebkitOverflowScrolling: "touch" as any }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -160, left: -80, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle,rgba(45,232,151,0.14) 0%,transparent 72%)" }} />
        <div style={{ position: "absolute", bottom: 60, right: -100, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(107,168,229,0.12) 0%,transparent 72%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "52px 14px 120px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em" }}>Аккаунты</div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>Сессии · Прокси · Лимиты</div>
          </div>
          <div style={{ ...glass, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", borderRadius: 14 }}>
            <span style={{ fontSize: 14, color: TG.pink }}>+</span>
            <span style={{ fontSize: 12, color: TG.pink, fontWeight: 700 }}>Добавить</span>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
          {[
            { label: "Всего", value: "5", color: TG.text },
            { label: "Активных", value: "3", color: TG.green },
            { label: "Авт-х", value: "4", color: TG.blue },
            { label: "Сегодня", value: "1 459", color: TG.yellow },
          ].map(s => (
            <div key={s.label} style={{ ...glass, padding: "10px 6px", textAlign: "center", borderRadius: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, color: TG.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Account cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map(acc => {
            const pct = acc.sentToday > 0 ? Math.min(100, Math.round(acc.sentToday / acc.limit * 100)) : 0;
            const color = statusColor[acc.status] ?? TG.muted;
            return (
              <div key={acc.id} style={{ ...glass, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
                      <span style={{ fontSize: 16 }}>👤</span>
                      <div style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: acc.authorized ? TG.green : "#ff6b7a", border: "1.5px solid #07090f" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>{acc.phone}</div>
                      <div style={{ fontSize: 10, color: TG.muted, marginTop: 1 }}>{acc.label}</div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ padding: "4px 10px", borderRadius: 10, background: `${color}15`, border: `1px solid ${color}40`, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color, fontWeight: 700 }}>{statusLabel[acc.status]}</span>
                  </div>
                </div>

                {/* Session info */}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10 }}>💾</span>
                      <span style={{ fontSize: 10, color: acc.session ? TG.green : TG.red, fontWeight: 600, fontFamily: "monospace" }}>
                        {acc.session ?? "нет сессии"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10 }}>🔑</span>
                      <span style={{ fontSize: 10, color: TG.muted, fontFamily: "monospace" }}>API {acc.api_id}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {acc.proxyCount > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, background: "rgba(196,174,255,0.1)", border: `1px solid ${TG.purple}30` }}>
                        <span style={{ fontSize: 9 }}>🔒</span>
                        <span style={{ fontSize: 9, color: TG.purple, fontWeight: 600 }}>{acc.proxyCount} {acc.proxyCount === 1 ? "прокси" : "прокси"}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.2)" }}>
                        <span style={{ fontSize: 9, color: TG.red }}>нет прокси</span>
                      </div>
                    )}
                    {acc.workerLocked && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, background: "rgba(107,168,229,0.1)", border: `1px solid ${TG.blue}30` }}>
                        <span style={{ fontSize: 9 }}>⚙️</span>
                        <span style={{ fontSize: 9, color: TG.blue, fontWeight: 600 }}>Воркер #{acc.workerLocked}</span>
                      </div>
                    )}
                    <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: acc.sentToday > 0 ? TG.green : TG.muted }}>
                      {acc.sentToday.toLocaleString("ru")} / {acc.limit}
                    </div>
                  </div>

                  {acc.sentToday > 0 && <Bar pct={pct} color={pct > 90 ? TG.red : TG.green} />}

                  {!acc.authorized && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4, padding: "8px 0", background: "rgba(107,168,229,0.08)", borderRadius: 10, border: `1px solid ${TG.blue}20`, cursor: "pointer" }}>
                      <span style={{ fontSize: 11, color: TG.blue, fontWeight: 700 }}>🔐 Авторизоваться</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "6px 8px 28px", background: "rgba(7,9,15,0.92)", backdropFilter: "blur(24px)" }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 28, border: "1px solid rgba(255,255,255,0.12)", padding: "4px 2px" }}>
          {[{ icon: "⊞", label: "Главная" }, { icon: "📡", label: "Рассылки" }, { icon: "🔊", label: "Группы" }, { icon: "📊", label: "Аналитика" }, { icon: "👥", label: "Аудитория" }, { icon: "📁", label: "Файлы" }, { icon: "⚙️", label: "Воркеры" }].map(n => (
            <div key={n.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 1px" }}>
              <span style={{ fontSize: 13 }}>{n.icon}</span>
              <span style={{ fontSize: 7, color: TG.muted, fontWeight: 400, letterSpacing: "0.04em", textTransform: "uppercase" }}>{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
