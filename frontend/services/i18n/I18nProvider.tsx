import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { readPersistedValue, writePersistedValue } from "../storage/persistedValue";
import { en } from "./en";
import { fr, type TranslationKey } from "./fr";

export type Locale = "fr" | "en";

const STORAGE_KEY = "booklistpro.locale";
const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, fr };

type TranslateParams = Readonly<Record<string, string | number>>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "fr" || value === "en";
}

function interpolate(template: string, params?: TranslateParams) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    let annule = false;

    readPersistedValue(STORAGE_KEY)
      .then((stored) => {
        if (!annule && isLocale(stored)) {
          setLocaleState(stored);
        }
      })
      .catch(() => undefined);

    return () => {
      annule = true;
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    void writePersistedValue(STORAGE_KEY, nextLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => interpolate(dictionaries[locale][key], params),
    [locale]
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation doit etre utilise a l'interieur de I18nProvider");
  }

  return context;
}
