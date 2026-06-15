type TGUser = { id: number; first_name: string; last_name?: string; username?: string; language_code?: string };
type TGWebApp = {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  HapticFeedback: {
    impactOccurred: (s: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (s: "success" | "error" | "warning") => void;
    selectionChanged: () => void;
  };
  initDataUnsafe?: { user?: TGUser };
  colorScheme?: "light" | "dark";
  viewportHeight?: number;
  isExpanded?: boolean;
};

function getTG(): TGWebApp | null {
  return (window as any).Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTG();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#07090f");
    tg.setBackgroundColor?.("#07090f");
  } catch {}
}

export function getTelegramUser(): TGUser | null {
  return getTG()?.initDataUnsafe?.user ?? null;
}

export function getOwnerRole(): "owner" | "user" {
  const ownerIdsRaw = (import.meta.env.VITE_OWNER_IDS as string) ?? "";
  const ownerIds = ownerIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ownerIds.length === 0) return "owner";
  const user = getTelegramUser();
  if (!user) return "owner";
  return ownerIds.includes(String(user.id)) ? "owner" : "user";
}
