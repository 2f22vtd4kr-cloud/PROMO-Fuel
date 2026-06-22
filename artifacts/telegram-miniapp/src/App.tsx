import { useState, useRef } from "react";
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
import { AiAssistantPage }         from "./pages/AiAssistant";
import { LockScreen, getStoredSecret } from "./pages/LockScreen";
import { BottomNav }                from "./components/BottomNav";
import { LangSwitcher }             from "./components/LangSwitcher";
import { ConsumerApp }              from "./ConsumerApp";
import { getOwnerRole }             from "./lib/twa";
import { I18nProvider }             from "./lib/i18n";
import { useSse }                   from "./lib/useSse";
import { useToast }                 from "./components/Toast";
import { useI18n }                  from "./lib/i18n";
import { BookOpen }                 from "lucide-react";
import { haptic }                   from "./lib/haptics";

export type Tab = "home" | "campaigns" | "analytics" | "audience" | "upload" | "groups" | "workers" | "dashboard" | "ai";

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
  const [showManualChooser,  setShowManualChooser]  = useState(false);

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
    if (t === "manual")         { setShowManual(true);         return; }
  if (t === "manual-accounts"){ setShowManualAccounts(true); return; }
    setTab(t as Tab);
  }

  const anyOverlay = showEditor || showGroupEditor || showAccounts || showAccountLogin || showManual || showManualAccounts || showManualChooser;

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
        {tab === "ai"        && <AiAssistantPage />}
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
        <ManualPage
          onClose={() => setShowManual(false)}
          onOpenAccountsGuide={() => { setShowManual(false); setShowManualAccounts(true); }}
        />
      )}

      {showManualAccounts && (
        <ManualAccountsPage onClose={() => setShowManualAccounts(false)} />
      )}

      {showManualChooser && (
        <ManualChooserPanel
          onSystemManual={() => { setShowManualChooser(false); setShowManual(true); }}
          onAccountsManual={() => { setShowManualChooser(false); setShowManualAccounts(true); }}
          onClose={() => setShowManualChooser(false)}
        />
      )}

      {/* ── Global top-right controls — lang + manual ──────────────── */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        zIndex: 60,
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 12px 0 0",
        pointerEvents: "auto",
      }}>
        <LangSwitcher />
        <button
          onClick={() => { haptic.light(); setShowManualChooser(true); }}
          style={{
            width: 30, height: 30, borderRadius: 10,
            background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.10) inset",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <BookOpen size={14} color="rgba(149,196,245,0.65)" strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────── */}
      {!anyOverlay && (
        <div style={{ position: "relative", zIndex: 2 }}>
          <BottomNav active={tab} onNav={setTab} onNavigate={handleNavigate} />
        </div>
      )}

      {/* ── Global event toasts (always rendered, z above everything) ── */}
      <CampaignToastWatcher />
    </div>
  );
}

