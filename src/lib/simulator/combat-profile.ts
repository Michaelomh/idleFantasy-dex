import type { PlayerState } from '@/lib/save-source/types';
import type { BlessingEntry, BossEntry, EquipmentEntry, MercenaryEntry } from '@/lib/progress/game-data';
import type { RecipeEntry } from '@/lib/calculator/game-data';
import { effectTotal, type ActiveNode } from '@/lib/bonuses/prestige';
import { resolveActiveBlessing } from '@/lib/bonuses/blessings';
import { getSkillLevel } from './player-skills';
import { KNOWN_ARROWS, KNOWN_SPELLS } from './combat-tables';
import { ARMOR_SLOTS, armorLoadoutForStyle, weaponSlotForStyle } from './loadout';
import type { BossCombatProfile, CombatStyle, MercCombatant, PlayerCombatProfile } from './combat-engine';

export function buildBossCombatProfile(boss: BossEntry): BossCombatProfile {
  return {
    hp: boss.hp ?? 0,
    durationMinutes: boss.duration_minutes ?? 0,
    attackLevel: boss.combat_stats?.attack_level ?? 0,
    attackBonus: boss.combat_stats?.attack_bonus ?? 0,
    strengthLevel: boss.combat_stats?.strength_level ?? 0,
    strengthBonus: boss.combat_stats?.strength_bonus ?? 0,
    attackDefense: boss.defensive_stats?.attack_defense ?? 0,
    strengthDefense: boss.defensive_stats?.strength_defense ?? 0,
    rangedDefense: boss.defensive_stats?.ranged_defense ?? 0,
    magicDefense: boss.defensive_stats?.magic_defense ?? 0,
    raid: boss.raid,
  };
}

export function buildMercCombatant(merc: MercenaryEntry): MercCombatant {
  return {
    id: merc.id,
    style: merc.combat_style,
    effAttack: merc.attack_level + merc.attack_bonus,
    strengthLevel: merc.strength_level,
    strengthBonus: merc.strength_bonus,
    defenseLevel: merc.defense_level,
    hp: merc.hp,
  };
}

const BASE_ATTACK_SPEED_SEC = 2.4;
const DEFAULT_FOOD_EAT_THRESHOLD_PCT = 50;

export type EquipmentBonusSums = {
  attackBonus: number;
  strengthBonus: number;
  defenseBonus: number;
  rangedAttackBonus: number;
  rangedStrengthBonus: number;
  magicAttackBonus: number;
};

export function sumEquipmentBonuses(items: (EquipmentEntry | undefined)[]): EquipmentBonusSums {
  const sums: EquipmentBonusSums = {
    attackBonus: 0,
    strengthBonus: 0,
    defenseBonus: 0,
    rangedAttackBonus: 0,
    rangedStrengthBonus: 0,
    magicAttackBonus: 0,
  };
  for (const item of items) {
    if (!item) continue;
    sums.attackBonus += item.attack_bonus ?? 0;
    sums.strengthBonus += item.strength_bonus ?? 0;
    sums.defenseBonus += item.defense_bonus ?? 0;
    sums.rangedAttackBonus += item.ranged_attack_bonus ?? 0;
    sums.rangedStrengthBonus += item.ranged_strength_bonus ?? 0;
    sums.magicAttackBonus += item.magic_attack_bonus ?? 0;
  }
  return sums;
}

export type PotionOption = { key: string; displayName: string; levelRequired: number };

export function listPotionOptions(herbloreRecipes: Record<string, RecipeEntry>): PotionOption[] {
  const options: PotionOption[] = [];
  for (const [key, recipe] of Object.entries(herbloreRecipes)) {
    options.push({ key, displayName: recipe.display_name, levelRequired: recipe.level_required });
    options.push({
      key: `enhanced_${key}`,
      displayName: `Enhanced ${recipe.display_name}`,
      levelRequired: recipe.level_required,
    });
  }
  return options;
}

export type FoodOption = { key: string; displayName: string; healingValue: number };

export function listFoodOptions(cookingRecipes: Record<string, RecipeEntry>): FoodOption[] {
  return Object.values(cookingRecipes)
    .filter((r): r is RecipeEntry & { cooked_item: string; healing_value: number } => !!r.cooked_item)
    .map((r) => ({ key: r.cooked_item, displayName: r.display_name, healingValue: r.healing_value ?? 0 }));
}

export function resolvePotionEffects(
  potionKey: string | null,
  herbloreRecipes: Record<string, RecipeEntry>,
): Record<string, number> {
  if (!potionKey) return {};
  const enhanced = potionKey.startsWith('enhanced_');
  const baseKey = enhanced ? potionKey.slice('enhanced_'.length) : potionKey;
  const base = herbloreRecipes[baseKey]?.effects ?? {};
  if (!enhanced) return base;
  return Object.fromEntries(Object.entries(base).map(([stat, value]) => [stat, value * 2]));
}

export type EffectiveStats = {
  attack: number;
  strength: number;
  defense: number;
  ranged: number;
  magic: number;
};

export type PrestigeActiveNodesBySkill = Map<string, ActiveNode[]>;

export type ResolvedCombatInputs = {
  weaponItem: EquipmentEntry | undefined;
  armorItems: EquipmentEntry[];
  potionEffects: Record<string, number>;
  foodHealAmount: number;
  defenseBlessingBonus: number;
};

