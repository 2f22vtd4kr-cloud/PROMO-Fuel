import { useState } from "react";
import { Shield, Phone, Plus, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, RotateCcw, Trash2, AlertCircle } from "lucide-react";

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

const STATUS: Record<string, { color: string; glow: string; label: string; dot: string }> = {
  idle:    { color:TG.green,  glow:TG.greenGlow,  label:"В сети",   dot:TG.green },
  sending: { color:TG.blue,   glow:TG.blueGlow,   label:"Рассылка", dot:TG.blue },
  banned:  { color:TG.red,    glow:TG.redGlow,    label:"Заблокирован", dot:TG.red },
  flood:   { color:TG.yellow, glow:TG.yellowGlow, label:"Флуд-лимит", dot:TG.yellow },
};

const ACCOUNTS_DATA = [
  { id:1, phone:"+7 (495) 123-45-67", status:"idle",    sent:142, limit:300, enabled:true },
  { id:2, phone:"+7 (916) 234-56-78", status:"sending", sent:278, limit:300, enabled:true },
  { id:3, phone:"+7 (926) 345-67-89", status:"flood",   sent:300, limit:300, enabled:false },
  { id:4, phone:"+7 (985) 456-78-90", status:"banned",  sent:0,   limit:300, enabled:false },
];

