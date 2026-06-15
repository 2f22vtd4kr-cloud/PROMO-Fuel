import { useState, useEffect } from "react";
import { CheckCircle, Calendar } from "lucide-react";
import { api, Campaign } from "../lib/api";
import { TG, BLUR } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";

function GlassInput({ value, onChange, onFocus, onBlur, placeholder, focused, style: extraStyle }: {
  value: string; onChange: (v: string) => void;
  onFocus?: () => void; onBlur?: () => void;
  placeholder?: string; focused?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <input
      style={{
        width: "100%", padding: "13px 14px",
        background: focused ? "rgba(82,136,193,0.08)" : TG.inputBg,
        backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        border: `1px solid ${focused ? "rgba(82,136,193,0.5)" : TG.inputBorder}`,
        borderRadius: 14, color: TG.text, fontSize: 14,
        outline: "none", boxSizing: "border-box",
        transition: "border-color 0.18s, background 0.18s",
        boxShadow: focused ? "0 0 0 3px rgba(82,136,193,0.12)" : "none",
        ...extraStyle,
      } as React.CSSProperties}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

function GlassTextarea({ value, onChange, onFocus, onBlur, placeholder, focused, minHeight = 120 }: {
  value: string; onChange: (v: string) => void;
  onFocus?: () => void; onBlur?: () => void;
  placeholder?: string; focused?: boolean; minHeight?: number;
}) {
  return (
    <textarea
      style={{
        width: "100%", padding: "13px 14px",
        background: focused ? "rgba(82,136,193,0.08)" : TG.inputBg,
        backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        border: `1px solid ${focused ? "rgba(82,136,193,0.5)" : TG.inputBorder}`,
        borderRadius: 14, color: TG.text, fontSize: 14,
        outline: "none", boxSizing: "border-box",
        transition: "border-color 0.18s, background 0.18s",
        boxShadow: focused ? "0 0 0 3px rgba(82,136,193,0.12)" : "none",
        resize: "none", lineHeight: 1.55, fontFamily: "inherit",
        minHeight,
      } as React.CSSProperties}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: 11, color: TG.muted, fontWeight: 700,
      display: "block", marginBottom: 8,
      textTransform: "uppercase", letterSpacing: "0.07em",
    }}>
      {children}
    </label>
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
      setTimeout(() => { setSuccess(false); onDone(); }, 1400);
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }} className="fade-up">
        <div style={{
          width: 72, height: 72, borderRadius: 24,
          background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)",
          backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 32px rgba(52,211,153,0.25)",
        }}>
          <CheckCircle size={36} color={TG.green} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center", letterSpacing: "-0.3px" }}>
            {isEdit ? "Сохранено!" : "Создана!"}
          </div>
          <div style={{ fontSize: 13, color: TG.muted, textAlign: "center", marginTop: 6 }}>
            Переходим к рассылкам...
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title={isEdit ? "Редактировать" : "Новая рассылка"} subtitle={isEdit ? "Изменить кампанию" : "Создать кампанию"} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px 24px", WebkitOverflowScrolling: "touch" }}>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Название</FieldLabel>
          <GlassInput
            value={name} onChange={setName} focused={nameFocus}
            onFocus={() => setNameFocus(true)} onBlur={() => setNameFocus(false)}
            placeholder="Например: Акция декабрь"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <FieldLabel>Текст сообщения</FieldLabel>
            <span style={{ fontSize: 11, color: charCount > 4000 ? TG.red : TG.muted, fontWeight: 600 }}>{charCount}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {vars.map(v => (
              <button key={v} onClick={() => setText(t => t + v)} className="tap" style={{
                padding: "5px 11px", borderRadius: 10,
                border: "1px solid rgba(82,136,193,0.3)",
                background: "rgba(82,136,193,0.10)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                color: TG.accentLight, fontSize: 11, fontFamily: "monospace",
                cursor: "pointer", fontWeight: 600,
              }}>
                {v}
              </button>
            ))}
          </div>
          <GlassTextarea
            value={text} onChange={setText} focused={textFocus} minHeight={160}
            onFocus={() => setTextFocus(true)} onBlur={() => setTextFocus(false)}
            placeholder="Привет, {first_name}! 👋..."
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={13} color={TG.yellow} />
              <FieldLabel>Запланировать</FieldLabel>
            </div>
            <button className="tap"
              onClick={() => { setScheduleMode(m => !m); if (scheduleMode) setScheduledAt(""); }}
              style={{
                padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1px solid ${scheduleMode ? "rgba(251,191,36,0.4)" : TG.glassBorder}`,
                background: scheduleMode ? "rgba(251,191,36,0.12)" : TG.glass,
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                color: scheduleMode ? TG.yellow : TG.muted, cursor: "pointer",
              }}
            >
              {scheduleMode ? "Вкл" : "Выкл"}
            </button>
          </div>
          {scheduleMode && (
            <input
              type="datetime-local"
              style={{
                width: "100%", padding: "13px 14px",
                background: TG.inputBg,
                backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
                border: `1px solid ${TG.inputBorder}`,
                borderRadius: 14, color: TG.text, fontSize: 14,
                outline: "none", boxSizing: "border-box" as const,
                colorScheme: "dark",
              }}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Заметки</FieldLabel>
          <GlassTextarea
            value={notes} onChange={setNotes} focused={notesFocus} minHeight={72}
            onFocus={() => setNotesFocus(true)} onBlur={() => setNotesFocus(false)}
            placeholder="Внутренние заметки (не отправляются)..."
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: "12px 14px",
            background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 12, color: TG.red, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => handleSave(false)} disabled={!valid || busy} className="tap" style={{
            width: "100%", padding: "15px",
            background: valid ? "linear-gradient(135deg, #5288c1 0%, #3b6fa8 100%)" : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 16, color: "#fff",
            fontSize: 15, fontWeight: 700,
            cursor: valid && !busy ? "pointer" : "not-allowed",
            opacity: busy ? 0.7 : 1,
            boxShadow: valid ? "0 4px 20px rgba(82,136,193,0.3), 0 1px 0 rgba(255,255,255,0.15) inset" : "none",
            transition: "opacity 0.15s, box-shadow 0.2s",
          }}>
            {busy ? "Сохраняем..." : isEdit ? "Сохранить изменения" : "Создать рассылку"}
          </button>

          {!isEdit && (
            <button onClick={() => handleSave(true)} disabled={!valid || busy} className="tap" style={{
              width: "100%", padding: "15px",
              background: "rgba(52,211,153,0.10)",
              border: "1px solid rgba(52,211,153,0.30)",
              borderRadius: 16, color: TG.green,
              fontSize: 15, fontWeight: 700,
              cursor: valid && !busy ? "pointer" : "not-allowed",
              opacity: busy ? 0.7 : 1,
              backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
            }}>
              Создать и запустить
            </button>
          )}
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
