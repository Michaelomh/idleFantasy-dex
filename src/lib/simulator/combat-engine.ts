// Tick-for-tick port of the game's CombatSimulator.simulateDungeon and simulateBoss
// (tristinbaker/IdleFantasy 1.16.0 + PR #2099, 37317af). Inputs arrive fully resolved
// (see resolve-inputs.ts): potion, prestige, gear and blessing are already folded into the
// effective levels, exactly as the game's direct "Fight" path passes them in.
import type { BossEntry, EnemyEntry } from '@/lib/progress/game-data';
import { rollInt, rollRange, type Rng } from './rng';

export type CombatStyle = 'attack' | 'strength' | 'ranged' | 'magic';
export type MercCombatStyle = 'melee' | 'ranged' | 'magic';

export const BASE_ATTACK_SPEED_SEC = 2.4;
/** Ticks per frame at the base attack speed; also the floor used for death/boss-end timing. */
export const TICKS_PER_FRAME = 25;
export const DUNGEON_FRAMES = 60;
/** The most food a run can eat. */
export const FOOD_EAT_CAP = 300;
/** Full raid party (player + 3 mercenaries); raid bosses scale up against smaller parties. */
export const RAID_FULL_PARTY = 4;

export type FoodStack = { key: string; qty: number; heal: number };
export type ArrowStack = { key: string; qty: number; strength: number };

export type EngineInputs = {
  style: CombatStyle;
  /** Effective levels: base + prestige + potion (defence also gear, blessing, and for bosses nothing else). */
  attack: number;
  strength: number;
  defence: number;
  ranged: number;
  magic: number;
  /** HP level; max HP is ×10. */
  hpLevel: number;
  /** Style-dependent gear accuracy bonus. */
  attackBonus: number;
  /** Melee gear strength bonus. */
  strengthBonus: number;
  /** Ranged gear strength bonus, arrows excluded. */
  rangedStrengthBonus: number;
  /** Spell max hit + gear magic damage bonus. */
  spellMaxHit: number;
  attackSpeedSec: number;
  doubleHitChance: number;
  secondChance: boolean;
  /** Food stacks already in eat order. */
  food: FoodStack[];
  eatThresholdPct: number;
  /** Arrow stacks in firing order. */
  arrows: ArrowStack[];
  runeCost: number;
  /** Runes available for the spell; null when the staff gives unlimited runes. */
  runes: number | null;
  /** Combat pet XP boost, applied per dungeon kill. */
  petBoostPct: number;
};

export type DungeonTarget = {
  spawns: { key: string; weight: number }[];
  enemies: Record<string, EnemyEntry>;
  safeZone: boolean;
  rareDrops: { item: string; chance: number }[];
};

export type MercCombatant = {
  id: string;
  style: MercCombatStyle;
  effAttack: number;
  maxHit: number;
  defense: number;
  hpLevel: number;
};

export type BossTarget = {
  boss: BossEntry;
  mercenaries: MercCombatant[];
  /** Rare drops that must not roll (heirlooms the player already owns). */
  blockedRareDrops: Set<string>;
};

export type RunResult = {
  died: boolean;
  /** Boss: the boss was defeated (incl. a timeout decided in the party's favour). Dungeon: survived. */
  won: boolean;
  timedOut: boolean;
  /** Frames recorded, the last one possibly partial. */
  frames: number;
  /** Ticks played in the last recorded frame. */
  lastFrameTicks: number;
  /** Most ticks recorded in any frame. */
  maxFrameTicks: number;
  kills: Record<string, number>;
  xp: Record<string, number>;
  items: Record<string, number>;
  food: Record<string, number>;
  arrows: Record<string, number>;
  runes: number;
};

export function ticksPerFrame(attackSpeedSec: number): number {
  return Math.round(60 / clampSpeed(attackSpeedSec));
}

function clampSpeed(s: number): number {
  return Math.min(BASE_ATTACK_SPEED_SEC, Math.max(1.2, s));
}

