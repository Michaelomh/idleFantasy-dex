import type { PlayerState } from '@/lib/save-source/types';
import { getRecipes, type RecipeEntry } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
import { resolveModifiers, applyXpMultipliers, applyYieldMultiplier, withBaseRow, bucketedCraftXp } from '../modifiers';
import { craftActionDuration } from '../session-duration';
import type { CalculatorInputs, SessionResult } from '../types';

type RecipeFamily = 'smithing' | 'cooking' | 'fletching' | 'crafting' | 'herblore' | 'construction';

const SECONDARY_MATERIALS: Partial<Record<RecipeFamily, ReadonlySet<string>>> = {
  smithing: new Set(['coal', 'tin_ore']),
  fletching: new Set([
    'bronze_arrow_tip',
    'iron_arrow_tip',
    'steel_arrow_tip',
    'mithril_arrow_tip',
    'adamantite_arrow_tip',
    'runite_arrow_tip',
    'air_rune',
    'water_rune',
    'earth_rune',
    'fire_rune',
    'mind_rune',
    'chaos_rune',
    'death_rune',
    'blood_rune',
  ]),
  herblore: new Set([
    'rotten_flesh',
    'spider_silk',
    'spider_fang',
    'imp_hide',
    'goblin_mail',
    'troll_bone',
    'demon_horn',
    'hellhound_fang',
    'dragon_scale',
    'magic_bean',
  ]),
  construction: new Set(['iron_nail', 'mithril_nail', 'runite_nail', 'steel_nail']),
  crafting: new Set(['sapphire', 'emerald', 'ruby', 'diamond']),
};

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
  const toolOnlyXp = bucketedCraftXp(qty, xpPerItem, mods.toolEff, 0);
  const rawXp = bucketedCraftXp(qty, xpPerItem, mods.toolEff, mods.petBoostPct);
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

  const secondaryMaterials = SECONDARY_MATERIALS[family];
  const materialsRequired = Object.entries(recipe?.materials ?? {}).map(([key, perItem]) => {
    const secondarySaveChance = secondaryMaterials?.has(key) ? mods.secondaryMaterialSaveChance : 0;
    const remainingFraction = (1 - secondarySaveChance) * (1 - mods.inputSavePct / 100);
    return {
      key,
      label: humanize(key),
      qty: Math.round(perItem * qty * remainingFraction),
    };
  });
  if (enhanced && inputs.ashCatalystKey) {
    const ashRemainingFraction = (1 - mods.secondaryMaterialSaveChance) * (1 - mods.inputSavePct / 100);
    materialsRequired.push({
      key: inputs.ashCatalystKey,
      label: humanize(inputs.ashCatalystKey),
      qty: Math.round(qty * ashRemainingFraction),
    });
  }

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [{ key: outputKey, label: outputLabel, qty: outputQty }],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base Yield', rawOutputQty, mods.yieldModifiers),
    xpBreakdown: withBaseRow('Base XP', xpPerItem * qty, [
      ...(mods.toolEff !== 1
        ? [
            {
              label: 'Tool Efficiency',
              value: `x${mods.toolEff.toFixed(3)} (${toolOnlyXp.toLocaleString()})`,
              info: 'The higher your equipped tool is compared to the target, the higher the efficiency bonus.',
            },
          ]
        : []),
      ...(mods.petBoostPct > 0
        ? [
            {
              label: 'Pet XP Boost',
              value: `+${mods.petBoostPct}% (${rawXp.toLocaleString()})`,
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
