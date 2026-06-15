import { useState, useEffect } from "react";
import { Users2, UserCheck, Tag, Search, RefreshCw, Hash } from "lucide-react";
import { api, User } from "../lib/api";
import { TG } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";
import { haptic } from "../lib/haptics";

function TagChip({ tag, count, color }: { tag: string; count: number; color: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 12px",
      background: `${color}12`, border: `1px solid ${color}28`,
      borderRadius: 20, flexShrink: 0,
    }}>
      <Hash size={9} color={color} />
      <span style={{ fontSize: 11.5, color, fontWeight: 700 }}>{tag}</span>
      <span style={{ fontSize: 10, color: TG.muted, marginLeft: 2 }}>{count}</span>
    </div>
  );
}

const TAG_COLORS = [TG.accent, TG.green, TG.yellow, TG.purple, "#ff9d6e", "#ff7eb3", TG.accentLight];

export function AudiencePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  async function load(manual = false) {
    if (manual) { setRefreshing(true); haptic.light(); } else setLoading(true);
    try { setUsers(await api.getUsers()); } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      String(u.chat_id).includes(q) ||
      u.tags?.toLowerCase().includes(q)
    );
  });

  const tagMap: Record<string, number> = {};
  users.forEach(u => {
    if (!u.tags) return;
    u.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(t => { tagMap[t] = (tagMap[t] ?? 0) + 1; });
  });
  const tagEntries = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const withUsername = users.filter(u => u.username).length;
  const withTags     = users.filter(u => u.tags).length;

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Аудитория" />
      <FullSpinner />
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Аудитория"
        subtitle={`${users.length.toLocaleString("ru")} подписчиков`}
        accent="linear-gradient(135deg,#c4aeff 0%,#7c5fcf 100%)"
        right={
          <button onClick={() => load(true)} className="tap" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 11, padding: 7, display: "flex", color: TG.muted }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.72s linear infinite" : "none" }} />
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 13px 20px", WebkitOverflowScrolling: "touch" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 16 }}>
          {[
            { icon: Users2,    label: "Всего",       value: users.length.toLocaleString("ru"),      color: TG.purple, glow: TG.purpleGlow, grad: "linear-gradient(135deg,#c4aeff,#7c5fcf)" },
            { icon: UserCheck, label: "С username",  value: withUsername.toLocaleString("ru"),      color: TG.accent, glow: TG.accentGlow, grad: "linear-gradient(135deg,#95c4f5,#5b96d4)" },
            { icon: Tag,       label: "С тегами",    value: withTags.toLocaleString("ru"),          color: TG.green,  glow: TG.greenGlow,  grad: "linear-gradient(135deg,#2de897,#17a86a)" },
          ].map(({ icon: Icon, label, value, color, glow, grad }) => (
            <div key={label} className="lg fade-up stagger-item" style={{ padding: "14px 12px" }}>
              <div style={{ position: "absolute", top: -28, right: -28, width: 72, height: 72, borderRadius: "50%", background: `radial-gradient(circle,${glow} 0%,transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, position: "relative", zIndex: 2 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}2c`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.12),transparent)", pointerEvents: "none" }} />
                  <Icon size={12} color={color} strokeWidth={2.2} style={{ position: "relative", zIndex: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.6px", lineHeight: 1, background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", position: "relative", zIndex: 2 }}>{value}</div>
              <div style={{ fontSize: 9.5, color: TG.muted, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4, position: "relative", zIndex: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        {tagEntries.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Теги</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {tagEntries.map(([tag, count], i) => (
                <TagChip key={tag} tag={tag} count={count} color={TAG_COLORS[i % TAG_COLORS.length]} />
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 12, position: "relative" }}>
          {searchFocus && (
            <div style={{ position: "absolute", inset: -1, borderRadius: 17, background: "linear-gradient(135deg,rgba(196,174,255,0.40),rgba(91,150,212,0.20))", zIndex: 0, pointerEvents: "none" }} />
          )}
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", background: TG.inputBg, border: `1px solid ${searchFocus ? "rgba(196,174,255,0.40)" : TG.inputBorder}`, borderRadius: 16, padding: "11px 14px", gap: 9, transition: "border-color 0.2s" }}>
            <Search size={14} color={TG.muted} />
            <input
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: TG.text, fontSize: 14, fontFamily: "inherit" }}
              placeholder="Поиск по имени, username, тегу..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: TG.muted, padding: 0, display: "flex", cursor: "pointer" }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Подписчики
          </span>
          {search && (
            <span style={{ fontSize: 11, color: TG.muted }}>{filtered.length} из {users.length}</span>
          )}
        </div>

        {/* Users list */}
        {filtered.length === 0 ? (
          <div className="lg" style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
            <div style={{ color: TG.muted, fontSize: 13, position: "relative", zIndex: 2 }}>
              {search ? "Никого не найдено" : "Нет подписчиков"}
            </div>
          </div>
        ) : (
          <div className="lg" style={{ borderRadius: 24 }}>
            {filtered.slice(0, 100).map((u, i) => {
              const initials = u.first_name
                ? u.first_name.slice(0, 1).toUpperCase()
                : u.username ? u.username.slice(0, 1).toUpperCase() : "?";
              const hue = Math.abs(u.chat_id % 360);
              const tags = u.tags?.split(",").map(t => t.trim()).filter(Boolean) ?? [];
              return (
                <div key={u.chat_id} style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "11px 15px",
                  borderBottom: i < Math.min(filtered.length, 100) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  position: "relative", zIndex: 2,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: `linear-gradient(135deg,hsl(${hue},65%,45%),hsl(${(hue + 40) % 360},55%,35%))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "#fff",
                    boxShadow: `0 0 16px hsla(${hue},65%,45%,0.36)`,
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.18),transparent)", pointerEvents: "none" }} />
                    <span style={{ position: "relative", zIndex: 1 }}>{initials}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: TG.text }}>
                        {u.first_name ?? `ID ${u.chat_id}`}
                      </div>
                      {u.username && <span style={{ fontSize: 10.5, color: TG.muted, flexShrink: 0 }}>@{u.username}</span>}
                    </div>
                    {tags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {tags.slice(0, 3).map((t, ti) => (
                          <span key={t} style={{
                            fontSize: 9.5, color: TAG_COLORS[ti % TAG_COLORS.length],
                            background: `${TAG_COLORS[ti % TAG_COLORS.length]}12`,
                            border: `1px solid ${TAG_COLORS[ti % TAG_COLORS.length]}24`,
                            borderRadius: 6, padding: "1px 6px", fontWeight: 700,
                          }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: TG.muted, flexShrink: 0 }}>{u.chat_id}</div>
                </div>
              );
            })}
            {filtered.length > 100 && (
              <div style={{ padding: "12px 15px", textAlign: "center", fontSize: 12, color: TG.muted, position: "relative", zIndex: 2 }}>
                ... ещё {filtered.length - 100} подписчиков
              </div>
            )}
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
