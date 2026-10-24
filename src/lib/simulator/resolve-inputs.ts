// Player State + Game Data → simulator inputs, mirroring the game's direct "Fight" path
// (CombatViewModel.startDungeonSession / startBossSession, TowerViewModel.startFloor) and the
// collection-time modifiers (HomeViewModel, PlayerRepository, BoostRepository), game 1.16.0
// (37317af, PR #2099 included).
import type { PlayerState } from '@/lib/save-source/types';
import {
  getBlessings,
  getBuildings,
  getEnemies,
  getEquipment,
  getMercenaries,
  getPets,
  getPrestigePaths,
  getSpells,
  type BlessingEntry,
  type BossEntry,
  type BuildingEntry,
  type DungeonEntry,
  type EnemyEntry,
  type EquipmentEntry,
  type MercenaryEntry,
  type PetEntry,
  type PrestigeSkillPaths,
  type SpellEntry,
} from '@/lib/progress/game-data';
import { getRecipes, type RecipeEntry } from '@/lib/calculator/game-data';
import { activeNodesForSkill, effectTotal } from '@/lib/bonuses/prestige';
import { resolveActiveBlessing } from '@/lib/bonuses/blessings';
import { resolveCapeBonus } from '@/lib/bonuses/cape';
import { sigilMultiplier } from '@/lib/bonuses/sigils';
import { levelForXp, MAX_ITEM_LEVEL_XP } from '@/lib/utils/xp-table';
import { parseQty } from '@/lib/utils/parse-qty';
import {
  meleeMaxHit,
  BASE_ATTACK_SPEED_SEC,
  type ArrowStack,
  type BossTarget,
  type CombatStyle,
  type DungeonTarget,
  type EngineInputs,
  type FoodStack,
  type MercCombatant,
} from './combat-engine';
import { reclaimFraction, type CollectionContext, type CollectionKind } from './collection';
import { KNOWN_ARROWS } from './combat-tables';
import {
  ARMOR_SLOTS,
  armorLoadoutForStyle,
  savedActiveWeaponSlot,
  savedHiredMercenaryIds,
  weaponSlotForStyle,
} from './loadout';
import type { EatOrder } from './run-simulation';
import { elderSessionMs, mainlandSessionMs } from './time';

export const COMBAT_SKILLS = ['attack', 'strength', 'defense', 'ranged', 'magic', 'hitpoints'] as const;
export type CombatSkill = (typeof COMBAT_SKILLS)[number];
/** The game's Skills.COMBAT, which decides which skills a `combat` pet boosts on bosses. */
const PET_COMBAT_SKILLS = new Set<string>([...COMBAT_SKILLS, 'prayer']);

export type SimData = {
  equipment: Record<string, EquipmentEntry>;
  herblore: Record<string, RecipeEntry>;
  cooking: Record<string, RecipeEntry>;
  blessings: BlessingEntry[];
  prestigeTrees: Map<string, PrestigeSkillPaths>;
  pets: Record<string, PetEntry>;
  spells: Record<string, SpellEntry>;
  mercenaries: MercenaryEntry[];
  buildings: Record<string, BuildingEntry>;
  enemies: Record<string, EnemyEntry>;
};

export async function loadSimData(): Promise<SimData> {
  const [equipment, herblore, cooking, blessings, trees, pets, spells, mercenaries, buildings, enemies] =
    await Promise.all([
      getEquipment(),
      getRecipes('herblore'),
      getRecipes('cooking'),
      getBlessings(),
      getPrestigePaths(),
      getPets(),
      getSpells(),
      getMercenaries(),
      getBuildings(),
      getEnemies(),
    ]);
  return {
    equipment,
    herblore,
    cooking,
    blessings,
    prestigeTrees: new Map(trees.map((t) => [t.skill, t])),
    pets,
    spells,
    mercenaries,
    buildings,
    enemies,
  };
}

/** What the user can change on a simulator page. Defaults come from the save. */
export type Selections = {
  /** Which weapon slot is active; the actual style comes from that weapon. */
  weaponSlot: CombatStyle;
  potionKey: string | null;
  food: Record<string, number>;
  arrowKey: string | null;
  /** Typed amount of the selected arrow; other owned arrows back it up. */
  arrowQty: string;
  arrows: Record<string, number>;
  spellKey: string | null;
  eatThresholdPct: number;
  eatOrder: EatOrder;
  mercIds: string[];
};

