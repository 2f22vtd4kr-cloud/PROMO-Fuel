import React, { useState, useEffect } from "react";

export function HomeV2() {
  const [counter, setCounter] = useState(128450);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((prev) => prev + Math.floor(Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const styles = {
    container: {
      width: "390px",
      height: "760px",
      backgroundColor: "#060810",
      backgroundImage: "radial-gradient(circle at 50% 0%, #1a2235 0%, #060810 50%)",
      color: "#ffffff",
      fontFamily: "'Manrope', sans-serif",
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      position: "relative" as const,
      WebkitFontSmoothing: "antialiased",
    },
    header: {
      position: "sticky" as const,
      top: 0,
      zIndex: 100,
      padding: "16px 20px",
      background: "linear-gradient(to bottom, rgba(6,8,16,0.95) 0%, rgba(6,8,16,0) 100%)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "18px",
      fontWeight: 800,
      letterSpacing: "-0.5px",
    },
    workerStrip: {
      margin: "0 20px 20px",
      padding: "10px 16px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      animation: "slideUp 0.5s ease-out 0.1s both",
      opacity: 0,
    },
    dots: {
      display: "flex",
      gap: "4px",
    },
    dotAlive: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor: "#2de897",
      boxShadow: "0 0 8px rgba(45,232,151,0.6)",
    },
    dotDead: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor: "#ff6b7a",
    },
    hero: {
      margin: "0 20px 24px",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      animation: "slideUp 0.5s ease-out 0.2s both",
      opacity: 0,
    },
    counter: {
      fontSize: "48px",
      fontWeight: 800,
      letterSpacing: "-2px",
      background: "linear-gradient(180deg, #ffffff 0%, #a0a5b5 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      lineHeight: 1.1,
    },
    counterLabel: {
      fontSize: "13px",
      color: "rgba(255,255,255,0.5)",
      fontWeight: 500,
      marginTop: "4px",
      textTransform: "uppercase" as const,
      letterSpacing: "1px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      margin: "0 20px 24px",
    },
    card: {
      background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(32px) saturate(160%)",
      WebkitBackdropFilter: "blur(32px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "24px",
      padding: "16px",
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    cardHighlight: {
      position: "absolute" as const,
      top: 0,
      left: "10%",
      right: "10%",
      height: "1px",
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
      opacity: 0.8,
    },
    cardValue: {
      fontSize: "24px",
      fontWeight: 800,
      marginTop: "8px",
      marginBottom: "4px",
    },
    cardLabel: {
      fontSize: "12px",
      color: "rgba(255,255,255,0.5)",
      fontWeight: 500,
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 700,
      margin: "0 20px 12px",
      color: "rgba(255,255,255,0.9)",
      animation: "slideUp 0.5s ease-out 0.5s both",
      opacity: 0,
    },
    campaignList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
      margin: "0 20px 24px",
    },
    campaignRow: {
      background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "20px",
      padding: "16px",
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    progressTrack: {
      height: "4px",
      background: "rgba(255,255,255,0.05)",
      borderRadius: "2px",
      marginTop: "12px",
      overflow: "hidden" as const,
    },
    progressBar: {
      height: "100%",
      background: "linear-gradient(90deg, #2de897, #6ba8e5)",
      borderRadius: "2px",
      animation: "progressFill 2s ease-out forwards",
    },
  };

  const sparkline1 = (
    <svg width="60" height="20" viewBox="0 0 60 20" style={{ marginTop: 8 }}>
      <path d="M0 15 Q 10 12 20 18 T 40 10 T 60 4" fill="none" stroke="#2de897" strokeWidth="2" strokeLinecap="round" />
      <path d="M0 15 Q 10 12 20 18 T 40 10 T 60 4 L 60 20 L 0 20 Z" fill="url(#grad1)" opacity="0.3" />
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2de897" stopOpacity="1" />
          <stop offset="100%" stopColor="#2de897" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );

  const sparkline2 = (
    <svg width="60" height="20" viewBox="0 0 60 20" style={{ marginTop: 8 }}>
      <path d="M0 8 Q 10 15 20 10 T 40 12 T 60 2" fill="none" stroke="#ffc946" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes progressFill {
          from { width: 0; }
        }
        ::-webkit-scrollbar {
          width: 0px;
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#fuelGrad)">
              <path d="M12 2C12 2 5 10 5 15C5 18.866 8.134 22 12 22C15.866 22 19 18.866 19 15C19 10 12 2 12 2Z" />
              <defs>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2de897" />
                  <stop offset="100%" stopColor="#6ba8e5" />
                </linearGradient>
              </defs>
            </svg>
            PROMO-Fuel
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>

        <div style={styles.workerStrip}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>Воркеры онлайн</div>
          <div style={styles.dots}>
            <div style={styles.dotAlive} />
            <div style={styles.dotAlive} />
            <div style={styles.dotAlive} />
            <div style={styles.dotAlive} />
            <div style={styles.dotDead} />
          </div>
        </div>

        <div style={styles.hero}>
          <div style={styles.counter}>{counter.toLocaleString('ru')}</div>
          <div style={styles.counterLabel}>Всего отправлено</div>
        </div>

        <div style={styles.grid}>
          <div style={{ ...styles.card, animation: "slideUp 0.5s ease-out 0.3s both" }}>
            <div style={styles.cardHighlight} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2de897" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <div style={styles.cardValue}>84.2%</div>
            <div style={styles.cardLabel}>Доставляемость</div>
            {sparkline1}
          </div>
          <div style={{ ...styles.card, animation: "slideUp 0.5s ease-out 0.4s both" }}>
            <div style={styles.cardHighlight} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffc946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div style={styles.cardValue}>1.2s</div>
            <div style={styles.cardLabel}>Задержка API</div>
            {sparkline2}
          </div>
        </div>

        <div style={styles.sectionTitle}>Активные рассылки</div>
        
        <div style={styles.campaignList}>
          <div style={{ ...styles.campaignRow, animation: "slideUp 0.5s ease-out 0.6s both" }}>
            <div style={styles.cardHighlight} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>Скидка 10% Выходные</div>
              <div style={{ fontSize: "12px", color: "#2de897", background: "rgba(45,232,151,0.1)", padding: "2px 8px", borderRadius: "10px" }}>Live</div>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>4,520 / 5,000 отправлено</div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: "90%" }} />
            </div>
          </div>

          <div style={{ ...styles.campaignRow, animation: "slideUp 0.5s ease-out 0.7s both" }}>
            <div style={styles.cardHighlight} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>Кофе в подарок</div>
              <div style={{ fontSize: "12px", color: "#6ba8e5", background: "rgba(107,168,229,0.1)", padding: "2px 8px", borderRadius: "10px" }}>Live</div>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>1,200 / 10,000 отправлено</div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: "12%", background: "linear-gradient(90deg, #6ba8e5, #c4aeff)" }} />
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
