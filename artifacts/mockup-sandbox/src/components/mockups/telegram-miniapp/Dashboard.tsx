import "./_group.css";

const BAR_HEIGHTS = [28, 34, 18, 42, 30, 48, 36];

export function Dashboard() {
  return (
    <div className="tg-app">
      {/* Header */}
      <div className="tg-header">
        <div>
          <div className="tg-header-title">RUProbe CRM</div>
          <div className="tg-header-sub">Обзор аналитики</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: "var(--tg-green)" }}>Live</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="tg-scroll">

        {/* KPI Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div style={{ fontSize: 11, color: "var(--tg-accent)", marginBottom: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              Отправлено
            </div>
            <div className="kpi-val" style={{ color: "var(--tg-accent)" }}>12 840</div>
            <div className="kpi-delta up">↑ 12.4% за неделю</div>
          </div>
          <div className="kpi-card">
            <div style={{ fontSize: 11, color: "var(--tg-green)", marginBottom: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Аудитория
            </div>
            <div className="kpi-val" style={{ color: "var(--tg-green)" }}>3 214</div>
            <div className="kpi-delta up">↑ 8.1% за неделю</div>
          </div>
          <div className="kpi-card">
            <div style={{ fontSize: 11, color: "var(--tg-yellow)", marginBottom: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Open Rate
            </div>
            <div className="kpi-val" style={{ color: "var(--tg-yellow)" }}>43.7%</div>
            <div className="kpi-delta up">↑ 3.1% vs прошлая</div>
          </div>
          <div className="kpi-card">
            <div style={{ fontSize: 11, color: "var(--tg-purple)", marginBottom: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              CTR
            </div>
            <div className="kpi-val" style={{ color: "var(--tg-purple)" }}>14.2%</div>
            <div className="kpi-delta dn">↓ 1.2% vs прошлая</div>
          </div>
        </div>

        {/* Mini trend chart */}
        <div className="card">
          <div className="card-header">
            Активность за 7 дней
            <span style={{ fontSize: 11, color: "var(--tg-text-muted)", marginLeft: 6, fontWeight: 400 }}>отправка</span>
          </div>
          <div className="card-body">
            <div className="mini-chart">
              {BAR_HEIGHTS.map((h, i) => (
                <div key={i} className="mini-bar" style={{ height: h, opacity: i === 5 ? 1 : 0.55 }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--tg-text-muted)", marginTop: 5 }}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
        </div>

        {/* Активные кампании */}
        <div className="section-title">Активные кампании</div>
        <div className="card">
          {[
            { name: "Summer Promo", sent: 1840, target: 2000, status: "running" },
            { name: "Reactivation Q2", sent: 990, target: 1500, status: "running" },
            { name: "VIP Invite", sent: 310, target: 310, status: "done" },
          ].map((c, i) => (
            <div key={i} className="row-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                <span className={`badge badge-${c.status}`}>{c.status === "running" ? "Активна" : "Готово"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--tg-text-muted)" }}>
                <span>{c.sent.toLocaleString("ru")} / {c.target.toLocaleString("ru")}</span>
                <span>{Math.round(c.sent / c.target * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.round(c.sent / c.target * 100)}%`, background: c.status === "done" ? "var(--tg-green)" : "var(--tg-accent)" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="section-title">Live события</div>
        <div className="card">
          {[
            { user: "@alex_m", event: "открыл сообщение", stage: "Открыл", color: "var(--tg-accent)", time: "12:41" },
            { user: "@natasha", event: "перешёл по ссылке", stage: "Конверсия", color: "var(--tg-green)", time: "12:39" },
            { user: "@user_8812", event: "получил кампанию", stage: "Охвачен", color: "var(--tg-yellow)", time: "12:38" },
          ].map((e, i) => (
            <div key={i} className="row-item">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.user}</div>
                  <div style={{ fontSize: 11, color: "var(--tg-text-muted)" }}>{e.event}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, background: `${e.color}20`, color: e.color, padding: "2px 6px", borderRadius: 6 }}>{e.stage}</div>
                <div style={{ fontSize: 10, color: "var(--tg-text-muted)", marginTop: 2 }}>{e.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 8 }} />
      </div>

      {/* Bottom tabs */}
      <div className="tg-tabs">
        {[
          { label: "Аналитика", active: true, icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          { label: "Кампании", active: false, icon: <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> },
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
