import { useEffect } from 'react';

export function useScrollRestoration(key: string | null, ready: boolean) {
  useEffect(() => {
    if (!key || !ready) return;
    const storageKey = `scroll:${key}`;
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const y = Number(saved);
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    const onScroll = () => sessionStorage.setItem(storageKey, String(window.scrollY));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [key, ready]);
}
