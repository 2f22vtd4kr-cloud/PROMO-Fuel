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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#080c15", position: "relative" }}>
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
      {/* Base gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #080c15 0%, #0c1428 35%, #0a1632 65%, #090e1c 100%)",
      }} />
      {/* Noise grain overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
        opacity: 0.6,
      }} />
      {/* Blue orb — top left */}
      <div style={{
        position: "absolute", top: -180, left: -100,
        width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, rgba(91,150,212,0.22) 0%, rgba(58,111,173,0.08) 50%, transparent 75%)",
        animation: "floatOrb 10s ease-in-out infinite",
      }} />
      {/* Green orb — bottom right */}
      <div style={{
        position: "absolute", bottom: 60, right: -140,
        width: 450, height: 450, borderRadius: "50%",
        background: "radial-gradient(circle at 60% 60%, rgba(45,232,151,0.14) 0%, rgba(23,168,106,0.05) 50%, transparent 75%)",
        animation: "floatOrb2 12s ease-in-out infinite 3s",
      }} />
      {/* Purple orb — center right */}
      <div style={{
        position: "absolute", top: "38%", right: -60,
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(179,157,255,0.12) 0%, transparent 70%)",
        animation: "floatOrb 14s ease-in-out infinite 6s",
      }} />
      {/* Yellow orb — bottom left */}
      <div style={{
        position: "absolute", bottom: 200, left: -80,
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,201,70,0.08) 0%, transparent 70%)",
        animation: "floatOrb2 9s ease-in-out infinite 1.5s",
      }} />
    </div>
  );
}
