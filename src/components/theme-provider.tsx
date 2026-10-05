"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { THEME_STORAGE_KEY, type ResolvedTheme, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme | undefined;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_EVENT = "portfolio:theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Keeps the choice working for this page view when localStorage is blocked (private mode).
let memoryTheme: Theme | undefined;

function readStoredTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage can be blocked; fall back to the in-memory value.
  }
  if (stored === "light" || stored === "dark" || stored === "system") {
    memoryTheme = stored;
    return stored;
  }
  return memoryTheme ?? "system";
}

function subscribeTheme(onChange: () => void) {
  // The storage event only fires in other tabs; the custom event covers this one.
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function subscribeSystemDark(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSystemDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

// Server render and hydration both use undefined, so they always agree; the real
// values arrive in the re-render React performs right after hydration.
const getServerValue = () => undefined;

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  // Without this the class flip animates every colour transition on the page.
  const style = document.createElement("style");
  style.appendChild(document.createTextNode("*,*::before,*::after{transition:none!important}"));
  document.head.appendChild(style);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  void window.getComputedStyle(document.body).transition;
  window.setTimeout(() => style.remove(), 1);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // undefined until the stored preference has been read on the client, so the server
  // render and the first client render stay identical and hydration cannot mismatch.
  const theme = useSyncExternalStore<Theme | undefined>(
    subscribeTheme,
    readStoredTheme,
    getServerValue,
  );
  const systemDark = useSyncExternalStore<boolean | undefined>(
    subscribeSystemDark,
    getSystemDark,
    getServerValue,
  );

  const setTheme = useCallback((next: Theme) => {
    memoryTheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the in-memory value keeps this page view in sync.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const resolvedTheme: ResolvedTheme | undefined =
    theme === undefined || systemDark === undefined
      ? undefined
      : theme === "system"
        ? systemDark
          ? "dark"
          : "light"
        : theme;

  useEffect(() => {
    if (resolvedTheme === undefined) {
      return;
    }
    applyTheme(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
