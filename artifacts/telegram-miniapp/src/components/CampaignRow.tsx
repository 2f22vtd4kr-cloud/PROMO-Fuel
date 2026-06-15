import { ChevronRight } from "lucide-react";
import type { Campaign } from "../lib/api";
import { TG, STATUS_META, BLUR } from "../lib/theme";

export function CampaignRow({
  campaign, onClick, last = false,
}: {
  campaign: Campaign; onClick: () => void; last?: boolean;
}) {
  const meta = STATUS_META[campaign.status] ?? STATUS_META.draft;
  const pct = campaign.target_count > 0
    ? Math.min((campaign.sent_count / campaign.target_count) * 100, 100) : 0;

  return (
    <div
      onClick={onClick}
      className="tap"
      style={{
        padding: "13px 15px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.055)",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      {/* Status orb */}
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: `${meta.color}15`,
        border: `1px solid ${meta.color}28`,
        backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 14px ${meta.glow}`,
      }}>
        <div style={{
          width: 9, height: 9, borderRadius: "50%",
          background: meta.color,
          boxShadow: `0 0 8px 3px ${meta.glow}`,
        }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.2px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: TG.text,
        }}>
          {campaign.name}
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.055)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${pct}%`,
            background: meta.grad,
            transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow: `0 0 8px ${meta.glow}`,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 11, color: meta.color, fontWeight: 700, letterSpacing: "0.01em" }}>{meta.label}</span>
          <span style={{ fontSize: 11, color: TG.muted }}>
            {campaign.sent_count.toLocaleString("ru")} / {campaign.target_count.toLocaleString("ru")}
          </span>
        </div>
      </div>
      <ChevronRight size={14} color="rgba(160,185,220,0.25)" />
    </div>
  );
}