const flagsOf = (ps: PlayerState) => ps.raw.flags;
const inv = (ps: PlayerState, key: string) => ps.raw.inventory[key] ?? 0;

/** Arrow keys best → worst, the game's ARROW_TIERS. */
export const ARROW_TIERS = [...KNOWN_ARROWS].reverse().map((a) => a.key);
const ARROW_STRENGTH = Object.fromEntries(KNOWN_ARROWS.map((a) => [a.key, a.strengthBonus]));

export function foodHealValues(cooking: Record<string, RecipeEntry>): { key: string; heal: number; name: string }[] {
  return Object.values(cooking)
    .filter((r) => !!r.cooked_item)
    .map((r) => ({ key: r.cooked_item!, heal: r.healing_value ?? 0, name: r.display_name }));
}

export function potionEffects(key: string | null, herblore: Record<string, RecipeEntry>): Record<string, number> {
  if (!key) return {};
  const enhanced = key.startsWith('enhanced_');
  const base = herblore[enhanced ? key.slice('enhanced_'.length) : key]?.effects ?? {};
  return enhanced ? Object.fromEntries(Object.entries(base).map(([s, v]) => [s, Math.max(v * 2, v + 1)])) : base;
}

export function defaultSelections(ps: PlayerState, data: SimData, isle = false): Selections {
  const flags = flagsOf(ps);
  const potionKey = (flags.active_potion_key as string | undefined) ?? null;
  const ownedPotion = potionKey && inv(ps, potionKey) > 0 ? potionKey : null;

  // Default to the best-healing equipped food you own. The game only ever eats equipped food
  // (FoodReservation.available), so having none of it left means a no-food fight.
  const equippedFood = new Set(Object.keys((flags.equipped_food as Record<string, number> | undefined) ?? {}));
  const pool = foodHealValues(data.cooking).filter((f) => equippedFood.has(f.key) && inv(ps, f.key) > 0);
  const best = pool.reduce<(typeof pool)[number] | null>((b, f) => (!b || f.heal > b.heal ? f : b), null);
  const food: Record<string, number> = best ? { [best.key]: inv(ps, best.key) } : {};

  const arrows = Object.fromEntries(ARROW_TIERS.filter((k) => inv(ps, k) > 0).map((k) => [k, inv(ps, k)]));
  // Best arrow owned.
  const arrowKey = ARROW_TIERS.find((k) => inv(ps, k) > 0) ?? null;

  // Highest max-hit spell your Magic level can cast (runes are assumed to always be enough).
  const magicLevel = combatLevels(ps, isle).magic;
  const castable = Object.entries(data.spells).filter(([, sp]) => sp.magic_level_required <= magicLevel);
  const spellKey =
    castable.reduce<[string, SpellEntry] | null>((b, c) => (!b || c[1].max_hit > b[1].max_hit ? c : b), null)?.[0] ??
    null;

  return {
    weaponSlot: savedActiveWeaponSlot(ps),
    potionKey: ownedPotion,
    food,
    arrowKey,
    arrowQty: String(arrowKey ? inv(ps, arrowKey) : 0),
    arrows,
    spellKey,
    // The game offers 10% to 90% in steps of 10.
    eatThresholdPct: Math.min(90, Math.max(10, Math.round(Number(flags.food_eat_threshold_pct ?? 50) / 10) * 10)),
    eatOrder: (flags.food_eat_order as EatOrder | undefined) ?? 'descending',
    mercIds: savedHiredMercenaryIds(ps),
  };
}

/** Mainland or Elder Isle combat levels (isle replaces every combat level with the elder one). */
export function combatLevels(ps: PlayerState, isle: boolean): Record<string, number> {
  const elder = (flagsOf(ps).elder_skill_levels ?? {}) as Record<string, number>;
  const out: Record<string, number> = {};
  for (const skill of [...COMBAT_SKILLS, 'agility']) {
    out[skill] = isle ? (elder[skill] ?? 1) : (ps.raw.skillLevels[skill] ?? 1);
  }
  return out;
}

