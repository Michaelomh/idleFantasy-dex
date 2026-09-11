import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'idlefantasy-dex:theme';

export function getStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  try {
    if (theme === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    /* localStorage unavailable (private mode, etc.) — attribute still applies for this load */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return [theme, setTheme] as const;
}

export function useResolvedTheme(theme: Theme): 'light' | 'dark' {
  const [systemResolved, setSystemResolved] = useState<'light' | 'dark'>(() =>
    matchMediaLight().matches ? 'light' : 'dark',
  );

  useEffect(() => {
    if (theme !== 'system') return;
    const mql = matchMediaLight();
    const update = () => setSystemResolved(mql.matches ? 'light' : 'dark');
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [theme]);

  return theme === 'system' ? systemResolved : theme;
}

function matchMediaLight() {
  return window.matchMedia('(prefers-color-scheme: light)');
}
