import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldOff, AlertTriangle, RefreshCw,
  Activity, Clock, Plus, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { api, SenderAccount } from "../lib/api";
import { TG, BLUR, BLUR_HEAVY } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";
import { useSse } from "../lib/useSse";
import { haptic } from "../lib/haptics";

const DAILY_LIMIT = 50;

function statusColor(acc: SenderAccount) {
  if (acc.is_banned) return TG.red;
  if (!acc.is_active) return TG.muted;
  if (acc.status === "running") return TG.green;
  return TG.accent;
}
function statusGlow(acc: SenderAccount) {
  if (acc.is_banned) return TG.redGlow;
  if (!acc.is_active) return "transparent";
  if (acc.status === "running") return TG.greenGlow;
  return TG.accentGlow;
}
function statusLabel(acc: SenderAccount) {
  if (acc.is_banned) return "Бан";
  if (!acc.is_active) return "Выкл";
  if (acc.status === "running") return "В работе";
  if (acc.status === "cooldown") return "Cooldown";
  return "Ожидание";
}
function statusGrad(acc: SenderAccount) {
  if (acc.is_banned) return "linear-gradient(135deg,#ff6b7a,#c03040)";
  if (!acc.is_active) return "linear-gradient(135deg,#8aa3c0,#607080)";
  if (acc.status === "running") return "linear-gradient(135deg,#2de897,#17a86a)";
  return "linear-gradient(135deg,#95c4f5,#5b96d4)";
}

function NewAccountForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [proxy, setProxy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", marginBottom: 10,
    background: TG.inputBg, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
    border: `1px solid ${TG.inputBorder}`,
    borderRadius: 14, color: TG.text, fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  async function handleCreate() {
    if (!phone.trim()) { setError("Введите номер телефона"); return; }
    setBusy(true); setError(null);
    try {
      await api.createAccount({ phone: phone.trim(), label: label.trim() || undefined, username: username.trim() || undefined, proxy: proxy.trim() || undefined });
      haptic.success();
      onDone();
    } catch { haptic.error(); setError("Ошибка при создании. Проверьте данные."); }
    setBusy(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.68)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", alignItems: "flex-end" }}>
      <div className="slide-up" style={{
        width: "100%",
        background: "rgba(9,13,24,0.97)",
        backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY,
        borderRadius: "28px 28px 0 0",
        border: "1px solid rgba(255,255,255,0.14)",
        borderBottom: "none",
        padding: "24px 17px",
        paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 -28px 72px rgba(0,0,0,0.58)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.24) 50%,transparent)", pointerEvents: "none" }} />
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.16)", margin: "-10px auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ flex: 1, fontSize: 18, fontWeight: 900, letterSpacing: "-0.4px", background: "linear-gradient(135deg,#eef2ff,rgba(149,196,245,0.85))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Добавить аккаунт
          </div>
          <button onClick={() => { haptic.light(); onDone(); }} className="tap" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 11, cursor: "pointer", color: TG.muted, padding: 8, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        {[
          { ph: "Телефон (+7...)", val: phone, set: setPhone, type: "tel" },
          { ph: "Метка (необязательно)", val: label, set: setLabel, type: "text" },
          { ph: "Username (без @)", val: username, set: setUsername, type: "text" },
          { ph: "Прокси (socks5://...)", val: proxy, set: setProxy, type: "text" },
        ].map(({ ph, val, set, type }) => (
          <input key={ph} type={type} style={inputStyle} placeholder={ph} value={val} onChange={e => set(e.target.value)} />
        ))}

        {error && (
          <div style={{ marginBottom: 13, padding: "10px 13px", background: "rgba(255,107,122,0.09)", border: "1px solid rgba(255,107,122,0.26)", borderRadius: 12, color: TG.red, fontSize: 12, lineHeight: 1.5 }}>{error}</div>
        )}

        <button disabled={busy} onClick={() => { haptic.medium(); handleCreate(); }} className="tap" style={{
          width: "100%", padding: "15px",
          background: "linear-gradient(135deg,#5b96d4,#3a6fad)",
          border: "none", borderRadius: 17, color: "#fff",
          fontSize: 15, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.68 : 1,
          boxShadow: "0 6px 28px rgba(91,150,212,0.40), 0 1px 0 rgba(255,255,255,0.18) inset",
        }}>
          {busy ? "Сохраняем..." : "Добавить аккаунт"}
        </button>
      </div>
    </div>
  );
}

