import { useState } from "react";
import { TrendingUp, Users2, Zap, BarChart2 } from "lucide-react";

const TG = {
  bg: "#07090f",
  lgSurface: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
  lgPrism: "linear-gradient(135deg, rgba(120,180,255,0.07) 0%, rgba(255,120,200,0.05) 35%, rgba(120,255,170,0.04) 65%, rgba(180,120,255,0.07) 100%)",
  glassBorderStrong: "rgba(255,255,255,0.22)",
  text: "#eef2ff",
  textSecondary: "rgba(220,232,255,0.68)",
  muted: "rgba(160,190,230,0.50)",
  green: "#2de897", greenGlow: "rgba(45,232,151,0.38)",
  orange: "#ff9f40", orangeGlow: "rgba(255,159,64,0.38)",
  blue: "#6ba8e5", blueGlow: "rgba(107,168,229,0.45)",
  purple: "#c4aeff", purpleGlow: "rgba(196,174,255,0.38)",
  yellow: "#ffc946",
};
const BLUR = "blur(32px) saturate(160%)";

function GlassCard({ children, style = {}, glow }: { children: React.ReactNode; style?: React.CSSProperties; glow?: string }) {
  return (
    <div style={{ background: TG.lgSurface, backdropFilter: BLUR, WebkitBackdropFilter: BLUR, border: `1px solid ${TG.glassBorderStrong}`, borderRadius: 20, position: "relative", overflow: "hidden", boxShadow: glow ? `0 8px 32px rgba(0,0,0,0.38),0 4px 24px ${glow}` : "0 8px 32px rgba(0,0,0,0.38)", ...style }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.55) 35%,rgba(255,255,255,0.70) 50%,rgba(255,255,255,0.55) 65%,transparent 95%)", pointerEvents:"none", zIndex:3 }} />
      <div style={{ position:"absolute", inset:0, borderRadius:"inherit", background: TG.lgPrism, pointerEvents:"none", zIndex:1 }} />
      <div style={{ position:"relative", zIndex:2 }}>{children}</div>
    </div>
  );
}

const WEEK = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const AREA_DATA = [18, 32, 27, 45, 38, 62, 55, 78, 70, 84, 74, 90, 82, 98];
const BAR_DATA = [42, 68, 55, 87, 73, 95, 84];
const DONUT = [
  { label:"АИ-92",  value:38, color:TG.blue },
  { label:"АИ-95",  value:31, color:TG.green },
  { label:"АИ-98",  value:18, color:TG.purple },
  { label:"Дизель", value:13, color:TG.orange },
];

