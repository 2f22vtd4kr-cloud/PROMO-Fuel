import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles, Cpu, Paperclip, X, Trash2, Copy, Check } from "lucide-react";
import { getStoredSecret } from "./LockScreen";
import { useI18n } from "../lib/i18n";

interface Message {
  role: "user" | "model";
  text: string;
  engine?: string;
  imageUrl?: string;
  ts: Date;
}

interface HistoryPart {
  text?: string;
  functionCall?: unknown;
  functionResponse?: unknown;
}

interface HistoryItem {
  role: string;
  parts: HistoryPart[];
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ── Quick-reply suggestions ───────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  ua: [
    "Огляд платформи",
    "Стан акаунтів",
    "Перевірити проксі",
    "Які кампанії активні?",
    "Статус воркерів",
  ],
  en: [
    "Platform summary",
    "Account health",
    "Check failed proxies",
    "Active campaigns?",
    "Worker status",
  ],
};

// ── File → base64 helper ──────────────────────────────────────────────────

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main page ─────────────────────────────────────────────────────────────

export function AiAssistantPage() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: lang === "ua"
        ? "Привіт! Я PROMO-Fuel System Copilot. Можу допомогти з управлінням акаунтами, проксі SOCKS5 та моніторингом платформи. Запитай мене щось — наприклад, стан акаунтів або статус проксі. Також можеш прикріпити зображення для аналізу."
        : "Hi! I'm PROMO-Fuel System Copilot. I can help with account management, SOCKS5 proxies, and platform monitoring. Ask me anything — for example, account status or proxy health. You can also attach an image for analysis.",
      ts: new Date(),
    },
  ]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  const [attachedImage, setAttached]  = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const GREETING: Message = {
    role: "model",
    text: lang === "ua"
      ? "Привіт! Я PROMO-Fuel System Copilot. Можу допомогти з управлінням акаунтами, проксі SOCKS5 та моніторингом платформи. Запитай мене щось — наприклад, стан акаунтів або статус проксі. Також можеш прикріпити зображення для аналізу."
      : "Hi! I'm PROMO-Fuel System Copilot. I can help with account management, SOCKS5 proxies, and platform monitoring. Ask me anything — for example, account status or proxy health. You can also attach an image for analysis.",
    ts: new Date(),
  };

  function resetChat() {
    setMessages([GREETING]);
    setHistory([]);
    setInput("");
    setAttached(null);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Image pick ──────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToBase64(file).then(setAttached).catch(console.error);
    e.target.value = "";
  }

  function removeAttachment() {
    setAttached(null);
  }

  // ── Send ────────────────────────────────────────────────────────────────

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if ((!text && !attachedImage) || loading) return;

    const img = attachedImage;
    const sentAt = new Date();
    if (!override) setInput("");
    setAttached(null);
    setMessages(prev => [...prev, { role: "user", text: text || "📎", imageUrl: img?.dataUrl, ts: sentAt }]);
    setLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const CAPACITY_MSG = lang === "ua"
      ? "⚠️ Асистент тимчасово перевантажений. Спробуйте ще раз за хвилину."
      : "⚠️ The Assistant is temporarily over capacity. Please try again in a moment.";

    try {
      const secret = getStoredSecret();
      const body: Record<string, unknown> = { message: text || "Please analyze the attached image.", history };
      if (img) {
        body.imageBase64  = img.base64;
        body.imageMimeType = img.mimeType;
      }

      const res = await fetch(`${API_BASE}/api/v3/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "model", text: CAPACITY_MSG, ts: new Date() }]);
        return;
      }

      const data = await res.json() as { reply: string; history: HistoryItem[]; engine?: string };
      setMessages(prev => [...prev, { role: "model", text: data.reply, engine: data.engine, ts: new Date() }]);
      setHistory(data.history ?? []);
    } catch {
      setMessages(prev => [...prev, { role: "model", text: CAPACITY_MSG, ts: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, history, attachedImage, lang]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const canSend = (input.trim().length > 0 || attachedImage !== null) && !loading;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)",
            border: "1px solid rgba(139,92,246,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(139,92,246,0.25)", flexShrink: 0,
          }}>
            <Cpu size={18} color="#a78bfa" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8ff", letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: 6 }}>
              {lang === "ua" ? "AI Помічник" : "AI Assistant"}
              <Sparkles size={13} color="#a78bfa" style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.55)", marginTop: 1 }}>
              PROMO-Fuel System Copilot
            </div>
          </div>
          {/* Clear chat button — only visible when there's a conversation */}
          {messages.length > 1 && (
            <button
              onClick={resetChat}
              disabled={loading}
              title={lang === "ua" ? "Очистити чат" : "Clear chat"}
              style={{
                width: 34, height: 34, borderRadius: 11,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.3)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <Trash2 size={15} color="rgba(160,180,230,0.5)" />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        <style>{`
          @keyframes aiTyping  { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
          @keyframes aiFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, animation: "aiFadeIn 0.3s ease both" }}>


            {/* Avatar (AI only) */}
            {msg.role === "model" && (
              <div style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.35) 100%)",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(139,92,246,0.2)",
              }}>
                <Bot size={14} color="#a78bfa" />
              </div>
            )}

            {/* Bubble + timestamp column */}
            <div style={{
              maxWidth: "78%",
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 3,
            }}>
              <div style={{
                padding: msg.imageUrl ? "6px" : "10px 13px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.3) 100%)"
                  : "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
                border: msg.role === "user" ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: msg.role === "user" ? "0 4px 16px rgba(59,130,246,0.15)" : "0 4px 16px rgba(0,0,0,0.25)",
                display: "flex",
                flexDirection: "column",
              }}>
                {/* Attached image preview in bubble */}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="attachment"
                    style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 12, objectFit: "contain", marginBottom: msg.text && msg.text !== "📎" ? 6 : 0 }}
                  />
                )}
                {msg.text && msg.text !== "📎" && (
                  <div style={{ padding: msg.imageUrl ? "4px 7px 4px" : "0" }}>
                    <MessageContent text={msg.text} />
                  </div>
                )}
                {/* Copy + Groq badge row for model messages */}
                {msg.role === "model" && msg.text && msg.text !== "📎" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                    <CopyButton text={msg.text} />
                    {msg.engine === "groq" && (
                      <div style={{ fontSize: 9, color: "rgba(167,139,250,0.5)", letterSpacing: "0.04em", paddingRight: 2 }}>
                        ⚡ Groq · Llama
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div style={{
                fontSize: 10,
                color: "rgba(120,140,180,0.38)",
                letterSpacing: "0.02em",
                paddingLeft: msg.role === "user" ? 0 : 2,
                paddingRight: msg.role === "user" ? 2 : 0,
              }}>
                {msg.ts.toLocaleTimeString(lang === "ua" ? "uk-UA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 8, animation: "aiFadeIn 0.3s ease both" }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: "linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.35) 100%)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={14} color="#a78bfa" />
            </div>
            <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "aiTyping 1.4s ease-in-out infinite", animationDelay: `${d * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Quick-reply suggestion chips — shown only on fresh chat */}
        {messages.length === 1 && !loading && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            padding: "4px 0 8px",
            animation: "aiFadeIn 0.4s ease 0.15s both",
          }}>
            {(SUGGESTIONS[lang] ?? SUGGESTIONS["en"]).map((chip, i) => (
              <button
                key={i}
                onClick={() => void send(chip)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.12) 100%)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "rgba(196,181,253,0.9)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transition: "all 0.18s ease",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "linear-gradient(135deg, rgba(139,92,246,0.28) 0%, rgba(59,130,246,0.22) 100%)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.55)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.12) 100%)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.3)";
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: "8px 12px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(0deg, rgba(7,9,15,0.8) 0%, transparent 100%)" }}>

        {/* Image preview strip */}
        {attachedImage && (
          <div style={{ marginBottom: 8, position: "relative", display: "inline-block" }}>
            <img
              src={attachedImage.dataUrl}
              alt="preview"
              style={{ height: 64, borderRadius: 10, border: "1px solid rgba(139,92,246,0.4)", objectFit: "cover", display: "block" }}
            />
            <button
              onClick={removeAttachment}
              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            >
              <X size={10} color="rgba(220,235,255,0.8)" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 20, padding: "8px 8px 8px 14px", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset" }}>

          {/* Attach button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            title={lang === "ua" ? "Прикріпити зображення" : "Attach image"}
            style={{ width: 32, height: 32, borderRadius: 10, background: attachedImage ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${attachedImage ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.18s" }}
          >
            <Paperclip size={14} color={attachedImage ? "#a78bfa" : "rgba(160,180,230,0.4)"} />
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === "ua" ? "Запитайте про проксі, акаунти, кампанії…" : "Ask about proxies, accounts, campaigns…"}
            rows={1}
            disabled={loading}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "rgba(220,235,255,0.92)", fontSize: 14, lineHeight: "1.5", resize: "none", maxHeight: 120, overflowY: "auto", scrollbarWidth: "none", fontFamily: "inherit", paddingTop: 2 }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />

          {/* Send button */}
          <button
            onClick={() => void send()}
            disabled={!canSend}
            style={{ width: 36, height: 36, borderRadius: 13, background: canSend ? "linear-gradient(135deg, rgba(139,92,246,0.7) 0%, rgba(59,130,246,0.65) 100%)" : "rgba(255,255,255,0.06)", border: canSend ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSend ? "pointer" : "not-allowed", flexShrink: 0, transition: "all 0.22s ease", boxShadow: canSend ? "0 0 16px rgba(139,92,246,0.3)" : "none" }}
          >
            <Send size={16} color={canSend ? "#c4b5fd" : "rgba(160,180,230,0.3)"} />
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: "rgba(120,140,180,0.4)", marginTop: 6, letterSpacing: "0.03em" }}>
          {lang === "ua" ? "Enter — надіслати · Shift+Enter — новий рядок" : "Enter — send · Shift+Enter — new line"}
        </div>
      </div>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy"
      style={{
        marginTop: 6,
        padding: "3px 8px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 8,
        background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
        cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        alignSelf: "flex-start",
      }}
    >
      {copied
        ? <Check size={11} color="rgba(74,222,128,0.9)" />
        : <Copy size={11} color="rgba(160,180,230,0.45)" />}
      <span style={{
        fontSize: 10,
        color: copied ? "rgba(74,222,128,0.9)" : "rgba(160,180,230,0.4)",
        letterSpacing: "0.03em",
        transition: "color 0.18s",
      }}>
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

// ── Message content renderer ──────────────────────────────────────────────

function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(220,235,255,0.9)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "#e2e8ff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 5, padding: "1px 5px", fontSize: 12, color: "#c4b5fd", fontFamily: "monospace" }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
