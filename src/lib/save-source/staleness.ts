import type { Staleness } from './types';

const HOUR = 60 * 60 * 1000;

export function staleness(exportedAt: number | null, now = Date.now()): Staleness {
  if (!exportedAt) return { type: 'unknown', label: 'export time unknown', ageMs: null };
  const age = now - exportedAt;
  if (age < 0) return { type: 'future', label: 'exported in the future (clock skew?)', ageMs: age };
  if (age < 24 * HOUR) return { type: 'fresh', label: 'fresh', ageMs: age };
  if (age < 168 * HOUR) return { type: 'aging', label: 'aging', ageMs: age };
  return { type: 'stale', label: 'stale', ageMs: age };
}

export function humanAge(ms: number | null): string {
  if (ms == null) return '—';
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60000);
  if (mins < 60) return mins + 'm';
  const hours = Math.round(abs / HOUR);
  if (hours < 48) return hours + 'h';
  return Math.round(abs / (24 * HOUR)) + 'd';
}
