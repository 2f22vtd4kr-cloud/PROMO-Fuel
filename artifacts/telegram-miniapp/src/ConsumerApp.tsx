import { useState, useEffect } from "react";
import { useI18n } from "./lib/i18n";
import { Flame, MapPin, Gift, Star, Fuel, ChevronRight, Zap } from "lucide-react";
import { api, Campaign } from "./lib/api";
import { TG } from "./lib/theme";
import { haptic } from "./lib/haptics";
import { getTelegramUser } from "./lib/twa";

type ConsumerTab = "promos" | "map" | "rewards";

function MeshBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg,#07090f 0%,#0b1020 28%,#0a1330 58%,#09101f 100%)" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.018 }}>
        <filter id="nc"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#nc)" />
      </svg>
      <div style={{ position: "absolute", top: -200, left: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle at 38% 38%,rgba(255,140,40,0.22) 0%,rgba(200,80,20,0.07) 52%,transparent 72%)", animation: "floatOrb 11s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: 40, right: -160, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle at 60% 58%,rgba(80,160,255,0.17) 0%,rgba(40,100,200,0.06) 52%,transparent 76%)", animation: "floatOrb2 13s ease-in-out infinite 2.5s" }} />
      <div style={{ position: "absolute", top: "34%", right: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(45,232,151,0.11) 0%,transparent 68%)", animation: "floatOrb 15s ease-in-out infinite 5.5s" }} />
    </div>
  );
}

function ConsumerHeader({ user }: { user: ReturnType<typeof getTelegramUser> }) {
  const { t } = useI18n();
  const name = user?.first_name ?? t.consumer.guest;
  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(10,14,26,0.82) 0%, rgba(8,11,20,0.72) 100%)",
      backdropFilter: "blur(52px) saturate(200%)",
      WebkitBackdropFilter: "blur(52px) saturate(200%)",
      borderBottom: "1px solid rgba(255,255,255,0.09)",
      padding: "16px 16px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 2%, rgba(255,255,255,0.42) 35%, rgba(255,255,255,0.60) 50%, rgba(255,255,255,0.42) 65%, transparent 98%)", pointerEvents: "none" }} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(135deg,#ffc946 0%,#ff8c42 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          PROMO-Fuel
        </div>
        <div style={{ fontSize: 11.5, color: TG.muted, marginTop: 1 }}>{t.consumer.hello(name)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.22)", borderRadius: 12, padding: "5px 11px" }}>
        <Flame size={13} color="#ffc946" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ffc946" }}>{t.consumer.promoTab}</span>
      </div>
    </div>
  );
}

function PromoCard({ campaign, index }: { campaign: Campaign; index: number }) {
  const colors = [
    { accent: "#ffc946", glow: "rgba(255,201,70,0.32)", grad: "linear-gradient(135deg,rgba(255,201,70,0.14),rgba(255,140,40,0.08))" },
    { accent: "#95c4f5", glow: "rgba(107,168,229,0.32)", grad: "linear-gradient(135deg,rgba(107,168,229,0.14),rgba(60,120,200,0.08))" },
    { accent: "#2de897", glow: "rgba(45,232,151,0.32)", grad: "linear-gradient(135deg,rgba(45,232,151,0.14),rgba(15,180,100,0.08))" },
  ];
  const c = colors[index % colors.length]!;
  return (
    <div className="lg fade-up stagger-item" style={{ padding: "16px 15px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: c.grad, border: `1px solid ${c.accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 20px ${c.glow}`,
        }}>
          <Zap size={18} color={c.accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: TG.text, letterSpacing: "-0.2px", marginBottom: 5, lineHeight: 1.3 }}>
            {campaign.name}
          </div>
          <div style={{ fontSize: 12, color: TG.muted, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {campaign.text_template}
          </div>
        </div>
        <ChevronRight size={16} color={TG.muted} style={{ flexShrink: 0, marginTop: 2 }} />
      </div>
    </div>
  );
}

function PromosTab() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaigns()
      .then((cs) => setCampaigns(cs.filter((c) => c.status === "sent" || c.status === "scheduled").slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,201,70,0.3)", borderTopColor: "#ffc946", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 22, background: "rgba(255,201,70,0.10)", border: "1px solid rgba(255,201,70,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Flame size={28} color="#ffc946" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: TG.text, marginBottom: 6 }}>{t.consumer.noPromos}</div>
        <div style={{ fontSize: 13, color: TG.muted, lineHeight: 1.5 }}>{t.consumer.noPromosHint}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>
        {t.consumer.activePromos}
      </div>
      {campaigns.map((c, i) => <PromoCard key={c.id} campaign={c} index={i} />)}
    </div>
  );
}

function MapTab() {
  const { t } = useI18n();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: 26,
        background: "linear-gradient(145deg,rgba(107,168,229,0.16),rgba(60,120,200,0.08))",
        border: "1px solid rgba(107,168,229,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
        boxShadow: "0 0 40px rgba(107,168,229,0.18)",
      }}>
        <MapPin size={34} color="#95c4f5" />
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: TG.text, marginBottom: 8, letterSpacing: "-0.3px" }}>
        {t.consumer.mapTitle}
      </div>
      <div style={{ fontSize: 13, color: TG.muted, lineHeight: 1.6, maxWidth: 240 }}>
        {t.consumer.mapHintFull}
      </div>
      <div className="lg" style={{ marginTop: 24, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <Fuel size={16} color="#95c4f5" />
        <span style={{ fontSize: 13, color: TG.textSecondary, fontWeight: 600 }}>{t.consumer.soon}</span>
      </div>
    </div>
  );
}

