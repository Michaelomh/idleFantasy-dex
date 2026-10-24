import {
  simulateBoss,
  simulateDungeon,
  type BossTarget,
  type DungeonTarget,
  type EngineInputs,
  type FoodStack,
  type RunResult,
} from './combat-engine';
import {
  BOSS_COIN_SOFT_CAP_MULT,
  BOSS_FULL_COIN_KILLS_PER_DAY,
  collectRun,
  type CollectionContext,
} from './collection';
import { seededRng } from './rng';
import { bossRunMs, dungeonRunMs } from './time';

export type EatOrder = 'descending' | 'ascending' | 'least_quantity' | (string & {});

/** Everything one simulation needs, as plain data so it can be posted to a worker. */
export type SimulationJob = {
  kind: 'dungeon' | 'boss' | 'tower';
  inputs: EngineInputs;
  /** A selected potion is drunk at the start of the run. */
  usesPotion: boolean;
  eatOrder: EatOrder;
  /** Dungeon, or the tower floor being fought. */
  dungeon?: DungeonTarget;
  boss?: BossTarget;
  collection: CollectionContext;
  sessionMs: number;
  samples: number;
  seed: number;
  /** Mainland boss wins already counted today for the daily coin soft cap. */
  bossWinsToday: number;
};

export type StatRange = { mean: number; p5: number; p95: number };
export type ItemStat = StatRange & { pAny: number };

export type SimulationSummary = {
  samples: number;
  /** Boss: won the fight. Dungeon and tower: survived the run. */
  successRate: number;
  deathRate: number;
  timeoutRate: number;
  minutes: StatRange;
  xp: Record<string, StatRange>;
  xpTotal: StatRange;
  kills: Record<string, StatRange>;
  items: Record<string, ItemStat>;
  coins: StatRange;
  food: Record<string, number>;
  arrows: Record<string, number>;
  arrowsReclaimed: Record<string, number>;
  runes: number;
  runesReclaimed: number;
  potions: number;
};

const addAll = (into: Record<string, number>, from: Record<string, number>) => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
};

/** Per-key range over runs; a run without the key counts as 0. */
function rangesByKey(runs: Record<string, number>[]): Record<string, StatRange & { pAny: number }> {
  const keys = new Set(runs.flatMap((r) => Object.keys(r)));
  return Object.fromEntries(
    [...keys].map((k) => {
      const values = runs.map((r) => r[k] ?? 0);
      return [k, { ...range(values), pAny: values.filter((v) => v > 0).length / Math.max(1, runs.length) }];
    }),
  );
}

function range(values: number[]): StatRange {
  if (values.length === 0) return { mean: 0, p5: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.round((p / 100) * (sorted.length - 1)))];
  return { mean: values.reduce((a, b) => a + b, 0) / values.length, p5: at(5), p95: at(95) };
}

/** Game's eat order: sort the food stacks with supply left, stable over the cooking-recipe order. */
export function orderFood(food: FoodStack[], order: EatOrder): FoodStack[] {
  const stocked = food.filter((f) => f.qty > 0);
  const key = (f: FoodStack) =>
    order === 'descending' ? -f.heal : order === 'ascending' ? f.heal : order === 'least_quantity' ? f.qty : 0;
  return stocked
    .map((f, i) => ({ f, i }))
    .sort((a, b) => key(a.f) - key(b.f) || a.i - b.i)
    .map(({ f }) => f);
}

export function runSimulation(job: SimulationJob): SimulationSummary {
  const rng = seededRng(job.seed);
  const inputs: EngineInputs = { ...job.inputs, food: orderFood(job.inputs.food, job.eatOrder) };
  const softCap = job.bossWinsToday >= BOSS_FULL_COIN_KILLS_PER_DAY ? BOSS_COIN_SOFT_CAP_MULT : 1;

  const minutes: number[] = [];
  const xpTotals: number[] = [];
  const xpRuns: Record<string, number>[] = [];
  const itemRuns: Record<string, number>[] = [];
  const coinRuns: number[] = [];
  const killRuns: Record<string, number>[] = [];
  const food: Record<string, number> = {};
  const arrows: Record<string, number> = {};
  const arrowsReclaimed: Record<string, number> = {};
  let runes = 0;
  let runesReclaimed = 0;
  let successes = 0;
  let deaths = 0;
  let timeouts = 0;

  for (let s = 0; s < job.samples; s++) {
    const r: RunResult =
      job.kind === 'boss' ? simulateBoss(inputs, job.boss!, rng) : simulateDungeon(inputs, job.dungeon!, rng);
    const c = collectRun(r, job.collection, rng, softCap);
    minutes.push(
      (job.kind === 'boss'
        ? bossRunMs(r, job.boss!.boss.duration_minutes ?? 0, job.sessionMs)
        : dungeonRunMs(r, job.sessionMs)) / 60_000,
    );
    xpTotals.push(Object.values(c.xp).reduce((a, b) => a + b, 0));
    xpRuns.push(c.xp);
    itemRuns.push(c.items);
    coinRuns.push(c.coins);
    killRuns.push(r.kills);
    addAll(food, r.food);
    addAll(arrows, r.arrows);
    addAll(arrowsReclaimed, c.arrowsReclaimed);
    runes += r.runes;
    runesReclaimed += c.runesReclaimed;
    if (r.died) deaths++;
    if (r.timedOut) timeouts++;
    if (job.kind === 'boss' ? r.won : !r.died) successes++;
  }

  const n = Math.max(1, job.samples);
  const avg = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v / n]));
  return {
    samples: job.samples,
    successRate: successes / n,
    deathRate: deaths / n,
    timeoutRate: timeouts / n,
    minutes: range(minutes),
    xp: Object.fromEntries(Object.entries(rangesByKey(xpRuns)).map(([k, { mean, p5, p95 }]) => [k, { mean, p5, p95 }])),
    xpTotal: range(xpTotals),
    kills: Object.fromEntries(
      Object.entries(rangesByKey(killRuns)).map(([k, { mean, p5, p95 }]) => [k, { mean, p5, p95 }]),
    ),
    items: rangesByKey(itemRuns),
    coins: range(coinRuns),
    food: avg(food),
    arrows: avg(arrows),
    arrowsReclaimed: avg(arrowsReclaimed),
    runes: runes / n,
    runesReclaimed: runesReclaimed / n,
    potions: job.usesPotion ? 1 : 0,
  };
}
