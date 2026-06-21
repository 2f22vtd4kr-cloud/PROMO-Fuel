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

const sc = (s: string) => ({
  idle: TG.green, working: TG.blue, sending: TG.blue,
  broadcasting: TG.blue, stopped: TG.muted, dead: TG.red,
  pending: TG.yellow, claimed: TG.blue, done: TG.green, failed: TG.red,
}[s] ?? TG.muted);

const workers = [
  { id: 1, status: "broadcasting", pid: 28341, uptime: "2ч 14м", task: "Акция лето 2024", account: "+7 903 *** 4421", sent: 847 },
  { id: 2, status: "broadcasting", pid: 28342, uptime: "2ч 14м", task: "Скидка 10%", account: "+7 916 *** 7755", sent: 612 },
  { id: 3, status: "idle", pid: 28343, uptime: "2ч 14м", task: null, account: "+7 926 *** 1122", sent: 0 },
  { id: 4, status: "dead", pid: null, uptime: null, task: null, account: null, sent: 0 },
];

const tasks = [
  { id: 1, type: "group_broadcast", campaign: "Акция лето 2024", status: "claimed", worker: 1, attempts: 1 },
  { id: 2, type: "group_broadcast", campaign: "Скидка 10%", status: "claimed", worker: 2, attempts: 1 },
  { id: 3, type: "group_broadcast", campaign: "Ноябрьская акция", status: "pending", worker: null, attempts: 0 },
  { id: 4, type: "group_broadcast", campaign: "Утренняя скидка", status: "pending", worker: null, attempts: 0 },
];

const summary = { total: 4, running: 2, idle: 1, dead: 1, queued: 2, claimed: 2 };

