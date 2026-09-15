import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment } from '@/lib/progress/game-data';
import { getThievingNpcs } from '../game-data';
import { humanize } from '@/lib/humanize';
import { resolveModifiers, applyXpMultipliers, withBaseRow } from '../modifiers';
import { toolEfficiency } from '../tool-efficiency';
import { SESSION_FRAMES, expectedAndChance, binomialRange } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

const SUCCESS_MIN = 0.1;
const SUCCESS_MAX = 0.98;

export async function thieving(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [npcs, equipment, mods] = await Promise.all([
    getThievingNpcs(),
    getEquipment(),
    resolveModifiers(playerState, 'thieving', inputs.timedBoostsEnabled),
  ]);

  const npc = npcs.find((n) => n.key === inputs.targetKey);
  const lockpickEff = toolEfficiency('thieving', mods.level, playerState, equipment);
  const npcLevel = npc?.level_required ?? 1;

  const success = Math.min(
    SUCCESS_MAX,
    Math.max(SUCCESS_MIN, 0.4 + (mods.level - npcLevel) * 0.02 * lockpickEff + mods.thievingSuccessBonus),
  );

  // A failed attempt stuns the next frame, so a run of frames alternates attempt/stun on
  // failure: expected frames consumed per attempt is 1 + (1 − success).
  const attempts = SESSION_FRAMES / (2 - success);
  const baseXp = npc?.base_xp ?? 0;
  const yieldMult = 1 + mods.yieldPct / 100;
  const coinMult = yieldMult * (1 + mods.thievingCoinPct / 100);

  const bonusItems = (npc?.loot_table ?? []).map((row) => {
    const avgQty =
      (row.min_qty !== undefined && row.max_qty !== undefined ? (row.min_qty + row.max_qty) / 2 : 1) * yieldMult;
    const { chanceAtLeastOne, rangeMin, rangeMax } = expectedAndChance(Math.round(attempts), success * row.chance);
    const expected = attempts * success * row.chance * avgQty;
    return {
      key: row.item,
      label: humanize(row.item),
      expected,
      chanceAtLeastOne,
      rangeMin: Math.round(rangeMin * avgQty),
      rangeMax: Math.round(rangeMax * avgQty),
    };
  });

  if (npc) {
    const avgCoins = ((npc.coins_min + npc.coins_max) / 2) * coinMult;
    const { chanceAtLeastOne, rangeMin, rangeMax } = expectedAndChance(Math.round(attempts), success);
    bonusItems.push({
      key: 'coins',
      label: 'Coins',
      expected: attempts * success * avgCoins,
      chanceAtLeastOne,
      rangeMin: Math.round(rangeMin * avgCoins),
      rangeMax: Math.round(rangeMax * avgCoins),
    });
  }

  const yieldBreakdown = [
    { label: 'Attempts per Session', value: Math.round(attempts).toLocaleString() },
    { label: 'Success chance', value: `${(success * 100).toFixed(1)}%` },
    ...mods.yieldModifiers,
    ...(mods.thievingCoinPct > 0
      ? [{ label: 'Coin bonus (prestige)', value: `+${mods.thievingCoinPct}% (coins only)` }]
      : []),
  ];

  const rawXp = attempts * success * baseXp;

  const [successesLow, successesHigh] = binomialRange(Math.round(attempts), success, 0.1, 0.9);

  return {
    xp: {
      value: applyXpMultipliers(rawXp, mods),
      min: applyXpMultipliers(successesLow * baseXp, mods),
      max: applyXpMultipliers(successesHigh * baseXp, mods),
    },
    guaranteedItems: [],
    bonusItems,
    yieldBreakdown,
    xpBreakdown: withBaseRow('Base XP', rawXp, mods.xpModifiers),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
  };
}
