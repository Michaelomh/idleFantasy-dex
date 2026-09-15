import type { PlayerState } from '@/lib/save-source/types';
import type { EquipmentEntry } from '@/lib/progress/game-data';

// Ported from util/ToolEfficiency.kt (1.14.13, 4b3e1f5). The tier-gap bonus isn't
// observable from the vendored JSON alone (no public source access during this build), so
// it's reconstructed from CONTEXT.md's stated mechanics (TOOL_TIERS gap) rather than read
// off the Kotlin directly — treat it as best-effort until spot-checked against a real save.
// Heirloom growth (HeirloomStats.resolve lerp) is skipped for now: heirloom tools always
// use their full (non-heirloom) efficiency value here, so numbers will read high for a
// heirloom tool that hasn't been leveled up yet.
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
  skillLevel: number,
  playerState: PlayerState,
  equipment: Record<string, EquipmentEntry>,
): number {
  const slot = TOOL_SLOT_FOR_SKILL[skillId];
  if (!slot) return 1;

  const equippedKey = playerState.raw.equipped[slot];
  const item = equippedKey ? equipment[equippedKey] : undefined;
  if (!item) return 1;

  const effKey = `${skillId}_efficiency`;
  const base = typeof item[effKey] === 'number' ? (item[effKey] as number) : 1;

  const requirementLevel = item.requirements?.[skillId] ?? TOOL_TIERS[0];
  const toolTier = tierIndexForLevel(requirementLevel);
  const playerTier = tierIndexForLevel(Math.min(skillLevel, 85));
  const tierGapBonus = 0.25 * Math.max(0, playerTier - toolTier);

  return base + tierGapBonus;
}
