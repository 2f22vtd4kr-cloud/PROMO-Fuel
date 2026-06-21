import { useState } from "react";

const TG = {
  bg: "#07090f", text: "#e8f0ff", textSecondary: "#8faac8",
  muted: "rgba(160,190,230,0.45)", green: "#2de897", blue: "#6ba8e5",
  yellow: "#ffc946", red: "#ff6b7a", purple: "#c4aeff", pink: "#ff7eb3",
};

const glass = {
  background: "linear-gradient(145deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.03) 100%)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.11)",
  borderRadius: 18,
  boxShadow: "0 2px 0 rgba(255,255,255,0.08) inset,0 8px 32px rgba(0,0,0,0.38)",
} as React.CSSProperties;

function GlassInput({ label, placeholder, type = "text", hint }: { label: string; placeholder: string; type?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: TG.textSecondary, fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{
        ...glass,
        borderRadius: 14,
        padding: "13px 14px",
        border: `1px solid ${focused ? `${TG.blue}70` : "rgba(255,255,255,0.11)"}`,
        boxShadow: focused ? `0 0 0 3px ${TG.blue}20` : "0 2px 0 rgba(255,255,255,0.08) inset,0 8px 32px rgba(0,0,0,0.38)",
        transition: "all 0.2s",
      }}>
        <div style={{ fontSize: 13, color: TG.muted }}>{placeholder}</div>
      </div>
      {hint && <div style={{ fontSize: 10, color: TG.muted, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: `${color}15`, border: `1px solid ${color}40`, marginRight: 6, marginBottom: 6 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{text}</span>
    </div>
  );
}

export function AddAccountScreen() {
  return (
    <div style={{ height: "100dvh", background: TG.bg, overflowY: "auto", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", WebkitOverflowScrolling: "touch" as any }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -120, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,126,179,0.15) 0%,transparent 72%)" }} />
        <div style={{ position: "absolute", bottom: 80, left: -100, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(107,168,229,0.12) 0%,transparent 72%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "52px 16px 100px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,126,179,0.12)", border: "1px solid rgba(255,126,179,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 14 }}>×</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em" }}>Новый аккаунт</div>
            <div style={{ fontSize: 11, color: TG.muted, marginTop: 1 }}>Подключение Telethon сессии</div>
          </div>
        </div>

        {/* Telethon API section */}
        <div style={{ ...glass, padding: "14px 16px", marginBottom: 14, borderLeft: `2px solid ${TG.blue}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🔑</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>Telethon API</span>
            <div style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 8, background: "rgba(107,168,229,0.12)", border: `1px solid ${TG.blue}30` }}>
              <span style={{ fontSize: 9, color: TG.blue, fontWeight: 700 }}>ОБЯЗАТЕЛЬНО</span>
            </div>
          </div>
          <GlassInput label="API ID" placeholder="12345678" type="number" />
          <GlassInput label="API Hash" placeholder="a3b4c5d6e7f8a1b2c3d4e5f6a7b8c9d0" hint="Получить на my.telegram.org → API development tools" />
        </div>

        {/* Phone */}
        <div style={{ ...glass, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>📱</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>Номер телефона</span>
          </div>
          <GlassInput label="Телефон" placeholder="+7 (999) 000-00-00" type="tel" hint="Международный формат: +7..." />
          <GlassInput label="Метка (необяз.)" placeholder="Основной аккаунт / Резервный" />
        </div>

        {/* Proxy */}
        <div style={{ ...glass, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TG.text }}>Прокси</div>
              <div style={{ fontSize: 10, color: TG.muted }}>Один или несколько через запятую</div>
            </div>
          </div>
          <GlassInput label="SOCKS5 / HTTP" placeholder="socks5://user:pass@host:port" hint="Для ротации: несколько строк через перевод строки" />
          <div style={{ marginTop: 4 }}>
            <Tag text="socks5" color={TG.green} />
            <Tag text="http" color={TG.blue} />
            <Tag text="https" color={TG.purple} />
          </div>
        </div>

        {/* Sessions info */}
        <div style={{ ...glass, padding: "12px 14px", marginBottom: 20, background: "rgba(45,232,151,0.04)", border: "1px solid rgba(45,232,151,0.15)", borderRadius: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
            <div>
              <div style={{ fontSize: 11, color: TG.green, fontWeight: 700, marginBottom: 3 }}>Как это работает</div>
              <div style={{ fontSize: 10, color: TG.textSecondary, lineHeight: 1.6 }}>
                После добавления нужно авторизоваться — введи код из Telegram. Один воркер использует одну сессию за раз. Несколько аккаунтов = параллельная рассылка.
              </div>
            </div>
          </div>
        </div>

        {/* Add button */}
        <button style={{
          width: "100%", padding: "15px", borderRadius: 18,
          background: `linear-gradient(135deg,${TG.pink},${TG.purple})`,
          border: "none", fontSize: 14, fontWeight: 800, color: "#07090f",
          cursor: "pointer", letterSpacing: "-0.01em",
          boxShadow: `0 8px 32px ${TG.pink}40`,
        }}>
          Добавить аккаунт
        </button>
      </div>
    </div>
  );
}
