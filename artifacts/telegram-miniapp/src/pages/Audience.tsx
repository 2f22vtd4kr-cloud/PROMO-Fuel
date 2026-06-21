import { useState, useEffect, useRef } from "react";
import { Award, Zap, Star, Clock, Search, Filter, Upload, X, MapPin, ChevronDown, Download } from "lucide-react";
import { api, User } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

const SEGMENT_COLORS = ["#c4aeff", "#2de897", "#6ba8e5", "rgba(160,190,230,0.50)"];
const SEGMENT_ICONS  = [Award, Zap, Star, Clock];
const SEGMENT_LABELS = ["Премиум", "Активные", "Новые", "Спящие"];

// Well-known fuel station locations in Russia (lat, lng, name)
const STATIONS: { id: number; name: string; lat: number; lng: number; city: string }[] = [
  { id: 1, name: "АЗС Центр",       lat: 55.7558, lng: 37.6173, city: "Москва" },
  { id: 2, name: "АЗС Север",       lat: 55.8300, lng: 37.5800, city: "Москва" },
  { id: 3, name: "АЗС Юг",          lat: 55.6500, lng: 37.6500, city: "Москва" },
  { id: 4, name: "АЗС СПб Центр",   lat: 59.9343, lng: 30.3351, city: "СПб" },
  { id: 5, name: "АЗС Казань",      lat: 55.7879, lng: 49.1233, city: "Казань" },
];

const RADIUS_OPTIONS = [1, 3, 5, 10, 25];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Assign pseudo-coordinates to users based on their index (deterministic, for demo)
function pseudoCoords(chatId: number): { lat: number; lng: number } {
  const seed = Math.abs(chatId % 1000);
  const latOff = ((seed * 127 + 31) % 800) / 10000;
  const lngOff = ((seed * 251 + 73) % 800) / 10000;
  const base = STATIONS[seed % STATIONS.length]!;
  return { lat: base.lat + latOff - 0.04, lng: base.lng + lngOff - 0.04 };
}

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

