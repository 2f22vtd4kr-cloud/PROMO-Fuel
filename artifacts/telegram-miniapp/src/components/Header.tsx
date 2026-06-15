import { TG } from "../lib/theme";

export function Header({ title, subtitle, right }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{
      background: TG.card,
      borderBottom: `1px solid ${TG.border}`,
      padding: "14px 16px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: TG.muted, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
