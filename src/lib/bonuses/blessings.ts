import { humanize } from '@/lib/utils/humanize';
import type { BlessingEntry } from '@/lib/progress/game-data';

export type ActiveBlessing = {
  key: string;
  label: string;
  magnitude: number;
};

export function resolveActiveBlessing(
  type: BlessingEntry['type'],
  activeBlessingKey: string,
  expiresAt: number,
  blessings: BlessingEntry[],
  now = Date.now(),
): ActiveBlessing | null {
  if (!activeBlessingKey || expiresAt <= now) return null;
  const entry = blessings.find((b) => b.key === activeBlessingKey && b.type === type);
  if (!entry) return null;
  return { key: entry.key, label: humanize(entry.key), magnitude: entry.magnitude };
}
