import { TG } from "../lib/theme";

export function Header({ title, subtitle, right, accent }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(10,14,26,0.82) 0%, rgba(8,11,20,0.72) 100%)",
      backdropFilter: "blur(52px) saturate(200%)",
      WebkitBackdropFilter: "blur(52px) saturate(200%)",
      borderBottom: "1px solid rgba(255,255,255,0.09)",
      padding: "15px 16px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
      position: "relative",
    }}>
      {/* Specular top edge */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 2%, rgba(255,255,255,0.42) 35%, rgba(255,255,255,0.60) 50%, rgba(255,255,255,0.42) 65%, transparent 98%)",
        pointerEvents: "none",
      }} />
      {/* Prismatic underline */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 5%, rgba(107,168,229,0.18) 30%, rgba(196,174,255,0.18) 50%, rgba(45,232,151,0.14) 70%, transparent 95%)",
        pointerEvents: "none",
      }} />
      <div>
        <div style={{
          fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px",
          background: accent ?? "linear-gradient(135deg, #eef2ff 0%, rgba(149,196,245,0.88) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: TG.muted, marginTop: 2, letterSpacing: "0.01em" }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
