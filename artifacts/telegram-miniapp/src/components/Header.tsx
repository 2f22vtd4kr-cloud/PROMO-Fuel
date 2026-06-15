import { TG, BLUR } from "../lib/theme";

export function Header({ title, subtitle, right }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(11,15,26,0.7)",
      backdropFilter: BLUR,
      WebkitBackdropFilter: BLUR,
      borderBottom: `1px solid ${TG.glassBorder}`,
      padding: "14px 16px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.4px", color: TG.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: TG.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
