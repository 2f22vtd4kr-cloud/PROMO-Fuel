import { LayoutGrid, Megaphone, PenLine, Users } from "lucide-react";
import type { Tab } from "../App";
import { TG } from "../lib/theme";

const items: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: LayoutGrid, label: "Главная" },
  { id: "campaigns", icon: Megaphone, label: "Рассылки" },
  { id: "editor", icon: PenLine, label: "Редактор" },
  { id: "accounts", icon: Users, label: "Аккаунты" },
];

export function BottomNav({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <div style={{
      background: TG.nav,
      borderTop: `1px solid ${TG.border}`,
      display: "flex",
      flexShrink: 0,
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
    }}>
      {items.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNav(id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "10px 0 8px", border: "none", background: "none",
              cursor: "pointer", opacity: isActive ? 1 : 0.45,
              transition: "opacity 0.15s",
            }}
          >
            <Icon size={20} color={isActive ? TG.accentLight : TG.muted} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              color: isActive ? TG.accentLight : TG.muted,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
