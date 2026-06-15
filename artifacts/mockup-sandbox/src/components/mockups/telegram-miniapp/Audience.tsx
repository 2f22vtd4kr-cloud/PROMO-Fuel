import "./_group.css";

const USERS = [
  { name: "Алексей М.", handle: "@alex_m", tags: ["vip"], seen: "сегодня", initials: "АМ" },
  { name: "Наташа К.", handle: "@natasha_k", tags: ["vip", "all"], seen: "вчера", initials: "НК" },
  { name: "User 44812", handle: null, tags: ["inactive"], seen: "3 дня назад", initials: "?" },
  { name: "Дмитрий Л.", handle: "@dima_l", tags: ["all"], seen: "сегодня", initials: "ДЛ" },
  { name: "Мария С.", handle: "@masha_s", tags: ["new", "vip"], seen: "2 ч назад", initials: "МС" },
  { name: "User 77032", handle: null, tags: ["inactive"], seen: "неделю назад", initials: "?" },
  { name: "Иван П.", handle: "@ivan_p", tags: ["all"], seen: "вчера", initials: "ИП" },
];

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  vip: { bg: "rgba(232,168,76,0.2)", color: "var(--tg-yellow)" },
  inactive: { bg: "rgba(224,82,82,0.15)", color: "var(--tg-red)" },
  all: { bg: "rgba(82,136,193,0.2)", color: "var(--tg-accent)" },
  new: { bg: "rgba(79,188,94,0.15)", color: "var(--tg-green)" },
};

export function Audience() {
  return (
    <div className="tg-app">
      <div className="tg-header">
        <div>
          <div className="tg-header-title">Аудитория</div>
          <div className="tg-header-sub">3 214 подписчиков</div>
        </div>
        <button style={{ background: "var(--tg-accent)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Добавить
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px 4px", flexShrink: 0 }}>
        <div style={{ background: "var(--tg-bg3)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1px solid var(--tg-border)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--tg-text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ fontSize: 14, color: "var(--tg-text-muted)" }}>Поиск по имени, ID...</span>
        </div>
      </div>

      {/* Tag filters */}
      <div style={{ display: "flex", gap: 6, padding: "6px 12px 4px", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
        {["Все", "vip", "new", "inactive"].map((t, i) => (
          <div key={t} style={{
            flexShrink: 0,
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: i === 0 ? "var(--tg-accent)" : (TAG_COLORS[t]?.bg || "var(--tg-bg3)"),
            color: i === 0 ? "#fff" : (TAG_COLORS[t]?.color || "var(--tg-text-muted)"),
            border: "1px solid " + (i === 0 ? "transparent" : "var(--tg-border)"),
          }}>{t}</div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px 4px", flexShrink: 0 }}>
        {[["Всего", "3 214"], ["VIP", "187"], ["Новых", "402"], ["Неактивных", "891"]].map(([l, v]) => (
          <div key={l} style={{ flex: 1, background: "var(--tg-bg3)", borderRadius: 8, padding: "6px 4px", textAlign: "center", border: "1px solid var(--tg-border)" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
            <div style={{ fontSize: 9, color: "var(--tg-text-muted)", marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="tg-scroll" style={{ paddingTop: 8 }}>
        <div className="card">
          {USERS.map((u, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              borderBottom: i < USERS.length - 1 ? "1px solid var(--tg-border)" : "none",
            }}>
              <div className="avatar">{u.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                  {u.handle && <span style={{ fontSize: 11, color: "var(--tg-accent)" }}>{u.handle}</span>}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                  {u.tags.map(t => (
                    <span key={t} className="tag" style={{ background: TAG_COLORS[t]?.bg, color: TAG_COLORS[t]?.color }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: "var(--tg-text-muted)" }}>{u.seen}</div>
                <button style={{
                  marginTop: 4,
                  background: "none",
                  border: "1px solid var(--tg-border)",
                  color: "var(--tg-text-muted)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                }}>Изменить</button>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary">
          Экспортировать аудиторию
        </button>

        <div style={{ height: 8 }} />
      </div>

      <div className="tg-tabs">
        {[
          { label: "Аналитика", active: false, icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          { label: "Кампании", active: false, icon: <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> },
          { label: "Journey", active: false, icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: "Аудитория", active: true, icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        ].map((t, i) => (
          <div key={i} className={`tg-tab ${t.active ? "active" : ""}`}>
            {t.icon}
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
