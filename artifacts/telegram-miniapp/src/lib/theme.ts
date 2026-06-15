export const TG = {
  bg: "#0b0f1a",
  bgGrad: "linear-gradient(145deg, #0b0f1a 0%, #0f1628 30%, #101830 60%, #0b1220 100%)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",
  glassHover: "rgba(255,255,255,0.10)",
  glassStrong: "rgba(255,255,255,0.12)",
  card: "rgba(255,255,255,0.06)",
  cardHover: "rgba(255,255,255,0.10)",
  nav: "rgba(11,15,26,0.85)",
  accent: "#5288c1",
  accentLight: "#7ab0e0",
  accentGrad: "linear-gradient(135deg, #5288c1 0%, #3b6fa8 100%)",
  accentGlow: "rgba(82,136,193,0.35)",
  green: "#34d399",
  greenGlow: "rgba(52,211,153,0.3)",
  red: "#f87171",
  redGlow: "rgba(248,113,113,0.3)",
  yellow: "#fbbf24",
  yellowGlow: "rgba(251,191,36,0.3)",
  purple: "#a78bfa",
  purpleGlow: "rgba(167,139,250,0.3)",
  pink: "#f472b6",
  text: "#f0f4ff",
  textSecondary: "rgba(240,244,255,0.7)",
  muted: "rgba(160,185,220,0.6)",
  border: "rgba(255,255,255,0.08)",
  navHeight: 68,
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.12)",
  inputFocus: "rgba(82,136,193,0.5)",
};

export const STATUS_META: Record<string, { color: string; glow: string; label: string }> = {
  running:   { color: TG.green,  glow: TG.greenGlow,  label: "Активна" },
  scheduled: { color: TG.yellow, glow: TG.yellowGlow, label: "Запланирована" },
  done:      { color: TG.muted,  glow: "transparent", label: "Завершена" },
  paused:    { color: TG.accent, glow: TG.accentGlow, label: "Пауза" },
  draft:     { color: TG.muted,  glow: "transparent", label: "Черновик" },
  cancelled: { color: TG.red,    glow: TG.redGlow,    label: "Отменена" },
};

export const BLUR = "blur(24px)";
export const BLUR_NAV = "blur(32px)";
