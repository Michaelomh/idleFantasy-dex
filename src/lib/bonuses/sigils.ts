export function sigilMultiplier(flags: Record<string, unknown>, stoneId: string): number {
  const stones = Object.values((flags.embedded_sigils ?? {}) as Record<string, string>);
  return 1 + stones.filter((s) => s === stoneId).length * 0.05;
}
