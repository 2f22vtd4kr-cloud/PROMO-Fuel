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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#17212b" }}>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {tab === "home" && <HomePage onNewCampaign={() => goToEditor()} onViewCampaigns={() => setTab("campaigns")} />}
        {tab === "campaigns" && <CampaignsPage onEdit={goToEditor} />}
        {tab === "editor" && <EditorPage campaignId={editCampaignId} onDone={() => setTab("campaigns")} />}
        {tab === "accounts" && <AccountsPage />}
      </div>
      <BottomNav active={tab} onNav={setTab} />
    </div>
  );
}
