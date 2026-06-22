import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, ChevronDown, Loader, Minus, Plus } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { getStoredSecret } from "./LockScreen";

function authHeaders(): Record<string, string> {
  const s = getStoredSecret();
  return s ? { Authorization: `Bearer ${s}` } : {};
}

const ACCENT  = "#f59e0b";
const GREEN   = "#2de897";
const RED     = "#ff6b7a";
const BLUE    = "#3b82f6";
const GLASS   = "rgba(255,255,255,0.055)";
const GLASS2  = "rgba(255,255,255,0.09)";
const BORDER  = "rgba(255,255,255,0.10)";
const BORDER2 = "rgba(255,255,255,0.16)";
const BG      = "#07090f";

const COUNTRIES = [
  { code: "ua", label: "🇺🇦 Ukraine" },
  { code: "kz", label: "🇰🇿 Kazakhstan" },
  { code: "ee", label: "🇪🇪 Estonia" },
  { code: "lt", label: "🇱🇹 Lithuania" },
  { code: "lv", label: "🇱🇻 Latvia" },
  { code: "pl", label: "🇵🇱 Poland" },
  { code: "de", label: "🇩🇪 Germany" },
  { code: "gb", label: "🇬🇧 United Kingdom" },
  { code: "us", label: "🇺🇸 USA" },
  { code: "in", label: "🇮🇳 India" },
  { code: "id", label: "🇮🇩 Indonesia" },
  { code: "vn", label: "🇻🇳 Vietnam" },
  { code: "ph", label: "🇵🇭 Philippines" },
  { code: "custom", label: "✏️ Custom ID…" },
];

const STEP_DEFS = [
  { id: 1, icon: "🛒", en: "Purchase number from SMSPool",    ua: "Купівля номера в SMSPool" },
  { id: 2, icon: "📡", en: "Initialize proxy tunnel",         ua: "Ініціалізація проксі-тунелю" },
  { id: 3, icon: "💬", en: "Request Telegram code",           ua: "Запит коду Telegram" },
  { id: 4, icon: "⏳", en: "Waiting for SMS code",            ua: "Очікування SMS-коду" },
  { id: 5, icon: "🤝", en: "Telegram account handshake",      ua: "Рукостискання з Telegram" },
  { id: 6, icon: "🔒", en: "Enable 2FA security",             ua: "Активація 2FA-захисту" },
  { id: 7, icon: "🪪", en: "Profile setup & warming",         ua: "Профіль та прогрівання" },
  { id: 8, icon: "💾", en: "Save & add to CRM",               ua: "Збереження в CRM" },
];

type StepStatus = "waiting" | "running" | "done" | "error";
interface StepState { status: StepStatus; message?: string }
type RunState = "idle" | "running" | "done" | "error";

