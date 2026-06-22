import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../lib/i18n";
import {
  Shield, Plus, ChevronDown, ChevronUp, X, RotateCcw, Power,
  Trash2, Key, CheckCircle, AlertCircle, Loader, Lock, Timer, XCircle, Copy,
} from "lucide-react";
import { api, SenderAccount } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard, StatusBadge } from "../components/GlassCard";
import { useSse } from "../lib/useSse";
import { haptic } from "../lib/haptics";

// ── Flood wait countdown badge ────────────────────────────────────────────────

function FloodCountdown({ until, onClear }: { until: string; onClear: () => void }) {
  const calcSecs = () => Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000));
  const [secs, setSecs] = useState(calcSecs);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecs(calcSecs());
    ref.current = setInterval(() => {
      const remaining = calcSecs();
      setSecs(remaining);
      if (remaining <= 0) { clearInterval(ref.current!); onClear(); }
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [until]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const expired = secs <= 0;

  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 4,
      fontSize: 9, fontWeight: 700,
      color: expired ? "#2de897" : "#ffc946",
      background: expired ? "rgba(45,232,151,0.12)" : "rgba(255,201,70,0.14)",
      border: `1px solid ${expired ? "rgba(45,232,151,0.3)" : "rgba(255,201,70,0.35)"}`,
      borderRadius: 20, padding: "2px 7px",
      cursor: "pointer",
    }} onClick={onClear} title="Нажмите для сброса">
      <Timer size={9} />
      {expired ? "ГОТОВО" : `FLOOD ${mm}:${ss}`}
      <XCircle size={9} style={{ opacity: 0.7 }} />
    </span>
  );
}

// ── Auth status badge ────────────────────────────────────────────────────────

function AuthBadge({ status, sessionFile }: { status?: string; sessionFile?: string }) {
  if (sessionFile) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#2de897", background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.3)", borderRadius: 20, padding: "2px 7px" }}>
        <CheckCircle size={9} />АВТОРИЗОВАН
      </span>
    );
  }
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.3)", borderRadius: 20, padding: "2px 7px" }}>
      <AlertCircle size={9} />НЕТ СЕССИИ
    </span>
  );
}

// ── Telethon auth flow ────────────────────────────────────────────────────────

type AuthStep = "idle" | "sending" | "waiting_code" | "waiting_2fa" | "done" | "error";

