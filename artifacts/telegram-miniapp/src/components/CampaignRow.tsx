import { ChevronRight } from "lucide-react";
import type { Campaign } from "../lib/api";
import { TG, STATUS_META } from "../lib/theme";

export function CampaignRow({
  campaign,
  onClick,
  last = false,
}: {
  campaign: Campaign;
  onClick: () => void;
  last?: boolean;
}) {
  const meta = STATUS_META[campaign.status] ?? STATUS_META.draft;
  const pct = campaign.target_count > 0
    ? Math.min((campaign.sent_count / campaign.target_count) * 100, 100)
    : 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "13px 14px",
        borderBottom: last ? "none" : `1px solid ${TG.border}`,
        display: "flex", alignItems: "center", gap: 11,
        cursor: "pointer",
        transition: "background 0.12s",
        WebkitTapHighlightColor: "transparent",
      }}
      onTouchStart={e => (e.currentTarget.style.background = TG.cardHover)}
      onTouchEnd={e => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: meta.color + "22",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: meta.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {campaign.name}
        </div>
        <div style={{ marginTop: 6, height: 3, background: TG.border, borderRadius: 2 }}>
          <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: meta.color, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: TG.muted }}>{meta.label}</span>
          <span style={{ fontSize: 11, color: TG.muted }}>
            {campaign.sent_count.toLocaleString("ru")} / {campaign.target_count.toLocaleString("ru")}
          </span>
        </div>
      </div>
      <ChevronRight size={14} color={TG.muted} />
    </div>
  );
}
