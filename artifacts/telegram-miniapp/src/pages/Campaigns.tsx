import { useState, useEffect, useCallback } from "react";
import { Plus, Pause, Play, MoreHorizontal, Clock, Copy, Trash2, Settings } from "lucide-react";
import { api, Campaign } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard, StatusBadge } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const STATUS_ORDER = ["sending", "running", "scheduled", "paused", "draft", "sent", "done"];
function statusPriority(s: string) { const i = STATUS_ORDER.indexOf(s); return i === -1 ? 99 : i; }

function CampaignCard({ campaign, onEdit, onRefresh }: {
  campaign: Campaign; onEdit: (id: number) => void; onRefresh: () => void;
}) {
  const [busy, setBusy]         = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showText, setShowText] = useState(false);

  const isActive   = campaign.status === "running" || campaign.status === "sending";
  const isPaused   = campaign.status === "paused";
  const isEditable = campaign.status === "draft" || campaign.status === "scheduled";
  const pct = campaign.target_count > 0
    ? Math.min(100, Math.round(campaign.sent_count / campaign.target_count * 100)) : 0;
  const color = isActive ? TG.green : isPaused ? "#6ba8e5" : "rgba(160,190,230,0.40)";

  async function togglePause() {
    haptic.medium(); setBusy(true);
    try { await api.actionCampaign(campaign.id, isActive ? "pause" : "resume"); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  async function launchDraft() {
    haptic.medium(); setBusy(true);
    try { await api.actionCampaign(campaign.id, "running"); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }
  async function duplicate() {
    haptic.medium(); setMenuOpen(false);
    try { await api.duplicateCampaign(campaign.id); haptic.success(); onRefresh(); } catch { haptic.error(); }
  }
  async function deleteCampaign() {
    haptic.warning(); setMenuOpen(false);
    try { await api.deleteCampaign(campaign.id); haptic.success(); onRefresh(); } catch { haptic.error(); }
  }

  const d = new Date(campaign.scheduled_at ?? campaign.created_at);
  const dateStr = campaign.scheduled_at
    ? `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`
    : d.toLocaleDateString("ru");

  return (
    <GlassCard style={{ padding:"14px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:TG.text, marginBottom:5, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
            {campaign.name}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <StatusBadge status={campaign.status} />
            <span style={{ fontSize:10, color:TG.muted, display:"flex", alignItems:"center", gap:3 }}>
              <Clock size={9} /> {dateStr}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:8 }}>
          {(isActive || isPaused) && (
            <div onClick={togglePause} style={{ width:28,height:28,borderRadius:9,background:`${isActive?TG.green:"#6ba8e5"}18`,border:`1px solid ${isActive?TG.green:"#6ba8e5"}35`,display:"flex",alignItems:"center",justifyContent:"center",cursor:busy?"not-allowed":"pointer",opacity:busy?0.5:1 }}>
              {isActive ? <Pause size={12} color={TG.green} /> : <Play size={12} color="#6ba8e5" />}
            </div>
          )}
          {campaign.status === "draft" && (
            <div onClick={launchDraft} style={{ height:28,borderRadius:9,background:`${TG.green}20`,border:`1px solid ${TG.green}40`,display:"flex",alignItems:"center",justifyContent:"center",cursor:busy?"not-allowed":"pointer",opacity:busy?0.7:1,padding:"0 10px",gap:5 }}>
              <Play size={11} color={TG.green} />
              <span style={{ fontSize:10,fontWeight:700,color:TG.green }}>Запустить</span>
            </div>
          )}
          {isEditable && (
            <div onClick={() => { haptic.light(); onEdit(campaign.id); }} style={{ width:28,height:28,borderRadius:9,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <Settings size={12} color={TG.muted} />
            </div>
          )}
          <div onClick={() => { haptic.light(); setMenuOpen(o=>!o); }} style={{ width:28,height:28,borderRadius:9,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative" }}>
            <MoreHorizontal size={13} color={TG.muted} />
            {menuOpen && (
              <div onClick={e => e.stopPropagation()} style={{ position:"absolute",top:32,right:0,zIndex:50,background:"rgba(7,9,20,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:14,overflow:"hidden",minWidth:160,boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
                <div onClick={duplicate} style={{ padding:"11px 14px",display:"flex",alignItems:"center",gap:9,cursor:"pointer" }}>
                  <Copy size={13} color={TG.muted} /><span style={{ fontSize:13,color:TG.text }}>Дублировать</span>
                </div>
                <div style={{ height:1,background:"rgba(255,255,255,0.07)" }} />
                <div onClick={deleteCampaign} style={{ padding:"11px 14px",display:"flex",alignItems:"center",gap:9,cursor:"pointer" }}>
                  <Trash2 size={13} color="#ff6b7a" /><span style={{ fontSize:13,color:"#ff6b7a" }}>Удалить</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {campaign.target_count > 0 && (
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
            <span style={{ fontSize:10,color:TG.muted }}>Отправлено</span>
            <span style={{ fontSize:10,color:color,fontWeight:700 }}>
              {campaign.sent_count.toLocaleString("ru")} / {campaign.target_count.toLocaleString("ru")} ({pct}%)
            </span>
          </div>
          <div style={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:2,width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}aa)`,boxShadow:pct>0?`0 0 6px ${color}88`:"none",transition:"width 0.6s ease" }} />
          </div>
        </div>
      )}

      {campaign.text_template && (
        <div style={{ marginTop:10 }}>
          <div onClick={() => { haptic.light(); setShowText(p => !p); }} style={{ display:"flex",alignItems:"center",gap:5,cursor:"pointer" }}>
            <span style={{ fontSize:10,color:TG.blue,fontWeight:600 }}>{showText ? "Скрыть текст" : "Показать текст"}</span>
            <span style={{ fontSize:10,color:TG.blue,transform:showText?"rotate(180deg)":"rotate(0)",display:"inline-block",transition:"transform 0.2s" }}>▾</span>
          </div>
          {showText && (
            <div style={{ marginTop:8,padding:"10px 12px",background:"rgba(107,168,229,0.07)",border:"1px solid rgba(107,168,229,0.18)",borderRadius:10,fontSize:12,color:TG.textSecondary,lineHeight:1.55,wordBreak:"break-word" }}>
              {campaign.text_template}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

export function CampaignsPage({ onEdit }: { onEdit: (id?: number) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    try {
      const cs = await api.getCampaigns();
      setCampaigns(cs.sort((a, b) => statusPriority(a.status) - statusPriority(b.status)));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active    = campaigns.filter(c => c.status==="running"||c.status==="sending").length;
  const scheduled = campaigns.filter(c => c.status==="scheduled").length;
  const paused    = campaigns.filter(c => c.status==="paused").length;

  return (
    <div className="tab-content" style={{ height:"100%",overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
      <div style={{ display:"flex",flexDirection:"column",gap:14,padding:"14px 14px 24px" }}>

        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontSize:18,fontWeight:800,color:TG.text,letterSpacing:"-0.02em" }}>Рассылки</div>
          <GlassCard style={{ padding:"8px 12px",borderRadius:14,cursor:"pointer" }} onClick={() => { haptic.medium(); onEdit(); }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Plus size={14} color={TG.green} />
              <span style={{ fontSize:12,color:TG.green,fontWeight:700 }}>Создать</span>
            </div>
          </GlassCard>
        </div>

        {!loading && (active>0||scheduled>0||paused>0) && (
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {active>0    && <span style={{ fontSize:10,fontWeight:700,color:TG.green,background:`${TG.green}18`,border:`1px solid ${TG.green}35`,borderRadius:20,padding:"4px 10px" }}>{active} активных</span>}
            {scheduled>0 && <span style={{ fontSize:10,fontWeight:700,color:TG.yellow,background:`${TG.yellow}18`,border:`1px solid ${TG.yellow}35`,borderRadius:20,padding:"4px 10px" }}>{scheduled} запланир.</span>}
            {paused>0    && <span style={{ fontSize:10,fontWeight:700,color:"#6ba8e5",background:"rgba(107,168,229,0.18)",border:"1px solid rgba(107,168,229,0.35)",borderRadius:20,padding:"4px 10px" }}>{paused} на паузе</span>}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:"center",padding:"40px 0" }}>
            <div style={{ width:28,height:28,borderRadius:"50%",border:`2px solid ${TG.green}40`,borderTopColor:TG.green,animation:"spin 0.8s linear infinite",display:"inline-block" }} />
          </div>
        ) : campaigns.length===0 ? (
          <GlassCard style={{ padding:"32px 16px",textAlign:"center" }}>
            <div style={{ fontSize:14,color:TG.muted,marginBottom:12 }}>Кампаний пока нет</div>
            <div onClick={() => { haptic.medium(); onEdit(); }} style={{ fontSize:13,color:TG.green,fontWeight:700,cursor:"pointer" }}>+ Создать первую кампанию</div>
          </GlassCard>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {campaigns.map(c => <CampaignCard key={c.id} campaign={c} onEdit={onEdit} onRefresh={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}
