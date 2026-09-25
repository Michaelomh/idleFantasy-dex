export type Filter = 'all' | 'done' | 'missing';

const DEFAULT_FILTER_KEY = 'idlefantasy-dex:default-filter';

export function getDefaultFilter(): Filter {
  try {
    const value = window.localStorage.getItem(DEFAULT_FILTER_KEY);
    return value === 'done' || value === 'missing' ? value : 'all';
  } catch {
    return 'all';
  }
}

export function setDefaultFilter(filter: Filter) {
  try {
    if (filter === 'all') window.localStorage.removeItem(DEFAULT_FILTER_KEY);
    else window.localStorage.setItem(DEFAULT_FILTER_KEY, filter);
  } catch {
    /* localStorage unavailable (private mode, etc.) - falls back to "all" next load */
  }
}

const HIDE_EXPERIMENTAL_KEY = 'idlefantasy-dex:hide-experimental';
const hideExperimentalListeners = new Set<() => void>();

export function getHideExperimental(): boolean {
  try {
    return window.localStorage.getItem(HIDE_EXPERIMENTAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHideExperimental(hide: boolean) {
  try {
    if (hide) window.localStorage.setItem(HIDE_EXPERIMENTAL_KEY, '1');
    else window.localStorage.removeItem(HIDE_EXPERIMENTAL_KEY);
  } catch {
    /* localStorage unavailable (private mode, etc.) - falls back to "shown" next load */
  }
  hideExperimentalListeners.forEach((listener) => listener());
}

export function subscribeHideExperimental(listener: () => void): () => void {
  hideExperimentalListeners.add(listener);
  return () => hideExperimentalListeners.delete(listener);
}
