import { useState } from "react";
import { Search, Users2, TrendingUp, Star, Zap, Clock, ChevronRight } from "lucide-react";

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

const SEGMENTS = [
  { id:"premium", label:"Премиум", icon:Star, count:1240, pct:28, color:TG.purple, glow:TG.purpleGlow, delta:"+4%" },
  { id:"active",  label:"Активные", icon:Zap, count:2180, pct:49, color:TG.green, glow:TG.greenGlow, delta:"+11%" },
  { id:"new",     label:"Новые",   icon:TrendingUp, count:840, pct:19, color:TG.blue, glow:TG.blueGlow, delta:"+18%" },
  { id:"idle",    label:"Неактивны", icon:Clock, count:180, pct:4, color:TG.muted, glow:"rgba(160,190,230,0.25)", delta:"-2%" },
];

const USERS = [
  { name:"Алексей Котов",   initials:"АК", segment:"premium", color:TG.purple, liter:"95", last:"сег." },
  { name:"Мария Захарова",  initials:"МЗ", segment:"active",  color:TG.green,  liter:"92", last:"вчера" },
  { name:"Дмитрий Ли",      initials:"ДЛ", segment:"new",     color:TG.blue,   liter:"98", last:"сег." },
  { name:"Светлана Орлова", initials:"СО", segment:"premium", color:TG.purple, liter:"95", last:"2д назад" },
  { name:"Иван Смирнов",    initials:"ИС", segment:"active",  color:TG.green,  liter:"92", last:"сег." },
  { name:"Ольга Белова",    initials:"ОБ", segment:"idle",    color:TG.muted,  liter:"ДТ", last:"2нед." },
];

const SEG_LABEL: Record<string, string> = {
  premium:"Премиум", active:"Активный", new:"Новый", idle:"Неактивен"
};

export function PerfectAudience() {
  const [query, setQuery] = useState("");
  const filtered = USERS.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ width:"100%", height:"100%", background:TG.bg, overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", position:"relative" }}>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(0,0);}  50%{transform:translate(10px,-14px);} }
        @keyframes floatB { 0%,100%{transform:translate(0,0);}  50%{transform:translate(-12px,10px);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}  to{opacity:1;transform:translateY(0);} }
        .pfau-page { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"0%", right:"-8%", width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(196,174,255,0.16) 0%, transparent 70%)", filter:"blur(44px)", animation:"floatA 10s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"20%", left:"-6%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(45,232,151,0.12) 0%, transparent 70%)", filter:"blur(38px)", animation:"floatB 13s ease-in-out infinite" }} />
      </div>

      <div className="pfau-page" style={{ position:"relative", zIndex:5, height:"100%", overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:12, padding:"16px 14px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:17, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Аудитория</div>
          <GlassCard style={{ padding:"6px 11px", borderRadius:13 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Users2 size={13} color={TG.purple} />
              <span style={{ fontSize:11, color:TG.purple, fontWeight:700 }}>4 440</span>
            </div>
          </GlassCard>
        </div>

        {/* Search */}
        <GlassCard style={{ padding:"0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px" }}>
            <Search size={14} color={TG.muted} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Найти пользователя..."
              style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:TG.text, caretColor:TG.blue }}
            />
          </div>
        </GlassCard>

        {/* Growth banner */}
        <GlassCard glow={`${TG.greenGlow}25`} style={{ padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:11, color:TG.muted, marginBottom:3 }}>Прирост этой недели</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:22, fontWeight:800, color:TG.text }}>+284</span>
                <span style={{ fontSize:12, color:TG.green, fontWeight:700 }}>↑ 6.8%</span>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
              <div style={{ width:80, height:3, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:"69%", background:`linear-gradient(90deg,${TG.green},${TG.blue})`, borderRadius:2 }} />
              </div>
              <span style={{ fontSize:9, color:TG.muted }}>Цель: 6 500</span>
            </div>
          </div>
        </GlassCard>

        {/* Segments 2×2 */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Сегменты</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {SEGMENTS.map(s => {
              const Icon = s.icon;
              return (
                <GlassCard key={s.id} glow={`${s.glow}28`} style={{ padding:"12px 12px 10px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                    <div style={{ width:26, height:26, borderRadius:8, background:`${s.color}18`, border:`1px solid ${s.color}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon size={12} color={s.color} />
                    </div>
                    <span style={{ fontSize:9, color:s.color, fontWeight:700 }}>{s.delta}</span>
                  </div>
                  <div style={{ fontSize:17, fontWeight:800, color:TG.text, letterSpacing:"-0.02em", lineHeight:1 }}>{s.count.toLocaleString("ru")}</div>
                  <div style={{ fontSize:9, color:TG.muted, marginTop:2 }}>{s.label}</div>
                  <div style={{ marginTop:6, height:2, borderRadius:1, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${s.pct}%`, background:s.color, opacity:0.7, borderRadius:1 }} />
                  </div>
                  <div style={{ fontSize:8, color:s.color, marginTop:3, fontWeight:600, textAlign:"right" }}>{s.pct}%</div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* User list */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>Пользователи</div>
            <span style={{ fontSize:10, color:TG.blue, fontWeight:600, display:"flex", alignItems:"center", gap:1 }}>Все <ChevronRight size={11} /></span>
          </div>
          <GlassCard style={{ padding:"6px 0", overflow:"hidden" }}>
            {filtered.map((u, i) => (
              <div key={u.name}>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px" }}>
                  <div style={{ width:34, height:34, borderRadius:11, background:`linear-gradient(145deg,${u.color}35 0%,${u.color}15 100%)`, border:`1px solid ${u.color}50`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:u.color }}>{u.initials}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:TG.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.name}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                      <span style={{ fontSize:9, color:u.color, background:`${u.color}18`, border:`1px solid ${u.color}30`, borderRadius:20, padding:"1px 6px", fontWeight:700 }}>{SEG_LABEL[u.segment]}</span>
                      <span style={{ fontSize:9, color:TG.muted }}>АИ-{u.liter}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:9, color:TG.muted }}>{u.last}</div>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:u.segment === "idle" ? TG.muted : u.color, boxShadow:`0 0 4px ${u.color}60`, marginTop:4, marginLeft:"auto" }} />
                  </div>
                </div>
                {i < filtered.length - 1 && <div style={{ height:1, background:"rgba(255,255,255,0.04)", marginLeft:58 }} />}
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
