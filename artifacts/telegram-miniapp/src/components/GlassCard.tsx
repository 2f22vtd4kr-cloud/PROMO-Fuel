const BLUR = "blur(32px) saturate(160%)";

export function GlassCard({
  children,
  style = {},
  glow,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
        boxShadow: glow
          ? `0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 4px 24px ${glow}`
          : "0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.55) 35%,rgba(255,255,255,0.70) 50%,rgba(255,255,255,0.55) 65%,transparent 95%)",
        pointerEvents: "none", zIndex: 3,
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: "linear-gradient(135deg, rgba(120,180,255,0.07) 0%, rgba(255,120,200,0.05) 35%, rgba(120,255,170,0.04) 65%, rgba(180,120,255,0.07) 100%)",
        pointerEvents: "none", zIndex: 1,
      }} />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    sent:       { color: "#a0b8e6", bg: "rgba(160,184,230,0.12)", label: "Готово" },
    running:    { color: "#2de897", bg: "rgba(45,232,151,0.15)",  label: "Активна" },
    sending:    { color: "#2de897", bg: "rgba(45,232,151,0.15)",  label: "Отправка" },
    scheduled:  { color: "#ffc946", bg: "rgba(255,201,70,0.15)",  label: "Запланирована" },
    paused:     { color: "#6ba8e5", bg: "rgba(107,168,229,0.15)", label: "Пауза" },
    draft:      { color: "rgba(160,190,230,0.50)", bg: "rgba(255,255,255,0.06)", label: "Черновик" },
    done:       { color: "rgba(160,190,230,0.50)", bg: "rgba(255,255,255,0.06)", label: "Готово" },
    idle:       { color: "#2de897", bg: "rgba(45,232,151,0.15)",  label: "Готов" },
    offline:    { color: "#6ba8e5", bg: "rgba(107,168,229,0.15)", label: "Офлайн" },
    banned:     { color: "#ff6b7a", bg: "rgba(255,107,122,0.15)", label: "Заблокирован" },
    flood:      { color: "#ffc946", bg: "rgba(255,201,70,0.15)",  label: "Флуд-wait" },
  };
  const s = map[status] ?? map["draft"]!;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}40`,
      borderRadius: 20, padding: "2px 8px",
      whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}
