import { useState, useEffect, useMemo } from "react";
import { useI18n } from "../lib/i18n";
import { CheckCircle, Calendar, Sparkles, X, Eye, Timer, FlaskConical, Shuffle, BookOpen, Wand2, Loader2 } from "lucide-react";
import { api, Campaign, MessageTemplate } from "../lib/api";
import { TG, BLUR, BLUR_HEAVY } from "../lib/theme";
import { FullSpinner } from "../components/Spinner";
import { haptic } from "../lib/haptics";
import { getStoredSecret } from "./LockScreen";
import { spintaxStats } from "../lib/spintax";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const DELAY_PRESETS_UA = [
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
const DELAY_PRESETS_EN = [
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

function GlassInput({
  value, onChange, onFocus, onBlur, placeholder, focused, type = "text", style: extra,
}: {
  value: string; onChange: (v: string) => void;
  onFocus?: () => void; onBlur?: () => void;
  placeholder?: string; focused?: boolean; type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative" }}>
      {focused && (
        <div style={{ position: "absolute", inset: -1, borderRadius: 16, background: "linear-gradient(135deg,rgba(91,150,212,0.48),rgba(45,232,151,0.22))", zIndex: 0, pointerEvents: "none" }} />
      )}
      <input
        type={type}
        style={{
          position: "relative", zIndex: 1,
          width: "100%", padding: "13px 15px",
          background: focused ? "rgba(91,150,212,0.08)" : TG.inputBg,
          backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
          border: `1px solid ${focused ? "rgba(91,150,212,0.48)" : TG.inputBorder}`,
          borderRadius: 15, color: TG.text, fontSize: 14,
          outline: "none", boxSizing: "border-box",
          transition: "border-color 0.2s, background 0.2s",
          ...extra,
        } as React.CSSProperties}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </div>
  );
}

function GlassTextarea({
  value, onChange, onFocus, onBlur, placeholder, focused, minHeight = 130, accentColor,
}: {
  value: string; onChange: (v: string) => void;
  onFocus?: () => void; onBlur?: () => void;
  placeholder?: string; focused?: boolean; minHeight?: number;
  accentColor?: string;
}) {
  const accent = accentColor ?? "rgba(91,150,212,";
  return (
    <div style={{ position: "relative" }}>
      {focused && (
        <div style={{ position: "absolute", inset: -1, borderRadius: 16, background: `linear-gradient(135deg,${accent}0.48),rgba(45,232,151,0.22))`, zIndex: 0, pointerEvents: "none" }} />
      )}
      <textarea
        style={{
          position: "relative", zIndex: 1,
          width: "100%", padding: "13px 15px",
          background: focused ? `${accent}0.08)` : TG.inputBg,
          backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
          border: `1px solid ${focused ? `${accent}0.48)` : TG.inputBorder}`,
          borderRadius: 15, color: TG.text, fontSize: 14,
          outline: "none", boxSizing: "border-box",
          transition: "border-color 0.2s, background 0.2s",
          resize: "none", lineHeight: 1.6, fontFamily: "inherit",
          minHeight,
        } as React.CSSProperties}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <label style={{ fontSize: 10, color: TG.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em" }}>{children}</label>
      {hint && <span style={{ fontSize: 11, color: TG.muted }}>{hint}</span>}
    </div>
  );
}

export function EditorPage({ campaignId, onDone }: { campaignId: number | null; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [loading, setLoading]           = useState(campaignId !== null);
  const [name, setName]                 = useState("");
  const [text, setText]                 = useState("");
  const [textB, setTextB]               = useState("");
  const [notes, setNotes]               = useState("");
  const [scheduledAt, setScheduledAt]   = useState("");
  const [nameFocus, setNameFocus]       = useState(false);
  const [textFocus, setTextFocus]       = useState(false);
  const [textBFocus, setTextBFocus]     = useState(false);
  const [notesFocus, setNotesFocus]     = useState(false);
  const [busy, setBusy]                 = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [delay, setDelay]               = useState("3600");
  const [dryRun, setDryRun]             = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [abMode, setAbMode]             = useState(false);
  const [audienceTags, setAudienceTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag]   = useState<string>("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates]       = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // ── AI Spintax Generator ────────────────────────────────────────────────
  const [showAiPanel, setShowAiPanel]   = useState(false);
  const [aiSeed, setAiSeed]             = useState("");
  const [aiTone, setAiTone]             = useState<"casual" | "professional" | "direct">("casual");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);
  const [aiEngine, setAiEngine]         = useState<string | null>(null);

  useEffect(() => {
    api.getAudienceTags().then(setAudienceTags).catch(() => {});
    api.getAudienceCount().then(r => setAudienceCount(r.count)).catch(() => {});
  }, []);

  async function generateSpintax() {
    if (!aiSeed.trim() || aiGenerating) return;
    haptic.medium();
    setAiGenerating(true);
    setAiError(null);
    setAiEngine(null);
    try {
      const secret = getStoredSecret();
      const res = await fetch(`${API_BASE}/api/v3/spintax/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ seed_text: aiSeed.trim(), tone: aiTone }),
      });
      const data = await res.json() as { spintax?: string; engine?: string; error?: string };
      if (!res.ok || !data.spintax) {
        setAiError(data.error ?? `HTTP ${res.status}`);
        haptic.error();
        return;
      }
      setText(data.spintax);
      setAiEngine(data.engine ?? null);
      setShowPreview(true);
      haptic.success();
    } catch (e) {
      setAiError(String(e));
      haptic.error();
    } finally {
      setAiGenerating(false);
    }
  }

  function openTemplates() {
    haptic.light();
    setShowTemplates(true);
    if (templates.length === 0) {
      setLoadingTemplates(true);
      api.getTemplates().then(setTemplates).catch(() => {}).finally(() => setLoadingTemplates(false));
    }
  }

  function applyTemplate(t: MessageTemplate) {
    haptic.success();
    setText(t.text);
    if (!name.trim()) setName(t.name);
    setShowTemplates(false);
    api.useTemplate(t.id).catch(() => {});
  }

  useEffect(() => {
    setAudienceCount(null);
    api.getAudienceCount(selectedTag || undefined).then(r => setAudienceCount(r.count)).catch(() => {});
  }, [selectedTag]);

  useEffect(() => {
    if (!campaignId) return;
    api.getCampaign(campaignId).then(c => {
      setName(c.name); setText(c.text_template); setNotes(c.notes ?? "");
      if (c.send_delay_seconds) setDelay(String(c.send_delay_seconds));
      if (c.dry_run) setDryRun(Boolean(c.dry_run));
      if ((c as any).scheduled_tag) setSelectedTag((c as any).scheduled_tag);
      if (c.scheduled_at) { setScheduledAt(c.scheduled_at.slice(0, 16)); setScheduleMode(true); }
      if (c.ab_text_b) { setTextB(c.ab_text_b); setAbMode(true); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [campaignId]);

  function resolveSpintax(src: string, seed: number): string {
    let r = src;
    let safety = 0;
    const names  = lang === "ua" ? ["Іван", "Олексій", "Марія", "Дмитро", "Наталя"] : ["Ivan", "Oleksiy", "Maria", "Dmytro", "Natalia"];
    const logins = ["ivan_fuel", "alex99", "maria_m", "dmitry_k", "natasha_oil"];
    const idx = seed % names.length;
    r = r.replace(/\{first_name\}/g, names[idx]!).replace(/\{username\}/g, logins[idx]!).replace(/\{promo\}/g, "FUEL10");
    while (/\{([^{}|]+(?:\|[^{}|]*)+)\}/.test(r) && ++safety < 30) {
      r = r.replace(/\{([^{}|]+(?:\|[^{}|]*)+)\}/g, (_, opts) => {
        const ch = opts.split("|");
        return ch[(seed * 13 + safety * 7 + ch.length) % ch.length];
      });
    }
    return r;
  }

  const spintaxSamples = useMemo(() => {
    if (!showPreview) return [];
    return [0, 1, 2].map(i => resolveSpintax(text, i));
  }, [text, showPreview]);

  const aiStats = useMemo(() => {
    if (!aiEngine || aiError) return null;
    return spintaxStats(text);
  }, [text, aiEngine, aiError]);

  const isEdit = campaignId !== null;
  const charCount = text.length;
  const valid = name.trim().length > 0 && text.trim().length > 0 && (!abMode || textB.trim().length > 0);
  const vars = ["{first_name}", "{username}", "{promo}"];

  async function handleSave(launch?: boolean) {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    const isoScheduled = scheduleMode && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
    try {
      const payload: Partial<Campaign> = {
        name: name.trim(), text_template: text.trim(),
        notes: notes.trim() || undefined,
        scheduled_at: isoScheduled,
        send_delay_seconds: Math.max(1, parseInt(delay) || 3600),
        dry_run: dryRun ? 1 : 0,
        scheduled_tag: selectedTag || null,
        ab_text_b: abMode ? textB.trim() : null,
      };
      let savedId: number;
      if (isEdit && campaignId) {
        await api.updateCampaign(campaignId, payload);
        savedId = campaignId;
      } else {
        const created = await api.createCampaign(payload as any);
        savedId = created.id;
      }
      if (launch) {
        await api.actionCampaign(savedId, "running");
      } else if (isoScheduled) {
        await api.actionCampaign(savedId, "schedule");
      }
      haptic.success();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onDone(); }, 1400);
    } catch { haptic.error(); setError(t.editor.errorSaveFull); }
    setBusy(false);
  }

  const CloseBtn = (
    <button onClick={() => { haptic.light(); onDone(); }} className="tap" style={{
      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)",
      borderRadius: 11, padding: 8, display: "flex", color: TG.muted,
    }}>
      <X size={17} />
    </button>
  );

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgba(7,9,15,0.92)", backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY }}>
      <div style={{
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: TG.text }}>{isEdit ? t.editor.editTitle : t.editor.title}</span>
        {CloseBtn}
      </div>
      <FullSpinner />
    </div>
  );

  if (success) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgba(7,9,15,0.92)", backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }} className="scale-in">
        <div style={{
          width: 96, height: 96, borderRadius: 30,
          background: "linear-gradient(145deg,rgba(45,232,151,0.28),rgba(45,232,151,0.08))",
          border: "1px solid rgba(45,232,151,0.32)",
          backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 56px rgba(45,232,151,0.32), 0 1px 0 rgba(255,255,255,0.16) inset",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.14),transparent)", borderRadius: "30px 30px 0 0" }} />
          <CheckCircle size={44} color={TG.green} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", background: "linear-gradient(135deg,#2de897,#5b96d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 8 }}>
            {isEdit ? t.editor.saved : t.editor.createdOk}
          </div>
          <div style={{ fontSize: 13, color: TG.muted }}>{t.editor.returning}</div>
        </div>
      </div>
    </div>
  );

  const halfCount = audienceCount !== null ? Math.floor(audienceCount / 2) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgba(7,9,15,0.94)", backdropFilter: "blur(60px) saturate(200%)", WebkitBackdropFilter: "blur(60px) saturate(200%)" }}>
      {/* Sheet header */}
      <div style={{
        padding: "8px 16px 13px", flexShrink: 0, position: "relative",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 100%)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.16)", margin: "0 auto 14px" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22) 50%,transparent)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.4px", background: "linear-gradient(135deg,#eef2ff,rgba(149,196,245,0.85))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {isEdit ? t.editor.editTitle : t.editor.title}
            </div>
            <div style={{ fontSize: 11.5, color: TG.muted, marginTop: 2 }}>
              {isEdit ? t.editor.editTitle : t.editor.title}
            </div>
          </div>
          {CloseBtn}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 18, paddingLeft: 15, paddingRight: 15, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 220px)", WebkitOverflowScrolling: "touch" }}>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>{t.editor.name}</FieldLabel>
          <GlassInput value={name} onChange={setName} focused={nameFocus}
            onFocus={() => setNameFocus(true)} onBlur={() => setNameFocus(false)}
            placeholder={t.editor.namePlaceholder} />
        </div>

        {/* A/B Test toggle */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Shuffle size={13} color={abMode ? "#c4aeff" : TG.muted} />
              <span style={{ fontSize: 10, color: abMode ? "#c4aeff" : TG.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em" }}>{t.editor.abTest}</span>
            </div>
            <button onClick={() => { haptic.select(); setAbMode(m => !m); if (abMode) setTextB(""); }} className="tap" style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              border: `1px solid ${abMode ? "rgba(196,174,255,0.40)" : "rgba(255,255,255,0.11)"}`,
              background: abMode ? "rgba(196,174,255,0.13)" : "rgba(255,255,255,0.05)",
              color: abMode ? "#c4aeff" : TG.muted,
              boxShadow: abMode ? "0 0 16px rgba(196,174,255,0.20)" : "none",
            }}>
              {abMode ? t.editor.toggleOn : t.editor.toggleOff}
            </button>
          </div>

          {abMode && (
            <div style={{ marginTop: 10, padding: "10px 13px", background: "rgba(196,174,255,0.06)", border: "1px solid rgba(196,174,255,0.18)", borderRadius: 12, fontSize: 11, color: TG.muted, lineHeight: 1.5 }}>
              {t.editor.abSplitHint}
              {halfCount !== null && (
                <span style={{ marginLeft: 6 }}>
                  {t.editor.variantUsers(halfCount.toLocaleString(lang === "ua" ? "uk-UA" : lang))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Text — single or A/B */}
        {!abMode ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: TG.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em" }}>{t.editor.msgText}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: TG.muted }}>{charCount}</span>
                <button onClick={openTemplates} className="tap" style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  border: "1px solid rgba(196,174,255,0.30)",
                  background: "rgba(196,174,255,0.09)",
                  color: "#c4aeff",
                }}>
                  <BookOpen size={11} /> {t.editor.templatesBtn}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {vars.map(v => (
                <button key={v} onClick={() => { haptic.select(); setText(prev => prev + v); }} className="tap" style={{
                  padding: "5px 11px", borderRadius: 10,
                  border: "1px solid rgba(91,150,212,0.30)",
                  background: "rgba(91,150,212,0.10)",
                  backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                  color: TG.accentLight, fontSize: 11, fontFamily: "monospace", fontWeight: 700,
                }}>
                  {v}
                </button>
              ))}
            </div>

            {/* ── AI Spintax Generator Panel ── */}
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => { haptic.select(); setShowAiPanel(p => !p); setAiError(null); }}
                className="tap"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 13px", borderRadius: 12, fontSize: 11, fontWeight: 800,
                  border: `1px solid ${showAiPanel ? "rgba(196,174,255,0.50)" : "rgba(196,174,255,0.22)"}`,
                  background: showAiPanel ? "rgba(196,174,255,0.13)" : "rgba(196,174,255,0.06)",
                  color: showAiPanel ? "#c4aeff" : TG.muted,
                  width: "100%", justifyContent: "center",
                  boxShadow: showAiPanel ? "0 0 18px rgba(196,174,255,0.18)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <Wand2 size={12} />
                {lang === "ua" ? "✦ AI Спінтакс" : "✦ AI Spintax"}
                <span style={{ fontSize: 10, opacity: 0.65, marginLeft: 2 }}>
                  {showAiPanel ? "▲" : "▼"}
                </span>
              </button>

              {showAiPanel && (
                <div style={{
                  marginTop: 8, padding: "14px 14px 16px",
                  background: "rgba(196,174,255,0.05)",
                  border: "1px solid rgba(196,174,255,0.20)",
                  borderRadius: 16,
                  backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
                }}>
                  {/* Tone selector */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: TG.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 7 }}>
                      {lang === "ua" ? "Тон повідомлення" : "Message tone"}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["casual", "professional", "direct"] as const).map(t => {
                        const labels: Record<string, { ua: string; en: string }> = {
                          casual:       { ua: "Розмовний", en: "Casual" },
                          professional: { ua: "Офіційний", en: "Professional" },
                          direct:       { ua: "Прямий",   en: "Direct" },
                        };
                        const active = aiTone === t;
                        return (
                          <button key={t} onClick={() => { haptic.select(); setAiTone(t); }} className="tap" style={{
                            flex: 1, padding: "6px 0", borderRadius: 10, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${active ? "rgba(196,174,255,0.50)" : "rgba(255,255,255,0.10)"}`,
                            background: active ? "rgba(196,174,255,0.18)" : "rgba(255,255,255,0.04)",
                            color: active ? "#c4aeff" : TG.muted,
                            transition: "all 0.15s",
                          }}>
                            {lang === "ua" ? labels[t]!.ua : labels[t]!.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seed text */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: TG.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 7 }}>
                      {lang === "ua" ? "Базове повідомлення" : "Base message"}
                    </div>
                    <GlassTextarea
                      value={aiSeed}
                      onChange={setAiSeed}
                      minHeight={90}
                      accentColor="rgba(196,174,255,"
                      placeholder={lang === "ua"
                        ? "Напиши звичайне повідомлення — AI перетворить його у спінтакс з сотнями варіацій…"
                        : "Write a plain message — AI will turn it into spintax with hundreds of variations…"}
                    />
                  </div>

                  {/* Error */}
                  {aiError && (
                    <div style={{ marginBottom: 10, padding: "9px 12px", background: "rgba(255,107,122,0.09)", border: "1px solid rgba(255,107,122,0.26)", borderRadius: 11, fontSize: 12, color: TG.red }}>
                      {aiError}
                    </div>
                  )}

                  {/* Success badge + Regenerate */}
                  {aiEngine && !aiError && !aiGenerating && (
                    <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, padding: "7px 12px", background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.22)", borderRadius: 11, fontSize: 11, color: TG.green, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <Sparkles size={11} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lang === "ua"
                            ? `(${aiEngine}) — шаблон оновлено ↓`
                            : `(${aiEngine}) — template updated ↓`}
                        </span>
                      </div>
                      <button
                        onClick={generateSpintax}
                        disabled={!aiSeed.trim() || aiGenerating}
                        className="tap"
                        style={{
                          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                          padding: "7px 12px", borderRadius: 11, fontSize: 11, fontWeight: 800,
                          border: "1px solid rgba(196,174,255,0.40)",
                          background: "rgba(196,174,255,0.12)",
                          color: "#c4aeff",
                          cursor: aiSeed.trim() ? "pointer" : "not-allowed",
                          opacity: aiSeed.trim() ? 1 : 0.5,
                        }}
                      >
                        <Wand2 size={11} />
                        {lang === "ua" ? "Ще раз" : "Regenerate"}
                      </button>
                    </div>
                  )}

                  {/* Quality stats badge */}
                  {aiStats && (
                    <div style={{
                      marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap",
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 9,
                        background: "rgba(196,174,255,0.10)", border: "1px solid rgba(196,174,255,0.25)",
                        fontSize: 11, fontWeight: 700, color: "#c4aeff",
                      }}>
                        🔀 {aiStats.groups} {lang === "ua" ? "груп" : "groups"}
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 9,
                        background: "rgba(255,201,70,0.09)", border: "1px solid rgba(255,201,70,0.25)",
                        fontSize: 11, fontWeight: 700, color: TG.yellow,
                      }}>
                        ✨ ~{aiStats.estimated >= 1000
                          ? `${(aiStats.estimated / 1000).toFixed(0)}k`
                          : aiStats.estimated} {lang === "ua" ? "варіацій" : "combos"}
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 9,
                        background: aiStats.valid ? "rgba(45,232,151,0.08)" : "rgba(255,107,122,0.09)",
                        border: `1px solid ${aiStats.valid ? "rgba(45,232,151,0.25)" : "rgba(255,107,122,0.25)"}`,
                        fontSize: 11, fontWeight: 700,
                        color: aiStats.valid ? TG.green : TG.red,
                      }}>
                        {aiStats.valid
                          ? (lang === "ua" ? "✓ Валідний" : "✓ Valid")
                          : (lang === "ua" ? "✗ Помилка дужок" : "✗ Bracket error")}
                      </div>
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={generateSpintax}
                    disabled={!aiSeed.trim() || aiGenerating}
                    className="tap"
                    style={{
                      width: "100%", padding: "11px 0",
                      background: aiSeed.trim() && !aiGenerating
                        ? "linear-gradient(135deg,rgba(196,174,255,0.30),rgba(196,174,255,0.15))"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${aiSeed.trim() && !aiGenerating ? "rgba(196,174,255,0.45)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 13,
                      color: aiSeed.trim() && !aiGenerating ? "#c4aeff" : TG.muted,
                      fontSize: 13, fontWeight: 800,
                      cursor: aiSeed.trim() && !aiGenerating ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      transition: "all 0.15s",
                      boxShadow: aiSeed.trim() && !aiGenerating ? "0 4px 20px rgba(196,174,255,0.18)" : "none",
                    }}
                  >
                    {aiGenerating
                      ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {lang === "ua" ? "Генерація…" : "Generating…"}</>
                      : <><Wand2 size={13} /> {lang === "ua" ? "Оптимізувати з AI" : "Optimize with AI"}</>}
                  </button>
                </div>
              )}
            </div>

            <GlassTextarea value={text} onChange={setText} focused={textFocus} minHeight={170}
              onFocus={() => setTextFocus(true)} onBlur={() => setTextFocus(false)}
              placeholder={lang === "ua" ? "Привіт, {first_name}! 👋\n\nПишемо тобі, тому що..." : "Hey {first_name}! 👋\n\nWe're writing to you because..."} />
            {charCount > 4000 && <div style={{ marginTop: 6, fontSize: 11, color: TG.red, fontWeight: 600 }}>{t.editor.textTooLong}</div>}
            {text.includes("|") && text.includes("{") && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => { haptic.select(); setShowPreview(p => !p); }} className="tap" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 12, border: "1px solid rgba(107,168,229,0.30)", background: "rgba(107,168,229,0.09)", color: TG.accentLight, fontSize: 11, fontWeight: 700 }}>
                  <Eye size={12} /> {showPreview ? t.editor.hidePreview : t.editor.showPreview}
                </button>
                {showPreview && spintaxSamples.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {spintaxSamples.map((sample, i) => {
                      const names = lang === "ua" ? ["Іван", "Олексій", "Марія"] : ["Ivan", "Oleksiy", "Maria"];
                      return (
                        <div key={i} style={{ padding: "11px 13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 13, fontSize: 13, color: TG.textSecondary, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          <div style={{ fontSize: 9, color: TG.muted, fontWeight: 800, textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.08em" }}>{t.editor.variantLabel(i + 1, names[i])}</div>
                          {sample}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* A/B mode: two text areas */
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {vars.map(v => (
                <button key={v} onClick={() => {
                  haptic.select();
                  if (textFocus) setText(prev => prev + v);
                  else if (textBFocus) setTextB(prev => prev + v);
                  else setText(prev => prev + v);
                }} className="tap" style={{
                  padding: "5px 11px", borderRadius: 10,
                  border: "1px solid rgba(91,150,212,0.30)",
                  background: "rgba(91,150,212,0.10)",
                  backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                  color: TG.accentLight, fontSize: 11, fontFamily: "monospace", fontWeight: 700,
                }}>
                  {v}
                </button>
              ))}
            </div>

            {/* Split indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.07)" }}>
                <div style={{ height: "100%", width: "50%", background: "linear-gradient(90deg,#6ba8e5,#c4aeff)", borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c4aeff", flexShrink: 0 }}>50% / 50%</span>
              <div style={{ flex: 1, height: 4, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.07)" }}>
                <div style={{ height: "100%", width: "50%", background: "linear-gradient(90deg,#c4aeff,#6ba8e5)", borderRadius: 4, marginLeft: "50%" }} />
              </div>
            </div>

            {/* Variant A */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(107,168,229,0.18)", border: "1px solid rgba(107,168,229,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#6ba8e5" }}>A</div>
                  <span style={{ fontSize: 10, color: "#6ba8e5", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.editor.variantA}</span>
                  {halfCount !== null && <span style={{ fontSize: 10, color: TG.muted }}>{t.editor.userCountShort(halfCount.toLocaleString(lang === "ua" ? "uk-UA" : lang))}</span>}
                </div>
                <span style={{ fontSize: 11, color: TG.muted }}>{text.length} {t.editor.chars}</span>
              </div>
              <GlassTextarea value={text} onChange={setText} focused={textFocus} minHeight={130}
                onFocus={() => { setTextFocus(true); setTextBFocus(false); }}
                onBlur={() => setTextFocus(false)}
                accentColor="rgba(107,168,229,"
                placeholder={lang === "ua" ? "Привіт, {first_name}! Акція A:\n-10 грн знижки на заправку" : "Hey {first_name}! Promo A:\n10 UAH off your next fill-up"} />
            </div>

            {/* Variant B */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(196,174,255,0.18)", border: "1px solid rgba(196,174,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#c4aeff" }}>B</div>
                  <span style={{ fontSize: 10, color: "#c4aeff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.editor.variantB}</span>
                  {halfCount !== null && <span style={{ fontSize: 10, color: TG.muted }}>{t.editor.userCountShort(halfCount.toLocaleString(lang === "ua" ? "uk-UA" : lang))}</span>}
                </div>
                <span style={{ fontSize: 11, color: TG.muted }}>{textB.length} {t.editor.chars}</span>
              </div>
              <GlassTextarea value={textB} onChange={setTextB} focused={textBFocus} minHeight={130}
                onFocus={() => { setTextBFocus(true); setTextFocus(false); }}
                onBlur={() => setTextBFocus(false)}
                accentColor="rgba(196,174,255,"
                placeholder={lang === "ua" ? "Привіт, {first_name}! Акція B:\nБезкоштовна мийка від заправки 30л" : "Hey {first_name}! Promo B:\nFree car wash with 30L+ fill-up"} />
            </div>

            {!textB.trim() && (
              <div style={{ marginTop: 8, fontSize: 11, color: TG.red, fontWeight: 600 }}>{t.editor.textTooLong}</div>
            )}
          </div>
        )}

        {/* Schedule */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: scheduleMode ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={13} color={TG.yellow} />
              <FieldLabel>{t.editor.scheduleToggle}</FieldLabel>
            </div>
            <button onClick={() => { haptic.select(); setScheduleMode(m => !m); if (scheduleMode) setScheduledAt(""); }} className="tap" style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              border: `1px solid ${scheduleMode ? "rgba(255,201,70,0.40)" : "rgba(255,255,255,0.11)"}`,
              background: scheduleMode ? "rgba(255,201,70,0.13)" : "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              color: scheduleMode ? TG.yellow : TG.muted,
              boxShadow: scheduleMode ? "0 0 16px rgba(255,201,70,0.20)" : "none",
            }}>
              {scheduleMode ? t.editor.toggleOn : t.editor.toggleOff}
            </button>
          </div>
          {scheduleMode && (
            <input type="datetime-local" style={{
              width: "100%", padding: "13px 15px",
              background: TG.inputBg, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
              border: `1px solid ${TG.inputBorder}`,
              borderRadius: 15, color: TG.text, fontSize: 14,
              outline: "none", boxSizing: "border-box" as const, colorScheme: "dark",
            }}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        {/* Audience tag filter */}
        {audienceTags.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: TG.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em" }}>{t.editor.segmentLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => { haptic.select(); setSelectedTag(""); }} className="tap" style={{
                padding: "5px 11px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                border: `1px solid ${!selectedTag ? "rgba(45,232,151,0.40)" : "rgba(255,255,255,0.10)"}`,
                background: !selectedTag ? "rgba(45,232,151,0.13)" : "rgba(255,255,255,0.05)",
                color: !selectedTag ? TG.green : TG.muted,
              }}>{t.editor.allAudienceBtn}</button>
              {audienceTags.map(tag => (
                <button key={tag} onClick={() => { haptic.select(); setSelectedTag(prev => prev === tag ? "" : tag); }} className="tap" style={{
                  padding: "5px 11px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${selectedTag === tag ? "rgba(196,174,255,0.40)" : "rgba(255,255,255,0.10)"}`,
                  background: selectedTag === tag ? "rgba(196,174,255,0.13)" : "rgba(255,255,255,0.05)",
                  color: selectedTag === tag ? TG.purple : TG.muted,
                }}>#{tag}</button>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: TG.muted }}>
                {selectedTag
                  ? <>{t.editor.tagOnly(selectedTag)}</>
                  : t.editor.allAudience}
              </span>
              {audienceCount === null
                ? <span style={{ fontSize: 10, color: TG.muted, opacity: 0.5 }}>…</span>
                : <span style={{ fontSize: 10, fontWeight: 800, color: selectedTag ? TG.purple : TG.green }}>
                    {t.editor.userCountShort(audienceCount.toLocaleString(lang === "ua" ? "uk-UA" : lang))}
                    {abMode && halfCount !== null && (
                      <span style={{ color: TG.muted, fontWeight: 400 }}>
                        {" "}(A: {halfCount.toLocaleString(lang === "ua" ? "uk-UA" : lang)} / B: {(audienceCount - halfCount).toLocaleString(lang === "ua" ? "uk-UA" : lang)})
                      </span>
                    )}
                  </span>
              }
            </div>
          </div>
        )}

        {/* Send delay */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Timer size={13} color={TG.muted} />
            <FieldLabel>{t.editor.delayLabel}</FieldLabel>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {(lang === "ua" ? DELAY_PRESETS_UA : DELAY_PRESETS_EN).map(p => (
              <button key={p.value} onClick={() => { haptic.select(); setDelay(String(p.value)); }} className="tap" style={{
                padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1px solid ${parseInt(delay) === p.value ? "rgba(107,168,229,0.50)" : "rgba(255,255,255,0.10)"}`,
                background: parseInt(delay) === p.value ? "rgba(107,168,229,0.18)" : "rgba(255,255,255,0.05)",
                color: parseInt(delay) === p.value ? TG.accentLight : TG.muted,
                transition: "all 0.15s",
              }}>
                {p.label}
              </button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="number" min="0.25" max="168" step="0.5"
                value={Math.round((parseInt(delay) / 3600) * 10) / 10}
                onChange={e => {
                  const h = parseFloat(e.target.value);
                  if (!isNaN(h) && h > 0) setDelay(String(Math.round(h * 3600)));
                }}
                style={{ width: 54, padding: "4px 8px", background: TG.inputBg, border: `1px solid ${TG.inputBorder}`, borderRadius: 9, color: TG.text, fontSize: 12, outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 11, color: TG.muted, fontWeight: 600 }}>ч</span>
            </div>
          </div>
        </div>

        {/* Dry Run toggle */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <FlaskConical size={13} color={dryRun ? "#6ba8e5" : TG.muted} />
              <FieldLabel>{t.editor.dryRunLabel}</FieldLabel>
            </div>
            <button onClick={() => { haptic.select(); setDryRun(d => !d); }} className="tap" style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              border: `1px solid ${dryRun ? "rgba(107,168,229,0.40)" : "rgba(255,255,255,0.11)"}`,
              background: dryRun ? "rgba(107,168,229,0.13)" : "rgba(255,255,255,0.05)",
              color: dryRun ? TG.accentLight : TG.muted,
              boxShadow: dryRun ? "0 0 16px rgba(107,168,229,0.20)" : "none",
            }}>
              {dryRun ? t.editor.toggleOn : t.editor.toggleOff}
            </button>
          </div>
          {dryRun && (
            <div style={{ marginTop: 8, padding: "9px 13px", background: "rgba(107,168,229,0.07)", border: "1px solid rgba(107,168,229,0.20)", borderRadius: 12, fontSize: 11, color: TG.muted, lineHeight: 1.5 }}>
              {t.editor.dryRunHint}
            </div>
          )}
        </div>

        {/* Save as template */}
        {text.trim().length > 20 && !isEdit && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={async () => {
              haptic.select();
              try {
                await api.createTemplate({ name: name.trim() || (lang === "ua" ? "Без назви" : "Untitled"), text: text.trim() });
                haptic.success();
              } catch { haptic.error(); }
            }} className="tap" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700,
              border: "1px solid rgba(196,174,255,0.25)",
              background: "rgba(196,174,255,0.07)",
              color: "#c4aeff", width: "100%", justifyContent: "center",
            }}>
              <BookOpen size={12} /> {t.editor.saveTemplate}
            </button>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 22 }}>
          <FieldLabel>{t.editor.audience}</FieldLabel>
          <GlassTextarea value={notes} onChange={setNotes} focused={notesFocus} minHeight={74}
            onFocus={() => setNotesFocus(true)} onBlur={() => setNotesFocus(false)}
            placeholder={t.editor.audiencePlaceholder} />
        </div>

        {error && (
          <div style={{ marginBottom: 18, padding: "13px 15px", background: "rgba(255,107,122,0.09)", border: "1px solid rgba(255,107,122,0.26)", backdropFilter: BLUR, WebkitBackdropFilter: BLUR, borderRadius: 14, color: TG.red, fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button onClick={() => { haptic.medium(); handleSave(false); }} disabled={!valid || busy} className="tap" style={{
            width: "100%", padding: "16px",
            background: valid ? "linear-gradient(135deg,#5b96d4,#3a6fad,#2f5a9a)" : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 20, color: "#fff",
            fontSize: 15, fontWeight: 800, letterSpacing: "0.01em",
            cursor: valid && !busy ? "pointer" : "not-allowed",
            opacity: busy ? 0.68 : 1,
            boxShadow: valid ? "0 8px 32px rgba(91,150,212,0.42), 0 1px 0 rgba(255,255,255,0.20) inset" : "none",
            position: "relative", overflow: "hidden",
          }}>
            {valid && <div style={{ position: "absolute", top: 0, left: "-60%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)", transform: "skewX(-18deg)", animation: "shimmerX 3s ease-in-out infinite" }} />}
            <span style={{ position: "relative", zIndex: 1 }}>{busy ? t.common.saving : scheduleMode && scheduledAt ? `📅 ${t.editor.scheduleToggle}` : isEdit ? t.editor.save : t.editor.send}</span>
          </button>

          {!isEdit && (
            <button onClick={() => { haptic.medium(); handleSave(true); }} disabled={!valid || busy} className="tap" style={{
              width: "100%", padding: "16px",
              background: "rgba(45,232,151,0.09)",
              border: "1px solid rgba(45,232,151,0.30)",
              backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
              borderRadius: 20, color: TG.green,
              fontSize: 15, fontWeight: 800, letterSpacing: "0.01em",
              cursor: valid && !busy ? "pointer" : "not-allowed",
              opacity: busy ? 0.68 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: valid ? "0 4px 22px rgba(45,232,151,0.16)" : "none",
            }}>
              <Sparkles size={15} /> {abMode ? `${t.editor.abTest} →` : t.editor.send}
            </button>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* Templates slide-up modal */}
      {showTemplates && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }} onClick={() => setShowTemplates(false)}>
          <div style={{
            background: "linear-gradient(180deg,rgba(15,20,40,0.98),rgba(8,12,24,0.99))",
            borderRadius: "24px 24px 0 0",
            border: "1px solid rgba(255,255,255,0.10)",
            borderBottom: "none",
            maxHeight: "80vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            {/* Handle + header */}
            <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.16)", margin: "0 auto 14px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={15} color="#c4aeff" />
                  <span style={{ fontSize: 15, fontWeight: 800, color: TG.text }}>{lang === "ua" ? "Шаблони повідомлень" : "Message Templates"}</span>
                </div>
                <button onClick={() => setShowTemplates(false)} className="tap" style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 9, padding: 7, display: "flex", color: TG.muted,
                }}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 12 }} />
            </div>

            {/* Template list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px", WebkitOverflowScrolling: "touch" }}>
              {loadingTemplates ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: TG.muted, fontSize: 13 }}>{lang === "ua" ? "Завантаження шаблонів…" : "Loading templates…"}</div>
              ) : templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: TG.muted, fontSize: 13 }}>{lang === "ua" ? "Шаблони не знайдено" : "No templates found"}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {templates.map(t => {
                    const preview = t.text.replace(/\{[^}]+\}/g, m => m).slice(0, 100) + (t.text.length > 100 ? "…" : "");
                    const tags: string[] = (() => { try { return JSON.parse(t.tags); } catch { return []; } })();
                    return (
                      <button key={t.id} onClick={() => applyTemplate(t)} className="tap" style={{
                        width: "100%", textAlign: "left",
                        padding: "12px 14px",
                        background: "rgba(196,174,255,0.06)",
                        border: "1px solid rgba(196,174,255,0.15)",
                        borderRadius: 16,
                        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                        cursor: "pointer",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>{t.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: TG.text, flex: 1 }}>{t.name}</span>
                          {t.use_count > 0 && (
                            <span style={{ fontSize: 10, color: TG.muted, background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "2px 7px" }}>×{t.use_count}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: TG.muted, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{preview}</div>
                        {tags.length > 0 && (
                          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                            {tags.map(tag => (
                              <span key={tag} style={{ fontSize: 10, color: "#c4aeff", background: "rgba(196,174,255,0.10)", borderRadius: 8, padding: "2px 7px", border: "1px solid rgba(196,174,255,0.18)" }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
