import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment } from '@/lib/progress/game-data';
import { getThievingNpcs } from '@/lib/calculator/game-data';
import { humanize } from '@/lib/utils/humanize';
import { resolveModifiers, applyXpMultipliers, applyYieldMultiplier } from '@/lib/calculator/modifiers';
import { toolEfficiency } from '@/lib/calculator/tool-efficiency';
import { SESSION_FRAMES, binomialRange, uniformIntVariance, compoundRollRange } from '@/lib/calculator/frame-roll';
import type { CalculatorInputs, ModifierRow, SessionResult } from '@/lib/calculator/types';

const SUCCESS_MIN = 0.1;
const SUCCESS_MAX = 0.98;

const RANGE_INFO = 'This is a 5th-95th percentile range, not the absolute min/max - real sessions can land outside it.';

export async function thieving(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [npcs, equipment] = await Promise.all([getThievingNpcs(), getEquipment()]);

  const npc = npcs.find((n) => n.key === inputs.targetKey);
  const npcLevel = npc?.level_required ?? 1;
  const mods = await resolveModifiers(playerState, 'thieving', inputs.timedBoostsEnabled, npcLevel);
  const lockpickEff = toolEfficiency('thieving', playerState, equipment, npcLevel);

  const levelDiff = mods.level - npcLevel;
  const levelBonus = levelDiff * 0.02 * lockpickEff;
  const uncappedSuccess = 0.5 + levelBonus + mods.thievingSuccessBonus;
  const success = Math.min(SUCCESS_MAX, Math.max(SUCCESS_MIN, uncappedSuccess));

  const attempts = SESSION_FRAMES;
  const expectedSuccesses = attempts * success;
  const petMult = 1 + mods.petBoostPct / 100;
  // Game: floor(floor(base_xp * lockpickEff) * petMult) per success.
  const lockpickXp = Math.floor((npc?.base_xp ?? 0) * lockpickEff);
  const baseXp = Math.floor(lockpickXp * petMult);
  const coinMult = 1 + mods.thievingCoinPct / 100;

  const roundedAttempts = Math.round(attempts);

  const bonusItems = (npc?.loot_table ?? []).map((row) => {
    const rawMinQty = row.min_qty ?? 1;
    const rawMaxQty = row.max_qty ?? 1;
    const rawAvgQty = (rawMinQty + rawMaxQty) / 2;
    const avgQty = applyYieldMultiplier(rawAvgQty, mods);
    const qtyVar = uniformIntVariance(rawMinQty, rawMaxQty) * mods.yieldMultiplier ** 2;
    const hitChance = success * row.chance;
    const chanceAtLeastOne = 1 - Math.pow(1 - hitChance, roundedAttempts);
    const [rangeMin, rangeMax] = compoundRollRange(roundedAttempts, hitChance, avgQty, qtyVar);
    const expected = attempts * success * row.chance * avgQty;
    return {
      key: row.item,
      label: humanize(row.item),
      expected,
      chanceAtLeastOne,
      rangeMin,
      rangeMax,
    };
  });

  if (npc) {
    const avgCoins = ((npc.coins_min + npc.coins_max) / 2) * coinMult;
    const coinsVar = uniformIntVariance(npc.coins_min, npc.coins_max) * coinMult ** 2;
    const chanceAtLeastOne = 1 - Math.pow(1 - success, roundedAttempts);
    const [rangeMin, rangeMax] = compoundRollRange(roundedAttempts, success, avgCoins, coinsVar);
    bonusItems.push({
      key: 'coins',
      label: 'Coins',
      expected: attempts * success * avgCoins,
      chanceAtLeastOne,
      rangeMin,
      rangeMax,
    });
  }

  const [successesLow, successesHigh] = binomialRange(roundedAttempts, success);

  const successBreakdown: ModifierRow[] = [
    ...(mods.thievingSuccessBonus > 0
      ? [{ label: 'Shadow Step (prestige)', value: `+${(mods.thievingSuccessBonus * 100).toFixed(1)}%` }]
      : []),
    {
      label: 'Final probability',
      value:
        uncappedSuccess !== success
          ? `${(success * 100).toFixed(1)}% (${(uncappedSuccess * 100).toFixed(1)}%)`
          : `${(uncappedSuccess * 100).toFixed(1)}%`,
      info: `Based on your Thieving level vs. the target's level requirement, tool efficiency and Shadow Step. Clamped to a ${(SUCCESS_MIN * 100).toFixed(0)}%-${(SUCCESS_MAX * 100).toFixed(0)}% range.`,
    },
    {
      label: 'Expected successes this session',
      value: `${Math.round(expectedSuccesses).toLocaleString()} (${successesLow} - ${successesHigh})`,
      info: RANGE_INFO,
    },
  ];

  const yieldBreakdown: ModifierRow[] = [
    ...mods.yieldModifiers,
    ...(mods.thievingCoinPct > 0
      ? [
          {
            label: 'Yield Bonus (Silver Tongue)',
            value: `+${mods.thievingCoinPct}% (coins)`,
          },
        ]
      : []),
  ];

  const rawXp = expectedSuccesses * baseXp;
  const rawBaseXp = npc?.base_xp ?? 0;
  const baseXpFormulaParts = [rawBaseXp.toLocaleString()];
  if (lockpickEff !== 1) baseXpFormulaParts.push(lockpickEff.toFixed(2));
  if (mods.petBoostPct > 0) baseXpFormulaParts.push(`${mods.petBoostPct}%`);
  baseXpFormulaParts.push(Math.round(expectedSuccesses).toLocaleString());

  const xpBreakdown: ModifierRow[] = [
    { label: 'Target base XP', value: rawBaseXp.toLocaleString() },
    ...(lockpickEff !== 1 ? [{ label: 'Lockpick Efficiency', value: `x${lockpickEff.toFixed(2)}` }] : []),
    ...(mods.petBoostPct > 0 ? [{ label: 'Pet XP Boost', value: `+${mods.petBoostPct}%` }] : []),
    { label: 'Base XP', value: `${Math.round(rawXp).toLocaleString()} (${baseXpFormulaParts.join(' x ')})` },
    ...mods.xpModifiers,
  ];

  return {
    xp: {
      value: applyXpMultipliers(rawXp, mods),
      min: applyXpMultipliers(successesLow * baseXp, mods),
      max: applyXpMultipliers(successesHigh * baseXp, mods),
    },
    guaranteedItems: [],
    bonusItems,
    yieldBreakdown,
    xpBreakdown,
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
    successBreakdown,
    successRate: success,
  };
}
