import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../lib/i18n";
import {
  X, RefreshCw, Eye, EyeOff, Radio, ChevronDown, ChevronUp,
  Plus, Trash2, Globe, Calendar, Shuffle, CheckCircle,
} from "lucide-react";
import { api, GroupCampaign, SenderAccount, AccountGroup } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";
import { resolve as resolveSpintax, preview_all } from "../lib/spintax";

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERVAL_PRESETS_UA = [
  { label: "15 хв",  value: 900 },
  { label: "30 хв",  value: 1800 },
  { label: "1 год",  value: 3600 },
  { label: "3 год",  value: 10800 },
  { label: "6 год",  value: 21600 },
  { label: "12 год", value: 43200 },
  { label: "24 год", value: 86400 },
  { label: "3 дні",  value: 259200 },
  { label: "7 днів", value: 604800 },
];
const INTERVAL_PRESETS_EN = [
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
  { label: "1 hr",   value: 3600 },
  { label: "3 hr",   value: 10800 },
  { label: "6 hr",   value: 21600 },
  { label: "12 hr",  value: 43200 },
  { label: "24 hr",  value: 86400 },
  { label: "3 days", value: 259200 },
  { label: "7 days", value: 604800 },
];

// ── Proxy parsing ─────────────────────────────────────────────────────────────

interface ParsedProxy {
  raw: string;
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}

function parseProxyLine(line: string): ParsedProxy | null {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;

  // socks5://user:pass@host:port  OR  http://host:port
  const urlMatch = line.match(/^(socks5?|http):\/\/(?:([^:@]+):([^@]+)@)?([^:/]+):(\d+)/i);
  if (urlMatch) {
    return { raw: line, protocol: urlMatch[1].toLowerCase(), username: urlMatch[2], password: urlMatch[3], host: urlMatch[4], port: parseInt(urlMatch[5]) };
  }
  // host:port:user:pass  (4-part Telegram format)
  const parts4 = line.split(":");
  if (parts4.length === 4) {
    return { raw: line, protocol: "socks5", host: parts4[0], port: parseInt(parts4[1]), username: parts4[2], password: parts4[3] };
  }
  // host:port
  if (parts4.length === 2 && !isNaN(parseInt(parts4[1]))) {
    return { raw: line, protocol: "socks5", host: parts4[0], port: parseInt(parts4[1]) };
  }
  return null;
}

function parseProxies(raw: string): ParsedProxy[] {
  return raw.split(/[\n,;]+/).map(parseProxyLine).filter(Boolean) as ParsedProxy[];
}

