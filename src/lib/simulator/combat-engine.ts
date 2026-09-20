export type CombatStyle = 'attack' | 'strength' | 'ranged' | 'magic';
export type MercCombatStyle = 'melee' | 'ranged' | 'magic';

const PLAYER_HIT_CHANCE_RANGE = [0.15, 0.95] as const;
const ENEMY_HIT_CHANCE_RANGE = [0.1, 0.95] as const;
const BOSS_ATTACK_SPEED_SEC = 2.4;
const FOOD_EAT_CAP = 300;
const RAID_FULL_PARTY = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hitChance(effAtk: number, defStat: number, range: readonly [number, number], scale = 1): number {
  const raw = effAtk > defStat ? 1 - defStat / (2 * effAtk) : effAtk / (2 * defStat);
  return clamp(raw * scale, range[0], range[1]);
}

export type PlayerCombatProfile = {
  style: CombatStyle;
  effAttack: number;
  effStrength: number;
  effRanged: number;
  effMagic: number;
  effDefence: number;
  weaponAttackBonus: number;
  weaponStrengthBonus: number;
  rangedAttackBonus: number;
  rangedStrengthBonus: number;
  magicAttackBonus: number;
  spellMaxHit: number;
  attackSpeedSec: number;
  doubleHitChance: number;
  secondChance: boolean;
  maxHp: number;
  foodHealAmount: number;
  foodEatThresholdPct: number;
};

export type BossCombatProfile = {
  hp: number;
  durationMinutes: number;
  attackLevel: number;
  attackBonus: number;
  strengthLevel: number;
  strengthBonus: number;
  attackDefense: number;
  strengthDefense: number;
  rangedDefense: number;
  magicDefense: number;
  raid?: boolean;
};

export type MercCombatant = {
  id: string;
  style: MercCombatStyle;
  effAttack: number;
  strengthLevel: number;
  strengthBonus: number;
  defenseLevel: number;
  hp: number;
};

export type FightResult = {
  won: boolean;
  timedOut: boolean;
  timeSeconds: number;
  foodEaten: number;
  playerHpRemaining: number;
};

export type Rng = () => number;

function rollHit(chance: number, rng: Rng): boolean {
  return rng() < chance;
}

function rollDamage(maxHit: number, rng: Rng): number {
  return Math.floor(rng() * (maxHit + 1));
}

function playerAccuracyInputs(p: PlayerCombatProfile, boss: BossCombatProfile): { effAtk: number; defStat: number } {
  switch (p.style) {
    case 'attack':
      return { effAtk: p.effAttack + p.weaponAttackBonus, defStat: boss.attackDefense };
    case 'strength':
      return { effAtk: p.effAttack + p.weaponAttackBonus, defStat: boss.strengthDefense };
    case 'ranged':
      return { effAtk: p.effRanged + p.rangedAttackBonus, defStat: boss.rangedDefense };
    case 'magic':
      return { effAtk: p.effMagic + p.magicAttackBonus, defStat: boss.magicDefense };
  }
}

function playerMaxHit(p: PlayerCombatProfile): number {
  if (p.style === 'magic') return Math.max(1, p.spellMaxHit);
  if (p.style === 'ranged') {
    const effStr = p.effRanged + p.rangedStrengthBonus;
    return Math.max(1, 1 + Math.floor((effStr * (p.rangedStrengthBonus + 64)) / 640));
  }
  const effStr = p.effStrength + p.weaponStrengthBonus;
  return Math.max(1, 1 + Math.floor((effStr * (p.weaponStrengthBonus + 64)) / 640));
}

function partyScaleFor(boss: BossCombatProfile, mercCount: number): number {
  return boss.raid ? RAID_FULL_PARTY / (1 + mercCount) : 1;
}

function bossMaxHit(boss: BossCombatProfile, partyScale: number): number {
  const effStr = boss.strengthLevel + boss.strengthBonus;
  if (effStr === 0) return 0;
  const base = Math.max(0, 1 + Math.floor((effStr * (boss.strengthBonus + 64)) / 640));
  return Math.round(base * partyScale);
}

function mercMaxHit(m: MercCombatant): number {
  const effStr = m.strengthLevel + m.strengthBonus;
  return Math.max(1, 1 + Math.floor((effStr * (m.strengthBonus + 64)) / 640));
}

function mercTargetedBossDefense(style: MercCombatStyle, boss: BossCombatProfile): number {
  if (style === 'ranged') return boss.rangedDefense;
  if (style === 'magic') return boss.magicDefense;
  return boss.attackDefense;
}

