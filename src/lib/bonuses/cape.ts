import type { PlayerState } from '@/lib/save-source/types';
import type { EquipmentEntry } from '@/lib/progress/game-data';
import type { SkillCategory } from '@/lib/game/skills';

// Ported from PlayerRepository.kt's resolveCapeMultiplier/isGuildCapeForSkill/
// resolveOwnedCapeKeysForSkill (game version 1.14.11).

export const COMBAT_STAT_SKILLS = ['attack', 'strength', 'defense', 'ranged', 'magic', 'hitpoints'] as const;
const XP_CAPE_SKILLS = new Set<string>([...COMBAT_STAT_SKILLS, 'slayer', 'agility']);
const UNSCALED_CAPE_SKILLS = new Set<string>([...COMBAT_STAT_SKILLS, 'slayer']);

const GUILD_CAPE_MATCH: Record<string, string[]> = {
  warriors: ['attack', 'strength', 'defense'],
  archers: ['ranged'],
  mages: ['magic'],
};

function isGuildCapeForSkill(capeSkill: string, skillId: string): boolean {
  return GUILD_CAPE_MATCH[capeSkill]?.includes(skillId) ?? false;
}

function ownedCapeKeysForSkill(skillId: string): string[] {
  switch (skillId) {
    case 'attack':
      return ['attack_cape', 'warriors_guild_cape'];
    case 'strength':
      return ['strength_cape', 'warriors_guild_cape'];
    case 'defense':
      return ['defense_cape', 'warriors_guild_cape'];
    case 'ranged':
      return ['ranged_cape', 'archers_guild_cape'];
    case 'magic':
      return ['magic_cape', 'mages_guild_cape'];
    case 'hitpoints':
      return ['hp_cape'];
    default:
      return [`${skillId}_cape`, `${skillId}_guild_cape`];
  }
}

function rackTierRequiredFor(category: SkillCategory): number {
  if (category === 'Gathering') return 1;
  if (category === 'Crafting') return 2;
  return 3;
}

export type CapeResolution = { multiplier: number; appliesToXp: boolean; capeName: string | null };

export function resolveCapeBonus(
  playerState: PlayerState,
  skillId: string,
  category: SkillCategory,
  equipment: Record<string, EquipmentEntry>,
  capeScaling: number,
): CapeResolution {
  const none: CapeResolution = { multiplier: 0, appliesToXp: XP_CAPE_SKILLS.has(skillId), capeName: null };
  if (playerState.ironman) return none;

  const rackTier =
    ((playerState.raw.flags.town_building_tiers as Record<string, number> | undefined) ?? {}).cape_rack ?? 0;
  const categoryUnlocked = rackTier >= rackTierRequiredFor(category);

  let bestSkillCapeBonus = 0;
  let bestSkillCapeKey = '';
  let bestGuildCapeBonus = 0;
  let bestGuildCapeKey = '';

  const consider = (key: string, def: EquipmentEntry | undefined) => {
    if (!def || !def.cape_skill || !def.cape_bonus || def.cape_bonus <= 0) return;
    const matches = def.cape_skill === skillId || isGuildCapeForSkill(def.cape_skill, skillId);
    if (!matches) return;
    const isGuild = key.endsWith('_guild_cape') || ['warriors', 'archers', 'mages'].includes(def.cape_skill);
    if (isGuild) {
      if (def.cape_bonus > bestGuildCapeBonus) {
        bestGuildCapeBonus = def.cape_bonus;
        bestGuildCapeKey = key;
      }
    } else if (def.cape_bonus > bestSkillCapeBonus) {
      bestSkillCapeBonus = def.cape_bonus;
      bestSkillCapeKey = key;
    }
  };

  const equippedCapeKey = playerState.raw.equipped.cape;
  if (equippedCapeKey) consider(equippedCapeKey, equipment[equippedCapeKey]);

  if (categoryUnlocked) {
    for (const key of ownedCapeKeysForSkill(skillId)) {
      if (key in playerState.raw.inventory) consider(key, equipment[key]);
    }
  }

  const totalBonus = bestSkillCapeBonus + bestGuildCapeBonus;
  if (totalBonus <= 0) return none;

  const scaling = UNSCALED_CAPE_SKILLS.has(skillId) ? 1 : capeScaling || 1;
  const multiplier = totalBonus * scaling;
  const winningKey = bestGuildCapeKey || bestSkillCapeKey;
  const capeName = winningKey ? (equipment[winningKey]?.display_name ?? winningKey) : null;

  return { multiplier, appliesToXp: XP_CAPE_SKILLS.has(skillId), capeName };
}