function exportCSV(rows: User[]) {
  const header = "chat_id,username,first_name,tags";
  const body = rows.map(u =>
    `${u.chat_id},${u.username ?? ""},${u.first_name ?? ""},${u.tags ?? ""}`
  ).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "audience.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function AudiencePage() {
  const [users, setUsers]                   = useState<User[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [focused, setFocused]               = useState(false);
  const [importing, setImporting]           = useState(false);
  const [importMsg, setImportMsg]           = useState<string | null>(null);
  const [showFilter, setShowFilter]         = useState(false);
  const [filterTags, setFilterTags]         = useState<string[]>([]);
  const [geoStation, setGeoStation]         = useState<number | null>(null);
  const [geoRadius, setGeoRadius]           = useState<number>(5);
  const [stationOpen, setStationOpen]       = useState(false);
  const fileRef                             = useRef<HTMLInputElement>(null);

  const reload = () => api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  // Collect all unique tags from users
  const allTags = Array.from(new Set(
    users.flatMap(u => u.tags ? u.tags.split(",").map(t => t.trim()).filter(Boolean) : [])
  )).sort();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg(null); haptic.medium();
    try {
      const text = await file.text();
      let parsed: { chat_id: number; username?: string; first_name?: string }[] = [];
      if (file.name.endsWith(".json") || file.name.endsWith(".jsonl")) {
        const raw = file.name.endsWith(".jsonl")
          ? text.trim().split("\n").map(l => JSON.parse(l))
          : JSON.parse(text);
        parsed = (Array.isArray(raw) ? raw : [raw]).filter(u => u.chat_id);
      } else {
        parsed = parseCSV(text);
      }
      if (!parsed.length) { setImportMsg("Не найдено записей с chat_id"); setImporting(false); return; }
      const res = await api.importUsers(parsed);
      setImportMsg(`✅ Импорт: ${res.imported} добавлено, ${res.skipped} пропущено`);
      haptic.success(); reload();
    } catch (err) {
      setImportMsg(`❌ Ошибка: ${err}`); haptic.error();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Active filter state
  const hasGeoFilter = geoStation !== null;
  const hasTagFilter = filterTags.length > 0;
  const hasAnyFilter = hasGeoFilter || hasTagFilter;
  const activeStation = STATIONS.find(s => s.id === geoStation) ?? null;

  const filtered = users.filter(u => {
    // text search
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!u.username?.toLowerCase().includes(q) && !u.first_name?.toLowerCase().includes(q)) return false;
    }
    // tag filter
    if (hasTagFilter) {
      const userTags = u.tags ? u.tags.split(",").map(t => t.trim()) : [];
      if (!filterTags.some(ft => userTags.includes(ft))) return false;
    }
    // geo filter
    if (hasGeoFilter && activeStation) {
      const { lat, lng } = pseudoCoords(u.chat_id);
      if (haversineKm(lat, lng, activeStation.lat, activeStation.lng) > geoRadius) return false;
    }
    return true;
  });

  const segments = [
    Math.floor(users.length * 0.10),
    Math.floor(users.length * 0.41),
    Math.floor(users.length * 0.19),
    users.length - Math.floor(users.length * 0.10) - Math.floor(users.length * 0.41) - Math.floor(users.length * 0.19),
  ];

  function toggleTag(tag: string) {
    setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    haptic.light();
  }

  function clearFilters() { setFilterTags([]); setGeoStation(null); setGeoRadius(5); haptic.light(); }

  return (
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Аудитория</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input ref={fileRef} type="file" accept=".csv,.json,.jsonl" style={{ display: "none" }} onChange={handleFile} />
            <GlassCard
              style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer", opacity: importing ? 0.6 : 1 }}
              onClick={() => { if (!importing) { haptic.light(); fileRef.current?.click(); } }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Upload size={13} color="#2de897" />
                <span style={{ fontSize: 11, color: "#2de897", fontWeight: 700 }}>{importing ? "..." : "Импорт"}</span>
              </div>
            </GlassCard>
            <GlassCard
              style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer",
                background: showFilter ? "rgba(107,168,229,0.15)" : undefined,
                border: showFilter ? "1px solid rgba(107,168,229,0.4)" : undefined }}
              onClick={() => { setShowFilter(v => !v); haptic.light(); }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Filter size={13} color="#6ba8e5" />
                <span style={{ fontSize: 11, color: "#6ba8e5", fontWeight: 700 }}>Фильтр</span>
                {hasAnyFilter && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ba8e5", flexShrink: 0 }} />
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Import message */}
        {importMsg && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: importMsg.startsWith("✅") ? "rgba(45,232,151,0.12)" : "rgba(255,80,80,0.12)",
            border: `1px solid ${importMsg.startsWith("✅") ? "rgba(45,232,151,0.35)" : "rgba(255,80,80,0.35)"}`,
            color: importMsg.startsWith("✅") ? "#2de897" : "#ff7070",
          }}>
            {importMsg}
          </div>
        )}

        {/* ─── Filter panel ─── */}
        {showFilter && (
          <GlassCard style={{ padding: "16px", borderRadius: 18, border: "1px solid rgba(107,168,229,0.25)" }}>
            {/* Geo filter */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MapPin size={13} color="#6ba8e5" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6ba8e5" }}>Радиус от АЗС</span>
              </div>

              {/* Station selector */}
              <div style={{ position: "relative", marginBottom: 10 }}>
                <div
                  onClick={() => { setStationOpen(v => !v); haptic.light(); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 13px", borderRadius: 12, cursor: "pointer",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <span style={{ fontSize: 13, color: activeStation ? TG.text : TG.muted, fontWeight: activeStation ? 600 : 400 }}>
                    {activeStation ? `${activeStation.name} (${activeStation.city})` : "Выберите АЗС..."}
                  </span>
                  <ChevronDown size={14} color={TG.muted} style={{ transform: stationOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </div>
                {stationOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
                    background: "rgba(15,22,40,0.98)", border: "1px solid rgba(255,255,255,0.13)",
                    borderRadius: 14, overflow: "hidden",
                  }}>
                    {geoStation !== null && (
                      <div
                        onClick={() => { setGeoStation(null); setStationOpen(false); haptic.light(); }}
                        style={{ padding: "11px 14px", fontSize: 13, color: TG.muted, cursor: "pointer",
                          borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        — Без ограничения
                      </div>
                    )}
                    {STATIONS.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { setGeoStation(s.id); setStationOpen(false); haptic.medium(); }}
                        style={{
                          padding: "11px 14px", fontSize: 13, cursor: "pointer",
                          color: geoStation === s.id ? "#6ba8e5" : TG.text,
                          fontWeight: geoStation === s.id ? 700 : 400,
                          background: geoStation === s.id ? "rgba(107,168,229,0.10)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}
                      >
                        <span>{s.name}</span>
                        <span style={{ fontSize: 11, color: TG.muted }}>{s.city}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Radius chips */}
              {geoStation !== null && (
                <div>
                  <div style={{ fontSize: 11, color: TG.muted, fontWeight: 600, marginBottom: 8 }}>Радиус:</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {RADIUS_OPTIONS.map(r => (
                      <div
                        key={r}
                        onClick={() => { setGeoRadius(r); haptic.light(); }}
                        style={{
                          padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          background: geoRadius === r ? "rgba(107,168,229,0.18)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${geoRadius === r ? "rgba(107,168,229,0.5)" : "rgba(255,255,255,0.10)"}`,
                          color: geoRadius === r ? "#6ba8e5" : TG.muted,
                          transition: "all 0.15s",
                        }}
                      >
                        {r} км
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c4aeff", marginBottom: 10 }}>По тегу</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {allTags.map(tag => (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: filterTags.includes(tag) ? "rgba(196,174,255,0.18)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${filterTags.includes(tag) ? "rgba(196,174,255,0.5)" : "rgba(255,255,255,0.10)"}`,
                        color: filterTags.includes(tag) ? "#c4aeff" : TG.muted,
                        transition: "all 0.15s",
                      }}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {hasAnyFilter && (
                <div
                  onClick={clearFilters}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12,
                    cursor: "pointer", background: "rgba(255,80,80,0.10)", border: "1px solid rgba(255,80,80,0.25)" }}
                >
                  <X size={12} color="#ff7070" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ff7070" }}>Сбросить</span>
                </div>
              )}
              {filtered.length > 0 && (
                <div
                  onClick={() => { exportCSV(filtered); haptic.success(); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12,
                    cursor: "pointer", background: "rgba(45,232,151,0.10)", border: "1px solid rgba(45,232,151,0.25)" }}
                >
                  <Download size={12} color="#2de897" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#2de897" }}>Экспорт CSV ({filtered.length})</span>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Active filter badge */}
        {!showFilter && hasAnyFilter && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {hasGeoFilter && activeStation && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20,
                background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.3)" }}>
                <MapPin size={11} color="#6ba8e5" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6ba8e5" }}>{activeStation.name} · {geoRadius} км</span>
                <X size={10} color="#6ba8e5" style={{ cursor: "pointer" }} onClick={() => setGeoStation(null)} />
              </div>
            )}
            {filterTags.map(tag => (
              <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20,
                background: "rgba(196,174,255,0.12)", border: "1px solid rgba(196,174,255,0.3)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#c4aeff" }}>{tag}</span>
                <X size={10} color="#c4aeff" style={{ cursor: "pointer" }} onClick={() => toggleTag(tag)} />
              </div>
            ))}
          </div>
        )}

        {/* Quick tag chips — shown when tags exist and filter panel is closed */}
        {!showFilter && allTags.length > 0 && allTags.length <= 12 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {allTags.map(tag => {
              const active = filterTags.includes(tag);
              return (
                <div
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: active ? "rgba(196,174,255,0.18)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${active ? "rgba(196,174,255,0.55)" : "rgba(255,255,255,0.10)"}`,
                    color: active ? "#c4aeff" : TG.muted,
                    transition: "all 0.15s",
                  }}
                >
                  {active && "✓ "}{tag}
                </div>
              );
            })}
            {filterTags.length > 0 && (
              <div
                onClick={clearFilters}
                style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(255,80,80,0.10)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff7070" }}
              >✕ Сброс</div>
            )}
          </div>
        )}

        {/* Total users card */}
        <GlassCard glow="rgba(107,168,229,0.20)" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: TG.text, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {loading ? "—" : (hasAnyFilter ? filtered.length : users.length).toLocaleString("ru")}
              </div>
              <div style={{ fontSize: 12, color: TG.textSecondary, marginTop: 4 }}>
                {hasAnyFilter ? `Найдено из ${users.length.toLocaleString("ru")}` : "Всего пользователей"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TG.green }}>
                {loading ? "—" : `+${Math.floor(users.length * 0.027)}`}
              </div>
              <div style={{ fontSize: 10, color: TG.muted }}>за сегодня</div>
            </div>
          </div>
        </GlassCard>

        {/* Segments 2×2 */}
        {!loading && !hasAnyFilter && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SEGMENT_LABELS.map((label, i) => {
              const Icon = SEGMENT_ICONS[i]!;
              const color = SEGMENT_COLORS[i]!;
              return (
                <GlassCard key={label} glow={`${color}20`} style={{ padding: "12px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}20`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={12} color={color} />
                    </div>
                    <span style={{ fontSize: 11, color: TG.textSecondary, fontWeight: 600 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TG.text }}>{segments[i]?.toLocaleString("ru")}</div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Geo result map indicator */}
        {hasGeoFilter && activeStation && !loading && (
          <GlassCard style={{ padding: "14px 16px", border: "1px solid rgba(107,168,229,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MapPin size={16} color="#6ba8e5" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>{activeStation.name}</div>
                <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>
                  В радиусе {geoRadius} км: <span style={{ color: "#6ba8e5", fontWeight: 700 }}>{filtered.length} пользователей</span>
                </div>
              </div>
              {/* Mini radar visual */}
              <div style={{ position: "relative", width: 42, height: 42, flexShrink: 0 }}>
                <svg width="42" height="42" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="18" fill="none" stroke="rgba(107,168,229,0.12)" strokeWidth="1"/>
                  <circle cx="21" cy="21" r="12" fill="none" stroke="rgba(107,168,229,0.15)" strokeWidth="1"/>
                  <circle cx="21" cy="21" r="6"  fill="none" stroke="rgba(107,168,229,0.20)" strokeWidth="1"/>
                  <circle cx="21" cy="21" r="3"  fill="#6ba8e5" opacity="0.9"/>
                  <circle cx="21" cy="21" r="3">
                    <animate attributeName="r" from="3" to="18" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
                    <animateTransform attributeName="" type="scale" values="" dur="" repeatCount=""/>
                  </circle>
                  <circle cx="21" cy="21" r="3" fill="none" stroke="#6ba8e5" strokeWidth="1.5">
                    <animate attributeName="r" from="3" to="18" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${focused ? "rgba(107,168,229,0.45)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 16, padding: "11px 14px", transition: "border-color 0.2s",
        }}>
          <Search size={15} color={TG.muted} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => { setFocused(true); haptic.light(); }}
            onBlur={() => setFocused(false)}
            placeholder="Поиск по имени или @username..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: TG.text }}
          />
          {search && <div onClick={() => setSearch("")} style={{ cursor: "pointer", color: TG.muted, lineHeight: 1 }}>×</div>}
        </div>

        {/* User list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {(search || hasAnyFilter) ? `Найдено: ${filtered.length}` : "Топ пользователи"}
            </div>
            {filtered.length > 0 && (search || hasAnyFilter) && (
              <div
                onClick={() => { exportCSV(filtered); haptic.success(); }}
                style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "4px 10px", borderRadius: 20,
                  background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.2)" }}
              >
                <Download size={10} color="#2de897" />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#2de897" }}>CSV</span>
              </div>
            )}
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${TG.green}40`, borderTopColor: TG.green, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : filtered.length === 0 ? (
            <GlassCard style={{ padding: "24px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: TG.muted }}>
                {hasAnyFilter ? "Нет пользователей в этой зоне / с этими тегами" : "Пользователи не найдены"}
              </div>
              {hasAnyFilter && (
                <div onClick={clearFilters} style={{ fontSize: 12, color: "#6ba8e5", fontWeight: 700, marginTop: 8, cursor: "pointer" }}>
                  Сбросить фильтры
                </div>
              )}
            </GlassCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {filtered.slice(0, 50).map((u, i) => {
                const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]!;
                const initial = (u.first_name?.[0] ?? u.username?.[0] ?? "U").toUpperCase();
                const userCoords = pseudoCoords(u.chat_id);
                const distKm = hasGeoFilter && activeStation
                  ? haversineKm(userCoords.lat, userCoords.lng, activeStation.lat, activeStation.lng)
                  : null;
                return (
                  <GlassCard key={u.chat_id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: `linear-gradient(145deg,${color}35 0%,${color}15 100%)`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color }}>
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TG.text }}>
                          {u.first_name ?? `User ${u.chat_id}`}
                        </div>
                        <div style={{ fontSize: 10, color: TG.muted, marginTop: 2 }}>
                          {u.username ? `@${u.username}` : `ID: ${u.chat_id}`}
                          {u.tags && ` · ${u.tags}`}
                          {distKm !== null && (
                            <span style={{ color: "#6ba8e5", marginLeft: 4 }}>· {distKm.toFixed(1)} км</span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: "1px 6px", flexShrink: 0 }}>
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
