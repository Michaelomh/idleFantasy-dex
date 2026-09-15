import type { PlayerState } from '@/lib/save-source/types';
import { getLogEntries } from '../game-data';
import { humanize } from '@/lib/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { craftActionDuration } from '../session-duration';
import type { CalculatorInputs, SessionResult } from '../types';

const ASH_FOR_LOG: Record<string, string> = {
  log: 'ashes',
  oak_log: 'oak_ashes',
  willow_log: 'willow_ashes',
  maple_log: 'maple_ashes',
  yew_log: 'yew_ashes',
  magic_log: 'magic_ashes',
  redwood_log: 'redwood_ashes',
};

export async function firemaking(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [logs, mods] = await Promise.all([
    getLogEntries(),
    resolveModifiers(playerState, 'firemaking', inputs.timedBoostsEnabled),
  ]);

  const log = logs[inputs.targetKey];
  const qty = inputs.qty ?? 1;
  const xpPerLog = (log?.xp_per_log as number | undefined) ?? 0;
  const rawXp = xpPerLog * qty * mods.toolEff;
  const ashKey = ASH_FOR_LOG[inputs.targetKey] ?? 'ashes';
  const outputQty = applyYieldMultiplier(qty, mods);
  const { minutes: sessionMinutes, breakdown: sessionBreakdown } = craftActionDuration(
    qty,
    mods.sessionMinutes,
    mods.toolEff,
  );

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [{ key: ashKey, label: humanize(ashKey), qty: outputQty }],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base yield', qty, mods.yieldModifiers),
    xpBreakdown: withBaseRow('Base XP', xpPerLog * qty, [
      ...toolEfficiencyRows(mods, xpPerLog * qty),
      ...mods.xpModifiers,
    ]),
    sessionMinutes,
    sessionBreakdown,
  };
}
