import type { PlayerState } from '@/lib/save-source/types';
import { getGems } from '@/lib/progress/game-data';
import { getOreEntries } from '../game-data';
import { humanize } from '@/lib/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { expectedAndChance, SESSION_FRAMES } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

export async function mining(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [ores, gems, mods] = await Promise.all([
    getOreEntries(),
    getGems(),
    resolveModifiers(playerState, 'mining', inputs.timedBoostsEnabled),
  ]);

  const ore = ores[inputs.targetKey];
  const xpPerOre = (ore?.xp_per_ore as number | undefined) ?? 0;
  const rawUnits = SESSION_FRAMES * mods.toolEff * mods.toolEffMultiplier;
  const rawXp = rawUnits * xpPerOre;
  const guaranteedQty = applyYieldMultiplier(rawUnits, mods);

  const bonusItems = Object.entries(gems)
    .map(([key, gem]) => {
      const p = ((gem.drop_rate as number | undefined) ?? 0) * mods.gemChanceMult;
      const { expected, chanceAtLeastOne, rangeMin, rangeMax } = expectedAndChance(Math.round(rawUnits), p);
      return { key, label: gem.display_name ?? humanize(key), expected, chanceAtLeastOne, rangeMin, rangeMax };
    })
    .filter((g) => g.expected > 0);

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [
      { key: inputs.targetKey, label: ore?.display_name ?? humanize(inputs.targetKey), qty: guaranteedQty },
    ],
    bonusItems,
    yieldBreakdown: withBaseRow('Base yield', SESSION_FRAMES, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES),
      ...mods.yieldModifiers,
    ]),
    xpBreakdown: withBaseRow('Base XP', SESSION_FRAMES * xpPerOre, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * xpPerOre),
      ...mods.xpModifiers,
    ]),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
  };
}