function TelethonAuthFlow({ acc, onDone }: { acc: SenderAccount; onDone: () => void }) {
  const [step,          setStep]          = useState<AuthStep>("idle");
  const [codeHash,      setCodeHash]      = useState("");
  const [code,          setCode]          = useState("");
  const [password,      setPassword]      = useState("");
  const [errorMsg,      setErrorMsg]      = useState("");
  const [displayName,   setDisplayName]   = useState("");

  // If account already has api_id/api_hash set, use them; otherwise prompt
  const [apiId,         setApiId]         = useState(acc.api_id ? String(acc.api_id) : "");
  const [apiHash,       setApiHash]       = useState(acc.api_hash ?? "");
  const needsCreds = !acc.api_id || !acc.api_hash;

  async function saveCredsAndStart() {
    if (!apiId || !apiHash) { setErrorMsg("Введите api_id и api_hash"); return; }
    haptic.medium(); setStep("sending"); setErrorMsg("");
    try {
      // Save credentials to account first
      await api.patchAccount(acc.id, { api_id: Number(apiId), api_hash: apiHash.trim() } as any);
      await startAuth();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Ошибка"); setStep("error");
    }
  }

  async function startAuth() {
    haptic.medium(); setStep("sending"); setErrorMsg("");
    try {
      const res = await api.startAuth(acc.id);
      if (res.already_authorized) {
        setDisplayName(res.display_name ?? "");
        setStep("done"); haptic.success();
        return;
      }
      if (res.error) { setErrorMsg(res.error); setStep("error"); haptic.error(); return; }
      if (res.phone_code_hash) {
        setCodeHash(res.phone_code_hash);
        setStep("waiting_code");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Auth server недоступен"); setStep("error"); haptic.error();
    }
  }

  async function confirmCode() {
    if (!code.trim()) { setErrorMsg("Введите код"); return; }
    haptic.medium(); setStep("sending"); setErrorMsg("");
    try {
      const res = await api.confirmAuth(acc.id, code.trim(), codeHash);
      if (res.needs_2fa) { setStep("waiting_2fa"); return; }
      if (res.ok) {
        setDisplayName(res.display_name ?? "");
        setStep("done"); haptic.success();
      } else {
        setErrorMsg(res.error ?? "Неверный код"); setStep("waiting_code"); haptic.error();
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Ошибка"); setStep("waiting_code"); haptic.error();
    }
  }

  async function confirm2fa() {
    if (!password.trim()) { setErrorMsg("Введите пароль"); return; }
    haptic.medium(); setStep("sending"); setErrorMsg("");
    try {
      const res = await api.confirm2fa(acc.id, password);
      if (res.ok) {
        setDisplayName(res.display_name ?? "");
        setStep("done"); haptic.success();
      } else {
        setErrorMsg(res.error ?? "Неверный пароль"); setStep("waiting_2fa"); haptic.error();
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Ошибка"); setStep("waiting_2fa"); haptic.error();
    }
  }

  const busy = step === "sending";

  const inp = (
    value: string, onChange: (v: string) => void,
    placeholder: string, type = "text"
  ) => (
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "11px 13px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }}
    />
  );

  if (step === "done") {
    return (
      <div style={{ padding: "14px", borderRadius: 14, background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={18} color="#2de897" />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#2de897" }}>Авторизация успешна!</div>
        </div>
        {displayName && <div style={{ fontSize: 12, color: TG.textSecondary }}>Вошли как: {displayName}</div>}
        <button onClick={() => { onDone(); }} style={{ padding: "9px", borderRadius: 10, background: "#2de897", border: "none", fontSize: 12, fontWeight: 700, color: "#07090f", cursor: "pointer" }}>
          Готово
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12, marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6ba8e5", display: "flex", alignItems: "center", gap: 5 }}>
        <Key size={11} />АВТОРИЗАЦИЯ TELETHON
      </div>

      {/* Credentials (only when missing) */}
      {(needsCreds || step === "idle") && !acc.session_file && (
        <>
          {needsCreds && (
            <>
              {inp(apiId, setApiId, "API ID (число)", "number")}
              {inp(apiHash, setApiHash, "API Hash (строка hex)")}
              <div style={{ fontSize: 10, color: TG.muted, lineHeight: 1.5 }}>
                Получи на <span style={{ color: "#6ba8e5" }}>my.telegram.org</span> → Apps
              </div>
            </>
          )}
          <button
            onClick={needsCreds ? saveCredsAndStart : startAuth}
            disabled={busy}
            style={{ padding: "10px", borderRadius: 12, background: "rgba(107,168,229,0.15)", border: "1px solid rgba(107,168,229,0.35)", fontSize: 12, fontWeight: 700, color: "#6ba8e5", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {busy ? <Loader size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Key size={13} />}
            {busy ? "Отправляем код…" : "Получить код в Telegram"}
          </button>
        </>
      )}

      {/* Already authorized — re-auth button */}
      {acc.session_file && step === "idle" && (
        <button
          onClick={startAuth}
          disabled={busy}
          style={{ padding: "9px", borderRadius: 12, background: "rgba(255,201,70,0.10)", border: "1px solid rgba(255,201,70,0.25)", fontSize: 11, fontWeight: 700, color: "#ffc946", cursor: "pointer" }}
        >
          Переавторизоваться
        </button>
      )}

      {/* Code input */}
      {step === "waiting_code" && (
        <>
          <div style={{ fontSize: 11, color: TG.textSecondary }}>Введи код из Telegram (5 цифр):</div>
          {inp(code, setCode, "12345", "number")}
          <button onClick={confirmCode} disabled={busy} style={{ padding: "10px", borderRadius: 12, background: "#2de897", border: "none", fontSize: 12, fontWeight: 700, color: "#07090f", cursor: busy ? "not-allowed" : "pointer" }}>
            {busy ? "Проверяем…" : "Подтвердить код"}
          </button>
          <button onClick={() => setStep("idle")} style={{ padding: "6px", background: "none", border: "none", fontSize: 11, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </button>
        </>
      )}

      {/* 2FA input */}
      {step === "waiting_2fa" && (
        <>
          <div style={{ fontSize: 11, color: "#ffc946", display: "flex", alignItems: "center", gap: 5 }}>
            <Lock size={11} />Требуется двухфакторный пароль
          </div>
          {inp(password, setPassword, "Пароль 2FA", "password")}
          <button onClick={confirm2fa} disabled={busy} style={{ padding: "10px", borderRadius: 12, background: "#ffc946", border: "none", fontSize: 12, fontWeight: 700, color: "#07090f", cursor: busy ? "not-allowed" : "pointer" }}>
            {busy ? "Проверяем…" : "Войти"}
          </button>
        </>
      )}

      {errorMsg && (
        <div style={{ fontSize: 11, color: "#ff6b7a", background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.2)", borderRadius: 8, padding: "7px 10px" }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// ── Add account form ─────────────────────────────────────────────────────────

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [phone,    setPhone]    = useState("");
  const [label,    setLabel]    = useState("");
  const [apiId,    setApiId]    = useState("");
  const [apiHash,  setApiHash]  = useState("");
  const [proxies,  setProxies]  = useState("");
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function submit() {
    if (!phone.trim()) { setError("Введите номер телефона"); return; }
    haptic.medium(); setBusy(true); setError(null);
    try {
      await api.createAccount({
        phone:    phone.trim(),
        label:    label.trim() || undefined,
        api_id:   apiId ? Number(apiId) : undefined,
        api_hash: apiHash.trim() || undefined,
        proxies:  proxies.trim() || undefined,
      });
      haptic.success(); onDone();
    } catch (e: any) { setError(e?.message ?? "Ошибка"); haptic.error(); }
    setBusy(false);
  }

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, type = "text") => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }} />
  );

  return (
    <GlassCard style={{ padding: "16px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TG.text }}>Новый аккаунт</span>
        <div onClick={onDone} style={{ cursor: "pointer", color: TG.muted, padding: 4 }}><X size={16} /></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {inp(phone,   setPhone,   "+7 (999) 000-00-00", "tel")}
        {inp(label,   setLabel,   "Метка (необяз.)")}
        {inp(apiId,   setApiId,   "API ID (необяз.)", "number")}
        {inp(apiHash, setApiHash, "API Hash (необяз.)")}
        {inp(proxies, setProxies, "Прокси: socks5://user:pass@host:port")}
        <div style={{ fontSize: 10, color: TG.muted, lineHeight: 1.5 }}>
          API ID и Hash получают на <span style={{ color: "#6ba8e5" }}>my.telegram.org</span>
        </div>
        {error && <div style={{ fontSize: 11, color: "#ff6b7a", padding: "6px 0" }}>{error}</div>}
        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "12px", borderRadius: 14, background: TG.green, border: "none", fontSize: 13, fontWeight: 700, color: "#07090f", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Добавление…" : "Добавить аккаунт"}
        </button>
      </div>
    </GlassCard>
  );
}

// ── Rate-limit gauge ──────────────────────────────────────────────────────────

type RateData = {
  window_seconds: number; window_max: number;
  count: number; remaining: number; resets_at: string | null;
};

function RateLimitGauge({ accountId }: { accountId: number }) {
  const [data,        setData]     = useState<RateData | null>(null);
  const [secsToReset, setCountdown]= useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.getAccountRateLimit(accountId);
      setData(d);
      setCountdown(d.resets_at ? Math.max(0, Math.round((new Date(d.resets_at).getTime() - Date.now()) / 1000)) : 0);
    } catch {}
  }, [accountId]);

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, 15_000);
    return () => clearInterval(poll);
  }, [fetchData]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!data?.resets_at) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) fetchData();
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data?.resets_at, fetchData]);

  if (!data) return null;

  const pct     = data.window_max > 0 ? Math.min(100, (data.count / data.window_max) * 100) : 0;
  const free    = data.remaining / data.window_max;
  const barColor = free > 0.5 ? "#2de897" : free > 0.25 ? "#ffc946" : "#ff6b7a";
  const isEmpty  = data.count === 0;

  return (
    <div style={{
      borderRadius: 10, padding: "9px 11px",
      background: isEmpty ? "rgba(255,255,255,0.03)" : `${barColor}0e`,
      border: `1px solid ${isEmpty ? "rgba(255,255,255,0.08)" : barColor + "28"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Timer size={10} color={isEmpty ? "rgba(255,255,255,0.35)" : barColor} />
          <span style={{ fontSize: 10, fontWeight: 700, color: isEmpty ? "rgba(255,255,255,0.35)" : barColor }}>
            Скорость / мин
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: isEmpty ? "rgba(255,255,255,0.3)" : barColor }}>
            {data.count} / {data.window_max}
          </span>
          {secsToReset > 0 && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
              ↺{secsToReset}с
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${pct}%`,
          background: `linear-gradient(90deg,${barColor},${barColor}99)`,
          boxShadow: pct > 0 ? `0 0 6px ${barColor}66` : "none",
          transition: "width 0.6s ease",
        }} />
      </div>
      {!isEmpty && (
        <div style={{ marginTop: 5, fontSize: 9, color: "rgba(255,255,255,0.35)", display: "flex", justifyContent: "space-between" }}>
          <span>осталось {data.remaining} сообщ.</span>
          <span>окно {data.window_seconds} сек</span>
        </div>
      )}
    </div>
  );
}

// ── Account card ─────────────────────────────────────────────────────────────

type ProxyResult = { alive: boolean | null; latency_ms: number | null; error: string | null };

function ProxyPingBadge({ accountId, proxy }: { accountId: number; proxy: string | null }) {
  const [state,  setState]  = useState<"idle" | "checking" | "done">("idle");
  const [result, setResult] = useState<ProxyResult | null>(null);

  async function ping() {
    setState("checking");
    try {
      const { results } = await api.checkProxies([accountId]);
      setResult(results[0] ?? null);
    } catch {
      setResult({ alive: false, latency_ms: null, error: "Network error" });
    }
    setState("done");
  }

  if (!proxy || !proxy.includes("socks5://")) {
    return (
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "2px 7px" }}>
        no proxy
      </span>
    );
  }

  if (state === "idle") {
    return (
      <button onClick={e => { e.stopPropagation(); ping(); }} style={{
        fontSize: 9, fontWeight: 700, color: "#c4aeff",
        background: "rgba(196,174,255,0.10)", border: "1px solid rgba(196,174,255,0.25)",
        borderRadius: 6, padding: "2px 7px", cursor: "pointer",
      }}>🔌 Ping</button>
    );
  }

  if (state === "checking") {
    return (
      <span style={{ fontSize: 9, color: "#c4aeff", background: "rgba(196,174,255,0.10)",
        border: "1px solid rgba(196,174,255,0.22)", borderRadius: 6, padding: "2px 8px" }}>
        ⏳ …
      </span>
    );
  }

  if (!result || result.alive === false) {
    return (
      <button onClick={e => { e.stopPropagation(); setState("idle"); setResult(null); }} title={result?.error ?? "failed"}
        style={{ fontSize: 9, fontWeight: 700, color: "#ff6b7a",
          background: "rgba(255,107,122,0.12)", border: "1px solid rgba(255,107,122,0.28)",
          borderRadius: 6, padding: "2px 7px", cursor: "pointer" }}>
        ✗ dead
      </button>
    );
  }

  const ms = result.latency_ms ?? 0;
  const col = ms < 200 ? "#2de897" : ms < 500 ? "#ffc946" : "#ff6b7a";
  return (
    <button onClick={e => { e.stopPropagation(); setState("idle"); setResult(null); }}
      style={{ fontSize: 9, fontWeight: 700, color: col,
        background: `${col}12`, border: `1px solid ${col}33`,
        borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
      ⚡{ms}ms
    </button>
  );
}

function AccountCard({ acc, onRefresh }: { acc: SenderAccount; onRefresh: () => void }) {
  const { t, lang } = useI18n();
  const [expanded,      setExpanded]      = useState(false);
  const [showAuth,      setShowAuth]      = useState(false);
  const [busy,          setBusy]          = useState(false);
  const [editingLimit,  setEditingLimit]  = useState(false);
  const [limitInput,    setLimitInput]    = useState(String(acc.daily_limit ?? 300));
  const [bannedCount,   setBannedCount]   = useState<number | null>(null);

  useEffect(() => {
    api.getBannedGroups(acc.id)
      .then(groups => setBannedCount(groups.length))
      .catch(() => setBannedCount(null));
  }, [acc.id]);

  const isFlooded = acc.status === "flood_wait" && !!acc.flood_wait_until;

  const statusColor = {
    idle: "#2de897", sending: "#6ba8e5", banned: "#ff6b7a",
    offline: "rgba(160,190,230,0.45)", flood: "#ffc946",
    flood_wait: "#ffc946", broadcasting: "#c4aeff",
  }[acc.status] ?? "rgba(160,190,230,0.45)";

  const limit = acc.daily_limit ?? 300;
  const pct = acc.sent_today > 0 ? Math.min(100, Math.round(acc.sent_today / limit * 100)) : 0;

  async function toggleActive() {
    haptic.medium(); setBusy(true);
    try {
      if (acc.is_active) await api.patchAccount(acc.id, { is_active: 0, status: "offline" } as any);
      else               await api.patchAccount(acc.id, { is_active: 1, status: "idle" } as any);
      haptic.success(); onRefresh();
    } catch { haptic.error(); } finally { setBusy(false); }
  }

  async function resetDaily() {
    haptic.medium(); setBusy(true);
    try {
      await api.resetAccountDaily(acc.id);
      haptic.success(); onRefresh();
    } catch { haptic.error(); } finally { setBusy(false); }
  }

  async function clearFlood() {
    haptic.medium(); setBusy(true);
    try { await api.clearFlood(acc.id); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); }
  }

  async function saveDailyLimit() {
    const val = parseInt(limitInput);
    if (isNaN(val) || val < 1 || val > 10000) { setLimitInput(String(limit)); setEditingLimit(false); return; }
    haptic.medium(); setBusy(true);
    try { await api.patchAccount(acc.id, { daily_limit: val } as any); haptic.success(); onRefresh(); }
    catch { haptic.error(); } finally { setBusy(false); setEditingLimit(false); }
  }

  async function deleteAcc() {
    haptic.warning(); setBusy(true);
    try { await api.deleteAccount(acc.id); haptic.success(); onRefresh(); }
    catch { haptic.error(); setBusy(false); }
  }

  const authorized = !!acc.session_file;

  return (
    <GlassCard style={{ padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(145deg,${statusColor}30 0%,${statusColor}12 100%)`, border: `1px solid ${statusColor}40`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Shield size={16} color={statusColor} />
            {/* Auth indicator dot */}
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: authorized ? "#2de897" : "#ff6b7a", border: "1.5px solid #07090f" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: TG.text }}>{acc.label || `${t.nav.accounts} ${acc.id}`}</div>
            <div style={{ fontSize: 10, color: TG.muted }}>{acc.phone}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {bannedCount !== null && bannedCount > 0 && !acc.is_banned && (
            <span style={{ fontSize: 8, fontWeight: 700, color: "#ffc946", background: "rgba(255,201,70,0.12)", border: "1px solid rgba(255,201,70,0.28)", borderRadius: 20, padding: "2px 6px" }}>
              ⛔{bannedCount}
            </span>
          )}
          {acc.is_banned ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#ff6b7a", background: "rgba(255,107,122,0.15)", border: "1px solid rgba(255,107,122,0.35)", borderRadius: 20, padding: "2px 7px" }}>
              🚫 БАН
            </span>
          ) : isFlooded ? (
            <FloodCountdown until={acc.flood_wait_until!} onClear={clearFlood} />
          ) : (
            <AuthBadge status={acc.auth_status} sessionFile={acc.session_file} />
          )}
          <div onClick={() => { haptic.light(); setExpanded(o => !o); }} style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {expanded ? <ChevronUp size={13} color={TG.muted} /> : <ChevronDown size={13} color={TG.muted} />}
          </div>
        </div>
      </div>

      {/* Daily quota bar */}
      <div style={{ marginBottom: expanded ? 12 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: TG.muted }}>Дневной лимит</span>
          {editingLimit ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                autoFocus
                type="number"
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                onBlur={saveDailyLimit}
                onKeyDown={e => { if (e.key === "Enter") saveDailyLimit(); if (e.key === "Escape") { setLimitInput(String(limit)); setEditingLimit(false); } }}
                style={{ width: 64, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(107,168,229,0.4)", borderRadius: 6, padding: "2px 5px", fontSize: 10, color: TG.text, outline: "none", textAlign: "right" }}
              />
              <span style={{ fontSize: 10, color: TG.muted }}>/ день</span>
            </div>
          ) : (
            <span
              onClick={() => { setLimitInput(String(limit)); setEditingLimit(true); }}
              style={{ fontSize: 10, color: statusColor, fontWeight: 700, cursor: "pointer", borderBottom: "1px dashed rgba(107,168,229,0.4)", paddingBottom: 1 }}
              title="Нажмите для изменения лимита"
            >
              {acc.sent_today.toLocaleString("uk-UA")} / {limit.toLocaleString("uk-UA")}
            </span>
          )}
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${statusColor},${statusColor}99)`, boxShadow: pct > 0 ? `0 0 6px ${statusColor}66` : "none", transition: "width 0.6s ease" }} />
        </div>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
          {/* Stats row */}
          {(() => {
            const sent   = acc.sent_total ?? 0;
            const failed = acc.failed_total ?? 0;
            const total  = sent + failed;
            const sr     = total > 0 ? Math.round((sent / total) * 100) : null;
            const srColor = sr === null ? TG.muted : sr >= 90 ? "#2de897" : sr >= 70 ? "#ffc946" : "#ff6b7a";
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {[
                  { label: t.groups.sentTotal,    value: sent.toLocaleString(lang === "ua" ? "uk-UA" : lang),    color: "#6ba8e5" },
                  { label: t.workers.tasksFailed, value: failed.toLocaleString(lang === "ua" ? "uk-UA" : lang),  color: "#ff6b7a" },
                  { label: t.analytics.kpiReach,  value: sr !== null ? `${sr}%` : "—", color: srColor },
                  { label: t.accounts.status,     value: acc.status,                   color: statusColor },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 4px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: TG.muted, marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Rate-limit gauge */}
          <RateLimitGauge accountId={acc.id} />

          {/* API creds + proxy indicator */}
          {(acc.api_id || acc.username || acc.proxy || (acc as any).proxies) && (
            <div style={{ fontSize: 10, color: TG.muted, lineHeight: 1.8, display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
              {acc.username && <span style={{ color: "#6ba8e5" }}>@{acc.username}</span>}
              {acc.api_id   && <span>API ID: {acc.api_id}</span>}
              {acc.session_file && <span style={{ color: "#2de897" }}>· сессия активна</span>}
              {(acc.proxy || (acc as any).proxies) && (() => {
                const rawProxy = (acc as any).proxies ?? acc.proxy ?? "";
                const proxyCount = typeof rawProxy === "string"
                  ? rawProxy.split("\n").map((l: string) => l.trim()).filter(Boolean).length
                  : 0;
                return proxyCount > 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#c4aeff", background: "rgba(196,174,255,0.1)", border: "1px solid rgba(196,174,255,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>
                    🌐 {proxyCount} {proxyCount === 1 ? "прокси" : "прокси"}
                  </span>
                ) : null;
              })()}
              <ProxyPingBadge accountId={acc.id} proxy={acc.proxy ?? (acc as any).proxies ?? null} />
            </div>
          )}

          {/* Flood-wait warning block */}
          {isFlooded && (
            <div style={{ background: "rgba(255,201,70,0.08)", border: "1px solid rgba(255,201,70,0.25)", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Timer size={12} color="#ffc946" />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#ffc946" }}>Flood Wait — аккаунт на паузе</div>
                  <div style={{ fontSize: 9, color: TG.muted, marginTop: 1 }}>Telegram требует подождать перед следующей отправкой</div>
                </div>
              </div>
              <button onClick={clearFlood} disabled={busy} style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 8, background: "rgba(255,201,70,0.15)", border: "1px solid rgba(255,201,70,0.35)", fontSize: 10, fontWeight: 700, color: "#ffc946", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}>
                Сброс
              </button>
            </div>
          )}

          {/* Last error if banned or failed */}
          {acc.last_error && !isFlooded && (
            <div style={{ fontSize: 10, color: "#ff6b7a", background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.2)", borderRadius: 8, padding: "6px 9px", lineHeight: 1.4, wordBreak: "break-word" }}>
              ⚠️ {acc.last_error}
            </div>
          )}

          {/* Auth flow */}
          {showAuth ? (
            <TelethonAuthFlow acc={acc} onDone={() => { setShowAuth(false); onRefresh(); }} />
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ padding: "9px 6px", borderRadius: 12, background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.25)", fontSize: 11, fontWeight: 700, color: "#6ba8e5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Key size={11} />{t.accounts.authButton}
            </button>
          )}

          {/* Action buttons row */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={toggleActive} disabled={busy} style={{ flex: 1, padding: "9px 6px", borderRadius: 12, background: acc.is_active ? "rgba(255,107,122,0.12)" : "rgba(45,232,151,0.12)", border: `1px solid ${acc.is_active ? "rgba(255,107,122,0.3)" : "rgba(45,232,151,0.3)"}`, fontSize: 11, fontWeight: 700, color: acc.is_active ? "#ff6b7a" : TG.green, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Power size={11} />{acc.is_active ? t.editor.toggleOff : t.editor.toggleOn}
            </button>
            <button onClick={resetDaily} disabled={busy} style={{ flex: 1, padding: "9px 6px", borderRadius: 12, background: "rgba(107,168,229,0.12)", border: "1px solid rgba(107,168,229,0.3)", fontSize: 11, fontWeight: 700, color: "#6ba8e5", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <RotateCcw size={11} />{t.accounts.resetLimit}
            </button>
            <button onClick={deleteAcc} disabled={busy} style={{ width: 36, padding: "9px 6px", borderRadius: 12, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} color="#ff6b7a" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Bulk Import Panel ─────────────────────────────────────────────────────────

type BulkResult = {
  total_extracted_sessions: number;
  total_valid_proxies_parsed: number;
  saved: number;
  skipped: number;
  errors: string[];
  message: string;
};

function BulkImportPanel({ onDone }: { onDone: () => void }) {
  const [zipFile,  setZipFile]  = useState<File | null>(null);
  const [proxies,  setProxies]  = useState("");
  const [status,   setStatus]   = useState<"idle" | "running" | "done" | "error">("idle");
  const [result,   setResult]   = useState<BulkResult | null>(null);
  const [errMsg,   setErrMsg]   = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".zip")) { haptic.error(); setErrMsg("Дозволено лише .zip файли"); return; }
    setZipFile(f); setErrMsg(""); setResult(null); setStatus("idle");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (!f.name.endsWith(".zip")) { haptic.error(); setErrMsg("Дозволено лише .zip файли"); return; }
    setZipFile(f); setErrMsg(""); setResult(null); setStatus("idle");
  }

  async function execute() {
    if (!zipFile) { setErrMsg("Виберіть .zip архів"); return; }
    if (!proxies.trim()) { setErrMsg("Введіть хоча б один SOCKS5 проксі"); return; }
    haptic.medium(); setStatus("running"); setErrMsg(""); setResult(null);
    try {
      const res = await api.bulkImportAccounts(zipFile, proxies);
      if (res.status === "error") {
        setErrMsg(res.error ?? "Невідома помилка"); setStatus("error"); haptic.error(); return;
      }
      setResult(res.data ?? null); setStatus("done"); haptic.success();
    } catch (e: unknown) {
      setErrMsg((e as Error).message ?? "Помилка"); setStatus("error"); haptic.error();
    }
  }

  const busy = status === "running";
  const savePct = result ? Math.round((result.saved / Math.max(result.total_extracted_sessions, 1)) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 16px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(145deg,rgba(45,232,151,0.25),rgba(45,232,151,0.1))", border: "1px solid rgba(45,232,151,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TG.text }}>Масове завантаження</div>
            <div style={{ fontSize: 11, color: TG.muted }}>Bulk Account Import (.zip)</div>
          </div>
        </div>
        <div onClick={() => { haptic.light(); onDone(); }} style={{ cursor: "pointer", color: TG.muted, padding: 6 }}>
          <X size={18} />
        </div>
      </div>

      {/* Step 1 — ZIP file drop zone */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          1. Архів акаунтів (.zip)
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            borderRadius: 16, border: `2px dashed ${dragging ? "rgba(45,232,151,0.7)" : zipFile ? "rgba(45,232,151,0.4)" : "rgba(255,255,255,0.15)"}`,
            background: dragging ? "rgba(45,232,151,0.06)" : zipFile ? "rgba(45,232,151,0.04)" : "rgba(255,255,255,0.03)",
            padding: "28px 16px", textAlign: "center", cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
          }}
        >
          <input ref={fileRef} type="file" accept=".zip" style={{ display: "none" }} onChange={onFileChange} />
          {zipFile ? (
            <>
              <div style={{ fontSize: 30, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2de897" }}>{zipFile.name}</div>
              <div style={{ fontSize: 11, color: TG.muted, marginTop: 3 }}>{(zipFile.size / 1024).toFixed(1)} KB</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Перетягніть .zip або натисніть для вибору</div>
              <div style={{ fontSize: 11, color: TG.muted, marginTop: 4 }}>Повинен містити пари &#123;name&#125;.session + &#123;name&#125;.json</div>
            </>
          )}
        </div>
      </div>

      {/* Step 2 — Proxy list */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          2. Список SOCKS5 проксі (один на рядок)
        </div>
        <textarea
          value={proxies}
          onChange={e => setProxies(e.target.value)}
          rows={5}
          placeholder={"socks5://user1:pass1@host1:1080\nsocks5://user2:pass2@host2:1080"}
          style={{
            width: "100%", borderRadius: 14, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
            color: TG.text, padding: "12px 13px", fontFamily: "monospace", fontSize: 11,
            outline: "none", resize: "vertical", boxSizing: "border-box",
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Error message */}
      {errMsg && (
        <div style={{ borderRadius: 10, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)", padding: "10px 12px", fontSize: 12, color: "#ff6b7a", lineHeight: 1.5 }}>
          ⚠️ {errMsg}
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={execute}
        disabled={busy}
        style={{
          width: "100%", padding: "14px", borderRadius: 16,
          background: busy ? "rgba(45,232,151,0.15)" : "linear-gradient(135deg,rgba(45,232,151,0.45),rgba(45,232,151,0.25))",
          border: "1px solid rgba(45,232,151,0.4)", color: "#2de897",
          fontSize: 14, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: busy ? 0.7 : 1, transition: "all 0.2s",
        }}
      >
        {busy ? (
          <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(45,232,151,0.4)", borderTopColor: "#2de897", animation: "spin 0.8s linear infinite" }} />Обробка архіву…</>
        ) : (
          <>⚡ Запустити імпорт / Execute Import</>
        )}
      </button>

      {/* Result */}
      {status === "done" && result && (
        <div style={{ borderRadius: 14, background: "rgba(45,232,151,0.06)", border: "1px solid rgba(45,232,151,0.25)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={18} color="#2de897" />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2de897" }}>{result.message}</div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: TG.muted, marginBottom: 6 }}>
              <span>Ініціалізація</span>
              <span>{result.saved}/{result.total_extracted_sessions} · {savePct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${savePct}%`, borderRadius: 3, background: "linear-gradient(90deg,#2de897,#2de89799)", boxShadow: "0 0 8px rgba(45,232,151,0.5)", transition: "width 0.6s ease" }} />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Сесій знайдено",  value: String(result.total_extracted_sessions), color: TG.text },
              { label: "Збережено",       value: String(result.saved),                    color: "#2de897" },
              { label: "Проксі",          value: String(result.total_valid_proxies_parsed), color: "#6ba8e5" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "8px 6px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Errors if any */}
          {result.errors.length > 0 && (
            <div style={{ borderRadius: 10, background: "rgba(255,201,70,0.07)", border: "1px solid rgba(255,201,70,0.2)", padding: "8px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ffc946", marginBottom: 4 }}>⚠️ Пропущено ({result.skipped}):</div>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 10, color: TG.muted, lineHeight: 1.6 }}>· {e}</div>
              ))}
            </div>
          )}

          <button onClick={() => { haptic.medium(); onDone(); }}
            style={{ padding: "10px", borderRadius: 12, background: "#2de897", border: "none", fontSize: 12, fontWeight: 700, color: "#07090f", cursor: "pointer" }}>
            Готово — оновити список акаунтів
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountsPage({ onClose, onManualAccounts }: { onClose?: () => void; onManualAccounts?: () => void }) {
  const { t, lang } = useI18n();
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const load = useCallback(async () => {
    try { setAccounts(await api.getAccounts()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSse(() => { load(); });

  const active      = accounts.filter(a => a.is_active && a.status !== "banned").length;
  const authed      = accounts.filter(a => !!a.session_file).length;
  const totalSent   = accounts.reduce((s, a) => s + (a.sent_today ?? 0), 0);
  const totalLimit  = accounts.reduce((s, a) => s + (a.daily_limit ?? 0), 0);
  const quotaPct    = totalLimit > 0 ? Math.min(Math.round(totalSent / totalLimit * 100), 100) : 0;
  const quotaColor  = quotaPct >= 90 ? "#ff6b7a" : quotaPct >= 70 ? "#ffc946" : "#2de897";

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {/* Full-screen form overlay — sits above the list, never clipped by bottom nav */}
      {showForm && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "#07090f", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "24px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)" }}>
            <AddAccountForm onDone={() => { setShowForm(false); load(); }} />
          </div>
        </div>
      )}
      {/* Bulk import overlay */}
      {showBulk && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "#07090f", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <BulkImportPanel onDone={() => { setShowBulk(false); load(); }} />
        </div>
      )}

    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14, paddingLeft: 14, paddingRight: 14, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onClose && (
              <div onClick={() => { haptic.light(); onClose(); }} style={{ cursor: "pointer", color: TG.muted, padding: 4 }}>
                <X size={18} />
              </div>
            )}
            <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>{t.nav.accounts}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {onManualAccounts && (
              <GlassCard style={{ padding: "8px 10px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.light(); onManualAccounts(); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 14 }}>📖</span>
                  <span style={{ fontSize: 11, color: "#00d4ff", fontWeight: 700 }}>Гайд</span>
                </div>
              </GlassCard>
            )}
            <GlassCard
              style={{ padding: "8px 10px", borderRadius: 14, cursor: "pointer" }}
              onClick={async () => { haptic.medium(); try { await api.resetDailyCounts(); haptic.success(); load(); } catch { haptic.error(); } }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <RotateCcw size={13} color={TG.muted} />
                <span style={{ fontSize: 11, color: TG.muted, fontWeight: 600 }}>Сброс</span>
              </div>
            </GlassCard>
            <GlassCard style={{ padding: "8px 10px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.medium(); setShowBulk(s => !s); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14 }}>📦</span>
                <span style={{ fontSize: 11, color: "#2de897", fontWeight: 700 }}>Bulk</span>
              </div>
            </GlassCard>
            <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => { haptic.medium(); setShowForm(s => !s); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} color="#ff7eb3" />
                <span style={{ fontSize: 12, color: "#ff7eb3", fontWeight: 700 }}>Додати</span>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Summary 4-col */}
        {!loading && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: t.audience.total,       value: String(accounts.length),       color: TG.text },
              { label: t.dashboard.alive,      value: String(active),                color: "#2de897" },
              { label: t.accounts.authorized,  value: String(authed),                color: "#6ba8e5" },
              { label: t.common.today,         value: totalSent.toLocaleString(lang === "ua" ? "uk-UA" : lang), color: "#ffc946" },
            ].map(s => (
              <GlassCard key={s.label} style={{ padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 8, color: TG.muted, marginTop: 2 }}>{s.label}</div>
              </GlassCard>
            ))}
          </div>
          {totalLimit > 0 && (
            <GlassCard style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TG.muted }}>Общая квота за сегодня</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: quotaColor }}>{totalSent.toLocaleString("uk-UA")} / {totalLimit.toLocaleString("uk-UA")} · {quotaPct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${quotaPct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${quotaColor}, ${quotaColor}99)`, boxShadow: `0 0 6px ${quotaColor}66`, transition: "width 0.6s ease" }} />
              </div>
            </GlassCard>
          )}
          </>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${TG.green}40`, borderTopColor: TG.green, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
          </div>
        ) : accounts.length === 0 ? (
          <GlassCard style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: TG.muted, marginBottom: 12 }}>{t.accounts.noAccounts}</div>
            <div onClick={() => { haptic.medium(); setShowForm(true); }} style={{ fontSize: 13, color: "#ff7eb3", fontWeight: 700, cursor: "pointer" }}>
              + {t.accounts.noAccountsHint}
            </div>
          </GlassCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {accounts.map(a => <AccountCard key={a.id} acc={a} onRefresh={load} />)}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
