import { useState, useEffect, useRef } from "react";
import { Award, Zap, Star, Clock, Search, Filter, Upload } from "lucide-react";
import { api, User } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const SEGMENT_COLORS = ["#c4aeff", "#2de897", "#6ba8e5", "rgba(160,190,230,0.50)"];
const SEGMENT_ICONS  = [Award, Zap, Star, Clock];
const SEGMENT_LABELS = ["Премиум", "Активные", "Новые", "Спящие"];

function parseCSV(text: string): { chat_id: number; username?: string; first_name?: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).flatMap(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    const chat_id = parseInt(obj["chat_id"] ?? obj["id"] ?? "");
    if (!chat_id) return [];
    return [{ chat_id, username: obj["username"] || undefined, first_name: obj["first_name"] || obj["name"] || undefined }];
  });
}

export function AudiencePage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [focused, setFocused]       = useState(false);
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState<string | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const reload = () => api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    haptic.medium();
    try {
      const text = await file.text();
      let users: { chat_id: number; username?: string; first_name?: string }[] = [];
      if (file.name.endsWith(".json") || file.name.endsWith(".jsonl")) {
        const parsed = file.name.endsWith(".jsonl")
          ? text.trim().split("\n").map(l => JSON.parse(l))
          : JSON.parse(text);
        users = (Array.isArray(parsed) ? parsed : [parsed]).filter(u => u.chat_id);
      } else {
        users = parseCSV(text);
      }
      if (!users.length) { setImportMsg("Не найдено записей с chat_id"); setImporting(false); return; }
      const res = await api.importUsers(users);
      setImportMsg(`✅ Импорт: ${res.imported} добавлено, ${res.skipped} пропущено`);
      haptic.success();
      reload();
    } catch (err) {
      setImportMsg(`❌ Ошибка: ${err}`);
      haptic.error();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
          <div style={{ display:"flex",gap:8 }}>
            <input ref={fileRef} type="file" accept=".csv,.json,.jsonl" style={{ display:"none" }} onChange={handleFile} />
            <GlassCard
              style={{ padding:"8px 12px",borderRadius:14,cursor:"pointer",opacity:importing?0.6:1 }}
              onClick={() => { if (!importing) { haptic.light(); fileRef.current?.click(); } }}
            >
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <Upload size={13} color="#2de897" />
                <span style={{ fontSize:11,color:"#2de897",fontWeight:700 }}>
                  {importing ? "..." : "Импорт"}
                </span>
              </div>
            </GlassCard>
            <GlassCard style={{ padding:"8px 12px",borderRadius:14 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <Filter size={13} color="#6ba8e5" />
                <span style={{ fontSize:11,color:"#6ba8e5",fontWeight:700 }}>Фильтр</span>
              </div>
            </GlassCard>
          </div>
        </div>

        {importMsg && (
          <div style={{
            padding:"10px 14px",borderRadius:12,fontSize:12,fontWeight:600,
            background: importMsg.startsWith("✅") ? "rgba(45,232,151,0.12)" : "rgba(255,80,80,0.12)",
            border: `1px solid ${importMsg.startsWith("✅") ? "rgba(45,232,151,0.35)" : "rgba(255,80,80,0.35)"}`,
            color: importMsg.startsWith("✅") ? "#2de897" : "#ff7070",
          }}>
            {importMsg}
          </div>
        )}

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
