import { xpForLevel } from '@/lib/utils/xp-table';

/** Inverse of xpForLevel — the level implied by a running XP total, clamped to [1, 99]. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let l = 2; l <= 99; l++) {
    if (xp < xpForLevel(l)) break;
    level = l;
  }
  return level;
}

export { xpForLevel };
