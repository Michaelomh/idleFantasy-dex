import type { PlayerState } from '@/lib/save-source/types';
import { getFishEntries, getFishingSkillData } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
  yieldSourceNames,
} from '../modifiers';
import { SESSION_FRAMES, expectedAndChance, gatheringFrameXpTotal } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

function tierFor(level: number, tiers: Record<string, unknown>): string {
  const keys = Object.keys(tiers)
    .map(Number)
    .filter((n) => n <= level)
    .sort((a, b) => b - a);
  return String(keys[0] ?? Object.keys(tiers)[0]);
}

export async function fishing(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [fish, skillData] = await Promise.all([getFishEntries(), getFishingSkillData()]);

  const target = fish[inputs.targetKey];
  const mods = await resolveModifiers(
    playerState,
    'fishing',
    inputs.timedBoostsEnabled,
    (target?.level_required as number | undefined) ?? 0,
  );
  const xpPerCatch = (target?.xp_per_catch as number | undefined) ?? 0;
  const totalActions = SESSION_FRAMES * mods.toolEff * mods.toolEffMultiplier;
  const tier = tierFor(mods.level, skillData.drop_tables);
  const rows = skillData.drop_tables[tier] ?? [];

  const rawXp = gatheringFrameXpTotal(xpPerCatch, mods.toolEff * mods.toolEffMultiplier, mods.petBoostPct);
  const guaranteedQty = applyYieldMultiplier(totalActions, mods);
  const yieldMult = mods.yieldMultiplier;

  const yieldSources = yieldSourceNames(mods.yieldModifiers);

  const bonusItems = rows
    .filter((r) => r.chance > 0)
    .map((r) => {
      const { expected, chanceAtLeastOne, rangeMin, rangeMax } = expectedAndChance(SESSION_FRAMES, 0.2 * r.chance);
      return {
        key: r.item,
        label: humanize(r.item),
        expected: expected * yieldMult,
        chanceAtLeastOne,
        rangeMin: Math.round(rangeMin * yieldMult),
        rangeMax: Math.round(rangeMax * yieldMult),
      };
    });

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [
      {
        key: inputs.targetKey,
        label: target?.display_name ?? humanize(inputs.targetKey),
        qty: guaranteedQty,
      },
    ],
    bonusItems,
    yieldBreakdown: [
      { label: 'Fish', value: '', heading: true },
      ...withBaseRow('Base Yield', SESSION_FRAMES, [
        ...toolEfficiencyRows(mods, SESSION_FRAMES),
        ...mods.yieldModifiers,
      ]),
      { label: 'Bonus catches', value: '', heading: true },
      ...(yieldMult > 1
        ? [{ label: `Yield Bonus${yieldSources ? ` (${yieldSources})` : ''}`, value: `x${yieldMult.toFixed(2)}` }]
        : []),
      {
        label: 'Bonus Roll Rate',
        value: '20.0%',
        info: 'Each minute has a chance to roll the bonus table on top of your chosen fish. Each item in the table then rolls its own chance.',
      },
    ],
    xpBreakdown: withBaseRow('Base XP', SESSION_FRAMES * xpPerCatch, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * xpPerCatch),
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
