import { useState } from "react";

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

const campaigns = [
  {
    id: 1, name: "Акция лето 2024", status: "running",
    groups: 47, sent: 12840, failed: 23, interval: 3600,
    nextSend: "14м 32с", lastSend: "2ч назад",
    accounts: ["+7 903 *** 4421", "+7 916 *** 7755"],
    spintax: true,
  },
  {
    id: 2, name: "Скидка 10% на ДТ", status: "running",
    groups: 31, sent: 8410, failed: 7, interval: 7200,
    nextSend: "1ч 02м", lastSend: "6ч назад",
    accounts: ["+7 926 *** 1122"],
    spintax: true,
  },
  {
    id: 3, name: "Ноябрьская акция", status: "paused",
    groups: 52, sent: 4200, failed: 15, interval: 86400,
    nextSend: "—", lastSend: "2д назад",
    accounts: [],
    spintax: false,
  },
  {
    id: 4, name: "Утренняя скидка (АИ-95)", status: "draft",
    groups: 0, sent: 0, failed: 0, interval: 1800,
    nextSend: "—", lastSend: "—",
    accounts: [],
    spintax: false,
  },
];

const totalGroups = 130;
const totalSent = 25450;

const statusBadge: Record<string, { color: string; label: string; icon: string }> = {
  running:   { color: "#2de897", label: "Запущена", icon: "●" },
  paused:    { color: "#ffc946", label: "Пауза",    icon: "⏸" },
  draft:     { color: "#7c8db0", label: "Черновик", icon: "○" },
  cancelled: { color: "#ff6b7a", label: "Остановлена", icon: "✕" },
};

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  );
}

