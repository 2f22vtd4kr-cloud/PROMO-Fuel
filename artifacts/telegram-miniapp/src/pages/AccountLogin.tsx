import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import {
  X, Key, Shield, CheckCircle, Loader, Lock, Phone,
  ChevronLeft, AlertCircle, RefreshCw,
} from "lucide-react";
import { api, controlApi, SenderAccount, AuthSession } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";

// ── Phase state machine ───────────────────────────────────────────────────────

type Phase = "select" | "credentials" | "sending" | "otp" | "twofa" | "done" | "error";

interface WizardState {
  phase: Phase;
  account:       SenderAccount | null;
  apiId:         string;
  apiHash:       string;
  phone_code_hash: string;
  phone:         string;
  code:          string;
  password:      string;
  displayName:   string;
  errorMsg:      string;
}

const INIT: WizardState = {
  phase: "select",
  account: null,
  apiId: "", apiHash: "",
  phone_code_hash: "", phone: "",
  code: "", password: "",
  displayName: "", errorMsg: "",
};

// ── Small reusable primitives ─────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  const bg    = done ? "#2de897" : active ? "#6ba8e5" : "rgba(255,255,255,0.10)";
  const color = done ? "#07090f" : active ? "#eef2ff" : TG.muted;
  return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color, border: `1px solid ${done ? "rgba(45,232,151,0.5)" : active ? "rgba(107,168,229,0.4)" : "rgba(255,255,255,0.1)"}`, boxShadow: active ? "0 0 12px rgba(107,168,229,0.4)" : "none", flexShrink: 0, transition: "all 0.3s ease" }}>
      {done ? "✓" : n}
    </div>
  );
}

function WizardProgress({ phase }: { phase: Phase }) {
  const steps = ["otp", "twofa", "done"];
  const idx   = steps.indexOf(phase);

  const { lang: stepLang } = useI18n();
  const labels = stepLang === "ua" ? ["Код", "2FA", "Готово"] : ["Code", "2FA", "Done"];
  const phases: Phase[] = ["otp", "twofa", "done"];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, margin: "12px 0 16px" }}>
      {phases.map((p, i) => (
        <div key={p} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <StepDot n={i + 1} active={phase === p} done={idx > i} />
            <span style={{ fontSize: 8, color: phase === p ? "#6ba8e5" : idx > i ? "#2de897" : TG.muted, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div style={{ width: 32, height: 1, background: idx > i ? "rgba(45,232,151,0.4)" : "rgba(255,255,255,0.08)", margin: "0 6px", marginBottom: 16, transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function GlassInput({
  value, onChange, placeholder, type = "text", autoFocus = false,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; autoFocus?: boolean;
}) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} type={type} autoFocus={autoFocus}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 14, padding: "13px 16px",
        fontSize: 14, color: TG.text, outline: "none",
        fontFamily: "inherit", letterSpacing: type === "number" ? "0.08em" : "inherit",
      }}
    />
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.22)" }}>
      <AlertCircle size={13} color="#ff6b7a" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12, color: "#ff6b7a", lineHeight: 1.5 }}>{msg}</span>
    </div>
  );
}

// ── Account selection card ─────────────────────────────────────────────────────

