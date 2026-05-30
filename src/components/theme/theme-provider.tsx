"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const COOKIE_KEY = "theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)theme=(dark|light)/);
  return (match?.[1] as Theme | undefined) ?? null;
}

function writeCookie(value: Theme) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Theme is now cookie-driven. The root layout reads the `theme` cookie
 * on the server and renders `<html class="dark">` accordingly, which
 * means there's no className mismatch between SSR and client and no
 * need for a pre-paint script (which React 19 warns about in dev).
 *
 * This provider mirrors the cookie value into React state so the
 * toggle and other components can subscribe and re-render.
 */
export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeCookie(next);
    const d = document.documentElement;
    d.classList.toggle("dark", next === "dark");
    d.style.colorScheme = next;
  }, []);

  // Keep React state in sync if another tab changes the cookie via setTheme
  // there (we don't have a true cross-tab event, but reading on focus is a
  // cheap safety net).
  useEffect(() => {
    const onFocus = () => {
      const c = readCookie();
      if (c && c !== theme) setThemeState(c);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [theme]);

  // Re-apply class on every render in case a parent re-render replaces
  // the html className (happens during locale-change soft navigations
  // because the SSR class string is recalculated).
  useEffect(() => {
    const d = document.documentElement;
    d.classList.toggle("dark", theme === "dark");
    d.style.colorScheme = theme;
  });

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "dark", setTheme: () => {} };
  }
  return ctx;
}
