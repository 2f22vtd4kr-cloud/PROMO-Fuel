import { LayoutGrid, Megaphone, PenLine, Users } from "lucide-react";
import type { Tab } from "../App";
import { TG, BLUR_NAV } from "../lib/theme";

const items: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "home",      icon: LayoutGrid, label: "Главная" },
  { id: "campaigns", icon: Megaphone,  label: "Рассылки" },
  { id: "editor",    icon: PenLine,    label: "Редактор" },
  { id: "accounts",  icon: Users,      label: "Аккаунты" },
];

export function BottomNav({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <div style={{
      background: TG.nav,
      backdropFilter: BLUR_NAV,
      WebkitBackdropFilter: BLUR_NAV,
      borderTop: `1px solid ${TG.glassBorder}`,
      display: "flex",
      flexShrink: 0,
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
      position: "relative",
    }}>
      {items.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNav(id)}
            className="tap"
            style={{
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "10px 0 8px", border: "none",
              background: "none", cursor: "pointer",
              position: "relative",
            }}
          >
            {isActive && (
              <div style={{
                position: "absolute",
                top: 6, left: "50%", transform: "translateX(-50%)",
                width: 44, height: 36, borderRadius: 12,
                background: `rgba(82,136,193,0.14)`,
                border: "1px solid rgba(82,136,193,0.25)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                zIndex: 0,
              }} />
            )}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Icon
                size={20}
                color={isActive ? TG.accentLight : "rgba(160,185,220,0.45)"}
                strokeWidth={isActive ? 2.2 : 1.7}
              />
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                color: isActive ? TG.accentLight : "rgba(160,185,220,0.45)",
                letterSpacing: isActive ? "0.01em" : 0,
                transition: "color 0.15s",
              }}>
                {label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
