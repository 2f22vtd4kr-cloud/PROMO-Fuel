import { useState, useEffect, useRef } from "react";
import {
  LayoutGrid, Megaphone, BarChart2, Users2, Shield,
  Flame, TrendingUp, Zap, MapPin, Gift, Bell, Settings,
  ChevronRight, Plus, Play, Pause, Star, Droplets,
  Award, ArrowUpRight, Clock, CheckCircle, Filter,
  Fuel, Navigation, User, Wallet, Search, MoreHorizontal,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const TG = {
  bg: "#07090f",
  glass: "rgba(255,255,255,0.065)",
  glassMid: "rgba(255,255,255,0.10)",
  glassStrong: "rgba(255,255,255,0.15)",
  glassBorder: "rgba(255,255,255,0.13)",
  glassBorderStrong: "rgba(255,255,255,0.22)",
  lgSurface: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
  lgBorder: "rgba(255,255,255,0.18)",
  lgPrism: "linear-gradient(135deg, rgba(120,180,255,0.07) 0%, rgba(255,120,200,0.05) 35%, rgba(120,255,170,0.04) 65%, rgba(180,120,255,0.07) 100%)",
  text: "#eef2ff",
  textSecondary: "rgba(220,232,255,0.68)",
  muted: "rgba(160,190,230,0.50)",
  green: "#2de897",
  greenGlow: "rgba(45,232,151,0.38)",
  orange: "#ff9f40",
  orangeGlow: "rgba(255,159,64,0.38)",
  blue: "#6ba8e5",
  blueGlow: "rgba(107,168,229,0.45)",
  purple: "#c4aeff",
  purpleGlow: "rgba(196,174,255,0.38)",
  pink: "#ff7eb3",
  pinkGlow: "rgba(255,126,179,0.38)",
  yellow: "#ffc946",
  yellowGlow: "rgba(255,201,70,0.38)",
  red: "#ff6b7a",
  redGlow: "rgba(255,107,122,0.38)",
};

const BLUR = "blur(32px) saturate(160%)";
const BLUR_NAV = "blur(48px) saturate(190%)";

function GlassCard({
  children, style = {}, glow, onClick,
}: { children: React.ReactNode; style?: React.CSSProperties; glow?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: TG.lgSurface,
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        border: `1px solid ${TG.glassBorderStrong}`,
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
        boxShadow: glow
          ? `0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 4px 24px ${glow}`
          : "0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.55) 35%,rgba(255,255,255,0.70) 50%,rgba(255,255,255,0.55) 65%,transparent 95%)",
        pointerEvents: "none", zIndex: 3,
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: TG.lgPrism,
        pointerEvents: "none", zIndex: 1,
      }} />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    running:   { color: TG.green,  bg: `${TG.green}22`,  label: "Активна" },
    scheduled: { color: TG.yellow, bg: `${TG.yellow}22`, label: "Запланирована" },
    paused:    { color: TG.blue,   bg: `${TG.blue}22`,   label: "Пауза" },
    draft:     { color: TG.muted,  bg: "rgba(255,255,255,0.06)", label: "Черновик" },
    done:      { color: TG.muted,  bg: "rgba(255,255,255,0.06)", label: "Готово" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}40`,
      borderRadius: 20, padding: "2px 8px",
    }}>{s.label}</span>
  );
}

function MeshBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        @keyframes floatA {
          0%,100%{transform:translate(0,0) scale(1);}
          33%{transform:translate(18px,-22px) scale(1.08);}
          66%{transform:translate(-14px,16px) scale(0.96);}
        }
        @keyframes floatB {
          0%,100%{transform:translate(0,0) scale(1);}
          40%{transform:translate(-20px,14px) scale(1.05);}
          70%{transform:translate(16px,-18px) scale(0.97);}
        }
        @keyframes floatC {
          0%,100%{transform:translate(0,0) scale(1);}
          50%{transform:translate(12px,20px) scale(1.06);}
        }
        @keyframes navPop {
          0%{transform:scale(0.82);opacity:0;}
          60%{transform:scale(1.06);opacity:1;}
          100%{transform:scale(1);opacity:1;}
        }
        @keyframes shimmer {
          0%{background-position:-200% 0;}
          100%{background-position:200% 0;}
        }
        @keyframes fadeInUp {
          from{opacity:0;transform:translateY(14px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes pulse {
          0%,100%{opacity:1;} 50%{opacity:0.55;}
        }
        .tab-content { animation: fadeInUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{
        position:"absolute", top:"-8%", left:"-10%",
        width:340, height:340, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(45,232,151,0.18) 0%, transparent 70%)",
        filter:"blur(48px)",
        animation:"floatA 9s ease-in-out infinite",
      }} />
      <div style={{
        position:"absolute", top:"22%", right:"-12%",
        width:280, height:280, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(107,168,229,0.16) 0%, transparent 70%)",
        filter:"blur(40px)",
        animation:"floatB 11s ease-in-out infinite",
      }} />
      <div style={{
        position:"absolute", bottom:"18%", left:"-8%",
        width:260, height:260, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(255,159,64,0.13) 0%, transparent 70%)",
        filter:"blur(44px)",
        animation:"floatC 13s ease-in-out infinite",
      }} />
      <div style={{
        position:"absolute", bottom:"-5%", right:"-5%",
        width:220, height:220, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(196,174,255,0.12) 0%, transparent 70%)",
        filter:"blur(36px)",
        animation:"floatA 15s ease-in-out infinite reverse",
      }} />
    </div>
  );
}

type Tab = "home" | "campaigns" | "analytics" | "audience" | "accounts";
const NAV_ITEMS: { id: Tab; icon: React.ElementType; label: string; color: string; glow: string }[] = [
  { id: "home",      icon: LayoutGrid, label: "Главная",   color: "#95c4f5", glow: "rgba(107,168,229,0.55)" },
  { id: "campaigns", icon: Megaphone,  label: "Рассылки",  color: "#2de897", glow: "rgba(45,232,151,0.55)" },
  { id: "analytics", icon: BarChart2,  label: "Аналитика", color: "#ffc946", glow: "rgba(255,201,70,0.55)" },
  { id: "audience",  icon: Users2,     label: "Аудитория", color: "#c4aeff", glow: "rgba(196,174,255,0.55)" },
  { id: "accounts",  icon: Shield,     label: "Аккаунты",  color: "#ff7eb3", glow: "rgba(255,126,179,0.55)" },
];

function BottomNav({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <div style={{
      paddingBottom: 12, paddingLeft: 12, paddingRight: 12, paddingTop: 8,
      position: "relative", flexShrink: 0,
    }}>
      <div style={{
        display: "flex",
        background: "linear-gradient(145deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 60%,rgba(255,255,255,0.08) 100%)",
        backdropFilter: BLUR_NAV,
        WebkitBackdropFilter: BLUR_NAV,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.17)",
        boxShadow: "0 2px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 16px 48px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.22)",
        position: "relative", overflow: "hidden",
        padding: "4px 4px",
      }}>
        <div style={{
          position:"absolute",top:0,left:0,right:0,height:1,
          background:"linear-gradient(90deg,transparent 3%,rgba(255,255,255,0.58) 30%,rgba(255,255,255,0.72) 50%,rgba(255,255,255,0.58) 70%,transparent 97%)",
          pointerEvents:"none",zIndex:3,
        }} />
        <div style={{
          position:"absolute",inset:0,borderRadius:"inherit",
          background:TG.lgPrism,
          pointerEvents:"none",zIndex:1,
        }} />
        {NAV_ITEMS.map(({ id, icon: Icon, label, color, glow }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center",
              gap:3, padding:"9px 2px 8px",
              border:"none", background:"none",
              position:"relative", zIndex:2,
              cursor:"pointer", minHeight:54,
            }}>
              {isActive && (
                <div style={{
                  position:"absolute", inset:"2px 4px",
                  borderRadius:20,
                  background:`linear-gradient(145deg,${color}22 0%,${color}10 100%)`,
                  border:`1px solid ${color}35`,
                  backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
                  boxShadow:`0 0 24px ${glow}40, inset 0 1px 0 ${color}28`,
                  animation:"navPop 0.36s cubic-bezier(0.16,1,0.3,1) both",
                }} />
              )}
              <div style={{ position:"relative", zIndex:1 }}>
                <Icon
                  size={isActive ? 21 : 19}
                  color={isActive ? color : "rgba(160,190,230,0.32)"}
                  strokeWidth={isActive ? 2.4 : 1.6}
                  style={{
                    transition:"color 0.22s,filter 0.22s",
                    filter:isActive ? `drop-shadow(0 0 8px ${glow})` : "none",
                  }}
                />
              </div>
              <span style={{
                fontSize:9, fontWeight:isActive ? 800 : 400,
                letterSpacing:"0.03em",
                color:isActive ? color : "rgba(160,190,230,0.30)",
                textTransform:"uppercase",
                transition:"color 0.22s",
                position:"relative", zIndex:1,
              }}>{label}</span>
              {isActive && (
                <div style={{
                  position:"absolute", bottom:4, left:"50%",
                  transform:"translateX(-50%)",
                  width:3, height:3, borderRadius:"50%",
                  background:color,
                  boxShadow:`0 0 8px 2px ${glow}`,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeTab() {
  const stats = [
    { label: "Скидок выдано", value: "₽847K", sub: "+12% сегодня", color: TG.green, glow: TG.greenGlow, icon: Gift },
    { label: "Активных", value: "3", sub: "кампании", color: TG.orange, glow: TG.orangeGlow, icon: Flame },
    { label: "Охват", value: "12.4K", sub: "пользователей", color: TG.blue, glow: TG.blueGlow, icon: Users2 },
    { label: "Конверсия", value: "34%", sub: "↑8% за неделю", color: TG.purple, glow: TG.purpleGlow, icon: TrendingUp },
  ];

  const quickActions = [
    { label: "Новая рассылка", icon: Megaphone, color: TG.green, glow: TG.greenGlow },
    { label: "Добавить АЗС", icon: MapPin, color: TG.orange, glow: TG.orangeGlow },
    { label: "Промо-акция", icon: Flame, color: TG.yellow, glow: TG.yellowGlow },
    { label: "Статистика", icon: BarChart2, color: TG.blue, glow: TG.blueGlow },
  ];

  const featuredPromos = [
    { title: "АЗС Газпром нефть", desc: "Скидка -5₽/л на АИ-92, 95", color: TG.blue, glow: TG.blueGlow, badge: "ТОП", claimed: 1847, total: 3000 },
    { title: "Лукойл — Кэшбэк 8%", desc: "При оплате картой от 40л", color: TG.green, glow: TG.greenGlow, badge: "АКТИВНА", claimed: 934, total: 2000 },
    { title: "Shell: 2 бак = бесплатно", desc: "Промо-код FUEL2025 до 31.07", color: TG.orange, glow: TG.orangeGlow, badge: "НОВАЯ", claimed: 221, total: 500 },
  ];

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:14, padding:"0 14px", paddingBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:4 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>
            Добро пожаловать 👋
          </div>
          <div style={{ fontSize:12, color:TG.textSecondary, marginTop:2 }}>
            PROMO-Fuel • Личный кабинет
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <GlassCard style={{ padding:"8px 10px", borderRadius:14 }}>
            <Bell size={17} color={TG.blue} style={{ display:"block" }} />
          </GlassCard>
          <div style={{
            position:"absolute", top:-3, right:-3,
            width:8, height:8, borderRadius:"50%",
            background:TG.green,
            boxShadow:`0 0 6px 2px ${TG.greenGlow}`,
            border:"1.5px solid #07090f",
          }} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} glow={s.glow + "30"} style={{ padding:"14px 14px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{
                  width:30, height:30, borderRadius:10,
                  background:`${s.color}18`,
                  border:`1px solid ${s.color}35`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:`0 0 12px ${s.glow}`,
                }}>
                  <Icon size={14} color={s.color} />
                </div>
                <ArrowUpRight size={12} color={s.color} style={{ opacity:0.7 }} />
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:TG.text, letterSpacing:"-0.03em", lineHeight:1 }}>
                {s.value}
              </div>
              <div style={{ fontSize:10, color:TG.muted, marginTop:3, fontWeight:500 }}>{s.label}</div>
              <div style={{ fontSize:10, color:s.color, marginTop:2, fontWeight:600 }}>{s.sub}</div>
            </GlassCard>
          );
        })}
      </div>

      <div>
        <div style={{ fontSize:12, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
          Быстрые действия
        </div>
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.label} style={{ flexShrink:0 }}>
                <GlassCard glow={a.glow + "28"} style={{ padding:"12px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:7, minWidth:72, cursor:"pointer" }}>
                  <div style={{
                    width:36, height:36, borderRadius:12,
                    background:`linear-gradient(145deg,${a.color}30 0%,${a.color}10 100%)`,
                    border:`1px solid ${a.color}40`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 0 16px ${a.glow}50`,
                  }}>
                    <Icon size={16} color={a.color} />
                  </div>
                  <span style={{ fontSize:9, color:TG.textSecondary, fontWeight:700, textAlign:"center", letterSpacing:"0.02em", lineHeight:1.2, maxWidth:64 }}>
                    {a.label}
                  </span>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>
            Активные акции
          </div>
          <span style={{ fontSize:11, color:TG.blue, fontWeight:600 }}>Все →</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {featuredPromos.map((p) => (
            <GlassCard key={p.title} glow={p.glow + "20"} style={{ padding:"14px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ flex:1, marginRight:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                    <div style={{
                      width:28, height:28, borderRadius:9,
                      background:`linear-gradient(145deg,${p.color}35 0%,${p.color}15 100%)`,
                      border:`1px solid ${p.color}50`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:`0 0 12px ${p.glow}40`,
                    }}>
                      <Fuel size={13} color={p.color} />
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:TG.text }}>{p.title}</span>
                  </div>
                  <div style={{ fontSize:11, color:TG.textSecondary, marginLeft:35 }}>{p.desc}</div>
                </div>
                <span style={{
                  fontSize:9, fontWeight:800, letterSpacing:"0.05em",
                  color:p.color, background:`${p.color}20`,
                  border:`1px solid ${p.color}40`,
                  borderRadius:20, padding:"2px 8px", flexShrink:0,
                }}>{p.badge}</span>
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:10, color:TG.muted }}>Использовано</span>
                  <span style={{ fontSize:10, color:p.color, fontWeight:700 }}>
                    {p.claimed.toLocaleString("ru")} / {p.total.toLocaleString("ru")}
                  </span>
                </div>
                <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:2,
                    width:`${Math.round(p.claimed / p.total * 100)}%`,
                    background:`linear-gradient(90deg,${p.color},${p.color}bb)`,
                    boxShadow:`0 0 8px ${p.glow}`,
                  }} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function CampaignsTab() {
  const campaigns = [
    { name: "Газпром нефть — АИ-92/95",  status:"running",   sent:4120, total:6000, date:"сег. 14:30", color:TG.green },
    { name: "Лукойл Кэшбэк — Июль 2025", status:"running",   sent:1840, total:3000, date:"сег. 09:00", color:TG.green },
    { name: "Shell FUEL2025 Promo",       status:"scheduled", sent:0,    total:2500, date:"завтра 10:00", color:TG.yellow },
    { name: "Роснефть — День водителя",  status:"paused",    sent:980,  total:2000, date:"21.07 18:00", color:TG.blue },
    { name: "ТНК Летний дрифт",          status:"done",      sent:3200, total:3200, date:"15.07", color:TG.muted },
    { name: "Башнефть — Кэшбэк 5%",      status:"draft",     sent:0,    total:1500, date:"черновик", color:TG.muted },
  ];

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:14, padding:"0 14px", paddingBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:4 }}>
        <div style={{ fontSize:18, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Рассылки</div>
        <GlassCard style={{ padding:"8px 12px", borderRadius:14, cursor:"pointer" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Plus size={14} color={TG.green} />
            <span style={{ fontSize:12, color:TG.green, fontWeight:700 }}>Создать</span>
          </div>
        </GlassCard>
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {[
          { label:"2 активных", color:TG.green, bg:`${TG.green}18` },
          { label:"1 запланир.", color:TG.yellow, bg:`${TG.yellow}18` },
          { label:"1 на паузе", color:TG.blue, bg:`${TG.blue}18` },
        ].map(c => (
          <span key={c.label} style={{
            fontSize:10, fontWeight:700,
            color:c.color, background:c.bg,
            border:`1px solid ${c.color}35`,
            borderRadius:20, padding:"4px 10px",
          }}>{c.label}</span>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {campaigns.map((c) => {
          const pct = c.total > 0 ? Math.round(c.sent / c.total * 100) : 0;
          return (
            <GlassCard key={c.name} style={{ padding:"14px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:TG.text, marginBottom:3 }}>{c.name}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <StatusBadge status={c.status} />
                    <span style={{ fontSize:10, color:TG.muted }}>
                      <Clock size={9} style={{ display:"inline", marginRight:3 }} />{c.date}
                    </span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {c.status === "running" && (
                    <div style={{ width:28, height:28, borderRadius:9, background:`${TG.green}18`, border:`1px solid ${TG.green}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Pause size={12} color={TG.green} />
                    </div>
                  )}
                  {c.status === "paused" && (
                    <div style={{ width:28, height:28, borderRadius:9, background:`${TG.blue}18`, border:`1px solid ${TG.blue}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Play size={12} color={TG.blue} />
                    </div>
                  )}
                  <div style={{ width:28, height:28, borderRadius:9, background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <MoreHorizontal size={13} color={TG.muted} />
                  </div>
                </div>
              </div>
              {c.total > 0 && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:10, color:TG.muted }}>Отправлено</span>
                    <span style={{ fontSize:10, color:c.color, fontWeight:700 }}>
                      {c.sent.toLocaleString("ru")} / {c.total.toLocaleString("ru")} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.07)" }}>
                    <div style={{
                      height:"100%", borderRadius:2, width:`${pct}%`,
                      background:`linear-gradient(90deg,${c.color},${c.color}aa)`,
                      boxShadow:pct > 0 ? `0 0 6px ${c.color}88` : "none",
                    }} />
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const trend = [
    { d:"Пн", sent:820,  conv:280 },
    { d:"Вт", sent:1140, conv:410 },
    { d:"Ср", sent:960,  conv:340 },
    { d:"Чт", sent:1380, conv:520 },
    { d:"Пт", sent:1620, conv:590 },
    { d:"Сб", sent:2100, conv:810 },
    { d:"Вс", sent:1840, conv:730 },
  ];
  const fuelMix = [
    { name:"АИ-92",  value:38, color:TG.blue },
    { name:"АИ-95",  value:29, color:TG.green },
    { name:"АИ-98",  value:17, color:TG.purple },
    { name:"Дизель", value:16, color:TG.orange },
  ];
  const kpis = [
    { label:"Охват",     value:"89.2K", delta:"+14%",  color:TG.blue },
    { label:"CTR",       value:"12.4%", delta:"+2.1%", color:TG.green },
    { label:"Конверсия", value:"34.1%", delta:"+8.3%", color:TG.purple },
    { label:"Доход",     value:"₽2.1M", delta:"+22%",  color:TG.yellow },
  ];

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:14, padding:"0 14px", paddingBottom:8 }}>
      <div style={{ fontSize:18, fontWeight:800, color:TG.text, letterSpacing:"-0.02em", paddingTop:4 }}>Аналитика</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {kpis.map(k => (
          <GlassCard key={k.label} style={{ padding:"12px 14px" }}>
            <div style={{ fontSize:11, color:TG.muted, marginBottom:4 }}>{k.label}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontSize:20, fontWeight:800, color:TG.text }}>{k.value}</span>
              <span style={{ fontSize:10, color:k.color, fontWeight:700 }}>{k.delta}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard style={{ padding:"14px 14px 8px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:TG.textSecondary, marginBottom:12 }}>
          Рассылки vs Конверсии
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={trend} margin={{ top:4, right:4, left:-20, bottom:0 }}>
            <defs>
              <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TG.blue} stopOpacity={0.28} />
                <stop offset="95%" stopColor={TG.blue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TG.green} stopOpacity={0.28} />
                <stop offset="95%" stopColor={TG.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" tick={{ fill:TG.muted, fontSize:9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:TG.muted, fontSize:9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background:"rgba(7,9,20,0.88)", border:`1px solid ${TG.glassBorder}`, borderRadius:10, backdropFilter:BLUR }}
              itemStyle={{ color:TG.textSecondary, fontSize:11 }}
              labelStyle={{ color:TG.text, fontWeight:700, fontSize:11 }}
            />
            <Area type="monotone" dataKey="sent" stroke={TG.blue} strokeWidth={2} fill="url(#gSent)" dot={false} name="Отправлено" />
            <Area type="monotone" dataKey="conv" stroke={TG.green} strokeWidth={2} fill="url(#gConv)" dot={false} name="Конверсии" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard style={{ padding:"14px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:TG.textSecondary, marginBottom:12 }}>
          Топливный микс
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <PieChart width={100} height={100}>
            <Pie data={fuelMix} cx={46} cy={46} innerRadius={28} outerRadius={46} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {fuelMix.map(e => <Cell key={e.name} fill={e.color} />)}
            </Pie>
          </PieChart>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
            {fuelMix.map(f => (
              <div key={f.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:f.color }} />
                  <span style={{ fontSize:11, color:TG.textSecondary }}>{f.name}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:f.color }}>{f.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding:"14px 14px 8px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:TG.textSecondary, marginBottom:12 }}>
          Скидки по дням (тыс.₽)
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={trend} barSize={18} margin={{ top:4, right:4, left:-24, bottom:0 }}>
            <XAxis dataKey="d" tick={{ fill:TG.muted, fontSize:9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:TG.muted, fontSize:9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background:"rgba(7,9,20,0.88)", border:`1px solid ${TG.glassBorder}`, borderRadius:10 }}
              itemStyle={{ color:TG.textSecondary, fontSize:11 }}
              labelStyle={{ color:TG.text, fontWeight:700, fontSize:11 }}
            />
            <defs>
              <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TG.orange} stopOpacity={0.9} />
                <stop offset="100%" stopColor={TG.orange} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <Bar dataKey="sent" fill="url(#gBar)" radius={[4,4,0,0]} name="Скидок (к)" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}

function AudienceTab() {
  const segments = [
    { name:"Премиум",  count:1247, color:TG.purple, glow:TG.purpleGlow, icon:Award },
    { name:"Активные", count:4830, color:TG.green,  glow:TG.greenGlow,  icon:Zap },
    { name:"Новые",    count:2190, color:TG.blue,   glow:TG.blueGlow,   icon:Star },
    { name:"Спящие",   count:3412, color:TG.muted,  glow:"rgba(160,190,230,0.2)", icon:Clock },
  ];
  const users = [
    { name:"Алексей М.",    handle:"@aleksey_m",    fuel:"АИ-95", spent:"₽12,400", tag:"Премиум",  color:TG.purple },
    { name:"Наталья К.",    handle:"@natasha_kf",   fuel:"Дизель", spent:"₽8,900", tag:"Активная", color:TG.green },
    { name:"Дмитрий В.",    handle:"@dmitr_v_auto", fuel:"АИ-92", spent:"₽6,100",  tag:"Активный", color:TG.green },
    { name:"Ирина С.",      handle:"@irina_spb",    fuel:"АИ-98", spent:"₽19,200", tag:"Премиум",  color:TG.purple },
    { name:"Сергей П.",     handle:"@sergey_pr",    fuel:"АИ-95", spent:"₽4,300",  tag:"Новый",    color:TG.blue },
  ];

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:14, padding:"0 14px", paddingBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:4 }}>
        <div style={{ fontSize:18, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Аудитория</div>
        <GlassCard style={{ padding:"8px 12px", borderRadius:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Filter size={13} color={TG.blue} />
            <span style={{ fontSize:11, color:TG.blue, fontWeight:700 }}>Фильтр</span>
          </div>
        </GlassCard>
      </div>

      <GlassCard glow={TG.blueGlow + "20"} style={{ padding:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:32, fontWeight:900, color:TG.text, letterSpacing:"-0.04em" }}>11,679</div>
            <div style={{ fontSize:12, color:TG.textSecondary }}>Всего пользователей</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:14, fontWeight:700, color:TG.green }}>+312</div>
            <div style={{ fontSize:10, color:TG.muted }}>за сегодня</div>
          </div>
        </div>
      </GlassCard>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {segments.map(s => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.name} glow={s.glow + "25"} style={{ padding:"12px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:26, height:26, borderRadius:8, background:`${s.color}20`, border:`1px solid ${s.color}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={12} color={s.color} />
                </div>
                <span style={{ fontSize:11, color:TG.textSecondary, fontWeight:600 }}>{s.name}</span>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:TG.text }}>{s.count.toLocaleString("ru")}</div>
            </GlassCard>
          );
        })}
      </div>

      <div>
        <div style={{ fontSize:12, fontWeight:700, color:TG.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
          Топ пользователи
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {users.map(u => (
            <GlassCard key={u.name} style={{ padding:"12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  width:36, height:36, borderRadius:12, flexShrink:0,
                  background:`linear-gradient(145deg,${u.color}35 0%,${u.color}15 100%)`,
                  border:`1px solid ${u.color}40`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:800, color:u.color,
                }}>
                  {u.name[0]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:TG.text }}>{u.name}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:u.color, background:`${u.color}18`, border:`1px solid ${u.color}35`, borderRadius:20, padding:"1px 6px" }}>{u.tag}</span>
                  </div>
                  <div style={{ fontSize:10, color:TG.muted, marginTop:2 }}>
                    {u.handle} · {u.fuel}
                  </div>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:u.color }}>{u.spent}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountsTab() {
  const accounts = [
    { label:"PROMO_FUEL_01", phone:"+7 (916) 234-56-78", status:"idle",    sent:2140, limit:3000, color:TG.green },
    { label:"PROMO_FUEL_02", phone:"+7 (921) 345-67-89", status:"idle",    sent:1820, limit:3000, color:TG.green },
    { label:"PROMO_FUEL_03", phone:"+7 (903) 456-78-90", status:"sending", sent:980,  limit:3000, color:TG.blue },
    { label:"PROMO_FUEL_04", phone:"+7 (925) 567-89-01", status:"banned",  sent:3000, limit:3000, color:TG.red },
    { label:"PROMO_FUEL_05", phone:"+7 (968) 678-90-12", status:"idle",    sent:450,  limit:3000, color:TG.green },
  ];
  const statusMeta: Record<string, { label:string; color:string; bg:string }> = {
    idle:    { label:"Готов",        color:TG.green,  bg:`${TG.green}18` },
    sending: { label:"Отправка",     color:TG.blue,   bg:`${TG.blue}18` },
    banned:  { label:"Заблокирован", color:TG.red,    bg:`${TG.red}18` },
    paused:  { label:"Пауза",        color:TG.yellow, bg:`${TG.yellow}18` },
  };
  const totalSent = accounts.reduce((a, c) => a + c.sent, 0);
  const activeCount = accounts.filter(a => a.status !== "banned").length;

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:14, padding:"0 14px", paddingBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:4 }}>
        <div style={{ fontSize:18, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Аккаунты</div>
        <GlassCard style={{ padding:"8px 12px", borderRadius:14, cursor:"pointer" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Plus size={14} color={TG.pink} />
            <span style={{ fontSize:12, color:TG.pink, fontWeight:700 }}>Добавить</span>
          </div>
        </GlassCard>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          { label:"Всего",    value:String(accounts.length),        color:TG.text },
          { label:"Активных", value:String(activeCount),            color:TG.green },
          { label:"Сегодня",  value:totalSent.toLocaleString("ru"), color:TG.blue },
        ].map(s => (
          <GlassCard key={s.label} style={{ padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9, color:TG.muted, marginTop:2 }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {accounts.map(acc => {
          const sm = statusMeta[acc.status] ?? statusMeta.idle;
          const pct = Math.round(acc.sent / acc.limit * 100);
          return (
            <GlassCard key={acc.label} style={{ padding:"14px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:12,
                    background:`linear-gradient(145deg,${acc.color}30 0%,${acc.color}12 100%)`,
                    border:`1px solid ${acc.color}40`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <Shield size={16} color={acc.color} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:TG.text }}>{acc.label}</div>
                    <div style={{ fontSize:10, color:TG.muted }}>{acc.phone}</div>
                  </div>
                </div>
                <span style={{
                  fontSize:9, fontWeight:700,
                  color:sm.color, background:sm.bg,
                  border:`1px solid ${sm.color}40`,
                  borderRadius:20, padding:"3px 8px",
                }}>{sm.label}</span>
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:10, color:TG.muted }}>Дневной лимит</span>
                  <span style={{ fontSize:10, color:acc.color, fontWeight:700 }}>
                    {acc.sent.toLocaleString("ru")} / {acc.limit.toLocaleString("ru")}
                  </span>
                </div>
                <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.07)" }}>
                  <div style={{
                    height:"100%", borderRadius:2, width:`${pct}%`,
                    background:`linear-gradient(90deg,${acc.color},${acc.color}99)`,
                    boxShadow:`0 0 6px ${acc.color}88`,
                  }} />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

const TAB_COMPONENTS: Record<Tab, React.ReactNode> = {
  home:      <HomeTab />,
  campaigns: <CampaignsTab />,
  analytics: <AnalyticsTab />,
  audience:  <AudienceTab />,
  accounts:  <AccountsTab />,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div style={{
      width: "100vw",
      height: "100dvh",
      background: "#03040a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 430,
        height: "100%",
        maxHeight: 932,
        background: TG.bg,
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.7)",
      }}>
        <MeshBg />

        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 4,
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 5,
        }}>
          {TAB_COMPONENTS[activeTab]}
          <div style={{ height: 16 }} />
        </div>

        <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
          <BottomNav active={activeTab} onNav={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
