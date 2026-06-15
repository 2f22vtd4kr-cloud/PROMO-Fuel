import { useState } from "react";
import { Bell, Gift, Flame, Users2, TrendingUp, Megaphone, MapPin, BarChart2, ArrowUpRight, Fuel, ChevronRight } from "lucide-react";

const TG = {
  bg: "#07090f",
  lgSurface: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
  lgBorder: "rgba(255,255,255,0.18)",
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
};
const BLUR = "blur(32px) saturate(160%)";

function GlassCard({ children, style = {}, glow, onClick }: { children: React.ReactNode; style?: React.CSSProperties; glow?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: TG.lgSurface, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
      border: `1px solid ${TG.glassBorderStrong}`, borderRadius: 20, position: "relative",
      overflow: "hidden", cursor: onClick ? "pointer" : "default",
      boxShadow: glow ? `0 8px 32px rgba(0,0,0,0.38),0 0 0 0.5px rgba(255,255,255,0.06) inset,0 4px 24px ${glow}` : "0 8px 32px rgba(0,0,0,0.38),0 0 0 0.5px rgba(255,255,255,0.06) inset",
      ...style,
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.55) 35%,rgba(255,255,255,0.70) 50%,rgba(255,255,255,0.55) 65%,transparent 95%)", pointerEvents:"none", zIndex:3 }} />
      <div style={{ position:"absolute", inset:0, borderRadius:"inherit", background: TG.lgPrism, pointerEvents:"none", zIndex:1 }} />
      <div style={{ position:"relative", zIndex:2 }}>{children}</div>
    </div>
  );
}