function serializeProxy(p: ParsedProxy): Record<string, unknown> {
  const out: Record<string, unknown> = { host: p.host, port: p.port, protocol: p.protocol };
  if (p.username) out.username = p.username;
  if (p.password) out.password = p.password;
  return out;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InlineButton({ text, url, onRemove }: { text: string; url: string; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", marginBottom: 4 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: TG.text }}>{text}</div>
        <div style={{ fontSize: 10, color: TG.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
      </div>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
        <Trash2 size={12} color="#ff6b7a" />
      </button>
    </div>
  );
}

function SpintaxPreviewBlock({ text, show, onToggle }: { text: string; show: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const previews = show && text ? preview_all(text, 4) : [];
  const hasSpintax = text.includes("{") && text.includes("|");

  if (!hasSpintax) return null;

  return (
    <div>
      <button
        onClick={() => { haptic.light(); onToggle(); }}
        style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#c4aeff", fontSize: 11, fontWeight: 700, padding: 0 }}
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
        {show ? t.editor.hidePreview : t.editor.showPreview}
        {!show && <span style={{ fontSize: 9, color: TG.muted, fontWeight: 400 }}>({text.match(/\{[^}]+\}/g)?.length ?? 0} {t.groups.spintaxBlocks})</span>}
      </button>

      {show && previews.length > 0 && (
        <div style={{ marginTop: 8, borderRadius: 12, background: "rgba(196,174,255,0.06)", border: "1px solid rgba(196,174,255,0.15)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ fontSize: 9, color: "#c4aeff", fontWeight: 700, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
            <Shuffle size={9} />{t.groups.spintaxVariants}
          </div>
          {previews.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: TG.textSecondary, lineHeight: 1.55, borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
              <span style={{ fontSize: 9, color: "#c4aeff", fontWeight: 700, marginRight: 6 }}>#{i + 1}</span>{p}
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 9, color: TG.muted, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
            {t.groups.spintaxLivePreview} «{resolveSpintax(text)}»
          </div>
        </div>
      )}
    </div>
  );
}

function ProxyParserSection({
  proxiesRaw, onChangeRaw,
}: {
  proxiesRaw: string;
  onChangeRaw: (v: string) => void;
}) {
  const { t } = useI18n();
  const [showParsed, setShowParsed] = useState(false);
  const parsed = proxiesRaw.trim() ? parseProxies(proxiesRaw) : [];
  const hasErrors = proxiesRaw.trim() && parsed.length === 0;

  return (
    <div>
      <div style={{ fontSize: 10, color: TG.muted, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{t.groups.proxyListHint}</span>
        {parsed.length > 0 && (
          <button
            onClick={() => setShowParsed(s => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#2de897", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: 0 }}
          >
            <CheckCircle size={10} />{parsed.length} распознано
          </button>
        )}
      </div>

      <textarea
        value={proxiesRaw}
        onChange={e => onChangeRaw(e.target.value)}
        placeholder={"socks5://user:pass@host:port\nhttp://host:port\nhost:port:user:pass"}
        rows={3}
        spellCheck={false}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${hasErrors ? "rgba(255,107,122,0.35)" : parsed.length > 0 ? "rgba(45,232,151,0.25)" : "rgba(255,255,255,0.14)"}`, borderRadius: 12, padding: "10px 12px", fontSize: 12, color: TG.text, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }}
      />

      {hasErrors && (
        <div style={{ fontSize: 10, color: "#ff6b7a", marginTop: 4 }}>
          Не удалось распознать ни одного прокси. Поддерживаемые форматы: socks5://user:pass@host:port, host:port:user:pass
        </div>
      )}

      {showParsed && parsed.length > 0 && (
        <div style={{ marginTop: 8, borderRadius: 10, background: "rgba(45,232,151,0.05)", border: "1px solid rgba(45,232,151,0.15)", padding: "8px 10px" }}>
          <div style={{ fontSize: 9, color: "#2de897", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={9} />{t.groups.parsedProxies}
          </div>
          {parsed.map((p, i) => (
            <div key={i} style={{ fontSize: 10, color: TG.textSecondary, fontFamily: "monospace", padding: "3px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ color: "#6ba8e5" }}>{p.protocol}://</span>
              {p.username && <span style={{ color: "#c4aeff" }}>{p.username}:***@</span>}
              <span style={{ color: TG.text, fontWeight: 700 }}>{p.host}:{p.port}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleSection({
  firstSendAt,
  onChangeFirstSend,
}: {
  firstSendAt: string;
  onChangeFirstSend: (v: string) => void;
}) {
  function setQuickTime(offsetMinutes: number) {
    const d = new Date(Date.now() + offsetMinutes * 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    onChangeFirstSend(local);
    haptic.light();
  }

  const QUICK = [
    { l: "+30м",  m: 30    },
    { l: "+1ч",   m: 60    },
    { l: "+3ч",   m: 180   },
    { l: "+6ч",   m: 360   },
    { l: "+12ч",  m: 720   },
    { l: "+24ч",  m: 1440  },
  ];

  return (
    <div>
      <div style={{ fontSize: 10, color: TG.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
        <Calendar size={10} />Первая отправка (необяз.)
      </div>

      <input
        type="datetime-local"
        value={firstSendAt}
        onChange={e => onChangeFirstSend(e.target.value)}
        min={new Date().toISOString().slice(0, 16)}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: firstSendAt ? TG.text : TG.muted, outline: "none", boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {QUICK.map(q => (
          <button
            key={q.l}
            onClick={() => setQuickTime(q.m)}
            style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: TG.muted, cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }}
          >
            {q.l}
          </button>
        ))}
        {firstSendAt && (
          <button
            onClick={() => { onChangeFirstSend(""); haptic.light(); }}
            style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,107,122,0.25)", background: "rgba(255,107,122,0.07)", color: "#ff6b7a", cursor: "pointer", fontWeight: 600 }}
          >
            Сбросить
          </button>
        )}
      </div>

      {firstSendAt && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#2de897", background: "rgba(45,232,151,0.07)", border: "1px solid rgba(45,232,151,0.18)", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={10} />
          Первая отправка: {new Date(firstSendAt).toLocaleString("uk-UA")}
        </div>
      )}
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ value, onChange, placeholder, type = "text", rows }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; rows?: number;
}) {
  const s: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14,
    padding: "12px 14px", fontSize: 13, color: TG.text,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  return rows
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...s, resize: "vertical" }} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={s} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function GroupBroadcastCreatePage({
  campaignId,
  onDone,
}: {
  campaignId?: number | null;
  onDone: () => void;
}) {
  const editing = !!campaignId;
  const { t, lang } = useI18n();

  const [name,         setName]         = useState("");
  const [text,         setText]         = useState("");
  const [accountId,    setAccountId]    = useState<number | "">("");
  const [groups,       setGroups]       = useState<string[]>([]);
  const [sendInterval, setSendInterval] = useState(86400);
  const [notes,        setNotes]        = useState("");
  const [mediaUrl,     setMediaUrl]     = useState("");
  const [pinMessage,   setPinMessage]   = useState(false);
  const [buttons,      setButtons]      = useState<{ text: string; url: string }[]>([]);
  const [btnText,      setBtnText]      = useState("");
  const [btnUrl,       setBtnUrl]       = useState("");
  const [minDelay,     setMinDelay]     = useState(2.5);
  const [maxDelay,     setMaxDelay]     = useState(6.0);
  const [dailyLimit,   setDailyLimit]   = useState(0);
  const [proxiesRaw,   setProxiesRaw]   = useState("");
  const [firstSendAt,  setFirstSendAt]  = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);

  const [accounts,      setAccounts]      = useState<SenderAccount[]>([]);
  const [acctGroups,    setAcctGroups]    = useState<AccountGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live spintax debounce
  const spintaxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [livePreview, setLivePreview] = useState<string[]>([]);

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    api.getGroupCampaign(campaignId).then(c => {
      setName(c.name);
      setText(c.text_template);
      setAccountId(c.sender_account_id ?? "");
      setGroups((() => { try { return JSON.parse(c.selected_groups || "[]"); } catch { return []; } })());
      setSendInterval(c.interval_seconds ?? 86400);
      setNotes(c.notes ?? "");
      setMediaUrl(c.media_url ?? "");
      setPinMessage(!!c.pin_message);
      setButtons((() => { try { return JSON.parse(c.inline_buttons || "[]").flat(); } catch { return []; } })());
      if (c.min_delay_seconds != null) setMinDelay(c.min_delay_seconds);
      if (c.max_delay_seconds != null) setMaxDelay(c.max_delay_seconds);
      if (c.daily_limit != null) setDailyLimit(c.daily_limit);
      if (c.next_send_at) {
        const d = new Date(c.next_send_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        setFirstSendAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    }).catch(() => {});
  }, [campaignId]);

  const loadGroups = useCallback(async (id: number) => {
    setLoadingGroups(true);
    try { setAcctGroups(await api.getAccountGroups(id)); }
    catch {} finally { setLoadingGroups(false); }
  }, []);

  useEffect(() => {
    if (accountId) loadGroups(Number(accountId));
    else setAcctGroups([]);
  }, [accountId, loadGroups]);

  // Debounced live preview
  useEffect(() => {
    if (!text) { setLivePreview([]); return; }
    if (spintaxTimer.current) clearTimeout(spintaxTimer.current);
    spintaxTimer.current = setTimeout(() => {
      if (showPreview && text.includes("{")) setLivePreview(preview_all(text, 4));
    }, 300);
    return () => { if (spintaxTimer.current) clearTimeout(spintaxTimer.current); };
  }, [text, showPreview]);

  const refreshGroups = async () => {
    if (!accountId) return;
    haptic.medium(); setLoadingGroups(true);
    try {
      const res = await api.refreshAccountGroups(Number(accountId));
      setAcctGroups(res.groups ?? []);
      haptic.success();
    } catch { haptic.error(); }
    finally { setLoadingGroups(false); }
  };

  function toggleGroup(gid: string) {
    setGroups(g => g.includes(gid) ? g.filter(x => x !== gid) : [...g, gid]);
  }

  function addButton() {
    if (!btnText.trim() || !btnUrl.trim()) return;
    setButtons(b => [...b, { text: btnText.trim(), url: btnUrl.trim() }]);
    setBtnText(""); setBtnUrl("");
  }

  async function submit() {
    if (!name.trim())   { setError("Введите название"); return; }
    if (!text.trim())   { setError("Введите текст сообщения"); return; }
    if (!accountId)     { setError("Выберите аккаунт-отправитель"); return; }
    if (!groups.length) { setError("Выберите хотя бы одну группу"); return; }

    haptic.medium(); setBusy(true); setError(null);

    const parsedProxies = proxiesRaw.trim() ? parseProxies(proxiesRaw) : null;

    const payload: Partial<GroupCampaign> & { proxies_override?: unknown } = {
      name:              name.trim(),
      text_template:     text.trim(),
      sender_account_id: Number(accountId),
      selected_groups:   JSON.stringify(groups),
      interval_seconds:  sendInterval,
      notes:             notes.trim() || undefined,
      media_url:         mediaUrl.trim() || undefined,
      pin_message:       pinMessage ? 1 : 0,
      inline_buttons:    buttons.length ? JSON.stringify([buttons]) : "[]",
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_limit:       dailyLimit,
      ...(parsedProxies && parsedProxies.length > 0
        ? { proxies_override: JSON.stringify(parsedProxies.map(serializeProxy)) }
        : {}),
      ...(firstSendAt ? { next_send_at: new Date(firstSendAt).toISOString() } : {}),
    };

    try {
      if (editing && campaignId) {
        await api.updateGroupCampaign(campaignId, payload);
      } else {
        await api.createGroupCampaign(payload);
      }
      haptic.success();
      onDone();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Ошибка сохранения");
      haptic.error();
    }
    setBusy(false);
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#07090f" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14, paddingLeft: 14, paddingRight: 14, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 220px)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: TG.text }}>{editing ? t.common.edit : t.groups.newGroupCampaign}</div>
          <div onClick={() => { haptic.light(); onDone(); }} style={{ padding: 8, cursor: "pointer", color: TG.muted }}>
            <X size={18} />
          </div>
        </div>

        {/* ── ОСНОВНОЕ ────────────────────────────────────────────────── */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t.groups.sectionBasic}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field value={name} onChange={setName} placeholder={t.groups.campaignName} />

            <div>
              <textarea
                value={text}
                onChange={e => { setText(e.target.value); }}
                placeholder={t.groups.messageTextPlaceholder}
                rows={4}
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
              />
              <SpintaxPreviewBlock
                text={text}
                show={showPreview}
                onToggle={() => setShowPreview(s => !s)}
              />
            </div>
          </div>
        </GlassCard>

        {/* ── АККАУНТ И РАСПИСАНИЕ ──────────────────────────────────── */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t.groups.sectionSchedule}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select
              value={accountId}
              onChange={e => setAccountId(Number(e.target.value) || "")}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: accountId ? TG.text : TG.muted, outline: "none" }}
            >
              <option value="">{t.common.selectAccount}</option>
              {accounts.filter(a => a.is_active && !a.is_banned).map(a => (
                <option key={a.id} value={a.id} style={{ background: "#0e1220" }}>
                  {a.label || a.phone} {a.session_file ? "✓" : "⚠️"}
                </option>
              ))}
            </select>

            <div>
              <div style={{ fontSize: 10, color: TG.muted, marginBottom: 6 }}>{t.groups.repeatInterval}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INTERVAL_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setSendInterval(p.value)}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px solid ${sendInterval === p.value ? "#2de897" : "rgba(255,255,255,0.12)"}`, background: sendInterval === p.value ? "rgba(45,232,151,0.15)" : "transparent", color: sendInterval === p.value ? "#2de897" : TG.muted, cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <ScheduleSection firstSendAt={firstSendAt} onChangeFirstSend={setFirstSendAt} />
          </div>
        </GlassCard>

        {/* ── ГРУППЫ ────────────────────────────────────────────────── */}
        {accountId ? (
          <GlassCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                ГРУППЫ ({groups.length} выбрано)
              </div>
              <button
                onClick={refreshGroups}
                disabled={loadingGroups}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6ba8e5", fontSize: 11, padding: 0 }}
              >
                <RefreshCw size={12} style={{ animation: loadingGroups ? "spin 0.8s linear infinite" : "none" }} />
                Обновить
              </button>
            </div>

            {loadingGroups ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(107,168,229,0.4)", borderTopColor: "#6ba8e5", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
              </div>
            ) : acctGroups.length === 0 ? (
              <div style={{ fontSize: 12, color: TG.muted, textAlign: "center", padding: "12px 0" }}>
                Групп не найдено. Нажмите «Обновить».
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <button
                    onClick={() => setGroups(acctGroups.map(g => g.group_id))}
                    style={{ flex: 1, padding: "5px", background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 8, fontSize: 10, color: "#2de897", fontWeight: 700, cursor: "pointer" }}
                  >
                    Выбрать все ({acctGroups.length})
                  </button>
                  <button
                    onClick={() => setGroups([])}
                    style={{ flex: 1, padding: "5px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: TG.muted, fontWeight: 700, cursor: "pointer" }}
                  >
                    Снять выделение
                  </button>
                </div>
                <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {acctGroups.map(g => {
                    const sel = groups.includes(g.group_id);
                    return (
                      <div
                        key={g.group_id}
                        onClick={() => toggleGroup(g.group_id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: sel ? "rgba(45,232,151,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${sel ? "rgba(45,232,151,0.3)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${sel ? "#2de897" : "rgba(255,255,255,0.2)"}`, background: sel ? "#2de897" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                          {sel && <span style={{ fontSize: 10, color: "#07090f", fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.group_title || g.group_id}</div>
                          <div style={{ fontSize: 10, color: TG.muted }}>{g.group_type}{g.member_count ? ` · ${g.member_count.toLocaleString("uk-UA")} уч.` : ""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: 16, textAlign: "center" }}>
            <Radio size={20} color={TG.muted} style={{ marginBottom: 6, opacity: 0.4 }} />
            <div style={{ fontSize: 12, color: TG.muted }}>{t.groups.selectAccountHint}</div>
          </GlassCard>
        )}

        {/* ── ДОПОЛНИТЕЛЬНО ─────────────────────────────────────────── */}
        <GlassCard style={{ padding: 16 }}>
          <div
            onClick={() => setShowAdvanced(s => !s)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.groups.sectionAdvanced}</div>
            {showAdvanced ? <ChevronUp size={14} color={TG.muted} /> : <ChevronDown size={14} color={TG.muted} />}
          </div>

          {showAdvanced && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <Field value={mediaUrl} onChange={setMediaUrl} placeholder="URL медиафайла (необяз.)" />

              {/* Proxy parser */}
              <div style={{ background: "rgba(107,168,229,0.04)", border: "1px solid rgba(107,168,229,0.14)", borderRadius: 12, padding: "12px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6ba8e5", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
                  <Globe size={10} />{t.groups.proxySection}
                </div>
                <ProxyParserSection proxiesRaw={proxiesRaw} onChangeRaw={setProxiesRaw} />
              </div>

              {/* Anti-ban delays */}
              <div style={{ background: "rgba(255,107,122,0.05)", border: "1px solid rgba(255,107,122,0.15)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", marginBottom: 10, letterSpacing: "0.06em" }}>⚡ АНТИ-БАН</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>{t.groups.minDelay}</div>
                    <input
                      type="number" min="1" max="300" step="0.5" value={minDelay}
                      onChange={e => setMinDelay(parseFloat(e.target.value) || 1)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>{t.groups.maxDelay}</div>
                    <input
                      type="number" min="1" max="600" step="0.5" value={maxDelay}
                      onChange={e => setMaxDelay(parseFloat(e.target.value) || 2)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>{t.groups.dailyLimitHint}</div>
                  <input
                    type="number" min="0" max="9999" value={dailyLimit}
                    onChange={e => setDailyLimit(parseInt(e.target.value) || 0)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Pin message */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  onClick={() => setPinMessage(s => !s)}
                  style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${pinMessage ? "#2de897" : "rgba(255,255,255,0.2)"}`, background: pinMessage ? "#2de897" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                >
                  {pinMessage && <span style={{ fontSize: 11, color: "#07090f", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: TG.textSecondary }}>{t.groups.pinMessage}</span>
              </div>

              {/* Inline buttons */}
              <div>
                <div style={{ fontSize: 11, color: TG.muted, marginBottom: 6 }}>{t.groups.inlineButtons}</div>
                {buttons.map((b, i) => (
                  <InlineButton key={i} text={b.text} url={b.url} onRemove={() => setButtons(bs => bs.filter((_, j) => j !== i))} />
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input value={btnText} onChange={e => setBtnText(e.target.value)} placeholder="Текст кнопки"
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: TG.text, outline: "none" }} />
                  <input value={btnUrl} onChange={e => setBtnUrl(e.target.value)} placeholder="URL"
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: TG.text, outline: "none" }} />
                  <button onClick={addButton} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.3)", cursor: "pointer" }}>
                    <Plus size={14} color="#2de897" />
                  </button>
                </div>
              </div>

              <Field value={notes} onChange={setNotes} placeholder="Заметки (необяз.)" />
            </div>
          )}
        </GlassCard>

        {error && (
          <div style={{ fontSize: 12, color: "#ff6b7a", padding: "8px 12px", borderRadius: 10, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.2)" }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          style={{ width: "100%", padding: "14px", borderRadius: 16, background: busy ? "rgba(45,232,151,0.5)" : "#2de897", border: "none", fontSize: 14, fontWeight: 800, color: "#07090f", cursor: busy ? "not-allowed" : "pointer", boxShadow: busy ? "none" : "0 4px 20px rgba(45,232,151,0.25)" }}
        >
          {busy ? t.common.saving : (editing ? t.editor.save : t.editor.send)}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
