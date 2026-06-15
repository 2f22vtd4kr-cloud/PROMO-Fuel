import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, ChevronDown, ChevronUp, X, RotateCcw, Power, Trash2 } from "lucide-react";
import { api, SenderAccount } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard, StatusBadge } from "../components/GlassCard";
import { useSse } from "../lib/useSse";
import { haptic } from "../lib/haptics";

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone]       = useState("");
  const [label, setLabel]       = useState("");
  const [username, setUsername] = useState("");
  const [proxy, setProxy]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string|null>(null);

  async function submit() {
    if (!phone.trim()) { setError("Введите номер телефона"); return; }
    haptic.medium(); setBusy(true); setError(null);
    try {
      await api.createAccount({ phone: phone.trim(), label: label.trim()||undefined, username: username.trim()||undefined, proxy: proxy.trim()||undefined });
      haptic.success(); onDone();
    } catch (e: any) { setError(e?.message ?? "Ошибка"); haptic.error(); }
    setBusy(false);
  }

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, type = "text") => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={{ width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:14,padding:"12px 14px",fontSize:13,color:TG.text,outline:"none",boxSizing:"border-box" }} />
  );

  return (
    <GlassCard style={{ padding:"16px",marginBottom:8 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
        <span style={{ fontSize:14,fontWeight:700,color:TG.text }}>Новый аккаунт</span>
        <div onClick={onDone} style={{ cursor:"pointer",color:TG.muted,padding:4 }}><X size={16} /></div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {inp(phone, setPhone, "+7 (999) 000-00-00", "tel")}
        {inp(label, setLabel, "Метка (необяз.)")}
        {inp(username, setUsername, "@username (необяз.)")}
        {inp(proxy, setProxy, "proxy (необяз.)")}
        {error && <div style={{ fontSize:11,color:"#ff6b7a",padding:"6px 0" }}>{error}</div>}
        <button onClick={submit} disabled={busy} style={{ width:"100%",padding:"12px",borderRadius:14,background:TG.green,border:"none",fontSize:13,fontWeight:700,color:"#07090f",cursor:busy?"not-allowed":"pointer",opacity:busy?0.7:1 }}>
          {busy ? "Добавление…" : "Добавить аккаунт"}
        </button>
      </div>
    </GlassCard>
  );
}

function AccountCard({ acc, onRefresh }: { acc: SenderAccount; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy]         = useState(false);

  const statusColor = {
    idle:"#2de897", sending:"#6ba8e5", banned:"#ff6b7a", offline:"rgba(160,190,230,0.45)", flood:"#ffc946",
  }[acc.status] ?? "rgba(160,190,230,0.45)";

  const pct = acc.sent_today > 0 ? Math.min(100, Math.round(acc.sent_today / 300 * 100)) : 0;

  async function toggleActive() {
    haptic.medium(); setBusy(true);
    try {
      if (acc.is_active) await api.patchAccount(acc.id, { is_active: 0, status: "offline" } as any);
      else               await api.patchAccount(acc.id, { is_active: 1, status: "idle" } as any);
      haptic.success(); onRefresh();
    } catch { haptic.error(); } finally { setBusy(false); }
  }

  async function resetDaily() {
    haptic.medium(); setBusy(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/accounts/${acc.id}/reset-daily`, { method:"POST" });
      haptic.success(); onRefresh();
    } catch { haptic.error(); } finally { setBusy(false); }
  }

  async function deleteAcc() {
    haptic.warning(); setBusy(true);
    try { await api.deleteAccount(acc.id); haptic.success(); onRefresh(); }
    catch { haptic.error(); setBusy(false); }
  }

  return (
    <GlassCard style={{ padding:"14px" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:12,background:`linear-gradient(145deg,${statusColor}30 0%,${statusColor}12 100%)`,border:`1px solid ${statusColor}40`,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Shield size={16} color={statusColor} />
          </div>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:TG.text }}>{acc.label || `Account ${acc.id}`}</div>
            <div style={{ fontSize:10,color:TG.muted }}>{acc.phone}</div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          <StatusBadge status={acc.status} />
          <div onClick={() => { haptic.light(); setExpanded(o=>!o); }} style={{ width:26,height:26,borderRadius:8,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            {expanded ? <ChevronUp size={13} color={TG.muted} /> : <ChevronDown size={13} color={TG.muted} />}
          </div>
        </div>
      </div>

      {/* Daily quota bar */}
      <div style={{ marginBottom: expanded ? 12 : 0 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
          <span style={{ fontSize:10,color:TG.muted }}>Дневной лимит</span>
          <span style={{ fontSize:10,color:statusColor,fontWeight:700 }}>{acc.sent_today.toLocaleString("ru")} / 300</span>
        </div>
        <div style={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
          <div style={{ height:"100%",borderRadius:2,width:`${pct}%`,background:`linear-gradient(90deg,${statusColor},${statusColor}99)`,boxShadow:pct>0?`0 0 6px ${statusColor}66`:"none",transition:"width 0.6s ease" }} />
        </div>
      </div>

      {expanded && (
        <div style={{ display:"flex",gap:8,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:12 }}>
          <button onClick={toggleActive} disabled={busy} style={{ flex:1,padding:"9px 6px",borderRadius:12,background:acc.is_active?"rgba(255,107,122,0.12)":"rgba(45,232,151,0.12)",border:`1px solid ${acc.is_active?"rgba(255,107,122,0.3)":"rgba(45,232,151,0.3)"}`,fontSize:11,fontWeight:700,color:acc.is_active?"#ff6b7a":TG.green,cursor:busy?"not-allowed":"pointer",opacity:busy?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
            <Power size={11} />{acc.is_active ? "Откл." : "Вкл."}
          </button>
          <button onClick={resetDaily} disabled={busy} style={{ flex:1,padding:"9px 6px",borderRadius:12,background:"rgba(107,168,229,0.12)",border:"1px solid rgba(107,168,229,0.3)",fontSize:11,fontWeight:700,color:"#6ba8e5",cursor:busy?"not-allowed":"pointer",opacity:busy?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
            <RotateCcw size={11} />Сброс
          </button>
          <button onClick={deleteAcc} disabled={busy} style={{ width:36,padding:"9px 6px",borderRadius:12,background:"rgba(255,107,122,0.10)",border:"1px solid rgba(255,107,122,0.25)",cursor:busy?"not-allowed":"pointer",opacity:busy?0.5:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Trash2 size={12} color="#ff6b7a" />
          </button>
        </div>
      )}
    </GlassCard>
  );
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setAccounts(await api.getAccounts()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSse(() => { load(); });

  const active  = accounts.filter(a => a.is_active && a.status !== "banned").length;
  const totalSent = accounts.reduce((s, a) => s + (a.sent_today ?? 0), 0);

  return (
    <div className="tab-content" style={{ height:"100%",overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
      <div style={{ display:"flex",flexDirection:"column",gap:14,padding:"14px 14px 24px" }}>

        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontSize:18,fontWeight:800,color:TG.text,letterSpacing:"-0.02em" }}>Аккаунты</div>
          <GlassCard style={{ padding:"8px 12px",borderRadius:14,cursor:"pointer" }} onClick={() => { haptic.medium(); setShowForm(s=>!s); }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Plus size={14} color="#ff7eb3" />
              <span style={{ fontSize:12,color:"#ff7eb3",fontWeight:700 }}>Добавить</span>
            </div>
          </GlassCard>
        </div>

        {/* Summary 3-col */}
        {!loading && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[
              { label:"Всего",    value:String(accounts.length), color:TG.text },
              { label:"Активных", value:String(active),          color:TG.green },
              { label:"Сегодня",  value:totalSent.toLocaleString("ru"), color:"#6ba8e5" },
            ].map(s => (
              <GlassCard key={s.label} style={{ padding:"12px 10px",textAlign:"center" }}>
                <div style={{ fontSize:16,fontWeight:800,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:9,color:TG.muted,marginTop:2 }}>{s.label}</div>
              </GlassCard>
            ))}
          </div>
        )}

        {showForm && <AddAccountForm onDone={() => { setShowForm(false); load(); }} />}

        {loading ? (
          <div style={{ textAlign:"center",padding:"40px 0" }}>
            <div style={{ width:28,height:28,borderRadius:"50%",border:`2px solid ${TG.green}40`,borderTopColor:TG.green,animation:"spin 0.8s linear infinite",display:"inline-block" }} />
          </div>
        ) : accounts.length === 0 ? (
          <GlassCard style={{ padding:"32px 16px",textAlign:"center" }}>
            <div style={{ fontSize:14,color:TG.muted,marginBottom:12 }}>Аккаунтов нет</div>
            <div onClick={() => { haptic.medium(); setShowForm(true); }} style={{ fontSize:13,color:"#ff7eb3",fontWeight:700,cursor:"pointer" }}>+ Добавить первый аккаунт</div>
          </GlassCard>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {accounts.map(a => <AccountCard key={a.id} acc={a} onRefresh={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}