function Sparkline({ color, data }: { color: string; data: number[] }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 56, h = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PerfectHome() {
  const [notif] = useState(3);
  const stats = [
    { label:"Скидок выдано", value:"₽847K", trend:"+12.4%", color:TG.green, glow:TG.greenGlow, icon:Gift, spark:[420,510,480,620,580,700,847] },
    { label:"Активных", value:"3", trend:"кампании", color:TG.orange, glow:TG.orangeGlow, icon:Flame, spark:[1,2,1,3,2,2,3] },
    { label:"Охват", value:"12.4K", trend:"пользователей", color:TG.blue, glow:TG.blueGlow, icon:Users2, spark:[6,7,8,9,10,11,12.4] },
    { label:"Конверсия", value:"34%", trend:"↑8% неделя", color:TG.purple, glow:TG.purpleGlow, icon:TrendingUp, spark:[20,24,22,28,26,30,34] },
  ];
  const actions = [
    { label:"Новая рассылка", icon:Megaphone, color:TG.green, glow:TG.greenGlow },
    { label:"Добавить АЗС", icon:MapPin, color:TG.orange, glow:TG.orangeGlow },
    { label:"Промо-акция", icon:Flame, color:TG.yellow, glow:TG.yellowGlow },
    { label:"Статистика", icon:BarChart2, color:TG.blue, glow:TG.blueGlow },
  ];
  const promos = [
    { title:"АЗС Газпром нефть", desc:"Скидка -5₽/л на АИ-92, 95", color:TG.blue, glow:TG.blueGlow, badge:"ТОП", claimed:1847, total:3000 },
    { title:"Лукойл — Кэшбэк 8%", desc:"При оплате картой от 40л", color:TG.green, glow:TG.greenGlow, badge:"АКТИВНА", claimed:934, total:2000 },
    { title:"Shell: FUEL2025", desc:"Промо-код до 31.07", color:TG.orange, glow:TG.orangeGlow, badge:"НОВАЯ", claimed:221, total:500 },
  ];

  return (
    <div style={{ width:"100%", height:"100%", background:TG.bg, overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", position:"relative" }}>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(0,0) scale(1);}  50%{transform:translate(14px,-18px) scale(1.07);} }
        @keyframes floatB { 0%,100%{transform:translate(0,0) scale(1);}  50%{transform:translate(-16px,12px) scale(1.05);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);}  to{opacity:1;transform:translateY(0);} }
        .pf-page { animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* Mesh background */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-15%", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle, rgba(45,232,151,0.18) 0%, transparent 70%)", filter:"blur(48px)", animation:"floatA 9s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"30%", right:"-10%", width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle, rgba(107,168,229,0.14) 0%, transparent 70%)", filter:"blur(40px)", animation:"floatB 11s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"10%", left:"-5%", width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,159,64,0.12) 0%, transparent 70%)", filter:"blur(44px)", animation:"floatA 13s ease-in-out infinite reverse" }} />
      </div>

      <div className="pf-page" style={{ position:"relative", zIndex:5, height:"100%", overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:12, padding:"16px 14px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Добро пожаловать 👋</div>
            <div style={{ fontSize:11, color:TG.textSecondary, marginTop:2 }}>PROMO-Fuel · Личный кабинет</div>
          </div>
          <div style={{ position:"relative" }}>
            <GlassCard style={{ padding:"7px 9px", borderRadius:13, cursor:"pointer" }}>
              <Bell size={16} color={TG.blue} style={{ display:"block" }} />
            </GlassCard>
            {notif > 0 && (
              <div style={{ position:"absolute", top:-4, right:-4, minWidth:16, height:16, borderRadius:8, background:TG.green, boxShadow:`0 0 8px ${TG.greenGlow}`, border:`1.5px solid ${TG.bg}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:9, fontWeight:800, color:"#07090f", lineHeight:1 }}>{notif}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats 2×2 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.label} glow={`${s.glow}30`} style={{ padding:"12px 12px 10px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:`${s.color}18`, border:`1px solid ${s.color}35`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 10px ${s.glow}` }}>
                    <Icon size={13} color={s.color} />
                  </div>
                  <Sparkline color={s.color} data={s.spark} />
                </div>
                <div style={{ fontSize:19, fontWeight:800, color:TG.text, letterSpacing:"-0.03em", lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:TG.muted, marginTop:2, fontWeight:500 }}>{s.label}</div>
                <div style={{ fontSize:9, color:s.color, marginTop:2, fontWeight:700 }}>{s.trend}</div>
              </GlassCard>
            );
          })}
        </div>

        {/* Quick actions 2×2 grid */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Быстрые действия</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {actions.map(a => {
              const Icon = a.icon;
              return (
                <GlassCard key={a.label} glow={`${a.glow}28`} style={{ padding:"12px 10px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                  <div style={{ width:34, height:34, borderRadius:11, background:`linear-gradient(145deg,${a.color}30 0%,${a.color}10 100%)`, border:`1px solid ${a.color}40`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 14px ${a.glow}50`, flexShrink:0 }}>
                    <Icon size={15} color={a.color} />
                  </div>
                  <span style={{ fontSize:11, color:TG.textSecondary, fontWeight:700, lineHeight:1.25 }}>{a.label}</span>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Active promos */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>Активные акции</div>
            <span style={{ fontSize:11, color:TG.blue, fontWeight:600, display:"flex", alignItems:"center", gap:2 }}>Все <ChevronRight size={12} /></span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {promos.map(p => (
              <GlassCard key={p.title} glow={`${p.glow}20`} style={{ padding:"12px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                      <div style={{ width:26, height:26, borderRadius:8, background:`linear-gradient(145deg,${p.color}35 0%,${p.color}15 100%)`, border:`1px solid ${p.color}50`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Fuel size={12} color={p.color} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:TG.text }}>{p.title}</span>
                    </div>
                    <div style={{ fontSize:10, color:TG.textSecondary, marginLeft:33 }}>{p.desc}</div>
                  </div>
                  <span style={{ fontSize:8, fontWeight:800, letterSpacing:"0.05em", color:p.color, background:`${p.color}20`, border:`1px solid ${p.color}40`, borderRadius:20, padding:"2px 7px", flexShrink:0, marginLeft:8 }}>{p.badge}</span>
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:9, color:TG.muted }}>Использовано</span>
                    <span style={{ fontSize:9, color:p.color, fontWeight:700 }}>{p.claimed.toLocaleString("ru")} / {p.total.toLocaleString("ru")}</span>
                  </div>
                  <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:2, width:`${Math.round(p.claimed/p.total*100)}%`, background:`linear-gradient(90deg,${p.color},${p.color}bb)`, boxShadow:`0 0 6px ${p.glow}` }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:3 }}>
                    <span style={{ fontSize:9, color:p.color, fontWeight:600 }}>{Math.round(p.claimed/p.total*100)}%</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