export function simulateFight(
  player: PlayerCombatProfile,
  boss: BossCombatProfile,
  rng: Rng,
  mercenaries: MercCombatant[] = [],
): FightResult {
  let playerHp = player.maxHp;
  let bossHp = boss.hp;
  let foodEaten = 0;
  let playerNextAttack = player.attackSpeedSec;
  let bossNextAttack = BOSS_ATTACK_SPEED_SEC;
  const cap = boss.durationMinutes * 60;

  const { effAtk: playerEffAtk, defStat: playerDefStat } = playerAccuracyInputs(player, boss);
  const playerChance = hitChance(playerEffAtk, playerDefStat, PLAYER_HIT_CHANCE_RANGE);
  const playerHit = playerMaxHit(player);

  const partyScale = partyScaleFor(boss, mercenaries.length);
  const bossEffAtk = boss.attackLevel + boss.attackBonus;
  const bossChanceVsPlayer = hitChance(bossEffAtk, player.effDefence, ENEMY_HIT_CHANCE_RANGE, partyScale);
  const bossHit = bossMaxHit(boss, partyScale);

  const mercHp = mercenaries.map((m) => m.hp * 10);
  const mercMaxHits = mercenaries.map(mercMaxHit);
  const mercHitChances = mercenaries.map((m) =>
    hitChance(m.effAttack, mercTargetedBossDefense(m.style, boss), ENEMY_HIT_CHANCE_RANGE),
  );
  const bossChanceVsMerc = mercenaries.map((m) =>
    hitChance(bossEffAtk, m.defenseLevel, ENEMY_HIT_CHANCE_RANGE, partyScale),
  );

  const foodThreshold = Math.max(player.maxHp * (player.foodEatThresholdPct / 100), bossHit);

  function eatFoodIfNeeded() {
    while (playerHp > 0 && playerHp <= foodThreshold && foodEaten < FOOD_EAT_CAP && player.foodHealAmount > 0) {
      playerHp = Math.min(player.maxHp, playerHp + player.foodHealAmount);
      foodEaten += 1;
    }
  }

  let time = 0;
  while (playerHp > 0 && bossHp > 0) {
    const nextEvent = Math.min(playerNextAttack, bossNextAttack);
    if (nextEvent > cap) {
      time = cap;
      break;
    }
    time = nextEvent;

    if (playerNextAttack <= bossNextAttack) {
      let landed = rollHit(playerChance, rng);
      if (!landed && player.secondChance) {
        landed = rollHit(playerChance, rng);
      }
      if (landed) {
        bossHp -= rollDamage(playerHit, rng);
        if (bossHp > 0 && player.doubleHitChance > 0 && rng() < player.doubleHitChance && rollHit(playerChance, rng)) {
          bossHp -= rollDamage(playerHit, rng);
        }
      }
      playerNextAttack += player.attackSpeedSec;
    } else {
      for (let i = 0; i < mercenaries.length; i++) {
        if (mercHp[i] <= 0) continue;
        if (rollHit(mercHitChances[i], rng)) bossHp -= rollDamage(mercMaxHits[i], rng);
      }

      if (bossHp > 0) {
        const livingMercIdx = mercHp.flatMap((hp, i) => (hp > 0 ? [i] : []));
        const targetRoll = Math.floor(rng() * (1 + livingMercIdx.length));
        if (targetRoll === 0) {
          if (rollHit(bossChanceVsPlayer, rng)) playerHp -= rollDamage(bossHit, rng);
          eatFoodIfNeeded();
        } else {
          const mi = livingMercIdx[targetRoll - 1];
          if (rollHit(bossChanceVsMerc[mi], rng)) mercHp[mi] = Math.max(0, mercHp[mi] - rollDamage(bossHit, rng));
        }
      }
      bossNextAttack += BOSS_ATTACK_SPEED_SEC;
    }
  }

  if (playerHp <= 0) {
    return { won: false, timedOut: false, timeSeconds: time, foodEaten, playerHpRemaining: 0 };
  }
  if (bossHp <= 0) {
    return { won: true, timedOut: false, timeSeconds: time, foodEaten, playerHpRemaining: playerHp };
  }

  const mercDps = mercenaries.reduce(
    (sum, _, i) => sum + ((mercMaxHits[i] / 2) * mercHitChances[i]) / BOSS_ATTACK_SPEED_SEC,
    0,
  );
  const partyHp = player.maxHp + mercenaries.reduce((sum, m) => sum + m.hp * 10, 0);
  const playerDps = ((playerHit / 2) * playerChance) / player.attackSpeedSec + mercDps;
  const bossDps = ((bossHit / 2) * bossChanceVsPlayer) / BOSS_ATTACK_SPEED_SEC;
  const won = playerDps > 0 && bossDps > 0 ? boss.hp / playerDps <= partyHp / bossDps : playerDps >= bossDps;
  return { won, timedOut: true, timeSeconds: cap, foodEaten, playerHpRemaining: playerHp };
}
