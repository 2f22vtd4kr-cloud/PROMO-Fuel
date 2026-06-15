export const TG = {
  bg: "#080c15",
  glass:       "rgba(255,255,255,0.055)",
  glassMid:    "rgba(255,255,255,0.09)",
  glassStrong: "rgba(255,255,255,0.14)",
  glassHover:  "rgba(255,255,255,0.11)",
  glassBorder: "rgba(255,255,255,0.11)",
  glassBorderStrong: "rgba(255,255,255,0.18)",
  shine: "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 60%)",

  nav: "rgba(8,12,21,0.82)",

  accent:      "#5b96d4",
  accentLight: "#85b8ef",
  accentGrad:  "linear-gradient(135deg, #5b96d4 0%, #3a6fad 100%)",
  accentGlow:  "rgba(91,150,212,0.38)",
  accentShine: "rgba(133,184,239,0.18)",

  green:      "#2de897",
  greenDim:   "#21c07a",
  greenGlow:  "rgba(45,232,151,0.32)",

  red:        "#ff6b7a",
  redDim:     "#e04a5a",
  redGlow:    "rgba(255,107,122,0.32)",

  yellow:     "#ffc946",
  yellowDim:  "#d9a52e",
  yellowGlow: "rgba(255,201,70,0.32)",

  purple:     "#b39dff",
  purpleDim:  "#9178e0",
  purpleGlow: "rgba(179,157,255,0.32)",

  pink:       "#ff7eb3",
  pinkGlow:   "rgba(255,126,179,0.32)",

  text:          "#eef2ff",
  textSecondary: "rgba(220,230,255,0.65)",
  muted:         "rgba(160,185,220,0.55)",

  border:  "rgba(255,255,255,0.08)",
  navHeight: 76,
  inputBg:     "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.13)",
};

export const STATUS_META: Record<string, { color: string; dim: string; glow: string; label: string; grad: string }> = {
  running:   { color: "#2de897", dim: "#21c07a", glow: "rgba(45,232,151,0.32)",   label: "Активна",       grad: "linear-gradient(135deg,#2de897,#17a86a)" },
  scheduled: { color: "#ffc946", dim: "#d9a52e", glow: "rgba(255,201,70,0.32)",   label: "Запланирована", grad: "linear-gradient(135deg,#ffc946,#d9852e)" },
  done:      { color: "rgba(160,185,220,0.55)", dim: "rgba(120,150,180,0.4)", glow: "transparent", label: "Завершена",      grad: "linear-gradient(135deg,#8aa3c0,#607080)" },
  paused:    { color: "#5b96d4", dim: "#3a6fad", glow: "rgba(91,150,212,0.32)",   label: "Пауза",         grad: "linear-gradient(135deg,#5b96d4,#3a6fad)" },
  draft:     { color: "rgba(160,185,220,0.55)", dim: "rgba(120,150,180,0.4)", glow: "transparent", label: "Черновик",       grad: "linear-gradient(135deg,#8aa3c0,#607080)" },
  cancelled: { color: "#ff6b7a", dim: "#e04a5a", glow: "rgba(255,107,122,0.32)",  label: "Отменена",      grad: "linear-gradient(135deg,#ff6b7a,#c03040)" },
};

export const BLUR   = "blur(28px)";
export const BLUR_NAV = "blur(40px)";
export const BLUR_HEAVY = "blur(48px)";
