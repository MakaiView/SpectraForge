"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { PAL, DEFAULT_ACCENT, accentVars, type AccentKey, type ThemeMode } from "@/lib/theme/palette";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentKey;
  toggleMode: () => void;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Apply theme + accent to <html> as one attribute swap + inline vars. */
function applyToDom(mode: ThemeMode, accent: AccentKey) {
  const el = document.documentElement;
  el.setAttribute("data-sf", mode === "light" ? "light" : "dark");
  const vars = accentVars(accent, mode);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initial values are re-synced from localStorage on mount to match the
  // no-FOUC boot script; SSR renders the dark default.
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentKey>(DEFAULT_ACCENT);

  useEffect(() => {
    const savedMode = (localStorage.getItem("sf_theme") as ThemeMode) || "dark";
    const savedAccent = (localStorage.getItem("sf_accent") as AccentKey) || DEFAULT_ACCENT;
    const validAccent = savedAccent in PAL ? savedAccent : DEFAULT_ACCENT;
    setModeState(savedMode === "light" ? "light" : "dark");
    setAccentState(validAccent);
    applyToDom(savedMode, validAccent);
  }, []);

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      localStorage.setItem("sf_theme", m);
      applyToDom(m, accent);
    },
    [accent]
  );

  const setAccent = useCallback(
    (a: AccentKey) => {
      setAccentState(a);
      localStorage.setItem("sf_accent", a);
      applyToDom(mode, a);
    },
    [mode]
  );

  const toggleMode = useCallback(() => setMode(mode === "dark" ? "light" : "dark"), [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, accent, toggleMode, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
