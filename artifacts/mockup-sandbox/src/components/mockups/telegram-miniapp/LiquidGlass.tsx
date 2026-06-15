import { useState, useEffect, useRef } from "react";

/* ─── Inject keyframe animations once ─── */
const STYLES = `
  @keyframes floatOrb  { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(22px,-18px) scale(1.05)} 66%{transform:translate(-14px,20px) scale(0.96)} }
  @keyframes floatOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-18px,14px) scale(1.04)} 66%{transform:translate(16px,-18px) scale(0.97)} }
  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes fadeUp     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn    { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes shimmer    { 0%{background-position:-300px 0} 100%{background-position:300px 0} }
  @keyframes blinkColon { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes slideUp    { from{transform:translateY(110%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes toastIn    { from{opacity:0;transform:translateX(-50%) translateY(-14px) scale(0.9)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
  .lg-tap { transition: transform 0.11s ease, opacity 0.11s ease; cursor: pointer; }
  .lg-tap:active { transform: scale(0.945); opacity: 0.76; }
  .s1{animation-delay:0ms} .s2{animation-delay:60ms} .s3{animation-delay:120ms}
  .s4{animation-delay:180ms} .s5{animation-delay:240ms} .s6{animation-delay:300ms}
`;
if (!document.getElementById("lg-styles")) {
  const el = document.createElement("style");
  el.id = "lg-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Design tokens ─── */
const T = {
  bg: "#080c15",
  glass: "rgba(255,255,255,0.055)",
  glassMid: "rgba(255,255,255,0.09)",
  glassBorder: "rgba(255,255,255,0.11)",
  nav: "rgba(8,12,21,0.88)",
  blue: "#5b96d4",  blueGlow: "rgba(91,150,212,0.32)",  blueGrad: "linear-gradient(135deg,#85b8ef,#5b96d4)",
  green: "#2de897", greenGlow: "rgba(45,232,151,0.3)",   greenGrad: "linear-gradient(135deg,#2de897,#17a86a)",
  yellow:"#ffc946", yellowGlow:"rgba(255,201,70,0.3)",   yellowGrad:"linear-gradient(135deg,#ffc946,#d9852e)",
  purple:"#b39dff", purpleGlow:"rgba(179,157,255,0.3)",  purpleGrad:"linear-gradient(135deg,#b39dff,#7c5fcf)",
  red:   "#ff6b7a", redGlow:   "rgba(255,107,122,0.3)",  redGrad:   "linear-gradient(135deg,#ff6b7a,#c03040)",
  text:  "#eef2ff", textSec: "rgba(220,230,255,0.65)",  muted: "rgba(160,185,220,0.55)",
  border:"rgba(255,255,255,0.08)", inputBg:"rgba(255,255,255,0.045)", inputBorder:"rgba(255,255,255,0.13)",
};

/* ─── Mock data ─── */
const CAMPAIGNS = [
  { id:1, name:"Декабрьская акция",   status:"running",   sent:1240, total:2000 },
  { id:2, name:"Новогодняя рассылка", status:"scheduled", sent:0,    total:5000 },
  { id:3, name:"Реактивация базы",    status:"paused",    sent:890,  total:3500 },
  { id:4, name:"Прогрев аудитории",   status:"done",      sent:1800, total:1800 },
  { id:5, name:"Тест нового шаблона", status:"draft",     sent:0,    total:500  },
];
const ACCOUNTS = [
  { id:1, phone:"+79001234567", label:"Основной",   status:"running", active:true,  banned:false, sent:38, total:5200, errors:12 },
  { id:2, phone:"+79009876543", label:"Резервный 1", status:"idle",   active:true,  banned:false, sent:12, total:2100, errors:3  },
  { id:3, phone:"+79005551234", label:"Резервный 2", status:"offline",active:false, banned:false, sent:0,  total:900,  errors:0  },
  { id:4, phone:"+79001112233", label:"Забанен",     status:"banned", active:false, banned:true,  sent:0,  total:300,  errors:87 },
];
const STATUS_META: Record<string, { color:string; glow:string; grad:string; label:string }> = {
  running:   { color:T.green,  glow:T.greenGlow,  grad:T.greenGrad,  label:"Активна"       },
  scheduled: { color:T.yellow, glow:T.yellowGlow, grad:T.yellowGrad, label:"Запланирована" },
  paused:    { color:T.blue,   glow:T.blueGlow,   grad:T.blueGrad,   label:"Пауза"         },
  done:      { color:T.muted,  glow:"transparent",grad:"linear-gradient(135deg,#8aa3c0,#607080)",label:"Завершена"},
  draft:     { color:T.muted,  glow:"transparent",grad:"linear-gradient(135deg,#8aa3c0,#607080)",label:"Черновик" },
  cancelled: { color:T.red,    glow:T.redGlow,    grad:T.redGrad,    label:"Отменена"      },
};

/* ─── Helpers ─── */
function glass(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: T.glass, backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
    border:`1px solid ${T.glassBorder}`, borderRadius:22, position:"relative", overflow:"hidden",
    ...extra,
  };
}
function gradText(grad:string): React.CSSProperties {
  return { background:grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" };
}

/* ─── Mesh background ─── */
function Mesh() {
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#080c15 0%,#0c1428 35%,#0a1632 65%,#090e1c 100%)" }} />
      <div style={{ position:"absolute", top:-140, left:-80, width:440, height:440, borderRadius:"50%",
        background:"radial-gradient(circle at 40% 40%,rgba(91,150,212,0.2) 0%,transparent 70%)",
        animation:"floatOrb 10s ease-in-out infinite" }} />
      <div style={{ position:"absolute", bottom:60, right:-100, width:380, height:380, borderRadius:"50%",
        background:"radial-gradient(circle at 60% 60%,rgba(45,232,151,0.14) 0%,transparent 70%)",
        animation:"floatOrb2 12s ease-in-out infinite 3s" }} />
      <div style={{ position:"absolute", top:"40%", right:-50, width:280, height:280, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(179,157,255,0.11) 0%,transparent 70%)",
        animation:"floatOrb 14s ease-in-out infinite 6s" }} />
      <div style={{ position:"absolute", bottom:180, left:-60, width:220, height:220, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(255,201,70,0.08) 0%,transparent 70%)",
        animation:"floatOrb2 9s ease-in-out infinite 1.5s" }} />
    </div>
  );
}

