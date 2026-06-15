import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldOff, AlertTriangle, RefreshCw,
  Activity, Clock, Plus, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { api, SenderAccount } from "../lib/api";
import { TG } from "../lib/theme";
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

  function inp(focused: boolean) {
    return {
      width: "100%", padding: "10px 12px", marginBottom: 10,
      background: TG.inputBg, border: `1px solid ${focused ? TG.accent : TG.border}`,
      borderRadius: 10, color: TG.text, fontSize: 14,
      outline: "none", boxSizing: "border-box" as const,
    };
  }

  async function handleCreate() {
    if (!phone.trim()) { setError("Введите номер телефона"); return; }
    setBusy(true);
    setError(null);
    try {
      await api.createAccount({ phone: phone.trim(), label: label.trim() || undefined, username: username.trim() || undefined, proxy: proxy.trim() || undefined });
      onDone();
    } catch {
      setError("Ошибка при создании. Проверьте данные.");
    }
    setBusy(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#000000aa",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        width: "100%", background: TG.card,
        borderRadius: "20px 20px 0 0",
        padding: "20px 16px",
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Добавить аккаунт</div>
          <button onClick={onDone} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <input
          style={inp(false)}
          placeholder="Телефон (+7...)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <input
          style={inp(false)}
          placeholder="Метка (необязательно)"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <input
          style={inp(false)}
          placeholder="Username (без @)"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          style={inp(false)}
          placeholder="Прокси (socks5://...)"
          value={proxy}
          onChange={e => setProxy(e.target.value)}
        />

        {error && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: TG.red + "18", border: `1px solid ${TG.red}44`, borderRadius: 9, color: TG.red, fontSize: 12 }}>
            {error}
          </div>
        )}

        <button
          disabled={busy}
          onClick={handleCreate}
          style={{
            width: "100%", padding: "13px",
            background: TG.accentGrad, border: "none", borderRadius: 13,
            color: TG.text, fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.75 : 1,
          }}
        >
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
  const pct = Math.min((acc.sent_today / DAILY_LIMIT) * 100, 100);
  const barColor = pct > 90 ? TG.red : pct > 70 ? TG.yellow : TG.green;

  async function toggle() {
    setBusy(true);
    try {
      if (acc.is_active) {
        await api.patchAccount(acc.id, { is_active: 0, status: "offline" } as any);
      } else {
        await api.patchAccount(acc.id, { is_active: 1, status: "idle" } as any);
      }
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
    try {
      await api.deleteAccount(acc.id);
      onRefresh();
    } catch {}
    setBusy(false);
  }

  return (
    <div style={{ background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: "14px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {acc.is_banned
              ? <ShieldOff size={16} color={color} />
              : <ShieldCheck size={16} color={color} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {acc.label || acc.phone}
            </div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 1 }}>
              {acc.username ? `@${acc.username}` : acc.phone}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color }}>{statusLabel(acc)}</div>
              <div style={{ fontSize: 11, color: TG.muted, marginTop: 1 }}>{acc.sent_today}/{DAILY_LIMIT}</div>
            </div>
            {expanded ? <ChevronUp size={13} color={TG.muted} /> : <ChevronDown size={13} color={TG.muted} />}
          </div>
        </div>

        <div style={{ marginTop: 10, height: 3, background: TG.border, borderRadius: 2 }}>
          <div style={{ height: 3, width: `${pct}%`, borderRadius: 2, background: barColor, transition: "width 0.4s" }} />
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${TG.border}`, padding: "12px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
            {[
              { icon: Activity, label: "Всего", value: acc.sent_total.toLocaleString("ru"), color: TG.accent },
              { icon: AlertTriangle, label: "Ошибок", value: acc.failed_total.toLocaleString("ru"), color: acc.failed_total > 0 ? TG.red : TG.muted },
            ].map(({ icon: Icon, label, value, color: c }) => (
              <div key={label} style={{ background: TG.bg, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <Icon size={12} color={c} />
                  <span style={{ fontSize: 11, color: TG.muted }}>{label}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {acc.last_used_at && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: TG.muted, fontSize: 12 }}>
              <Clock size={12} />
              <span>Последнее: {acc.last_used_at.slice(0, 16).replace("T", " ")}</span>
            </div>
          )}

          {acc.last_error && (
            <div style={{ marginBottom: 10, padding: "8px 10px", background: TG.red + "15", border: `1px solid ${TG.red}33`, borderRadius: 9, fontSize: 11, color: TG.red }}>
              {acc.last_error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={busy} onClick={toggle} style={{
              flex: 1, padding: "10px", borderRadius: 11,
              background: acc.is_active ? TG.red + "20" : TG.accent + "20",
              border: `1px solid ${acc.is_active ? TG.red + "44" : TG.accent + "44"}`,
              color: acc.is_active ? TG.red : TG.accentLight,
              fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
            }}>
              {acc.is_active ? "Деактивировать" : "Активировать"}
            </button>
            <button disabled={busy} onClick={resetDaily} style={{
              padding: "10px 14px", borderRadius: 11,
              background: TG.card, border: `1px solid ${TG.border}`,
              color: TG.muted, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <RefreshCw size={13} /> Сброс
            </button>
            <button disabled={busy} onClick={handleDelete} style={{
              padding: "10px 12px", borderRadius: 11,
              background: "transparent", border: `1px solid ${TG.red}33`,
              color: TG.red + "cc", fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
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
        return prev.map(a => {
          const u = updates.find(x => x.id === a.id);
          return u ? { ...a, ...u } : a;
        });
      });
    }
  }, []));

  const active = accounts.filter(a => a.is_active && !a.is_banned).length;
  const banned = accounts.filter(a => a.is_banned).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {showForm && (
        <NewAccountForm onDone={() => { setShowForm(false); load(); }} />
      )}

      <Header
        title="Аккаунты"
        subtitle={`${active} активных · ${banned} забанено`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={load} style={{ background: "none", border: "none", cursor: "pointer", color: TG.muted, padding: 4 }}>
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: TG.accentGrad, border: "none", borderRadius: 9,
                padding: "6px 11px", fontSize: 13, fontWeight: 700, color: TG.text,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <Plus size={14} /> Добавить
            </button>
          </div>
        }
      />

      {loading ? <FullSpinner /> : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px", WebkitOverflowScrolling: "touch" }}>
          {accounts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ color: TG.muted, fontSize: 14, marginBottom: 16 }}>Нет аккаунтов</div>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  padding: "12px 24px", background: TG.accentGrad,
                  border: "none", borderRadius: 12, color: TG.text,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <Plus size={16} /> Добавить аккаунт
              </button>
            </div>
          ) : (
            accounts.map(acc => (
              <AccountCard key={acc.id} acc={acc} onRefresh={load} />
            ))
          )}
          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  );
}