export function hitChance(att: number, def: number, floor: number): number {
  const raw = att > def ? 1 - def / (2 * Math.max(att, 1)) : att / (2 * Math.max(def, 1));
  return Math.min(0.95, Math.max(floor, raw));
}

export function meleeMaxHit(effStrength: number, strengthBonus: number): number {
  return Math.max(1, 1 + Math.floor(((effStrength + strengthBonus) * (strengthBonus + 64)) / 640));
}

export function rangedMaxHit(effRanged: number, gearStrengthBonus: number, arrowStrength: number): number {
  const str = gearStrengthBonus + arrowStrength;
  return Math.max(1, 1 + Math.floor(((effRanged + str) * (str + 64)) / 640));
}

export function enemyMaxHit(strengthLevel: number, strengthBonus: number): number {
  const effStr = strengthLevel + strengthBonus;
  return effStr === 0 ? 0 : Math.max(0, 1 + Math.floor((effStr * (strengthBonus + 64)) / 640));
}

export function playerAttackRoll(p: EngineInputs): number {
  const level = p.style === 'ranged' ? p.ranged : p.style === 'magic' ? p.magic : p.attack;
  return level + p.attackBonus;
}

export function targetDefence(style: CombatStyle, d: EnemyEntry['defensive_stats']): number {
  switch (style) {
    case 'ranged':
      return d.ranged_defense;
    case 'magic':
      return d.magic_defense;
    case 'strength':
      return d.strength_defense;
    default:
      return d.attack_defense;
  }
}

/** Max hit before any arrow (ranged max hit is recomputed per shot from the arrow fired). */
export function basePlayerMaxHit(p: EngineInputs): number {
  if (p.style === 'magic') return Math.max(1, p.spellMaxHit);
  if (p.style === 'ranged') return rangedMaxHit(p.ranged, p.rangedStrengthBonus, 0);
  return meleeMaxHit(p.strength, p.strengthBonus);
}

const add = (map: Record<string, number>, key: string, qty: number) => {
  map[key] = (map[key] ?? 0) + qty;
};

/** Shared per-run consumable state: food in eat order, arrow stacks, runes. */
function consumables(p: EngineInputs) {
  const food = p.food.map((f) => ({ ...f }));
  let foodEaten = 0;
  let arrowIdx = 0;
  let arrowsLeft = p.arrows[0]?.qty ?? (p.style === 'ranged' ? 0 : Number.POSITIVE_INFINITY);
  let runesLeft = p.runes ?? Number.POSITIVE_INFINITY;
  const threshold = Math.min(100, Math.max(0, p.eatThresholdPct)) / 100;
  const used = { food: {} as Record<string, number>, arrows: {} as Record<string, number>, runes: 0 };

  return {
    used,
    /** One player attack's damage before overkill/double-hit rules. Returns null when no hit is possible. */
    rangedShot(rng: Rng, chance: number): number {
      while (arrowsLeft === 0 && arrowIdx + 1 < p.arrows.length) {
        arrowIdx++;
        arrowsLeft = p.arrows[arrowIdx].qty;
      }
      if (arrowsLeft <= 0) return 0;
      const arrow = p.arrows[arrowIdx];
      arrowsLeft--;
      add(used.arrows, arrow.key, 1);
      const max = rangedMaxHit(p.ranged, p.rangedStrengthBonus, arrow.strength);
      return rng() < chance ? rollInt(rng, max) : 0;
    },
    magicCast(rng: Rng, chance: number, max: number): number {
      if (runesLeft < p.runeCost) return 0;
      if (p.runes !== null) {
        runesLeft -= p.runeCost;
        used.runes += p.runeCost;
      }
      return rng() < chance ? rollInt(rng, max) : 0;
    },
    eat(hp: number, maxHp: number, incomingMaxHit: number): number {
      while (foodEaten < FOOD_EAT_CAP) {
        const stack = food.find((f) => f.qty > 0);
        if (!stack) break;
        if (!(hp <= incomingMaxHit || hp <= maxHp * threshold)) break;
        hp = Math.min(maxHp, hp + stack.heal);
        stack.qty--;
        add(used.food, stack.key, 1);
        foodEaten++;
      }
      return hp;
    },
  };
}

