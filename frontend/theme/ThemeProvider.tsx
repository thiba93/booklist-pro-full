import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Appearance } from "react-native";

import { readPersistedValue, writePersistedValue } from "../services/storage/persistedValue";
import { buildTheme, type Theme, type ThemeMode } from "./theme";

const STORAGE_KEY = "booklistpro.theme-mode";

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function systemMode(): ThemeMode {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(systemMode);

  useEffect(() => {
    let annule = false;

    readPersistedValue(STORAGE_KEY)
      .then((stored) => {
        if (!annule && isThemeMode(stored)) {
          setModeState(stored);
        }
      })
      .catch(() => undefined);

    return () => {
      annule = true;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void writePersistedValue(STORAGE_KEY, nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, theme: buildTheme(mode), toggleMode }),
    [mode, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeMode doit etre utilise a l'interieur de ThemeProvider");
  }

  return context;
}
