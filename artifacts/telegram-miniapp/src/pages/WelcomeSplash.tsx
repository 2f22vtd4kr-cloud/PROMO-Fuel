import { useEffect, useState } from "react";
import { haptic } from "../lib/haptics";

interface Props {
  onDone: () => void;
}

export function WelcomeSplash({ onDone }: Props) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    haptic.medium();
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => { setPhase("out"); haptic.light(); }, 3600);
    const t3 = setTimeout(() => onDone(), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  function skip() {
    setPhase("out");
    setTimeout(() => onDone(), 500);
  }

  return (
    <div
      onClick={skip}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden", cursor: "pointer",
        background: "#000",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.55s ease-in" : "opacity 0.4s ease-out",
      }}
    >
      <style>{`
        @keyframes flagSlideDown {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        @keyframes flagSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes numReveal {
          0%   { opacity: 0; transform: scale(2.4) rotate(-8deg); filter: blur(24px); }
          60%  { opacity: 1; transform: scale(1.04) rotate(0.5deg); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) rotate(0); filter: blur(0); }
        }
        @keyframes textReveal {
          0%   { opacity: 0; transform: translateY(32px) skewX(-3deg); letter-spacing: 0.35em; }
          100% { opacity: 1; transform: translateY(0) skewX(0); letter-spacing: 0.09em; }
        }
        @keyframes dividerGrow {
          from { width: 0; opacity: 0; }
          to   { width: 88%; opacity: 1; }
        }
        @keyframes glowPulse {
          0%,100% { text-shadow: 0 0 40px rgba(255,213,0,0.9), 0 0 80px rgba(255,213,0,0.5), 0 0 120px rgba(255,180,0,0.3); }
          50%     { text-shadow: 0 0 60px rgba(255,213,0,1),   0 0 120px rgba(255,213,0,0.7), 0 0 200px rgba(255,140,0,0.5); }
        }
        @keyframes crestFloat {
          0%,100% { transform: translateY(0) scale(1) rotate(-2deg); }
          50%     { transform: translateY(-8px) scale(1.04) rotate(2deg); }
        }
        @keyframes spark {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) translateX(var(--tx)) scale(0); opacity: 0; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); opacity: 0.06; }
          50%  { opacity: 0.12; }
          100% { transform: translateY(200%); opacity: 0.06; }
        }
        @keyframes vignettePulse {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 0.72; }
        }
        @keyframes borderFlare {
          0%,100% { opacity: 0.5; }
          50%     { opacity: 1; }
        }
      `}</style>

      {/* ── Ukrainian flag halves ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        background: "linear-gradient(180deg, #003f8a 0%, #005BBB 70%, #0066cc 100%)",
        animation: "flagSlideDown 0.55s cubic-bezier(0.16,1,0.3,1) both",
        animationDelay: "0ms",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: "linear-gradient(0deg, #cc9900 0%, #FFD500 70%, #ffe033 100%)",
        animation: "flagSlideUp 0.55s cubic-bezier(0.16,1,0.3,1) both",
        animationDelay: "0ms",
      }} />

      {/* ── Vignette overlay ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.72) 100%)",
        animation: "vignettePulse 3s ease-in-out infinite",
      }} />

      {/* ── Scanline effect ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: "30%",
          background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent)",
          animation: "scanline 4s linear infinite",
        }} />
      </div>

      {/* ── Animated border flare ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        border: "2px solid rgba(255,213,0,0.35)",
        animation: "borderFlare 2s ease-in-out infinite",
      }} />

      {/* ── Spark particles ── */}
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          bottom: "50%",
          left: `${10 + i * 5}%`,
          width: i % 3 === 0 ? 4 : 3,
          height: i % 3 === 0 ? 4 : 3,
          borderRadius: "50%",
          background: i % 2 === 0 ? "#FFD500" : "#fff",
          "--tx": `${(i % 7 - 3) * 18}px`,
          animation: `spark ${0.9 + (i % 5) * 0.28}s ease-out infinite`,
          animationDelay: `${(i * 0.17) % 1.4}s`,
          opacity: 0,
        } as React.CSSProperties} />
      ))}

      {/* ── Center content ── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 0,
        padding: "0 20px",
        textAlign: "center",
      }}>

        {/* Trident */}
        <div style={{
          fontSize: 56,
          lineHeight: 1,
          marginBottom: 12,
          animation: "crestFloat 3.5s ease-in-out infinite, numReveal 0.7s cubic-bezier(0.16,1,0.3,1) both",
          animationDelay: "0s, 0.2s",
          filter: "drop-shadow(0 0 18px rgba(255,213,0,0.9)) drop-shadow(0 0 40px rgba(255,213,0,0.5))",
        }}>🔱</div>

        {/* 1488 */}
        <div style={{
          fontSize: "clamp(80px, 22vw, 128px)",
          fontWeight: 900,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          color: "#FFD500",
          fontFamily: "'SF Pro Display', 'Inter', system-ui, sans-serif",
          animation: "numReveal 0.75s cubic-bezier(0.16,1,0.3,1) both, glowPulse 2.2s ease-in-out infinite",
          animationDelay: "0.25s, 1.1s",
          userSelect: "none",
          WebkitTextStroke: "1.5px rgba(255,180,0,0.6)",
        }}>
          1488
        </div>

        {/* Divider */}
        <div style={{
          height: 2, margin: "18px auto",
          background: "linear-gradient(90deg, transparent, rgba(255,213,0,0.9), rgba(255,255,255,0.7), rgba(255,213,0,0.9), transparent)",
          animation: "dividerGrow 0.6s cubic-bezier(0.16,1,0.3,1) both",
          animationDelay: "0.7s",
          boxShadow: "0 0 12px rgba(255,213,0,0.7)",
          borderRadius: 2,
          alignSelf: "stretch",
          maxWidth: 340,
          width: "100%",
        }} />

        {/* Main slogan */}
        <div style={{
          fontSize: "clamp(16px, 4.8vw, 22px)",
          fontWeight: 900,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "#fff",
          lineHeight: 1.25,
          maxWidth: 320,
          animation: "textReveal 0.65s cubic-bezier(0.16,1,0.3,1) both",
          animationDelay: "0.9s",
          userSelect: "none",
          textShadow: "0 2px 16px rgba(0,0,0,0.8), 0 0 32px rgba(255,255,255,0.15)",
        }}>
          ЇБАТЬ РУСНЮ
        </div>

        <div style={{
          fontSize: "clamp(13px, 3.6vw, 17px)",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.3,
          maxWidth: 300,
          marginTop: 6,
          animation: "textReveal 0.65s cubic-bezier(0.16,1,0.3,1) both",
          animationDelay: "1.05s",
          userSelect: "none",
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        }}>
          ДО ОСТАННЬОГО
        </div>

        <div style={{
          fontSize: "clamp(18px, 5.4vw, 26px)",
          fontWeight: 900,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "#FFD500",
          lineHeight: 1.2,
          marginTop: 4,
          animation: "textReveal 0.65s cubic-bezier(0.16,1,0.3,1) both, glowPulse 2.2s ease-in-out infinite",
          animationDelay: "1.2s, 2s",
          userSelect: "none",
          textShadow: "0 0 24px rgba(255,213,0,0.8), 0 2px 12px rgba(0,0,0,0.8)",
        }}>
          НЄ БРОСІМ
        </div>

        {/* Bottom hint */}
        <div style={{
          marginTop: 36,
          fontSize: 11,
          color: "rgba(255,255,255,0.28)",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          animation: "textReveal 0.5s ease both",
          animationDelay: "2s",
          userSelect: "none",
        }}>
          Натисни щоб продовжити
        </div>
      </div>

      {/* ── Corner tridents ── */}
      {[
        { top: 16, left: 16 },
        { top: 16, right: 16 },
        { bottom: 16, left: 16 },
        { bottom: 16, right: 16 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: "absolute",
          ...pos,
          fontSize: 20,
          opacity: 0.35,
          filter: "drop-shadow(0 0 6px rgba(255,213,0,0.6))",
          animation: `crestFloat ${3 + i * 0.4}s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`,
          userSelect: "none",
        }}>🔱</div>
      ))}
    </div>
  );
}
