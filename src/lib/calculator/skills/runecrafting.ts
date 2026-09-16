import type { PlayerState } from '@/lib/save-source/types';
import { getRuneEntries } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
import { resolveModifiers, applyXpMultipliers, applyYieldMultiplier, withBaseRow } from '../modifiers';
import { craftActionDuration } from '../session-duration';
import type { CalculatorInputs, SessionResult } from '../types';

const ASH_RC_BONUS: Record<string, number> = {
  ashes: 1,
  oak_ashes: 2,
  willow_ashes: 3,
  maple_ashes: 4,
  yew_ashes: 5,
  magic_ashes: 6,
  redwood_ashes: 7,
};

export async function runecrafting(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [runes, mods] = await Promise.all([
    getRuneEntries(),
    resolveModifiers(playerState, 'runecrafting', inputs.timedBoostsEnabled),
  ]);

  const rune = runes[inputs.targetKey];
  const qty = inputs.qty ?? 1;
  const runeMultiplier = mods.level >= 75 ? 3 : mods.level >= 50 ? 2 : 1;
  const ashBonus = inputs.ashCatalystKey ? (ASH_RC_BONUS[inputs.ashCatalystKey] ?? 0) : 0;

  const rawXp = qty * ((rune?.xp_per_rune as number | undefined) ?? 0) * (runeMultiplier + ashBonus);
  const rawOutputQty = qty * (runeMultiplier + ashBonus);
  const outputQty = applyYieldMultiplier(rawOutputQty, mods);
  const { minutes: sessionMinutes, breakdown: sessionBreakdown } = craftActionDuration(
    qty,
    mods.sessionMinutes,
    mods.toolEff,
  );

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [
      {
        key: inputs.targetKey,
        label: (rune?.display_name as string | undefined) ?? humanize(inputs.targetKey),
        qty: outputQty,
      },
    ],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base Yield', rawOutputQty, mods.yieldModifiers),
    xpBreakdown: withBaseRow('Base XP', rawXp, mods.xpModifiers),
    sessionMinutes,
    sessionBreakdown,
  };
}
