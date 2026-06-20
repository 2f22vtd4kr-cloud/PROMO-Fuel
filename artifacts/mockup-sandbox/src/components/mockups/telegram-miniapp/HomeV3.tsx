import React, { useState, useEffect } from "react";

export function HomeV3() {
  const [counter, setCounter] = useState(128450);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((prev) => prev + Math.floor(Math.random() * 7));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const styles = `
    :root {
      --bg-color: #060810;
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #ffffff;
      --text-muted: rgba(255, 255, 255, 0.5);
      --green: #2de897;
      --blue: #6ba8e5;
      --purple: #c4aeff;
      --yellow: #ffc946;
      --red: #ff6b7a;
    }

    .home-v3-container {
      width: 390px;
      height: 760px;
      background-color: var(--bg-color);
      background-image: radial-gradient(circle at 50% 0%, #1a2235 0%, var(--bg-color) 40%);
      color: var(--text-main);
      font-family: 'Manrope', sans-serif;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
    }

    .home-v3-container::-webkit-scrollbar {
      display: none;
    }

    /* Header */
    .home-v3-header {
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 16px 20px;
      background: linear-gradient(to bottom, rgba(6,8,16,0.95) 0%, rgba(6,8,16,0) 100%);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .home-v3-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    /* Worker Segment Bar */
    .worker-bar-container {
      margin: 0 20px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: slideUp 0.4s ease-out 0.1s both;
    }

    .worker-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .worker-segments {
      display: flex;
      gap: 4px;
      flex: 1;
      height: 6px;
    }

    .worker-segment {
      flex: 1;
      border-radius: 3px;
      background: var(--card-bg);
      position: relative;
    }

    .worker-segment.alive {
      background: var(--green);
    }
    
    .worker-segment.alive::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 4px;
      border: 1px solid var(--green);
      opacity: 0;
      animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .worker-segment.dead {
      background: var(--red);
    }

    /* Hero Gauge */
    .hero-gauge {
      margin: 10px 20px 24px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: slideUp 0.5s ease-out 0.2s both;
    }

    .gauge-svg {
      width: 240px;
      overflow: visible;
    }

    .gauge-arc {
      stroke-dasharray: 126;
      stroke-dashoffset: 126;
      animation: gaugeFill 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards;
    }

    .gauge-content {
      position: absolute;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      width: 100%;
    }

    .gauge-value {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -1.5px;
      background: linear-gradient(180deg, #ffffff 0%, #a0a5b5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
    }

    .gauge-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Tabs */
    .pill-tabs {
      display: flex;
      gap: 8px;
      padding: 0 20px;
      overflow-x: auto;
      margin-bottom: 24px;
      animation: slideUp 0.5s ease-out 0.3s both;
    }
    
    .pill-tabs::-webkit-scrollbar {
      display: none;
    }

    .pill-tab {
      padding: 8px 16px;
      border-radius: 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .pill-tab.active {
      background: rgba(255,255,255,0.1);
      color: var(--text-main);
      border-color: rgba(255,255,255,0.2);
    }

    /* Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 0 20px 24px;
    }

    .stat-card {
      background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 2px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 12px;
    }

    .stat-chart {
      width: 100%;
      height: 36px;
      overflow: visible;
    }

    /* Activity Feed */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0 20px 16px;
      animation: slideUp 0.5s ease-out 0.6s both;
    }

    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 0 20px 32px;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: slideUp 0.5s ease-out both;
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-content {
      flex: 1;
    }

    .activity-text {
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      margin-bottom: 2px;
    }
    
    .activity-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Animations */
    @keyframes slideUp {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes gaugeFill {
      from { stroke-dashoffset: 126; }
      to { stroke-dashoffset: 31.5; } /* 75% fill */
    }

    @keyframes pulseRing {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="home-v3-container">
        {/* Sticky Header */}
        <div className="home-v3-header">
          <div className="home-v3-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="url(#brandGrad)">
              <path d="M12 2C12 2 5 10 5 15C5 18.866 8.134 22 12 22C15.866 22 19 18.866 19 15C19 10 12 2 12 2Z" />
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" />
                  <stop offset="100%" stopColor="var(--blue)" />
                </linearGradient>
              </defs>
            </svg>
            PROMO-Fuel
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>

        {/* Worker Segment Bar */}
        <div className="worker-bar-container">
          <div className="worker-segments">
            <div className="worker-segment alive"></div>
            <div className="worker-segment alive"></div>
            <div className="worker-segment alive"></div>
            <div className="worker-segment dead"></div>
            <div className="worker-segment alive"></div>
            <div className="worker-segment alive"></div>
          </div>
          <div className="worker-label">5 / 6 Активны</div>
        </div>

        {/* Hero Gauge */}
        <div className="hero-gauge">
          <svg className="gauge-svg" viewBox="0 0 100 50">
            <defs>
              <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--blue)" />
                <stop offset="50%" stopColor="var(--green)" />
                <stop offset="100%" stopColor="var(--yellow)" />
              </linearGradient>
            </defs>
            {/* Background arc */}
            <path d="M 10,45 A 35,35 0 0,1 90,45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
            {/* Foreground animated arc */}
            <path d="M 10,45 A 35,35 0 0,1 90,45" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" className="gauge-arc" />
          </svg>
          <div className="gauge-content">
            <div className="gauge-value">{counter.toLocaleString('ru')}</div>
            <div className="gauge-label">Отправлено</div>
          </div>
        </div>

        {/* Pill Tabs */}
        <div className="pill-tabs">
          <div className="pill-tab active">Все</div>
          <div className="pill-tab">Активные</div>
          <div className="pill-tab">Группы</div>
          <div className="pill-tab">Архив</div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Card 1: Deliverability */}
          <div className="stat-card" style={{ animation: "slideUp 0.5s ease-out 0.4s both" }}>
            <div className="stat-value">92.4%</div>
            <div className="stat-label">Доставляемость</div>
            <svg className="stat-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,40 L0,20 C10,18 20,25 30,15 C40,5 50,18 60,10 C70,2 80,12 90,5 C95,2 100,8 100,8 L100,40 Z" fill="url(#areaGrad1)" />
              <path d="M0,20 C10,18 20,25 30,15 C40,5 50,18 60,10 C70,2 80,12 90,5 C95,2 100,8 100,8" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Card 2: Conversion */}
          <div className="stat-card" style={{ animation: "slideUp 0.5s ease-out 0.45s both" }}>
            <div className="stat-value">14.8%</div>
            <div className="stat-label">Конверсия</div>
            <svg className="stat-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,40 L0,30 C15,35 25,25 40,28 C50,30 60,15 75,18 C85,20 95,8 100,5 L100,40 Z" fill="url(#areaGrad2)" />
              <path d="M0,30 C15,35 25,25 40,28 C50,30 60,15 75,18 C85,20 95,8 100,5" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Card 3: New Groups */}
          <div className="stat-card" style={{ animation: "slideUp 0.5s ease-out 0.5s both" }}>
            <div className="stat-value">+342</div>
            <div className="stat-label">Новые группы</div>
            <svg className="stat-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--purple)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--purple)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,40 L0,35 C10,32 20,38 30,25 C40,12 50,22 60,15 C70,8 80,18 90,5 C95,-2 100,10 100,10 L100,40 Z" fill="url(#areaGrad3)" />
              <path d="M0,35 C10,32 20,38 30,25 C40,12 50,22 60,15 C70,8 80,18 90,5 C95,-2 100,10 100,10" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Card 4: Error Rate */}
          <div className="stat-card" style={{ animation: "slideUp 0.5s ease-out 0.55s both" }}>
            <div className="stat-value">0.8%</div>
            <div className="stat-label">Ошибки API</div>
            <svg className="stat-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--yellow)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--yellow)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,40 L0,35 C15,35 25,32 40,34 C50,35 60,25 75,28 C85,30 95,20 100,22 L100,40 Z" fill="url(#areaGrad4)" />
              <path d="M0,35 C15,35 25,32 40,34 C50,35 60,25 75,28 C85,30 95,20 100,22" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="section-title">Последние действия</div>
        <div className="activity-feed">
          <div className="activity-item" style={{ animationDelay: "0.65s" }}>
            <div className="activity-icon" style={{ background: "rgba(45,232,151,0.15)", color: "var(--green)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="activity-content">
              <div className="activity-text">Рассылка «Скидка 20%» завершена</div>
              <div className="activity-time">2 минуты назад</div>
            </div>
          </div>

          <div className="activity-item" style={{ animationDelay: "0.7s" }}>
            <div className="activity-icon" style={{ background: "rgba(107,168,229,0.15)", color: "var(--blue)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div className="activity-content">
              <div className="activity-text">Воркер #4 перезапущен успешно</div>
              <div className="activity-time">15 минут назад</div>
            </div>
          </div>

          <div className="activity-item" style={{ animationDelay: "0.75s" }}>
            <div className="activity-icon" style={{ background: "rgba(196,174,255,0.15)", color: "var(--purple)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="activity-content">
              <div className="activity-text">Собрано 1,240 новых контактов</div>
              <div className="activity-time">1 час назад</div>
            </div>
          </div>

          <div className="activity-item" style={{ animationDelay: "0.8s" }}>
            <div className="activity-icon" style={{ background: "rgba(255,201,70,0.15)", color: "var(--yellow)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="activity-content">
              <div className="activity-text">Черновик «Новогоднее промо» обновлен</div>
              <div className="activity-time">2 часа назад</div>
            </div>
          </div>

          <div className="activity-item" style={{ animationDelay: "0.85s" }}>
            <div className="activity-icon" style={{ background: "rgba(255,107,122,0.15)", color: "var(--red)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="activity-content">
              <div className="activity-text">Воркер #2 отключен (Rate Limit)</div>
              <div className="activity-time">4 часа назад</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
