import { useState, useRef, useCallback } from "react";
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
  { id: 7, icon: "💾", en: "Save & add to CRM",               ua: "Збереження в CRM" },
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
  const [showCountry,   setShowCountry]   = useState(false);

  const [runState,      setRunState]      = useState<RunState>("idle");
  const [steps,         setSteps]         = useState<StepState[]>(initSteps());
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [pollMsg,       setPollMsg]       = useState<string | null>(null);

  // Batch tracking
  const [batchTotal,     setBatchTotal]     = useState(0);
  const [batchCurrent,   setBatchCurrent]   = useState(0);
  const [batchSucceeded, setBatchSucceeded] = useState(0);
  const [batchFailed,    setBatchFailed]    = useState(0);
  const [batchDelayMsg,  setBatchDelayMsg]  = useState<string | null>(null);
  const [donePhones,     setDonePhones]     = useState<string[]>([]);
  const [batchDone,      setBatchDone]      = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const updateStep = useCallback((idx: number, patch: Partial<StepState>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }, []);

  const selectedCountryLabel = COUNTRIES.find(c => c.code === country)?.label ?? country;

  async function launch() {
    const countryId = country === "custom" ? customCountry.trim() : country;
    if (!smsKey || !countryId || !proxy || !twoFa) {
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

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/factory/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          smspool_api_key: smsKey,
          country_id: countryId,
          proxy_string: proxy,
          two_factor_password: twoFa,
          quantity,
          ...(apiId   ? { api_id: parseInt(apiId) }   : {}),
          ...(apiHash ? { api_hash: apiHash }           : {}),
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
          } else if (event === "batch_reset") {
            setSteps(initSteps());
            setPollMsg(null);
            setErrorMsg(null);
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

      <div style={{ padding: "20px 18px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Config form ── */}
        {runState === "idle" && (
          <>
            <LabelledInput
              label={L("SMSPool API Key", "API-ключ SMSPool")}
              value={smsKey}
              onChange={setSmsKey}
              placeholder="your-smspool-api-key"
              type="password"
              hint={L("Get your key at smspool.net/profile", "Отримайте ключ на smspool.net/profile")}
            />

            {/* Country */}
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                {L("Country", "Країна")}
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
            </div>

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
