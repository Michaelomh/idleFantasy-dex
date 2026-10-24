// Infinite Tower floors. Hand-copied from the game's simulator/TowerScaling.kt (game 1.16.0,
// 37317af): the tiers are Kotlin constants, not in any vendored JSON. Per the "game-sourced
// closed sets can drift" convention in CLAUDE.md, re-check this file on every game sync.
import type { EnemyEntry } from '@/lib/progress/game-data';
import type { DungeonTarget } from './combat-engine';

export const TOWER_FLOOR_TIERS: { from: number; to: number; spawns: { key: string; weight: number }[] }[] = [
  {
    from: 1,
    to: 20,
    spawns: [
      { key: 'goblin', weight: 40 },
      { key: 'skeleton', weight: 30 },
      { key: 'zombie', weight: 30 },
    ],
  },
  {
    from: 21,
    to: 40,
    spawns: [
      { key: 'orc_warrior', weight: 40 },
      { key: 'dark_wizard', weight: 30 },
      { key: 'bandit', weight: 30 },
    ],
  },
  {
    from: 41,
    to: 60,
    spawns: [
      { key: 'cave_troll', weight: 35 },
      { key: 'shadow_beast', weight: 35 },
      { key: 'demon', weight: 30 },
    ],
  },
  {
    from: 61,
    to: 80,
    spawns: [
      { key: 'forge_demon', weight: 35 },
      { key: 'shadow_assassin', weight: 35 },
      { key: 'abyssal_leech', weight: 30 },
    ],
  },
  {
    from: 81,
    to: 100,
    spawns: [
      { key: 'void_stalker', weight: 35 },
      { key: 'void_guardian', weight: 35 },
      { key: 'abyssal_lord', weight: 30 },
    ],
  },
  {
    from: 101,
    to: Number.POSITIVE_INFINITY,
    spawns: [
      { key: 'void_archon', weight: 35 },
      { key: 'eternal_sentinel', weight: 35 },
      { key: 'abyssal_lord', weight: 30 },
    ],
  },
];

/** Death sends you back to the last multiple of this below your best floor. */
export const TOWER_CHECKPOINT_INTERVAL = 25;

export function towerTierFor(floor: number) {
  return (
    TOWER_FLOOR_TIERS.find((t) => floor >= t.from && floor <= t.to) ?? TOWER_FLOOR_TIERS[TOWER_FLOOR_TIERS.length - 1]
  );
}

/** 0 up to floor 100, ramping to 1 at floor 250. Kotlin Float. */
function scalingProgress(floor: number): number {
  return floor <= 100 ? 0 : Math.fround((Math.min(250, Math.max(101, floor)) - 100) / 150);
}

export function towerHpMult(floor: number): number {
  return Math.fround(1 + Math.fround(scalingProgress(floor) * 9));
}

export function towerStatMult(floor: number): number {
  return Math.fround(1 + Math.fround(scalingProgress(floor) * 0.3));
}

/** TowerScaling.scaledEnemies: past floor 100, HP grows toward 10x and attack/defence toward +30%. */
export function scaledTowerEnemy(enemy: EnemyEntry, floor: number): EnemyEntry {
  if (floor <= 100) return enemy;
  const hp = towerHpMult(floor);
  const stat = towerStatMult(floor);
  const s = (v: number) => Math.trunc(Math.fround(v * stat));
  const cs = enemy.combat_stats;
  const ds = enemy.defensive_stats;
  return {
    ...enemy,
    hp: Math.max(1, Math.trunc(Math.fround(enemy.hp * hp))),
    combat_stats: { ...cs, attack_bonus: s(cs.attack_bonus), strength_bonus: s(cs.strength_bonus) },
    defensive_stats: {
      attack_defense: s(ds.attack_defense),
      strength_defense: s(ds.strength_defense),
      ranged_defense: s(ds.ranged_defense),
      magic_defense: s(ds.magic_defense),
    },
  };
}

export function towerFloorTarget(floor: number, enemies: Record<string, EnemyEntry>): DungeonTarget {
  const tier = towerTierFor(floor);
  const scaled: Record<string, EnemyEntry> = {};
  for (const { key } of tier.spawns) if (enemies[key]) scaled[key] = scaledTowerEnemy(enemies[key], floor);
  return { spawns: tier.spawns, enemies: scaled, safeZone: false, rareDrops: [] };
}

export function towerCheckpoint(bestFloor: number): number {
  return Math.floor(bestFloor / TOWER_CHECKPOINT_INTERVAL) * TOWER_CHECKPOINT_INTERVAL;
}