function meleeSwing(p: EngineInputs, rng: Rng, chance: number, max: number, targetHp: number): number {
  // Second Chance rerolls a missed accuracy roll once.
  let hit = rng() < chance;
  if (!hit && p.secondChance) hit = rng() < chance;
  let dmg = hit ? rollInt(rng, max) : 0;
  // Double Hit only strikes a still-living target (no overkill carry).
  if (p.doubleHitChance > 0 && targetHp - dmg > 0 && rng() < p.doubleHitChance && rng() < chance) {
    dmg += rollInt(rng, max);
  }
  return dmg;
}

function distributeXp(xp: number, style: CombatStyle, out: Record<string, number>) {
  const hp = Math.floor(xp * 0.15);
  const def = Math.floor(xp * 0.15);
  add(out, style, xp - hp - def);
  add(out, 'hitpoints', hp);
  add(out, 'defense', def);
}

export function simulateDungeon(p: EngineInputs, target: DungeonTarget, rng: Rng): RunResult {
  const speed = clampSpeed(p.attackSpeedSec);
  const ticks = ticksPerFrame(speed);
  const pool = target.spawns.flatMap((s) => Array<string>(s.weight).fill(s.key));
  const maxHp = p.hpLevel * 10;
  let hp = maxHp;
  const c = consumables(p);
  const result: RunResult = {
    died: false,
    won: false,
    timedOut: false,
    frames: 0,
    lastFrameTicks: 0,
    maxFrameTicks: 0,
    kills: {},
    xp: {},
    items: {},
    food: c.used.food,
    arrows: c.used.arrows,
    runes: 0,
  };
  if (pool.length === 0) return result;

  const atkRoll = playerAttackRoll(p);
  let carryKey: string | null = null;
  let carryHp = 0;
  let enemyClock = 0;

  for (let minute = 1; minute <= DUNGEON_FRAMES; minute++) {
    let key: string = carryKey ?? pool[rollInt(rng, pool.length - 1)];
    carryKey = null;
    let enemy = target.enemies[key];
    if (!enemy) continue;

    let maxHit = 0;
    let pChance = 0;
    let eMax = 0;
    let eChance = 0;
    const refresh = () => {
      maxHit = basePlayerMaxHit(p);
      pChance = hitChance(atkRoll, targetDefence(p.style, enemy.defensive_stats), 0.15);
      const cs = enemy.combat_stats;
      eMax = enemyMaxHit(cs.strength_level, cs.strength_bonus);
      eChance = hitChance(cs.attack_level + cs.attack_bonus, p.defence, 0.1);
    };
    refresh();

    let enemyHp = carryHp > 0 ? carryHp : enemy.hp;
    carryHp = 0;
    let frameTicks = 0;
    let died = false;

    for (let tick = 0; tick < ticks; tick++) {
      frameTicks++;
      let dmg: number;
      if (p.style === 'ranged') dmg = c.rangedShot(rng, pChance);
      else if (p.style === 'magic') dmg = c.magicCast(rng, pChance, maxHit);
      else dmg = meleeSwing(p, rng, pChance, maxHit, enemyHp);
      enemyHp -= dmg;

      if (enemyHp <= 0) {
        add(result.kills, key, 1);
        for (const d of enemy.always_drops ?? []) add(result.items, d.item, d.quantity);
        for (const d of enemy.drop_table ?? []) {
          if (rng() < d.chance) add(result.items, d.item, rollRange(rng, d.quantity_min, d.quantity_max));
        }
        const base = enemy.xp_drops.combat ?? 0;
        distributeXp(p.petBoostPct > 0 ? Math.floor(base * (1 + p.petBoostPct / 100)) : base, p.style, result.xp);
        key = pool[rollInt(rng, pool.length - 1)];
        enemy = target.enemies[key] ?? enemy;
        refresh();
        enemyHp = enemy.hp;
      }

      // Enemy attacks on a fixed 2.4 s cadence, independent of player speed.
      enemyClock += speed;
      let eDmg = 0;
      while (enemyClock >= BASE_ATTACK_SPEED_SEC - 1e-9) {
        enemyClock -= BASE_ATTACK_SPEED_SEC;
        if (rng() < eChance) eDmg += rollInt(rng, eMax);
      }
      hp -= eDmg;

      // Death is checked before eating, so food cannot revive a player at 0 HP.
      if (hp <= 0 && !target.safeZone) {
        died = true;
        break;
      }
      hp = c.eat(hp, maxHp, eMax);
    }

    if (enemyHp > 0 && enemyHp < enemy.hp) {
      carryKey = key;
      carryHp = enemyHp;
    }
    if (target.safeZone) hp = Math.max(hp, 1);

    result.frames++;
    result.lastFrameTicks = frameTicks;
    result.maxFrameTicks = Math.max(result.maxFrameTicks, frameTicks);
    if (died) {
      result.died = true;
      break;
    }
  }

  if (result.frames > 0 && !result.died) {
    result.won = true;
    for (const r of target.rareDrops) if (rng() < r.chance) add(result.items, r.item, 1);
  }
  result.runes = c.used.runes;
  return result;
}

