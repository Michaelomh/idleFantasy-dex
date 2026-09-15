import type { PlayerState } from '@/lib/save-source/types';
import { getFishEntries, getFishingSkillData } from '../game-data';
import { humanize } from '@/lib/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { SESSION_FRAMES, expectedAndChance } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

function tierFor(level: number, tiers: Record<string, unknown>): string {
  const keys = Object.keys(tiers)
    .map(Number)
    .filter((n) => n <= level)
    .sort((a, b) => b - a);
  return String(keys[0] ?? Object.keys(tiers)[0]);
}

export async function fishing(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [fish, skillData, mods] = await Promise.all([
    getFishEntries(),
    getFishingSkillData(),
    resolveModifiers(playerState, 'fishing', inputs.timedBoostsEnabled),
  ]);

  const target = fish[inputs.targetKey];
  const xpPerCatch = (target?.xp_per_catch as number | undefined) ?? 0;
  const totalActions = SESSION_FRAMES * mods.toolEff * mods.toolEffMultiplier;
  const dropTableActions = totalActions * 0.2;
  const tier = tierFor(mods.level, skillData.drop_tables);
  const rows = skillData.drop_tables[tier] ?? [];
  const sumChances = rows.reduce((sum, r) => sum + r.chance, 0);
  const guaranteedFishActions = totalActions - dropTableActions * sumChances;

  const rawXp = totalActions * xpPerCatch;
  const guaranteedQty = applyYieldMultiplier(guaranteedFishActions, mods);

  const bonusItems = rows
    .filter((r) => r.chance > 0)
    .map((r) => {
      const avgQty = r.min_qty !== undefined && r.max_qty !== undefined ? (r.min_qty + r.max_qty) / 2 : 1;
      const { chanceAtLeastOne, rangeMin, rangeMax } = expectedAndChance(Math.round(dropTableActions), r.chance);
      const expected = dropTableActions * r.chance * avgQty;
      return {
        key: r.item,
        label: humanize(r.item),
        expected,
        chanceAtLeastOne,
        rangeMin: Math.round(rangeMin * avgQty),
        rangeMax: Math.round(rangeMax * avgQty),
      };
    });

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [
      { key: inputs.targetKey, label: target?.display_name ?? humanize(inputs.targetKey), qty: guaranteedQty },
    ],
    bonusItems,
    yieldBreakdown: withBaseRow('Base yield', SESSION_FRAMES * (1 - 0.2 * sumChances), [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * (1 - 0.2 * sumChances)),
      ...mods.yieldModifiers,
    ]),
    xpBreakdown: withBaseRow('Base XP', SESSION_FRAMES * xpPerCatch, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * xpPerCatch),
      ...mods.xpModifiers,
    ]),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
  };
}
