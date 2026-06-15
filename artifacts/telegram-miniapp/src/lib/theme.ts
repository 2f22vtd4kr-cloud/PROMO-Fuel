export const TG = {
  bg: "#07090f",
  glass:            "rgba(255,255,255,0.065)",
  glassMid:         "rgba(255,255,255,0.10)",
  glassStrong:      "rgba(255,255,255,0.15)",
  glassHover:       "rgba(255,255,255,0.11)",
  glassBorder:      "rgba(255,255,255,0.13)",
  glassBorderStrong:"rgba(255,255,255,0.22)",

  lgSurface: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
  lgBorder:  "rgba(255,255,255,0.18)",
  lgShine:   "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 50%)",
  lgPrism:   "linear-gradient(135deg, rgba(120,180,255,0.07) 0%, rgba(255,120,200,0.05) 35%, rgba(120,255,170,0.04) 65%, rgba(180,120,255,0.07) 100%)",
  lgInnerShadow: "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.12)",

  nav: "rgba(7,9,15,0.85)",

  accent:      "#6ba8e5",
  accentLight: "#95c4f5",
  accentDark:  "#3a6fad",
  accentGrad:  "linear-gradient(135deg, #6ba8e5 0%, #3a6fad 100%)",
  accentGlow:  "rgba(107,168,229,0.45)",
  accentShine: "rgba(149,196,245,0.18)",

  green:      "#2de897",
  greenDim:   "#21c07a",
  greenGlow:  "rgba(45,232,151,0.38)",
  greenGrad:  "linear-gradient(135deg, #2de897 0%, #17a86a 100%)",

  red:        "#ff6b7a",
  redDim:     "#e04a5a",
  redGlow:    "rgba(255,107,122,0.38)",
  redGrad:    "linear-gradient(135deg, #ff6b7a 0%, #c03040 100%)",

  yellow:     "#ffc946",
  yellowDim:  "#d9a52e",
  yellowGlow: "rgba(255,201,70,0.38)",
  yellowGrad: "linear-gradient(135deg, #ffc946 0%, #d9852e 100%)",

  purple:     "#c4aeff",
  purpleDim:  "#9178e0",
  purpleGlow: "rgba(196,174,255,0.38)",
  purpleGrad: "linear-gradient(135deg, #c4aeff 0%, #7c5fcf 100%)",

  pink:       "#ff7eb3",
  pinkGlow:   "rgba(255,126,179,0.38)",
  pinkGrad:   "linear-gradient(135deg, #ff7eb3 0%, #c04070 100%)",

  teal:       "#22d3ee",
  tealGlow:   "rgba(34,211,238,0.35)",
  tealGrad:   "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",

  text:          "#eef2ff",
  textSecondary: "rgba(220,232,255,0.68)",
  muted:         "rgba(160,190,230,0.50)",

  border:    "rgba(255,255,255,0.08)",
  inputBg:   "rgba(255,255,255,0.045)",
  inputBorder: "rgba(255,255,255,0.14)",

  navHeight: 80,
};

export const STATUS_META: Record<string, { color: string; dim: string; glow: string; label: string; grad: string }> = {
  running:   { color: "#2de897", dim: "#21c07a", glow: "rgba(45,232,151,0.38)",   label: "Активна",       grad: "linear-gradient(135deg,#2de897,#17a86a)" },
  scheduled: { color: "#ffc946", dim: "#d9a52e", glow: "rgba(255,201,70,0.38)",   label: "Запланирована", grad: "linear-gradient(135deg,#ffc946,#d9852e)" },
  done:      { color: "rgba(160,190,230,0.55)", dim: "rgba(120,150,180,0.4)", glow: "transparent", label: "Завершена", grad: "linear-gradient(135deg,#8aa3c0,#607080)" },
  paused:    { color: "#6ba8e5", dim: "#3a6fad", glow: "rgba(107,168,229,0.38)",   label: "Пауза",         grad: "linear-gradient(135deg,#6ba8e5,#3a6fad)" },
  draft:     { color: "rgba(160,190,230,0.55)", dim: "rgba(120,150,180,0.4)", glow: "transparent", label: "Черновик",  grad: "linear-gradient(135deg,#8aa3c0,#607080)" },
  cancelled: { color: "#ff6b7a", dim: "#e04a5a", glow: "rgba(255,107,122,0.38)",  label: "Отменена",      grad: "linear-gradient(135deg,#ff6b7a,#c03040)" },
};

export const BLUR      = "blur(32px) saturate(160%)";
export const BLUR_NAV  = "blur(48px) saturate(180%)";
export const BLUR_HEAVY = "blur(56px) saturate(200%)";
