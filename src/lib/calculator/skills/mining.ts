import type { PlayerState } from '@/lib/save-source/types';
import { getGems } from '@/lib/progress/game-data';
import { getOreEntries } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { expectedAndChance, gatheringFrameXpTotal, SESSION_FRAMES } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

export async function mining(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [ores, gems] = await Promise.all([getOreEntries(), getGems()]);

  const ore = ores[inputs.targetKey];
  const mods = await resolveModifiers(
    playerState,
    'mining',
    inputs.timedBoostsEnabled,
    (ore?.level_required as number | undefined) ?? 0,
  );
  const xpPerOre = (ore?.xp_per_ore as number | undefined) ?? 0;
  const rawUnits = SESSION_FRAMES * mods.toolEff * mods.toolEffMultiplier;
  const rawXp = gatheringFrameXpTotal(xpPerOre, mods.toolEff * mods.toolEffMultiplier, mods.petBoostPct);
  const guaranteedQty = applyYieldMultiplier(rawUnits, mods);
  const yieldMult = mods.yieldMultiplier;
  const bonusItems = Object.entries(gems)
    .map(([key, gem]) => {
      const p = ((gem.drop_rate as number | undefined) ?? 0) * mods.gemChanceMult;
      const { expected, chanceAtLeastOne, rangeMin, rangeMax } = expectedAndChance(Math.round(rawUnits), p);
      return {
        key,
        label: gem.display_name ?? humanize(key),
        expected: expected * yieldMult,
        chanceAtLeastOne,
        rangeMin: Math.round(rangeMin * yieldMult),
        rangeMax: Math.round(rangeMax * yieldMult),
      };
    })
    .filter((g) => g.expected > 0);

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [
      { key: inputs.targetKey, label: ore?.display_name ?? humanize(inputs.targetKey), qty: guaranteedQty },
    ],
    bonusItems,
    yieldBreakdown: [
      { label: 'Ore', value: '', heading: true },
      ...withBaseRow('Base Yield', SESSION_FRAMES, [
        ...toolEfficiencyRows(mods, SESSION_FRAMES),
        ...mods.yieldModifiers,
      ]),
      { label: 'Gems', value: '', heading: true },
      ...mods.gemModifiers,
    ],
    xpBreakdown: withBaseRow('Base XP', SESSION_FRAMES * xpPerOre, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * xpPerOre),
      ...(mods.petBoostPct > 0
        ? [
            {
              label: 'Pet XP Boost',
              value: `+${mods.petBoostPct}%`,
              info: `This can be higher due to your prestige skill tree${mods.petBoostNodeLabel ? ` (${mods.petBoostNodeLabel})` : ''}.`,
            },
          ]
        : []),
      ...mods.xpModifiers,
    ]),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
  };
}
