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
