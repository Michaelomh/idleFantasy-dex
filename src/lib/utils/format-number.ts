const UNITS: [number, string][] = [
  [1_000_000_000, 'B'],
  [1_000_000, 'M'],
  [1_000, 'K'],
];

/** Compact form above 1000 (e.g. "1.2K", "3.4M"); plain integer below. */
export function formatNumber(n: number, decimals = 1): string {
  if (Math.abs(n) < 1000) return n.toLocaleString();
  const [divisor, suffix] = UNITS.find(([threshold]) => Math.abs(n) >= threshold) ?? UNITS[UNITS.length - 1];
  const fixed = (n / divisor).toFixed(decimals);
  return `${decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed}${suffix}`;
}
