import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";
import { haptic } from "../lib/haptics";

const LANGS: Lang[] = ["ru", "en", "uk"];

export function LangSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div style={{
      display: "flex",
      gap: 2,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 10,
      padding: "3px 4px",
    }}>
      {LANGS.map(l => {
        const active = l === lang;
        return (
          <button
            key={l}
            onClick={() => { haptic.select(); setLang(l); }}
            style={{
              border: "none",
              background: active
                ? "rgba(107,168,229,0.22)"
                : "transparent",
              borderRadius: 7,
              padding: "3px 7px",
              fontSize: 9,
              fontWeight: active ? 800 : 500,
              color: active ? "#95c4f5" : "rgba(160,190,230,0.50)",
              cursor: "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              transition: "background 0.18s, color 0.18s",
              outline: "none",
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
