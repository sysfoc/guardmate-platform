'use client';

/**
 * ThemeContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides light / dark / system theme control across the GuardMate app.
 *
 * Features:
 *  - Persists user preference in localStorage ('guardmate-theme')
 *  - Applies/removes .dark class on <html> element
 *  - Resolves 'system' via matchMedia('prefers-color-scheme: dark')
 *  - Prevents flash of wrong theme via an inline <script> in layout.tsx
 *    (see the exported THEME_SCRIPT constant below)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  /** The stored preference: 'light' | 'dark' | 'system' */
  theme: ThemeMode;
  /** The actual resolved theme after evaluating system preference */
  resolvedTheme: 'light' | 'dark';
  /** Set the theme preference explicitly */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between light and dark (ignores system preference) */
  toggleTheme: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType | null>(null);

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'guardmate-theme';
const DEFAULT_THEME: ThemeMode = 'system';

// ─── Flash-prevention script ──────────────────────────────────────────────────
// Paste this as a <script> inside <head> in your root layout.tsx to prevent
// the flash of wrong theme before React hydrates.

export const THEME_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : '${DEFAULT_THEME}';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch(e) {}
})();
`.trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark'): void {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override default initial theme (useful for SSR/testing) */
  defaultTheme?: ThemeMode;
}

export function ThemeProvider({ children, defaultTheme = DEFAULT_THEME }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(theme)
  );

  // Apply theme class and update resolvedTheme whenever theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore write failures
    }
  }, [theme]);

  // Watch for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyTheme(newResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const currentResolved = resolveTheme(prev);
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
