import { humanize } from '@/lib/utils/humanize';

const XP_BLESSING_MAGNITUDE: Record<string, number> = {
  blessed_focus: 1.05,
  blessed_focus_ii: 1.1,
  blessed_focus_iii: 1.15,
  tithe_blessing: 1.18,
  tithe_blessing_ii: 1.2,
  tithe_blessing_iii: 1.25,
  divine_focus: 1.28,
  divine_focus_ii: 1.32,
  divine_grace: 1.37,
  divine_grace_ii: 1.43,
  sacred_grace: 1.5,
};

export type ActiveXpBlessing = {
  key: string;
  label: string;
  xpPct: number;
};

export function resolveActiveXpBlessing(
  activeBlessingKey: string,
  expiresAt: number,
  now: number,
  prayerCapeMult = 1,
): ActiveXpBlessing | null {
  if (!activeBlessingKey || expiresAt <= now) return null;
  const magnitude = XP_BLESSING_MAGNITUDE[activeBlessingKey];
  if (magnitude === undefined) return null;
  return {
    key: activeBlessingKey,
    label: humanize(activeBlessingKey),
    xpPct: Math.round((magnitude - 1) * prayerCapeMult * 1000) / 10,
  };
}
