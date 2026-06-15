export const TG = {
  bg: "#17212b",
  card: "#1e2c3a",
  cardHover: "#243342",
  accent: "#5288c1",
  accentLight: "#6ba3d6",
  accentGrad: "linear-gradient(135deg, #5288c1, #3b6fa8)",
  green: "#4dca6b",
  red: "#e04a4a",
  yellow: "#f5a623",
  purple: "#a78bfa",
  text: "#ffffff",
  muted: "#7d9eb5",
  border: "#253443",
  nav: "#232e3c",
  navHeight: 60,
  inputBg: "#243342",
};

export const STATUS_META: Record<string, { color: string; label: string }> = {
  running: { color: TG.green, label: "Активна" },
  scheduled: { color: TG.yellow, label: "Запланирована" },
  done: { color: TG.muted, label: "Завершена" },
  paused: { color: TG.accent, label: "Пауза" },
  draft: { color: TG.muted, label: "Черновик" },
  cancelled: { color: TG.red, label: "Отменена" },
};
