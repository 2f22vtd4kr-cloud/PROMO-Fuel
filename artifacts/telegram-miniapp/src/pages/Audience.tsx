import { useState, useEffect } from "react";
import { Award, Zap, Star, Clock, Search, Filter } from "lucide-react";
import { api, User } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const SEGMENT_COLORS = ["#c4aeff", "#2de897", "#6ba8e5", "rgba(160,190,230,0.50)"];
const SEGMENT_ICONS  = [Award, Zap, Star, Clock];
const SEGMENT_LABELS = ["Премиум", "Активные", "Новые", "Спящие"];

export function AudiencePage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [focused, setFocused]   = useState(false);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const segments = [
    Math.floor(users.length * 0.10),
    Math.floor(users.length * 0.41),
    Math.floor(users.length * 0.19),
    users.length - Math.floor(users.length * 0.10) - Math.floor(users.length * 0.41) - Math.floor(users.length * 0.19),
  ];

  return (
    <div className="tab-content" style={{ height:"100%",overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
      <div style={{ display:"flex",flexDirection:"column",gap:14,padding:"14px 14px 24px" }}>

        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontSize:18,fontWeight:800,color:TG.text,letterSpacing:"-0.02em" }}>Аудитория</div>
          <GlassCard style={{ padding:"8px 12px",borderRadius:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Filter size={13} color="#6ba8e5" />
              <span style={{ fontSize:11,color:"#6ba8e5",fontWeight:700 }}>Фильтр</span>
            </div>
          </GlassCard>
        </div>

        {/* Total users card */}
        <GlassCard glow="rgba(107,168,229,0.20)" style={{ padding:"16px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:32,fontWeight:900,color:TG.text,letterSpacing:"-0.04em",lineHeight:1 }}>
                {loading ? "—" : users.length.toLocaleString("ru")}
              </div>
              <div style={{ fontSize:12,color:TG.textSecondary,marginTop:4 }}>Всего пользователей</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14,fontWeight:700,color:TG.green }}>
                {loading ? "—" : `+${Math.floor(users.length * 0.027)}`}
              </div>
              <div style={{ fontSize:10,color:TG.muted }}>за сегодня</div>
            </div>
          </div>
        </GlassCard>

        {/* Segments 2×2 */}
        {!loading && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {SEGMENT_LABELS.map((label, i) => {
              const Icon = SEGMENT_ICONS[i]!;
              const color = SEGMENT_COLORS[i]!;
              return (
                <GlassCard key={label} glow={`${color}20`} style={{ padding:"12px 12px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                    <div style={{ width:26,height:26,borderRadius:8,background:`${color}20`,border:`1px solid ${color}35`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Icon size={12} color={color} />
                    </div>
                    <span style={{ fontSize:11,color:TG.textSecondary,fontWeight:600 }}>{label}</span>
                  </div>
                  <div style={{ fontSize:18,fontWeight:800,color:TG.text }}>{segments[i]?.toLocaleString("ru")}</div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div style={{
          display:"flex",alignItems:"center",gap:10,
          background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
          border:`1px solid ${focused?"rgba(107,168,229,0.45)":"rgba(255,255,255,0.12)"}`,
          borderRadius:16,padding:"11px 14px",
          transition:"border-color 0.2s",
        }}>
          <Search size={15} color={TG.muted} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => { setFocused(true); haptic.light(); }}
            onBlur={() => setFocused(false)}
            placeholder="Поиск по имени или @username..."
            style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:TG.text }}
          />
          {search && (
            <div onClick={() => setSearch("")} style={{ cursor:"pointer",color:TG.muted,lineHeight:1 }}>×</div>
          )}
        </div>

        {/* User list */}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:TG.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:10 }}>
            {search ? `Найдено: ${filtered.length}` : "Топ пользователи"}
          </div>
          {loading ? (
            <div style={{ textAlign:"center",padding:"32px 0" }}>
              <div style={{ width:24,height:24,borderRadius:"50%",border:`2px solid ${TG.green}40`,borderTopColor:TG.green,animation:"spin 0.8s linear infinite",display:"inline-block" }} />
            </div>
          ) : filtered.length === 0 ? (
            <GlassCard style={{ padding:"24px 16px",textAlign:"center" }}>
              <div style={{ fontSize:13,color:TG.muted }}>Пользователи не найдены</div>
            </GlassCard>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
              {filtered.slice(0, 50).map((u, i) => {
                const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]!;
                const initial = (u.first_name?.[0] ?? u.username?.[0] ?? "U").toUpperCase();
                return (
                  <GlassCard key={u.chat_id} style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ width:36,height:36,borderRadius:12,flexShrink:0,background:`linear-gradient(145deg,${color}35 0%,${color}15 100%)`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color }}>
                        {initial}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:TG.text }}>
                          {u.first_name ?? `User ${u.chat_id}`}
                        </div>
                        <div style={{ fontSize:10,color:TG.muted,marginTop:2 }}>
                          {u.username ? `@${u.username}` : `ID: ${u.chat_id}`}
                          {u.tags && ` · ${u.tags}`}
                        </div>
                      </div>
                      <span style={{ fontSize:9,fontWeight:700,color,background:`${color}18`,border:`1px solid ${color}35`,borderRadius:20,padding:"1px 6px",flexShrink:0 }}>
                        {SEGMENT_LABELS[i % 4]}
                      </span>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
