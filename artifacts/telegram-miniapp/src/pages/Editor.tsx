import { useState, useEffect } from "react";
import { CheckCircle, Calendar, Sparkles } from "lucide-react";
import { api, Campaign } from "../lib/api";
import { TG, BLUR, BLUR_HEAVY } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";

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
        <div style={{
          position: "absolute", inset: -1, borderRadius: 15,
          background: "linear-gradient(135deg,rgba(91,150,212,0.45),rgba(45,232,151,0.2))",
          zIndex: 0, pointerEvents: "none",
        }} />
      )}
      <input
        type={type}
        style={{
          position: "relative", zIndex: 1,
          width: "100%", padding: "13px 15px",
          background: focused ? "rgba(91,150,212,0.07)" : TG.inputBg,
          backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
          border: `1px solid ${focused ? "rgba(91,150,212,0.45)" : TG.inputBorder}`,
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
        <div style={{
          position: "absolute", inset: -1, borderRadius: 15,
          background: "linear-gradient(135deg,rgba(91,150,212,0.45),rgba(45,232,151,0.2))",
          zIndex: 0, pointerEvents: "none",
        }} />
      )}
      <textarea
        style={{
          position: "relative", zIndex: 1,
          width: "100%", padding: "13px 15px",
          background: focused ? "rgba(91,150,212,0.07)" : TG.inputBg,
          backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
          border: `1px solid ${focused ? "rgba(91,150,212,0.45)" : TG.inputBorder}`,
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
      <label style={{
        fontSize: 10.5, color: TG.muted, fontWeight: 800,
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>{children}</label>
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
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onDone(); }, 1500);
    } catch { setError("Ошибка при сохранении. Проверьте соединение."); }
    setBusy(false);
  }

  if (loading) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title={isEdit ? "Редактировать" : "Новая рассылка"} />
      <FullSpinner />
    </div>
  );

  if (success) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title={isEdit ? "Редактировать" : "Новая рассылка"} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }} className="scale-in">
        <div style={{
          width: 88, height: 88, borderRadius: 28,
          background: "radial-gradient(circle at 40% 30%, rgba(45,232,151,0.3) 0%, rgba(45,232,151,0.08) 100%)",
          border: "1px solid rgba(45,232,151,0.3)",
          backdropFilter: BLUR_HEAVY, WebkitBackdropFilter: BLUR_HEAVY,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 48px rgba(45,232,151,0.3), 0 1px 0 rgba(255,255,255,0.15) inset",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.12),transparent)", borderRadius: "28px 28px 0 0" }} />
          <CheckCircle size={42} color={TG.green} strokeWidth={2} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px",
            background: "linear-gradient(135deg,#2de897,#5b96d4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            marginBottom: 8,
          }}>
            {isEdit ? "Сохранено!" : "Создана!"}
          </div>
          <div style={{ fontSize: 13, color: TG.muted }}>Переходим к рассылкам...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title={isEdit ? "Редактировать" : "Новая рассылка"}
        subtitle={isEdit ? "Изменить кампанию" : "Создать кампанию"}
      />
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
          {/* Var chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {vars.map(v => (
              <button key={v} onClick={() => setText(t => t + v)} className="tap" style={{
                padding: "5px 11px", borderRadius: 10,
                border: "1px solid rgba(91,150,212,0.28)",
                background: "rgba(91,150,212,0.09)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                color: TG.accentLight, fontSize: 11, fontFamily: "monospace", fontWeight: 700,
              }}>
                {v}
              </button>
            ))}
          </div>
          <GlassTextarea value={text} onChange={setText} focused={textFocus} minHeight={170}
            onFocus={() => setTextFocus(true)} onBlur={() => setTextFocus(false)}
            placeholder="Привет, {first_name}! 👋&#10;&#10;Пишем тебе, потому что..." />
          {charCount > 4000 && (
            <div style={{ marginTop: 6, fontSize: 11, color: TG.red, fontWeight: 600 }}>
              ⚠️ Слишком длинный текст
            </div>
          )}
        </div>

        {/* Schedule toggle */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: scheduleMode ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={13} color={TG.yellow} />
              <FieldLabel>Запланировать</FieldLabel>
            </div>
            <button onClick={() => { setScheduleMode(m => !m); if (scheduleMode) setScheduledAt(""); }} className="tap"
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                border: `1px solid ${scheduleMode ? "rgba(255,201,70,0.38)" : "rgba(255,255,255,0.11)"}`,
                background: scheduleMode ? "rgba(255,201,70,0.12)" : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                color: scheduleMode ? TG.yellow : TG.muted,
                boxShadow: scheduleMode ? "0 0 14px rgba(255,201,70,0.18)" : "none",
              }}
            >
              {scheduleMode ? "Вкл" : "Выкл"}
            </button>
          </div>
          {scheduleMode && (
            <input type="datetime-local"
              style={{
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
          <div style={{
            marginBottom: 18, padding: "13px 15px",
            background: "rgba(255,107,122,0.09)", border: "1px solid rgba(255,107,122,0.24)",
            backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
            borderRadius: 14, color: TG.red, fontSize: 13, lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button onClick={() => handleSave(false)} disabled={!valid || busy} className="tap" style={{
            width: "100%", padding: "16px",
            background: valid ? "linear-gradient(135deg,#5b96d4,#3a6fad)" : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 18, color: "#fff",
            fontSize: 15, fontWeight: 800, letterSpacing: "0.01em",
            cursor: valid && !busy ? "pointer" : "not-allowed",
            opacity: busy ? 0.68 : 1,
            boxShadow: valid ? "0 6px 28px rgba(91,150,212,0.38), 0 1px 0 rgba(255,255,255,0.18) inset" : "none",
            position: "relative", overflow: "hidden",
          }}>
            {valid && <div style={{
              position: "absolute", top: 0, left: "-60%", width: "50%", height: "100%",
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
              transform: "skewX(-20deg)", animation: "shimmer 3s ease-in-out infinite",
            }} />}
            {busy ? "Сохраняем..." : isEdit ? "Сохранить изменения" : "Создать рассылку"}
          </button>

          {!isEdit && (
            <button onClick={() => handleSave(true)} disabled={!valid || busy} className="tap" style={{
              width: "100%", padding: "16px",
              background: "rgba(45,232,151,0.09)",
              border: "1px solid rgba(45,232,151,0.28)",
              backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
              borderRadius: 18, color: TG.green,
              fontSize: 15, fontWeight: 800, letterSpacing: "0.01em",
              cursor: valid && !busy ? "pointer" : "not-allowed",
              opacity: busy ? 0.68 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: valid ? "0 4px 20px rgba(45,232,151,0.14)" : "none",
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
