/**
 * A typed quantity, the way the calculator's Qty field reads it: a whole number within
 * [min, max], or null when empty or invalid (the input then shows its error state).
 */
export function parseQty(text: string, min = 1, max = Number.POSITIVE_INFINITY): number | null {
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}