/* ─── Top specular line ─── */
const Specular = () => (
  <div style={{ position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none",
    background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.16) 40%,rgba(255,255,255,0.16) 60%,transparent 100%)" }} />
);

/* ─── Glass card ─── */
function GlassCard({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={glass(s)}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,0.09) 0%,transparent 55%)", borderRadius:"inherit", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"relative", zIndex:1 }}>{children}</div>
    </div>
  );
}

/* ─── Header ─── */
function Header({ title, subtitle, right }: { title:string; subtitle?:string; right?:React.ReactNode }) {
  return (
    <div style={{ background:"rgba(8,12,21,0.78)", backdropFilter:"blur(44px)", WebkitBackdropFilter:"blur(44px)",
      borderBottom:`1px solid ${T.border}`, padding:"14px 15px 13px",
      display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, position:"relative" }}>
      <Specular />
      <div>
        <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.5px", ...gradText("linear-gradient(135deg,#eef2ff 0%,rgba(133,184,239,0.85) 100%)") }}>{title}</div>
        {subtitle && <div style={{ fontSize:11.5, color:T.muted, marginTop:2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/* ─── Live clock ─── */
function Clock() {
  const [t, setT] = useState(new Date());
  const [c, setC] = useState(true);
  useEffect(() => { const id = setInterval(() => { setT(new Date()); setC(x=>!x); }, 500); return ()=>clearInterval(id); }, []);
  const hh = t.getHours().toString().padStart(2,"0");
  const mm = t.getMinutes().toString().padStart(2,"0");
  return <span style={{ fontVariantNumeric:"tabular-nums" }}>{hh}<span style={{ animation:"blinkColon 1s step-start infinite" }}>:</span>{mm}</span>;
}

/* ─── Bottom nav ─── */
const NAV_ITEMS = [
  { id:"home",      label:"Главная",  color:T.blue,   icon:HomeIcon },
  { id:"campaigns", label:"Рассылки", color:T.green,  icon:MegaIcon },
  { id:"editor",    label:"Редактор", color:T.yellow, icon:PenIcon  },
  { id:"accounts",  label:"Аккаунты", color:T.purple, icon:UsersIcon},
];
function BottomNav({ tab, setTab }: { tab:string; setTab:(t:string)=>void }) {
  return (
    <div style={{ background:T.nav, backdropFilter:"blur(44px)", WebkitBackdropFilter:"blur(44px)",
      borderTop:`1px solid ${T.border}`, display:"flex", flexShrink:0, position:"relative",
      paddingBottom:"env(safe-area-inset-bottom,8px)" }}>
      <Specular />
      {NAV_ITEMS.map(({ id, label, color, icon: Icon }) => {
        const active = tab===id;
        return (
          <button key={id} onClick={()=>setTab(id)} className="lg-tap"
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              padding:"10px 0 8px", border:"none", background:"none", position:"relative" }}>
            {active && (
              <div style={{ position:"absolute", top:6, left:"50%", transform:"translateX(-50%)",
                width:52, height:40, borderRadius:14,
                background:`${color}18`, border:`1px solid ${color}28`,
                backdropFilter:"blur(12px)", boxShadow:`0 0 16px ${color}22` }} />
            )}
            {active && (
              <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)",
                width:4, height:4, borderRadius:2, background:color, boxShadow:`0 0 8px 2px ${color}88` }} />
            )}
            <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <Icon size={20} color={active?color:"rgba(160,185,220,0.38)"} weight={active?2.3:1.65} />
              <span style={{ fontSize:9.5, fontWeight:active?800:400, letterSpacing:"0.02em",
                color:active?color:"rgba(160,185,220,0.38)", textTransform:"uppercase" }}>{label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Mini icon SVGs ─── */
function HomeIcon({ size, color, weight }: { size:number; color:string; weight:number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function MegaIcon({ size, color, weight }: { size:number; color:string; weight:number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>;
}
function PenIcon({ size, color, weight }: { size:number; color:string; weight:number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z"/></svg>;
}
function UsersIcon({ size, color, weight }: { size:number; color:string; weight:number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function ChevRight({ color="rgba(160,185,220,0.25)" }: { color?:string }) {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function ChevDown({ color=T.muted }: { color?:string }) {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function ChevUp({ color=T.muted }: { color?:string }) {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
}
function ChevLeft({ color=T.text }: { color?:string }) {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function CheckCircle({ size=42, color=T.green }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function Activity({ size=14, color=T.green }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function RefreshCw({ size=13, color=T.muted, spin=false }: { size?:number; color?:string; spin?:boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animation:spin?"spin 0.72s linear infinite":"none" }}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
}
function Plus({ size=14, color="#fff" }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ShieldCheck({ size=18, color=T.green }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
}
function ShieldOff({ size=18, color=T.red }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19.69 14a6.9 6.9 0 00.31-2V5l-8-3-3.16 1.18"/><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 005.62-4.38"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function Send({ size=16, color="#fff" }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function XIcon({ size=16, color=T.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}

/* ─── Stat card ─── */
function StatCard({ label, value, color, glow, grad, icon: Icon, delta, idx }:
  { label:string; value:string; color:string; glow:string; grad:string; icon:React.ElementType<any>; delta?:string; idx:number }) {
  return (
    <div style={{ ...glass(), padding:"16px 15px 14px", animation:`fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${idx*60}ms both` }}>
      <div style={{ position:"absolute", top:-30, right:-30, width:90, height:90, borderRadius:"50%",
        background:`radial-gradient(circle,${glow} 0%,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,0.09) 0%,transparent 55%)", borderRadius:"inherit", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:`${color}18`, border:`1px solid ${color}2e`,
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 14px ${glow}` }}>
            <Icon size={14} color={color} weight={2.3} />
          </div>
          <span style={{ fontSize:10.5, color:T.muted, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" as const }}>{label}</span>
        </div>
        <div style={{ fontSize:26, fontWeight:900, letterSpacing:"-1px", lineHeight:1, ...gradText(grad) }}>{value}</div>
        {delta && (
          <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:4,
            background:`${T.green}14`, border:`1px solid ${T.green}22`, borderRadius:8, padding:"3px 8px" }}>
            <Activity size={9} color={T.green} />
            <span style={{ fontSize:10.5, color:T.green, fontWeight:700 }}>{delta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Campaign row ─── */
function CampaignRow({ c, onClick, last }: { c:typeof CAMPAIGNS[0]; onClick:()=>void; last:boolean }) {
  const meta = STATUS_META[c.status] ?? STATUS_META.draft;
  const pct = c.total > 0 ? Math.min((c.sent/c.total)*100,100) : 0;
  return (
    <div onClick={onClick} className="lg-tap"
      style={{ padding:"13px 15px", borderBottom:last?"none":`1px solid rgba(255,255,255,0.055)`,
        display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:`${meta.color}15`,
        border:`1px solid ${meta.color}28`, display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:`0 0 14px ${meta.glow}` }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:meta.color, boxShadow:`0 0 8px 3px ${meta.glow}` }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:600, letterSpacing:"-0.2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:T.text }}>{c.name}</div>
        <div style={{ marginTop:8, height:3, background:"rgba(255,255,255,0.055)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:3, width:`${pct}%`, background:meta.grad, boxShadow:`0 0 8px ${meta.glow}`, transition:"width 0.7s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
          <span style={{ fontSize:11, color:meta.color, fontWeight:700 }}>{meta.label}</span>
          <span style={{ fontSize:11, color:T.muted }}>{c.sent.toLocaleString("ru")} / {c.total.toLocaleString("ru")}</span>
        </div>
      </div>
      <ChevRight />
    </div>
  );
}

/* ─── HOME PAGE ─── */
function HomePage({ goEditor, goCampaigns }: { goEditor:()=>void; goCampaigns:()=>void }) {
  const [refreshing, setRefreshing] = useState(false);
  function fakeRefresh() { setRefreshing(true); setTimeout(()=>setRefreshing(false),1200); }

  const STATS = [
    { label:"Отправлено", value:"9 841",  color:T.blue,   glow:T.blueGlow,   grad:T.blueGrad,   delta:"↑ 12% сегодня", icon: (p:any)=><Send size={p.size} color={p.color} /> },
    { label:"Подписчики", value:"24 300", color:T.green,  glow:T.greenGlow,  grad:T.greenGrad,  icon: (p:any)=><UsersIcon size={p.size} color={p.color} weight={p.weight}/> },
    { label:"Open Rate",  value:"18.4%",  color:T.yellow, glow:T.yellowGlow, grad:T.yellowGrad, icon: (p:any)=><Activity size={p.size} color={p.color}/> },
    { label:"Кампаний",   value:"5",      color:T.purple, glow:T.purpleGlow, grad:T.purpleGrad, icon: (p:any)=><MegaIcon size={p.size} color={p.color} weight={p.weight}/> },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <Header title="RUProbe CRM" right={
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.textSec, background:"rgba(255,255,255,0.06)",
            border:`1px solid rgba(255,255,255,0.10)`, borderRadius:10, padding:"5px 10px" }}><Clock /></div>
          <button onClick={fakeRefresh} className="lg-tap" style={{ background:"rgba(255,255,255,0.06)",
            border:`1px solid rgba(255,255,255,0.10)`, borderRadius:10, padding:7, display:"flex", color:T.muted }}>
            <RefreshCw spin={refreshing} />
          </button>
          <div style={{ background:`${T.green}14`, border:`1px solid ${T.green}2a`,
            borderRadius:20, padding:"5px 11px", fontSize:11.5, color:T.green, fontWeight:800,
            display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:3, background:T.green,
              boxShadow:`0 0 8px 2px ${T.greenGlow}`, animation:"pulse 2s ease-in-out infinite" }} />
            Онлайн
          </div>
        </div>
      }/>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 20px" }}>
        {/* Hero */}
        <div style={{ ...glass({ padding:"18px 18px 16px", marginBottom:14,
          background:"linear-gradient(135deg,rgba(91,150,212,0.12) 0%,rgba(45,232,151,0.06) 100%)",
          border:"1px solid rgba(91,150,212,0.22)" }), animation:"fadeUp 0.38s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,0.09) 0%,transparent 55%)", borderRadius:"inherit", pointerEvents:"none" }} />
          <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:44, height:44, borderRadius:14, flexShrink:0,
              background:"linear-gradient(135deg,rgba(91,150,212,0.28),rgba(45,232,151,0.14))",
              border:"1px solid rgba(91,150,212,0.28)", display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 24px rgba(91,150,212,0.3)" }}>
              <Activity size={20} color="#85b8ef" />
            </div>
            <div>
              <div style={{ fontSize:12, color:T.muted, fontWeight:600, marginBottom:3, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>Активных кампаний</div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px", ...gradText("linear-gradient(135deg,#2de897,#5b96d4)") }}>
                1 сейчас работает
              </div>
            </div>
          </div>
        </div>
        {/* Stat grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          {STATS.map((s,i) => <StatCard key={s.label} {...s} idx={i} />)}
        </div>
        {/* Section header */}
        <div style={{ marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:10.5, fontWeight:800, color:T.muted, textTransform:"uppercase" as const, letterSpacing:"0.1em" }}>Рассылки</span>
          <button onClick={goCampaigns} className="lg-tap" style={{ fontSize:11.5, color:"#85b8ef",
            background:`${T.blue}15`, border:`1px solid ${T.blue}25`, borderRadius:9, padding:"4px 10px", fontWeight:700 }}>
            Все →
          </button>
        </div>
        {/* Campaign list */}
        <GlassCard style={{ marginBottom:16 }}>
          {CAMPAIGNS.slice(0,4).map((c,i) => <CampaignRow key={c.id} c={c} last={i===3} onClick={goCampaigns}/>)}
        </GlassCard>
        {/* CTA */}
        <button onClick={goEditor} className="lg-tap" style={{ width:"100%", padding:"16px 0",
          background:"linear-gradient(135deg,#5b96d4 0%,#3a6fad 100%)",
          border:"none", borderRadius:18, color:"#fff", fontSize:15, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center", gap:9,
          boxShadow:"0 6px 28px rgba(91,150,212,0.38),0 1px 0 rgba(255,255,255,0.18) inset",
          position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:"-40%", width:"40%", height:"100%",
            background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
            transform:"skewX(-20deg)", animation:"shimmer 3s ease-in-out infinite" }} />
          <Send size={16}/> Новая рассылка
        </button>
        <div style={{ height:8 }}/>
      </div>
    </div>
  );
}

/* ─── CAMPAIGNS PAGE ─── */
function CampaignsPage({ goEditor, goDetail }: { goEditor:()=>void; goDetail:(id:number)=>void }) {
  const [filter, setFilter] = useState("all");
  const filters = [
    { id:"all", label:"Все" }, { id:"running", label:"Активные", color:T.green },
    { id:"scheduled", label:"Планы", color:T.yellow }, { id:"draft", label:"Черновики" },
    { id:"done", label:"Завершённые" },
  ];
  const filtered = filter==="all" ? CAMPAIGNS : CAMPAIGNS.filter(c=>c.status===filter);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <Header title="Рассылки" subtitle={`${CAMPAIGNS.length} кампаний`}
        right={<button onClick={goEditor} className="lg-tap" style={{
          background:"linear-gradient(135deg,#5b96d4,#3a6fad)", border:"none", borderRadius:12,
          padding:"7px 14px", fontSize:13, fontWeight:800, color:"#fff",
          boxShadow:"0 4px 16px rgba(91,150,212,0.3)" }}>+ Новая</button>} />
      {/* Filter chips */}
      <div style={{ display:"flex", gap:6, padding:"10px 14px",
        borderBottom:`1px solid rgba(255,255,255,0.06)`, overflowX:"auto", flexShrink:0 }}>
        {filters.map(f=>{
          const active = filter===f.id;
          const c = (f as any).color ?? T.blue;
          return (
            <button key={f.id} onClick={()=>setFilter(f.id)} className="lg-tap" style={{ flexShrink:0,
              padding:"5px 14px", borderRadius:20,
              border:`1px solid ${active?`${c}40`:"rgba(255,255,255,0.08)"}`,
              background:active?`${c}16`:"rgba(255,255,255,0.04)",
              backdropFilter:"blur(10px)", color:active?c:T.muted,
              fontSize:11.5, fontWeight:active?800:400,
              boxShadow:active?`0 0 14px ${c}22`:"none" }}>{f.label}</button>
          );
        })}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
        {filtered.length===0
          ? <div style={{ padding:56, textAlign:"center" }}><div style={{ fontSize:36, marginBottom:12 }}>📭</div><div style={{ color:T.muted, fontSize:14 }}>Нет кампаний</div></div>
          : <GlassCard>{filtered.map((c,i)=><CampaignRow key={c.id} c={c} last={i===filtered.length-1} onClick={()=>goDetail(c.id)}/>)}</GlassCard>}
      </div>
    </div>
  );
}

/* ─── CAMPAIGN DETAIL ─── */
function CampaignDetail({ id, onBack, goEditor }: { id:number; onBack:()=>void; goEditor:()=>void }) {
  const campaign = CAMPAIGNS.find(c=>c.id===id)!;
  const meta = STATUS_META[campaign.status];
  const pct = campaign.total > 0 ? Math.min((campaign.sent/campaign.total)*100,100) : 0;
  const [toast, setToast] = useState<string|null>(null);
  function act(msg:string) { setToast(msg); setTimeout(()=>setToast(null),2000); }

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", animation:"fadeUp 0.36s cubic-bezier(0.16,1,0.3,1) both" }}>
      {toast && (
        <div style={{ position:"fixed", top:22, left:"50%",
          background:"rgba(12,18,32,0.94)", backdropFilter:"blur(44px)", WebkitBackdropFilter:"blur(44px)",
          border:`1px solid rgba(255,255,255,0.16)`, borderRadius:16, padding:"11px 22px",
          fontSize:13, zIndex:999, color:T.text, fontWeight:600,
          boxShadow:"0 10px 40px rgba(0,0,0,0.45)", animation:"toastIn 0.32s cubic-bezier(0.16,1,0.3,1) both",
          whiteSpace:"nowrap" }}>{toast}</div>
      )}
      <div style={{ background:"rgba(8,12,21,0.78)", backdropFilter:"blur(44px)", WebkitBackdropFilter:"blur(44px)",
        borderBottom:`1px solid ${T.border}`, padding:"13px 15px",
        display:"flex", alignItems:"center", gap:11, flexShrink:0, position:"relative" }}>
        <Specular />
        <button onClick={onBack} className="lg-tap" style={{ background:"rgba(255,255,255,0.07)",
          border:`1px solid rgba(255,255,255,0.11)`, borderRadius:11, padding:8, display:"flex", color:T.text }}>
          <ChevLeft />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.4px", overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap",
            ...gradText("linear-gradient(135deg,#eef2ff,rgba(200,220,255,0.8))") }}>{campaign.name}</div>
          <div style={{ fontSize:11.5, fontWeight:700, marginTop:3, display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:3, background:meta.color, boxShadow:`0 0 7px 2px ${meta.glow}` }}/>
            <span style={{ color:meta.color }}>{meta.label}</span>
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
        {/* Progress */}
        <GlassCard style={{ padding:"16px", marginBottom:12 }}>
          <div style={{ position:"absolute", top:-28, right:-28, width:90, height:90, borderRadius:"50%",
            background:`radial-gradient(circle,${meta.glow} 0%,transparent 70%)`, pointerEvents:"none" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:12, color:T.muted, fontWeight:600 }}>Прогресс рассылки</span>
            <span style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.3px", ...gradText(meta.grad) }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height:8, background:"rgba(255,255,255,0.055)", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:meta.grad, borderRadius:4,
              boxShadow:`0 0 14px ${meta.glow}` }}/>
          </div>
        </GlassCard>
        {/* KPI grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:12 }}>
          {[
            { label:"Отправлено",  value:campaign.sent.toLocaleString("ru"),  grad:T.blueGrad   },
            { label:"Получателей", value:campaign.total.toLocaleString("ru"), grad:T.greenGrad  },
            { label:"Ошибок",      value:"47",                                grad:T.redGrad    },
            { label:"Open Rate",   value:"22.1%",                             grad:T.yellowGrad },
          ].map(k=>(
            <GlassCard key={k.label} style={{ padding:"12px 13px" }}>
              <div style={{ fontSize:10.5, color:T.muted, fontWeight:600, marginBottom:7 }}>{k.label}</div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.5px", ...gradText(k.grad) }}>{k.value}</div>
            </GlassCard>
          ))}
        </div>
        {/* Message preview */}
        <GlassCard style={{ padding:"15px 16px", marginBottom:12 }}>
          <div style={{ fontSize:10.5, color:T.muted, fontWeight:800, marginBottom:10,
            textTransform:"uppercase" as const, letterSpacing:"0.08em" }}>Текст сообщения</div>
          <pre style={{ fontSize:13, color:T.text, whiteSpace:"pre-wrap", fontFamily:"inherit", lineHeight:1.65, margin:0 }}>
{`Привет, {first_name}! 👋

Мы рады сообщить вам о нашей декабрьской акции.
Скидка 30% на все товары до конца месяца!

Используйте промокод: DECEMBER30`}
          </pre>
        </GlassCard>
        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {campaign.status==="running" && (
            <button onClick={()=>act("На паузе")} className="lg-tap" style={{ width:"100%", padding:"14px",
              background:"rgba(255,255,255,0.055)", border:`1px solid rgba(255,255,255,0.10)`,
              borderRadius:17, color:T.textSec, fontSize:14, fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8, backdropFilter:"blur(10px)" }}>
              ⏸ Пауза
            </button>
          )}
          {(campaign.status==="paused"||campaign.status==="draft") && (
            <button onClick={()=>act("Запущена!")} className="lg-tap" style={{ width:"100%", padding:"14px",
              background:"linear-gradient(135deg,#5b96d4,#3a6fad)",
              border:"none", borderRadius:17, color:"#fff", fontSize:14, fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              boxShadow:"0 6px 24px rgba(91,150,212,0.38)" }}>
              ▶ Запустить
            </button>
          )}
          <button onClick={goEditor} className="lg-tap" style={{ width:"100%", padding:"14px",
            background:"rgba(255,255,255,0.055)", border:`1px solid rgba(255,255,255,0.10)`,
            borderRadius:17, color:T.textSec, fontSize:14, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8, backdropFilter:"blur(10px)" }}>
            ✏ Редактировать
          </button>
          <button onClick={()=>act("Кампания удалена")} className="lg-tap" style={{ width:"100%", padding:"14px",
            background:"rgba(255,107,122,0.07)", border:`1px solid rgba(255,107,122,0.22)`,
            borderRadius:17, color:T.red, fontSize:14, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8, backdropFilter:"blur(10px)" }}>
            🗑 Удалить
          </button>
        </div>
        <div style={{ height:16 }}/>
      </div>
    </div>
  );
}

/* ─── EDITOR PAGE ─── */
function EditorPage({ onDone }: { onDone:()=>void }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [textFocus, setTextFocus] = useState(false);
  const valid = name.trim().length>0 && text.trim().length>0;

  function handleSave() {
    if (!valid || busy) return;
    setBusy(true);
    setTimeout(()=>{ setBusy(false); setSuccess(true); setTimeout(()=>{ setSuccess(false); onDone(); },1500); }, 800);
  }

  const inputStyle = (focused:boolean): React.CSSProperties => ({
    width:"100%", padding:"13px 15px",
    background:focused?"rgba(91,150,212,0.07)":T.inputBg,
    backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${focused?"rgba(91,150,212,0.45)":T.inputBorder}`,
    borderRadius:15, color:T.text, fontSize:14, outline:"none",
    boxSizing:"border-box" as const, transition:"border-color 0.2s, background 0.2s",
  });

  if (success) return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <Header title="Новая рассылка" subtitle="Создать кампанию" />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, animation:"scaleIn 0.38s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ width:88, height:88, borderRadius:28, position:"relative", overflow:"hidden",
          background:"radial-gradient(circle at 40% 30%,rgba(45,232,151,0.3) 0%,rgba(45,232,151,0.08) 100%)",
          border:`1px solid rgba(45,232,151,0.3)`, backdropFilter:"blur(44px)", WebkitBackdropFilter:"blur(44px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 0 48px rgba(45,232,151,0.3),0 1px 0 rgba(255,255,255,0.15) inset" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"50%",
            background:"linear-gradient(180deg,rgba(255,255,255,0.12),transparent)", borderRadius:"28px 28px 0 0" }}/>
          <CheckCircle size={42} color={T.green} />
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.5px", marginBottom:8,
            ...gradText("linear-gradient(135deg,#2de897,#5b96d4)") }}>Создана!</div>
          <div style={{ fontSize:13, color:T.muted }}>Переходим к рассылкам...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <Header title="Новая рассылка" subtitle="Создать кампанию"/>
      <div style={{ flex:1, overflowY:"auto", padding:"18px 15px 28px" }}>
        {/* Name */}
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", fontSize:10.5, color:T.muted, fontWeight:800,
            textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:8 }}>Название</label>
          <input type="text" style={inputStyle(nameFocus)} value={name}
            onChange={e=>setName(e.target.value)} onFocus={()=>setNameFocus(true)} onBlur={()=>setNameFocus(false)}
            placeholder="Например: Акция декабрь" />
        </div>
        {/* Text */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <label style={{ fontSize:10.5, color:T.muted, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.08em" }}>Текст сообщения</label>
            <span style={{ fontSize:11, color:T.muted }}>{text.length}</span>
          </div>
          {/* Var chips */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginBottom:10 }}>
            {["{first_name}","{username}","{promo}"].map(v=>(
              <button key={v} onClick={()=>setText(t=>t+v)} className="lg-tap" style={{ padding:"5px 11px",
                borderRadius:10, border:`1px solid rgba(91,150,212,0.28)`, background:"rgba(91,150,212,0.09)",
                backdropFilter:"blur(10px)", color:"#85b8ef", fontSize:11, fontFamily:"monospace", fontWeight:700 }}>{v}</button>
            ))}
          </div>
          <textarea style={{ ...inputStyle(textFocus), resize:"none" as const, lineHeight:1.6, fontFamily:"inherit", minHeight:160 }}
            value={text} onChange={e=>setText(e.target.value)}
            onFocus={()=>setTextFocus(true)} onBlur={()=>setTextFocus(false)}
            placeholder={"Привет, {first_name}! 👋\n\nПишем тебе, потому что..."} />
        </div>
        {/* Schedule */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <label style={{ fontSize:10.5, color:T.muted, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.08em" }}>Запланировать</label>
            <button onClick={()=>setScheduleMode(m=>!m)} className="lg-tap" style={{ padding:"5px 14px",
              borderRadius:20, fontSize:11, fontWeight:800,
              border:`1px solid ${scheduleMode?"rgba(255,201,70,0.38)":"rgba(255,255,255,0.11)"}`,
              background:scheduleMode?"rgba(255,201,70,0.12)":"rgba(255,255,255,0.05)",
              color:scheduleMode?T.yellow:T.muted,
              boxShadow:scheduleMode?"0 0 14px rgba(255,201,70,0.18)":"none" }}>
              {scheduleMode?"Вкл":"Выкл"}
            </button>
          </div>
          {scheduleMode && (
            <input type="datetime-local" style={{ ...inputStyle(false), marginTop:12, colorScheme:"dark" as any }} />
          )}
        </div>
        {/* Buttons */}
        <button onClick={handleSave} disabled={!valid||busy} className="lg-tap" style={{ width:"100%", padding:"16px",
          background:valid?"linear-gradient(135deg,#5b96d4,#3a6fad)":"rgba(255,255,255,0.06)",
          border:"none", borderRadius:18, color:"#fff", fontSize:15, fontWeight:800,
          cursor:valid&&!busy?"pointer":"not-allowed", opacity:busy?0.68:1,
          boxShadow:valid?"0 6px 28px rgba(91,150,212,0.38),0 1px 0 rgba(255,255,255,0.18) inset":"none",
          position:"relative", overflow:"hidden" }}>
          {valid && <div style={{ position:"absolute", top:0, left:"-60%", width:"50%", height:"100%",
            background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
            transform:"skewX(-20deg)", animation:"shimmer 3s ease-in-out infinite" }}/>}
          {busy?"Сохраняем...":"Создать рассылку"}
        </button>
        <div style={{ height:24 }}/>
      </div>
    </div>
  );
}

/* ─── ACCOUNTS PAGE ─── */
function AccountsPage() {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number|null>(null);

  function accColor(a:typeof ACCOUNTS[0]) { return a.banned?T.red:!a.active?T.muted:a.status==="running"?T.green:T.blue; }
  function accGlow(a:typeof ACCOUNTS[0])  { return a.banned?T.redGlow:!a.active?"transparent":a.status==="running"?T.greenGlow:T.blueGlow; }
  function accGrad(a:typeof ACCOUNTS[0])  { return a.banned?T.redGrad:!a.active?"linear-gradient(135deg,#8aa3c0,#607080)":a.status==="running"?T.greenGrad:T.blueGrad; }
  function accLabel(a:typeof ACCOUNTS[0]) { return a.banned?"Бан":!a.active?"Выкл":a.status==="running"?"В работе":"Ожидание"; }

  const active = ACCOUNTS.filter(a=>a.active&&!a.banned).length;
  const banned = ACCOUNTS.filter(a=>a.banned).length;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", position:"relative" }}>
      {showForm && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.65)",
          backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
          display:"flex", alignItems:"flex-end" }}>
          <div className="lg-tap" style={{ width:"100%", background:"rgba(10,15,28,0.96)",
            backdropFilter:"blur(44px)", WebkitBackdropFilter:"blur(44px)",
            borderRadius:"26px 26px 0 0", border:`1px solid rgba(255,255,255,0.13)`, borderBottom:"none",
            padding:"24px 17px 40px", boxShadow:"0 -24px 64px rgba(0,0,0,0.5)",
            position:"relative", overflow:"hidden", animation:"slideUp 0.44s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
              background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)" }}/>
            <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.15)", margin:"-10px auto 18px" }}/>
            <div style={{ display:"flex", alignItems:"center", marginBottom:20 }}>
              <div style={{ flex:1, fontSize:18, fontWeight:900, letterSpacing:"-0.4px",
                ...gradText("linear-gradient(135deg,#eef2ff,rgba(133,184,239,0.8))") }}>Добавить аккаунт</div>
              <button onClick={()=>setShowForm(false)} className="lg-tap" style={{ background:"rgba(255,255,255,0.08)",
                border:`1px solid rgba(255,255,255,0.12)`, borderRadius:11, padding:8, display:"flex", color:T.muted }}>
                <XIcon size={16}/>
              </button>
            </div>
            {["Телефон (+7...)", "Метка (необязательно)", "Username (без @)"].map(ph=>(
              <input key={ph} type="text" placeholder={ph} style={{ width:"100%", padding:"12px 14px", marginBottom:10,
                background:T.inputBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
                border:`1px solid ${T.inputBorder}`, borderRadius:13, color:T.text, fontSize:14,
                outline:"none", boxSizing:"border-box" as const }} />
            ))}
            <button onClick={()=>setShowForm(false)} style={{ width:"100%", padding:"15px", marginTop:4,
              background:"linear-gradient(135deg,#5b96d4,#3a6fad)", border:"none", borderRadius:16,
              color:"#fff", fontSize:15, fontWeight:800,
              boxShadow:"0 6px 28px rgba(91,150,212,0.38),0 1px 0 rgba(255,255,255,0.18) inset" }}>
              Добавить аккаунт
            </button>
          </div>
        </div>
      )}

      <Header title="Аккаунты" subtitle={`${active} активных · ${banned} забанено · ${ACCOUNTS.length} всего`}
        right={
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowForm(true)} className="lg-tap" style={{
              background:"linear-gradient(135deg,#5b96d4,#3a6fad)", border:"none", borderRadius:12,
              padding:"7px 13px", fontSize:13, fontWeight:800, color:"#fff",
              display:"flex", alignItems:"center", gap:5, boxShadow:"0 4px 16px rgba(91,150,212,0.3)" }}>
              <Plus size={14}/> Добавить
            </button>
          </div>
        }/>

      <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
        {ACCOUNTS.map((acc,idx) => {
          const color = accColor(acc); const glow = accGlow(acc); const grad = accGrad(acc);
          const pct = Math.min((acc.sent/50)*100,100);
          const barColor = pct>90?T.red:pct>70?T.yellow:T.green;
          const open = expanded===acc.id;
          return (
            <div key={acc.id} style={{ ...glass({ marginBottom:10 }), animation:`fadeUp 0.38s cubic-bezier(0.16,1,0.3,1) ${idx*60}ms both` }}>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,0.09) 0%,transparent 55%)", borderRadius:"inherit", pointerEvents:"none" }} />
              <div onClick={()=>setExpanded(open?null:acc.id)} style={{ padding:"15px 16px", cursor:"pointer", position:"relative", zIndex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:14, flexShrink:0, background:`${color}14`,
                    border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:acc.active&&!acc.banned?`0 0 20px ${glow}`:"none", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:"50%", background:"linear-gradient(180deg,rgba(255,255,255,0.10),transparent)" }}/>
                    {acc.banned ? <ShieldOff size={18} color={color}/> : <ShieldCheck size={18} color={color}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:T.text }}>{acc.label}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{acc.phone}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                    <div style={{ fontSize:10.5, fontWeight:800, ...gradText(grad) }}>{accLabel(acc)}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{acc.sent}/50</div>
                  </div>
                  {open ? <ChevUp/> : <ChevDown/>}
                </div>
                <div style={{ marginTop:12, height:3, background:"rgba(255,255,255,0.055)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, borderRadius:3, background:barColor, boxShadow:`0 0 8px ${barColor}88` }}/>
                </div>
              </div>
              {open && (
                <div style={{ borderTop:`1px solid rgba(255,255,255,0.07)`, padding:"14px 16px", position:"relative", zIndex:1 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:13 }}>
                    {[
                      { label:"Всего отправлено", value:acc.total.toLocaleString("ru"), grad:T.blueGrad },
                      { label:"Ошибок", value:acc.errors.toString(), grad:acc.errors>0?T.redGrad:"linear-gradient(135deg,#8aa3c0,#607080)" },
                    ].map(k=>(
                      <div key={k.label} style={{ background:"rgba(255,255,255,0.038)", border:`1px solid rgba(255,255,255,0.07)`, borderRadius:13, padding:"11px 13px" }}>
                        <div style={{ fontSize:10.5, color:T.muted, marginBottom:6 }}>{k.label}</div>
                        <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.3px", ...gradText(k.grad) }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="lg-tap" style={{ flex:1, padding:"10px", borderRadius:13,
                      background:acc.active?"rgba(255,107,122,0.09)":"rgba(91,150,212,0.09)",
                      border:`1px solid ${acc.active?"rgba(255,107,122,0.28)":"rgba(91,150,212,0.28)"}`,
                      color:acc.active?T.red:"#85b8ef", fontSize:13, fontWeight:700 }}>
                      {acc.active?"Деактивировать":"Активировать"}
                    </button>
                    <button className="lg-tap" style={{ padding:"10px 14px", borderRadius:13,
                      background:"rgba(255,107,122,0.06)", border:`1px solid rgba(255,107,122,0.18)`,
                      color:T.red, fontSize:13 }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ height:8 }}/>
      </div>
    </div>
  );
}

/* ─── ROOT ─── */
export function LiquidGlass() {
  const [tab, setTab]       = useState("home");
  const [detail, setDetail] = useState<number|null>(null);
  const [inEditor, setInEditor] = useState(false);

  function goDetail(id:number)  { setDetail(id); setTab("campaigns"); }
  function goEditor()           { setInEditor(true); setTab("editor"); }
  function goEditorDone()       { setInEditor(false); setTab("campaigns"); }
  function goCampaigns()        { setDetail(null); setTab("campaigns"); }

  function handleTabChange(t:string) {
    if (t!=="editor") setInEditor(false);
    if (t!=="campaigns") setDetail(null);
    setTab(t);
  }

  return (
    <div style={{
      width:430, height:932, maxWidth:"100vw", maxHeight:"100dvh",
      display:"flex", flexDirection:"column", overflow:"hidden",
      background:"#080c15", position:"relative",
      fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
      color:T.text, WebkitFontSmoothing:"antialiased",
    }}>
      <Mesh />
      <div style={{ flex:1, overflow:"hidden", position:"relative", zIndex:1 }}>
        {tab==="home"      && <HomePage goEditor={goEditor} goCampaigns={goCampaigns}/>}
        {tab==="campaigns" && !detail && <CampaignsPage goEditor={goEditor} goDetail={goDetail}/>}
        {tab==="campaigns" && !!detail && <CampaignDetail id={detail} onBack={()=>setDetail(null)} goEditor={goEditor}/>}
        {tab==="editor"    && <EditorPage onDone={goEditorDone}/>}
        {tab==="accounts"  && <AccountsPage/>}
      </div>
      <div style={{ position:"relative", zIndex:2 }}>
        <BottomNav tab={tab} setTab={handleTabChange}/>
      </div>
    </div>
  );
}
