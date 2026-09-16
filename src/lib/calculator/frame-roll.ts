export { binomialRange, uniformSumRange, expectedAndChance } from '@/lib/utils/probability';

export const SESSION_FRAMES = 60;

export function gatheringFrameXpTotal(
  xpPerAction: number,
  toolEfficiencyValue: number,
  petBoostPct: number,
  frames = SESSION_FRAMES,
): number {
  const baseXp = Math.floor(xpPerAction * toolEfficiencyValue);
  const xpGain = petBoostPct > 0 ? Math.floor(baseXp * (1 + petBoostPct / 100)) : baseXp;
  return xpGain * frames;
}
