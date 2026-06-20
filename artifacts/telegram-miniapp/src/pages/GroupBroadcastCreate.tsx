import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Eye, Radio, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { api, GroupCampaign, SenderAccount, AccountGroup } from "../lib/api";
import { TG } from "../lib/theme";
import { GlassCard } from "../components/GlassCard";
import { haptic } from "../lib/haptics";
import { resolve as resolveSpintax, preview_all } from "../lib/spintax";

const INTERVAL_PRESETS = [
  { label: "15 мин",  value: 900 },
  { label: "30 мин",  value: 1800 },
  { label: "1 ч",     value: 3600 },
  { label: "3 ч",     value: 10800 },
  { label: "6 ч",     value: 21600 },
  { label: "12 ч",    value: 43200 },
  { label: "24 ч",    value: 86400 },
  { label: "3 дня",   value: 259200 },
  { label: "7 дней",  value: 604800 },
];

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

export function GroupBroadcastCreatePage({
  campaignId,
  onDone,
}: {
  campaignId?: number | null;
  onDone: () => void;
}) {
  const editing = !!campaignId;

  const [name,         setName]         = useState("");
  const [text,         setText]         = useState("");
  const [accountId,    setAccountId]    = useState<number | "">("");
  const [groups,       setGroups]       = useState<string[]>([]);
  const [interval,     setInterval]     = useState(86400);
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [spintaxPreviews, setSpintaxPreviews] = useState<string[]>([]);

  const [accounts,     setAccounts]     = useState<SenderAccount[]>([]);
  const [acctGroups,   setAcctGroups]   = useState<AccountGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load accounts
  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  // Load existing campaign for edit
  useEffect(() => {
    if (!campaignId) return;
    api.getGroupCampaign(campaignId).then(c => {
      setName(c.name);
      setText(c.text_template);
      setAccountId(c.sender_account_id ?? "");
      setGroups((() => { try { return JSON.parse(c.selected_groups || "[]"); } catch { return []; } })());
      setInterval(c.interval_seconds ?? 86400);
      setNotes(c.notes ?? "");
      setMediaUrl(c.media_url ?? "");
      setPinMessage(!!c.pin_message);
      setButtons((() => { try { return JSON.parse(c.inline_buttons || "[]").flat(); } catch { return []; } })());
      if (c.min_delay_seconds != null) setMinDelay(c.min_delay_seconds);
      if (c.max_delay_seconds != null) setMaxDelay(c.max_delay_seconds);
      if (c.daily_limit != null) setDailyLimit(c.daily_limit);
    }).catch(() => {});
  }, [campaignId]);

  // Load groups when account changes
  const loadGroups = useCallback(async (id: number) => {
    setLoadingGroups(true);
    try { setAcctGroups(await api.getAccountGroups(id)); }
    catch {} finally { setLoadingGroups(false); }
  }, []);

  useEffect(() => {
    if (accountId) loadGroups(Number(accountId));
    else setAcctGroups([]);
  }, [accountId, loadGroups]);

  const refreshGroups = async () => {
    if (!accountId) return;
    haptic.medium(); setLoadingGroups(true);
    try {
      const res = await api.refreshAccountGroups(Number(accountId));
      setAccctGroups(res.groups ?? []);
      haptic.success();
    } catch { haptic.error(); }
    finally { setLoadingGroups(false); }
  };

  function setAccctGroups(gs: AccountGroup[]) { setAcctGroups(gs); }

  // Spintax preview
  useEffect(() => {
    if (!showPreview || !text) return;
    setSpintaxPreviews(preview_all(text, 4));
  }, [showPreview, text]);

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

    const payload: Partial<GroupCampaign> = {
      name:              name.trim(),
      text_template:     text.trim(),
      sender_account_id: Number(accountId),
      selected_groups:   JSON.stringify(groups),
      interval_seconds:  interval,
      notes:             notes.trim() || undefined,
      media_url:         mediaUrl.trim() || undefined,
      pin_message:       pinMessage ? 1 : 0,
      inline_buttons:    buttons.length ? JSON.stringify([buttons]) : "[]",
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_limit:       dailyLimit,
    };

    try {
      if (editing && campaignId) {
        await api.updateGroupCampaign(campaignId, payload);
      } else {
        await api.createGroupCampaign(payload);
      }
      haptic.success();
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "Ошибка сохранения");
      haptic.error();
    }
    setBusy(false);
  }

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, type = "text", rows?: number) =>
    rows ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }} />
    );

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#07090f" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14, paddingLeft: 14, paddingRight: 14, paddingBottom: "calc(env(safe-area-inset-bottom, 34px) + 100px)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: TG.text }}>{editing ? "Редактировать" : "Новая групповая"}</div>
          <div onClick={() => { haptic.light(); onDone(); }} style={{ padding: 8, cursor: "pointer", color: TG.muted }}>
            <X size={18} />
          </div>
        </div>

        {/* Basic fields */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, marginBottom: 10 }}>ОСНОВНОЕ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inp(name, setName, "Название рассылки")}
            {inp(text, v => { setText(v); setShowPreview(false); }, "Текст сообщения (поддерживается {вариант1|вариант2})", "text", 4)}

            {/* Spintax preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setShowPreview(s => !s)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6ba8e5", fontSize: 11, fontWeight: 700, padding: 0 }}>
                <Eye size={13} />{showPreview ? "Скрыть" : "Превью спинтакс"}
              </button>
            </div>

            {showPreview && spintaxPreviews.length > 0 && (
              <div style={{ borderRadius: 10, background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.2)", padding: 10 }}>
                <div style={{ fontSize: 10, color: "#6ba8e5", fontWeight: 700, marginBottom: 6 }}>ВАРИАНТЫ</div>
                {spintaxPreviews.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: TG.textSecondary, borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", paddingTop: i > 0 ? 6 : 0, marginTop: i > 0 ? 6 : 0, lineHeight: 1.5 }}>{p}</div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Account & interval */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, marginBottom: 10 }}>АККАУНТ И РАСПИСАНИЕ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select value={accountId} onChange={e => setAccountId(Number(e.target.value) || "")}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: accountId ? TG.text : TG.muted, outline: "none" }}>
              <option value="">Выберите аккаунт</option>
              {accounts.filter(a => a.is_active && !a.is_banned).map(a => (
                <option key={a.id} value={a.id} style={{ background: "#0e1220" }}>
                  {a.label || a.phone} {a.session_file ? "✓" : "⚠️"}
                </option>
              ))}
            </select>

            <div>
              <div style={{ fontSize: 11, color: TG.muted, marginBottom: 6 }}>Интервал отправки</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INTERVAL_PRESETS.map(p => (
                  <button key={p.value} onClick={() => setInterval(p.value)}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px solid ${interval === p.value ? "#2de897" : "rgba(255,255,255,0.12)"}`, background: interval === p.value ? "rgba(45,232,151,0.15)" : "transparent", color: interval === p.value ? "#2de897" : TG.muted, cursor: "pointer", fontWeight: 600 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Groups */}
        {accountId ? (
          <GlassCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted }}>
                ГРУППЫ ({groups.length} выбрано)
              </div>
              <button onClick={refreshGroups} disabled={loadingGroups} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6ba8e5", fontSize: 11, padding: 0 }}>
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
                Групп не найдено. Нажми «Обновить».
              </div>
            ) : (
              <>
                {/* Select all / none */}
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <button onClick={() => setGroups(acctGroups.map(g => g.group_id))}
                    style={{ flex: 1, padding: "5px", background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)", borderRadius: 8, fontSize: 10, color: "#2de897", fontWeight: 700, cursor: "pointer" }}>
                    Выбрать все ({acctGroups.length})
                  </button>
                  <button onClick={() => setGroups([])}
                    style={{ flex: 1, padding: "5px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: TG.muted, fontWeight: 700, cursor: "pointer" }}>
                    Снять выделение
                  </button>
                </div>
              <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {acctGroups.map(g => {
                  const sel = groups.includes(g.group_id);
                  return (
                    <div key={g.group_id} onClick={() => toggleGroup(g.group_id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: sel ? "rgba(45,232,151,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${sel ? "rgba(45,232,151,0.3)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${sel ? "#2de897" : "rgba(255,255,255,0.2)"}`, background: sel ? "#2de897" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {sel && <span style={{ fontSize: 10, color: "#07090f", fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.group_title || g.group_id}</div>
                        <div style={{ fontSize: 10, color: TG.muted }}>{g.group_type} {g.member_count ? `· ${g.member_count.toLocaleString("ru")}` : ""}</div>
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
            <div style={{ fontSize: 12, color: TG.muted }}>Выберите аккаунт для загрузки групп</div>
          </GlassCard>
        )}

        {/* Advanced */}
        <GlassCard style={{ padding: 16 }}>
          <div onClick={() => setShowAdvanced(s => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted }}>ДОПОЛНИТЕЛЬНО</div>
            {showAdvanced ? <ChevronUp size={14} color={TG.muted} /> : <ChevronDown size={14} color={TG.muted} />}
          </div>

          {showAdvanced && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {inp(mediaUrl, setMediaUrl, "URL медиафайла (необяз.)")}

              {/* Anti-ban delays */}
              <div style={{ background: "rgba(255,107,122,0.05)", border: "1px solid rgba(255,107,122,0.15)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#ff6b7a", marginBottom: 10, letterSpacing: "0.06em" }}>⚡ АНТИ-БАН</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>Мин. задержка (сек)</div>
                    <input type="number" min="1" max="300" step="0.5" value={minDelay}
                      onChange={e => setMinDelay(parseFloat(e.target.value) || 1)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>Макс. задержка (сек)</div>
                    <input type="number" min="1" max="600" step="0.5" value={maxDelay}
                      onChange={e => setMaxDelay(parseFloat(e.target.value) || 2)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>Лимит в день (0 = нет лимита)</div>
                  <input type="number" min="0" max="9999" value={dailyLimit}
                    onChange={e => setDailyLimit(parseInt(e.target.value) || 0)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 13, color: TG.text, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div onClick={() => setPinMessage(s => !s)} style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${pinMessage ? "#2de897" : "rgba(255,255,255,0.2)"}`, background: pinMessage ? "#2de897" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {pinMessage && <span style={{ fontSize: 11, color: "#07090f", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: TG.textSecondary }}>Закрепить сообщение</span>
              </div>

              {/* Inline buttons */}
              <div>
                <div style={{ fontSize: 11, color: TG.muted, marginBottom: 6 }}>Инлайн-кнопки</div>
                {buttons.map((b, i) => (
                  <InlineButton key={i} text={b.text} url={b.url} onRemove={() => setButtons(bs => bs.filter((_, j) => j !== i))} />
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input value={btnText} onChange={e => setBtnText(e.target.value)} placeholder="Текст кнопки" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: TG.text, outline: "none" }} />
                  <input value={btnUrl}  onChange={e => setBtnUrl(e.target.value)}  placeholder="URL" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: TG.text, outline: "none" }} />
                  <button onClick={addButton} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(45,232,151,0.12)", border: "1px solid rgba(45,232,151,0.3)", cursor: "pointer" }}>
                    <Plus size={14} color="#2de897" />
                  </button>
                </div>
              </div>

              {inp(notes, setNotes, "Заметки (необяз.)")}
            </div>
          )}
        </GlassCard>

        {error && (
          <div style={{ fontSize: 12, color: "#ff6b7a", padding: "8px 12px", borderRadius: 10, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.2)" }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "14px", borderRadius: 16, background: busy ? "rgba(45,232,151,0.5)" : "#2de897", border: "none", fontSize: 14, fontWeight: 800, color: "#07090f", cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Сохранение…" : (editing ? "Сохранить" : "Создать рассылку")}
        </button>
      </div>
    </div>
  );
}
