import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment } from '@/lib/progress/game-data';
import {
  getOreEntries,
  getFishEntries,
  getTrees,
  getThievingNpcs,
  getAgilityCourses,
  getCropEntries,
  getRuneEntries,
  getLogEntries,
  getRecipes,
  type RecipeEntry,
} from './game-data';
import type { TargetOption } from './types';

const SMITHING_TIERS = ['runite', 'adamantite', 'mithril', 'steel', 'iron', 'bronze', 'platinum', 'gold', 'silver'];

function smithingTierTag(key: string): string | undefined {
  const tier = SMITHING_TIERS.find((t) => key.startsWith(`${t}_`));
  return tier ? `${tier[0].toUpperCase()}${tier.slice(1)}` : undefined;
}

async function smithingTargets(recipes: Record<string, RecipeEntry>, level: number): Promise<TargetOption[]> {
  const equipment = await getEquipment();
  return Object.entries(recipes)
    .map(([key, e]) => {
      const category =
        e.type === 'bar'
          ? 'Bar'
          : e.type === 'component'
            ? 'Components'
            : e.type === 'tool'
              ? 'Tools'
              : e.type === 'equipment'
                ? equipment[key]?.slot === 'weapon'
                  ? 'Weapon'
                  : 'Armour'
                : undefined;
      const tier = smithingTierTag(key);
      const filterTags: Record<string, string> = {};
      if (category) filterTags.category = category;
      if (tier) filterTags.tier = tier;

      return {
        key,
        label: e.display_name ?? key,
        levelRequired: e.level_required ?? 1,
        locked: (e.level_required ?? 1) > level,
        filterTags,
      };
    })
    .sort((a, b) => a.levelRequired - b.levelRequired);
}

const CONSTRUCTION_WOOD_TIERS = ['redwood', 'magic', 'yew', 'maple', 'willow', 'oak'];

function constructionTierTag(materials: Record<string, number>): string | undefined {
  const tier = CONSTRUCTION_WOOD_TIERS.find((t) => `${t}_plank` in materials);
  if (tier) return `${tier[0].toUpperCase()}${tier.slice(1)}`;
  if ('plank' in materials) return 'Plank';
  if ('stone' in materials || 'carved_stone' in materials) return 'Stone';
  return undefined;
}

async function constructionTargets(recipes: Record<string, RecipeEntry>, level: number): Promise<TargetOption[]> {
  return Object.entries(recipes)
    .map(([key, e]) => {
      const tier = constructionTierTag(e.materials);
      const filterTags: Record<string, string> = {};
      if (tier) filterTags.tier = tier;

      return {
        key,
        label: e.display_name ?? key,
        levelRequired: e.level_required ?? 1,
        locked: (e.level_required ?? 1) > level,
        filterTags,
      };
    })
    .sort((a, b) => a.levelRequired - b.levelRequired);
}

const FLETCHING_WOOD_TIERS = ['redwood', 'magic', 'yew', 'maple', 'willow', 'oak'];
const FLETCHING_ORE_TIERS = ['runite', 'adamantite', 'mithril', 'steel', 'iron', 'bronze'];

function fletchingWoodTierTag(materials: Record<string, number>): string {
  const tier = FLETCHING_WOOD_TIERS.find((t) => `${t}_log` in materials);
  return tier ? `${tier[0].toUpperCase()}${tier.slice(1)}` : 'Basic';
}

function fletchingOreTierTag(key: string): string | undefined {
  const tier = FLETCHING_ORE_TIERS.find((t) => key.startsWith(`${t}_`));
  return tier ? `${tier[0].toUpperCase()}${tier.slice(1)}` : undefined;
}

async function fletchingTargets(recipes: Record<string, RecipeEntry>, level: number): Promise<TargetOption[]> {
  return Object.entries(recipes)
    .map(([key, e]) => {
      const filterTags: Record<string, string> = {};
      if (e.type === 'ammunition' || key === 'arrow_shaft') {
        filterTags.category = 'Ammunition';
        const tier = fletchingOreTierTag(key);
        if (tier) filterTags.tier = tier;
      } else if (e.type === 'component') {
        filterTags.category = 'Planks';
        filterTags.tier = fletchingWoodTierTag(e.materials);
      } else if (key.startsWith('staff_of_')) {
        filterTags.category = 'Staff';
        filterTags.tier = fletchingWoodTierTag(e.materials);
      } else {
        filterTags.category = 'Bow';
        filterTags.tier = fletchingWoodTierTag(e.materials);
      }

      return {
        key,
        label: e.display_name ?? key,
        levelRequired: e.level_required ?? 1,
        locked: (e.level_required ?? 1) > level,
        filterTags,
      };
    })
    .sort((a, b) => a.levelRequired - b.levelRequired);
}

