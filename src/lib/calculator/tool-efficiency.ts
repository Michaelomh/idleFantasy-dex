import type { PlayerState } from '@/lib/save-source/types';
import type { EquipmentEntry } from '@/lib/progress/game-data';

const TOOL_TIERS = [1, 15, 30, 55, 70, 85];

export const TOOL_SLOT_FOR_SKILL: Record<string, string> = {
  mining: 'pickaxe',
  woodcutting: 'axe',
  fishing: 'fishing_rod',
  farming: 'hoe',
  smithing: 'hammer',
  cooking: 'frying_pan',
  firemaking: 'tinderbox',
  thieving: 'lockpick',
  agility: 'grappling_hook',
};

function tierIndexForLevel(level: number): number {
  let idx = 0;
  for (let i = 0; i < TOOL_TIERS.length; i++) {
    if (level >= TOOL_TIERS[i]) idx = i;
  }
  return idx;
}

export function toolEfficiency(
  skillId: string,
  playerState: PlayerState,
  equipment: Record<string, EquipmentEntry>,
  resourceLevelRequired = 0,
): number {
  const slot = TOOL_SLOT_FOR_SKILL[skillId];
  if (!slot) return 1;

  const equippedKey = playerState.raw.equipped[slot];
  const item = equippedKey ? equipment[equippedKey] : undefined;
  if (!item) return 1;

  const effKey = `${skillId}_efficiency`;
  const base = typeof item[effKey] === 'number' ? (item[effKey] as number) : 1;

  if (resourceLevelRequired <= 0) return base;

  const toolReqLevel = item.requirements?.[skillId] ?? 1;
  const tierDiff = tierIndexForLevel(toolReqLevel) - tierIndexForLevel(resourceLevelRequired);

  return tierDiff > 0 ? base * (1 + 0.25 * tierDiff) : base;
}
