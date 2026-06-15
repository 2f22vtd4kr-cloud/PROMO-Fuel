const tg = () => (window as any).Telegram?.WebApp?.HapticFeedback;

export const haptic = {
  light:   () => tg()?.impactOccurred("light"),
  medium:  () => tg()?.impactOccurred("medium"),
  heavy:   () => tg()?.impactOccurred("heavy"),
  rigid:   () => tg()?.impactOccurred("rigid"),
  soft:    () => tg()?.impactOccurred("soft"),
  success: () => tg()?.notificationOccurred("success"),
  error:   () => tg()?.notificationOccurred("error"),
  warning: () => tg()?.notificationOccurred("warning"),
  select:  () => tg()?.selectionChanged(),
};