const CRAFTING_METALS = ['platinum', 'gold', 'silver'];
const CRAFTING_GEMS = ['diamond', 'ruby', 'emerald', 'sapphire'];

function craftingFilterTags(key: string, materials: Record<string, number>): Record<string, string> {
  const metal = CRAFTING_METALS.find((m) => key.startsWith(`${m}_`));
  const gem = CRAFTING_GEMS.find((g) => g in materials);
  const filterTags: Record<string, string> = {};
  if (metal) filterTags.metal = `${metal[0].toUpperCase()}${metal.slice(1)}`;
  filterTags.gem = gem ? `${gem[0].toUpperCase()}${gem.slice(1)}` : 'None';
  return filterTags;
}

async function craftingTargets(recipes: Record<string, RecipeEntry>, level: number): Promise<TargetOption[]> {
  return Object.entries(recipes)
    .map(([key, e]) => ({
      key,
      label: e.display_name ?? key,
      levelRequired: e.level_required ?? 1,
      locked: (e.level_required ?? 1) > level,
      filterTags: craftingFilterTags(key, e.materials),
    }))
    .sort((a, b) => a.levelRequired - b.levelRequired);
}

function herbloreCategoryTag(key: string): string {
  if (key === 'overload_potion' || key.startsWith('super_')) return 'Super Potion';
  if (key.endsWith('_brew')) return 'Brew';
  return 'Potion';
}

async function herbloreTargets(recipes: Record<string, RecipeEntry>, level: number): Promise<TargetOption[]> {
  return Object.entries(recipes)
    .map(([key, e]) => ({
      key,
      label: e.display_name ?? key,
      levelRequired: e.level_required ?? 1,
      locked: (e.level_required ?? 1) > level,
      filterTags: { category: herbloreCategoryTag(key) },
    }))
    .sort((a, b) => a.levelRequired - b.levelRequired);
}

function toOptions(
  entries: [string, { display_name?: string; level_required?: number }][],
  level: number,
): TargetOption[] {
  return entries
    .map(([key, e]) => ({
      key,
      label: e.display_name ?? key,
      levelRequired: e.level_required ?? 1,
      locked: (e.level_required ?? 1) > level,
    }))
    .sort((a, b) => a.levelRequired - b.levelRequired);
}

export async function targetsForSkill(skillId: string, playerState: PlayerState): Promise<TargetOption[]> {
  const level = playerState.raw.skillLevels[skillId] ?? 1;

  switch (skillId) {
    case 'mining':
      return toOptions(Object.entries(await getOreEntries()), level);
    case 'fishing':
      return toOptions(Object.entries(await getFishEntries()), level);
    case 'woodcutting':
      return toOptions(Object.entries(await getTrees()), level);
    case 'thieving':
      return toOptions(
        (await getThievingNpcs()).map((n) => [
          n.key,
          { display_name: n.display_name, level_required: n.level_required },
        ]),
        level,
      );
    case 'agility':
      return toOptions(Object.entries(await getAgilityCourses()), level);
    case 'farming':
      // exclude magic_bean from the target list.
      return toOptions(
        Object.entries(await getCropEntries())
          .filter(([k]) => k !== 'magic_bean')
          .map(([k, c]) => [k, { display_name: c.display_name, level_required: c.farming_level_required }]),
        level,
      );
    case 'runecrafting':
      return toOptions(Object.entries(await getRuneEntries()), level);
    case 'firemaking':
      return toOptions(Object.entries(await getLogEntries()), level);
    case 'smithing':
      return smithingTargets(await getRecipes('smithing'), level);
    case 'construction':
      return constructionTargets(await getRecipes('construction'), level);
    case 'fletching':
      return fletchingTargets(await getRecipes('fletching'), level);
    case 'crafting':
      return craftingTargets(await getRecipes('crafting'), level);
    case 'herblore':
      return herbloreTargets(await getRecipes('herblore'), level);
    case 'cooking':
      return toOptions(Object.entries(await getRecipes(skillId)), level);
    default:
      return [];
  }
}

export function ashCatalystOptions(playerState: PlayerState): string[] {
  const ashKeys = ['ashes', 'oak_ashes', 'willow_ashes', 'maple_ashes', 'yew_ashes', 'magic_ashes', 'redwood_ashes'];
  return ashKeys.filter((k) => (playerState.raw.inventory[k] ?? 0) > 0);
}
