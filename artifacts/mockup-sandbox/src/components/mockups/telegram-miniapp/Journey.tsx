import "./_group.css";

const FUNNEL = [
  { stage: "Подписчики", count: 3214, pct: 100, color: "var(--tg-accent)" },
  { stage: "Охвачено", count: 2840, pct: 88, color: "var(--tg-accent)" },
  { stage: "Доставлено", count: 2614, pct: 81, color: "#6fa3dc" },
  { stage: "Открыли", count: 1403, pct: 44, color: "var(--tg-yellow)" },
  { stage: "Перешли", count: 456, pct: 14, color: "var(--tg-green)" },
];

const COHORT = [
  { week: "Нед 1", w0: 100, w1: 74, w2: 58, w3: 42 },
  { week: "Нед 2", w0: 100, w1: 71, w2: 54, w3: null },
  { week: "Нед 3", w0: 100, w1: 68, w2: null, w3: null },
  { week: "Нед 4", w0: 100, w1: null, w2: null, w3: null },
];

export function Journey() {
  return (
    <div className="tg-app">
      <div className="tg-header">
        <div>
          <div className="tg-header-title">Путь клиента</div>
          <div className="tg-header-sub">Customer Journey</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: "var(--tg-green)" }}>3 214 активных</span>
        </div>
      </div>

      <div className="tg-scroll">

        {/* Funnel */}
        <div className="section-title" style={{ marginTop: 4 }}>Воронка конверсии</div>
        <div className="card">
          <div className="card-body" style={{ paddingTop: 12 }}>
            {FUNNEL.map((f, i) => (
              <div key={i} className="funnel-row">
                <div className="funnel-label">
                  <span>{f.stage}</span>
                  <span>
                    <span className="funnel-val">{f.count.toLocaleString("ru")}</span>
                    <span style={{ marginLeft: 4, fontSize: 10 }}>({f.pct}%)</span>
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${f.pct}%`, background: f.color }} />
                </div>
                {i < FUNNEL.length - 1 && (
                  <div style={{ fontSize: 10, color: "var(--tg-red)", marginTop: 3, textAlign: "right" }}>
                    -{(FUNNEL[i].pct - FUNNEL[i + 1].pct)}% потеряно
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Predictive */}
        <div className="section-title">Predictive Score</div>
        <div className="card">
          <div className="card-body" style={{ paddingTop: 12 }}>
            {[
              { label: "Вероятность конверсии", val: 78, color: "var(--tg-accent)" },
              { label: "Риск оттока", val: 23, color: "var(--tg-red)" },
              { label: "LTV прогноз", val: 64, color: "var(--tg-green)" },
              { label: "Склонность к действию", val: 51, color: "var(--tg-purple)" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--tg-text-muted)" }}>{label}</span>
                  <span style={{ color, fontWeight: 600 }}>{val}%</span>
                </div>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-fill" style={{ width: `${val}%`, background: color }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--tg-text-muted)", marginTop: 4 }}>Модель AI · обновляется при взаимодействии</div>
          </div>
        </div>

        {/* Cohort */}
        <div className="section-title">Когортный анализ</div>
        <div className="card">
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div className="cohort-grid" style={{ marginBottom: 6 }}>
              {["", "Нед 0", "Нед 1", "Нед 2", "Нед 3"].map(h => (
                <div key={h} style={{ textAlign: "center", color: "var(--tg-text-muted)", fontSize: 9, paddingBottom: 2 }}>{h}</div>
              ))}
            </div>
            {COHORT.map(row => (
              <div key={row.week} className="cohort-grid" style={{ marginBottom: 3 }}>
                <div style={{ fontSize: 10, color: "var(--tg-text-muted)", display: "flex", alignItems: "center" }}>{row.week}</div>
                {[row.w0, row.w1, row.w2, row.w3].map((v, i) => (
                  <div key={i} className="cohort-cell" style={{
                    background: v == null ? "rgba(255,255,255,0.04)" : `rgba(82,136,193,${(v / 100) * 0.55 + 0.1})`,
                    color: v == null ? "transparent" : "#fff",
                    fontSize: 10,
                  }}>
                    {v != null ? `${v}%` : "·"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>

      <div className="tg-tabs">
        {[
          { label: "Аналитика", active: false, icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          { label: "Кампании", active: false, icon: <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> },
          { label: "Journey", active: true, icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
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