export function simulateBoss(p: EngineInputs, target: BossTarget, rng: Rng): RunResult {
  const { boss, mercenaries } = target;
  const speed = clampSpeed(p.attackSpeedSec);
  const ticks = ticksPerFrame(speed);
  const cs = { attack_level: 0, strength_level: 0, attack_bonus: 0, strength_bonus: 0, ...boss.combat_stats };
  const ds = { attack_defense: 0, strength_defense: 0, ranged_defense: 0, magic_defense: 0, ...boss.defensive_stats };

  const maxHit = basePlayerMaxHit(p);
  // Bosses floor the player's hit chance at 10%, not the dungeon's 15%.
  const pChance = hitChance(playerAttackRoll(p), targetDefence(p.style, ds), 0.1);

  const partyScale = boss.raid ? RAID_FULL_PARTY / (1 + mercenaries.length) : 1;
  const bossMax = Math.round(enemyMaxHit(cs.strength_level, cs.strength_bonus) * partyScale);
  const bossAtk = cs.attack_level + cs.attack_bonus;
  const bossChance = Math.min(0.95, Math.max(0.1, hitChance(bossAtk, p.defence, 0) * partyScale));

  const mercDef = (m: MercCombatant) =>
    m.style === 'ranged' ? ds.ranged_defense : m.style === 'magic' ? ds.magic_defense : ds.attack_defense;
  const mercChance = mercenaries.map((m) => hitChance(m.effAttack, mercDef(m), 0.1));
  const bossChanceVsMerc = mercenaries.map((m) =>
    Math.min(0.95, Math.max(0.1, hitChance(bossAtk, m.defense, 0) * partyScale)),
  );
  const mercHp = mercenaries.map((m) => m.hpLevel * 10);

  const maxHp = p.hpLevel * 10;
  let hp = maxHp;
  let bossHp = boss.hp ?? 0;
  const duration = boss.duration_minutes ?? 0;
  const c = consumables(p);
  let bossClock = 0;
  let mercClock = 0;
  let won = false;
  let died = false;
  let timedOut = false;
  let frames = 0;
  let frameTicks = 0;
  let maxFrameTicks = 0;

  while (frames < duration && !won && !died) {
    frameTicks = 0;
    for (let tick = 0; tick < ticks; tick++) {
      frameTicks++;
      let dmg: number;
      if (p.style === 'ranged') dmg = c.rangedShot(rng, pChance);
      else if (p.style === 'magic') dmg = c.magicCast(rng, pChance, maxHit);
      else dmg = meleeSwing(p, rng, pChance, maxHit, bossHp);
      bossHp -= dmg;

      if (mercenaries.length > 0) {
        mercClock += speed;
        while (mercClock >= BASE_ATTACK_SPEED_SEC - 1e-9) {
          mercClock -= BASE_ATTACK_SPEED_SEC;
          for (let i = 0; i < mercenaries.length; i++) {
            if (mercHp[i] <= 0) continue;
            if (rng() < mercChance[i]) bossHp -= rollInt(rng, mercenaries[i].maxHit);
          }
        }
      }

      if (bossHp <= 0) {
        won = true;
        break;
      }

      // In a raid each boss attack targets a uniformly random living party member.
      bossClock += speed;
      let bDmg = 0;
      while (bossClock >= BASE_ATTACK_SPEED_SEC - 1e-9) {
        bossClock -= BASE_ATTACK_SPEED_SEC;
        if (mercenaries.length === 0) {
          if (rng() < bossChance) bDmg += rollInt(rng, bossMax);
        } else {
          const living = mercenaries.flatMap((_, i) => (mercHp[i] > 0 ? [i] : []));
          const t = rollInt(rng, living.length);
          if (t === 0) {
            if (rng() < bossChance) bDmg += rollInt(rng, bossMax);
          } else {
            const mi = living[t - 1];
            if (rng() < bossChanceVsMerc[mi]) mercHp[mi] = Math.max(0, mercHp[mi] - rollInt(rng, bossMax));
          }
        }
      }
      // Death is checked before eating, so food cannot revive a player at 0 HP.
      hp = Math.max(0, hp - bDmg);
      if (hp <= 0) {
        died = true;
        break;
      }
      hp = c.eat(hp, maxHp, bossMax);
    }
    frames++;
    maxFrameTicks = Math.max(maxFrameTicks, frameTicks);
  }

  // Time cap with both sides alive: the party wins if it would finish the boss's remaining HP
  // no later than the boss finishes the party's. Downed mercenaries add neither HP nor damage.
  if (!won && !died) {
    timedOut = true;
    frameTicks = 0;
    const mercDps = mercenaries.reduce(
      (sum, m, i) => (mercHp[i] > 0 ? sum + ((m.maxHit / 2) * mercChance[i]) / BASE_ATTACK_SPEED_SEC : sum),
      0,
    );
    const partyHpLeft = hp + mercHp.reduce((sum, h) => sum + Math.max(0, h), 0);
    const playerDps = ((maxHit / 2) * pChance) / speed + mercDps;
    const bossDps = ((bossMax / 2) * bossChance) / BASE_ATTACK_SPEED_SEC;
    won = playerDps > 0 && bossDps > 0 ? bossHp / playerDps <= partyHpLeft / bossDps : playerDps >= bossDps;
  }

  const items: Record<string, number> = {};
  const xp: Record<string, number> = {};
  const rewards = boss.xp_rewards ?? {};
  if (won) {
    const loot = boss.common_loot ?? {};
    items.coins = rollRange(rng, loot.coins_min ?? 0, loot.coins_max ?? 0);
    for (const [item, range] of Object.entries(loot.items ?? {})) items[item] = rollRange(rng, range.min, range.max);
    for (const rare of boss.rare_drops ?? []) {
      if (!target.blockedRareDrops.has(rare.item) && rng() < (rare.chance ?? 0)) add(items, rare.item, 1);
    }
    if (boss.pet && rng() < (boss.pet.chance ?? 0)) items[boss.pet.id] = 1;
    for (const [skill, v] of Object.entries(rewards)) xp[skill] = v;
  } else {
    for (const [skill, v] of Object.entries(rewards)) xp[skill] = Math.max(1, Math.floor(v * 0.1));
  }

  return {
    died,
    won,
    timedOut,
    frames,
    lastFrameTicks: frameTicks,
    maxFrameTicks,
    kills: won ? { [boss.id]: 1 } : {},
    xp,
    items,
    food: c.used.food,
    arrows: c.used.arrows,
    runes: c.used.runes,
  };
}
