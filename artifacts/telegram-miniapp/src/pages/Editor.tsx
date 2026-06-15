import { useState, useEffect } from "react";
import { CheckCircle, Calendar, Sparkles, X } from "lucide-react";
import { api, Campaign } from "../lib/api";
import { TG, BLUR, BLUR_HEAVY } from "../lib/theme";
import { FullSpinner } from "../components/Spinner";
import { haptic } from "../lib/haptics";

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
  value, onChange, onFocus, onBlur, placeholder, focused, minHeight = 130,
}: {
  value: string; onChange: (v: string) => void;
  onFocus?: () => void; onBlur?: () => void;
  placeholder?: string; focused?: boolean; minHeight?: number;
}) {
  return (
    <div style={{ position: "relative" }}>
      {focused && (
        <div style={{ position: "absolute", inset: -1, borderRadius: 16, background: "linear-gradient(135deg,rgba(91,150,212,0.48),rgba(45,232,151,0.22))", zIndex: 0, pointerEvents: "none" }} />
      )}
      <textarea
        style={{
          position: "relative", zIndex: 1,
          width: "100%", padding: "13px 15px",
          background: focused ? "rgba(91,150,212,0.08)" : TG.inputBg,
          backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
          border: `1px solid ${focused ? "rgba(91,150,212,0.48)" : TG.inputBorder}`,
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
  const [loading, setLoading] = useState(campaignId !== null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [nameFocus, setNameFocus] = useState(false);
  const [textFocus, setTextFocus] = useState(false);
  const [notesFocus, setNotesFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    api.getCampaign(campaignId).then(c => {
      setName(c.name); setText(c.text_template); setNotes(c.notes ?? "");
      if (c.scheduled_at) { setScheduledAt(c.scheduled_at.slice(0, 16)); setScheduleMode(true); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [campaignId]);

  const isEdit = campaignId !== null;
  const charCount = text.length;
  const valid = name.trim().length > 0 && text.trim().length > 0;
  const vars = ["{first_name}", "{username}", "{promo}"];

  async function handleSave(launch?: boolean) {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    try {
      const payload: Partial<Campaign> = {
        name: name.trim(), text_template: text.trim(),
        notes: notes.trim() || undefined,
        scheduled_at: scheduleMode && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };
      if (isEdit && campaignId) {
        await api.updateCampaign(campaignId, payload);
        if (launch) await api.actionCampaign(campaignId, "running");
      } else {
        const created = await api.createCampaign(payload as any);
        if (launch) await api.actionCampaign(created.id, "running");
      }
      haptic.success();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onDone(); }, 1400);
    } catch { haptic.error(); setError("Ошибка при сохранении. Проверьте соединение."); }
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
        <span style={{ fontSize: 17, fontWeight: 800, color: TG.text }}>{isEdit ? "Редактировать" : "Новая рассылка"}</span>
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
            {isEdit ? "Сохранено!" : "Создана!"}
          </div>
          <div style={{ fontSize: 13, color: TG.muted }}>Возвращаемся к рассылкам...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgba(7,9,15,0.94)", backdropFilter: "blur(60px) saturate(200%)", WebkitBackdropFilter: "blur(60px) saturate(200%)" }}>
      {/* Sheet header */}
      <div style={{
        padding: "8px 16px 13px", flexShrink: 0, position: "relative",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 100%)",
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.16)", margin: "0 auto 14px" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22) 50%,transparent)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.4px", background: "linear-gradient(135deg,#eef2ff,rgba(149,196,245,0.85))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {isEdit ? "Редактировать" : "Новая рассылка"}
            </div>
            <div style={{ fontSize: 11.5, color: TG.muted, marginTop: 2 }}>
              {isEdit ? "Изменить кампанию" : "Создать кампанию"}
            </div>
          </div>
          {CloseBtn}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 15px 28px", WebkitOverflowScrolling: "touch" }}>
        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Название</FieldLabel>
          <GlassInput value={name} onChange={setName} focused={nameFocus}
            onFocus={() => setNameFocus(true)} onBlur={() => setNameFocus(false)}
            placeholder="Например: Акция декабрь" />
        </div>

        {/* Text */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel hint={`${charCount}`}>Текст сообщения</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {vars.map(v => (
              <button key={v} onClick={() => { haptic.select(); setText(t => t + v); }} className="tap" style={{
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
          <GlassTextarea value={text} onChange={setText} focused={textFocus} minHeight={170}
            onFocus={() => setTextFocus(true)} onBlur={() => setTextFocus(false)}
            placeholder={"Привет, {first_name}! 👋\n\nПишем тебе, потому что..."} />
          {charCount > 4000 && <div style={{ marginTop: 6, fontSize: 11, color: TG.red, fontWeight: 600 }}>⚠️ Слишком длинный текст</div>}
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: scheduleMode ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={13} color={TG.yellow} />
              <FieldLabel>Запланировать</FieldLabel>
            </div>
            <button onClick={() => { haptic.select(); setScheduleMode(m => !m); if (scheduleMode) setScheduledAt(""); }} className="tap" style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              border: `1px solid ${scheduleMode ? "rgba(255,201,70,0.40)" : "rgba(255,255,255,0.11)"}`,
              background: scheduleMode ? "rgba(255,201,70,0.13)" : "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              color: scheduleMode ? TG.yellow : TG.muted,
              boxShadow: scheduleMode ? "0 0 16px rgba(255,201,70,0.20)" : "none",
            }}>
              {scheduleMode ? "Вкл" : "Выкл"}
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

        {/* Notes */}
        <div style={{ marginBottom: 22 }}>
          <FieldLabel>Заметки</FieldLabel>
          <GlassTextarea value={notes} onChange={setNotes} focused={notesFocus} minHeight={74}
            onFocus={() => setNotesFocus(true)} onBlur={() => setNotesFocus(false)}
            placeholder="Внутренние заметки (не отправляются)..." />
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
            <span style={{ position: "relative", zIndex: 1 }}>{busy ? "Сохраняем..." : isEdit ? "Сохранить изменения" : "Создать рассылку"}</span>
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
              <Sparkles size={15} /> Создать и запустить
            </button>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