function RewardsTab({ user }: { user: ReturnType<typeof getTelegramUser> }) {
  const { t } = useI18n();
  const name = user ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}` : t.consumer.guest;
  const initials = user ? user.first_name.slice(0, 1) + (user.last_name?.slice(0, 1) ?? "") : "G";

  const tiers = [
    { label: t.consumer.tierBronze, points: 0, color: "#cd7f32", active: true },
    { label: t.consumer.tierSilver, points: 1000, color: "#c0c0c0", active: false },
    { label: t.consumer.tierGold, points: 5000, color: "#ffc946", active: false },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 32px" }}>
      <div className="lg fade-up" style={{ padding: 20, marginBottom: 16, background: "linear-gradient(135deg,rgba(45,232,151,0.12),rgba(107,168,229,0.08))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#2de897,#95c4f5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#07090f",
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TG.text }}>{name}</div>
            {user?.username && <div style={{ fontSize: 12, color: TG.muted, marginTop: 2 }}>@{user.username}</div>}
          </div>
        </div>
      </div>

      <div className="lg fade-up stagger-item" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: TG.muted, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{t.consumer.rewardsPoints}</div>
          <Star size={14} color="#ffc946" />
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", background: "linear-gradient(135deg,#ffc946,#ff8c42)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          0
        </div>
        <div style={{ fontSize: 12, color: TG.muted, marginTop: 4 }}>{t.consumer.rewardsParticipate}</div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 2 }}>
        {t.consumer.tierStatuses}
      </div>
      {tiers.map((tier, i) => (
        <div key={tier.label} className={`lg stagger-item ${i === 0 ? "fade-up" : ""}`} style={{ padding: "14px 16px", marginBottom: 10, opacity: tier.active ? 1 : 0.5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 11, background: `${tier.color}18`, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={14} color={tier.color} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: TG.text }}>{tier.label}</div>
                <div style={{ fontSize: 11, color: TG.muted }}>{t.consumer.tierFrom(tier.points)}</div>
              </div>
            </div>
            {tier.active && <div style={{ fontSize: 10, fontWeight: 700, color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}28`, borderRadius: 8, padding: "3px 8px" }}>{t.consumer.tierCurrent}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumerBottomNav({ active, onNav }: { active: ConsumerTab; onNav: (tab: ConsumerTab) => void }) {
  const { t } = useI18n();
  const items: { id: ConsumerTab; icon: React.ElementType; label: string; color: string; glow: string }[] = [
    { id: "promos",  icon: Flame,  label: t.consumer.promos,  color: "#ffc946", glow: "rgba(255,201,70,0.55)" },
    { id: "map",     icon: MapPin, label: t.consumer.map,     color: "#95c4f5", glow: "rgba(107,168,229,0.55)" },
    { id: "rewards", icon: Gift,   label: t.consumer.rewards, color: "#2de897", glow: "rgba(45,232,151,0.55)" },
  ];
  return (
    <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 4px)", paddingLeft: 12, paddingRight: 12, paddingTop: 8, position: "relative" }}>
      <div style={{
        display: "flex",
        background: "linear-gradient(145deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 60%,rgba(255,255,255,0.08) 100%)",
        backdropFilter: "blur(48px) saturate(190%)",
        WebkitBackdropFilter: "blur(48px) saturate(190%)",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.17)",
        boxShadow: "0 2px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 16px 48px rgba(0,0,0,0.42)",
        position: "relative", overflow: "hidden", padding: "4px 4px",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 3%, rgba(255,255,255,0.58) 30%, rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.58) 70%, transparent 97%)", pointerEvents: "none", zIndex: 3 }} />
        {items.map(({ id, icon: Icon, label, color, glow }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => { if (!isActive) haptic.select(); else haptic.light(); onNav(id); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "9px 2px 8px", border: "none", background: "none", position: "relative", zIndex: 2, cursor: "pointer", minHeight: 54 }}>
              {isActive && <div style={{ position: "absolute", inset: "2px 4px", borderRadius: 20, background: `linear-gradient(145deg,${color}22 0%,${color}10 100%)`, border: `1px solid ${color}35`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: `0 0 24px ${glow}40, inset 0 1px 0 ${color}28`, animation: "navPop 0.36s cubic-bezier(0.16,1,0.3,1) both" }} />}
              <Icon size={isActive ? 21 : 19} color={isActive ? color : "rgba(160,190,230,0.32)"} strokeWidth={isActive ? 2.4 : 1.6} style={{ transition: "color 0.22s", filter: isActive ? `drop-shadow(0 0 8px ${glow})` : "none", position: "relative", zIndex: 1 }} />
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 400, letterSpacing: "0.03em", color: isActive ? color : "rgba(160,190,230,0.30)", textTransform: "uppercase", transition: "color 0.22s", position: "relative", zIndex: 1 }}>
                {label}
              </span>
              {isActive && <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: color, boxShadow: `0 0 8px 2px ${glow}` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConsumerApp() {
  const [tab, setTab] = useState<ConsumerTab>("promos");
  const user = getTelegramUser();

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#07090f", position: "relative" }}>
      <MeshBackground />
      <ConsumerHeader user={user} />
      <div style={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
        {tab === "promos"  && <PromosTab />}
        {tab === "map"     && <MapTab />}
        {tab === "rewards" && <RewardsTab user={user} />}
      </div>
      <div style={{ position: "relative", zIndex: 2 }}>
        <ConsumerBottomNav active={tab} onNav={setTab} />
      </div>
    </div>
  );
}
