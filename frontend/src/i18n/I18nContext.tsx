import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
} from "react";
import { translations, type Lang } from "./translations";

interface I18nContextValue {
  lang: Lang;
  t: (ns: keyof typeof translations["ru"], key: string) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "lang";

function getInitialLang(): Lang {
  const fromStorage = (typeof window !== "undefined" &&
    window.localStorage.getItem(STORAGE_KEY)) as Lang | null;
  if (fromStorage === "en" || fromStorage === "ru" || fromStorage === "ky") return fromStorage;
  return "ru";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const value: I18nContextValue = useMemo(
    () => ({
      lang,
      setLang,
      t: (ns, key) => {
        const current = translations[lang][ns] as Record<string, string>;
        const ruFallback = translations.ru[ns] as Record<string, string>;
        return current[key] ?? ruFallback[key] ?? key;
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