function AccountCard({ acc, onRefresh }: { acc: SenderAccount; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const color = statusColor(acc);
  const glow = statusGlow(acc);
  const grad = statusGrad(acc);
  const pct = Math.min((acc.sent_today / DAILY_LIMIT) * 100, 100);
  const barColor = pct > 90 ? TG.red : pct > 70 ? TG.yellow : TG.green;

  async function toggle() {
    setBusy(true); haptic.light();
    try {
      if (acc.is_active) await api.patchAccount(acc.id, { is_active: 0, status: "offline" } as any);
      else await api.patchAccount(acc.id, { is_active: 1, status: "idle" } as any);
      haptic.success();
      onRefresh();
    } catch { haptic.error(); }
    setBusy(false);
  }

  async function resetDaily() {
    setBusy(true); haptic.light();
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/accounts/${acc.id}/reset-daily`, { method: "POST" });
      haptic.success();
      onRefresh();
    } catch { haptic.error(); }
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm("Удалить аккаунт?")) return;
    setBusy(true);
    try { await api.deleteAccount(acc.id); haptic.success(); onRefresh(); } catch { haptic.error(); }
    setBusy(false);
  }

  return (
    <div className="lg fade-up stagger-item" style={{ marginBottom: 10 }}>
      <div onClick={() => { haptic.select(); setExpanded(e => !e); }} style={{ padding: "15px 16px", cursor: "pointer", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 15, flexShrink: 0,
            background: `linear-gradient(145deg,${color}1a,${color}0a)`,
            border: `1px solid ${color}2c`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: acc.is_active && !acc.is_banned ? `0 0 22px ${glow}` : "none",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.11),transparent)", pointerEvents: "none" }} />
            {acc.is_banned ? <ShieldOff size={18} color={color} /> : <ShieldCheck size={18} color={color} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: TG.text, letterSpacing: "-0.2px" }}>
              {acc.label || acc.phone}
            </div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>
              {acc.username ? `@${acc.username}` : acc.phone}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {statusLabel(acc)}
            </div>
            <div style={{ fontSize: 11, color: TG.muted }}>{acc.sent_today}/{DAILY_LIMIT}</div>
          </div>
          {expanded ? <ChevronUp size={13} color={TG.muted} /> : <ChevronDown size={13} color={TG.muted} />}
        </div>

        <div style={{ marginTop: 12, height: 3, background: "rgba(255,255,255,0.055)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg,${barColor},${barColor}cc)`, transition: "width 0.55s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 0 8px ${barColor}88` }} />
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px", position: "relative", zIndex: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 13 }}>
            {[
              { icon: Activity,      label: "Всего",  value: acc.sent_total.toLocaleString("ru"),   color: TG.accent },
              { icon: AlertTriangle, label: "Ошибок", value: acc.failed_total.toLocaleString("ru"), color: acc.failed_total > 0 ? TG.red : TG.muted },
            ].map(({ icon: Icon, label, value, color: c }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.038)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <Icon size={12} color={c} /><span style={{ fontSize: 10, color: TG.muted }}>{label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: TG.text, letterSpacing: "-0.3px" }}>{value}</div>
              </div>
            ))}
          </div>

          {acc.last_used_at && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: TG.muted, fontSize: 11.5 }}>
              <Clock size={11} />
              <span>Последнее: {acc.last_used_at.slice(0, 16).replace("T", " ")}</span>
            </div>
          )}

          {acc.last_error && (
            <div style={{ marginBottom: 12, padding: "9px 12px", background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.20)", borderRadius: 12, fontSize: 11, color: TG.red, lineHeight: 1.5 }}>
              {acc.last_error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={busy} onClick={toggle} className="tap" style={{
              flex: 1, padding: "10px", borderRadius: 13,
              background: acc.is_active ? "rgba(255,107,122,0.09)" : "rgba(91,150,212,0.09)",
              border: `1px solid ${acc.is_active ? "rgba(255,107,122,0.28)" : "rgba(91,150,212,0.28)"}`,
              color: acc.is_active ? TG.red : TG.accentLight,
              fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            }}>
              {acc.is_active ? "Деактивировать" : "Активировать"}
            </button>
            <button disabled={busy} onClick={() => { haptic.light(); resetDaily(); }} className="tap" style={{
              padding: "10px 14px", borderRadius: 13,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
              color: TG.muted, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <RefreshCw size={12} /> Сброс
            </button>
            <button disabled={busy} onClick={() => { haptic.warning(); handleDelete(); }} className="tap" style={{
              padding: "10px 13px", borderRadius: 13,
              background: "rgba(255,107,122,0.07)", border: "1px solid rgba(255,107,122,0.20)",
              color: TG.red, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
            }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try { setAccounts(await api.getAccounts()); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useSse(useCallback((type, data) => {
    if (type === "accounts" && Array.isArray(data)) {
      setAccounts(prev => {
        const updates = data as SenderAccount[];
        return prev.map(a => { const u = updates.find(x => x.id === a.id); return u ? { ...a, ...u } : a; });
      });
    }
  }, []));

  const active = accounts.filter(a => a.is_active && !a.is_banned).length;
  const banned = accounts.filter(a => a.is_banned).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {showForm && <NewAccountForm onDone={() => { setShowForm(false); load(); }} />}

      <Header
        title="Аккаунты"
        subtitle={`${active} активных · ${banned} забанено · ${accounts.length} всего`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { haptic.light(); load(); }} className="tap" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 11, cursor: "pointer", color: TG.muted, padding: 8, display: "flex" }}>
              <RefreshCw size={14} />
            </button>
            <button onClick={() => { haptic.medium(); setShowForm(true); }} className="tap" style={{
              background: "linear-gradient(135deg,#5b96d4,#3a6fad)",
              border: "none", borderRadius: 13, padding: "7px 13px",
              fontSize: 13, fontWeight: 800, color: "#fff",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 4px 18px rgba(91,150,212,0.34)",
            }}>
              <Plus size={14} /> Добавить
            </button>
          </div>
        }
      />

      {loading ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px", WebkitOverflowScrolling: "touch" }}>
          {accounts.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 42, marginBottom: 14 }}>🛡️</div>
              <div style={{ color: TG.muted, fontSize: 14, marginBottom: 24, lineHeight: 1.55 }}>
                Нет аккаунтов.<br />Добавьте первый Telegram-аккаунт.
              </div>
              <button onClick={() => { haptic.medium(); setShowForm(true); }} className="tap" style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg,#5b96d4,#3a6fad)",
                border: "none", borderRadius: 18, color: "#fff",
                fontSize: 14, fontWeight: 800,
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 6px 28px rgba(91,150,212,0.40)",
              }}>
                <Plus size={16} /> Добавить аккаунт
              </button>
            </div>
          ) : accounts.map(acc => <AccountCard key={acc.id} acc={acc} onRefresh={load} />)}
          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  );
}
