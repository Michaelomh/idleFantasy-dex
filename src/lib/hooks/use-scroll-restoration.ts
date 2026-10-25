import { useLayoutEffect } from 'react';

/**
 * Restores a page's scroll position once its async content is `ready`. React Router's
 * <ScrollRestoration> restores while the loading screen is still up, so the browser clamps it to 0.
 * [key] must come from the route: it changes in the same commit as the location, before the old
 * content is replaced.
 */
export function useScrollRestoration(key: string | null, ready: boolean) {
  // Layout effect: React runs every cleanup in a commit before any layout effect body, so this
  // cleanup reads scrollY before <ScrollRestoration> scrolls the next route.
  useLayoutEffect(() => {
    if (!key || !ready) return;
    const storageKey = `scroll:${key}`;
    const save = () => sessionStorage.setItem(storageKey, String(window.scrollY));
    const saved = sessionStorage.getItem(storageKey);
    let pending = saved
      ? requestAnimationFrame(() => {
          pending = 0;
          window.scrollTo(0, Number(saved));
        })
      : 0;
    // Covers a reload or a closed tab, where the cleanup never runs.
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('pagehide', save);
      // Left before the restore ran (or StrictMode's dev remount): keep the stored position.
      if (pending) cancelAnimationFrame(pending);
      else save();
    };
  }, [key, ready]);
}