function nodes(ps: PlayerState, data: SimData, skill: string) {
  return activeNodesForSkill(ps, data.prestigeTrees.get(skill));
}

function prestige(ps: PlayerState, data: SimData, skill: string, effect: string): number {
  return effectTotal(nodes(ps, data, skill), effect);
}

/** BoostRepository.combatStatBonus: flat nodes + rounded per-level (human) nodes. */
export function combatStatBonus(ps: PlayerState, data: SimData, skill: string, level: number): number {
  return (
    prestige(ps, data, skill, 'combat_stat_flat') + Math.round(prestige(ps, data, skill, 'per_level_bonus') * level)
  );
}

const HEIRLOOM_GATE_LEVEL = 85;
const HEIRLOOM_FIELDS = [
  'attack_bonus',
  'strength_bonus',
  'defense_bonus',
  'ranged_attack_bonus',
  'ranged_strength_bonus',
  'magic_attack_bonus',
  'magic_damage_bonus',
] as const;
const ALWAYS_PRESENT = new Set(['attack_bonus', 'strength_bonus', 'defense_bonus']);

/** HeirloomStats.resolve: lerp base → max by item level × min(skill level, 85) / 85. */
export function resolveHeirloom(
  item: EquipmentEntry,
  key: string,
  ps: PlayerState,
  levels: Record<string, number>,
): EquipmentEntry {
  if (!item.heirloom_skill) return item;
  const itemXp = Math.min(MAX_ITEM_LEVEL_XP, ((flagsOf(ps).heirloom_xp ?? {}) as Record<string, number>)[key] ?? 0);
  const skillLevel = levels[item.heirloom_skill] ?? ps.raw.skillLevels[item.heirloom_skill] ?? 1;
  const f =
    ((levelForXp(itemXp) - 1) / 98) * (Math.min(Math.max(skillLevel, 1), HEIRLOOM_GATE_LEVEL) / HEIRLOOM_GATE_LEVEL);
  const base = item.heirloom_base ?? {};
  const out: EquipmentEntry = { ...item };
  for (const field of HEIRLOOM_FIELDS) {
    const max = item[field];
    if (max === undefined || max === null) {
      if (!ALWAYS_PRESENT.has(field)) continue;
    }
    const b = base[field] ?? 0;
    const m = (max as number | undefined) ?? 0;
    out[field] = Math.round(b + (m - b) * f);
  }
  return out;
}

export type GearPiece = { slot: string; id: string; item: EquipmentEntry };

/**
 * Gear worn for a weapon slot. The saved active slot uses what's equipped; switching slot applies
 * that style's armour loadout the way the game's applyLoadout does (owned, level-met items only;
 * a two-handed weapon takes the shield off).
 */
export function gearFor(
  ps: PlayerState,
  data: SimData,
  weaponSlot: CombatStyle,
  levels: Record<string, number>,
): { weapon: GearPiece | null; armour: GearPiece[] } {
  const equipped: Record<string, string | null> = { ...ps.raw.equipped };
  const weaponId = equipped[weaponSlotForStyle(weaponSlot)] ?? null;
  if (weaponSlot !== savedActiveWeaponSlot(ps)) {
    const twoHanded = !!(weaponId && data.equipment[weaponId]?.two_handed);
    if (twoHanded) equipped.shield = null;
    const loadout = armorLoadoutForStyle(ps, weaponSlot);
    for (const slot of ARMOR_SLOTS) {
      if (!(slot in loadout) || (slot === 'shield' && twoHanded)) continue;
      const key = loadout[slot];
      if (key === null) {
        equipped[slot] = null;
        continue;
      }
      const item = data.equipment[key];
      const levelOk =
        !!item && Object.entries(item.requirements ?? {}).every(([s, l]) => (ps.raw.skillLevels[s] ?? 1) >= l);
      if (item && inv(ps, key) > 0 && levelOk) equipped[slot] = key;
    }
  }
  const piece = (slot: string, id: string | null | undefined): GearPiece | null => {
    const item = id ? data.equipment[id] : undefined;
    return item && id ? { slot, id, item: resolveHeirloom(item, id, ps, levels) } : null;
  };
  return {
    weapon: piece(weaponSlotForStyle(weaponSlot), weaponId),
    armour: ARMOR_SLOTS.map((slot) => piece(slot, equipped[slot])).filter((p): p is GearPiece => !!p),
  };
}

