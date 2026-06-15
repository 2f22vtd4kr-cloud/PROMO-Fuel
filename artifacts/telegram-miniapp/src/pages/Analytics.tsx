import { useState, useEffect } from "react";
import { TrendingUp, Users2, Target, Zap, ArrowUpRight } from "lucide-react";
import { api, AnalyticsOverview } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

interface TrendPoint { d: string; sent: number; conv: number }

const MOCK_TREND: TrendPoint[] = [
  { d:"Пн",sent:820,conv:280 },{ d:"Вт",sent:1140,conv:410 },
  { d:"Ср",sent:960,conv:340 },{ d:"Чт",sent:1380,conv:520 },
  { d:"Пт",sent:1620,conv:590 },{ d:"Сб",sent:2100,conv:810 },
  { d:"Вс",sent:1840,conv:730 },
];

const FUEL_MIX = [
  { name:"АИ-92",value:38,color:"#6ba8e5" },
  { name:"АИ-95",value:29,color:"#2de897" },
  { name:"АИ-98",value:17,color:"#c4aeff" },
  { name:"Дизель",value:16,color:"#ff9f40" },
];

function MiniAreaChart({ data, color1, color2 }: { data: TrendPoint[]; color1: string; color2: string }) {
  const maxSent = Math.max(...data.map(d => d.sent));
  const maxConv = Math.max(...data.map(d => d.conv));
  const W = 280; const H = 80; const PAD = 4;
  const xStep = (W - PAD*2) / (data.length - 1);

  function makePath(values: number[], max: number) {
    return values.map((v, i) => {
      const x = PAD + i * xStep;
      const y = H - PAD - ((v / max) * (H - PAD*2));
      return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  function makeAreaPath(values: number[], max: number) {
    const pts = values.map((v, i) => ({
      x: PAD + i * xStep,
      y: H - PAD - ((v / max) * (H - PAD*2)),
    }));
    const line = pts.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    return `${line} L${pts[pts.length-1]!.x.toFixed(1)},${(H-PAD).toFixed(1)} L${PAD},${(H-PAD).toFixed(1)} Z`;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",height:80,overflow:"visible" }}>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color1} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color1} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color2} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color2} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={makeAreaPath(data.map(d=>d.sent), maxSent)} fill="url(#g1)" />
      <path d={makeAreaPath(data.map(d=>d.conv), maxConv)} fill="url(#g2)" />
      <path d={makePath(data.map(d=>d.sent), maxSent)} fill="none" stroke={color1} strokeWidth={1.8} />
      <path d={makePath(data.map(d=>d.conv), maxConv)} fill="none" stroke={color2} strokeWidth={1.8} />
      {data.map((d, i) => (
        <text key={i} x={PAD + i * xStep} y={H+2} textAnchor="middle" fill="rgba(160,190,230,0.45)" fontSize={7}>{d.d}</text>
      ))}
    </svg>
  );
}

function MiniBarChart({ data, color }: { data: TrendPoint[]; color: string }) {
  const maxVal = Math.max(...data.map(d => d.sent));
  return (
    <div style={{ display:"flex",alignItems:"flex-end",gap:4,height:64,paddingBottom:16 }}>
      {data.map((d, i) => {
        const pct = (d.sent / maxVal) * 100;
        return (
          <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
            <div style={{ width:"100%",height:`${pct}%`,minHeight:3,borderRadius:"3px 3px 0 0",background:`linear-gradient(180deg,${color},${color}66)`,boxShadow:`0 0 8px ${color}50` }} />
            <span style={{ fontSize:7,color:"rgba(160,190,230,0.45)",whiteSpace:"nowrap" }}>{d.d}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: typeof FUEL_MIX }) {
  const total = data.reduce((a,d) => a+d.value, 0);
  let cumulative = 0;
  const segments = data.map(d => {
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
    <div style={{ display:"flex",alignItems:"center",gap:16 }}>
      <svg viewBox="0 0 100 100" style={{ width:90,height:90,flexShrink:0 }}>
        {segments.map(s => (
          <path key={s.name} d={arcPath(s.start, s.end, 46, 28)} fill={s.color} />
        ))}
      </svg>
      <div style={{ flex:1,display:"flex",flexDirection:"column",gap:7 }}>
        {data.map(f => (
          <div key={f.name} style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:7 }}>
              <div style={{ width:8,height:8,borderRadius:2,background:f.color }} />
              <span style={{ fontSize:11,color:TG.textSecondary }}>{f.name}</span>
            </div>
            <span style={{ fontSize:11,fontWeight:700,color:f.color }}>{f.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend]       = useState<TrendPoint[]>(MOCK_TREND);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOverview(),
      fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/analytics/trend`).then(r => r.ok ? r.json() : MOCK_TREND).catch(() => MOCK_TREND),
    ]).then(([ov, tr]) => {
      setOverview(ov);
      if (Array.isArray(tr) && tr.length > 0) setTrend(tr);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label:"Охват",     value: loading?"—":`${((overview?.totalSent ?? 0) / 1000).toFixed(1)}K`, delta:"+14%",  color:"#6ba8e5",  icon:Users2 },
    { label:"Open Rate", value: loading?"—":`${(overview?.avgOpenRate ?? 0).toFixed(1)}%`,          delta:"+2.1%", color:TG.green,   icon:Target },
    { label:"Конверсия", value: loading?"—":`${(overview?.avgCtr ?? 0).toFixed(1)}%`,               delta:"+8.3%", color:TG.purple,  icon:TrendingUp },
    { label:"Кампании",  value: loading?"—":String(overview?.totalCampaigns ?? 0),                  delta:"всего", color:TG.yellow,  icon:Zap },
  ];

  return (
    <div className="tab-content" style={{ height:"100%",overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
      <div style={{ display:"flex",flexDirection:"column",gap:14,padding:"14px 14px 24px" }}>

        <div style={{ fontSize:18,fontWeight:800,color:TG.text,letterSpacing:"-0.02em" }}>Аналитика</div>

        {/* KPI 2×2 */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <GlassCard key={k.label} style={{ padding:"12px 14px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                  <div style={{ width:26,height:26,borderRadius:8,background:`${k.color}18`,border:`1px solid ${k.color}30`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Icon size={12} color={k.color} />
                  </div>
                  <ArrowUpRight size={11} color={k.color} style={{ opacity:0.6 }} />
                </div>
                <div style={{ display:"flex",alignItems:"baseline",gap:7 }}>
                  <span style={{ fontSize:20,fontWeight:800,color:TG.text }}>{k.value}</span>
                  <span style={{ fontSize:10,color:k.color,fontWeight:700 }}>{k.delta}</span>
                </div>
                <div style={{ fontSize:10,color:TG.muted,marginTop:2 }}>{k.label}</div>
              </GlassCard>
            );
          })}
        </div>

        {/* Trend chart */}
        <GlassCard style={{ padding:"14px 14px 10px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <div style={{ fontSize:12,fontWeight:700,color:TG.textSecondary }}>Рассылки vs Конверсии</div>
            <div style={{ display:"flex",gap:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:"#6ba8e5" }} />
                <span style={{ fontSize:9,color:TG.muted }}>Отпр.</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:TG.green }} />
                <span style={{ fontSize:9,color:TG.muted }}>Конв.</span>
              </div>
            </div>
          </div>
          <MiniAreaChart data={trend} color1="#6ba8e5" color2={TG.green} />
        </GlassCard>

        {/* Fuel mix pie */}
        <GlassCard style={{ padding:"14px" }}>
          <div style={{ fontSize:12,fontWeight:700,color:TG.textSecondary,marginBottom:12 }}>Топливный микс</div>
          <DonutChart data={FUEL_MIX} />
        </GlassCard>

        {/* Bar chart */}
        <GlassCard style={{ padding:"14px 14px 10px" }}>
          <div style={{ fontSize:12,fontWeight:700,color:TG.textSecondary,marginBottom:8 }}>Скидки по дням</div>
          <MiniBarChart data={trend} color="#ff9f40" />
        </GlassCard>

      </div>
    </div>
  );
}