function AccountCard({
  acc, activeSessions, onSelect,
}: {
  acc: SenderAccount;
  activeSessions: AuthSession[];
  onSelect: (a: SenderAccount) => void;
}) {
  const session  = activeSessions.find(s => s.account_id === acc.id);
  const authed   = !!acc.session_file;
  const inFlight = !!session;

  const statusColor = authed ? "#2de897" : inFlight ? "#ffc946" : acc.is_banned ? "#ff6b7a" : "#7c8db0";
  const statusLabel = authed ? (lang === "ua" ? "Авторизовано" : "Authorized") : inFlight ? (lang === "ua" ? "В процесі" : "In progress") : acc.is_banned ? (lang === "ua" ? "Бан" : "Banned") : (lang === "ua" ? "Немає сесії" : "No session");

  return (
    <div
      onClick={() => { haptic.select(); onSelect(acc); }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 14,
        background: `${statusColor}08`,
        border: `1px solid ${statusColor}22`,
        cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 12, background: `${statusColor}18`, border: `1px solid ${statusColor}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
        <Phone size={16} color={statusColor} />
        {inFlight && (
          <div style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: "#ffc946", border: "2px solid #07090f", animation: "pulse 1.5s ease-in-out infinite" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {acc.label || acc.phone}
        </div>
        <div style={{ fontSize: 11, color: TG.muted, marginTop: 1 }}>{acc.phone}</div>
        {session && (
          <div style={{ fontSize: 10, color: "#ffc946", marginTop: 2 }}>
            {lang === "ua" ? "Крок" : "Step"}: {session.step} · {lang === "ua" ? "закінчується через" : "expires in"} {Math.round(session.expires_in / 60)}{lang === "ua" ? "хв" : "m"}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30`, borderRadius: 20, padding: "2px 8px" }}>
          {statusLabel}
        </span>
        {acc.api_id && (
          <span style={{ fontSize: 9, color: TG.muted }}>API {acc.api_id}</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AccountLoginPage({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const [accounts,       setAccounts]       = useState<SenderAccount[]>([]);
  const [activeSessions, setActiveSessions] = useState<AuthSession[]>([]);
  const [loadingAccts,   setLoadingAccts]   = useState(true);
  const [wizard,         setWizard]         = useState<WizardState>(INIT);

  const load = useCallback(async () => {
    setLoadingAccts(true);
    try {
      const [accts, sess] = await Promise.allSettled([
        api.getAccounts(),
        controlApi.listAuthSessions().then(r => r.sessions),
      ]);
      if (accts.status === "fulfilled") setAccounts(accts.value);
      if (sess.status === "fulfilled")  setActiveSessions(sess.value);
    } finally { setLoadingAccts(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setPhase(phase: Phase, patch?: Partial<WizardState>) {
    setWizard(w => ({ ...w, phase, errorMsg: "", ...patch }));
  }
  function setError(msg: string) {
    haptic.error();
    setWizard(w => ({ ...w, phase: w.phase === "sending" ? (w.phone_code_hash ? "otp" : w.account?.session_file ? "otp" : "credentials") : w.phase, errorMsg: msg }));
  }
  function setErrorOn(phase: Phase, msg: string) {
    haptic.error();
    setWizard(w => ({ ...w, phase, errorMsg: msg }));
  }

  // ── Phase: select account ────────────────────────────────────────────────

  function handleSelectAccount(acc: SenderAccount) {
    const existingSession = activeSessions.find(s => s.account_id === acc.id);
    if (existingSession) {
      // Resume in-flight session
      setPhase(existingSession.step === "waiting_2fa" ? "twofa" : "otp", {
        account: acc,
        phone: acc.phone,
        phone_code_hash: "",
      });
      return;
    }
    // Needs credentials?
    if (!acc.api_id || !acc.api_hash) {
      setPhase("credentials", { account: acc, apiId: String(acc.api_id ?? ""), apiHash: acc.api_hash ?? "" });
    } else {
      setPhase("credentials", { account: acc, apiId: String(acc.api_id), apiHash: acc.api_hash });
    }
  }

  // ── Phase: save credentials + send code ─────────────────────────────────

  async function handleSendCode() {
    const { account, apiId, apiHash } = wizard;
    if (!account) return;
    if (!apiId || !apiHash.trim()) {
      setWizard(w => ({ ...w, errorMsg: lang === "ua" ? "Введіть API ID та API Hash" : "Enter API ID and API Hash" })); return;
    }
    haptic.medium();
    setPhase("sending");
    try {
      // Persist credentials
      await api.patchAccount(account.id, { api_id: Number(apiId), api_hash: apiHash.trim() } as Partial<SenderAccount>);
      // Send code via control plane
      const res = await controlApi.sendCode(account.id);
      setPhase("otp", { phone_code_hash: res.phone_code_hash, phone: res.phone });
    } catch (e: unknown) {
      setErrorOn("credentials", (e as Error).message ?? (lang === "ua" ? "Помилка відправки коду" : "Failed to send code"));
    }
  }

  // ── Phase: confirm OTP ──────────────────────────────────────────────────

  async function handleConfirmOtp() {
    const { code, phone, phone_code_hash } = wizard;
    if (!code.trim()) { setWizard(w => ({ ...w, errorMsg: lang === "ua" ? "Введіть код з Telegram" : "Enter the code from Telegram" })); return; }
    haptic.medium();
    setPhase("sending");
    try {
      const res = await controlApi.signIn(phone, code.trim(), phone_code_hash);
      if (res.needs_2fa) {
        setPhase("twofa");
      } else if (res.ok) {
        haptic.success();
        await load();
        setPhase("done", { displayName: res.display_name ?? "" });
      } else {
        setErrorOn("otp", res.error ?? (lang === "ua" ? "Невірний код" : "Incorrect code"));
      }
    } catch (e: unknown) {
      setErrorOn("otp", (e as Error).message ?? (lang === "ua" ? "Помилка перевірки коду" : "Code verification failed"));
    }
  }

  // ── Phase: confirm 2FA ──────────────────────────────────────────────────

  async function handleConfirm2fa() {
    const { password, phone } = wizard;
    if (!password.trim()) { setWizard(w => ({ ...w, errorMsg: lang === "ua" ? "Введіть пароль" : "Enter your password" })); return; }
    haptic.medium();
    setPhase("sending");
    try {
      const res = await controlApi.signIn2fa(phone, password);
      if (res.ok) {
        haptic.success();
        await load();
        setPhase("done", { displayName: res.display_name ?? "" });
      } else {
        setErrorOn("twofa", res.error ?? (lang === "ua" ? "Невірний пароль 2FA" : "Incorrect 2FA password"));
      }
    } catch (e: unknown) {
      setErrorOn("twofa", (e as Error).message ?? (lang === "ua" ? "Помилка 2FA" : "2FA error"));
    }
  }

  // ── Back logic ───────────────────────────────────────────────────────────

  function handleBack() {
    haptic.light();
    if (wizard.phase === "credentials" || wizard.phase === "error") setPhase("select", { account: null });
    else if (wizard.phase === "otp") setPhase("credentials");
    else if (wizard.phase === "twofa") setPhase("otp");
    else setPhase("select", { account: null });
  }

  // ── Cancel in-flight auth session ───────────────────────────────────────

  async function handleCancelSession() {
    if (!wizard.account) return;
    haptic.warning();
    try {
      await controlApi.cancelAuth(wizard.account.phone);
      await load();
    } catch {}
    setPhase("select", INIT);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const { phase, account, wizard: _w, ..._ } = { phase: wizard.phase, account: wizard.account, wizard, _ : null };
  const showBack = phase !== "select" && phase !== "done";
  const busy     = phase === "sending";

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ height: "100%", background: "#07090f", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          {showBack ? (
            <button onClick={handleBack} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ChevronLeft size={15} color={TG.muted} />
            </button>
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Key size={16} color="#6ba8e5" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: TG.text }}>
              {phase === "select"      ? t.accountLogin.title
                : phase === "credentials" ? `${t.accountLogin.credentials} · ${account?.phone}`
                : phase === "otp"        ? t.accountLogin.codeTitle
                : phase === "twofa"      ? t.accountLogin.twoFaTitle
                : phase === "done"       ? t.accountLogin.successTitle
                : phase === "sending"    ? t.accountLogin.connecting
                : t.accountLogin.title}
            </div>
            {account && phase !== "select" && phase !== "done" && (
              <div style={{ fontSize: 11, color: TG.muted, marginTop: 1 }}>{account.label || account.phone}</div>
            )}
          </div>
          <button onClick={() => { haptic.light(); onClose(); }} style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={14} color={TG.muted} />
          </button>
        </div>

        {/* Progress (only during wizard steps) */}
        {(phase === "otp" || phase === "twofa" || phase === "done") && (
          <div style={{ padding: "0 16px" }}>
            <WizardProgress phase={phase} />
          </div>
        )}

        {/* Scroll content */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 16px calc(env(safe-area-inset-bottom,0px) + 24px)" }}>

          {/* ── PHASE: SELECT ─────────────────────────────────────────── */}
          {phase === "select" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  {t.accountLogin.accountsTitle(accounts.length)}
                </div>
                <button onClick={() => { haptic.light(); load(); }} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6ba8e5", fontSize: 11, fontWeight: 700, padding: 0 }}>
                  <RefreshCw size={11} />{t.common.refresh}
                </button>
              </div>

              {loadingAccts ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(107,168,229,0.3)", borderTopColor: "#6ba8e5", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                </div>
              ) : accounts.length === 0 ? (
                <GlassCard style={{ padding: 20, textAlign: "center" }}>
                  <Shield size={28} color={TG.muted} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div style={{ fontSize: 13, color: TG.muted }}>{t.accountLogin.noAccountsDesc}</div>
                  <div style={{ fontSize: 11, color: TG.muted, marginTop: 4, opacity: 0.7 }}>{t.accountLogin.addAccountHint}</div>
                </GlassCard>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {accounts.map(acc => (
                    <AccountCard
                      key={acc.id} acc={acc}
                      activeSessions={activeSessions}
                      onSelect={handleSelectAccount}
                    />
                  ))}
                </div>
              )}

              {activeSessions.length > 0 && (
                <GlassCard style={{ padding: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#ffc946", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffc946", animation: "pulse 1.5s ease-in-out infinite" }} />
                    {t.accountLogin.activeSessionsTitle(activeSessions.length)}
                  </div>
                  {activeSessions.map(s => (
                    <div key={s.phone} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "rgba(255,201,70,0.06)", border: "1px solid rgba(255,201,70,0.15)", marginBottom: 4 }}>
                      <Phone size={10} color="#ffc946" />
                      <span style={{ flex: 1, fontSize: 11, color: TG.text }}>{s.phone}</span>
                      <span style={{ fontSize: 9, color: "#ffc946" }}>{s.step}</span>
                    </div>
                  ))}
                </GlassCard>
              )}
            </div>
          )}

          {/* ── PHASE: CREDENTIALS ───────────────────────────────────── */}
          {phase === "credentials" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.25s ease-out both" }}>
              <GlassCard style={{ padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: TG.muted, marginBottom: 10, letterSpacing: "0.07em" }}>API TELEGRAM</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <GlassInput value={wizard.apiId} onChange={v => setWizard(w => ({ ...w, apiId: v }))} placeholder={lang === "ua" ? "API ID (число)" : "API ID (number)"} type="number" autoFocus />
                  <GlassInput value={wizard.apiHash} onChange={v => setWizard(w => ({ ...w, apiHash: v }))} placeholder="API Hash (32 hex chars)" />
                </div>
                <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(107,168,229,0.06)", border: "1px solid rgba(107,168,229,0.15)" }}>
                  <div style={{ fontSize: 11, color: "#6ba8e5", lineHeight: 1.6 }}>
                    {lang === "ua" ? "Отримати на" : "Get from"} <span style={{ fontWeight: 700 }}>my.telegram.org</span> → Apps
                  </div>
                </div>
              </GlassCard>

              {wizard.errorMsg && <ErrorBanner msg={wizard.errorMsg} />}

              <button onClick={handleSendCode} disabled={busy} style={{ width: "100%", padding: "14px", borderRadius: 16, background: busy ? "rgba(107,168,229,0.35)" : "rgba(107,168,229,0.18)", border: `1px solid ${busy ? "rgba(107,168,229,0.3)" : "rgba(107,168,229,0.45)"}`, fontSize: 14, fontWeight: 800, color: "#6ba8e5", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: busy ? "none" : "0 0 20px rgba(107,168,229,0.15)" }}>
                {busy ? <Loader size={15} style={{ animation: "spin 0.8s linear infinite" }} /> : <Key size={15} />}
                {busy ? t.accountLogin.sendingCode : t.accountLogin.getCode}
              </button>
            </div>
          )}

          {/* ── PHASE: SENDING ──────────────────────────────────────── */}
          {phase === "sending" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2.5px solid rgba(107,168,229,0.2)", borderTopColor: "#6ba8e5", animation: "spin 0.9s linear infinite" }} />
              <div style={{ fontSize: 14, color: TG.textSecondary, fontWeight: 600 }}>{t.accountLogin.connecting}</div>
              <div style={{ fontSize: 11, color: TG.muted }}>{t.accountLogin.connectingHint}</div>
            </div>
          )}

          {/* ── PHASE: OTP ───────────────────────────────────────────── */}
          {phase === "otp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.25s ease-out both" }}>
              <GlassCard style={{ padding: 16 }}>
                <div style={{ textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>✉️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TG.text }}>{t.accountLogin.codeTitle}</div>
                  <div style={{ fontSize: 11, color: TG.muted, marginTop: 4, lineHeight: 1.5 }}>
                    {t.accountLogin.codeSentFull}<br/>
                    <span style={{ color: "#6ba8e5", fontWeight: 700 }}>{wizard.phone}</span>
                  </div>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    value={wizard.code}
                    onChange={e => setWizard(w => ({ ...w, code: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleConfirmOtp()}
                    placeholder="12345"
                    type="number"
                    autoFocus
                    maxLength={6}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(107,168,229,0.35)",
                      borderRadius: 16, padding: "16px",
                      fontSize: 28, fontWeight: 800, color: TG.text,
                      outline: "none", textAlign: "center", letterSpacing: "0.3em",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </GlassCard>

              {wizard.errorMsg && <ErrorBanner msg={wizard.errorMsg} />}

              <button onClick={handleConfirmOtp} disabled={!wizard.code.trim()} style={{ width: "100%", padding: "14px", borderRadius: 16, background: wizard.code.trim() ? "#2de897" : "rgba(45,232,151,0.2)", border: "none", fontSize: 14, fontWeight: 800, color: wizard.code.trim() ? "#07090f" : "rgba(45,232,151,0.5)", cursor: wizard.code.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                {t.accountLogin.confirmCode}
              </button>

              <button onClick={handleCancelSession} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, fontSize: 12, padding: "4px 0", textAlign: "center", width: "100%" }}>
                {t.accountLogin.cancelAndSelect}
              </button>
            </div>
          )}

          {/* ── PHASE: 2FA ──────────────────────────────────────────── */}
          {phase === "twofa" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.25s ease-out both" }}>
              <GlassCard style={{ padding: 16 }}>
                <div style={{ textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🔐</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#ffc946" }}>{t.accountLogin.twoFaTitle}</div>
                  <div style={{ fontSize: 11, color: TG.muted, marginTop: 4, lineHeight: 1.5 }}>
                    {t.accountLogin.twoFaHint}
                  </div>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    value={wizard.password}
                    onChange={e => setWizard(w => ({ ...w, password: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleConfirm2fa()}
                    placeholder={lang === "ua" ? "Пароль 2FA" : "2FA Password"}
                    type="password"
                    autoFocus
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,201,70,0.35)",
                      borderRadius: 16, padding: "14px 16px",
                      fontSize: 16, color: TG.text,
                      outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <Lock size={14} color="#ffc946" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </GlassCard>

              {wizard.errorMsg && <ErrorBanner msg={wizard.errorMsg} />}

              <button onClick={handleConfirm2fa} disabled={!wizard.password.trim()} style={{ width: "100%", padding: "14px", borderRadius: 16, background: wizard.password.trim() ? "#ffc946" : "rgba(255,201,70,0.2)", border: "none", fontSize: 14, fontWeight: 800, color: wizard.password.trim() ? "#07090f" : "rgba(255,201,70,0.5)", cursor: wizard.password.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                {t.accountLogin.loginWith2fa}
              </button>

              <button onClick={() => setPhase("otp")} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, fontSize: 12, padding: "4px 0", textAlign: "center", width: "100%" }}>
                {t.accountLogin.backToCode}
              </button>
            </div>
          )}

          {/* ── PHASE: DONE ─────────────────────────────────────────── */}
          {phase === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 20px", animation: "fadeUp 0.3s ease-out both" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(45,232,151,0.12)", border: "2px solid rgba(45,232,151,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(45,232,151,0.25)" }}>
                <CheckCircle size={28} color="#2de897" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#2de897" }}>{t.accountLogin.successTitle}</div>
                {wizard.displayName && (
                  <div style={{ fontSize: 13, color: TG.textSecondary, marginTop: 6 }}>
                    {t.accountLogin.loggedAs} <span style={{ fontWeight: 700, color: TG.text }}>{wizard.displayName}</span>
                  </div>
                )}
              </div>
              <button onClick={() => { haptic.success(); setPhase("select", INIT); load(); }} style={{ padding: "12px 32px", borderRadius: 16, background: "#2de897", border: "none", fontSize: 14, fontWeight: 800, color: "#07090f", cursor: "pointer" }}>
                {lang === "ua" ? "Авторизувати ще один" : "Authorize another"}
              </button>
              <button onClick={() => { haptic.light(); onClose(); }} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, fontSize: 13, padding: "4px 0" }}>
                {lang === "ua" ? "Закрити" : "Close"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
