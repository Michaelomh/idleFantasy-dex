import { useCallback, useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/app/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return [theme, setTheme] as const;
}

function matchMediaLight() {
  return window.matchMedia('(prefers-color-scheme: light)');
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
