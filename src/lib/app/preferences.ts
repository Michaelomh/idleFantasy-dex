import { CircleCheck, CircleDashed, ListChecks, type LucideIcon } from 'lucide-react';

export type Filter = 'all' | 'done' | 'missing';

export const FILTER_OPTIONS: { value: Filter; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'done', label: 'Done', icon: CircleCheck },
  { value: 'missing', label: 'Missing', icon: CircleDashed },
];

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

const SHOW_EXPERIMENTAL_KEY = 'idlefantasy-dex:show-experimental';
const showExperimentalListeners = new Set<() => void>();

export function getShowExperimental(): boolean {
  try {
    return window.localStorage.getItem(SHOW_EXPERIMENTAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function setShowExperimental(show: boolean) {
  try {
    if (show) window.localStorage.setItem(SHOW_EXPERIMENTAL_KEY, '1');
    else window.localStorage.removeItem(SHOW_EXPERIMENTAL_KEY);
  } catch {
    /* localStorage unavailable (private mode, etc.) - falls back to "hidden" next load */
  }
  showExperimentalListeners.forEach((listener) => listener());
}

export function subscribeShowExperimental(listener: () => void): () => void {
  showExperimentalListeners.add(listener);
  return () => showExperimentalListeners.delete(listener);
}

const INCLUDE_ELDER_ISLE_KEY = 'idlefantasy-dex:include-elder-isle';
const includeElderIsleListeners = new Set<() => void>();

export function getIncludeElderIsle(): boolean {
  try {
    return window.localStorage.getItem(INCLUDE_ELDER_ISLE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setIncludeElderIsle(include: boolean) {
  try {
    if (include) window.localStorage.setItem(INCLUDE_ELDER_ISLE_KEY, '1');
    else window.localStorage.removeItem(INCLUDE_ELDER_ISLE_KEY);
  } catch {
    /* localStorage unavailable (private mode, etc.) - falls back to "excluded" next load */
  }
  includeElderIsleListeners.forEach((listener) => listener());
}

export function subscribeIncludeElderIsle(listener: () => void): () => void {
  includeElderIsleListeners.add(listener);
  return () => includeElderIsleListeners.delete(listener);
}