function prayerCapeMult(ps: PlayerState, data: SimData): number {
  return Math.fround(1 + resolveCapeBonus(ps, 'prayer', data.equipment, 1).multiplier);
}

function activeBlessing(ps: PlayerState, data: SimData, type: BlessingEntry['type'], now: number) {
  if (ps.ironman) return null;
  const flags = flagsOf(ps);
  return resolveActiveBlessing(
    type,
    (flags.active_blessing_key as string | undefined) ?? '',
    Number(flags.active_blessing_expires_at ?? 0),
    data.blessings,
    now,
  );
}

export type LevelRow = { base: number; prestige: number; potion: number; total: number };

export type ResolvedCombat = {
  style: CombatStyle;
  weapon: GearPiece | null;
  armour: GearPiece[];
  levels: Record<CombatSkill, LevelRow>;
  gear: { attack: number; strength: number; defense: number; rangedStrength: number; magicDamage: number };
  blessingDefence: number;
  towerHpBonus: number;
  potion: Record<string, number>;
  spell: SpellEntry | null;
  runeKey: string | null;
  healPct: number;
  foodHeal: Record<string, number>;
  petBoostPct: number;
  inputs: EngineInputs;
  warnings: string[];
  /** Why the simulation can't run yet (an empty or invalid input), or null. */
  invalid: string | null;
};

