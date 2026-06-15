import { TG } from "../lib/theme";

export function Spinner({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(255,255,255,0.08)`,
      borderTopColor: color ?? TG.accentLight,
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite",
    }} />
  );
}

export function FullSpinner() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <Spinner size={36} />
      <span style={{ fontSize: 13, color: TG.muted }}>Загрузка...</span>
    </div>
  );
}