function AreaSVG({ data, color }: { data: number[]; color: string }) {
  const w = 300, h = 80;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pad = 4;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * (w - pad * 2) + pad},${h - pad - ((v - min) / range) * (h - pad * 2 - 4)}`);
  const path = pts.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(" ");
  const area = `${path} L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  const id = `ag-${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last dot */}
      <circle cx={pts[pts.length-1].split(",")[0]} cy={pts[pts.length-1].split(",")[1]} r="4" fill={color} style={{ filter:`drop-shadow(0 0 6px ${color})` }} />
    </svg>
  );
}

function DonutSVG() {
  const r = 48, cx = 64, cy = 64, strokeW = 16;
  const total = DONUT.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  const circ = 2 * Math.PI * r;
  const slices = DONUT.map(d => {
    const dash = (d.value / total) * circ - 2;
    const gap = circ - dash;
    const slice = { ...d, dash, gap, offset };
    offset += (d.value / total) * circ;
    return slice;
  });
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      {slices.map(s => (
        <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={strokeW}
          strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset + circ / 4}
          style={{ filter:`drop-shadow(0 0 5px ${s.color}60)` }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={TG.text}>38%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={TG.muted}>конверсия</text>
    </svg>
  );
}

function BarSVG({ data, color }: { data: number[]; color: string }) {
  const w = 280, h = 60;
  const max = Math.max(...data) || 1;
  const bw = 28, gap = (w - bw * data.length) / (data.length - 1);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const barH = Math.max(4, (v / max) * (h - 4));
        const x = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - barH} width={bw} height={barH} rx={6} fill="url(#bg2)" style={{ filter:`drop-shadow(0 2px 6px ${color}40)` }} />
            <text x={x + bw / 2} y={h - barH - 4} textAnchor="middle" fontSize="8" fill={TG.muted}>{WEEK[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

const PERIODS = ["День","Неделя","Месяц"];

export function PerfectAnalytics() {
  const [period, setPeriod] = useState("Неделя");
  const kpis = [
    { label:"Отправлено", value:"9.8K", delta:"+14%", color:TG.blue, glow:TG.blueGlow, icon:Users2 },
    { label:"Открыли", value:"6.2K", delta:"63%", color:TG.green, glow:TG.greenGlow, icon:Zap },
    { label:"Конверсия", value:"34%", delta:"↑8%", color:TG.purple, glow:TG.purpleGlow, icon:TrendingUp },
    { label:"Выручка", value:"₽247K", delta:"+22%", color:TG.orange, glow:TG.orangeGlow, icon:BarChart2 },
  ];

  return (
    <div style={{ width:"100%", height:"100%", background:TG.bg, overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", position:"relative" }}>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(0,0);}  50%{transform:translate(10px,-14px);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}  to{opacity:1;transform:translateY(0);} }
        .pfa-page { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"5%", right:"-10%", width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,201,70,0.13) 0%, transparent 70%)", filter:"blur(44px)", animation:"floatA 11s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"15%", left:"-8%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(196,174,255,0.12) 0%, transparent 70%)", filter:"blur(38px)", animation:"floatA 14s ease-in-out infinite reverse" }} />
      </div>

      <div className="pfa-page" style={{ position:"relative", zIndex:5, height:"100%", overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:12, padding:"16px 14px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:17, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Аналитика</div>
          {/* Period selector */}
          <GlassCard style={{ padding:"3px", borderRadius:14 }}>
            <div style={{ display:"flex" }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding:"5px 10px", border:"none", cursor:"pointer", borderRadius:11,
                  background: period === p ? "linear-gradient(145deg,rgba(107,168,229,0.25) 0%,rgba(107,168,229,0.10) 100%)" : "none",
                  color: period === p ? TG.blue : TG.muted, fontSize:10, fontWeight: period === p ? 800 : 500,
                }}>
                  {p}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* KPIs 2×2 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <GlassCard key={k.label} glow={`${k.glow}28`} style={{ padding:"12px 12px 10px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:`${k.color}18`, border:`1px solid ${k.color}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon size={12} color={k.color} />
                  </div>
                  <span style={{ fontSize:9, fontWeight:700, color:k.color, background:`${k.color}18`, border:`1px solid ${k.color}30`, borderRadius:20, padding:"2px 6px" }}>{k.delta}</span>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:TG.text, letterSpacing:"-0.03em", lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:9, color:TG.muted, marginTop:3 }}>{k.label}</div>
              </GlassCard>
            );
          })}
        </div>

        {/* Area chart — sends trend */}
        <GlassCard style={{ padding:"14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:TG.text }}>Тренд отправок</div>
            <span style={{ fontSize:10, color:TG.blue, fontWeight:600 }}>+14% к пред.</span>
          </div>
          <AreaSVG data={AREA_DATA} color={TG.blue} />
        </GlassCard>

        {/* Donut + legend */}
        <GlassCard style={{ padding:"14px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:TG.text, marginBottom:10 }}>Топливный микс</div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <DonutSVG />
            <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
              {DONUT.map(d => (
                <div key={d.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:d.color, boxShadow:`0 0 6px ${d.color}80`, flexShrink:0 }} />
                  <span style={{ fontSize:10, color:TG.textSecondary, flex:1 }}>{d.label}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:d.color }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Bar chart — daily discounts */}
        <GlassCard style={{ padding:"14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:TG.text }}>Скидки по дням</div>
            <span style={{ fontSize:10, color:TG.orange, fontWeight:600 }}>₽847K итого</span>
          </div>
          <BarSVG data={BAR_DATA} color={TG.orange} />
        </GlassCard>
      </div>
    </div>
  );
}
