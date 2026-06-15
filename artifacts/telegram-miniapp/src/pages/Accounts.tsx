import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldOff, AlertTriangle, RefreshCw,
  Activity, Clock, Plus, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { api, SenderAccount } from "../lib/api";
import { TG, BLUR } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";
import { useSse } from "../lib/useSse";

const DAILY_LIMIT = 50;

function statusColor(acc: SenderAccount): string {
  if (acc.is_banned) return TG.red;
  if (!acc.is_active) return TG.muted;
  if (acc.status === "running") return TG.green;
  return TG.accent;
}
function statusGlow(acc: SenderAccount): string {
  if (acc.is_banned) return TG.redGlow;
  if (!acc.is_active) return "transparent";
  if (acc.status === "running") return TG.greenGlow;
  return TG.accentGlow;
}
function statusLabel(acc: SenderAccount): string {
  if (acc.is_banned) return "Бан";
  if (!acc.is_active) return "Выкл";
  if (acc.status === "running") return "В работе";
  if (acc.status === "cooldown") return "Cooldown";
  return "Ожидание";
}

function NewAccountForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [proxy, setProxy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inp = (placeholder: string, value: string, onChange: (v: string) => void, type = "text") => (
    <input
      type={type}
      style={{
        width: "100%", padding: "12px 14px", marginBottom: 10,
        background: TG.inputBg,
        backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        border: `1px solid ${TG.inputBorder}`,
        borderRadius: 13, color: TG.text, fontSize: 14,
        outline: "none", boxSizing: "border-box" as const,
      }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );

  async function handleCreate() {
    if (!phone.trim()) { setError("Введите номер телефона"); return; }
    setBusy(true); setError(null);
    try {
      await api.createAccount({ phone: phone.trim(), label: label.trim() || undefined, username: username.trim() || undefined, proxy: proxy.trim() || undefined });
      onDone();
    } catch { setError("Ошибка при создании. Проверьте данные."); }
    setBusy(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }}>
      <div className="slide-up" style={{
        width: "100%",
        background: "rgba(13,20,38,0.95)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        borderRadius: "24px 24px 0 0",
        border: "1px solid rgba(255,255,255,0.12)",
        borderBottom: "none",
        padding: "24px 16px",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>Добавить аккаунт</div>
          <button onClick={onDone} className="tap" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, cursor: "pointer", color: TG.muted, padding: 7, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        {inp("Телефон (+7...)", phone, setPhone, "tel")}
        {inp("Метка (необязательно)", label, setLabel)}
        {inp("Username (без @)", username, setUsername)}
        {inp("Прокси (socks5://...)", proxy, setProxy)}

        {error && (
          <div style={{ marginBottom: 12, padding: "10px 13px", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 11, color: TG.red, fontSize: 12 }}>
            {error}
          </div>
        )}

        <button disabled={busy} onClick={handleCreate} className="tap" style={{
          width: "100%", padding: "14px",
          background: "linear-gradient(135deg, #5288c1, #3b6fa8)",
          border: "none", borderRadius: 15,
          color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
          boxShadow: "0 4px 20px rgba(82,136,193,0.3), 0 1px 0 rgba(255,255,255,0.15) inset",
        }}>
          {busy ? "Сохраняем..." : "Добавить"}
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
  const pct = Math.min((acc.sent_today / DAILY_LIMIT) * 100, 100);
  const barColor = pct > 90 ? TG.red : pct > 70 ? TG.yellow : TG.green;

  async function toggle() {
    setBusy(true);
    try {
      if (acc.is_active) await api.patchAccount(acc.id, { is_active: 0, status: "offline" } as any);
      else await api.patchAccount(acc.id, { is_active: 1, status: "idle" } as any);
      onRefresh();
    } catch {}
    setBusy(false);
  }

  async function resetDaily() {
    setBusy(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/accounts/${acc.id}/reset-daily`, { method: "POST" });
      onRefresh();
    } catch {}
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm("Удалить аккаунт?")) return;
    setBusy(true);
    try { await api.deleteAccount(acc.id); onRefresh(); } catch {}
    setBusy(false);
  }

  return (
    <div className="fade-up" style={{
      background: TG.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
      border: `1px solid ${expanded ? "rgba(255,255,255,0.14)" : TG.glassBorder}`,
      borderRadius: 20, overflow: "hidden", marginBottom: 10,
      transition: "border-color 0.2s",
    }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: color + "1a", border: `1px solid ${color}30`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: acc.is_active && !acc.is_banned ? `0 0 16px ${glow}` : "none",
          }}>
            {acc.is_banned
              ? <ShieldOff size={17} color={color} />
              : <ShieldCheck size={17} color={color} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: TG.text }}>
              {acc.label || acc.phone}
            </div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>
              {acc.username ? `@${acc.username}` : acc.phone}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color }}>{statusLabel(acc)}</div>
              <div style={{ fontSize: 11, color: TG.muted, marginTop: 2 }}>{acc.sent_today}/{DAILY_LIMIT}</div>
            </div>
            {expanded ? <ChevronUp size={13} color={TG.muted} /> : <ChevronDown size={13} color={TG.muted} />}
          </div>
        </div>

        <div style={{ marginTop: 12, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: barColor, transition: "width 0.5s", boxShadow: `0 0 6px ${barColor}66` }} />
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 13 }}>
            {[
              { icon: Activity,      label: "Всего",   value: acc.sent_total.toLocaleString("ru"),   color: TG.accent },
              { icon: AlertTriangle, label: "Ошибок",  value: acc.failed_total.toLocaleString("ru"), color: acc.failed_total > 0 ? TG.red : TG.muted },
            ].map(({ icon: Icon, label, value, color: c }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "11px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <Icon size={12} color={c} />
                  <span style={{ fontSize: 11, color: TG.muted }}>{label}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: TG.text }}>{value}</div>
              </div>
            ))}
          </div>

          {acc.last_used_at && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 11, color: TG.muted, fontSize: 12 }}>
              <Clock size={12} />
              <span>Последнее: {acc.last_used_at.slice(0, 16).replace("T", " ")}</span>
            </div>
          )}

          {acc.last_error && (
            <div style={{ marginBottom: 11, padding: "9px 11px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 11, color: TG.red }}>
              {acc.last_error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={busy} onClick={toggle} className="tap" style={{
              flex: 1, padding: "10px", borderRadius: 12,
              background: acc.is_active ? "rgba(248,113,113,0.10)" : "rgba(82,136,193,0.10)",
              border: `1px solid ${acc.is_active ? "rgba(248,113,113,0.3)" : "rgba(82,136,193,0.3)"}`,
              color: acc.is_active ? TG.red : TG.accentLight,
              fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            }}>
              {acc.is_active ? "Деактивировать" : "Активировать"}
            </button>
            <button disabled={busy} onClick={resetDaily} className="tap" style={{
              padding: "10px 13px", borderRadius: 12,
              background: TG.glass, border: `1px solid ${TG.glassBorder}`,
              color: TG.muted, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <RefreshCw size={13} /> Сброс
            </button>
            <button disabled={busy} onClick={handleDelete} className="tap" style={{
              padding: "10px 13px", borderRadius: 12,
              background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
              color: TG.red, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
            }}>
              ✕
            </button>
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
        subtitle={`${active} активных · ${banned} забанено`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={load} className="tap" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, cursor: "pointer", color: TG.muted, padding: 7, display: "flex" }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setShowForm(true)} className="tap" style={{
              background: "linear-gradient(135deg, #5288c1, #3b6fa8)",
              border: "none", borderRadius: 11,
              padding: "7px 13px", fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 2px 12px rgba(82,136,193,0.3)",
            }}>
              <Plus size={14} /> Добавить
            </button>
          </div>
        }
      />

      {loading ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px", WebkitOverflowScrolling: "touch" }}>
          {accounts.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ color: TG.muted, fontSize: 14, marginBottom: 20 }}>Нет аккаунтов</div>
              <button onClick={() => setShowForm(true)} className="tap" style={{
                padding: "13px 28px", background: "linear-gradient(135deg, #5288c1, #3b6fa8)",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(82,136,193,0.3)",
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
