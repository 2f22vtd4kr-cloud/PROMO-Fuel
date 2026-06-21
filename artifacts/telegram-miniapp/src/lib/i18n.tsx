import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Lang, type Translations } from "./translations";

const STORAGE_KEY = "promo_fuel_lang";

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && (stored === "ru" || stored === "en" || stored === "uk")) return stored;
  } catch {}
  return "ru";
}

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const I18nContext = createContext<I18nCtx>({
  lang: "ru",
  setLang: () => {},
  t: translations.ru,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nCtx {
  return useContext(I18nContext);
}
