import {
  simulateFight,
  type BossCombatProfile,
  type FightResult,
  type MercCombatant,
  type PlayerCombatProfile,
} from './combat-engine';

export type StatRange = { mean: number; p5: number; p95: number };

export type SimulationSummary = {
  runs: number;
  successCount: number;
  successRate: number;
  timeToKillSeconds: StatRange | null;
  foodEaten: StatRange;
};

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.round((p / 100) * (sortedAsc.length - 1))));
  return sortedAsc[idx];
}

function summarize(values: number[]): StatRange {
  if (values.length === 0) return { mean: 0, p5: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { mean, p5: percentile(sorted, 5), p95: percentile(sorted, 95) };
}

export function runSimulation(
  player: PlayerCombatProfile,
  boss: BossCombatProfile,
  runs: number,
  mercenaries: MercCombatant[] = [],
): SimulationSummary {
  const results: FightResult[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(simulateFight(player, boss, Math.random, mercenaries));
  }
  const wins = results.filter((r) => r.won);

  return {
    runs,
    successCount: wins.length,
    successRate: wins.length / runs,
    timeToKillSeconds: wins.length > 0 ? summarize(wins.map((r) => r.timeSeconds)) : null,
    foodEaten: summarize(results.map((r) => r.foodEaten)),
  };
}
