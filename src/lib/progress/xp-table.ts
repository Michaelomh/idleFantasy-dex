function buildTable(): number[] {
  const table = new Array<number>(100).fill(0);
  let accumulator = 0;
  for (let k = 1; k <= 98; k++) {
    accumulator += Math.floor(k + 300 * 2 ** (k / 7));
    table[k + 1] = Math.floor(accumulator / 4);
  }
  return table;
}

const XP_REQUIREMENTS = buildTable();

export function xpForLevel(level: number): number {
  return XP_REQUIREMENTS[Math.min(99, Math.max(1, level))];
}

export const MAX_ITEM_LEVEL_XP = xpForLevel(99);
