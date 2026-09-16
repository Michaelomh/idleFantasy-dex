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
import { SESSION_FRAMES, expectedAndChance, gatheringFrameXpTotal, binomialRange } from '../frame-roll';
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
  const pAllMiss = rows.reduce((product, r) => product * (1 - r.chance), 1);
  const guaranteedFraction = 0.8 + 0.2 * pAllMiss;
  const guaranteedFishActions = totalActions * guaranteedFraction;

  const rawXp = gatheringFrameXpTotal(xpPerCatch, mods.toolEff * mods.toolEffMultiplier, mods.petBoostPct);
  const guaranteedQty = applyYieldMultiplier(guaranteedFishActions, mods);
  const yieldMult = mods.yieldMultiplier;

  const perFrameQty = mods.toolEff * mods.toolEffMultiplier;
  const [nonHitFramesLow, nonHitFramesHigh] = binomialRange(SESSION_FRAMES, guaranteedFraction);
  const guaranteedQtyMin = applyYieldMultiplier(nonHitFramesLow * perFrameQty, mods);
  const guaranteedQtyMax = applyYieldMultiplier(nonHitFramesHigh * perFrameQty, mods);

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
        qtyMin: guaranteedQtyMin,
        qtyMax: guaranteedQtyMax,
      },
    ],
    bonusItems,
    yieldBreakdown: [
      { label: 'Fish', value: '', heading: true },
      ...withBaseRow('Base Yield', SESSION_FRAMES * guaranteedFraction, [
        ...toolEfficiencyRows(mods, SESSION_FRAMES * guaranteedFraction),
        ...mods.yieldModifiers,
      ]),
      {
        label: 'Catch Rate',
        value: `${(guaranteedFraction * 100).toFixed(1)}%`,
        info: 'Sometimes you catch a bonus item instead of your chosen fish. This is how often you catch your chosen fish instead of a bonus item.',
      },
      { label: 'Bonus catches', value: '', heading: true },
      ...(yieldMult > 1
        ? [{ label: `Yield Bonus${yieldSources ? ` (${yieldSources})` : ''}`, value: `x${yieldMult.toFixed(2)}` }]
        : []),
      {
        label: 'Catch Rate',
        value: `${((1 - guaranteedFraction) * 100).toFixed(1)}%`,
        info: 'Sometimes you catch a bonus item instead of your chosen fish. This is how often that happens.',
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
