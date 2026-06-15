import { TG } from "../lib/theme";

export default function LoadingSpinner({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      gap: 12,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `3px solid ${TG.accent ?? "#6ba8e5"}22`,
        borderTopColor: TG.accent ?? "#6ba8e5",
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ color: TG.muted, fontSize: 13 }}>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
