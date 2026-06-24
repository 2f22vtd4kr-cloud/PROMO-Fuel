import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, ChevronDown, Loader, Minus, Plus, RefreshCw } from "lucide-react";
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

// ── Decodo proxy utilities ────────────────────────────────────────────────────

interface DecodoParsed {
  baseUser:    string;   // everything before "-country-XX"
  countryCode: string;   // lowercase 2-letter code
  password:    string;
  host:        string;
  port:        string;
}

/** Extract a socks5(h):// URL from a raw string (curl command, plain URL, etc.) */
function extractProxyUrl(raw: string): string {
  // strip surrounding whitespace/newlines
  const s = raw.trim();
  // match first socks5h?:// URL (possibly inside quotes)
  const m = s.match(/socks5h?:\/\/[^\s"']+/i);
  return m ? m[0]! : s;
}

/** Parse a Decodo-style proxy URL into its components. Returns null if not parseable. */
function parseDecodoProxy(raw: string): DecodoParsed | null {
  try {
    const url = extractProxyUrl(raw)
      .replace(/^socks5h:\/\//i, "socks5://"); // normalise socks5h → socks5
    // Must start with socks5://
    if (!/^socks5:\/\//i.test(url)) return null;

    // socks5://user:pass@host:port
    const rest = url.slice("socks5://".length);
    const atIdx = rest.lastIndexOf("@");
    if (atIdx === -1) return null;

    const userinfo = rest.slice(0, atIdx);
    const hostPort = rest.slice(atIdx + 1);

    // password may contain special chars; split on first ":"
    const colonIdx = userinfo.indexOf(":");
    if (colonIdx === -1) return null;
    const user     = userinfo.slice(0, colonIdx);
    const password = userinfo.slice(colonIdx + 1);

    // host:port
    const lastColon = hostPort.lastIndexOf(":");
    const host = lastColon >= 0 ? hostPort.slice(0, lastColon) : hostPort;
    const port = lastColon >= 0 ? hostPort.slice(lastColon + 1) : "7000";

    // Extract -country-XX from username
    const countryMatch = user.match(/-country-([a-z]{2})$/i);
    if (!countryMatch) return null;

    const countryCode = countryMatch[1]!.toLowerCase();
    const baseUser    = user.slice(0, user.length - `-country-${countryCode}`.length);

    return { baseUser, countryCode, password, host, port };
  } catch {
    return null;
  }
}

/** Rebuild a Decodo proxy URL for a different country code. */
function buildDecodoProxy(p: DecodoParsed, newCountryCode: string): string {
  const cc = newCountryCode.toLowerCase();
  return `socks5://${p.baseUser}-country-${cc}:${p.password}@${p.host}:${p.port}`;
}

// ── ProxyGenHelper ────────────────────────────────────────────────────────────
// Self-contained helper widget: paste a Decodo curl / proxy URL + pick a
// country code → get the ready-to-use socks5:// URL for that country.
function ProxyGenHelper({
  lang,
  L,
  initialValue,
  onApply,
}: {
  lang: string;
  L: (en: string, ua: string) => string;
  initialValue: string;
  onApply: (url: string) => void;
}) {
  const [rawInput,   setRawInput]   = useState(initialValue);
  const [countryCode, setCountryCode] = useState("");
  const [copied,     setCopied]     = useState(false);

  const parsed = useMemo(() => parseDecodoProxy(rawInput), [rawInput]);
  const generated = useMemo(() => {
    if (!parsed || !countryCode.trim()) return "";
    return buildDecodoProxy(parsed, countryCode.trim());
  }, [parsed, countryCode]);

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div style={{
      marginTop: 8,
      background: "rgba(7,9,20,0.98)",
      border: "1px solid rgba(255,200,50,0.3)",
      borderRadius: 14, padding: "14px 14px 12px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,200,50,0.6)",
        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
        🔧 {L("Decodo Proxy Builder", "Генератор проксі Decodo")}
      </div>

      {/* Step 1: paste curl or URL */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
          {L("1. Paste curl command or socks5h:// URL from Decodo", "1. Вставте curl-команду або socks5h:// URL з Decodo")}
        </div>
        <textarea
          rows={3}
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={'curl -x "socks5h://user-xxx-country-lr:pass@gate.decodo.com:7000" "https://ip.decodo.com/json"'}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(3,4,12,0.9)",
            border: `1px solid ${parsed ? "rgba(45,232,151,0.3)" : rawInput.trim() ? "rgba(255,107,122,0.3)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 9, padding: "8px 11px",
            fontSize: 10, color: "rgba(226,232,255,0.8)",
            fontFamily: "monospace", outline: "none", resize: "none", lineHeight: 1.5,
          }}
        />
        {parsed && (
          <div style={{
            marginTop: 5, padding: "7px 11px",
            background: "rgba(45,232,151,0.06)", border: "1px solid rgba(45,232,151,0.2)",
            borderRadius: 8, fontSize: 10, color: "rgba(45,232,151,0.8)", lineHeight: 1.6,
          }}>
            ✅ {L("Parsed", "Розпізнано")} · {parsed.host}:{parsed.port} · {L("current country", "поточна країна")}: <b>{parsed.countryCode.toUpperCase()}</b>
          </div>
        )}
        {!parsed && rawInput.trim() && (
          <div style={{ marginTop: 4, fontSize: 10, color: "rgba(255,107,122,0.7)" }}>
            {L("Could not parse — paste the full curl command or socks5h:// URL", "Не вдалося розпізнати — вставте повну curl-команду або socks5h:// URL")}
          </div>
        )}
      </div>

      {/* Step 2: target country code */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
          {L("2. Enter target country code (2 letters, e.g. kz, ua, ph)", "2. Введіть код нової країни (2 букви, напр. kz, ua, ph)")}
        </div>
        <input
          type="text"
          maxLength={2}
          value={countryCode}
          onChange={e => setCountryCode(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))}
          placeholder="kz"
          style={{
            width: 64, boxSizing: "border-box",
            background: "rgba(3,4,12,0.9)",
            border: `1px solid ${countryCode.length === 2 ? "rgba(255,200,50,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8, padding: "8px 12px",
            fontSize: 14, fontWeight: 700, color: "#ffc832",
            fontFamily: "monospace", outline: "none", textTransform: "uppercase",
            textAlign: "center",
          }}
        />
      </div>

      {/* Step 3: result */}
      {generated && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
            {L("3. Generated proxy URL", "3. Згенерований URL проксі")}
          </div>
          <div style={{
            background: "rgba(255,200,50,0.06)", border: "1px solid rgba(255,200,50,0.25)",
            borderRadius: 9, padding: "9px 11px",
            fontSize: 10, color: "#ffc832", fontFamily: "monospace",
            wordBreak: "break-all", lineHeight: 1.6, cursor: "pointer",
          }}
            onClick={() => copyToClipboard(generated)}
          >
            {generated}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>
            {L("Tap URL to copy", "Натисніть URL, щоб скопіювати")}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {generated && (
          <button
            onClick={() => copyToClipboard(generated)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              background: copied ? "rgba(45,232,151,0.15)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${copied ? "rgba(45,232,151,0.35)" : "rgba(255,255,255,0.15)"}`,
              color: copied ? "rgba(45,232,151,0.9)" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {copied ? "✅ " + L("Copied!", "Скопійовано!") : "📋 " + L("Copy", "Копіювати")}
          </button>
        )}
        {generated && (
          <button
            onClick={() => onApply(generated)}
            style={{
              flex: 2, padding: "9px 0", borderRadius: 10,
              background: "linear-gradient(135deg, rgba(255,200,50,0.3), rgba(255,200,50,0.15))",
              border: "1px solid rgba(255,200,50,0.5)",
              color: "#ffc832", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}
          >
            ✓ {L("Apply to Proxy Field", "Застосувати до поля проксі")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── RecycledPopupBody ─────────────────────────────────────────────────────────
// Inline component used inside the recycled-pool popup. Lets the user swap
// both country AND proxy in one place before retrying.
function RecycledPopupBody({
  lang, L, currentProxy, currentCountry, customCountry, COUNTRIES, onSwitch, onCancel, onKeepGoing,
}: {
  lang: string;
  L: (en: string, ua: string) => string;
  currentProxy: string;
  currentCountry: string;
  customCountry: string;
  COUNTRIES: { code: string; label: string }[];
  onSwitch: (country: string, proxy: string) => void;
  onCancel: () => void;
  onKeepGoing: () => void;
}) {
  const [newCountry, setNewCountry] = useState(currentCountry);
  const [newCustom,  setNewCustom]  = useState(customCountry);
  const [newProxy,   setNewProxy]   = useState(currentProxy);
  const [autoUpdated, setAutoUpdated] = useState(false);

  const effectiveId = newCountry === "custom" ? newCustom.trim() : newCountry;
  const canSwitch   = Boolean(effectiveId) && Boolean(newProxy.trim());

  // When country changes, if proxy is a Decodo URL, auto-rebuild it for the new country
  useEffect(() => {
    const p = parseDecodoProxy(newProxy);
    if (!p || !effectiveId || effectiveId.length !== 2) return;
    if (p.countryCode === effectiveId.toLowerCase()) return; // already correct
    const updated = buildDecodoProxy(p, effectiveId);
    setNewProxy(updated);
    setAutoUpdated(true);
    const t = setTimeout(() => setAutoUpdated(false), 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCountry, newCustom]);

  return (
    <>
      <div style={{
        background: "rgba(255,200,50,0.07)", border: "1px solid rgba(255,200,50,0.2)",
        borderRadius: 12, padding: "11px 14px", marginBottom: 14,
        fontSize: 12, color: "rgba(255,200,50,0.9)", lineHeight: 1.6, fontWeight: 600,
      }}>
        {L(
          "Numbers from this country are recycled — they already have Telegram accounts. " +
          "Switch country and the proxy URL will update automatically if it's a Decodo URL.",
          "Номери цієї країни переробленні — вони вже мають акаунти Telegram. " +
          "Змініть країну — проксі-URL оновиться автоматично, якщо це Decodo URL."
        )}
      </div>

      {/* Country selector */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
          {L("New Country", "Нова країна")}
        </div>
        <select
          value={newCountry}
          onChange={e => { setNewCountry(e.target.value); setAutoUpdated(false); }}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(7,9,20,0.9)",
            border: "1px solid rgba(255,200,50,0.3)",
            borderRadius: 10, padding: "9px 12px",
            fontSize: 13, color: "rgba(226,232,255,0.9)",
            fontFamily: "inherit", outline: "none", appearance: "none",
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
          <option value="custom">{L("✏️ Custom ID…", "✏️ Власний ID…")}</option>
        </select>
        {newCountry === "custom" && (
          <input
            type="text"
            value={newCustom}
            onChange={e => setNewCustom(e.target.value)}
            placeholder={L("SMSPool country ID (e.g. 106)", "ID країни SMSPool (напр. 106)")}
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 6,
              background: "rgba(7,9,20,0.9)",
              border: "1px solid rgba(255,200,50,0.25)",
              borderRadius: 8, padding: "8px 12px",
              fontSize: 12, color: "rgba(226,232,255,0.85)",
              fontFamily: "inherit", outline: "none",
            }}
          />
        )}
      </div>

      {/* Proxy field with auto-update indicator */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {L("Proxy", "Проксі")}
          </div>
          {autoUpdated && (
            <div style={{ fontSize: 10, color: "rgba(45,232,151,0.8)", fontWeight: 600 }}>
              🔧 {L("Auto-updated", "Оновлено автоматично")}
            </div>
          )}
        </div>
        <textarea
          rows={2}
          value={newProxy}
          onChange={e => { setNewProxy(e.target.value); setAutoUpdated(false); }}
          placeholder="socks5://user:pass@host:port"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(7,9,20,0.9)",
            border: `1px solid ${
              autoUpdated ? "rgba(45,232,151,0.4)"
              : newProxy.trim() ? "rgba(255,200,50,0.3)"
              : "rgba(255,107,122,0.35)"
            }`,
            borderRadius: 10, padding: "9px 12px",
            fontSize: 10, color: "rgba(226,232,255,0.85)",
            fontFamily: "monospace", outline: "none", resize: "none",
            lineHeight: 1.5, transition: "border-color 0.3s",
          }}
        />
        {!newProxy.trim() && (
          <div style={{ fontSize: 10, color: "rgba(255,107,122,0.7)", marginTop: 4 }}>
            {L("Proxy required — paste your Decodo URL below", "Потрібен проксі — вставте Decodo URL нижче")}
          </div>
        )}

        {/* Inline ProxyGenHelper — always shown so user can paste curl */}
        <ProxyGenHelper
          lang={lang}
          L={L}
          initialValue=""
          onApply={url => { setNewProxy(url); setAutoUpdated(false); }}
        />
      </div>

      {/* Keep trying same country */}
      <button
        onClick={onKeepGoing}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 13, marginBottom: 8,
          background: "linear-gradient(135deg, rgba(45,232,151,0.22), rgba(45,232,151,0.1))",
          border: "1px solid rgba(45,232,151,0.45)",
          color: "#2de897", fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}
      >
        🔁 {L("Keep trying — fetch new number from same country", "Продовжити — новий номер з тієї ж країни")}
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 13,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          {L("Cancel", "Скасувати")}
        </button>
        <button
          onClick={() => onSwitch(effectiveId, newProxy)}
          disabled={!canSwitch}
          style={{
            flex: 2, padding: "12px 0", borderRadius: 13,
            background: canSwitch
              ? "linear-gradient(135deg, rgba(255,200,50,0.35), rgba(255,200,50,0.18))"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${canSwitch ? "rgba(255,200,50,0.55)" : "rgba(255,255,255,0.1)"}`,
            color: canSwitch ? "#ffc832" : "rgba(255,255,255,0.25)",
            fontSize: 13, fontWeight: 800,
            cursor: canSwitch ? "pointer" : "default",
          }}
        >
          🔄 {L("Switch & Retry", "Змінити й повторити")}
        </button>
      </div>
    </>
  );
}

export function AccountFactoryPanel({ onDone }: { onDone: () => void }) {
  const { lang } = useI18n();
  const L = (en: string, ua: string) => lang === "ua" ? ua : en;

  const [smsKey,        setSmsKey]        = useState("");
  const [country,       setCountry]       = useState("ua");
  const [customCountry, setCustomCountry] = useState("");
  const [proxy,         setProxy]         = useState("");
  const [showProxyGen,  setShowProxyGen]  = useState(false);
  const [twoFa,         setTwoFa]         = useState("");
  const [apiId,         setApiId]         = useState("");
  const [apiHash,       setApiHash]       = useState("");
  const [quantity,        setQuantity]        = useState(1);
  const [sessionPrefix,   setSessionPrefix]   = useState("session");
  const [sessionStartNum, setSessionStartNum] = useState(1);
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

  // Auto-load country rankings when server key is confirmed — show list upfront
  useEffect(() => {
    if (serverHasKey !== true) return;
    setAutoCountryLoading(true);
    fetch("/api/factory/best-country", { headers: authHeaders() })
      .then(r => r.json())
      .then((json: { id?: string; name?: string; success_rate?: number; quantity?: number; top5?: typeof autoCountryTop5; error?: string }) => {
        if (!json.error && json.top5?.length) {
          setAutoCountryTop5(json.top5);
        }
      })
      .catch(() => { /* silent — user can still click Auto Pick manually */ })
      .finally(() => setAutoCountryLoading(false));
  }, [serverHasKey]);

  // ── Proxy Store ────────────────────────────────────────────────────────────
  type SavedProxy = { id: number; country_code: string; label: string; proxy_string: string; last_session_num: number };
  const [savedProxies,         setSavedProxies]         = useState<SavedProxy[]>([]);
  const [selectedProxyStoreId, setSelectedProxyStoreId] = useState<number | null>(null);
  const [showProxyStore,       setShowProxyStore]        = useState(false);
  const [showSaveProxy,        setShowSaveProxy]         = useState(false);
  const [saveProxyLabel,       setSaveProxyLabel]        = useState("");
  const [savingProxy,          setSavingProxy]           = useState(false);
  const [allSavedProxies,      setAllSavedProxies]       = useState<SavedProxy[]>([]);

  // Fetch saved proxies for the active country whenever country changes
  useEffect(() => {
    const cid = country === "custom" ? customCountry.trim() : country;
    if (!cid) { setSavedProxies([]); return; }
    fetch(`/api/proxy-store?country=${encodeURIComponent(cid)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((d: SavedProxy[]) => setSavedProxies(Array.isArray(d) ? d : []))
      .catch(() => setSavedProxies([]));
  }, [country, customCountry]);

  // Fetch ALL proxies for the store manager overlay
  const openProxyStore = () => {
    fetch("/api/proxy-store", { headers: authHeaders() })
      .then(r => r.json())
      .then((d: SavedProxy[]) => { setAllSavedProxies(Array.isArray(d) ? d : []); setShowProxyStore(true); })
      .catch(() => { setAllSavedProxies([]); setShowProxyStore(true); });
  };

  const saveCurrentProxy = () => {
    const cid = country === "custom" ? customCountry.trim() : country;
    if (!cid || !proxy.trim()) return;
    setSavingProxy(true);
    fetch("/api/proxy-store", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ country_code: cid, proxy_string: proxy.trim(), label: saveProxyLabel.trim() }),
    })
      .then(r => r.json())
      .then((saved: SavedProxy) => {
        setSavedProxies(prev => [saved, ...prev]);
        setShowSaveProxy(false);
        setSaveProxyLabel("");
        setSelectedProxyStoreId(saved.id);
      })
      .catch(() => {})
      .finally(() => setSavingProxy(false));
  };

  // Profile Setup state
  // Warmup mode selector
  const [warmupMode,    setWarmupMode]    = useState<"none" | "all" | "ask">("all");
  // Popup for "ask" mode — shown when backend emits warmup_prompt
  const [warmupPrompt,  setWarmupPrompt]  = useState<{ accountId: number; phone: string } | null>(null);
  // Popup shown on SMS timeout or recycled-number failure
  const [smsRetryPrompt, setSmsRetryPrompt] = useState<{
    reason: "timeout" | "recycled";
    message: string;
  } | null>(null);
  // Countries for which user chose "keep trying" — skip recycled popup next time
  const suppressRecycledRef = useRef<Set<string>>(new Set());
  // Session-level spend tracking
  const [totalSpent,      setTotalSpent]      = useState(0);
  const [recycledSkips,   setRecycledSkips]   = useState<Record<string, number>>({});

  const [profileMode,        setProfileMode]        = useState<"ai" | "manual">("ai");
  const [aiGender,           setAiGender]           = useState<"male" | "female" | "random">("random");
  const [avatarCounts,       setAvatarCounts]       = useState<{ male: number; female: number }>({ male: 0, female: 0 });
  const [showMaleUpload,     setShowMaleUpload]     = useState(false);
  const [showFemaleUpload,   setShowFemaleUpload]   = useState(false);
  const [uploadingGender,    setUploadingGender]    = useState<"male" | "female" | null>(null);
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

  // Avatar pool counts — fetch on mount and after uploads
  const fetchAvatarCounts = useCallback(async () => {
    try {
      const r = await fetch("/api/factory/avatar-counts", { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json() as { male?: number; female?: number };
        setAvatarCounts({ male: d.male ?? 0, female: d.female ?? 0 });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void fetchAvatarCounts(); }, [fetchAvatarCounts]);

  const uploadAvatarsToGender = useCallback(async (files: File[], gender: "male" | "female") => {
    setUploadingGender(gender);
    try {
      const fd = new FormData();
      fd.append("gender", gender);
      files.forEach((f, i) => fd.append(`file_${i}`, f));
      const r = await fetch("/api/factory/upload-avatars", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (r.ok) await fetchAvatarCounts();
    } catch { /* silent */ } finally {
      setUploadingGender(null);
    }
  }, [fetchAvatarCounts]);

  // Stock checker
  const [showStock,    setShowStock]    = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError,   setStockError]   = useState<string | null>(null);
  const [stockData,    setStockData]    = useState<{ id: string; name: string; stock: number; price: number }[]>([]);
  const [stockCached,  setStockCached]  = useState(false);
  const [stockSearch,  setStockSearch]  = useState("");

  // Auto-country: best success-rate country from SMSPool
  const [autoCountryLoading, setAutoCountryLoading] = useState(false);
  const [autoCountryMsg,     setAutoCountryMsg]     = useState<string | null>(null);
  const [autoCountryTop5,    setAutoCountryTop5]    = useState<{
    id: string; name: string; success_rate: number; quantity: number; rank: number;
  }[]>([]);

  // AI-powered country freshness analysis
  const [aiCountryLoading, setAiCountryLoading] = useState(false);
  const [aiCountryError,   setAiCountryError]   = useState<string | null>(null);
  const [aiCountryModel,   setAiCountryModel]   = useState<string>("");
  const [showAiCountries,  setShowAiCountries]  = useState(false);
  const [aiCountryData,    setAiCountryData]    = useState<{
    rank: number; id: string; name: string; freshness: number; avg_attempts: number;
    reasoning: string; data_source?: "own_experience" | "community_research" | "ai_estimate";
  }[]>([]);

  // Freshness reporting per country row
  const [reportingCountryId, setReportingCountryId] = useState<string | null>(null);
  const [reportSent,         setReportSent]         = useState<Record<string, "fresh" | "recycled">>({});

  const reportCountryStat = async (countryId: string, countryName: string, type: "success" | "recycled") => {
    try {
      await fetch("/api/factory/country-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ country_id: countryId, country_name: countryName, type }),
      });
      setReportSent(prev => ({ ...prev, [countryId]: type === "success" ? "fresh" : "recycled" }));
      setReportingCountryId(null);
    } catch { /* silent */ }
  };

  const [runState,        setRunState]        = useState<RunState>("idle");
  const [steps,           setSteps]           = useState<StepState[]>(initSteps());
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);
  const [pollMsg,         setPollMsg]         = useState<string | null>(null);
  const [preflightStatus, setPreflightStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [preflightMsg,    setPreflightMsg]    = useState<string | null>(null);
  const [exitIp,          setExitIp]          = useState<string | null>(null);
  const [isDcIp,          setIsDcIp]          = useState<boolean>(false);

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

  function applyCountry(id: string) {
    const known = COUNTRIES.find(c => c.code.toLowerCase() === id.toLowerCase());
    if (known) {
      setCountry(known.code);
      setSmsPoolCountryId("");
    } else {
      setCountry("custom");
      setCustomCountry(id);
    }
  }

  async function fetchBestCountry() {
    if (!serverHasKey && !smsKey.trim()) {
      setAutoCountryMsg(L("Enter your SMSPool API key first.", "Спочатку введіть API ключ SMSPool."));
      return;
    }
    setAutoCountryLoading(true);
    setAutoCountryMsg(null);
    setAutoCountryTop5([]);
    try {
      const qs = serverHasKey ? "" : `?api_key=${encodeURIComponent(smsKey.trim())}`;
      const resp = await fetch(`/api/factory/best-country${qs}`, { headers: authHeaders() });
      const json = await resp.json() as {
        id?: string; name?: string; success_rate?: number; quantity?: number;
        top5?: typeof autoCountryTop5;
        error?: string;
      };
      if (!resp.ok || json.error) {
        setAutoCountryMsg(json.error ?? `HTTP ${resp.status}`);
      } else if (json.id) {
        applyCountry(json.id);
        setAutoCountryTop5(json.top5 ?? []);
        setAutoCountryMsg(`✅ ${json.name ?? json.id}`);
      }
    } catch (e) {
      setAutoCountryMsg(String(e));
    } finally {
      setAutoCountryLoading(false);
    }
  }

  async function fetchAiCountries() {
    setAiCountryLoading(true);
    setAiCountryError(null);
    setShowAiCountries(true);
    try {
      const resp = await fetch("/api/factory/ai-countries", { headers: authHeaders() });
      const json = await resp.json() as {
        entries?: typeof aiCountryData;
        model?: string;
        error?: string;
        cached?: boolean;
      };
      if (!resp.ok || json.error) {
        setAiCountryError(json.error ?? `HTTP ${resp.status}`);
      } else {
        setAiCountryData(json.entries ?? []);
        setAiCountryModel(json.model ?? "");
      }
    } catch (e) {
      setAiCountryError(String(e));
    } finally {
      setAiCountryLoading(false);
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
          ...(sessionPrefix ? { session_prefix: sessionPrefix, session_start_num: sessionStartNum } : {}),
          ...(apiId   ? { api_id: parseInt(apiId) }   : {}),
          ...(apiHash ? { api_hash: apiHash }           : {}),
          profile_mode: profileMode,
          warmup_mode: warmupMode,
          ...(profileMode === "ai" ? { gender: aiGender } : {}),
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
            if (p.exit_ip) setExitIp(p.exit_ip as string);
            if (p.is_datacenter !== undefined) setIsDcIp(p.is_datacenter as boolean);
          } else if (event === "batch_reset") {
            setSteps(initSteps());
            setPollMsg(null);
            setErrorMsg(null);
            setPreflightStatus("idle");
            setPreflightMsg(null);
            setExitIp(null);
            setIsDcIp(false);
          } else if (event === "batch_delay") {
            setBatchDelayMsg(p.message as string);
          } else if (event === "batch_done") {
            const doneSucceeded = (p.succeeded as number) ?? 0;
            setBatchTotal(p.total as number);
            setBatchSucceeded(doneSucceeded);
            setBatchFailed(p.failed as number);
            setBatchDone(true);
            setRunState("done");
            setBatchDelayMsg(null);
            // Auto-update proxy store session number so next batch continues from the right number
            if (selectedProxyStoreId && sessionPrefix && doneSucceeded > 0) {
              const lastUsed = sessionStartNum + doneSucceeded - 1;
              fetch(`/api/proxy-store/${selectedProxyStoreId}/session-num`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ last_session_num: lastUsed }),
              })
                .then(r => r.json())
                .then((updated: { id: number; last_session_num: number }) => {
                  setSavedProxies(prev => prev.map(sp =>
                    sp.id === updated.id ? { ...sp, last_session_num: updated.last_session_num } : sp
                  ));
                })
                .catch(() => {});
            }
          } else if (event === "step") {
            const stepIdx = (p.step as number) - 1;
            updateStep(stepIdx, {
              status:  p.status as StepStatus,
              message: (p.message as string) || undefined,
            });
            if (p.status === "running") { setPollMsg(null); setBatchDelayMsg(null); }
            // Accumulate SMSPool cost when a number is purchased
            if (p.step === 1 && p.status === "done" && typeof p.cost === "number" && p.cost > 0) {
              setTotalSpent(prev => prev + (p.cost as number));
            }
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
            // SMS timeout or recycled-number failure
            const msg  = (p.message as string | undefined) ?? "";
            const isRecycled = msg.includes("SentCodeTypeApp") || msg.includes("recycled");
            // Determine effective country key for suppression check
            const effectiveCountryKey = country === "custom" ? customCountry.trim() : country;
            if (isRecycled && suppressRecycledRef.current.has(effectiveCountryKey)) {
              // User already chose "keep trying" for this country — auto-retry silently
              setRecycledSkips(prev => ({ ...prev, [effectiveCountryKey]: (prev[effectiveCountryKey] ?? 0) + 1 }));
              setRunState("idle");
              setPollMsg(null);
              setBatchDelayMsg(null);
              void launch();
            } else {
              setSmsRetryPrompt({
                reason:  isRecycled ? "recycled" : "timeout",
                message: msg,
              });
              setRunState("idle");
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
    setWarmupPrompt(null);
    setSmsRetryPrompt(null);
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
    setSmsRetryPrompt(null);
  }

  function handleSmsRetry(yes: boolean) {
    setSmsRetryPrompt(null);
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

      {/* ── SMS Retry / Recycled Pool Popup ────────────────────────────── */}
      {smsRetryPrompt && (() => {
        const isRecycled = smsRetryPrompt.reason === "recycled";
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "24px 24px calc(env(safe-area-inset-bottom,0px) + 24px)",
            overflowY: "auto", WebkitOverflowScrolling: "touch",
          }}>
            <div style={{
              background: "rgba(12,15,26,0.98)",
              border: `1px solid ${isRecycled ? "rgba(255,200,50,0.45)" : "rgba(255,107,122,0.4)"}`,
              borderRadius: 22, padding: "28px 24px", maxWidth: 360, width: "100%",
              boxShadow: `0 0 56px ${isRecycled ? "rgba(255,200,50,0.15)" : "rgba(255,107,122,0.2)"}`,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 44, textAlign: "center", marginBottom: 14 }}>
                {isRecycled ? "♻️" : "📵"}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 8 }}>
                {isRecycled
                  ? L("Recycled Number Pool", "Пул переробленних номерів")
                  : L("SMS Timeout", "Час очікування SMS вичерпано")}
              </div>

              {isRecycled ? (
                <RecycledPopupBody
                  lang={lang}
                  L={L}
                  currentProxy={proxy}
                  currentCountry={country}
                  customCountry={customCountry}
                  COUNTRIES={COUNTRIES}
                  onSwitch={(newCountry, newProxy) => {
                    setSmsRetryPrompt(null);
                    if (newProxy.trim()) setProxy(newProxy.trim());
                    applyCountry(newCountry);
                    setSmsPoolCountryId(newCountry);
                  }}
                  onCancel={() => setSmsRetryPrompt(null)}
                  onKeepGoing={() => {
                    const key = country === "custom" ? customCountry.trim() : country;
                    // Remember this country so future recycled events auto-retry
                    suppressRecycledRef.current.add(key);
                    // Count this first manual "keep going" as skip #1
                    setRecycledSkips(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
                    setSmsRetryPrompt(null);
                    void launch();
                  }}
                />
              ) : (
                <>
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
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{selectedCountryLabel}</div>
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
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Proxy Store Manager Overlay ──────────────────────────────────── */}
      {showProxyStore && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 998,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}
          onClick={() => setShowProxyStore(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(9,12,24,0.99)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
              borderRadius: "24px 24px 0 0", border: "1px solid rgba(168,85,247,0.22)",
              padding: "20px 18px calc(env(safe-area-inset-bottom,0px) + 28px)",
              maxHeight: "75vh", display: "flex", flexDirection: "column",
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                📦 {L("Proxy Store", "Сховище проксі")}
              </div>
              <button
                onClick={() => setShowProxyStore(false)}
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 10, width: 32, height: 32, fontSize: 16, color: "rgba(255,255,255,0.7)",
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            </div>
            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {allSavedProxies.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                  {L("No saved proxies yet. Enter a proxy and tap 💾 Save.", "Ще немає збережених проксі. Введіть проксі та натисніть 💾 Зберегти.")}
                </div>
              ) : (
                (() => {
                  const grouped = allSavedProxies.reduce<Record<string, typeof allSavedProxies>>((acc, sp) => {
                    (acc[sp.country_code] ??= []).push(sp);
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([code, proxies]) => (
                    <div key={code} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)",
                        letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                        {code.toUpperCase()}
                      </div>
                      {proxies.map(sp => (
                        <div key={sp.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                          borderRadius: 12, padding: "10px 12px", marginBottom: 6,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {sp.label && (
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#c084fc", marginBottom: 2 }}>
                                {sp.label}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {sp.proxy_string.replace(/socks5:\/\/[^@]+@/, "⋯@")}
                            </div>
                          </div>
                          <div style={{
                            background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.35)",
                            borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#c084fc",
                            whiteSpace: "nowrap",
                          }}>
                            #{sp.last_session_num}
                          </div>
                          <button
                            onClick={() => {
                              fetch(`/api/proxy-store/${sp.id}`, { method: "DELETE", headers: authHeaders() })
                                .then(() => {
                                  setAllSavedProxies(prev => prev.filter(x => x.id !== sp.id));
                                  setSavedProxies(prev => prev.filter(x => x.id !== sp.id));
                                  if (selectedProxyStoreId === sp.id) setSelectedProxyStoreId(null);
                                })
                                .catch(() => {});
                            }}
                            style={{
                              background: "rgba(255,100,100,0.12)", border: "1px solid rgba(255,100,100,0.28)",
                              borderRadius: 8, width: 28, height: 28, fontSize: 14, color: "rgba(255,120,120,0.9)",
                              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >🗑</button>
                        </div>
                      ))}
                    </div>
                  ));
                })()
              )}
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
                <div style={{ display: "flex", gap: 6 }}>
                  {/* Auto-pick best country by success rate */}
                  <button
                    onClick={() => void fetchBestCountry()}
                    disabled={autoCountryLoading}
                    title={L("Auto-pick the country with highest Telegram success rate", "Автоматично обрати країну з найвищим успіхом Telegram")}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: autoCountryMsg?.startsWith("✅") ? "rgba(45,232,151,0.15)" : GLASS2,
                      border: `1px solid ${autoCountryMsg?.startsWith("✅") ? "rgba(45,232,151,0.4)" : BORDER2}`,
                      borderRadius: 8, padding: "4px 10px",
                      cursor: autoCountryLoading ? "default" : "pointer",
                      fontSize: 11,
                      color: autoCountryMsg?.startsWith("✅") ? GREEN : "rgba(255,255,255,0.5)",
                      fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s",
                    }}
                  >
                    {autoCountryLoading ? (
                      <div style={{ width: 10, height: 10, borderRadius: "50%",
                        border: `1.5px solid ${GREEN}44`, borderTopColor: GREEN,
                        animation: "spin 0.8s linear infinite" }} />
                    ) : "⚡"}
                    {L("Auto Pick", "Авто")}
                  </button>
                  {/* Check stock panel */}
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
                  {/* AI freshness analysis */}
                  <button
                    onClick={() => showAiCountries ? setShowAiCountries(false) : void fetchAiCountries()}
                    disabled={aiCountryLoading}
                    title={L("AI analysis: best countries for fresh (unregistered) numbers", "AI аналіз: найкращі країни для «свіжих» номерів")}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: showAiCountries && aiCountryData.length > 0
                        ? "rgba(140,100,255,0.18)" : GLASS2,
                      border: `1px solid ${showAiCountries && aiCountryData.length > 0
                        ? "rgba(140,100,255,0.5)" : BORDER2}`,
                      borderRadius: 8, padding: "4px 10px",
                      cursor: aiCountryLoading ? "default" : "pointer",
                      fontSize: 11,
                      color: showAiCountries && aiCountryData.length > 0
                        ? "#a78bfa" : "rgba(255,255,255,0.5)",
                      fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s",
                    }}
                  >
                    {aiCountryLoading ? (
                      <div style={{ width: 10, height: 10, borderRadius: "50%",
                        border: "1.5px solid rgba(140,100,255,0.4)", borderTopColor: "#a78bfa",
                        animation: "spin 0.8s linear infinite" }} />
                    ) : "✦"}
                    {L("AI Pick", "AI Вибір")}
                  </button>
                </div>
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

              {/* ── Auto-pick result: top-5 ranked list ── */}
              {(autoCountryMsg || autoCountryTop5.length > 0) && (
                <div style={{
                  marginTop: 8,
                  background: "rgba(7,9,20,0.97)",
                  border: `1px solid ${(autoCountryTop5.length > 0 || autoCountryMsg?.startsWith("✅")) ? "rgba(45,232,151,0.28)" : "rgba(255,107,122,0.28)"}`,
                  borderRadius: 14, overflow: "hidden",
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 13px",
                    borderBottom: autoCountryTop5.length > 0 ? `1px solid ${BORDER}` : "none",
                    background: "rgba(255,255,255,0.025)",
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: (autoCountryTop5.length > 0 || autoCountryMsg?.startsWith("✅")) ? GREEN : RED,
                    }}>
                      {autoCountryTop5.length > 0
                        ? (lang === "ua" ? "⚡ Рейтинг країн SMSPool — Telegram" : "⚡ SMSPool Country Rankings — Telegram")
                        : autoCountryMsg}
                    </div>
                    <button
                      onClick={() => { setAutoCountryMsg(null); setAutoCountryTop5([]); }}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.35)", fontSize: 15, lineHeight: 1, padding: 0 }}>
                      ✕
                    </button>
                  </div>

                  {/* Ranked rows */}
                  {autoCountryTop5.map((c, idx) => {
                    const isSelected =
                      country === c.id ||
                      customCountry === c.id ||
                      COUNTRIES.find(k => k.code.toLowerCase() === c.id.toLowerCase()) !== undefined &&
                      country === COUNTRIES.find(k => k.code.toLowerCase() === c.id.toLowerCase())!.code;
                    const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32", "rgba(255,255,255,0.45)", "rgba(255,255,255,0.35)"];
                    const rankColor  = rankColors[idx] ?? "rgba(255,255,255,0.35)";
                    const srColor    = c.success_rate >= 70 ? GREEN : c.success_rate >= 40 ? ACCENT : RED;
                    const srBar      = Math.round(c.success_rate);
                    return (
                      <div
                        key={c.id}
                        onClick={() => { applyCountry(c.id); setSmsPoolCountryId(c.id); setAutoCountryMsg(`✅ ${c.name}`); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 13px",
                          borderBottom: idx < autoCountryTop5.length - 1 ? `1px solid ${BORDER}` : "none",
                          cursor: "pointer",
                          background: isSelected ? `${GREEN}0c` : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Rank badge */}
                        <div style={{
                          width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                          background: `${rankColor}18`,
                          border: `1.5px solid ${rankColor}55`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, color: rankColor,
                        }}>
                          {c.rank}
                        </div>

                        {/* Country name + stock */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? GREEN : "rgba(226,232,255,0.88)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {c.name}
                            {isSelected && (
                              <span style={{ marginLeft: 6, fontSize: 10, color: GREEN, fontWeight: 700 }}>
                                {L("● selected", "● обрано")}
                              </span>
                            )}
                          </div>
                          {/* Success rate bar */}
                          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{
                              flex: 1, height: 3, borderRadius: 2,
                              background: "rgba(255,255,255,0.08)",
                              overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${srBar}%`, height: "100%",
                                background: srColor,
                                borderRadius: 2,
                                transition: "width 0.4s ease",
                              }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: srColor, flexShrink: 0 }}>
                              {c.success_rate}%
                            </div>
                          </div>
                        </div>

                        {/* Stock pill */}
                        <div style={{
                          flexShrink: 0, fontSize: 10, fontWeight: 600,
                          color: "rgba(255,255,255,0.35)",
                          background: GLASS,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 6, padding: "2px 7px",
                        }}>
                          {c.quantity > 999 ? "999+" : c.quantity} {L("avail", "шт")}
                        </div>

                        {/* Tap arrow */}
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>›</div>
                      </div>
                    );
                  })}

                  {/* Error state (no top5) */}
                  {autoCountryTop5.length === 0 && autoCountryMsg && !autoCountryMsg.startsWith("✅") && (
                    <div style={{ padding: "10px 13px", fontSize: 11, color: RED, lineHeight: 1.5 }}>
                      {autoCountryMsg}
                    </div>
                  )}
                </div>
              )}

              {/* ── AI freshness analysis panel ── */}
              {showAiCountries && (
                <div style={{
                  marginTop: 8,
                  background: "rgba(7,6,24,0.98)",
                  border: `1px solid ${aiCountryError ? "rgba(255,107,122,0.3)" : "rgba(140,100,255,0.35)"}`,
                  borderRadius: 14, overflow: "hidden",
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 13px",
                    borderBottom: `1px solid rgba(140,100,255,0.15)`,
                    background: "rgba(140,100,255,0.06)",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>
                        {aiCountryLoading
                          ? (lang === "ua" ? "✦ AI аналізує…" : "✦ AI analysing…")
                          : (lang === "ua"
                              ? "✦ AI: Топ-10 країн з «свіжими» номерами"
                              : "✦ AI: Top 10 countries for fresh numbers")}
                      </div>
                      {aiCountryModel && !aiCountryLoading && (
                        <div style={{ fontSize: 9, color: "rgba(167,139,250,0.5)" }}>
                          {aiCountryModel}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {!aiCountryLoading && aiCountryData.length > 0 && (
                        <button
                          onClick={() => void fetchAiCountries()}
                          title={L("Refresh AI analysis", "Оновити AI аналіз")}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "rgba(167,139,250,0.5)", fontSize: 13, lineHeight: 1, padding: 0,
                          }}
                        >↻</button>
                      )}
                      <button
                        onClick={() => setShowAiCountries(false)}
                        style={{ background: "none", border: "none", cursor: "pointer",
                          color: "rgba(255,255,255,0.35)", fontSize: 15, lineHeight: 1, padding: 0 }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Loading skeleton */}
                  {aiCountryLoading && (
                    <div style={{ padding: "14px 13px" }}>
                      {[1,2,3].map(i => (
                        <div key={i} style={{
                          height: 38, borderRadius: 8, marginBottom: 6,
                          background: "rgba(140,100,255,0.06)",
                          animation: "pulse 1.4s ease-in-out infinite",
                          animationDelay: `${i * 0.15}s`,
                        }} />
                      ))}
                      <div style={{ fontSize: 11, color: "rgba(167,139,250,0.5)", textAlign: "center", marginTop: 8 }}>
                        {L("Asking AI to analyse fresh number pools…", "AI аналізує пули свіжих номерів…")}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {aiCountryError && !aiCountryLoading && (
                    <div style={{ padding: "12px 13px", fontSize: 11, color: RED, lineHeight: 1.5 }}>
                      {aiCountryError}
                    </div>
                  )}

                  {/* AI country rows */}
                  {!aiCountryLoading && aiCountryData.map((c, idx) => {
                    const freshColor = c.freshness >= 70 ? GREEN : c.freshness >= 45 ? ACCENT : RED;
                    const rankColors = ["#ffd700","#c0c0c0","#cd7f32"];
                    const rankColor  = rankColors[idx] ?? "rgba(167,139,250,0.45)";
                    const isSelected =
                      country.toLowerCase() === c.id.toLowerCase() ||
                      customCountry.toLowerCase() === c.id.toLowerCase();
                    const srcIcon = c.data_source === "own_experience" ? "🔬" : c.data_source === "community_research" ? "📊" : "🤖";
                    const srcLabel = c.data_source === "own_experience"
                      ? L("our data", "наші дані")
                      : c.data_source === "community_research"
                        ? L("community", "спільнота")
                        : L("AI est.", "AI оцінка");
                    return (
                      <div
                        key={c.id}
                        onClick={() => { applyCountry(c.id); setSmsPoolCountryId(c.id); }}
                        style={{
                          padding: "10px 13px",
                          borderBottom: idx < aiCountryData.length - 1 ? `1px solid rgba(140,100,255,0.1)` : "none",
                          cursor: "pointer",
                          background: isSelected ? "rgba(140,100,255,0.1)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Row 1: rank + name + freshness bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          {/* Rank */}
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            background: `${rankColor}18`,
                            border: `1.5px solid ${rankColor}55`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 800, color: rankColor,
                          }}>{c.rank}</div>
                          {/* Name */}
                          <div style={{
                            flex: 1, fontSize: 12, fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? "#a78bfa" : "rgba(226,232,255,0.88)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {c.name}
                            {isSelected && <span style={{ marginLeft: 6, fontSize: 10, color: "#a78bfa" }}>● {L("selected","обрано")}</span>}
                          </div>
                          {/* Freshness bar + % */}
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                            <div style={{ width: 40, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                              <div style={{ width: `${c.freshness}%`, height: "100%", background: freshColor, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: freshColor, minWidth: 28 }}>
                              {c.freshness}%
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>›</div>
                        </div>
                        {/* Row 2: avg_attempts pill + source badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 28, marginBottom: 4 }}>
                          {/* avg_attempts pill */}
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: "rgba(140,100,255,0.12)",
                            border: "1px solid rgba(140,100,255,0.25)",
                            borderRadius: 6, padding: "2px 7px",
                          }}>
                            <span style={{ fontSize: 9, color: "rgba(167,139,250,0.6)" }}>
                              {lang === "ua" ? "≈спроб:" : "≈attempts:"}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#c4b5fd" }}>
                              {c.avg_attempts}
                            </span>
                          </div>
                          {/* data source badge */}
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 5, padding: "2px 6px",
                          }}>
                            <span style={{ fontSize: 8 }}>{srcIcon}</span>
                            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{srcLabel}</span>
                          </div>
                        </div>
                        {/* Row 3: Reasoning */}
                        <div style={{
                          fontSize: 10, color: "rgba(255,255,255,0.38)", lineHeight: 1.5,
                          paddingLeft: 28,
                        }}>
                          {c.reasoning}
                        </div>

                        {/* Row 4: Report freshness */}
                        <div
                          style={{ paddingLeft: 28, marginTop: 7 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {reportSent[c.id] ? (
                            /* Already reported */
                            <div style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: reportSent[c.id] === "fresh" ? "rgba(45,232,151,0.10)" : "rgba(255,107,122,0.10)",
                              border: `1px solid ${reportSent[c.id] === "fresh" ? "rgba(45,232,151,0.25)" : "rgba(255,107,122,0.25)"}`,
                              borderRadius: 6, padding: "2px 8px",
                              fontSize: 9, color: reportSent[c.id] === "fresh" ? GREEN : RED,
                            }}>
                              {reportSent[c.id] === "fresh" ? "✓ " : "♻ "}
                              {lang === "ua"
                                ? (reportSent[c.id] === "fresh" ? "свіжі — надіслано" : "переробл. — надіслано")
                                : (reportSent[c.id] === "fresh" ? "fresh reported" : "recycled reported")}
                            </div>
                          ) : reportingCountryId === c.id ? (
                            /* Inline picker */
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                                {L("How were numbers?", "Які номери?")}
                              </span>
                              <button
                                onClick={() => void reportCountryStat(c.id, c.name, "success")}
                                style={{
                                  background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.3)",
                                  borderRadius: 5, padding: "2px 7px", fontSize: 9, fontWeight: 700,
                                  color: GREEN, cursor: "pointer", fontFamily: "inherit",
                                }}
                              >
                                ✓ {L("Fresh", "Свіжі")}
                              </button>
                              <button
                                onClick={() => void reportCountryStat(c.id, c.name, "recycled")}
                                style={{
                                  background: "rgba(255,107,122,0.12)", border: "1px solid rgba(255,107,122,0.3)",
                                  borderRadius: 5, padding: "2px 7px", fontSize: 9, fontWeight: 700,
                                  color: RED, cursor: "pointer", fontFamily: "inherit",
                                }}
                              >
                                ♻ {L("Recycled", "Переробл.")}
                              </button>
                              <button
                                onClick={() => setReportingCountryId(null)}
                                style={{
                                  background: "transparent", border: "none",
                                  fontSize: 10, color: "rgba(255,255,255,0.25)",
                                  cursor: "pointer", fontFamily: "inherit", padding: "2px 3px",
                                }}
                              >✕</button>
                            </div>
                          ) : (
                            /* Trigger button */
                            <button
                              onClick={() => setReportingCountryId(c.id)}
                              style={{
                                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                                borderRadius: 5, padding: "2px 7px", fontSize: 9,
                                color: "rgba(255,255,255,0.28)", cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              🔬 {L("Report result", "Звіт")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Disclaimer */}
                  {!aiCountryLoading && aiCountryData.length > 0 && (
                    <div style={{
                      padding: "8px 13px",
                      borderTop: `1px solid rgba(140,100,255,0.1)`,
                      fontSize: 9, color: "rgba(255,255,255,0.22)", lineHeight: 1.5,
                    }}>
                      <span style={{ marginRight: 4 }}>📊</span>
                      {L(
                        "Data sourced from BlackHatWorld, Reddit, Trustpilot & operator forums (June 2026). 🔬 = our own DB experience. Refreshed every 12h.",
                        "Дані з BlackHatWorld, Reddit, Trustpilot та форумів операторів (червень 2026). 🔬 = наш власний досвід. Оновлення кожні 12г."
                      )}
                    </div>
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

            {/* Proxy field + Decodo builder toggle + Proxy Store */}
            <div style={{ marginBottom: 4 }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>
                  {L("Decodo SOCKS5 Proxy", "Проксі Decodo SOCKS5")}
                </div>
                <button
                  onClick={openProxyStore}
                  style={{
                    display: "flex", alignItems: "center", gap: 3,
                    background: GLASS2, border: `1px solid ${BORDER2}`,
                    borderRadius: 8, padding: "3px 8px",
                    fontSize: 10, fontWeight: 700, color: "rgba(168,85,247,0.9)",
                    fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  📦 {L("Store", "Сховище")}
                </button>
                <button
                  onClick={() => setShowProxyGen(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: showProxyGen ? "rgba(255,200,50,0.18)" : GLASS2,
                    border: `1px solid ${showProxyGen ? "rgba(255,200,50,0.45)" : BORDER2}`,
                    borderRadius: 8, padding: "3px 9px",
                    fontSize: 10, fontWeight: 700,
                    color: showProxyGen ? "#ffc832" : "rgba(255,255,255,0.45)",
                    fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  🔧 {L("Builder", "Будівник")}
                </button>
              </div>

              {/* Autofill chips — only when saved proxies exist for current country */}
              {savedProxies.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {savedProxies.map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        setProxy(sp.proxy_string);
                        setSessionStartNum(sp.last_session_num + 1);
                        setSelectedProxyStoreId(sp.id);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: selectedProxyStoreId === sp.id
                          ? "rgba(168,85,247,0.22)" : "rgba(168,85,247,0.09)",
                        border: `1px solid ${selectedProxyStoreId === sp.id
                          ? "rgba(168,85,247,0.6)" : "rgba(168,85,247,0.28)"}`,
                        borderRadius: 20, padding: "4px 10px",
                        fontSize: 11, fontWeight: 600,
                        color: selectedProxyStoreId === sp.id ? "#c084fc" : "rgba(168,85,247,0.8)",
                        fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <span>{sp.label || sp.proxy_string.replace(/socks5:\/\/[^@]+@/, "").slice(0, 18)}</span>
                      <span style={{
                        background: "rgba(168,85,247,0.2)", borderRadius: 10,
                        padding: "1px 6px", fontSize: 10, color: "#c084fc",
                      }}>#{sp.last_session_num + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Proxy input */}
              <input
                type="text"
                value={proxy}
                onChange={e => { setProxy(e.target.value); setSelectedProxyStoreId(null); }}
                placeholder="socks5://user:pass@ip:port"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: GLASS2,
                  border: `1px solid ${selectedProxyStoreId ? "rgba(168,85,247,0.4)" : BORDER}`,
                  borderRadius: 11, padding: "10px 14px",
                  fontSize: 12, color: "rgba(226,232,255,0.85)",
                  fontFamily: "inherit", outline: "none",
                }}
              />

              {/* Hint + Save to Store button row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>
                  {selectedProxyStoreId
                    ? L("✓ Linked — session # auto-updates after batch", "✓ Прив'язано — № сесії оновиться після пакету")
                    : L("Residential proxy for anti-ban protection", "Residential проксі для захисту від банів")}
                </div>
                {proxy.trim() && !selectedProxyStoreId && (
                  <button
                    onClick={() => setShowSaveProxy(v => !v)}
                    style={{
                      background: showSaveProxy ? "rgba(168,85,247,0.22)" : GLASS2,
                      border: `1px solid ${showSaveProxy ? "rgba(168,85,247,0.5)" : BORDER2}`,
                      borderRadius: 8, padding: "3px 9px",
                      fontSize: 10, fontWeight: 700, color: "rgba(168,85,247,0.9)",
                      fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    💾 {L("Save", "Зберегти")}
                  </button>
                )}
              </div>

              {/* Save proxy expand panel */}
              {showSaveProxy && (
                <div style={{
                  background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.25)",
                  borderRadius: 10, padding: "10px 12px", marginTop: 6,
                  display: "flex", gap: 8, alignItems: "center",
                }}>
                  <input
                    type="text"
                    value={saveProxyLabel}
                    onChange={e => setSaveProxyLabel(e.target.value)}
                    placeholder={L("Label (optional)", "Назва (необов'язково)")}
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, padding: "6px 10px", fontSize: 11,
                      color: "rgba(255,255,255,0.85)", fontFamily: "inherit", outline: "none",
                    }}
                    onKeyDown={e => { if (e.key === "Enter") saveCurrentProxy(); }}
                  />
                  <button
                    onClick={saveCurrentProxy}
                    disabled={savingProxy}
                    style={{
                      background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.5)",
                      borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700,
                      color: "#c084fc", fontFamily: "inherit", cursor: savingProxy ? "not-allowed" : "pointer",
                      opacity: savingProxy ? 0.6 : 1,
                    }}
                  >
                    {savingProxy ? "…" : L("Save", "Зберегти")}
                  </button>
                </div>
              )}

              {showProxyGen && (
                <ProxyGenHelper
                  lang={lang}
                  L={L}
                  initialValue={proxy}
                  onApply={url => { setProxy(url); setShowProxyGen(false); }}
                />
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                {L("2FA Password", "Пароль 2FA")}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="password"
                  value={twoFa}
                  onChange={e => setTwoFa(e.target.value)}
                  placeholder={L("Strong password…", "Надійний пароль…")}
                  style={{
                    flex: 1, boxSizing: "border-box",
                    background: GLASS2, border: `1px solid ${BORDER2}`,
                    borderRadius: 12, padding: "11px 14px",
                    fontSize: 13, color: "rgba(226,232,255,0.9)",
                    fontFamily: "inherit", outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
                    const arr = new Uint8Array(16);
                    crypto.getRandomValues(arr);
                    setTwoFa(Array.from(arr, b => chars[b % chars.length]).join(""));
                  }}
                  title={L("Generate random password", "Згенерувати пароль")}
                  style={{
                    flexShrink: 0, width: 42, height: 42,
                    background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.3)",
                    borderRadius: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(99,179,237,0.85)",
                  }}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
              <div style={{ fontSize: 10, color: "rgba(160,180,230,0.4)", marginTop: 4, lineHeight: 1.4 }}>
                {L("Applied immediately after account creation", "Встановлюється одразу після реєстрації")}
              </div>
            </div>

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

            {/* Session Name Increment */}
            <div style={{
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 15 }}>🔢</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>
                    {L("Session Name Increment", "Інкремент імені сесії")}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    {L("Auto-names sessions to avoid reuse bans", "Автонейминг сесій для захисту від банів")}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5 }}>
                    {L("Prefix", "Префікс")}
                  </div>
                  <input
                    type="text"
                    value={sessionPrefix}
                    onChange={e => setSessionPrefix(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="session"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(7,9,20,0.8)",
                      border: "1px solid rgba(99,102,241,0.35)",
                      borderRadius: 10, padding: "9px 12px",
                      fontSize: 13, fontWeight: 600,
                      color: "#c7d2fe", fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5 }}>
                    {L("Start #", "Старт №")}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={sessionStartNum}
                    onChange={e => setSessionStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(7,9,20,0.8)",
                      border: "1px solid rgba(99,102,241,0.35)",
                      borderRadius: 10, padding: "9px 12px",
                      fontSize: 13, fontWeight: 600,
                      color: "#c7d2fe", fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              {/* Live preview */}
              {sessionPrefix && (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: "rgba(7,9,20,0.9)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(165,180,252,0.5)",
                    letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
                    {L("Preview", "Попередній перегляд")}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#a5b4fc", lineHeight: 1.8 }}>
                    {Array.from({ length: Math.min(quantity, 4) }, (_, i) => (
                      <span key={i} style={{
                        display: "inline-block", marginRight: 6, marginBottom: 2,
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 5, padding: "1px 7px",
                      }}>
                        {sessionPrefix}-{sessionStartNum + i}.session
                      </span>
                    ))}
                    {quantity > 4 && (
                      <span style={{ color: "rgba(165,180,252,0.4)", fontSize: 10 }}>
                        …+{quantity - 4} {L("more", "ще")}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {!sessionPrefix && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                  {L(
                    "Leave empty to use phone digits as session name (default).",
                    "Залиште порожнім, щоб використовувати цифри телефону (за замовчуванням)."
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

              {/* AI mode — gender selector + avatar pool */}
              {profileMode === "ai" && (
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Gender selector */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.38)",
                      letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>
                      {L("Account gender", "Стать акаунту")}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {([
                        { key: "male",   label: L("♂ Man",    "♂ Чоловік"),  color: "#60a5fa" },
                        { key: "female", label: L("♀ Woman",  "♀ Жінка"),    color: "#f472b6" },
                        { key: "random", label: L("⚄ Random", "⚄ Рандом"),   color: "#a78bfa" },
                      ] as const).map(opt => (
                        <button key={opt.key} onClick={() => setAiGender(opt.key)} style={{
                          flex: 1, padding: "7px 4px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                          cursor: "pointer", transition: "all .15s",
                          background: aiGender === opt.key ? `${opt.color}22` : "rgba(255,255,255,0.04)",
                          border: aiGender === opt.key ? `1.5px solid ${opt.color}66` : "1.5px solid rgba(255,255,255,0.08)",
                          color: aiGender === opt.key ? opt.color : "rgba(255,255,255,0.38)",
                        }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {aiGender !== "random" && (
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 5, lineHeight: 1.4 }}>
                        {aiGender === "male"
                          ? L("AI uses masculine Russian names, bio themes: business/sports/cars",
                              "AI: чоловічі імена, біо: бізнес/спорт/авто")
                          : L("AI uses feminine Russian names, bio themes: lifestyle/beauty/travel",
                              "AI: жіночі імена, біо: лайфстайл/краса/подорожі")}
                      </div>
                    )}
                  </div>

                  {/* Avatar pool counters */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.38)",
                      letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>
                      📸 {L("Avatar pool", "Пул аватарів")}
                    </div>
                    {(["male", "female"] as const).map(g => {
                      const count = avatarCounts[g];
                      const showUpload = g === "male" ? showMaleUpload : showFemaleUpload;
                      const setShowUpload = g === "male" ? setShowMaleUpload : setShowFemaleUpload;
                      const gColor = g === "male" ? "#60a5fa" : "#f472b6";
                      const barColor = count === 0 ? "#374151"
                        : count < 5  ? "#ef4444"
                        : count < 15 ? "#f59e0b"
                        : "#22c55e";
                      const barPct = Math.min(100, Math.round((count / 30) * 100));
                      const gLabel = g === "male" ? L("Male", "Чоловічі") : L("Female", "Жіночі");
                      const isUploading = uploadingGender === g;

                      return (
                        <div key={g} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: gColor, fontWeight: 700, minWidth: 52 }}>{gLabel}</span>
                            <div style={{ flex: 1, height: 5, borderRadius: 3,
                              background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                width: `${barPct}%`,
                                background: barColor,
                                transition: "width .4s, background .4s",
                              }} />
                            </div>
                            <span style={{ fontSize: 10, color: barColor, fontWeight: 700, minWidth: 22, textAlign: "right" }}>
                              {count}
                            </span>
                            <button
                              onClick={() => setShowUpload(v => !v)}
                              style={{
                                background: showUpload ? `${gColor}22` : "rgba(255,255,255,0.05)",
                                border: `1px solid ${showUpload ? gColor + "55" : "rgba(255,255,255,0.1)"}`,
                                borderRadius: 6, padding: "3px 8px",
                                fontSize: 10, color: showUpload ? gColor : "rgba(255,255,255,0.4)",
                                cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                              }}
                            >
                              {showUpload ? L("▲ Close", "▲ Закрити") : L("+ Add", "+ Додати")}
                            </button>
                          </div>

                          {showUpload && (
                            <label style={{
                              display: "flex", alignItems: "center", gap: 8,
                              background: "rgba(255,255,255,0.03)",
                              border: `1.5px dashed ${gColor}44`,
                              borderRadius: 9, padding: "8px 12px", cursor: "pointer",
                              fontSize: 11, color: isUploading ? gColor : "rgba(255,255,255,0.4)",
                            }}>
                              <span style={{ fontSize: 16 }}>{isUploading ? "⏳" : "+"}</span>
                              {isUploading
                                ? L("Uploading…", "Завантаження…")
                                : L("Select photos to add…", "Обрати фото…")}
                              <input
                                type="file" accept="image/*" multiple style={{ display: "none" }}
                                disabled={isUploading}
                                onChange={async e => {
                                  const files = Array.from(e.target.files ?? []);
                                  if (!files.length) return;
                                  e.target.value = "";
                                  await uploadAvatarsToGender(files, g);
                                  setShowUpload(false);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 2, lineHeight: 1.5 }}>
                      {L("Photos are picked from the matching gender folder and moved to used/ after assignment.",
                         "Фото беруться з папки відповідної статі та переміщуються до used/ після використання.")}
                    </div>
                  </div>

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
                  {exitIp && (preflightStatus === "done" || preflightStatus === "error") && (
                    <div style={{
                      marginTop: 6,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: isDcIp ? "rgba(255,60,60,0.12)" : "rgba(0,0,0,0.25)",
                      border: `1px solid ${isDcIp ? "rgba(255,80,80,0.45)" : "rgba(45,232,151,0.25)"}`,
                      borderRadius: 8, padding: "3px 10px",
                    }}>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>
                        {isDcIp ? "⛔ DC IP" : "EXIT IP"}
                      </span>
                      <span style={{
                        fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                        color: isDcIp ? "#ff6b6b" : "#2de897",
                        letterSpacing: "0.04em",
                      }}>{exitIp}</span>
                      {isDcIp && (
                        <span style={{ fontSize: 10, color: "rgba(255,140,140,0.85)", fontWeight: 600 }}>
                          — PROXY BYPASSED
                        </span>
                      )}
                    </div>
                  )}
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

            {/* ── Session Stats Strip ──────────────────────────────────────── */}
            {(totalSpent > 0 || Object.keys(recycledSkips).length > 0) && (() => {
              const effectiveKey = country === "custom" ? customCountry.trim() : country;
              const skipCount = recycledSkips[effectiveKey] ?? 0;
              const totalSkips = Object.values(recycledSkips).reduce((a, b) => a + b, 0);
              return (
                <div style={{
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 14, padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 0,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 12, flexShrink: 0 }}>
                    {L("Session", "Сесія")}
                  </div>

                  {/* Money spent */}
                  {totalSpent > 0 && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginRight: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#ffc832" }}>
                        ${totalSpent.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,200,50,0.5)" }}>
                        {L("spent", "витрачено")}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  {totalSpent > 0 && totalSkips > 0 && (
                    <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)", marginRight: 14 }} />
                  )}

                  {/* Recycled skips for current country */}
                  {skipCount > 0 && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginRight: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#ff6b7a" }}>
                        {skipCount}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,107,122,0.55)" }}>
                        {L("recycled", "переробл.")}
                      </span>
                    </div>
                  )}

                  {/* Total skips across all countries (if more than one country involved) */}
                  {totalSkips > 0 && totalSkips !== skipCount && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,107,122,0.5)" }}>
                        {totalSkips}
                      </span>
                      <span style={{ fontSize: 9, color: "rgba(255,107,122,0.35)" }}>
                        {L("total recycled", "всього переробл.")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

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
