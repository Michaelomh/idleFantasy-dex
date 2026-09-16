// Mainly used to track when there is a new field added to dashboard data that is hardcoded.
// e.g. characters races, titles and prestige nodes
export function warnOnDrift<T extends string>(
  label: string,
  value: T | '' | undefined,
  known: readonly string[],
): T | null {
  if (!value) return null;
  if (import.meta.env.DEV && !known.includes(value)) {
    console.warn(`[game-data-drift] unrecognized ${label}: "${value}" - the game may have added a new one.`);
  }
  return value;
}
