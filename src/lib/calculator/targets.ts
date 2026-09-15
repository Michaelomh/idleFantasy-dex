import type { PlayerState } from '@/lib/save-source/types';
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
} from './game-data';
import type { TargetOption } from './types';

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
    case 'cooking':
    case 'fletching':
    case 'crafting':
    case 'herblore':
    case 'construction':
      return toOptions(Object.entries(await getRecipes(skillId)), level);
    default:
      return [];
  }
}

export function ashCatalystOptions(playerState: PlayerState): string[] {
  const ashKeys = ['ashes', 'oak_ashes', 'willow_ashes', 'maple_ashes', 'yew_ashes', 'magic_ashes', 'redwood_ashes'];
  return ashKeys.filter((k) => (playerState.raw.inventory[k] ?? 0) > 0);
}