export function WorkersScreen() {
  const [activeTab, setActiveTab] = useState<"workers" | "tasks">("workers");

  return (
    <div style={{ height: "100dvh", background: TG.bg, overflowY: "auto", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", WebkitOverflowScrolling: "touch" as any }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -160, left: -80, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle,rgba(80,140,220,0.22) 0%,transparent 72%)" }} />
        <div style={{ position: "absolute", bottom: 40, right: -120, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,174,255,0.14) 0%,transparent 72%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "52px 14px 120px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em" }}>Воркеры</div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>Управление потоками рассылок</div>
          </div>
          <div style={{ ...glass, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: TG.green, boxShadow: `0 0 8px ${TG.green}` }} />
            <span style={{ fontSize: 11, color: TG.green, fontWeight: 700 }}>2 активных</span>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 5, marginBottom: 16 }}>
          {[
            { label: "Всего", value: summary.total, color: TG.text },
            { label: "Работают", value: summary.running, color: TG.blue },
            { label: "Ожидают", value: summary.idle, color: TG.green },
            { label: "Мёртвые", value: summary.dead, color: TG.red },
            { label: "В очереди", value: summary.queued, color: TG.yellow },
            { label: "Claimed", value: summary.claimed, color: TG.purple },
          ].map(s => (
            <div key={s.label} style={{ ...glass, padding: "8px 4px", textAlign: "center", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 7, color: TG.muted, marginTop: 2, letterSpacing: "0.02em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["workers", "tasks"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, padding: "9px 0", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: activeTab === t ? "rgba(107,168,229,0.18)" : "rgba(255,255,255,0.04)",
              color: activeTab === t ? TG.blue : TG.muted,
              boxShadow: activeTab === t ? `0 0 0 1px ${TG.blue}40` : "none",
            }}>
              {t === "workers" ? "Воркеры" : "Задачи"}
            </button>
          ))}
        </div>

        {activeTab === "workers" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {workers.map(w => (
              <div key={w.id} style={{ ...glass, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: w.task ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${sc(w.status)}18`, border: `1.5px solid ${sc(w.status)}40`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span style={{ fontSize: 13 }}>{w.status === "dead" ? "💀" : w.status === "idle" ? "🟢" : "📡"}</span>
                      {w.status === "broadcasting" && (
                        <div style={{ position: "absolute", inset: -3, borderRadius: 13, border: `1.5px solid ${TG.blue}40`, animation: "pulse 2s infinite" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>Воркер #{w.id}</div>
                      <div style={{ fontSize: 10, color: sc(w.status), fontWeight: 600, marginTop: 1 }}>
                        {w.status === "broadcasting" ? "● РАССЫЛКА" : w.status === "idle" ? "● ОЖИДАНИЕ" : "✕ МЁРТВЫЙ"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {w.pid ? (
                      <>
                        <div style={{ fontSize: 10, color: TG.muted }}>PID {w.pid}</div>
                        <div style={{ fontSize: 10, color: TG.textSecondary, marginTop: 2 }}>⏱ {w.uptime}</div>
                      </>
                    ) : (
                      <div style={{ ...glass, padding: "5px 10px", borderRadius: 10, fontSize: 10, color: TG.red, fontWeight: 700, border: `1px solid ${TG.red}40`, cursor: "pointer" }}>
                        ↻ Restart
                      </div>
                    )}
                  </div>
                </div>

                {w.task && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 11, color: TG.textSecondary, fontWeight: 600 }}>📋 {w.task}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: TG.green }}>{w.sent.toLocaleString("ru")} отпр.</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(45,232,151,0.12)", border: `1px solid ${TG.green}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 8 }}>📱</span>
                      </div>
                      <span style={{ fontSize: 10, color: TG.muted }}>{w.account}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(w.sent / 1000) * 100}%`, background: `linear-gradient(90deg,${TG.green},${TG.blue})`, borderRadius: 3 }} />
                    </div>
                  </div>
                )}

                {w.status === "dead" && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,107,122,0.08)", borderRadius: 10, border: `1px solid ${TG.red}20` }}>
                    <div style={{ fontSize: 10, color: TG.red, fontWeight: 600 }}>Воркер не отвечает · последний heartbeat 8м назад</div>
                    <div style={{ fontSize: 9, color: TG.muted, marginTop: 4, fontFamily: "monospace" }}>python3 worker.py --id 4</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ ...glass, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TG.text }}>{t.campaign}</div>
                    <div style={{ fontSize: 10, color: TG.muted, marginTop: 3 }}>group_broadcast · #{t.id} · попытка {t.attempts}</div>
                  </div>
                  <div style={{ padding: "4px 10px", borderRadius: 8, background: `${sc(t.status)}18`, border: `1px solid ${sc(t.status)}40` }}>
                    <span style={{ fontSize: 10, color: sc(t.status), fontWeight: 700 }}>
                      {t.status === "claimed" ? `Воркер #${t.worker}` : "ОЧЕРЕДЬ"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "6px 8px 28px", background: "rgba(7,9,15,0.92)", backdropFilter: "blur(24px)" }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 28, border: "1px solid rgba(255,255,255,0.12)", padding: "4px 2px" }}>
          {[{ icon: "⊞", label: "Главная" }, { icon: "📡", label: "Рассылки" }, { icon: "🔊", label: "Группы" }, { icon: "📊", label: "Аналитика" }, { icon: "👥", label: "Аудитория" }, { icon: "📁", label: "Файлы" }, { icon: "⚙️", label: "Воркеры", active: true }].map(n => (
            <div key={n.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 1px", position: "relative" }}>
              {n.active && <div style={{ position: "absolute", inset: "2px", borderRadius: 18, background: "rgba(107,168,229,0.18)", border: "1px solid rgba(107,168,229,0.3)" }} />}
              <span style={{ fontSize: 13, position: "relative" }}>{n.icon}</span>
              <span style={{ fontSize: 7, color: n.active ? TG.blue : TG.muted, fontWeight: n.active ? 800 : 400, letterSpacing: "0.04em", textTransform: "uppercase", position: "relative" }}>{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
