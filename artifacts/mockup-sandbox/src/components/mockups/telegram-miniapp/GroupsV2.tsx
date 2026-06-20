import React, { useState, useEffect } from "react";

export function GroupsV2() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const campaigns = [
    {
      id: 1,
      name: "Утренний оффер: ДТ ЕВРО-5",
      status: "running",
      next: "14:30",
      groups: 124,
      sent: 89,
      successRate: 98,
      color: "#2de897",
    },
    {
      id: 2,
      name: "Вечерний прайс: АИ-95",
      status: "paused",
      next: "Пауза",
      groups: 86,
      sent: 42,
      successRate: 95,
      color: "#ffc946",
    },
    {
      id: 3,
      name: "Спецпредложение для оптовиков",
      status: "draft",
      next: "—",
      groups: 45,
      sent: 0,
      successRate: 0,
      color: "#7c8db0",
    },
  ];

  return (
    <div
      style={{
        width: 390,
        height: 760,
        background: "#060810",
        fontFamily: "'Manrope', sans-serif",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
          
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulseLive {
            0% { box-shadow: 0 0 0 0 rgba(45, 232, 151, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(45, 232, 151, 0); }
            100% { box-shadow: 0 0 0 0 rgba(45, 232, 151, 0); }
          }

          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
          }

          ::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Header Summary */}
      <div style={{ padding: "24px 20px 16px", zIndex: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>Рассылки</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="glass-card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Статус</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#2de897" }}>1 <span style={{fontSize: 10, fontWeight: 600}}>актив</span></span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>/</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#ffc946" }}>1 <span style={{fontSize: 10, fontWeight: 600}}>пауза</span></span>
            </div>
          </div>
          <div className="glass-card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Охват / Отправлено</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>255</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>/</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#6ba8e5" }}>131</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 120 }}>
        {campaigns.map((camp, i) => (
          <div
            key={camp.id}
            className="glass-card"
            style={{
              position: "relative",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: \`\${i * 100}ms\`,
              overflow: "hidden",
            }}
          >
            {/* Left Border Accent */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: camp.color, borderRadius: "16px 0 0 16px" }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, paddingLeft: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    fontSize: 10, 
                    fontWeight: 800, 
                    color: camp.color, 
                    background: \`\${camp.color}15\`, 
                    padding: "4px 8px", 
                    borderRadius: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    {camp.status === "running" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: camp.color, animation: "pulseLive 2s infinite" }} />}
                    {camp.status === "running" ? "⚡ LIVE" : camp.status === "paused" ? "ПАУЗА" : "ЧЕРНОВИК"}
                  </span>
                  
                  {camp.status !== "draft" && (
                    <span style={{ fontSize: 10, color: "#060810", background: "#ffc946", padding: "4px 8px", borderRadius: 12, display: "flex", alignItems: "center", gap: 4, fontWeight: 800 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      Следующая: {camp.next}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{camp.name}</h3>
              </div>
            </div>

            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Групп: <strong style={{ color: "#fff" }}>{camp.groups}</strong></span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Отправлено: <strong style={{ color: "#fff" }}>{camp.sent}</strong></span>
              </div>
              
              {/* Success Rate Bar */}
              <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", display: "flex" }}>
                <div style={{ width: \`\${(camp.sent / Math.max(camp.groups, 1)) * 100}%\`, background: camp.color, borderRadius: 2 }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, paddingLeft: 8, marginTop: 4 }}>
              {camp.status === "running" ? (
                <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(255,201,70,0.1)", border: "1px solid rgba(255,201,70,0.2)", color: "#ffc946", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                  Пауза
                </button>
              ) : camp.status === "paused" ? (
                <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(45,232,151,0.1)", border: "1px solid rgba(45,232,151,0.2)", color: "#2de897", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Продолжить
                </button>
              ) : (
                <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(107,168,229,0.1)", border: "1px solid rgba(107,168,229,0.2)", color: "#6ba8e5", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                  Настроить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Floating Area */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, #060810 80%, transparent)", padding: "40px 20px 20px", display: "flex", flexDirection: "column", gap: 16, pointerEvents: "none" }}>
        
        {/* Workers Strip */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, pointerEvents: "auto" }}>
          <div className="glass-card" style={{ padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6, background: "rgba(6,8,16,0.8)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2de897", animation: "pulseLive 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>Воркер 1 (3)</span>
          </div>
          <div className="glass-card" style={{ padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6, background: "rgba(6,8,16,0.8)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b7a" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>Воркер 2 (off)</span>
          </div>
        </div>

        {/* FAB */}
        <button style={{ 
          background: "#2de897", 
          color: "#060810", 
          border: "none", 
          borderRadius: 16, 
          padding: "16px", 
          fontSize: 16, 
          fontWeight: 800, 
          pointerEvents: "auto",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(45, 232, 151, 0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          transition: "transform 0.2s"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Новая рассылка
        </button>
      </div>

    </div>
  );
}
