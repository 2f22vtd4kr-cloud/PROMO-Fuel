import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";
import { haptic } from "../lib/haptics";

const LANGS: Lang[] = ["en", "ua"];

export function LangSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div style={{
      display: "flex",
      gap: 0,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 8,
      padding: 2,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
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
                ? "linear-gradient(145deg, rgba(107,168,229,0.30) 0%, rgba(107,168,229,0.15) 100%)"
                : "transparent",
              boxShadow: active
                ? "0 1px 0 rgba(255,255,255,0.14) inset, 0 0 10px rgba(107,168,229,0.18)"
                : "none",
              borderRadius: 6,
              padding: "3px 6px",
              fontSize: 9,
              fontWeight: active ? 700 : 400,
              color: active ? "#95c4f5" : "rgba(160,190,230,0.40)",
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "all 0.18s ease",
              outline: "none",
              minWidth: 24,
              textAlign: "center",
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
