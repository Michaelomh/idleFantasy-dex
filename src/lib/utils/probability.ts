/** `lowerPct`-`upperPct` percentile outcome count for `n` independent Bernoulli(p) trials - a
 *  typical per-Session range, not the absolute (always [0, n]) min/max. Computed from the
 *  exact Binomial CDF via the standard pmf(k+1) = pmf(k) x (n-k)/(k+1) x p/(1-p) recurrence. */
export function binomialRange(n: number, p: number, lowerPct = 0.05, upperPct = 0.95): [number, number] {
  if (p <= 0 || n <= 0) return [0, 0];
  if (p >= 1) return [n, n];

  const logRatio = Math.log(p / (1 - p));
  let logPmf = n * Math.log(1 - p);
  let cumulative = 0;
  let low = 0;
  let high = n;
  let foundLow = false;
  for (let k = 0; k <= n; k++) {
    cumulative += Math.exp(logPmf);
    if (!foundLow && cumulative >= lowerPct) {
      low = k;
      foundLow = true;
    }
    if (cumulative >= upperPct) {
      high = k;
      break;
    }
    logPmf += Math.log((n - k) / (k + 1)) + logRatio;
  }
  return [low, high];
}

export function binomialPmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  let logCoeff = 0;
  for (let i = 0; i < k; i++) logCoeff += Math.log(n - i) - Math.log(i + 1);
  return Math.exp(logCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** True min/max for `count` independent direct rolls in [min,max], each scaled and rounded
 *  individually then summed - unlike the binomial-based ranges above, farming harvests aren't
 *  a success/fail chain to take a percentile window of, they're a flat uniform roll every time,
 *  so the absolute extremes *are* the meaningful range. */
export function rollSumRange(min: number, max: number, mult: number, count: number): [number, number] {
  if (count <= 0 || max < min) return [0, 0];
  return [Math.round(min * mult) * count, Math.round(max * mult) * count];
}

/** Expectation, P(≥1), and typical (5th-95th percentile) count range for `frames` independent
 *  Bernoulli(p) rolls - never sampled. */
export function expectedAndChance(
  frames: number,
  p: number,
): { expected: number; chanceAtLeastOne: number; rangeMin: number; rangeMax: number } {
  if (p <= 0) return { expected: 0, chanceAtLeastOne: 0, rangeMin: 0, rangeMax: 0 };
  const [rangeMin, rangeMax] = binomialRange(frames, p);
  return { expected: frames * p, chanceAtLeastOne: 1 - Math.pow(1 - p, frames), rangeMin, rangeMax };
}
