import { useState, useEffect } from "react";
import { TrendingUp, Users2, Target, Zap, ArrowUpRight, Trophy, RotateCcw } from "lucide-react";
import { api, AnalyticsOverview, DailyDigest } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

interface TopCampaign { id: number; name: string; status: string; sent: number; openRate: number; ctr: number }

interface TrendPoint { d: string; sent: number; conv: number }

interface SendRatePoint { hour: string; total: number; ok: number; errors: number }

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
            <div style={{ width:"100%",height:`${pct}%`,minHeight:3,borderRadius:"3px 3px 0 0",background:`linear-gradient(180deg,${color},${color}66)`,boxShadow:`0 0 8px ${color}50`,transformOrigin:"bottom",animation:`growBar 0.5s ease-out ${i*0.05}s both` }} />
            <span style={{ fontSize:7,color:"rgba(160,190,230,0.45)",whiteSpace:"nowrap" }}>{d.d}</span>
          </div>
        );
      })}
    </div>
  );
}

function HourlySendRateChart({ data }: { data: SendRatePoint[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const currentHour = new Date().getHours();
  const bestHour = data.reduce((best, d, i) => d.total > (data[best]?.total ?? 0) ? i : best, 0);
  const totalToday = data.reduce((s, d) => s + d.total, 0);
  const totalErrors = data.reduce((s, d) => s + (d.errors ?? 0), 0);

  return (
    <div>
      {totalToday > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6ba8e5" }}>📊 Сегодня: {totalToday.toLocaleString("ru")}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#ffc946" }}>⭐ Пик: {String(bestHour).padStart(2, "0")}:00–{String(bestHour + 1).padStart(2, "0")}:00</span>
          {totalErrors > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a" }}>✗ Ошибок: {totalErrors}</span>}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
        {data.map((d, i) => {
          const pct = (d.total / maxTotal) * 100;
          const isNow = i === currentHour;
          const isBest = i === bestHour && d.total > 0;
          const hasErrors = d.errors > 0;
          const barColor = hasErrors
            ? `linear-gradient(180deg, rgba(255,107,107,0.9), rgba(255,107,107,0.5))`
            : isNow
              ? `linear-gradient(180deg, ${TG.green}, ${TG.green}88)`
              : isBest
                ? `linear-gradient(180deg, #ffc946, #ffc94688)`
                : `linear-gradient(180deg, rgba(107,168,229,0.85), rgba(107,168,229,0.35))`;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <div style={{
                width: "100%", minHeight: d.total > 0 ? 3 : 1, height: `${pct}%`,
                borderRadius: "2px 2px 0 0",
                background: barColor,
                boxShadow: isNow ? `0 0 8px ${TG.green}60` : isBest ? "0 0 8px rgba(255,201,70,0.6)" : undefined,
                opacity: d.total === 0 ? 0.2 : 1,
                transformOrigin: "bottom",
                animation: `growBar 0.4s ease-out ${i * 0.02}s both`
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        {[0, 4, 8, 12, 16, 20, 23].map(h => (
          <span key={h} style={{ fontSize: 7, color: h === currentHour ? TG.green : h === bestHour ? "#ffc946" : "rgba(160,190,230,0.45)" }}>{String(h).padStart(2, "0")}:00</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ba8e5" }} />
          <span style={{ fontSize: 9, color: TG.muted }}>Отправлено</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,107,107,0.9)" }} />
          <span style={{ fontSize: 9, color: TG.muted }}>Ошибки</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffc946" }} />
          <span style={{ fontSize: 9, color: TG.muted }}>Пиковый час</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: TG.green }} />
          <span style={{ fontSize: 9, color: TG.muted }}>Текущий час</span>
        </div>
      </div>
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
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview]   = useState<AnalyticsOverview | null>(null);
  const [digest, setDigest]       = useState<DailyDigest | null>(null);
  const [trend, setTrend]         = useState<TrendPoint[]>(MOCK_TREND);
  const [topCamps, setTopCamps]   = useState<TopCampaign[]>([]);
  const [sendRate, setSendRate]   = useState<SendRatePoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [groupSendsToday, setGroupSendsToday] = useState<{ ok: number; failed: number } | null>(null);

  function loadAll(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    Promise.all([
      api.getOverview(),
      api.getAnalyticsTrend()
        .then(rows => rows.map(r => ({ d: r.date, sent: r.sent, conv: r.opened })))
        .catch(() => MOCK_TREND),
      api.getAnalyticsTopCampaigns(5).catch(() => []),
      api.getAnalyticsSendRate().catch(() => []),
      api.getAccountSendsToday().catch(() => [] as { account_id: string; ok: number; failed: number }[]),
      api.getDailyDigest().catch(() => null),
    ]).then(([ov, tr, tc, sr, gs, dg]) => {
      setOverview(ov);
      if (dg) setDigest(dg as DailyDigest);
      if (Array.isArray(tr) && tr.length > 0) setTrend(tr);
      if (Array.isArray(tc)) setTopCamps(tc as TopCampaign[]);
      if (Array.isArray(sr) && sr.length > 0) setSendRate(sr as SendRatePoint[]);
      if (Array.isArray(gs) && gs.length > 0) {
        const tot = (gs as { account_id: string; ok: number; failed: number }[])
          .reduce((acc, r) => ({ ok: acc.ok + r.ok, failed: acc.failed + r.failed }), { ok: 0, failed: 0 });
        setGroupSendsToday(tot);
      }
    }).catch(() => {}).finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadAll(); }, []);

  const ov = overview;
  const kpis = [
    { label:"Охват",     value: loading?"—":`${((ov?.totalSent ?? 0) / 1000).toFixed(1)}K`,   delta: ov ? (ov.sentDelta >= 0 ? `+${ov.sentDelta}%` : `${ov.sentDelta}%`) : "—",  color:"#6ba8e5",  icon:Users2, progress: 78 },
    { label:"Open Rate", value: loading?"—":`${(ov?.avgOpenRate ?? 0).toFixed(1)}%`,           delta: ov ? (ov.openDelta >= 0 ? `+${ov.openDelta}%` : `${ov.openDelta}%`) : "—", color:TG.green,   icon:Target, progress: (ov?.avgOpenRate ?? 0) },
    { label:"CTR",       value: loading?"—":`${(ov?.avgCtr ?? 0).toFixed(1)}%`,                delta: ov ? (ov.ctrDelta >= 0  ? `+${ov.ctrDelta}%`  : `${ov.ctrDelta}%`)  : "—", color:TG.purple,  icon:TrendingUp, progress: Math.min(((ov?.avgCtr ?? 0) * 5), 100) },
    { label:"Кампании",  value: loading?"—":String(ov?.totalCampaigns ?? 0),                   delta:"всего",                                                                    color:TG.yellow,  icon:Zap, progress: 100 },
  ];

  return (
    <div className="tab-content" style={{ height:"100%",overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ display:"flex",flexDirection:"column",gap:14,padding:"14px 14px 24px" }}>

        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          margin: "-14px -14px 0 -14px", padding: "14px 14px 14px",
          background: "linear-gradient(to bottom, rgba(6,8,16,0.95) 40%, transparent)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize:18,fontWeight:800,color:TG.text,letterSpacing:"-0.02em" }}>Аналитика</span>
          <button
            onClick={() => { haptic.light(); loadAll(true); }}
            disabled={refreshing || loading}
            style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: refreshing ? 0.5 : 1 }}
          >
            <RotateCcw size={13} color="#6ba8e5" style={{ animation: refreshing ? "spin 0.8s linear infinite" : undefined }} />
          </button>
        </div>

        {/* KPI 2×2 */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
          {kpis.map((k, idx) => {
            const Icon = k.icon;
            return (
              <GlassCard key={k.label} style={{ padding:"12px 14px", animation: `slideUp 0.4s ease-out ${idx * 0.08}s both` }}>
                <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />
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
                <div style={{ marginTop: 8, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${k.progress}%`, background: k.color, borderRadius: 1.5, opacity: 0.8 }} />
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Week digest summary banner */}
        {digest && (
          <GlassCard style={{ padding: "12px 14px", animation: "slideUp 0.4s ease-out 0.32s both" }}>
            <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #6ba8e5, transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TG.muted }}>📊 Сводка за 7 дней</span>
              {digest.week_delta_pct !== 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px",
                  background: digest.week_delta_pct > 0 ? "rgba(45,232,151,0.12)" : "rgba(255,107,107,0.12)",
                  border: `1px solid ${digest.week_delta_pct > 0 ? "rgba(45,232,151,0.3)" : "rgba(255,107,107,0.3)"}`,
                  color: digest.week_delta_pct > 0 ? "#2de897" : "#ff6b7a",
                }}>
                  {digest.week_delta_pct > 0 ? "+" : ""}{digest.week_delta_pct}% к прошлой неделе
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
              {[
                { label: "Отправлено", value: digest.sent_last_7_days.toLocaleString("ru"), color: "#6ba8e5" },
                { label: "Сегодня",    value: digest.total_sent_today.toLocaleString("ru"), color: "#2de897" },
                { label: "DM",         value: digest.dm_sent_today.toLocaleString("ru"),    color: "#c4aeff" },
                { label: "Группы",     value: digest.group_sent_today.toLocaleString("ru"), color: "#ffc946" },
              ].map(item => (
                <div key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
            {(digest.tasks_done > 0 || digest.tasks_failed > 0) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#2de897" }}>✓ {digest.tasks_done} задач</span>
                {digest.tasks_failed > 0 && <span style={{ fontSize: 10, color: "#ff6b7a" }}>✗ {digest.tasks_failed} ошибок</span>}
                <span style={{ fontSize: 10, color: TG.muted, marginLeft: "auto" }}>
                  {digest.workers_alive}/{digest.workers_total} воркеров
                </span>
              </div>
            )}
          </GlassCard>
        )}

        {/* Group sends today strip */}
        {groupSendsToday && (groupSendsToday.ok + groupSendsToday.failed) > 0 && (
          <GlassCard style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, flex: 1 }}>📡 Групповые рассылки сегодня</div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#2de897" }}>✓{groupSendsToday.ok}</span>
              {groupSendsToday.failed > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "#ff6b7a" }}>✗{groupSendsToday.failed}</span>}
              {groupSendsToday.ok + groupSendsToday.failed > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.10)", border: "1px solid rgba(255,201,70,0.25)", borderRadius: 20, padding: "2px 7px" }}>
                  {Math.round(groupSendsToday.ok / (groupSendsToday.ok + groupSendsToday.failed) * 100)}% успех
                </span>
              )}
            </div>
          </GlassCard>
        )}

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

        {/* Bar chart */}
        <GlassCard style={{ padding:"14px 14px 10px" }}>
          <div style={{ fontSize:12,fontWeight:700,color:TG.textSecondary,marginBottom:8 }}>Отправки по дням</div>
          <MiniBarChart data={trend} color="#ff9f40" />
        </GlassCard>

        {/* Hourly send-rate chart */}
        {sendRate.length > 0 && (
          <GlassCard style={{ padding:"14px 14px 12px" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
              <div style={{ fontSize:12,fontWeight:700,color:TG.textSecondary }}>Отправки по часам (сегодня)</div>
              <span style={{ fontSize:10,color:TG.muted }}>{new Date().toLocaleDateString("ru",{day:"2-digit",month:"short"})}</span>
            </div>
            <HourlySendRateChart data={sendRate} />
          </GlassCard>
        )}

        {/* Top campaigns */}
        {topCamps.length > 0 && (
          <GlassCard style={{ padding:"14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
              <Trophy size={13} color={TG.yellow} />
              <span style={{ fontSize:12,fontWeight:700,color:TG.textSecondary }}>Топ кампании</span>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {topCamps.map((c, i) => {
                const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
                const maxSent = topCamps[0]?.sent ?? 1;
                const pct = Math.round((c.sent / maxSent) * 100);
                const openRate: number | null = c.openRate != null ? Math.round(c.openRate) : null;
                const barColor = openRate != null && openRate >= 20
                  ? `linear-gradient(90deg,${TG.green},#6ba8e5)`
                  : openRate != null && openRate >= 10
                    ? `linear-gradient(90deg,#ffc946,#6ba8e5)`
                    : `linear-gradient(90deg,#6ba8e5,#7c8db0)`;
                return (
                  <div key={c.id}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0 }}>
                        <span style={{ fontSize:13 }}>{medals[i]}</span>
                        <span style={{ fontSize:11,color:TG.text,fontWeight:600,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",flex:1 }}>{c.name}</span>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0,marginLeft:8,display:"flex",alignItems:"center",gap:8 }}>
                        {openRate != null && openRate > 0 && (
                          <span style={{ fontSize:9,fontWeight:700,color:openRate>=20?TG.green:openRate>=10?"#ffc946":"#7c8db0",background:`${openRate>=20?TG.green:openRate>=10?"#ffc946":"#7c8db0"}18`,borderRadius:10,padding:"1px 5px" }}>
                            👁 {openRate}%
                          </span>
                        )}
                        <div>
                          <span style={{ fontSize:11,fontWeight:800,color:TG.green }}>{c.sent.toLocaleString("ru")}</span>
                          <span style={{ fontSize:10,color:TG.muted,marginLeft:4 }}>отпр.</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height:2,borderRadius:1,background:"rgba(255,255,255,0.07)" }}>
                      <div style={{ height:"100%",width:`${pct}%`,borderRadius:1,background:barColor,opacity:0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

      </div>
    </div>
  );
}
