import { useState, useEffect } from "react";
import { CheckCircle, Calendar } from "lucide-react";
import { api, Campaign } from "../lib/api";
import { TG } from "../lib/theme";
import { Header } from "../components/Header";
import { FullSpinner } from "../components/Spinner";

function inputStyle(focused: boolean) {
  return {
    width: "100%", padding: "12px 14px",
    background: TG.inputBg, border: `1px solid ${focused ? TG.accent : TG.border}`,
    borderRadius: 12, color: TG.text, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: 12, color: TG.muted, fontWeight: 600,
      display: "block", marginBottom: 6,
      textTransform: "uppercase", letterSpacing: "0.05em",
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
      setName(c.name);
      setText(c.text_template);
      setNotes(c.notes ?? "");
      if (c.scheduled_at) {
        setScheduledAt(c.scheduled_at.slice(0, 16));
        setScheduleMode(true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [campaignId]);

  const isEdit = campaignId !== null;
  const charCount = text.length;
  const valid = name.trim().length > 0 && text.trim().length > 0;

  const vars = ["{first_name}", "{username}", "{promo}"];

  async function handleSave(launch?: boolean) {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Partial<Campaign> = {
        name: name.trim(),
        text_template: text.trim(),
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
      setTimeout(() => { setSuccess(false); onDone(); }, 1200);
    } catch {
      setError("Ошибка при сохранении. Проверьте соединение.");
    }
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: TG.green + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={32} color={TG.green} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? "Сохранено!" : "Создана!"}</div>
        <div style={{ fontSize: 13, color: TG.muted }}>Переходим к рассылкам...</div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title={isEdit ? "Редактировать" : "Новая рассылка"} subtitle={isEdit ? "Изменить кампанию" : "Создать кампанию"} />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 20px", WebkitOverflowScrolling: "touch" }}>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <Label>Название</Label>
          <input
            style={inputStyle(nameFocus)}
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setNameFocus(true)}
            onBlur={() => setNameFocus(false)}
            placeholder="Например: Акция декабрь"
          />
        </div>

        {/* Text */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Label>Текст сообщения</Label>
            <span style={{ fontSize: 11, color: charCount > 4000 ? TG.red : TG.muted }}>{charCount}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {vars.map(v => (
              <button key={v} onClick={() => setText(t => t + v)} style={{
                padding: "4px 10px", borderRadius: 8,
                border: `1px solid ${TG.accent}44`, background: TG.accent + "18",
                color: TG.accentLight, fontSize: 11, fontFamily: "monospace",
                cursor: "pointer",
              }}>
                {v}
              </button>
            ))}
          </div>
          <textarea
            style={{ ...inputStyle(textFocus), resize: "none", minHeight: 160, lineHeight: 1.5, fontFamily: "inherit" }}
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setTextFocus(true)}
            onBlur={() => setTextFocus(false)}
            placeholder="Привет, {first_name}! 👋..."
          />
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={13} color={TG.yellow} />
              <Label>Запланировать</Label>
            </div>
            <button
              onClick={() => { setScheduleMode(m => !m); if (scheduleMode) setScheduledAt(""); }}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: `1px solid ${scheduleMode ? TG.yellow + "66" : TG.border}`,
                background: scheduleMode ? TG.yellow + "18" : "transparent",
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
                ...inputStyle(false),
                colorScheme: "dark",
              }}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <Label>Заметки</Label>
          <textarea
            style={{ ...inputStyle(notesFocus), resize: "none", minHeight: 68, lineHeight: 1.5, fontFamily: "inherit" }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onFocus={() => setNotesFocus(true)}
            onBlur={() => setNotesFocus(false)}
            placeholder="Внутренние заметки (не отправляются)..."
          />
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: TG.red + "18", border: `1px solid ${TG.red}44`, borderRadius: 10, color: TG.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={() => handleSave(false)}
            disabled={!valid || busy}
            style={{
              width: "100%", padding: "14px",
              background: valid ? TG.accentGrad : TG.border,
              border: "none", borderRadius: 13, color: TG.text,
              fontSize: 15, fontWeight: 700,
              cursor: valid && !busy ? "pointer" : "not-allowed",
              opacity: busy ? 0.75 : 1,
              transition: "background 0.2s, opacity 0.15s",
            }}
          >
            {busy ? "Сохраняем..." : isEdit ? "Сохранить изменения" : "Создать рассылку"}
          </button>

          {!isEdit && (
            <button
              onClick={() => handleSave(true)}
              disabled={!valid || busy}
              style={{
                width: "100%", padding: "14px",
                background: "transparent",
                border: `1px solid ${TG.green}55`,
                borderRadius: 13, color: TG.green,
                fontSize: 15, fontWeight: 700,
                cursor: valid && !busy ? "pointer" : "not-allowed",
                opacity: busy ? 0.75 : 1,
              }}
            >
              Создать и запустить
            </button>
          )}
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