export function GroupsScreen() {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <div style={{ height: "100dvh", background: TG.bg, overflowY: "auto", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", WebkitOverflowScrolling: "touch" as any }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -140, right: -60, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,174,255,0.2) 0%,transparent 72%)" }} />
        <div style={{ position: "absolute", bottom: 80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(45,232,151,0.1) 0%,transparent 72%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "52px 14px 120px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em" }}>Группы</div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>Рассылка по Telegram-группам</div>
          </div>
          <div style={{ ...glass, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", borderRadius: 14, border: `1px solid ${TG.purple}40` }}>
            <span style={{ fontSize: 14, color: TG.purple }}>+</span>
            <span style={{ fontSize: 12, color: TG.purple, fontWeight: 700 }}>Новая</span>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
          {[
            { label: "Кампаний", value: String(campaigns.length), color: TG.text },
            { label: "Активных", value: "2", color: TG.green },
            { label: "Групп", value: totalGroups.toLocaleString("ru"), color: TG.purple },
            { label: "Отправлено", value: (totalSent / 1000).toFixed(1) + "k", color: TG.blue },
          ].map(s => (
            <div key={s.label} style={{ ...glass, padding: "10px 6px", textAlign: "center", borderRadius: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, color: TG.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Campaign cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.map(c => {
            const badge = statusBadge[c.status];
            const isOpen = expanded === c.id;
            const successPct = c.sent > 0 ? Math.round((c.sent / (c.sent + c.failed)) * 100) : 0;
            return (
              <div key={c.id} style={{ ...glass, padding: "14px 16px", transition: "all 0.3s" }}>
                {/* Card top */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: badge.color }}>{badge.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TG.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.name}</span>
                      {c.spintax && (
                        <div style={{ padding: "2px 6px", borderRadius: 6, background: "rgba(255,201,70,0.12)", border: `1px solid ${TG.yellow}30`, flexShrink: 0 }}>
                          <span style={{ fontSize: 8, color: TG.yellow, fontWeight: 700 }}>СПИНТАКС</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: TG.muted }}>📢 {c.groups} групп</span>
                      <span style={{ fontSize: 10, color: TG.green }}>✓ {c.sent.toLocaleString("ru")}</span>
                      {c.failed > 0 && <span style={{ fontSize: 10, color: TG.red }}>✕ {c.failed}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ padding: "4px 10px", borderRadius: 10, background: `${badge.color}15`, border: `1px solid ${badge.color}40`, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: badge.color, fontWeight: 700 }}>{badge.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: TG.muted }}>{isOpen ? "▲" : "▼"}</div>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && c.status !== "draft" && (
                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Next send */}
                    {c.status === "running" && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 11 }}>⏱</span>
                          <span style={{ fontSize: 11, color: TG.muted }}>Следующая через</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: TG.yellow }}>{c.nextSend}</span>
                      </div>
                    )}

                    {/* Interval */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: TG.muted }}>🔄 Интервал</span>
                      <span style={{ fontSize: 11, color: TG.textSecondary, fontWeight: 600 }}>
                        {c.interval < 3600 ? `${c.interval / 60} мин` : c.interval < 86400 ? `${c.interval / 3600} ч` : `${c.interval / 86400} д`}
                      </span>
                    </div>

                    {/* Success rate */}
                    {c.sent > 0 && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: TG.muted }}>Успешность</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: successPct > 95 ? TG.green : TG.yellow }}>{successPct}%</span>
                        </div>
                        <MiniBar pct={successPct} color={successPct > 95 ? TG.green : TG.yellow} />
                      </div>
                    )}

                    {/* Accounts */}
                    {c.accounts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: TG.muted, marginBottom: 5 }}>Аккаунты-отправители:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {c.accounts.map(a => (
                            <div key={a} style={{ padding: "3px 9px", borderRadius: 8, background: "rgba(107,168,229,0.1)", border: `1px solid ${TG.blue}30` }}>
                              <span style={{ fontSize: 10, color: TG.blue }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button style={{ flex: 1, padding: "9px 0", borderRadius: 12, background: c.status === "running" ? "rgba(255,201,70,0.12)" : "rgba(45,232,151,0.12)", border: `1px solid ${c.status === "running" ? TG.yellow : TG.green}40`, cursor: "pointer", fontSize: 11, fontWeight: 700, color: c.status === "running" ? TG.yellow : TG.green }}>
                        {c.status === "running" ? "⏸ Пауза" : "▶ Запустить"}
                      </button>
                      <button style={{ flex: 1, padding: "9px 0", borderRadius: 12, background: "rgba(107,168,229,0.1)", border: `1px solid ${TG.blue}30`, cursor: "pointer", fontSize: 11, fontWeight: 700, color: TG.blue }}>
                        ✏️ Изменить
                      </button>
                      <button style={{ padding: "9px 12px", borderRadius: 12, background: "rgba(255,107,122,0.1)", border: "1px solid rgba(255,107,122,0.3)", cursor: "pointer", fontSize: 11, color: TG.red }}>
                        🗑
                      </button>
                    </div>
                  </div>
                )}

                {/* Draft CTA */}
                {c.status === "draft" && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", background: "rgba(196,174,255,0.06)", borderRadius: 12, border: `1px solid ${TG.purple}20`, cursor: "pointer" }}>
                    <span style={{ fontSize: 12, color: TG.purple, fontWeight: 700 }}>✏️ Настроить кампанию</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "6px 8px 28px", background: "rgba(7,9,15,0.92)", backdropFilter: "blur(24px)" }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 28, border: "1px solid rgba(255,255,255,0.12)", padding: "4px 2px" }}>
          {[{ icon: "⊞", label: "Главная" }, { icon: "📡", label: "Рассылки" }, { icon: "🔊", label: "Группы", active: true }, { icon: "📊", label: "Аналитика" }, { icon: "👥", label: "Аудитория" }, { icon: "📁", label: "Файлы" }, { icon: "⚙️", label: "Воркеры" }].map(n => (
            <div key={n.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 1px", position: "relative" }}>
              {n.active && <div style={{ position: "absolute", inset: "2px", borderRadius: 18, background: "rgba(196,174,255,0.18)", border: "1px solid rgba(196,174,255,0.3)" }} />}
              <span style={{ fontSize: 13, position: "relative" }}>{n.icon}</span>
              <span style={{ fontSize: 7, color: n.active ? TG.purple : TG.muted, fontWeight: n.active ? 800 : 400, letterSpacing: "0.04em", textTransform: "uppercase", position: "relative" }}>{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
