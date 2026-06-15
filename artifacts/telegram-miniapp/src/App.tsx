import { useState } from "react";
import { HomePage } from "./pages/Home";
import { CampaignsPage } from "./pages/Campaigns";
import { EditorPage } from "./pages/Editor";
import { AccountsPage } from "./pages/Accounts";
import { BottomNav } from "./components/BottomNav";

export type Tab = "home" | "campaigns" | "editor" | "accounts";

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null);

  function goToEditor(id?: number) {
    setEditCampaignId(id ?? null);
    setTab("editor");
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#0b0f1a", position: "relative" }}>
      <MeshBackground />
      <div style={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 1 }}>
        {tab === "home"      && <HomePage onNewCampaign={() => goToEditor()} onViewCampaigns={() => setTab("campaigns")} />}
        {tab === "campaigns" && <CampaignsPage onEdit={goToEditor} />}
        {tab === "editor"    && <EditorPage campaignId={editCampaignId} onDone={() => setTab("campaigns")} />}
        {tab === "accounts"  && <AccountsPage />}
      </div>
      <div style={{ position: "relative", zIndex: 2 }}>
        <BottomNav active={tab} onNav={setTab} />
      </div>
    </div>
  );
}

function MeshBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(145deg, #0b0f1a 0%, #0c1428 40%, #0d1a30 70%, #0b1220 100%)",
      }} />
      <div style={{
        position: "absolute", top: -140, left: -80,
        width: 420, height: 420, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(82,136,193,0.18) 0%, transparent 70%)",
        animation: "glowPulse 6s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: 80, right: -100,
        width: 360, height: 360, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)",
        animation: "glowPulse 8s ease-in-out infinite 2s",
      }} />
      <div style={{
        position: "absolute", top: "45%", left: "60%",
        width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)",
        animation: "glowPulse 7s ease-in-out infinite 4s",
      }} />
    </div>
  );
}
