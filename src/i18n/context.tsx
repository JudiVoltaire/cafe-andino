"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Locale } from "./index";
import { getDictionary, type Dictionary } from "./dictionaries";

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
}>({
  locale: "es",
  setLocale: () => {},
  t: getDictionary("es"),
});

const STORAGE_KEY = "pos-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [t, setT] = useState<Dictionary>(getDictionary("es"));

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const cookieLocale = document.cookie.split("; ").find(r => r.startsWith("pos-locale="))?.split("=")[1];
    if (stored && ["es", "vi", "en", "zh", "ko", "ja"].includes(stored)) {
      setLocaleState(stored);
      setT(getDictionary(stored));
      // Set cookie on initial load so server components can pick up the locale
      if (cookieLocale !== stored) {
        document.cookie = `pos-locale=${stored};path=/;max-age=31536000;SameSite=Lax`;
      }
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setT(getDictionary(l));
    localStorage.setItem(STORAGE_KEY, l);
    // Set cookie so server components can read locale
    document.cookie = `pos-locale=${l};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
