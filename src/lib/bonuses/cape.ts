import type { PlayerState } from '@/lib/save-source/types';
import type { EquipmentEntry } from '@/lib/progress/game-data';

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
    case 'farming':
      // Farming guild cape has no yield effect in the real game (FarmingRepository.kt's
      // capedDouble only ever checks farming_cape) - its flavor text is dead.
      // TODO: check this out
      return ['farming_cape'];
    default:
      return [`${skillId}_cape`, `${skillId}_guild_cape`];
  }
}

const RACK_TIER_1_SKILLS = new Set(['mining', 'fishing', 'woodcutting', 'farming', 'agility', 'thieving']);
const RACK_TIER_2_SKILLS = new Set([
  'smithing',
  'cooking',
  'fletching',
  'crafting',
  'firemaking',
  'runecrafting',
  'herblore',
  'construction',
]);

function rackTierRequiredFor(skillId: string): number {
  if (RACK_TIER_1_SKILLS.has(skillId)) return 1;
  if (RACK_TIER_2_SKILLS.has(skillId)) return 2;
  return 3;
}

export type CapeResolution = { multiplier: number; appliesToXp: boolean; capeName: string | null };

export function resolveCapeBonus(
  playerState: PlayerState,
  skillId: string,
  equipment: Record<string, EquipmentEntry>,
  capeScaling: number,
): CapeResolution {
  const none: CapeResolution = { multiplier: 0, appliesToXp: XP_CAPE_SKILLS.has(skillId), capeName: null };
  if (playerState.ironman) return none;

  const rackTier =
    ((playerState.raw.flags.town_building_tiers as Record<string, number> | undefined) ?? {}).cape_rack ?? 0;
  const categoryUnlocked = rackTier >= rackTierRequiredFor(skillId);

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

  // Farming cape is a hard 2x yield doubling in the real game (FarmingRepository.kt's
  // capedDouble), not the 10% implied by equipment.json's stale flavor text - override the
  // vendored cape_bonus value for this one skill rather than trusting it.
  // TODO: check this
  const effectiveBonus = skillId === 'farming' ? 1 : totalBonus;

  const scaling = UNSCALED_CAPE_SKILLS.has(skillId) ? 1 : capeScaling || 1;
  const multiplier = effectiveBonus * scaling;
  const winningKey = bestGuildCapeKey || bestSkillCapeKey;
  const capeName = winningKey ? (equipment[winningKey]?.display_name ?? winningKey) : null;

  return { multiplier, appliesToXp: XP_CAPE_SKILLS.has(skillId), capeName };
}