function LabelledInput({
  label, value, onChange, placeholder, type = "text", hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: GLASS2, border: `1px solid ${BORDER2}`,
          borderRadius: 12, padding: "11px 14px",
          fontSize: 13, color: "rgba(226,232,255,0.9)",
          fontFamily: "inherit", outline: "none",
        }}
      />
      {hint && (
        <div style={{ fontSize: 10, color: "rgba(160,180,230,0.4)", marginTop: 4, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function StepRow({ def, state, lang }: {
  def: typeof STEP_DEFS[0];
  state: StepState;
  lang: string;
}) {
  const label = lang === "ua" ? def.ua : def.en;
  const isRunning = state.status === "running";
  const isDone    = state.status === "done";
  const isError   = state.status === "error";
  const isWaiting = state.status === "waiting";
  const dotColor  = isRunning ? ACCENT : isDone ? GREEN : isError ? RED : "rgba(255,255,255,0.15)";
  const labelColor = isRunning ? "rgba(255,255,255,0.9)" : isDone ? "rgba(255,255,255,0.7)"
    : isError ? RED : "rgba(255,255,255,0.28)";

  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "10px 14px", borderRadius: 14,
      background: isRunning ? `${ACCENT}0a` : isDone ? `${GREEN}07` : isError ? `${RED}0a` : "transparent",
      border: `1px solid ${isRunning ? `${ACCENT}25` : isDone ? `${GREEN}18` : isError ? `${RED}25` : "transparent"}`,
      transition: "all 0.3s ease",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: isDone ? `${GREEN}20` : isError ? `${RED}20` : isRunning ? `${ACCENT}20` : GLASS,
        border: `1.5px solid ${dotColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isDone || isError ? 13 : 14, marginTop: 1,
        boxShadow: isRunning ? `0 0 12px ${ACCENT}40` : "none",
        transition: "all 0.3s ease",
      }}>
        {isDone ? "✓" : isError ? "✕" : isWaiting ? (
          <span style={{ fontSize: 10, opacity: 0.4 }}>{def.id}</span>
        ) : (
          isRunning ? (
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              border: `1.5px solid ${ACCENT}44`, borderTopColor: ACCENT,
              animation: "spin 0.8s linear infinite",
            }} />
          ) : def.icon
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: isRunning ? 700 : 600, color: labelColor, transition: "color 0.3s" }}>
          {label}
        </div>
        {state.message && (
          <div style={{
            fontSize: 11, color: isError ? "rgba(255,107,122,0.8)" : "rgba(160,200,180,0.65)",
            marginTop: 3, lineHeight: 1.4,
          }}>
            {state.message}
          </div>
        )}
      </div>
    </div>
  );
}

const initSteps = (): StepState[] => STEP_DEFS.map(() => ({ status: "waiting" as StepStatus }));

export function AccountFactoryPanel({ onDone }: { onDone: () => void }) {
  const { lang } = useI18n();
  const L = (en: string, ua: string) => lang === "ua" ? ua : en;

  const [smsKey,        setSmsKey]        = useState("");
  const [country,       setCountry]       = useState("ua");
  const [customCountry, setCustomCountry] = useState("");
  const [proxy,         setProxy]         = useState("");
  const [twoFa,         setTwoFa]         = useState("");
  const [apiId,         setApiId]         = useState("");
  const [apiHash,       setApiHash]       = useState("");
  const [quantity,      setQuantity]      = useState(1);
  const [showCountry,     setShowCountry]     = useState(false);
  const [smsPoolCountryId, setSmsPoolCountryId] = useState("");

  // Per-country Telegram service stock (real-time from SMSPool)
  const [svcStock, setSvcStock] = useState<{
    loading: boolean;
    available: boolean | null;
    stock: number;
    price: number;
    error: string | null;
  }>({ loading: false, available: null, stock: 0, price: 0, error: null });

  // Server-side SMSPOOL_API_KEY detection
  const [serverHasKey,  setServerHasKey]  = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/factory/config", { headers: authHeaders() })
      .then(r => r.json())
      .then((d: { has_smspool_key?: boolean }) => setServerHasKey(d.has_smspool_key ?? false))
      .catch(() => setServerHasKey(false));
  }, []);

  // Profile Setup state
  // Warmup mode selector
  const [warmupMode,    setWarmupMode]    = useState<"none" | "all" | "ask">("all");
  // Popup for "ask" mode — shown when backend emits warmup_prompt
  const [warmupPrompt,  setWarmupPrompt]  = useState<{ accountId: number; phone: string } | null>(null);
  // Popup shown on SMS timeout — ask to retry with a fresh number from the same country
  const [smsRetryPrompt, setSmsRetryPrompt] = useState(false);

  const [profileMode,        setProfileMode]        = useState<"ai" | "manual">("ai");
  const [profFirstName,      setProfFirstName]      = useState("");
  const [profLastName,       setProfLastName]       = useState("");
  const [profBio,            setProfBio]            = useState("");
  const [profAvatars,        setProfAvatars]        = useState<string[]>([]);       // base64 payloads
  const [profAvatarPreviews, setProfAvatarPreviews] = useState<string[]>([]);       // data-URLs for display

  // Balance / connection test
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceData,    setBalanceData]    = useState<{
    balance: number | null;
    requests: number | null;
    success: number | null;
  } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const testConnection = useCallback(async (apiKey?: string) => {
    setBalanceLoading(true);
    setBalanceError(null);
    setBalanceData(null);
    try {
      const qs = apiKey ? `api_key=${encodeURIComponent(apiKey)}` : "";
      const resp = await fetch(`/api/factory/balance${qs ? "?" + qs : ""}`,
        { headers: authHeaders() });
      const json = await resp.json() as {
        balance?: number | null;
        requests?: number | null;
        success?: number | null;
        error?: string;
      };
      if (!resp.ok || json.error) {
        setBalanceError(json.error ?? `HTTP ${resp.status}`);
      } else {
        setBalanceData({
          balance:  json.balance  ?? null,
          requests: json.requests ?? null,
          success:  json.success  ?? null,
        });
      }
    } catch {
      setBalanceError(L("Connection failed", "Помилка з'єднання"));
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Derived: the actual SMSPool numeric country ID for service-stock lookups
  const effectiveSmsPoolId = useMemo(() =>
    smsPoolCountryId || (country === "custom" ? customCountry.trim() : ""),
    [smsPoolCountryId, country, customCountry]
  );

  // Auto-fetch per-country Telegram service stock whenever country changes
  useEffect(() => {
    if (!effectiveSmsPoolId) {
      setSvcStock({ loading: false, available: null, stock: 0, price: 0, error: null });
      return;
    }
    if (!serverHasKey && !smsKey.trim()) return;

    setSvcStock(s => ({ ...s, loading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ country: effectiveSmsPoolId, service: "907" });
        if (!serverHasKey && smsKey.trim()) qs.set("api_key", smsKey.trim());
        const resp = await fetch(`/api/factory/service-stock?${qs}`, { headers: authHeaders() });
        const json = await resp.json() as {
          available?: boolean; stock?: number; price?: number; error?: string;
        };
        if (!resp.ok || json.error) {
          setSvcStock({ loading: false, available: null, stock: 0, price: 0, error: json.error ?? `HTTP ${resp.status}` });
        } else {
          setSvcStock({ loading: false, available: json.available ?? false, stock: json.stock ?? 0, price: json.price ?? 0, error: null });
        }
      } catch (e) {
        setSvcStock({ loading: false, available: null, stock: 0, price: 0, error: String(e) });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [effectiveSmsPoolId, smsKey, serverHasKey]);

  // Stock checker
  const [showStock,    setShowStock]    = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError,   setStockError]   = useState<string | null>(null);
  const [stockData,    setStockData]    = useState<{ id: string; name: string; stock: number; price: number }[]>([]);
  const [stockCached,  setStockCached]  = useState(false);
  const [stockSearch,  setStockSearch]  = useState("");

  const [runState,        setRunState]        = useState<RunState>("idle");
  const [steps,           setSteps]           = useState<StepState[]>(initSteps());
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);
  const [pollMsg,         setPollMsg]         = useState<string | null>(null);
  const [preflightStatus, setPreflightStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [preflightMsg,    setPreflightMsg]    = useState<string | null>(null);

  // Batch tracking
  const [batchTotal,     setBatchTotal]     = useState(0);
  const [batchCurrent,   setBatchCurrent]   = useState(0);
  const [batchSucceeded, setBatchSucceeded] = useState(0);
  const [batchFailed,    setBatchFailed]    = useState(0);
  const [batchDelayMsg,  setBatchDelayMsg]  = useState<string | null>(null);
  const [donePhones,     setDonePhones]     = useState<string[]>([]);
  const [batchDone,      setBatchDone]      = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  async function fetchStock() {
    if (!serverHasKey && !smsKey.trim()) {
      setStockError(L("Enter your SMSPool API key first.", "Спочатку введіть API ключ SMSPool."));
      setShowStock(true);
      return;
    }
    setStockLoading(true);
    setStockError(null);
    setShowStock(true);
    setStockSearch("");
    try {
      const qs = serverHasKey
        ? "service=907"
        : `api_key=${encodeURIComponent(smsKey)}&service=907`;
      const resp = await fetch(
        `/api/factory/countries?${qs}`,
        { headers: authHeaders() },
      );
      const json = await resp.json() as { countries?: typeof stockData; error?: string; cached?: boolean };
      if (!resp.ok || json.error) {
        setStockError(json.error ?? `HTTP ${resp.status}`);
      } else {
        setStockData(json.countries ?? []);
        setStockCached(json.cached ?? false);
      }
    } catch (e) {
      setStockError(String(e));
    } finally {
      setStockLoading(false);
    }
  }

  function stockIndicator(n: number): string {
    return n > 50 ? "🟢" : n > 10 ? "🟡" : "🔴";
  }

  const updateStep = useCallback((idx: number, patch: Partial<StepState>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }, []);

  const selectedCountryLabel = COUNTRIES.find(c => c.code === country)?.label ?? country;

  async function launch() {
    const countryId = country === "custom" ? customCountry.trim() : country;
    if ((!serverHasKey && !smsKey) || !countryId || !proxy || !twoFa) {
      setErrorMsg(L("Fill in all required fields.", "Заповніть усі обов'язкові поля."));
      return;
    }

    setRunState("running");
    setErrorMsg(null);
    setDonePhones([]);
    setBatchDone(false);
    setPollMsg(null);
    setBatchDelayMsg(null);
    setBatchTotal(0);
    setBatchCurrent(0);
    setBatchSucceeded(0);
    setBatchFailed(0);
    setSteps(initSteps());
    setPreflightStatus("idle");
    setPreflightMsg(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/factory/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ...(serverHasKey ? {} : { smspool_api_key: smsKey }),
          country_id: countryId,
          proxy_string: proxy,
          two_factor_password: twoFa,
          quantity,
          ...(apiId   ? { api_id: parseInt(apiId) }   : {}),
          ...(apiHash ? { api_hash: apiHash }           : {}),
          profile_mode: profileMode,
          warmup_mode: warmupMode,
          ...(profileMode === "manual" ? {
            first_name: profFirstName,
            last_name:  profLastName,
            bio:        profBio,
            avatars:    profAvatars,
          } : {}),
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        let errText = `HTTP ${resp.status}`;
        try { const j = await resp.json(); errText = j.error || errText; } catch {}
        setErrorMsg(errText);
        setRunState("error");
        return;
      }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          let event = "message";
          let data  = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: "))  data  = line.slice(6).trim();
          }
          if (!data) continue;

          let p: Record<string, unknown>;
          try { p = JSON.parse(data); } catch { continue; }

          if (event === "batch_start") {
            setBatchTotal(p.total as number);
          } else if (event === "batch_progress") {
            setBatchCurrent(p.current as number);
            setBatchTotal(p.total as number);
            setBatchSucceeded(p.succeeded as number);
            setBatchFailed(p.failed as number);
            setBatchDelayMsg(null);
          } else if (event === "preflight") {
            setPreflightStatus(p.status as "running" | "done" | "error");
            setPreflightMsg(p.message as string ?? null);
          } else if (event === "batch_reset") {
            setSteps(initSteps());
            setPollMsg(null);
            setErrorMsg(null);
            setPreflightStatus("idle");
            setPreflightMsg(null);
          } else if (event === "batch_delay") {
            setBatchDelayMsg(p.message as string);
          } else if (event === "batch_done") {
            setBatchTotal(p.total as number);
            setBatchSucceeded(p.succeeded as number);
            setBatchFailed(p.failed as number);
            setBatchDone(true);
            setRunState("done");
            setBatchDelayMsg(null);
          } else if (event === "step") {
            const stepIdx = (p.step as number) - 1;
            updateStep(stepIdx, {
              status:  p.status as StepStatus,
              message: (p.message as string) || undefined,
            });
            if (p.status === "running") { setPollMsg(null); setBatchDelayMsg(null); }
          } else if (event === "poll") {
            setPollMsg(p.message as string);
          } else if (event === "complete") {
            setDonePhones(prev => [...prev, p.phone as string]);
            if (quantity === 1) {
              setRunState("done");
              setPollMsg(null);
              setBatchDelayMsg(null);
            }
          } else if (event === "warmup_queued") {
            // auto-warmup already queued — nothing extra needed in UI
          } else if (event === "warmup_prompt") {
            // "ask" mode — show the decision popup
            setWarmupPrompt({
              accountId: p.account_id as number,
              phone:     p.phone     as string,
            });
          } else if (event === "sms_retry_prompt") {
            // SMS timeout — show "try fresh number?" popup; stream closes after this
            setSmsRetryPrompt(true);
            setRunState("idle");
            setPollMsg(null);
            setBatchDelayMsg(null);
          } else if (event === "error") {
            setErrorMsg(p.message as string);
            if (quantity === 1) {
              setRunState("error");
              setPollMsg(null);
            }
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        setErrorMsg(String(e));
        setRunState("error");
      }
    }
  }

  function abort() {
    abortRef.current?.abort();
    setRunState("idle");
    setSteps(initSteps());
    setPollMsg(null);
    setBatchDelayMsg(null);
    setWarmupPrompt(null);
    setSmsRetryPrompt(false);
  }

  function reset() {
    setRunState("idle");
    setErrorMsg(null);
    setDonePhones([]);
    setBatchDone(false);
    setPollMsg(null);
    setBatchDelayMsg(null);
    setSteps(initSteps());
    setBatchTotal(0);
    setBatchCurrent(0);
    setPreflightStatus("idle");
    setPreflightMsg(null);
    setWarmupPrompt(null);
    setSmsRetryPrompt(false);
  }

  function handleSmsRetry(yes: boolean) {
    setSmsRetryPrompt(false);
    if (yes) {
      void launch();
    }
  }

  async function handleWarmupDecision(accountId: number, yes: boolean) {
    setWarmupPrompt(null);
    if (!yes) return;
    try {
      await fetch(`/api/factory/warmup/${accountId}/start`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {
      // non-critical — user can manually trigger from Accounts tab
    }
  }

  const isBatch = quantity > 1;

  return (
    <div style={{
      position: "absolute", inset: 0, background: BG,
      display: "flex", flexDirection: "column", overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 18px 14px",
        borderBottom: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.025)",
        flexShrink: 0, position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}18)`,
            border: `1.5px solid ${ACCENT}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: `0 0 20px ${ACCENT}25`,
          }}>🏭</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
              {L("Account Factory", "Фабрика акаунтів")}
            </div>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.45)", marginTop: 1 }}>
              {L("Automated Telegram account registration", "Автоматична реєстрація акаунтів Telegram")}
            </div>
          </div>
          <button
            onClick={runState === "running" ? abort : onDone}
            style={{
              background: GLASS2, border: `1px solid ${BORDER2}`,
              borderRadius: 10, padding: "7px 10px",
              color: "rgba(255,255,255,0.55)", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── SMS Retry Prompt Popup ──────────────────────────────────────── */}
      {smsRetryPrompt && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px",
        }}>
          <div style={{
            background: "rgba(12,15,26,0.98)",
            border: "1px solid rgba(255,107,122,0.4)",
            borderRadius: 22, padding: "28px 24px", maxWidth: 360, width: "100%",
            boxShadow: "0 0 56px rgba(255,107,122,0.2)",
          }}>
            <div style={{ fontSize: 44, textAlign: "center", marginBottom: 14 }}>📵</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 8 }}>
              {L("SMS Timeout", "Час очікування SMS вичерпано")}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.6, marginBottom: 6 }}>
              {L("No code received within 2 minutes.", "Код не отримано протягом 2 хвилин.")}
            </div>
            <div style={{
              background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.2)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 20, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {L("Country", "Країна")}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                {selectedCountryLabel}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,107,122,0.7)", marginTop: 4 }}>
                {L("A fresh number will be purchased from the same country",
                   "Новий номер буде куплений із тієї самої країни")}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
              {L(
                "Try registering with a brand new number from the same country?",
                "Спробувати реєстрацію з новим номером із тієї самої країни?"
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleSmsRetry(false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 13,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {L("Cancel", "Скасувати")}
              </button>
              <button
                onClick={() => handleSmsRetry(true)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 13,
                  background: "linear-gradient(135deg, rgba(255,107,122,0.35), rgba(255,107,122,0.2))",
                  border: "1px solid rgba(255,107,122,0.55)",
                  color: "#ff6b7a", fontSize: 13, fontWeight: 800, cursor: "pointer",
                }}
              >
                🔄 {L("Try Fresh Number", "Новий номер")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warmup Prompt Popup (ask mode) ─────────────────────────────── */}
      {warmupPrompt && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px",
        }}>
          <div style={{
            background: "rgba(15,18,30,0.98)", border: "1px solid rgba(255,180,0,0.35)",
            borderRadius: 22, padding: "28px 24px", maxWidth: 360, width: "100%",
            boxShadow: "0 0 48px rgba(255,180,0,0.18)",
          }}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 14 }}>🔥</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 8 }}>
              {L("Start Warmup?", "Запустити прогрів?")}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.6, marginBottom: 6 }}>
              {L("Account", "Акаунт")}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", textAlign: "center", marginBottom: 16 }}>
              {warmupPrompt.phone}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
              {L(
                "Run the 48-hour warmup? It sends organic messages to public groups to age the account and reduce ban risk.",
                "Запустити 48-годинний прогрів? Відправляє органічні повідомлення в публічні групи — старить акаунт та знижує ризик бану."
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => void handleWarmupDecision(warmupPrompt.accountId, false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 13,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {L("Skip", "Пропустити")}
              </button>
              <button
                onClick={() => void handleWarmupDecision(warmupPrompt.accountId, true)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 13,
                  background: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.2))",
                  border: "1px solid rgba(245,158,11,0.55)",
                  color: "#f59e0b", fontSize: 13, fontWeight: 800, cursor: "pointer",
                }}
              >
                🔥 {L("Start Warmup", "Почати прогрів")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "20px 18px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Warmup Mode Selector — first card in form ── */}
        {runState === "idle" && (
          <div style={{
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.28)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
              <div style={{ fontSize: 18 }}>🔥</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
                  {L("48-Hour Warmup Mode", "Режим 48-годинного прогріву")}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  {L("Choose warmup behaviour for newly created accounts", "Оберіть режим прогріву для нових акаунтів")}
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
              {([
                {
                  key: "none" as const,
                  icon: "🚫",
                  label: L("No Warmup", "Без прогріву"),
                  desc:  L("Skip warmup entirely. Account goes straight to active status.", "Пропустити прогрів. Акаунт одразу стає активним."),
                  color: "#ff6b7a",
                },
                {
                  key: "all" as const,
                  icon: "🔥",
                  label: L("Warmup All", "Прогріти всі"),
                  desc:  L("Auto-queue 48h warmup for every account after creation.", "Авто-черга 48-год прогріву для кожного акаунта після реєстрації."),
                  color: "#f59e0b",
                },
                {
                  key: "ask" as const,
                  icon: "❓",
                  label: L("Ask Per Account", "Питати для кожного"),
                  desc:  L("Show a popup after each account is created — decide individually.", "Показати попап після кожного акаунта — вирішувати індивідуально."),
                  color: "#3b82f6",
                },
              ] as const).map(opt => (
                <button key={opt.key} onClick={() => setWarmupMode(opt.key)} style={{
                  display: "flex", alignItems: "center", gap: 11,
                  background: warmupMode === opt.key ? `${opt.color}18` : "rgba(255,255,255,0.03)",
                  border: warmupMode === opt.key ? `1.5px solid ${opt.color}55` : "1.5px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "10px 13px", cursor: "pointer",
                  textAlign: "left", transition: "all .15s",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: warmupMode === opt.key ? `${opt.color}22` : "rgba(255,255,255,0.05)",
                    border: warmupMode === opt.key ? `1.5px solid ${opt.color}44` : "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                  }}>{opt.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700,
                      color: warmupMode === opt.key ? opt.color : "rgba(255,255,255,0.7)",
                      marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: warmupMode === opt.key ? `2px solid ${opt.color}` : "2px solid rgba(255,255,255,0.18)",
                    background: warmupMode === opt.key ? opt.color : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#000",
                  }}>
                    {warmupMode === opt.key && "✓"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Config form ── */}
        {runState === "idle" && (
          <>
            {serverHasKey ? (
              <div style={{ background: "rgba(45,232,151,0.06)", border: "1px solid rgba(45,232,151,0.22)",
                borderRadius: 14, overflow: "hidden" }}>
                {/* Key header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>🔑</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                      {L("Server API Key Active", "Серверний API ключ активний")}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.4 }}>
                      {L("SMSPOOL_API_KEY configured on the server.",
                         "SMSPOOL_API_KEY налаштовано на сервері.")}
                    </div>
                  </div>
                  <button
                    onClick={() => void testConnection()}
                    disabled={balanceLoading}
                    style={{
                      flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                      background: balanceData ? "rgba(45,232,151,0.15)" : GLASS2,
                      border: `1px solid ${balanceData ? "rgba(45,232,151,0.35)" : BORDER2}`,
                      borderRadius: 9, padding: "5px 11px",
                      fontSize: 11, fontWeight: 700,
                      color: balanceData ? GREEN : "rgba(255,255,255,0.6)",
                      cursor: balanceLoading ? "default" : "pointer",
                      transition: "all .18s",
                    }}
                  >
                    {balanceLoading
                      ? <><Loader size={11} style={{ animation: "spin 0.9s linear infinite" }} /> {L("Testing…", "Перевірка…")}</>
                      : balanceData
                        ? <>✓ {L("Connected", "З'єднано")}</>
                        : <>{L("Test Connection", "Перевірити")}</>}
                  </button>
                </div>

                {/* Balance result row */}
                {(balanceData || balanceError) && (
                  <div style={{
                    borderTop: "1px solid rgba(45,232,151,0.12)",
                    padding: "10px 14px",
                    background: balanceError ? "rgba(255,80,80,0.06)" : "rgba(45,232,151,0.04)",
                  }}>
                    {balanceError ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>⚠️</span>
                        <span style={{ fontSize: 11, color: "#ff6060" }}>{balanceError}</span>
                      </div>
                    ) : balanceData && (
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {balanceData.balance !== null && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: GREEN, lineHeight: 1 }}>
                              ${balanceData.balance?.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {L("Balance", "Баланс")}
                            </div>
                          </div>
                        )}
                        {balanceData.requests !== null && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>
                              {balanceData.requests}
                            </div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {L("Orders", "Замовлень")}
                            </div>
                          </div>
                        )}
                        {balanceData.success !== null && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>
                              {balanceData.success}
                            </div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {L("Success", "Успішних")}
                            </div>
                          </div>
                        )}
                        {balanceData.requests !== null && balanceData.success !== null && balanceData.requests > 0 && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,210,80,0.85)", lineHeight: 1 }}>
                              {Math.round((balanceData.success / balanceData.requests) * 100)}%
                            </div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {L("Rate", "Успіх")}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <LabelledInput
                label={L("SMSPool API Key", "API-ключ SMSPool")}
                value={smsKey}
                onChange={setSmsKey}
                placeholder="your-smspool-api-key"
                type="password"
                hint={L("Get your key at smspool.net/profile", "Отримайте ключ на smspool.net/profile")}
              />
            )}

            {/* Country */}
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {L("Country", "Країна")}
                </div>
                <button
                  onClick={() => void fetchStock()}
                  disabled={stockLoading}
                  title={L("Check real-time availability & price from SMSPool", "Перевірити доступність та ціну в SMSPool")}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: showStock ? `${ACCENT}20` : GLASS2,
                    border: `1px solid ${showStock ? `${ACCENT}55` : BORDER2}`,
                    borderRadius: 8, padding: "4px 10px", cursor: stockLoading ? "default" : "pointer",
                    fontSize: 11, color: showStock ? ACCENT : "rgba(255,255,255,0.5)",
                    fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s",
                  }}
                >
                  {stockLoading ? (
                    <div style={{ width: 10, height: 10, borderRadius: "50%",
                      border: `1.5px solid ${ACCENT}44`, borderTopColor: ACCENT,
                      animation: "spin 0.8s linear infinite" }} />
                  ) : "📊"}
                  {L("Check Stock", "Наявність")}
                </button>
              </div>
              <button
                onClick={() => setShowCountry(v => !v)}
                style={{
                  width: "100%", background: GLASS2, border: `1px solid ${BORDER2}`,
                  borderRadius: 12, padding: "11px 14px", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", color: "rgba(226,232,255,0.9)", fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                <span>{selectedCountryLabel}</span>
                <ChevronDown size={14} color="rgba(160,180,230,0.4)" />
              </button>
              {showCountry && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "rgba(10,14,26,0.98)", border: `1px solid ${BORDER2}`,
                  borderRadius: 14, zIndex: 50, overflow: "hidden",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                  maxHeight: 260, overflowY: "auto",
                }}>
                  {COUNTRIES.map(c => (
                    <div
                      key={c.code}
                      onClick={() => { setCountry(c.code); setShowCountry(false); }}
                      style={{
                        padding: "11px 16px", fontSize: 13,
                        color: country === c.code ? ACCENT : "rgba(226,232,255,0.8)",
                        cursor: "pointer", fontWeight: country === c.code ? 700 : 400,
                        background: country === c.code ? `${ACCENT}10` : "transparent",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
              {country === "custom" && (
                <input
                  value={customCountry}
                  onChange={e => setCustomCountry(e.target.value)}
                  placeholder={L("e.g. 22 or kz", "напр. 22 або kz")}
                  style={{
                    marginTop: 8, width: "100%", boxSizing: "border-box",
                    background: GLASS2, border: `1px solid ${BORDER2}`,
                    borderRadius: 12, padding: "10px 14px",
                    fontSize: 13, color: "rgba(226,232,255,0.9)",
                    fontFamily: "inherit", outline: "none",
                  }}
                />
              )}

              {/* ── Stock panel ── */}
              {showStock && (
                <div style={{
                  marginTop: 10,
                  background: "rgba(7,9,20,0.97)", border: `1px solid ${BORDER2}`,
                  borderRadius: 16, overflow: "hidden",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
                }}>
                  {/* Panel header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderBottom: `1px solid ${BORDER}`,
                    background: "rgba(255,255,255,0.025)",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT,
                      textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      📊 {L("Live SMSPool Availability", "Наявність SMSPool в реальному часі")}
                      {stockCached && (
                        <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 6, fontWeight: 400 }}>
                          ({L("cached", "кеш")})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowStock(false)}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.4)", fontSize: 16, lineHeight: 1 }}>
                      ✕
                    </button>
                  </div>

                  {stockLoading && (
                    <div style={{ padding: "20px", textAlign: "center",
                      color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      {L("Loading…", "Завантаження…")}
                    </div>
                  )}

                  {stockError && (
                    <div style={{ padding: "14px 16px", fontSize: 12,
                      color: "rgba(255,150,150,0.85)", lineHeight: 1.5 }}>
                      ⚠️ {stockError}
                    </div>
                  )}

                  {!stockLoading && !stockError && stockData.length > 0 && (
                    <>
                      {/* Search */}
                      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}` }}>
                        <input
                          value={stockSearch}
                          onChange={e => setStockSearch(e.target.value)}
                          placeholder={L("Filter countries…", "Фільтр країн…")}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: GLASS2, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "7px 12px",
                            fontSize: 12, color: "rgba(226,232,255,0.85)",
                            fontFamily: "inherit", outline: "none",
                          }}
                        />
                      </div>
                      {/* Info */}
                      <div style={{
                        padding: "5px 14px",
                        borderBottom: `1px solid ${BORDER}`,
                        fontSize: 10, color: "rgba(255,255,255,0.32)",
                      }}>
                        {L("Select a country to check Telegram stock", "Оберіть країну для перевірки наявності Telegram")}
                      </div>
                      {/* Rows */}
                      <div style={{ maxHeight: 240, overflowY: "auto" }}>
                        {stockData
                          .filter(c =>
                            !stockSearch.trim() ||
                            c.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                            c.id.toLowerCase().includes(stockSearch.toLowerCase())
                          )
                          .slice(0, 60)
                          .map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                // Try to match against known countries; else use custom
                                const known = COUNTRIES.find(
                                  k => k.code.toLowerCase() === c.id.toLowerCase() ||
                                       k.label.toLowerCase().includes(c.name.toLowerCase())
                                );
                                if (known) {
                                  setCountry(known.code);
                                } else {
                                  setCountry("custom");
                                  setCustomCountry(c.id);
                                }
                                setSmsPoolCountryId(c.id);
                                setShowStock(false);
                              }}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "9px 14px", cursor: "pointer",
                                borderBottom: `1px solid ${BORDER}`,
                                background: country === c.id || customCountry === c.id
                                  ? `${ACCENT}10` : "transparent",
                                transition: "background 0.15s",
                              }}
                            >
                              <span style={{ fontSize: 14, flexShrink: 0 }}>🌐</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600,
                                  color: "rgba(226,232,255,0.88)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.name}
                                </div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                                  ID: {c.id}
                                </div>
                              </div>
                              <div style={{
                                flexShrink: 0, fontSize: 10, color: "rgba(255,255,255,0.28)",
                                fontWeight: 500,
                              }}>
                                {L("Select →", "Обрати →")}
                              </div>
                            </div>
                          ))
                        }
                        {stockData.filter(c =>
                          !stockSearch.trim() ||
                          c.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                          c.id.toLowerCase().includes(stockSearch.toLowerCase())
                        ).length === 0 && (
                          <div style={{ padding: "14px", textAlign: "center",
                            fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                            {L("No matches", "Немає збігів")}
                          </div>
                        )}
                      </div>
                      {/* Refresh */}
                      <div style={{ padding: "8px 14px", borderTop: `1px solid ${BORDER}`,
                        display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => void fetchStock()}
                          style={{ background: GLASS2, border: `1px solid ${BORDER2}`,
                            borderRadius: 8, padding: "5px 12px",
                            fontSize: 11, color: "rgba(255,255,255,0.55)",
                            cursor: "pointer", fontFamily: "inherit" }}>
                          {L("🔄 Refresh", "🔄 Оновити")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Per-country Telegram service stock badge ── */}
            {effectiveSmsPoolId && (serverHasKey || smsKey.trim()) && (
              <div style={{
                borderRadius: 12, overflow: "hidden",
                border: svcStock.loading
                  ? `1px solid ${BORDER2}`
                  : svcStock.error
                    ? "1px solid rgba(255,107,122,0.3)"
                    : svcStock.available === false
                      ? "1px solid rgba(255,107,122,0.3)"
                      : svcStock.available && svcStock.stock > 50
                        ? "1px solid rgba(45,232,151,0.35)"
                        : svcStock.available && svcStock.stock > 10
                          ? `1px solid ${ACCENT}55`
                          : svcStock.available
                            ? "1px solid rgba(255,107,122,0.35)"
                            : `1px solid ${BORDER2}`,
                background: svcStock.loading
                  ? GLASS
                  : svcStock.error || svcStock.available === false
                    ? "rgba(255,107,122,0.05)"
                    : svcStock.available && svcStock.stock > 10
                      ? "rgba(45,232,151,0.04)"
                      : "rgba(245,158,11,0.05)",
                transition: "all 0.3s",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                }}>
                  {/* Icon */}
                  <div style={{ fontSize: 16, flexShrink: 0 }}>
                    {svcStock.loading ? (
                      <div style={{ width: 16, height: 16, borderRadius: "50%",
                        border: `2px solid ${ACCENT}44`, borderTopColor: ACCENT,
                        animation: "spin 0.8s linear infinite" }} />
                    ) : svcStock.error
                      ? "⚠️"
                      : svcStock.available === false
                        ? "❌"
                        : svcStock.stock > 50 ? "🟢"
                        : svcStock.stock > 10 ? "🟡"
                        : "🔴"}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: svcStock.loading
                        ? "rgba(255,255,255,0.5)"
                        : svcStock.error || svcStock.available === false
                          ? RED
                          : svcStock.stock > 10 ? GREEN : ACCENT,
                    }}>
                      {svcStock.loading
                        ? L("Checking Telegram stock…", "Перевірка наявності Telegram…")
                        : svcStock.error
                          ? svcStock.error
                          : svcStock.available === false
                            ? L("Telegram numbers unavailable for this country", "Telegram номери недоступні для цієї країни")
                            : L(
                                `Telegram numbers available · ${svcStock.stock}% success rate`,
                                `Telegram номери доступні · ${svcStock.stock}% успішних SMS`
                              )}
                    </div>
                    {!svcStock.loading && !svcStock.error && svcStock.available && (
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
                        {L("Real-time SMSPool data · Telegram service 907", "Дані SMSPool в реальному часі · сервіс Telegram 907")}
                      </div>
                    )}
                  </div>

                  {/* Price badge */}
                  {!svcStock.loading && !svcStock.error && svcStock.available && (
                    <div style={{
                      flexShrink: 0,
                      background: svcStock.price < 0.3
                        ? `${GREEN}18` : svcStock.price < 0.7
                          ? `${ACCENT}18` : "rgba(255,107,122,0.12)",
                      border: `1px solid ${svcStock.price < 0.3
                        ? `${GREEN}44` : svcStock.price < 0.7
                          ? `${ACCENT}44` : "rgba(255,107,122,0.4)"}`,
                      borderRadius: 8, padding: "4px 10px",
                      fontSize: 13, fontWeight: 800,
                      color: svcStock.price < 0.3 ? GREEN : svcStock.price < 0.7 ? ACCENT : RED,
                    }}>
                      ${svcStock.price.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <LabelledInput
              label={L("Decodo SOCKS5 Proxy", "Проксі Decodo SOCKS5")}
              value={proxy}
              onChange={setProxy}
              placeholder="socks5://user:pass@ip:port"
              hint={L("Residential proxy for anti-ban protection", "Residential проксі для захисту від банів")}
            />

            <LabelledInput
              label={L("2FA Password", "Пароль 2FA")}
              value={twoFa}
              onChange={setTwoFa}
              placeholder={L("Strong password…", "Надійний пароль…")}
              type="password"
              hint={L("Applied immediately after account creation", "Встановлюється одразу після реєстрації")}
            />

            {/* Quantity stepper */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                {L("Quantity (Batch Mode)", "Кількість (пакетний режим)")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{
                    width: 40, height: 40, borderRadius: 12, background: GLASS2,
                    border: `1px solid ${BORDER2}`, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <Minus size={14} />
                </button>
                <div style={{
                  flex: 1, textAlign: "center",
                  background: GLASS2, border: `1px solid ${quantity > 1 ? `${ACCENT}55` : BORDER2}`,
                  borderRadius: 12, padding: "10px",
                  fontSize: 18, fontWeight: 800,
                  color: quantity > 1 ? ACCENT : "rgba(255,255,255,0.8)",
                  boxShadow: quantity > 1 ? `0 0 16px ${ACCENT}25` : "none",
                  transition: "all 0.2s",
                }}>
                  {quantity}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>
                    {L("account(s)", "акаунт(ів)")}
                  </span>
                </div>
                <button
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  style={{
                    width: 40, height: 40, borderRadius: 12, background: GLASS2,
                    border: `1px solid ${BORDER2}`, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
              {quantity > 1 && (
                <div style={{ fontSize: 10, color: "rgba(245,158,11,0.6)", marginTop: 6, lineHeight: 1.4 }}>
                  {L(
                    `Registers ${quantity} accounts sequentially with 12s cooldown between each. Stops on error.`,
                    `Реєструє ${quantity} акаунтів послідовно з 12с паузою між кожним. Зупиняється при помилці.`
                  )}
                </div>
              )}
            </div>

            {/* Telethon credentials */}
            <div style={{
              background: `${BLUE}0a`, border: `1px solid ${BLUE}22`,
              borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BLUE,
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                {L("Telegram API Credentials", "Облікові дані Telegram API")}
              </div>
              <div style={{ fontSize: 10, color: "rgba(160,180,230,0.5)", marginBottom: 10, lineHeight: 1.5 }}>
                {L(
                  "Leave blank if TELETHON_API_ID / TELETHON_API_HASH env vars are set. Get yours at my.telegram.org",
                  "Залиште порожнім, якщо змінні TELETHON_API_ID / TELETHON_API_HASH встановлені. Отримайте на my.telegram.org"
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <LabelledInput label="API ID" value={apiId} onChange={setApiId} placeholder="12345678" type="number" />
                </div>
                <div style={{ flex: 2 }}>
                  <LabelledInput label="API Hash" value={apiHash} onChange={setApiHash} placeholder="abc123…" />
                </div>
              </div>
            </div>

            {/* ─── Profile Setup & Warming ─────────────────────────────── */}
            <div style={{
              background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.22)",
              borderRadius: 16, overflow: "hidden",
            }}>
              {/* Header + mode toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderBottom: "1px solid rgba(168,85,247,0.12)" }}>
                <div style={{ fontSize: 18 }}>🪪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#c084fc" }}>
                    {L("Profile Setup & Warming", "Налаштування профілю")}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                    {L("Runs after registration — builds account credibility", "Після реєстрації — підвищує довіру")}
                  </div>
                </div>
                <div style={{ display: "flex", background: GLASS2,
                  border: `1px solid ${BORDER2}`, borderRadius: 10, padding: 2, gap: 2 }}>
                  {(["ai", "manual"] as const).map(m => (
                    <button key={m} onClick={() => setProfileMode(m)} style={{
                      padding: "5px 9px", borderRadius: 8,
                      background: profileMode === m ? "rgba(168,85,247,0.28)" : "transparent",
                      border: profileMode === m ? "1px solid rgba(168,85,247,0.5)" : "1px solid transparent",
                      color: profileMode === m ? "#c084fc" : "rgba(255,255,255,0.38)",
                      fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                    }}>
                      {m === "ai" ? `🤖 ${L("AI Auto", "AI Авто")}` : `✏️ ${L("Manual", "Вручну")}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI mode — info cards */}
              {profileMode === "ai" && (
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {([
                    { icon: "🤖", title: L("AI-generated Russian name", "AI-ім'я (рос. аудиторія)"),
                      desc: L("Cyrillic / Latinized / Nickname / Patriotic — weighted random per account",
                              "Кирилиця / транслітерація / нікнейм / патріотичний — зважена рандомізація") },
                    { icon: "📝", title: L("Bio — 35 % chance", "Біо — 35 % ймовірність"),
                      desc: L("Short Russian/English phrase; rest of accounts stay blank for organic look",
                              "Короткий рос./англ. вираз; решта акаунтів без біо для органічності") },
                    { icon: "📸", title: L("Avatar pool", "Пул аватарів"),
                      desc: L("Picks from assets/pending_avatars/ → moves to used_avatars/ (never reused)",
                              "Бере з assets/pending_avatars/ → переміщує в used_avatars/ (без повторів)") },
                  ] as const).map((row, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{row.icon}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.68)" }}>{row.title}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 2, lineHeight: 1.4 }}>{row.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual mode fields */}
              {profileMode === "manual" && (
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <LabelledInput label={L("First Name", "Ім'я")} value={profFirstName}
                        onChange={setProfFirstName} placeholder={L("Ivan", "Іван")} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <LabelledInput label={L("Last Name (opt.)", "Прізвище (необов.)")} value={profLastName}
                        onChange={setProfLastName} placeholder={L("Petrov", "Петров")} />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                      {L("Bio (optional)", "Статус (необов.)")}
                    </div>
                    <textarea
                      value={profBio} onChange={e => setProfBio(e.target.value)}
                      placeholder={L("Short bio…", "Короткий статус…")}
                      rows={2} maxLength={70}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: GLASS2, border: `1px solid ${BORDER2}`,
                        borderRadius: 12, padding: "10px 14px",
                        fontSize: 13, color: "rgba(226,232,255,0.9)",
                        fontFamily: "inherit", outline: "none", resize: "none",
                      }}
                    />
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3, textAlign: "right" }}>
                      {profBio.length}/70
                    </div>
                  </div>

                  {/* Multi-image uploader */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                      📸 {L("Profile Photos", "Фото профілю")}
                      <span style={{ fontWeight: 400, textTransform: "none",
                        color: "rgba(255,255,255,0.28)", marginLeft: 6 }}>
                        {L("(multiple = photo history)", "(декілька = історія фото)")}
                      </span>
                    </div>

                    {profAvatarPreviews.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        {profAvatarPreviews.map((src, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img src={src} alt="" style={{
                              width: 52, height: 52, borderRadius: 11, objectFit: "cover",
                              border: "1.5px solid rgba(168,85,247,0.4)",
                            }} />
                            <button
                              onClick={() => {
                                setProfAvatars(prev => prev.filter((_, j) => j !== i));
                                setProfAvatarPreviews(prev => prev.filter((_, j) => j !== i));
                              }}
                              style={{ position: "absolute", top: -5, right: -5,
                                width: 17, height: 17, borderRadius: "50%",
                                background: RED, border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 8, color: "#fff", lineHeight: 1 }}>✕</button>
                            {i === 0 && (
                              <div style={{ position: "absolute", bottom: -2, left: 0, right: 0,
                                textAlign: "center", fontSize: 8, color: "#c084fc", fontWeight: 700,
                                textShadow: "0 1px 3px #000" }}>
                                {L("main", "головне")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      background: GLASS2, border: "1.5px dashed rgba(168,85,247,0.38)",
                      borderRadius: 12, padding: "10px 16px", cursor: "pointer",
                      fontSize: 12, color: "rgba(255,255,255,0.45)",
                    }}>
                      <span style={{ fontSize: 18 }}>+</span>
                      {L("Add photos…", "Додати фото…")}
                      <input type="file" accept="image/*" multiple style={{ display: "none" }}
                        onChange={e => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          void Promise.all(files.map(f => new Promise<{ b64: string; preview: string }>(res => {
                            const r = new FileReader();
                            r.onload = () => {
                              const d = r.result as string;
                              res({ b64: d.split(",")[1] ?? "", preview: d });
                            };
                            r.readAsDataURL(f);
                          }))).then(results => {
                            setProfAvatars(prev => [...prev, ...results.map(r => r.b64)]);
                            setProfAvatarPreviews(prev => [...prev, ...results.map(r => r.preview)]);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {profAvatars.length > 1 && (
                      <div style={{ fontSize: 10, color: "rgba(168,85,247,0.65)", marginTop: 5, lineHeight: 1.4 }}>
                        💡 {L(
                          `${profAvatars.length} photos → uploaded in order, creating a real Telegram photo history.`,
                          `${profAvatars.length} фото → завантажуються по черзі, формуючи реальну історію фото.`
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div style={{
                background: "rgba(255,107,122,0.1)", border: "1px solid rgba(255,107,122,0.3)",
                borderRadius: 12, padding: "12px 14px",
                fontSize: 12, color: "rgba(255,180,180,0.9)", lineHeight: 1.5,
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              onClick={() => void launch()}
              style={{
                background: `linear-gradient(135deg, ${ACCENT}cc, #d97706cc)`,
                border: `1px solid ${ACCENT}88`,
                borderRadius: 16, padding: "16px",
                fontSize: 15, fontWeight: 800, color: "#fff",
                cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.02em",
                boxShadow: `0 0 28px ${ACCENT}40`,
              }}
            >
              {quantity > 1
                ? `🚀 ${L(`Launch Batch (${quantity} accounts)`, `Запустити пакет (${quantity} акаунтів)`)}`
                : `🚀 ${L("Launch Automated Registration", "Запустити автоматичну реєстрацію")}`
              }
            </button>
          </>
        )}

        {/* ── Live stepper ── */}
        {runState !== "idle" && (
          <>
            {/* ── Preflight proxy check banner ── */}
            {preflightStatus !== "idle" && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 16px", borderRadius: 14,
                background: preflightStatus === "done"
                  ? `${GREEN}0d`
                  : preflightStatus === "error"
                  ? "rgba(255,107,122,0.08)"
                  : `${ACCENT}0a`,
                border: `1px solid ${
                  preflightStatus === "done" ? `${GREEN}30`
                  : preflightStatus === "error" ? "rgba(255,107,122,0.30)"
                  : `${ACCENT}30`
                }`,
                transition: "all 0.3s ease",
              }}>
                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15,
                  background: preflightStatus === "done"
                    ? `${GREEN}20` : preflightStatus === "error"
                    ? "rgba(255,107,122,0.15)" : `${ACCENT}18`,
                  border: `1.5px solid ${
                    preflightStatus === "done" ? `${GREEN}55`
                    : preflightStatus === "error" ? "rgba(255,107,122,0.45)"
                    : `${ACCENT}55`
                  }`,
                  boxShadow: preflightStatus === "running" ? `0 0 12px ${ACCENT}30` : "none",
                }}>
                  {preflightStatus === "running" ? (
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%",
                      border: `2px solid ${ACCENT}44`, borderTopColor: ACCENT,
                      animation: "spin 0.8s linear infinite",
                    }} />
                  ) : preflightStatus === "done" ? "🔌" : "⚠️"}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: preflightStatus === "done" ? GREEN
                      : preflightStatus === "error" ? RED : ACCENT,
                    marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {preflightStatus === "running"
                      ? L("Proxy Pre-check", "Перевірка проксі")
                      : preflightStatus === "done"
                      ? L("Proxy OK", "Проксі OK")
                      : L("Proxy Failed", "Проксі не доступний")}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: preflightStatus === "done"
                      ? "rgba(45,232,151,0.8)"
                      : preflightStatus === "error"
                      ? "rgba(255,180,180,0.85)"
                      : "rgba(255,255,255,0.65)",
                    lineHeight: 1.45,
                  }}>
                    {preflightMsg ?? (L("Testing SOCKS5 tunnel to Telegram DC1…", "Тестування SOCKS5 тунелю до Telegram DC1…"))}
                  </div>
                </div>
              </div>
            )}

            {/* Batch progress banner */}
            {isBatch && batchTotal > 0 && !batchDone && (
              <div style={{
                background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`,
                borderRadius: 14, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>
                    {L(
                      `Account ${batchCurrent} of ${batchTotal}`,
                      `Акаунт ${batchCurrent} з ${batchTotal}`
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                    ✓ {batchSucceeded} &nbsp; ✕ {batchFailed}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: `linear-gradient(90deg, ${ACCENT}, #d97706)`,
                    width: `${((batchCurrent - 1) / batchTotal) * 100}%`,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            )}

            {/* Batch delay banner */}
            {batchDelayMsg && (
              <div style={{
                background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <Loader size={14} color={ACCENT} style={{ animation: "spin 1.2s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "rgba(245,158,11,0.8)" }}>{batchDelayMsg}</span>
              </div>
            )}

            {/* Batch done summary */}
            {batchDone && isBatch && (
              <div style={{
                background: `${GREEN}12`, border: `1px solid ${GREEN}40`,
                borderRadius: 16, padding: "16px 18px", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: GREEN, marginBottom: 4 }}>
                  {L(`Batch Complete!`, `Пакет завершено!`)}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                  {L(
                    `${batchSucceeded}/${batchTotal} accounts registered successfully`,
                    `${batchSucceeded}/${batchTotal} акаунтів успішно зареєстровано`
                  )}
                </div>
                {donePhones.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {donePhones.map(p => (
                      <div key={p} style={{
                        background: `${GREEN}20`, border: `1px solid ${GREEN}40`,
                        borderRadius: 8, padding: "4px 10px", fontSize: 11, color: GREEN,
                      }}>{p}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Single account done */}
            {runState === "done" && !isBatch && donePhones.length > 0 && (
              <div style={{
                background: `${GREEN}12`, border: `1px solid ${GREEN}40`,
                borderRadius: 16, padding: "16px 18px", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: GREEN, marginBottom: 4 }}>
                  {L("Account Created!", "Акаунт створено!")}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{donePhones[0]}</div>
                <div style={{ fontSize: 11, color: "rgba(160,200,180,0.55)", marginTop: 6 }}>
                  {L("Added to your CRM — go to Accounts tab.", "Додано у CRM — перейдіть на вкладку Акаунти.")}
                </div>
              </div>
            )}

            {/* Error banner */}
            {errorMsg && runState === "error" && (
              <div style={{
                background: "rgba(255,107,122,0.1)", border: "1px solid rgba(255,107,122,0.3)",
                borderRadius: 14, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 4 }}>
                  {L("Registration Failed", "Помилка реєстрації")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,180,180,0.85)", lineHeight: 1.5 }}>{errorMsg}</div>
              </div>
            )}

            {/* Steps */}
            <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px 6px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {runState === "running"
                    ? L("⚡ Registration in progress…", "⚡ Реєстрація виконується…")
                    : runState === "done"
                    ? L("✅ Complete", "✅ Завершено")
                    : L("❌ Stopped", "❌ Зупинено")}
                </div>
              </div>
              <div style={{ padding: "8px 6px" }}>
                {STEP_DEFS.map((def, i) => (
                  <StepRow key={def.id} def={def} state={steps[i]!} lang={lang} />
                ))}
              </div>
              {pollMsg && !batchDelayMsg && (
                <div style={{
                  padding: "10px 14px 12px", borderTop: `1px solid ${BORDER}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Loader size={12} color={ACCENT} style={{ animation: "spin 1.2s linear infinite", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(245,158,11,0.7)" }}>{pollMsg}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {runState === "running" && (
                <button
                  onClick={abort}
                  style={{
                    flex: 1, background: "rgba(255,107,122,0.12)",
                    border: "1px solid rgba(255,107,122,0.35)", borderRadius: 14,
                    padding: "13px", fontSize: 13, fontWeight: 700, color: RED,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {L("⏹ Abort", "⏹ Скасувати")}
                </button>
              )}
              {(runState === "done" || runState === "error") && (
                <>
                  <button
                    onClick={reset}
                    style={{
                      flex: 1, background: GLASS2, border: `1px solid ${BORDER2}`,
                      borderRadius: 14, padding: "13px",
                      fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {L("🔄 Register More", "🔄 Зареєструвати ще")}
                  </button>
                  <button
                    onClick={onDone}
                    style={{
                      flex: 1, background: `${GREEN}20`, border: `1px solid ${GREEN}40`,
                      borderRadius: 14, padding: "13px",
                      fontSize: 13, fontWeight: 700, color: GREEN,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {L("✓ Done", "✓ Готово")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
