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
