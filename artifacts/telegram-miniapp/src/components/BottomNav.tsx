import { LayoutGrid, Megaphone, BarChart2, Users2, Shield } from "lucide-react";
import type { Tab } from "../App";
import { TG } from "../lib/theme";
import { haptic } from "../lib/haptics";

const ITEMS: { id: Tab; icon: React.ElementType; label: string; color: string; glow: string }[] = [
  { id: "home",      icon: LayoutGrid, label: "Главная",   color: "#95c4f5", glow: "rgba(107,168,229,0.55)" },
  { id: "campaigns", icon: Megaphone,  label: "Рассылки",  color: "#2de897", glow: "rgba(45,232,151,0.55)" },
  { id: "analytics", icon: BarChart2,  label: "Аналитика", color: "#ffc946", glow: "rgba(255,201,70,0.55)" },
  { id: "audience",  icon: Users2,     label: "Аудитория", color: "#c4aeff", glow: "rgba(196,174,255,0.55)" },
  { id: "accounts",  icon: Shield,     label: "Аккаунты",  color: "#ff7eb3", glow: "rgba(255,126,179,0.55)" },
];

export function BottomNav({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <div style={{
      paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 4px)",
      paddingLeft: 12, paddingRight: 12, paddingTop: 8,
      position: "relative",
    }}>
      {/* Floating glass pill container */}
      <div style={{
        display: "flex",
        background: "linear-gradient(145deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 60%,rgba(255,255,255,0.08) 100%)",
        backdropFilter: "blur(48px) saturate(190%)",
        WebkitBackdropFilter: "blur(48px) saturate(190%)",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.17)",
        boxShadow: "0 2px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 16px 48px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.22)",
        position: "relative",
        overflow: "hidden",
        padding: "4px 4px",
      }}>
        {/* Top specular highlight */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent 3%, rgba(255,255,255,0.58) 30%, rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.58) 70%, transparent 97%)",
          pointerEvents: "none", zIndex: 3,
        }} />
        {/* Prismatic overlay */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          background: "linear-gradient(135deg,rgba(120,185,255,0.06) 0%,rgba(255,130,200,0.04) 35%,rgba(100,255,170,0.04) 65%,rgba(190,130,255,0.055) 100%)",
          pointerEvents: "none", zIndex: 1,
        }} />

        {ITEMS.map(({ id, icon: Icon, label, color, glow }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (!isActive) haptic.select();
                else haptic.light();
                onNav(id);
              }}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, padding: "9px 2px 8px",
                border: "none", background: "none",
                position: "relative", zIndex: 2,
                cursor: "pointer",
                minHeight: 54,
              }}
            >
              {/* Active bubble */}
              {isActive && (
                <div style={{
                  position: "absolute",
                  inset: "2px 4px",
                  borderRadius: 20,
                  background: `linear-gradient(145deg,${color}22 0%,${color}10 100%)`,
                  border: `1px solid ${color}35`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: `0 0 24px ${glow}40, inset 0 1px 0 ${color}28`,
                  animation: "navPop 0.36s cubic-bezier(0.16,1,0.3,1) both",
                }} />
              )}

              {/* Icon */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <Icon
                  size={isActive ? 21 : 19}
                  color={isActive ? color : "rgba(160,190,230,0.72)"}
                  strokeWidth={isActive ? 2.4 : 1.6}
                  style={{
                    transition: "color 0.22s, stroke-width 0.22s, filter 0.22s",
                    filter: isActive ? `drop-shadow(0 0 8px ${glow})` : "none",
                  }}
                />
              </div>

              {/* Label */}
              <span style={{
                fontSize: 9, fontWeight: isActive ? 800 : 400,
                letterSpacing: "0.03em",
                color: isActive ? color : "rgba(160,190,230,0.65)",
                textTransform: "uppercase",
                transition: "color 0.22s",
                position: "relative", zIndex: 1,
              }}>
                {label}
              </span>

              {/* Active dot */}
              {isActive && (
                <div style={{
                  position: "absolute", bottom: 4, left: "50%",
                  transform: "translateX(-50%)",
                  width: 3, height: 3, borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 8px 2px ${glow}`,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
