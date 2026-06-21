import { useState, useRef, useEffect } from "react";
import { useI18n } from "../lib/i18n";
import { haptic } from "../lib/haptics";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const SESSION_KEY = "promo_fuel_auth";

export function getStoredSecret(): string {
  return sessionStorage.getItem(SESSION_KEY) ?? "";
}

export function setStoredSecret(s: string) {
  sessionStorage.setItem(SESSION_KEY, s);
}

export function clearStoredSecret() {
  sessionStorage.removeItem(SESSION_KEY);
}

interface Props {
  onUnlocked: () => void;
}

export function LockScreen({ onUnlocked }: Props) {
  const { t } = useI18n();
  const [password, setPassword]   = useState("");
  const [error,    setError]      = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [shake,    setShake]      = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError(false);
    try {
      const r = await fetch(`${API_BASE}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: password.trim() }),
      });
      if (r.ok) {
        haptic.success();
        setStoredSecret(password.trim());
        onUnlocked();
      } else {
        haptic.error();
        setError(true);
        setShake(true);
        setPassword("");
        setTimeout(() => setShake(false), 600);
        inputRef.current?.focus();
      }
    } catch {
      haptic.error();
      setError(true);
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#07090f",
      position: "relative",
      overflow: "hidden",
      padding: "0 24px",
    }}>
      <MeshBg />

      <div
        style={{
          width: "100%",
          maxWidth: 360,
          position: "relative",
          zIndex: 2,
          animation: shake ? "lockShake 0.55s ease" : undefined,
        }}
      >
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 24,
          padding: "36px 28px 32px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: "linear-gradient(135deg,rgba(107,168,229,0.25) 0%,rgba(80,200,170,0.15) 100%)",
              border: "1px solid rgba(107,168,229,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 28,
              boxShadow: "0 8px 32px rgba(107,168,229,0.18)",
            }}>🔒</div>
            <div style={{
              fontSize: 20, fontWeight: 800,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.01em",
              marginBottom: 6,
            }}>PROMO-Fuel</div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.38)",
              fontWeight: 500, letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>{t.lock.subtitle}</div>
          </div>

          <form onSubmit={unlock} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              placeholder={t.lock.placeholder}
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 14,
                border: error
                  ? "1px solid rgba(255,90,90,0.55)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.88)",
                fontSize: 14,
                fontWeight: 500,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />

            {error && (
              <div style={{
                fontSize: 12, color: "#ff6b7a",
                padding: "7px 12px",
                background: "rgba(255,90,90,0.08)",
                border: "1px solid rgba(255,90,90,0.20)",
                borderRadius: 10,
                textAlign: "center",
                fontWeight: 500,
              }}>
                ⚠️ {t.lock.error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || loading}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 14,
                border: "none",
                background: password.trim() && !loading
                  ? "linear-gradient(135deg,rgba(107,168,229,0.80) 0%,rgba(80,200,170,0.70) 100%)"
                  : "rgba(255,255,255,0.07)",
                color: password.trim() && !loading
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.25)",
                fontSize: 14, fontWeight: 700,
                cursor: password.trim() && !loading ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                letterSpacing: "0.03em",
              }}
            >
              {loading ? "…" : t.lock.unlockBtn}
            </button>
          </form>

          <div style={{
            marginTop: 20,
            fontSize: 10,
            color: "rgba(255,255,255,0.20)",
            textAlign: "center",
            lineHeight: 1.5,
          }}>
            {t.lock.hint}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lockShake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

function MeshBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(170deg,#07090f 0%,#0b1020 28%,#0a1330 58%,#09101f 100%)" }} />
      <div style={{ position:"absolute", top:-200, left:-120, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(80,140,220,0.20) 0%,transparent 70%)", animation:"floatOrb 11s ease-in-out infinite" }}/>
      <div style={{ position:"absolute", bottom:60, right:-160, width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle,rgba(30,215,140,0.14) 0%,transparent 72%)", animation:"floatOrb2 13s ease-in-out infinite 2.5s" }}/>
    </div>
  );
}