export function resolveCombat(
  ps: PlayerState,
  data: SimData,
  sel: Selections,
  isle: boolean,
  now = Date.now(),
): ResolvedCombat {
  const flags = flagsOf(ps);
  const levels = combatLevels(ps, isle);
  const { weapon, armour } = gearFor(ps, data, sel.weaponSlot, levels);
  const w = weapon?.item;
  const style: CombatStyle = w?.combat_style ?? 'attack';
  const warnings: string[] = [];

  const sum = (pick: (e: EquipmentEntry) => number | undefined | null, withWeapon = true) =>
    armour.reduce((n, p) => n + (pick(p.item) ?? 0), 0) + (withWeapon && w ? (pick(w) ?? 0) : 0);
  const styleAttack = (e: EquipmentEntry) =>
    (e.attack_bonus ?? 0) +
    (style === 'ranged' ? (e.ranged_attack_bonus ?? 0) : style === 'magic' ? (e.magic_attack_bonus ?? 0) : 0);
  const gear = {
    attack: sum(styleAttack),
    strength: sum((e) => e.strength_bonus),
    defense: sum((e) => e.defense_bonus),
    rangedStrength: style === 'ranged' ? sum((e) => e.ranged_strength_bonus) : 0,
    magicDamage: style === 'magic' ? sum((e) => e.magic_damage_bonus) : 0,
  };

  const potionFlat = prestige(ps, data, 'herblore', 'potion_bonus_flat');
  const rawPotion = potionEffects(sel.potionKey, data.herblore);
  const potion = Object.fromEntries(Object.entries(rawPotion).map(([s, v]) => [s, v + potionFlat]));

  const capeMult = prayerCapeMult(ps, data);
  const defBlessing = activeBlessing(ps, data, 'DEFENSE', now);
  const blessingDefence = defBlessing ? Math.trunc(Math.fround(defBlessing.magnitude * capeMult)) : 0;
  const towerHpBonus = Number(flags.tower_hp_bonus ?? 0);

  const row = (skill: CombatSkill, pot: Record<string, number>): LevelRow => {
    const base = levels[skill];
    const pres = combatStatBonus(ps, data, skill, base);
    const p = skill === 'hitpoints' ? 0 : (pot[skill] ?? 0);
    return { base, prestige: pres, potion: p, total: base + pres + p };
  };
  const rowsFor = (pot: Record<string, number>) =>
    Object.fromEntries(COMBAT_SKILLS.map((s) => [s, row(s, pot)])) as Record<CombatSkill, LevelRow>;

  const spell = sel.spellKey ? (data.spells[sel.spellKey] ?? null) : null;
  if (style === 'magic' && !spell) warnings.push('Pick a spell. The game will not start a magic fight without one.');
  if (style === 'magic' && spell && levels.magic < spell.magic_level_required) {
    warnings.push(`${spell.display_name} needs Magic ${spell.magic_level_required}.`);
  }
  const infinite = w?.infinite_runes;
  const runeKey =
    style === 'magic' && spell && infinite !== 'all' && infinite !== spell.rune_type ? spell.rune_type : null;

  const healPct = prestige(ps, data, 'cooking', 'heal_pct') + prestige(ps, data, 'hitpoints', 'heal_pct');
  const foodHeal = Object.fromEntries(
    foodHealValues(data.cooking).map((f) => [
      f.key,
      healPct > 0 ? Math.max(f.heal, Math.floor(f.heal * (1 + healPct / 100))) : f.heal,
    ]),
  );
  // Cooking-recipe order is the game's tie-break for equal heal values.
  const food: FoodStack[] = foodHealValues(data.cooking)
    .filter((f) => (sel.food[f.key] ?? 0) > 0)
    .map((f) => ({ key: f.key, qty: sel.food[f.key], heal: foodHeal[f.key] }));

  const arrowQty = sel.arrowKey ? parseQty(sel.arrowQty) : null;
  const stacks: Record<string, number> = sel.arrowKey ? { ...sel.arrows, [sel.arrowKey]: arrowQty ?? 0 } : sel.arrows;
  const preferred = sel.arrowKey && (stacks[sel.arrowKey] ?? 0) > 0 ? sel.arrowKey : null;
  const arrowOrder = preferred
    ? [preferred, ...[...ARROW_TIERS].reverse().filter((k) => k !== preferred)]
    : ARROW_TIERS;
  const arrows: ArrowStack[] = arrowOrder
    .filter((k) => (stacks[k] ?? 0) > 0)
    .map((k) => ({ key: k, qty: stacks[k], strength: ARROW_STRENGTH[k] ?? 0 }));
  const invalid = style === 'ranged' && sel.arrowKey && arrowQty === null ? 'Enter how many arrows to bring.' : null;
  if (style === 'ranged' && arrows.length === 0) warnings.push('No arrows. Ranged attacks will deal 0 damage.');

  const petBoostPct = ps.ironman
    ? 0
    : ps.raw.pets.reduce((n, owned) => {
        const pet = data.pets[owned.id];
        return pet && (pet.boosted_skill === 'combat' || pet.boosted_skill === 'all')
          ? n + (pet.boost_percent ?? 0)
          : n;
      }, 0);

  const build = (pot: Record<string, number>): EngineInputs => {
    const l = rowsFor(pot);
    return {
      style,
      attack: l.attack.total,
      strength: l.strength.total,
      defence: l.defense.total + gear.defense + blessingDefence,
      ranged: l.ranged.total,
      magic: l.magic.total,
      hpLevel: l.hitpoints.total + towerHpBonus,
      attackBonus: gear.attack,
      strengthBonus: gear.strength,
      rangedStrengthBonus: gear.rangedStrength,
      spellMaxHit: (spell?.max_hit ?? 0) + gear.magicDamage,
      attackSpeedSec: w?.attack_speed ?? BASE_ATTACK_SPEED_SEC,
      doubleHitChance: prestige(ps, data, 'strength', 'double_hit_pct') / 100,
      secondChance: prestige(ps, data, 'attack', 'second_chance') >= 1,
      food,
      eatThresholdPct: sel.eatThresholdPct,
      arrows,
      runeCost: spell?.rune_cost ?? 1,
      // Runes are assumed to always be enough; they're still counted as used.
      runes: runeKey ? Number.POSITIVE_INFINITY : null,
      petBoostPct,
    };
  };

  return {
    style,
    weapon,
    armour,
    levels: rowsFor(potion),
    gear,
    blessingDefence,
    towerHpBonus,
    potion,
    spell,
    runeKey,
    healPct,
    foodHeal,
    petBoostPct,
    inputs: build(potion),
    warnings,
    invalid,
  };
}

