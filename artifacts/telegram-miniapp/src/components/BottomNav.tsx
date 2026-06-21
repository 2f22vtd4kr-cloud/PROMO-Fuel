import { LayoutGrid, Megaphone, BarChart2, Users2, Radio, Cpu, LayoutDashboard, Key } from "lucide-react";
import type { Tab } from "../App";
import { TG } from "../lib/theme";
import { haptic } from "../lib/haptics";
import { useI18n } from "../lib/i18n";

export function BottomNav({
  active,
  onNav,
  onNavigate,
}: {
  active: Tab;
  onNav: (t: Tab) => void;
  onNavigate?: (t: string) => void;
}) {
  const { t } = useI18n();

  type NavItem =
    | { id: Tab;   kind: "tab";    icon: React.ElementType; label: string; color: string; glow: string }
    | { id: string; kind: "action"; icon: React.ElementType; label: string; color: string; glow: string };

  const ITEMS: NavItem[] = [
    { id: "dashboard", kind: "tab",    icon: LayoutDashboard, label: t.nav.dashboard,  color: "#22d3ee", glow: "rgba(34,211,238,0.55)"  },
    { id: "home",      kind: "tab",    icon: LayoutGrid,      label: t.nav.home,        color: "#95c4f5", glow: "rgba(107,168,229,0.55)" },
    { id: "campaigns", kind: "tab",    icon: Megaphone,       label: t.nav.campaigns,   color: "#2de897", glow: "rgba(45,232,151,0.55)"  },
    { id: "groups",    kind: "tab",    icon: Radio,           label: t.nav.groups,      color: "#c4aeff", glow: "rgba(196,174,255,0.55)" },
    { id: "analytics", kind: "tab",    icon: BarChart2,       label: t.nav.analytics,   color: "#ffc946", glow: "rgba(255,201,70,0.55)"  },
    { id: "audience",  kind: "tab",    icon: Users2,          label: t.nav.audience,    color: "#ff9f40", glow: "rgba(255,159,64,0.55)"  },
    { id: "workers",   kind: "tab",    icon: Cpu,             label: t.nav.workers,     color: "#6ba8e5", glow: "rgba(107,168,229,0.55)" },
    { id: "account-login", kind: "action", icon: Key,         label: t.nav.auth,        color: "#ff7eb3", glow: "rgba(255,126,179,0.55)" },
  ];

  return (
    <div style={{
      paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 4px)",
      paddingLeft: 6, paddingRight: 6, paddingTop: 5,
      position: "relative",
    }}>
      {/* Floating glass pill */}
      <div style={{
        display: "flex",
        background: "linear-gradient(145deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 60%,rgba(255,255,255,0.08) 100%)",
        backdropFilter: "blur(48px) saturate(190%)",
        WebkitBackdropFilter: "blur(48px) saturate(190%)",
        borderRadius: 26,
        border: "1px solid rgba(255,255,255,0.17)",
        boxShadow: "0 2px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 16px 48px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.22)",
        position: "relative",
        overflow: "hidden",
        padding: "3px 2px",
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

        {ITEMS.map(({ id, kind, icon: Icon, label, color, glow }) => {
          const isActive = kind === "tab" && active === (id as Tab);

          function handleClick() {
            if (kind === "action") {
              haptic.medium();
              onNavigate?.(id);
            } else {
              if (!isActive) haptic.select();
              else haptic.light();
              onNav(id as Tab);
            }
          }

          return (
            <button
              key={id}
              onClick={handleClick}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 1, padding: "7px 1px 6px",
                border: "none", background: "none",
                position: "relative", zIndex: 2,
                cursor: "pointer",
                minHeight: 48,
              }}
            >
              {/* Active bubble */}
              {isActive && (
                <div style={{
                  position: "absolute",
                  inset: "2px 2px",
                  borderRadius: 18,
                  background: `linear-gradient(145deg,${color}22 0%,${color}10 100%)`,
                  border: `1px solid ${color}35`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: `0 0 24px ${glow}40, inset 0 1px 0 ${color}28`,
                  animation: "navPop 0.36s cubic-bezier(0.16,1,0.3,1) both",
                }} />
              )}

              {/* Action pulse ring for auth button */}
              {kind === "action" && (
                <div style={{
                  position: "absolute", inset: "2px 2px",
                  borderRadius: 18,
                  border: `1px solid ${color}20`,
                  animation: "authPulse 3s ease-in-out infinite",
                }} />
              )}

              {/* Icon */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <Icon
                  size={isActive ? 17 : 15}
                  color={isActive ? color : kind === "action" ? `${color}90` : "rgba(160,190,230,0.72)"}
                  strokeWidth={isActive ? 2.4 : kind === "action" ? 2.0 : 1.6}
                  style={{
                    transition: "color 0.22s, stroke-width 0.22s, filter 0.22s",
                    filter: isActive ? `drop-shadow(0 0 8px ${glow})` : kind === "action" ? `drop-shadow(0 0 4px ${color}60)` : "none",
                  }}
                />
              </div>

              {/* Label */}
              <span style={{
                fontSize: 7, fontWeight: isActive ? 800 : kind === "action" ? 600 : 400,
                letterSpacing: "0.02em",
                color: isActive ? color : kind === "action" ? `${color}90` : "rgba(160,190,230,0.65)",
                textTransform: "uppercase",
                transition: "color 0.22s",
                position: "relative", zIndex: 1,
              }}>
                {label}
              </span>

              {/* Active dot */}
              {isActive && (
                <div style={{
                  position: "absolute", bottom: 2, left: "50%",
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

      <style>{`
        @keyframes navPop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes authPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
