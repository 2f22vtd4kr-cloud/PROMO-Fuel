import { useState } from "react";
import { Plus, Play, Pause, Settings, MoreHorizontal, Fuel, Clock } from "lucide-react";

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
  yellow: "#ffc946", yellowGlow: "rgba(255,201,70,0.38)",
  red: "#ff6b7a", redGlow: "rgba(255,107,122,0.38)",
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

const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
  running:   { color: TG.green,  bg: `${TG.green}22`,  label: "Активна" },
  scheduled: { color: TG.yellow, bg: `${TG.yellow}22`, label: "Запланир." },
  paused:    { color: TG.blue,   bg: `${TG.blue}22`,   label: "Пауза" },
  draft:     { color: TG.muted,  bg: "rgba(255,255,255,0.06)", label: "Черновик" },
  done:      { color: TG.muted,  bg: "rgba(255,255,255,0.06)", label: "Готово" },
};

const ALL_CAMPAIGNS = [
  { id:1, name:"Газпром нефть — АИ-92/95",  status:"running",   sent:4120, total:6000, date:"сег. 14:30", color:TG.green },
  { id:2, name:"Лукойл Кэшбэк — Июль 2025", status:"running",   sent:1840, total:3000, date:"сег. 09:00", color:TG.green },
  { id:3, name:"Shell FUEL2025 Promo",       status:"scheduled", sent:0,    total:2500, date:"завтра 10:00", color:TG.yellow },
  { id:4, name:"Роснефть — День водителя",  status:"paused",    sent:980,  total:2000, date:"21.07 18:00", color:TG.blue },
  { id:5, name:"ТНК Летний дрифт",          status:"done",      sent:3200, total:3200, date:"15.07", color:TG.muted },
  { id:6, name:"Башнефть — Кэшбэк 5%",      status:"draft",     sent:0,    total:1500, date:"черновик", color:TG.muted },
];

const FILTERS = [
  { key:"all",       label:"Все",       count:6 },
  { key:"running",   label:"Активные",  count:2 },
  { key:"paused",    label:"Пауза",     count:1 },
  { key:"draft",     label:"Черновики", count:1 },
];

export function PerfectCampaigns() {
  const [filter, setFilter] = useState("all");
  const campaigns = filter === "all" ? ALL_CAMPAIGNS : ALL_CAMPAIGNS.filter(c => c.status === filter);
  const s = STATUS_MAP;

  return (
    <div style={{ width:"100%", height:"100%", background:TG.bg, overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", position:"relative" }}>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(0,0);}  50%{transform:translate(12px,-16px);} }
        @keyframes floatB { 0%,100%{transform:translate(0,0);}  50%{transform:translate(-14px,10px);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}  to{opacity:1;transform:translateY(0);} }
        .pfc-anim { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-5%", right:"-10%", width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(45,232,151,0.15) 0%, transparent 70%)", filter:"blur(40px)", animation:"floatA 10s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"20%", left:"-8%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(107,168,229,0.12) 0%, transparent 70%)", filter:"blur(36px)", animation:"floatB 12s ease-in-out infinite" }} />
      </div>

      <div className="pfc-anim" style={{ position:"relative", zIndex:5, height:"100%", overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:12, padding:"16px 14px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:17, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Рассылки</div>
          <GlassCard style={{ padding:"7px 11px", borderRadius:13, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Plus size={13} color={TG.green} />
              <span style={{ fontSize:11, color:TG.green, fontWeight:700 }}>Создать</span>
            </div>
          </GlassCard>
        </div>

        {/* Summary chips */}
        <div style={{ display:"flex", gap:6 }}>
          {[
            { label:"2 активных", color:TG.green },
            { label:"1 запланир.", color:TG.yellow },
            { label:"1 на паузе", color:TG.blue },
          ].map(c => (
            <span key={c.label} style={{ fontSize:10, fontWeight:700, color:c.color, background:`${c.color}18`, border:`1px solid ${c.color}35`, borderRadius:20, padding:"3px 9px" }}>{c.label}</span>
          ))}
        </div>

        {/* Filter tab bar */}
        <GlassCard style={{ padding:"4px" }}>
          <div style={{ display:"flex", gap:0 }}>
            {FILTERS.map(f => {
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  flex:1, padding:"7px 4px", border:"none", cursor:"pointer", borderRadius:14, background:"none",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:1, position:"relative",
                }}>
                  {isActive && <div style={{ position:"absolute", inset:"1px 2px", borderRadius:13, background:"linear-gradient(145deg,rgba(45,232,151,0.18) 0%,rgba(45,232,151,0.06) 100%)", border:"1px solid rgba(45,232,151,0.25)" }} />}
                  <span style={{ fontSize:10, fontWeight:isActive ? 800 : 500, color:isActive ? TG.green : TG.muted, position:"relative", zIndex:1 }}>{f.label}</span>
                  <span style={{ fontSize:8, fontWeight:700, color:isActive ? TG.green : "rgba(255,255,255,0.20)", position:"relative", zIndex:1 }}>{f.count}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Campaign list */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {campaigns.map(c => {
            const st = s[c.status] ?? s.draft;
            const pct = c.total > 0 ? Math.round(c.sent / c.total * 100) : 0;
            return (
              <GlassCard key={c.id} style={{ padding:"14px" }}>
                {/* Top row */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ flex:1, marginRight:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                      <div style={{ width:26, height:26, borderRadius:8, background:`linear-gradient(145deg,${c.color}30 0%,${c.color}10 100%)`, border:`1px solid ${c.color}40`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Fuel size={12} color={c.color} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:TG.text, lineHeight:1.3 }}>{c.name}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:33 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:st.color, background:st.bg, border:`1px solid ${st.color}40`, borderRadius:20, padding:"2px 7px" }}>{st.label}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                        <Clock size={9} color={TG.muted} />
                        <span style={{ fontSize:9, color:TG.muted }}>{c.date}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button style={{ width:26, height:26, borderRadius:8, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                      {c.status === "running" ? <Pause size={11} color={TG.blue} /> : <Play size={11} color={TG.green} />}
                    </button>
                    <button style={{ width:26, height:26, borderRadius:8, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                      <Settings size={11} color={TG.muted} />
                    </button>
                    <button style={{ width:26, height:26, borderRadius:8, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                      <MoreHorizontal size={11} color={TG.muted} />
                    </button>
                  </div>
                </div>
                {/* Progress */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:9, color:TG.muted }}>Отправлено</span>
                    <span style={{ fontSize:9, color:c.color, fontWeight:700 }}>{c.sent.toLocaleString("ru")} / {c.total.toLocaleString("ru")} · {pct}%</span>
                  </div>
                  <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, borderRadius:2, background:`linear-gradient(90deg,${c.color},${c.color}cc)`, boxShadow:`0 0 6px ${c.color}60`, transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
