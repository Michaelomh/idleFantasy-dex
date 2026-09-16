import type { PlayerState } from '@/lib/save-source/types';
import { getRecipes, type RecipeEntry } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
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
  const recipes = await getRecipes(family);
  const recipe: RecipeEntry | undefined = recipes[inputs.targetKey];
  const mods = await resolveModifiers(
    playerState,
    skillId,
    inputs.timedBoostsEnabled,
    (recipe?.level_required as number | undefined) ?? 0,
  );
  const qty = inputs.qty ?? 1;
  const xpPerItem = recipe?.xp_per_item ?? 0;
  const rawXp = xpPerItem * qty * mods.toolEff * (1 + mods.petBoostPct / 100);
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

  const materialsRequired = Object.entries(recipe?.materials ?? {}).map(([key, perItem], index) => {
    const secondarySaveChance = index === 0 ? 0 : mods.secondaryMaterialSaveChance;
    const remainingFraction = (1 - secondarySaveChance) * (1 - mods.inputSavePct / 100);
    return {
      key,
      label: humanize(key),
      qty: Math.round(perItem * qty * remainingFraction),
      owned: playerState.raw.inventory[key] ?? 0,
    };
  });
  if (enhanced && inputs.ashCatalystKey) {
    const ashRemainingFraction = (1 - mods.secondaryMaterialSaveChance) * (1 - mods.inputSavePct / 100);
    materialsRequired.push({
      key: inputs.ashCatalystKey,
      label: humanize(inputs.ashCatalystKey),
      qty: Math.round(qty * ashRemainingFraction),
      owned: playerState.raw.inventory[inputs.ashCatalystKey] ?? 0,
    });
  }

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [{ key: outputKey, label: outputLabel, qty: outputQty }],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base Yield', rawOutputQty, mods.yieldModifiers),
    xpBreakdown: withBaseRow('Base XP', xpPerItem * qty, [
      ...toolEfficiencyRows(mods, xpPerItem * qty),
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
    sessionMinutes,
    sessionBreakdown,
    materialsRequired,
  };
}