export function resolveCombatInputs(params: {
  playerState: PlayerState;
  equipment: Record<string, EquipmentEntry>;
  herblore: Record<string, RecipeEntry>;
  cooking: Record<string, RecipeEntry>;
  blessings: BlessingEntry[];
  style: CombatStyle;
  potionKey: string | null;
  foodKey: string | null;
}): ResolvedCombatInputs {
  const { playerState, equipment, herblore, cooking, blessings, style, potionKey, foodKey } = params;

  const weaponId = playerState.raw.equipped[weaponSlotForStyle(style)];
  const weaponItem = weaponId ? equipment[weaponId] : undefined;
  const armorLoadout = armorLoadoutForStyle(playerState, style);
  const armorItems = ARMOR_SLOTS.map((slot) => {
    const itemId = armorLoadout[slot];
    return itemId ? equipment[itemId] : undefined;
  }).filter((item): item is EquipmentEntry => !!item);

  const potionEffects = resolvePotionEffects(potionKey, herblore);
  const foodHealAmount = listFoodOptions(cooking).find((f) => f.key === foodKey)?.healingValue ?? 0;

  const activeBlessingKey = (playerState.raw.flags.active_blessing_key as string | undefined) ?? '';
  const activeBlessingExpiresAt = Number(playerState.raw.flags.active_blessing_expires_at ?? 0);
  const defenseBlessing = resolveActiveBlessing('DEFENSE', activeBlessingKey, activeBlessingExpiresAt, blessings);

  return {
    weaponItem,
    armorItems,
    potionEffects,
    foodHealAmount,
    defenseBlessingBonus: defenseBlessing?.magnitude ?? 0,
  };
}

export function buildPlayerCombatProfile(params: {
  playerState: PlayerState;
  style: CombatStyle;
  weaponItem: EquipmentEntry | undefined;
  armorItems: EquipmentEntry[];
  arrowKey: string | null;
  spellKey: string | null;
  potionEffects: Record<string, number>;
  defenseBlessingBonus: number;
  foodHealAmount: number;
  activeNodesBySkill: PrestigeActiveNodesBySkill;
}): { profile: PlayerCombatProfile; effective: EffectiveStats } {
  const {
    playerState,
    style,
    weaponItem,
    armorItems,
    arrowKey,
    spellKey,
    potionEffects,
    defenseBlessingBonus,
    foodHealAmount,
    activeNodesBySkill,
  } = params;

  const equipBonus = sumEquipmentBonuses([weaponItem, ...armorItems]);
  const potionBonusFlat = effectTotal(activeNodesBySkill.get('herblore') ?? [], 'potion_bonus_flat');
  const potionBonus = (stat: string) => (potionEffects[stat] ? potionEffects[stat] + potionBonusFlat : 0);
  const combatStatFlat = (skill: string) => effectTotal(activeNodesBySkill.get(skill) ?? [], 'combat_stat_flat');

  const effective: EffectiveStats = {
    attack: getSkillLevel(playerState, 'attack') + potionBonus('attack') + combatStatFlat('attack'),
    strength: getSkillLevel(playerState, 'strength') + potionBonus('strength') + combatStatFlat('strength'),
    defense:
      getSkillLevel(playerState, 'defense') + potionBonus('defense') + combatStatFlat('defense') + defenseBlessingBonus,
    ranged: getSkillLevel(playerState, 'ranged') + potionBonus('ranged') + combatStatFlat('ranged'),
    magic: getSkillLevel(playerState, 'magic') + potionBonus('magic') + combatStatFlat('magic'),
  };

  const arrowStrengthBonus = KNOWN_ARROWS.find((a) => a.key === arrowKey)?.strengthBonus ?? 0;
  const spell = KNOWN_SPELLS.find((s) => s.key === spellKey);
  const healPct = effectTotal(activeNodesBySkill.get('hitpoints') ?? [], 'heal_pct');
  const doubleHitChance = effectTotal(activeNodesBySkill.get('strength') ?? [], 'double_hit_pct') / 100;
  const secondChance = (activeNodesBySkill.get('attack') ?? []).some((n) => n.node.effect === 'second_chance');

  const profile: PlayerCombatProfile = {
    style,
    effAttack: effective.attack,
    effStrength: effective.strength,
    effRanged: effective.ranged,
    effMagic: effective.magic,
    effDefence: effective.defense,
    weaponAttackBonus: equipBonus.attackBonus,
    weaponStrengthBonus: equipBonus.strengthBonus,
    rangedAttackBonus: equipBonus.rangedAttackBonus,
    rangedStrengthBonus: equipBonus.rangedStrengthBonus + arrowStrengthBonus,
    magicAttackBonus: equipBonus.magicAttackBonus,
    spellMaxHit: spell?.maxHit ?? 0,
    attackSpeedSec: weaponItem?.attack_speed ?? BASE_ATTACK_SPEED_SEC,
    doubleHitChance,
    secondChance,
    maxHp: getSkillLevel(playerState, 'hitpoints') * 10,
    foodHealAmount: foodHealAmount * (1 + healPct / 100),
    foodEatThresholdPct: DEFAULT_FOOD_EAT_THRESHOLD_PCT,
  };

  return { profile, effective };
}