function AccountCard({ acc }: { acc: typeof ACCOUNTS_DATA[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(acc.enabled);
  const st = STATUS[acc.status];
  const pct = Math.round((acc.sent / acc.limit) * 100);

  return (
    <GlassCard glow={expanded ? `${st.glow}25` : undefined} style={{ overflow:"visible" }}>
      <div style={{ padding:"14px" }}>
        {/* Top row */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:`linear-gradient(145deg,${st.color}25 0%,${st.color}08 100%)`, border:`1px solid ${st.color}40`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", flexShrink:0, boxShadow:`0 0 12px ${st.glow}30` }}>
            <Phone size={14} color={st.color} />
            <div style={{ position:"absolute", bottom:-2, right:-2, width:9, height:9, borderRadius:"50%", background:st.dot, border:`1.5px solid ${TG.bg}`, boxShadow:`0 0 5px ${st.glow}` }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:TG.text }}>{acc.phone}</div>
            <span style={{ fontSize:9, fontWeight:700, color:st.color, background:`${st.color}18`, border:`1px solid ${st.color}35`, borderRadius:20, padding:"2px 7px" }}>{st.label}</span>
          </div>
          <button onClick={() => setExpanded(e => !e)} style={{ background:"none", border:"none", cursor:"pointer", color:TG.muted, padding:4 }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Quota bar */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:9, color:TG.muted }}>Суточный лимит</span>
            <span style={{ fontSize:9, fontWeight:700, color: pct >= 100 ? TG.red : pct >= 80 ? TG.yellow : st.color }}>
              {acc.sent} / {acc.limit} ({pct}%)
            </span>
          </div>
          <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:3,
              width:`${Math.min(pct, 100)}%`,
              background: pct >= 100 ? `linear-gradient(90deg,${TG.red},${TG.red}bb)` : pct >= 80 ? `linear-gradient(90deg,${TG.yellow},${TG.yellow}bb)` : `linear-gradient(90deg,${st.color},${st.color}bb)`,
              boxShadow:`0 0 6px ${pct >= 100 ? TG.redGlow : pct >= 80 ? TG.yellowGlow : st.glow}`,
              transition:"width 0.5s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>

        {/* Expanded controls */}
        {expanded && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => setEnabled(e => !e)} style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 10px",
              background: enabled ? `${TG.green}14` : "rgba(255,255,255,0.05)",
              border:`1px solid ${enabled ? `${TG.green}40` : "rgba(255,255,255,0.10)"}`,
              borderRadius:12, cursor:"pointer",
            }}>
              {enabled ? <ToggleRight size={14} color={TG.green} /> : <ToggleLeft size={14} color={TG.muted} />}
              <span style={{ fontSize:10, fontWeight:700, color: enabled ? TG.green : TG.muted }}>
                {enabled ? "Вкл" : "Выкл"}
              </span>
            </button>
            <button style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 10px", background:"rgba(107,168,229,0.10)", border:`1px solid ${TG.blue}35`, borderRadius:12, cursor:"pointer" }}>
              <RotateCcw size={12} color={TG.blue} />
              <span style={{ fontSize:10, fontWeight:700, color:TG.blue }}>Сбросить</span>
            </button>
            <button style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"8px 10px", background:"rgba(255,107,122,0.10)", border:`1px solid ${TG.red}35`, borderRadius:12, cursor:"pointer" }}>
              <Trash2 size={12} color={TG.red} />
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export function PerfectAccounts() {
  const [showAdd, setShowAdd] = useState(false);
  const active = ACCOUNTS_DATA.filter(a => a.enabled && a.status !== "banned").length;
  const banned = ACCOUNTS_DATA.filter(a => a.status === "banned").length;
  const flood  = ACCOUNTS_DATA.filter(a => a.status === "flood").length;

  return (
    <div style={{ width:"100%", height:"100%", background:TG.bg, overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", position:"relative" }}>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(0,0);}  50%{transform:translate(10px,-12px);} }
        @keyframes floatB { 0%,100%{transform:translate(0,0);}  50%{transform:translate(-12px,10px);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}  to{opacity:1;transform:translateY(0);} }
        .pfac-page { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-5%", right:"-8%", width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,126,179,0.14) 0%, transparent 70%)", filter:"blur(44px)", animation:"floatA 10s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"15%", left:"-6%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(45,232,151,0.11) 0%, transparent 70%)", filter:"blur(38px)", animation:"floatB 13s ease-in-out infinite" }} />
      </div>

      <div className="pfac-page" style={{ position:"relative", zIndex:5, height:"100%", overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:12, padding:"16px 14px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:17, fontWeight:800, color:TG.text, letterSpacing:"-0.02em" }}>Аккаунты</div>
          <button onClick={() => setShowAdd(s => !s)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 11px", background: showAdd ? `${TG.purple}20` : TG.lgSurface, backdropFilter: BLUR, WebkitBackdropFilter: BLUR, border:`1px solid ${showAdd ? `${TG.purple}50` : TG.glassBorderStrong}`, borderRadius:13, cursor:"pointer" }}>
            <Plus size={13} color={showAdd ? TG.purple : TG.green} />
            <span style={{ fontSize:11, color:showAdd ? TG.purple : TG.green, fontWeight:700 }}>Добавить</span>
          </button>
        </div>

        {/* Health overview */}
        <GlassCard style={{ padding:"12px 14px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { label:"Активных", value:active, color:TG.green },
              { label:"Флуд",     value:flood,  color:TG.yellow },
              { label:"Блок",     value:banned, color:TG.red },
            ].map(s => (
              <div key={s.label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, letterSpacing:"-0.03em", lineHeight:1, filter:`drop-shadow(0 0 10px ${s.color}60)` }}>{s.value}</div>
                <div style={{ fontSize:9, color:TG.muted, marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {banned > 0 && (
            <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:6 }}>
              <AlertCircle size={12} color={TG.yellow} />
              <span style={{ fontSize:10, color:TG.yellow }}>1 аккаунт заблокирован — требует внимания</span>
            </div>
          )}
        </GlassCard>

        {/* Add form */}
        {showAdd && (
          <GlassCard glow={`${TG.purpleGlow}25`} style={{ padding:"14px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:TG.text, marginBottom:10 }}>Новый аккаунт</div>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 12px" }}>
                <input placeholder="+7 (___) ___-__-__" style={{ background:"none", border:"none", outline:"none", fontSize:13, color:TG.text, width:"100%" }} />
              </div>
              <button style={{ padding:"10px 14px", background:`linear-gradient(145deg,${TG.purple}30 0%,${TG.purple}10 100%)`, border:`1px solid ${TG.purple}50`, borderRadius:12, cursor:"pointer", color:TG.purple, fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
                + Добавить
              </button>
            </div>
          </GlassCard>
        )}

        {/* Account cards */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ACCOUNTS_DATA.map(a => <AccountCard key={a.id} acc={a} />)}
        </div>

        {/* Hint */}
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 12px", background:"rgba(107,168,229,0.07)", border:"1px solid rgba(107,168,229,0.18)", borderRadius:14 }}>
          <Shield size={13} color={TG.blue} />
          <span style={{ fontSize:10, color:TG.textSecondary, lineHeight:1.4 }}>Используйте разные аккаунты для рассылок, чтобы избежать блокировок</span>
        </div>
      </div>
    </div>
  );
}
