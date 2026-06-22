import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles, Cpu } from "lucide-react";
import { getStoredSecret } from "./LockScreen";
import { useI18n } from "../lib/i18n";

interface Message {
  role: "user" | "model";
  text: string;
  engine?: string;
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

export function AiAssistantPage() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: lang === "ua"
        ? "Привіт! Я PROMO-Fuel System Copilot. Можу допомогти з управлінням акаунтами, проксі SOCKS5 та моніторингом платформи. Запитай мене щось — наприклад, стан акаунтів або статус проксі."
        : "Hi! I'm PROMO-Fuel System Copilot. I can help with account management, SOCKS5 proxies, and platform monitoring. Ask me anything — for example, account status or proxy health.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    const CAPACITY_MSG = lang === "ua"
      ? "⚠️ Асистент тимчасово перевантажений. Спробуйте ще раз за хвилину."
      : "⚠️ The Assistant is temporarily over capacity. Please try again in a moment.";

    try {
      const secret = getStoredSecret();
      const res = await fetch(`${API_BASE}/api/v3/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "model", text: CAPACITY_MSG }]);
        return;
      }

      const data = await res.json() as { reply: string; history: HistoryItem[]; engine?: string };
      setMessages(prev => [...prev, { role: "model", text: data.reply, engine: data.engine }]);
      setHistory(data.history ?? []);
    } catch {
      setMessages(prev => [...prev, { role: "model", text: CAPACITY_MSG }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, history]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Header */}
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
            boxShadow: "0 0 20px rgba(139,92,246,0.25)",
            flexShrink: 0,
          }}>
            <Cpu size={18} color="#a78bfa" />
          </div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#e2e8ff",
              letterSpacing: "0.01em",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {lang === "ua" ? "AI Помічник" : "AI Assistant"}
              <Sparkles size={13} color="#a78bfa" style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.55)", marginTop: 1 }}>
              PROMO-Fuel System Copilot
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        scrollbarWidth: "none",
      }}>
        <style>{`
          .ai-messages::-webkit-scrollbar { display: none; }
          @keyframes aiTyping {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40%            { opacity: 1;   transform: scale(1); }
          }
          @keyframes aiFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-end",
              gap: 8,
              animation: "aiFadeIn 0.3s ease both",
            }}
          >
            {/* Avatar */}
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

            {/* Bubble */}
            <div style={{
              maxWidth: "78%",
              padding: "10px 13px",
              borderRadius: msg.role === "user"
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.3) 100%)"
                : "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
              border: msg.role === "user"
                ? "1px solid rgba(99,102,241,0.35)"
                : "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: msg.role === "user"
                ? "0 4px 16px rgba(59,130,246,0.15)"
                : "0 4px 16px rgba(0,0,0,0.25)",
            }}>
              <MessageContent text={msg.text} />
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{
            display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 8,
            animation: "aiFadeIn 0.3s ease both",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9, flexShrink: 0,
              background: "linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.35) 100%)",
              border: "1px solid rgba(139,92,246,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={14} color="#a78bfa" />
            </div>
            <div style={{
              padding: "12px 16px",
              borderRadius: "18px 18px 18px 4px",
              background: "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", gap: 5, alignItems: "center",
            }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#a78bfa",
                  animation: `aiTyping 1.4s ease-in-out infinite`,
                  animationDelay: `${d * 0.18}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        flexShrink: 0,
        padding: "8px 12px 12px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(0deg, rgba(7,9,15,0.8) 0%, transparent 100%)",
      }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 20,
          padding: "8px 8px 8px 14px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === "ua" ? "Запитайте про проксі, акаунти, кампанії…" : "Ask about proxies, accounts, campaigns…"}
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "rgba(220,235,255,0.92)",
              fontSize: 14,
              lineHeight: "1.5",
              resize: "none",
              maxHeight: 120,
              overflowY: "auto",
              scrollbarWidth: "none",
              fontFamily: "inherit",
              paddingTop: 2,
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 13,
              background: input.trim() && !loading
                ? "linear-gradient(135deg, rgba(139,92,246,0.7) 0%, rgba(59,130,246,0.65) 100%)"
                : "rgba(255,255,255,0.06)",
              border: input.trim() && !loading
                ? "1px solid rgba(139,92,246,0.5)"
                : "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "all 0.22s ease",
              boxShadow: input.trim() && !loading
                ? "0 0 16px rgba(139,92,246,0.3)"
                : "none",
            }}
          >
            <Send
              size={16}
              color={input.trim() && !loading ? "#c4b5fd" : "rgba(160,180,230,0.3)"}
            />
          </button>
        </div>
        <div style={{
          textAlign: "center",
          fontSize: 10,
          color: "rgba(120,140,180,0.4)",
          marginTop: 6,
          letterSpacing: "0.03em",
        }}>
          {lang === "ua" ? "Enter — надіслати · Shift+Enter — новий рядок" : "Enter — send · Shift+Enter — new line"}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return (
    <div style={{
      fontSize: 13.5,
      lineHeight: 1.55,
      color: "rgba(220,235,255,0.9)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "#e2e8ff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} style={{
              background: "rgba(139,92,246,0.2)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 5,
              padding: "1px 5px",
              fontSize: 12,
              color: "#c4b5fd",
              fontFamily: "monospace",
            }}>{part.slice(1, -1)}</code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
