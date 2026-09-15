import type { PlayerState } from '@/lib/save-source/types';
import { getTrees } from '../game-data';
import { humanize } from '@/lib/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { SESSION_FRAMES } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

export async function woodcutting(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [trees, mods] = await Promise.all([
    getTrees(),
    resolveModifiers(playerState, 'woodcutting', inputs.timedBoostsEnabled),
  ]);

  const tree = trees[inputs.targetKey];
  const xpPerLog = tree?.xp_per_log ?? 0;
  const rawUnits = SESSION_FRAMES * mods.toolEff * mods.toolEffMultiplier;
  const rawXp = rawUnits * xpPerLog;
  const guaranteedQty = applyYieldMultiplier(rawUnits, mods);

  return {
    xp: { value: applyXpMultipliers(rawXp, mods) },
    guaranteedItems: [
      {
        key: tree?.log_name ?? inputs.targetKey,
        label: tree?.log_display_name ?? humanize(inputs.targetKey),
        qty: guaranteedQty,
      },
    ],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base yield', SESSION_FRAMES, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES),
      ...mods.yieldModifiers,
    ]),
    xpBreakdown: withBaseRow('Base XP', SESSION_FRAMES * xpPerLog, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * xpPerLog),
      ...mods.xpModifiers,
    ]),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
  };
}
