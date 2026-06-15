import { TG } from "../lib/theme";

export function Spinner({ size = 28, color }: { size?: number; color?: string }) {
  const c = color ?? TG.accentLight;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{
        position: "absolute", inset: 0,
        border: `2px solid rgba(255,255,255,0.06)`,
        borderTopColor: c,
        borderRadius: "50%",
        animation: "spin 0.72s linear infinite",
        filter: `drop-shadow(0 0 ${size * 0.18}px ${c}88)`,
      }} />
      <div style={{
        position: "absolute", inset: Math.max(3, size * 0.15),
        border: "1.5px solid rgba(255,255,255,0.04)",
        borderTopColor: c + "44",
        borderRadius: "50%",
        animation: "spin 1.3s linear infinite reverse",
      }} />
    </div>
  );
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ position: "relative" }}>
        <Spinner size={44} />
        <div style={{
          position: "absolute", inset: -12, borderRadius: "50%",
          background: `radial-gradient(circle, ${TG.accentGlow} 0%, transparent 70%)`,
          animation: "pulseSoft 2s ease-in-out infinite",
        }} />
      </div>
      <span style={{ fontSize: 13, color: TG.muted, letterSpacing: "0.02em" }}>{label ?? "Загрузка..."}</span>
    </div>
  );
}
