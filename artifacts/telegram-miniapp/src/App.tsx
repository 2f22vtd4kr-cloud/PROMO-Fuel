import { useState } from "react";
import { HomePage }                 from "./pages/Home";
import { CampaignsPage }            from "./pages/Campaigns";
import { EditorPage }               from "./pages/Editor";
import { AnalyticsPage }            from "./pages/Analytics";
import { AudiencePage }             from "./pages/Audience";
import { UploadPage }               from "./pages/Upload";
import { GroupBroadcastsPage }      from "./pages/GroupBroadcasts";
import { GroupBroadcastCreatePage } from "./pages/GroupBroadcastCreate";
import { WorkersPage }              from "./pages/Workers";
import { AccountsPage }             from "./pages/Accounts";
import { DashboardPage }            from "./pages/Dashboard";
import { AccountLoginPage }         from "./pages/AccountLogin";
import { ManualPage }              from "./pages/Manual";
import { ManualAccountsPage }     from "./pages/ManualAccounts";
import { LockScreen, getStoredSecret } from "./pages/LockScreen";
import { BottomNav }                from "./components/BottomNav";
import { ConsumerApp }              from "./ConsumerApp";
import { getOwnerRole }             from "./lib/twa";
import { I18nProvider }             from "./lib/i18n";

export type Tab = "home" | "campaigns" | "analytics" | "audience" | "upload" | "groups" | "workers" | "dashboard";

export function App() {
  const [unlocked, setUnlocked] = useState(() => getStoredSecret() !== "");

  return (
    <I18nProvider>
      {!unlocked ? (
        <LockScreen onUnlocked={() => setUnlocked(true)} />
      ) : (
        <AppContent />
      )}
    </I18nProvider>
  );
}

function AppContent() {
  const role = getOwnerRole();
  return role === "user" ? <ConsumerApp /> : <OwnerApp />;
}

function OwnerApp() {
  const [tab,              setTab]             = useState<Tab>("home");
  const [editCampaignId,   setEditId]          = useState<number | null>(null);
  const [showEditor,       setShowEditor]      = useState(false);
  const [editGroupId,      setEditGroupId]     = useState<number | null>(null);
  const [showGroupEditor,  setShowGroupEditor] = useState(false);
  const [showAccounts,     setShowAccounts]    = useState(false);
  const [showAccountLogin, setShowAccountLogin]= useState(false);
  const [showManual,         setShowManual]        = useState(false);
  const [showManualAccounts, setShowManualAccounts] = useState(false);

  function openEditor(id?: number) {
    setEditId(id ?? null);
    setShowEditor(true);
  }
  function closeEditor() {
    setShowEditor(false);
    setEditId(null);
  }

  function openGroupEditor(id?: number) {
    setEditGroupId(id ?? null);
    setShowGroupEditor(true);
  }
  function closeGroupEditor() {
    setShowGroupEditor(false);
    setEditGroupId(null);
  }

  function handleNavigate(t: string) {
    if (t === "accounts")     { setShowAccounts(true);     return; }
    if (t === "account-login"){ setShowAccountLogin(true); return; }
    if (t === "manual")       { setShowManual(true);       return; }
    setTab(t as Tab);
  }

  const anyOverlay = showEditor || showGroupEditor || showAccounts || showAccountLogin || showManual || showManualAccounts;

  return (
    <div style={{
      height: "100dvh",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      background: "#07090f",
      position: "relative",
    }}>
      <MeshBackground />

      <div style={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 1 }}>
        {tab === "home"      && <HomePage onNewCampaign={() => openEditor()} onViewCampaigns={() => setTab("campaigns")} onNavigate={handleNavigate} />}
        {tab === "campaigns" && <CampaignsPage onEdit={openEditor} />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "audience"  && <AudiencePage />}
        {tab === "upload"    && <UploadPage />}
        {tab === "groups"    && <GroupBroadcastsPage onNew={openGroupEditor} onEdit={openGroupEditor} />}
        {tab === "workers"   && <WorkersPage />}
        {tab === "dashboard" && <DashboardPage />}
      </div>

      {/* ── Overlays — highest z-index stack ──────────────────────── */}

      {showEditor && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <EditorPage campaignId={editCampaignId} onDone={closeEditor} />
        </div>
      )}

      {showGroupEditor && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <GroupBroadcastCreatePage campaignId={editGroupId} onDone={closeGroupEditor} />
        </div>
      )}

      {showAccounts && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "#07090f" }}>
          <AccountsPage onClose={() => setShowAccounts(false)} onManualAccounts={() => setShowManualAccounts(true)} />
        </div>
      )}

      {showAccountLogin && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "#07090f" }}>
          <AccountLoginPage onClose={() => setShowAccountLogin(false)} />
        </div>
      )}

      {showManual && (
        <ManualPage onClose={() => setShowManual(false)} />
      )}

      {showManualAccounts && (
        <ManualAccountsPage onClose={() => setShowManualAccounts(false)} />
      )}

      {/* ── Bottom nav (with lang switcher + help built in) ──────────── */}
      {!anyOverlay && (
        <div style={{ position: "relative", zIndex: 2 }}>
          <BottomNav active={tab} onNav={setTab} onNavigate={handleNavigate} onManual={() => setShowManual(true)} />
        </div>
      )}
    </div>
  );
}

function MeshBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(170deg,#07090f 0%,#0b1020 28%,#0a1330 58%,#09101f 100%)" }} />
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.018 }}>
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch"/></filter>
        <rect width="100%" height="100%" filter="url(#n)"/>
      </svg>
      <div style={{ position:"absolute", top:-200, left:-120, width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle at 38% 38%,rgba(80,140,220,0.25) 0%,rgba(50,100,180,0.09) 48%,transparent 72%)", animation:"floatOrb 11s ease-in-out infinite" }}/>
      <div style={{ position:"absolute", bottom:40, right:-160, width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle at 60% 58%,rgba(30,215,140,0.17) 0%,rgba(15,160,100,0.06) 52%,transparent 76%)", animation:"floatOrb2 13s ease-in-out infinite 2.5s" }}/>
      <div style={{ position:"absolute", top:"34%", right:-80, width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(170,140,255,0.13) 0%,transparent 68%)", animation:"floatOrb 15s ease-in-out infinite 5.5s" }}/>
      <div style={{ position:"absolute", bottom:180, left:-90, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,190,60,0.09) 0%,transparent 68%)", animation:"floatOrb2 10s ease-in-out infinite 1s" }}/>
      <div style={{ position:"absolute", top:80, right:-40, width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,100,180,0.08) 0%,transparent 70%)", animation:"floatOrb3 8s ease-in-out infinite 3s" }}/>
    </div>
  );
}