// ─── Global campaign completion toast watcher ──────────────────────────────
function CampaignToastWatcher() {
  const { show, node } = useToast();
  const { lang } = useI18n();
  const prevCampRef  = useRef<Record<number, string>>({});
  const prevGroupRef = useRef<Record<number, string>>({});
  const initCamp     = useRef(false);
  const initGroup    = useRef(false);

  useSse((type, data) => {
    if (type === "campaigns") {
      const list = data as Array<{ id: number; name: string; status: string; sent_count: number; failed_count?: number }>;
      if (!initCamp.current) {
        for (const c of list) prevCampRef.current[c.id] = c.status;
        initCamp.current = true;
        return;
      }
      for (const c of list) {
        const prev = prevCampRef.current[c.id];
        if (prev && prev !== c.status) {
          if (c.status === "done") {
            show(`✅ ${c.name} — ${c.sent_count.toLocaleString()} ${lang === "ua" ? "відправлено" : "sent"}`, "success");
          } else if (c.status === "cancelled") {
            show(`⛔ ${c.name} — ${lang === "ua" ? "скасовано" : "cancelled"}`, "error");
          } else if (c.status === "running" && prev !== "running") {
            show(`🚀 ${c.name} — ${lang === "ua" ? "запущено" : "started"}`, "info");
          }
        }
        prevCampRef.current[c.id] = c.status;
      }
    }

    if (type === "group_campaigns") {
      const list = data as Array<{ id: number; name: string; status: string; sent_count: number }>;
      if (!initGroup.current) {
        for (const g of list) prevGroupRef.current[g.id] = g.status;
        initGroup.current = true;
        return;
      }
      for (const g of list) {
        const prev = prevGroupRef.current[g.id];
        if (prev && prev !== g.status) {
          if (g.status === "done") {
            show(`✅ ${g.name} — ${lang === "ua" ? "групова розсилка завершена" : "group broadcast done"}`, "success");
          } else if (g.status === "stopped") {
            show(`⏹ ${g.name} — ${lang === "ua" ? "зупинено" : "stopped"}`, "error");
          } else if (g.status === "running" && prev !== "running") {
            show(`📡 ${g.name} — ${lang === "ua" ? "групова розсилка запущена" : "group broadcast live"}`, "info");
          }
        }
        prevGroupRef.current[g.id] = g.status;
      }
    }
  });

  return <>{node}</>;
}

// ─── Unified manual chooser bottom-sheet ───────────────────────────────────
function ManualChooserPanel({
  onSystemManual, onAccountsManual, onClose,
}: { onSystemManual: () => void; onAccountsManual: () => void; onClose: () => void }) {
  const { lang } = useI18n();
  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
      onClick={onClose}
    >
      <style>{`@keyframes sheetUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:"rgba(7,9,20,0.98)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", borderRadius:"24px 24px 0 0", border:"1px solid rgba(255,255,255,0.13)", padding:"16px 18px calc(env(safe-area-inset-bottom,0px) + 28px)", animation:"sheetUp 0.32s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.2)", margin:"0 auto 18px" }} />
        <div style={{ fontSize:15, fontWeight:800, color:"rgba(255,255,255,0.9)", marginBottom:16, textAlign:"center", letterSpacing:"-0.01em" }}>
          {lang === "ua" ? "📚 Обрати довідник" : "📚 Choose a Manual"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {/* System manual */}
          <button onClick={onSystemManual} style={{ background:"linear-gradient(145deg,rgba(0,212,255,0.12),rgba(0,212,255,0.05))", border:"1px solid rgba(0,212,255,0.28)", borderRadius:18, padding:"20px 14px", cursor:"pointer", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:32 }}>📖</span>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#00d4ff", marginBottom:3 }}>{lang === "ua" ? "Системний мануал" : "System Manual"}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>31 {lang === "ua" ? "сторінка" : "pages"}</div>
              <div style={{ fontSize:9, color:"rgba(0,212,255,0.5)", marginTop:4 }}>{lang === "ua" ? "Кампанії · Воркери · API" : "Campaigns · Workers · API"}</div>
            </div>
          </button>
          {/* Accounts & proxy manual */}
          <button onClick={onAccountsManual} style={{ background:"linear-gradient(145deg,rgba(45,232,151,0.12),rgba(45,232,151,0.05))", border:"1px solid rgba(45,232,151,0.28)", borderRadius:18, padding:"20px 14px", cursor:"pointer", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:32 }}>🔐</span>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#2de897", marginBottom:3 }}>{lang === "ua" ? "Акаунти та проксі" : "Accounts & Proxy"}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>9 {lang === "ua" ? "сторінок" : "pages"}</div>
              <div style={{ fontSize:9, color:"rgba(45,232,151,0.5)", marginTop:4 }}>{lang === "ua" ? "SOCKS5 · MTProto · Масштаб" : "SOCKS5 · MTProto · Scale"}</div>
            </div>
          </button>
        </div>
      </div>
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
