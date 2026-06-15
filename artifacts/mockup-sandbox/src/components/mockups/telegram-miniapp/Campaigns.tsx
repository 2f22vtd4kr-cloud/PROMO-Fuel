import "./_group.css";

const campaigns = [
  { name: "Summer Promo 2026", sent: 1840, target: 2000, status: "running", tag: "all", open: "43%", ctr: "14%" },
  { name: "VIP Invite", sent: 310, target: 310, status: "done", tag: "vip", open: "71%", ctr: "29%" },
  { name: "Reactivation Q2", sent: 0, target: 1200, status: "scheduled", tag: "inactive", open: "—", ctr: "—" },
  { name: "Onboarding Wave", sent: 528, target: 600, status: "running", tag: "new", open: "61%", ctr: "22%" },
  { name: "June Newsletter", sent: 0, target: 0, status: "draft", tag: "all", open: "—", ctr: "—" },
];

const STATUS_LABEL: Record<string, string> = {
  running: "Активна", done: "Готово", scheduled: "Запланирована", draft: "Черновик"
};

export function Campaigns() {
  return (
    <div className="tg-app">
      <div className="tg-header">
        <div>
          <div className="tg-header-title">Кампании</div>
          <div className="tg-header-sub">5 кампаний · 2 активных</div>
        </div>
        <button style={{ background: "var(--tg-accent)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Новая
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: "10px 12px 4px", flexShrink: 0 }}>
        <div style={{ background: "var(--tg-bg3)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1px solid var(--tg-border)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--tg-text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ fontSize: 14, color: "var(--tg-text-muted)" }}>Поиск кампаний...</span>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
        {["Все", "Активные", "Запланированные", "Черновики", "Завершённые"].map((f, i) => (
          <div key={f} style={{
            flexShrink: 0,
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: i === 0 ? "var(--tg-accent)" : "var(--tg-bg3)",
            color: i === 0 ? "#fff" : "var(--tg-text-muted)",
            border: "1px solid " + (i === 0 ? "transparent" : "var(--tg-border)"),
            cursor: "pointer",
          }}>{f}</div>
        ))}
      </div>

      {/* List */}
      <div className="tg-scroll" style={{ paddingTop: 4 }}>
        <div className="card">
          {campaigns.map((c, i) => (
            <div key={i} style={{ padding: "12px 14px", borderBottom: i < campaigns.length - 1 ? "1px solid var(--tg-border)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--tg-text-muted)", marginTop: 2 }}>
                    тег: <span style={{ color: "var(--tg-accent)" }}>{c.tag}</span>
                  </div>
                </div>
                <span className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status]}</span>
              </div>
              {c.status === "running" && (
                <div className="progress-bar" style={{ marginTop: 4, marginBottom: 6 }}>
                  <div className="progress-fill" style={{ width: `${Math.round(c.sent / c.target * 100)}%` }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--tg-text-muted)" }}>
                <span>Отправлено: <strong style={{ color: "var(--tg-text)" }}>{c.sent.toLocaleString("ru")}</strong></span>
                <span>Open: <strong style={{ color: "var(--tg-yellow)" }}>{c.open}</strong></span>
                <span>CTR: <strong style={{ color: "var(--tg-purple)" }}>{c.ctr}</strong></span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 8 }} />
      </div>

      {/* Bottom tabs */}
      <div className="tg-tabs">
        {[
          { label: "Аналитика", active: false, icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          { label: "Кампании", active: true, icon: <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> },
          { label: "Journey", active: false, icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: "Аудитория", active: false, icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
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
