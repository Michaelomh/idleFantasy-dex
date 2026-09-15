import type { PlayerState } from '@/lib/save-source/types';
import { getRecipes, type RecipeEntry } from '../game-data';
import { humanize } from '@/lib/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { craftActionDuration } from '../session-duration';
import type { CalculatorInputs, SessionResult } from '../types';

type RecipeFamily = 'smithing' | 'cooking' | 'fletching' | 'crafting' | 'herblore' | 'construction';

export async function craftSession(
  playerState: PlayerState,
  inputs: CalculatorInputs,
  skillId: string,
  family: RecipeFamily,
): Promise<SessionResult> {
  const [recipes, mods] = await Promise.all([
    getRecipes(family),
    resolveModifiers(playerState, skillId, inputs.timedBoostsEnabled),
  ]);

  const recipe: RecipeEntry | undefined = recipes[inputs.targetKey];
  const qty = inputs.qty ?? 1;
  const xpPerItem = recipe?.xp_per_item ?? 0;
  const rawXp = xpPerItem * qty * mods.toolEff;
  const rawOutputQty = (recipe?.output_quantity ?? 1) * qty;
  const outputQty = applyYieldMultiplier(rawOutputQty, mods);

  const enhanced = skillId === 'herblore' && inputs.ashCatalystKey;
  const outputKey = enhanced
    ? `enhanced_${inputs.targetKey}`
    : (recipe?.cooked_item ?? recipe?.item_name ?? inputs.targetKey);
  const outputLabel = enhanced
    ? `Enhanced ${recipe?.display_name ?? humanize(inputs.targetKey)}`
    : (recipe?.display_name ?? humanize(inputs.targetKey));

  const { minutes: sessionMinutes, breakdown: sessionBreakdown } = craftActionDuration(
    qty,
    mods.sessionMinutes,
    mods.toolEff,
  );

  const materialsRequired = Object.entries(recipe?.materials ?? {}).map(([key, perItem]) => ({
    key,
    label: humanize(key),
    qty: perItem * qty,
    owned: playerState.raw.inventory[key] ?? 0,
  }));

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [{ key: outputKey, label: outputLabel, qty: outputQty }],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base yield', rawOutputQty, mods.yieldModifiers),
    xpBreakdown: withBaseRow('Base XP', xpPerItem * qty, [
      ...toolEfficiencyRows(mods, xpPerItem * qty),
      ...mods.xpModifiers,
    ]),
    sessionMinutes,
    sessionBreakdown,
    materialsRequired,
  };
}
