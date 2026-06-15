import { useState } from "react";
import {
  Bold, Italic, Code, Link, Hash, Eye, EyeOff,
  Smile, Image, Send, ChevronDown, Copy, Check
} from "lucide-react";

const TG = {
  bg: "#17212b", card: "#1e2c3a", accent: "#5288c1", accentLight: "#6ba3d6",
  green: "#4dca6b", yellow: "#f5a623", text: "#ffffff",
  muted: "#7d9eb5", border: "#253443", nav: "#232e3c", input: "#141d26",
};

const VARIABLES = ["{first_name}", "{username}", "{ref_code}", "{promo}"];

const TEMPLATES = [
  { label: "Акция", text: "🎉 Привет, {first_name}!\n\nСпециально для тебя — скидка 20% на всё до конца недели.\n\nПромокод: {promo}\n\n👉 Не упусти шанс!" },
  { label: "Приглашение", text: "👋 {first_name}, привет!\n\nПриглашаем тебя на наш закрытый вебинар.\n📅 Суббота, 12:00 МСК\n\nТвой код: {ref_code}" },
  { label: "Напоминание", text: "⏰ {first_name}, не забудь!\n\nТвоя подписка истекает через 3 дня. Продли сейчас со скидкой 15%." },
];

function renderPreview(text: string) {
  return text
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#1e2c3a;padding:1px 5px;border-radius:4px;font-size:13px">$1</code>')
    .replace(/\n/g, '<br/>');
}

export function Editor() {
  const [text, setText] = useState("🎉 Привет, {first_name}!\n\nСпециально для тебя — скидка 20% на всё до конца недели.\n\nПромокод: {promo}\n\n👉 Не упусти шанс!");
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [campaign, setCampaign] = useState("Акция декабрь 2024");

  const charCount = text.length;
  const lineCount = text.split("\n").length;

  const insertAtCursor = (wrap: [string, string] | string) => {
    if (typeof wrap === "string") {
      setText(prev => prev + wrap);
    } else {
      setText(prev => prev + wrap[0] + "текст" + wrap[1]);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ background: TG.bg, minHeight: "100vh", fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: TG.text, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: TG.card, padding: "16px 20px 14px", borderBottom: `1px solid ${TG.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Редактор</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowPreview(!showPreview)} style={{
              background: showPreview ? TG.accent + "33" : "none", border: `1px solid ${showPreview ? TG.accent : TG.border}`,
              borderRadius: 8, color: showPreview ? TG.accent : TG.muted, cursor: "pointer", padding: "5px 10px",
              fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4
            }}>
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? "Код" : "Preview"}
            </button>
            <button onClick={handleCopy} style={{
              background: "none", border: `1px solid ${TG.border}`, borderRadius: 8,
              color: copied ? TG.green : TG.muted, cursor: "pointer", padding: "5px 10px",
              fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4
            }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Campaign selector */}
        <button onClick={() => {}} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: TG.input, border: `1px solid ${TG.border}`, borderRadius: 10,
          padding: "9px 12px", color: TG.text, cursor: "pointer"
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>📢 {campaign}</span>
          <ChevronDown size={14} color={TG.muted} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 100px" }}>

        {/* Templates */}
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowTemplates(!showTemplates)} style={{
            background: "none", border: "none", color: TG.muted, cursor: "pointer", fontSize: 12,
            display: "flex", alignItems: "center", gap: 5, padding: 0, marginBottom: showTemplates ? 8 : 0
          }}>
            <Hash size={12} /> Шаблоны <ChevronDown size={11} style={{ transform: showTemplates ? "rotate(180deg)" : "none" }} />
          </button>
          {showTemplates && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => { setText(t.text); setShowTemplates(false); }} style={{
                  background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 8, padding: "6px 12px",
                  color: TG.text, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Formatting toolbar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, background: TG.card, borderRadius: 10, padding: "6px 10px", border: `1px solid ${TG.border}` }}>
          {[
            { icon: Bold,   action: () => insertAtCursor(["*", "*"]),  tip: "Bold" },
            { icon: Italic, action: () => insertAtCursor(["_", "_"]),  tip: "Italic" },
            { icon: Code,   action: () => insertAtCursor(["`", "`"]),  tip: "Code" },
            { icon: Link,   action: () => insertAtCursor("[текст](url)"), tip: "Link" },
            { icon: Smile,  action: () => insertAtCursor("😊"), tip: "Emoji" },
            { icon: Image,  action: () => {}, tip: "Фото" },
          ].map(({ icon: Icon, action, tip }) => (
            <button key={tip} onClick={action} title={tip} style={{
              flex: 1, background: "none", border: "none", color: TG.muted, cursor: "pointer",
              padding: "5px 0", borderRadius: 6, display: "flex", justifyContent: "center", alignItems: "center",
              transition: "color 0.15s"
            }}>
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Variables row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
          {VARIABLES.map(v => (
            <button key={v} onClick={() => insertAtCursor(v)} style={{
              background: TG.accent + "20", border: `1px solid ${TG.accent}44`, borderRadius: 7,
              padding: "4px 10px", color: TG.accentLight, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
            }}>{v}</button>
          ))}
        </div>

        {/* Text area / preview */}
        {showPreview ? (
          <div style={{
            background: TG.input, border: `1px solid ${TG.border}`, borderRadius: 12,
            padding: "14px 16px", minHeight: 220, lineHeight: 1.6, fontSize: 14
          }}>
            <div style={{ fontSize: 10, color: TG.accent, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Preview — как получит пользователь
            </div>
            <div
              style={{ color: TG.text }}
              dangerouslySetInnerHTML={{ __html: renderPreview(text.replace(/{first_name}/g, "Иван").replace(/{promo}/g, "SALE20").replace(/{ref_code}/g, "REF-8812")) }}
            />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            style={{
              width: "100%", minHeight: 220, background: TG.input, border: `1px solid ${TG.border}`,
              borderRadius: 12, padding: "14px 16px", color: TG.text, fontSize: 14, lineHeight: 1.6,
              resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box"
            }}
            placeholder="Текст рассылки..."
          />
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 14 }}>
          {[
            { label: "Символов", value: charCount },
            { label: "Строк", value: lineCount },
            { label: "Переменных", value: (text.match(/\{[^}]+\}/g) ?? []).length },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: TG.card, border: `1px solid ${TG.border}`, borderRadius: 8, padding: "6px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TG.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: TG.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Send button */}
        <button style={{
          width: "100%", padding: "14px 0",
          background: `linear-gradient(135deg, ${TG.accent}, #3b6fa8)`,
          border: "none", borderRadius: 12, color: TG.text,
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          <Send size={16} /> Сохранить и запустить
        </button>
      </div>

      <BottomNav active="editor" />
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { id: "home", icon: "⊞", label: "Главная" },
    { id: "campaigns", icon: "📢", label: "Рассылки" },
    { id: "editor", icon: "✏️", label: "Редактор" },
    { id: "accounts", icon: "👤", label: "Аккаунты" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: TG.nav, borderTop: `1px solid ${TG.border}`, display: "flex", padding: "8px 0 20px" }}>
      {items.map(item => (
        <div key={item.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", opacity: active === item.id ? 1 : 0.45 }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 10, color: active === item.id ? TG.accentLight : TG.muted, fontWeight: active === item.id ? 600 : 400 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
