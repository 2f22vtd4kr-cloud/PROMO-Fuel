import { TG } from "../lib/theme";

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${TG.border}`,
      borderTopColor: TG.accent,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

export function FullSpinner() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Spinner size={32} />
    </div>
  );
}
