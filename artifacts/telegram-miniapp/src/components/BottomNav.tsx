import { LayoutGrid, Megaphone, PenLine, Users } from "lucide-react";
import type { Tab } from "../App";
import { TG, BLUR_NAV } from "../lib/theme";

const items: { id: Tab; icon: React.ElementType; label: string; activeColor: string }[] = [
  { id: "home",      icon: LayoutGrid, label: "Главная",  activeColor: "#85b8ef" },
  { id: "campaigns", icon: Megaphone,  label: "Рассылки", activeColor: "#2de897" },
  { id: "editor",    icon: PenLine,    label: "Редактор", activeColor: "#ffc946" },
  { id: "accounts",  icon: Users,      label: "Аккаунты", activeColor: "#b39dff" },
];

export function BottomNav({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <div style={{
      background: TG.nav,
      backdropFilter: BLUR_NAV,
      WebkitBackdropFilter: BLUR_NAV,
      borderTop: "1px solid rgba(255,255,255,0.09)",
      display: "flex",
      flexShrink: 0,
      paddingBottom: "env(safe-area-inset-bottom, 10px)",
      position: "relative",
    }}>
      {/* Top specular line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.14) 70%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {items.map(({ id, icon: Icon, label, activeColor }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNav(id)}
            className="tap"
            style={{
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "11px 0 9px", border: "none",
              background: "none", position: "relative",
            }}
          >
            {isActive && (
              <div style={{
                position: "absolute",
                top: 7, left: "50%", transform: "translateX(-50%)",
                width: 52, height: 40, borderRadius: 14,
                background: `${activeColor}18`,
                border: `1px solid ${activeColor}28`,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: `0 0 18px ${activeColor}22`,
              }} />
            )}
            {isActive && (
              <div style={{
                position: "absolute", bottom: "calc(env(safe-area-inset-bottom,10px) + 3px)",
                left: "50%", transform: "translateX(-50%)",
                width: 4, height: 4, borderRadius: 2,
                background: activeColor,
                boxShadow: `0 0 8px 2px ${activeColor}88`,
              }} />
            )}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Icon
                size={20}
                color={isActive ? activeColor : "rgba(160,185,220,0.38)"}
                strokeWidth={isActive ? 2.3 : 1.65}
                style={{ transition: "color 0.2s, stroke-width 0.2s" }}
              />
              <span style={{
                fontSize: 9.5, fontWeight: isActive ? 800 : 400, letterSpacing: "0.02em",
                color: isActive ? activeColor : "rgba(160,185,220,0.38)",
                textTransform: "uppercase",
                transition: "color 0.2s",
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