export function mercCombatant(m: MercenaryEntry): MercCombatant {
  return {
    id: m.id,
    style: m.combat_style,
    effAttack: m.attack_level + m.attack_bonus,
    maxHit: meleeMaxHit(m.strength_level, m.strength_bonus),
    defense: m.defense_level,
    hpLevel: m.hp,
  };
}

export function bossTarget(ps: PlayerState, data: SimData, boss: BossEntry, mercIds: string[]): BossTarget {
  const mercs = boss.raid
    ? mercIds.map((id) => data.mercenaries.find((m) => m.id === id)).filter((m): m is MercenaryEntry => !!m)
    : [];
  const blocked = new Set(Object.keys(ps.raw.inventory).filter((k) => !!data.equipment[k]?.heirloom_skill));
  return { boss, mercenaries: mercs.map(mercCombatant), blockedRareDrops: blocked };
}

/** Real-time session length: elder Agility on the isle, else Agility + Endurance + Chronos Spire. */
export function sessionMs(ps: PlayerState, data: SimData, isle: boolean): number {
  if (isle) return elderSessionMs(combatLevels(ps, true).agility);
  const tiers = (flagsOf(ps).town_building_tiers ?? {}) as Record<string, number>;
  let reduction = 0;
  for (const [key, tier] of Object.entries(tiers)) {
    reduction += data.buildings[key]?.tiers[tier - 1]?.bonuses?.player_session_speed_reduction ?? 0;
  }
  return mainlandSessionMs(
    ps.raw.skillLevels.agility ?? 1,
    prestige(ps, data, 'agility', 'session_floor_min'),
    Math.max(0.5, Math.fround(1 - reduction)),
  );
}

