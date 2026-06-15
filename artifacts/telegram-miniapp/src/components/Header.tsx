import { TG, BLUR_HEAVY } from "../lib/theme";

export function Header({ title, subtitle, right, accent }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div style={{
      background: "rgba(8,12,21,0.72)",
      backdropFilter: BLUR_HEAVY,
      WebkitBackdropFilter: BLUR_HEAVY,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "14px 16px 13px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
      position: "relative",
    }}>
      {/* Top specular line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.18) 60%, transparent 100%)",
        pointerEvents: "none",
      }} />
      <div>
        <div style={{
          fontSize: 17, fontWeight: 800, letterSpacing: "-0.5px",
          background: accent ?? "linear-gradient(135deg, #eef2ff 0%, rgba(133,184,239,0.85) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: TG.muted, marginTop: 2, letterSpacing: "0.01em" }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
