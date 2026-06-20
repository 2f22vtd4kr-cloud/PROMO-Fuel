import React, { useState, useEffect } from "react";
import { TrendingUp, Users2, Target, Zap, ArrowUpRight, ArrowDownRight, Trophy } from "lucide-react";

export function AnalyticsV2() {
  const [activeTab, setActiveTab] = useState(1);

  // Colors
  const bg = "#060810";
  const green = "#2de897";
  const blue = "#6ba8e5";
  const yellow = "#ffc946";
  const red = "#ff6b7a";
  const textMain = "#ffffff";
  const textMuted = "rgba(255,255,255,0.5)";

  const glassStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    borderRadius: 16,
  };

  const MOCK_TREND = [
    { d: "Пн", sent: 820 }, { d: "Вт", sent: 1140 },
    { d: "Ср", sent: 960 }, { d: "Чт", sent: 1380 },
    { d: "Пт", sent: 1620 }, { d: "Сб", sent: 2100 },
    { d: "Вс", sent: 1840 },
  ];

  const DELIVERY_BREAKDOWN = [
    { name: "Доставлено", value: 85, color: green },
    { name: "Ошибки", value: 10, color: red },
    { name: "Заблокированы", value: 5, color: yellow },
  ];

  const TOP_CAMPAIGNS = [
    { id: 1, name: "Акция: 95 G-Drive", sent: 12500, pct: 100 },
    { id: 2, name: "Утренний кофе", sent: 8200, pct: 65 },
    { id: 3, name: "Скидка на дизель", sent: 5400, pct: 43 },
  ];

  function BarChart() {
    const maxVal = Math.max(...MOCK_TREND.map(d => d.sent));
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, paddingTop: 10 }}>
        {MOCK_TREND.map((d, i) => {
          const pct = (d.sent / maxVal) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
              <div style={{
                width: 8,
                height: `${pct}%`,
                minHeight: 4,
                borderRadius: "4px 4px 0 0",
                background: `linear-gradient(180deg, ${green}, ${blue}88)`,
                boxShadow: `0 0 8px ${green}40`
              }} />
              <span style={{ fontSize: 9, color: textMuted, fontFamily: "'Manrope', sans-serif" }}>{d.d}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function DonutChartSVG() {
    const total = DELIVERY_BREAKDOWN.reduce((a, d) => a + d.value, 0);
    let cumulative = 0;
    const segments = DELIVERY_BREAKDOWN.map(d => {
      const start = (cumulative / total) * 360;
      cumulative += d.value;
      const end = (cumulative / total) * 360;
      return { ...d, start, end };
    });

    function polarToXY(deg: number, r: number) {
      const rad = ((deg - 90) * Math.PI) / 180;
      return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
    }
    function arcPath(start: number, end: number, outerR: number, innerR: number) {
      if (end - start >= 360) end = 359.99;
      const p1 = polarToXY(start, outerR), p2 = polarToXY(end, outerR);
      const p3 = polarToXY(end, innerR), p4 = polarToXY(start, innerR);
      const large = end - start > 180 ? 1 : 0;
      return `M${p1.x},${p1.y} A${outerR},${outerR} 0 ${large} 1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${innerR},${innerR} 0 ${large} 0 ${p4.x},${p4.y} Z`;
    }

    return (
      <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, flexShrink: 0 }}>
        {segments.map(s => (
          <path key={s.name} d={arcPath(s.start, s.end, 46, 32)} fill={s.color} />
        ))}
      </svg>
    );
  }

  return (
    <div style={{
      width: 390,
      height: 760,
      background: bg,
      fontFamily: "'Manrope', sans-serif",
      color: textMain,
      overflowY: "auto",
      position: "relative",
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-up {
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>Аналитика</h1>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ ...glassStyle, display: "flex", padding: 4, borderRadius: 12 }}>
          {["Сегодня", "7 дней", "30 дней"].map((tab, i) => (
            <div
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                cursor: "pointer",
                background: activeTab === i ? "rgba(255,255,255,0.1)" : "transparent",
                color: activeTab === i ? textMain : textMuted,
                transition: "all 0.2s ease"
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* 1 */}
          <div style={{ ...glassStyle, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }} className="animate-up" style={{ animationDelay: "0ms", ...glassStyle, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${blue}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={14} color={blue} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, color: green }}>
                <ArrowUpRight size={12} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>12%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>14.2K</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>Всего отправлено</div>
            </div>
          </div>
          
          {/* 2 */}
          <div className="animate-up" style={{ animationDelay: "50ms", ...glassStyle, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${green}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users2 size={14} color={green} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, color: green }}>
                <ArrowUpRight size={12} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>8%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>9.8K</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>Уникальный охват</div>
            </div>
          </div>

          {/* 3 */}
          <div className="animate-up" style={{ animationDelay: "100ms", ...glassStyle, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${yellow}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={14} color={yellow} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, color: red }}>
                <ArrowDownRight size={12} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>2%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>34.5%</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>Open rate</div>
            </div>
          </div>

          {/* 4 */}
          <div className="animate-up" style={{ animationDelay: "150ms", ...glassStyle, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${red}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={14} color={red} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, color: green }}>
                <ArrowUpRight size={12} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>5%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>12.4%</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>Конверсия</div>
            </div>
          </div>
        </div>

        {/* Bar Chart Card */}
        <div className="animate-up" style={{ animationDelay: "200ms", ...glassStyle, padding: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Отправки (7 дней)</div>
          <BarChart />
        </div>

        {/* Donut Chart */}
        <div className="animate-up" style={{ animationDelay: "250ms", ...glassStyle, padding: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Доставляемость</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <DonutChartSVG />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {DELIVERY_BREAKDOWN.map(d => (
                <div key={d.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 11, color: textMuted }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="animate-up" style={{ animationDelay: "300ms", ...glassStyle, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Trophy size={16} color={yellow} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Топ кампании</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TOP_CAMPAIGNS.map((c, i) => (
              <div key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: textMuted, fontWeight: 700 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: green }}>{c.sent.toLocaleString("ru")} <span style={{fontSize:10, color: textMuted, fontWeight: 400}}>отпр.</span></span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ height: "100%", width: `${c.pct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${green}, ${blue})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