/** The game's gameDay(resetHour): local date, rolled back a day before the reset hour. */
export function gameDay(resetHour: number, now = new Date()): number {
  const d = new Date(now);
  if (d.getHours() < resetHour) d.setDate(d.getDate() - 1);
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

/** Full-coin wins of [bossId] already used today. */
export function bossWinsToday(ps: PlayerState, bossId: string, now = new Date()): number {
  const flags = flagsOf(ps);
  if (Number(flags.boss_coin_day ?? -1) !== gameDay(Number(flags.daily_reset_hour ?? 0), now)) return 0;
  return ((flags.boss_coin_kills_by_boss ?? {}) as Record<string, number>)[bossId] ?? 0;
}

export function collectionContext(
  ps: PlayerState,
  data: SimData,
  kind: CollectionKind,
  isle: boolean,
  now = Date.now(),
): CollectionContext {
  const flags = flagsOf(ps);
  const ironman = ps.ironman;
  const capeMult = prayerCapeMult(ps, data);
  const skills = [...COMBAT_SKILLS, 'prayer'];

  const xpBlessing = activeBlessing(ps, data, 'XP', now);
  const blessingXp = xpBlessing ? Math.fround(1 + Math.fround(xpBlessing.magnitude - 1) * capeMult) : 1;
  const purchased = !ironman && Number(flags.xp_boost_expires_at ?? 0) > now ? 2 : 1;
  const prestigeBoosts = (flags.prestige_xp_boosts ?? {}) as Record<string, number>;

  const ownedPets = ironman ? [] : ps.raw.pets;
  const bossPetPct = Object.fromEntries(
    skills.map((skill) => [
      skill,
      ownedPets.reduce((n, owned) => {
        const pet = data.pets[owned.id];
        if (!pet) return n;
        const applies =
          pet.boosted_skill === 'all' ||
          pet.boosted_skill === skill ||
          (pet.boosted_skill === 'combat' && PET_COMBAT_SKILLS.has(skill));
        return applies ? n + (pet.boost_percent ?? 0) : n;
      }, 0),
    ]),
  );

  const coinBlessing = activeBlessing(ps, data, 'COINS', now);
  const goose = ps.raw.pets.find((p) => p.id === 'golden_goose');
  const gooseMult = 1 + (goose ? (goose.boostPercent ?? data.pets.golden_goose?.boost_percent ?? 0) : 0) / 100;
  const coinMult = ironman
    ? 1
    : Math.fround(
        (coinBlessing ? Math.fround(1 + Math.fround(coinBlessing.magnitude * capeMult)) : 1) * Math.fround(gooseMult),
      );

  const stack = (id: string) => sigilMultiplier(flags, id);

  const elder = combatLevels(ps, true);
  return {
    kind,
    isle,
    ironman,
    capeMult: Object.fromEntries(
      skills.map((s) => [s, Math.fround(1 + resolveCapeBonus(ps, s, data.equipment, 1).multiplier)]),
    ),
    deathKeep: Math.min(
      0.6,
      0.1 + (prestige(ps, data, 'defense', 'death_keep_pct') + prestige(ps, data, 'hitpoints', 'death_keep_pct')) / 100,
    ),
    xpMult: Object.fromEntries(
      skills.map((s) => {
        const boost = purchased * ((prestigeBoosts[s] ?? 0) > now ? 2 : 1);
        const prestigeMult = 1 + prestige(ps, data, s, 'xp_pct') / 100;
        return [s, ironman ? boost * prestigeMult : boost * blessingXp * prestigeMult];
      }),
    ),
    bossPetPct,
    elderLevels: elder,
    coinMult,
    sigils: {
      xp: stack('elder_sapphire'),
      coin: stack('elder_ruby'),
      loot: stack('elder_emerald'),
      essence: stack('elder_amethyst'),
      sigil: stack('elder_topaz'),
      bone: stack('elder_diamond'),
    },
    towerXpMult: ironman ? 1 : 1 + Number(flags.tower_xp_bonus_pct ?? 0) / 100,
    towerCoinMult: ironman ? 1 : 1 + Number(flags.tower_coin_bonus_pct ?? 0) / 100,
    arrowReclaim: reclaimFraction(
      ps.raw.skillLevels.ranged ?? 1,
      (prestige(ps, data, 'ranged', 'reclaim_pct') + prestige(ps, data, 'fletching', 'reclaim_pct')) / 100,
    ),
    runeReclaim: reclaimFraction(
      ps.raw.skillLevels.magic ?? 1,
      (prestige(ps, data, 'magic', 'reclaim_pct') + prestige(ps, data, 'runecrafting', 'reclaim_pct')) / 100,
    ),
  };
}

/** Item / enemy key → display name from the game data; anything missing falls back to humanize. */
export function displayNames(data: SimData): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [k, e] of Object.entries(data.equipment)) if (e.display_name) names[k] = e.display_name;
  for (const f of foodHealValues(data.cooking)) names[f.key] = f.name;
  for (const [k, p] of Object.entries(data.pets)) names[k] = p.display_name;
  for (const [k, e] of Object.entries(data.enemies)) names[k] = e.display_name;
  for (const a of KNOWN_ARROWS) names[a.key] = a.displayName;
  return names;
}

/** Bosses fought on Elder Isle itself (elder levels, elder payout). Sea Serpent is fought from the mainland. */
export const ISLE_BOSS_IDS = new Set(['last_elder']);

/** HomeViewModel.combatLevelFrom, on mainland or Elder levels. */
export function combatLevelFor(ps: PlayerState, isle: boolean): number {
  const l = combatLevels(ps, isle);
  const melee = (Math.max(1, l.attack) + Math.max(1, l.strength)) / 2;
  const top = Math.max(melee, Math.max(1, l.ranged), Math.max(1, l.magic));
  return Math.max(1, Math.trunc(0.65 * top + 0.25 * (Math.max(1, l.defense) + Math.max(1, l.hitpoints))));
}

export function dungeonTarget(dungeon: DungeonEntry, data: SimData): DungeonTarget {
  return {
    spawns: dungeon.enemy_spawns.map((s) => ({ key: s.enemy, weight: s.weight })),
    enemies: data.enemies,
    safeZone: !!dungeon.safe_zone,
    rareDrops: dungeon.rare_drops ?? [],
  };
}

/** The game's dungeon unlock gate: combat level at least the recommended level minus 5. */
export const DUNGEON_LEVEL_GRACE = 5;
