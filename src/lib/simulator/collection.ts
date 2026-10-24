// What a finished run actually pays out. Ports HomeViewModel.collectDungeonSession /
// collectBossSession, TowerViewModel.collectFloor and PlayerRepository.applyMultiSkillResults /
// applyElderMultiSkillResults (game 1.16.0, 37317af).
import type { RunResult } from './combat-engine';
import type { Rng } from './rng';

export type CollectionKind = 'dungeon' | 'boss' | 'tower';

export type CollectionContext = {
  kind: CollectionKind;
  isle: boolean;
  ironman: boolean;
  capeMult: Record<string, number>;
  deathKeep: number;
  xpMult: Record<string, number>;
  bossPetPct: Record<string, number>;
  elderLevels: Record<string, number>;
  coinMult: number;
  sigils: { xp: number; coin: number; loot: number; essence: number; sigil: number; bone: number };
  towerXpMult: number;
  towerCoinMult: number;
  arrowReclaim: number;
  runeReclaim: number;
};

export type CollectedRun = {
  xp: Record<string, number>;
  items: Record<string, number>;
  coins: number;
  arrowsReclaimed: Record<string, number>;
  runesReclaimed: number;
};

/** Mirrors the game's `reclaimChance(level) + prestige bonus`, capped at 95%. */
export function reclaimFraction(level: number, bonus: number): number {
  return Math.min(0.95, 0.25 + ((level - 1) / 98) * 0.5 + bonus);
}

function sigilScaled(items: Record<string, number>, s: CollectionContext['sigils'], rng: Rng) {
  const out: Record<string, number> = {};
  for (const [k, qty] of Object.entries(items)) {
    const m =
      k === 'elder_essence' ? s.essence : k === 'ancient_sigil' ? s.sigil : k === 'elder_bone' ? s.bone : s.loot;
    if (m === 1) {
      out[k] = qty;
      continue;
    }
    const scaled = qty * m;
    const whole = Math.floor(scaled);
    out[k] = Math.max(qty, whole + (rng() < scaled - whole ? 1 : 0));
  }
  return out;
}

export function isleXpMultiplier(elderLevel: number, sapphire: number): number {
  return (1 + (Math.max(1, elderLevel) - 1) * 0.05) * sapphire;
}

/**
 * [coinSoftCap] is the mainland boss daily cap for this win: 1 for the first
 * BOSS_FULL_COIN_KILLS_PER_DAY wins of a boss per game day, then BOSS_COIN_SOFT_CAP_MULT.
 */
export function collectRun(r: RunResult, ctx: CollectionContext, rng: Rng, coinSoftCap = 1): CollectedRun {
  const xp: Record<string, number> = {};
  let items: Record<string, number> = { ...r.items };

  if (ctx.isle) {
    // Isle: elder level × sapphire on XP, sigil stones on loot, ruby on coins. No death penalty.
    for (const [skill, v] of Object.entries(r.xp)) {
      xp[skill] = Math.floor(v * isleXpMultiplier(ctx.elderLevels[skill] ?? 1, ctx.sigils.xp));
    }
    const coins = items.coins ?? 0;
    delete items.coins;
    items = sigilScaled(items, ctx.sigils, rng);
    return { xp, items, coins: Math.floor(coins * ctx.sigils.coin), ...reclaim(r, ctx) };
  }

  const raw: Record<string, number> = {};
  for (const [skill, v] of Object.entries(r.xp)) {
    // Tower collection skips the cape multiplier.
    const cape = ctx.kind === 'tower' ? 1 : (ctx.capeMult[skill] ?? 1);
    raw[skill] = cape > 1 ? Math.floor(v * cape) : v;
  }
  if (r.died && ctx.kind !== 'boss') {
    for (const skill of Object.keys(raw)) raw[skill] = Math.max(1, Math.floor(raw[skill] * ctx.deathKeep));
    for (const [k, qty] of Object.entries(items)) {
      const kept = Math.floor(qty * ctx.deathKeep);
      if (kept > 0) items[k] = kept;
      else delete items[k];
    }
  }

  let coins = items.coins ?? 0;
  delete items.coins;

  for (const [skill, v] of Object.entries(raw)) {
    let base = ctx.kind === 'tower' ? Math.floor(v * ctx.towerXpMult) : v;
    const petPct = ctx.kind === 'boss' && !ctx.ironman ? (ctx.bossPetPct[skill] ?? 0) : 0;
    if (petPct > 0) base = Math.floor(base * (1 + petPct / 100));
    xp[skill] = Math.floor(base * (ctx.xpMult[skill] ?? 1) * ctx.sigils.xp);
  }

  if (ctx.kind === 'tower') coins = Math.floor(coins * ctx.towerCoinMult);
  if (ctx.kind === 'boss') coins = Math.floor(coins * coinSoftCap);
  coins = Math.floor(Math.fround(coins * ctx.coinMult) * ctx.sigils.coin);
  items = sigilScaled(items, ctx.sigils, rng);
  return { xp, items, coins, ...reclaim(r, ctx) };
}

function reclaim(r: RunResult, ctx: CollectionContext) {
  const arrowsReclaimed: Record<string, number> = {};
  for (const [k, used] of Object.entries(r.arrows)) {
    const back = Math.floor(used * ctx.arrowReclaim);
    if (back > 0) arrowsReclaimed[k] = back;
  }
  return { arrowsReclaimed, runesReclaimed: Math.floor(r.runes * ctx.runeReclaim) };
}

export const BOSS_FULL_COIN_KILLS_PER_DAY = 3;
export const BOSS_COIN_SOFT_CAP_MULT = 0.25;
