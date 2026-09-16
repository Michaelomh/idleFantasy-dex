import type { PlayerState } from '@/lib/save-source/types';
import { getTrees } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
import {
  resolveModifiers,
  applyXpMultipliers,
  applyYieldMultiplier,
  withBaseRow,
  toolEfficiencyRows,
} from '../modifiers';
import { gatheringFrameXpTotal, SESSION_FRAMES } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

export async function woodcutting(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const trees = await getTrees();
  const tree = trees[inputs.targetKey];
  const mods = await resolveModifiers(
    playerState,
    'woodcutting',
    inputs.timedBoostsEnabled,
    (tree?.level_required as number | undefined) ?? 0,
  );
  const xpPerLog = tree?.xp_per_log ?? 0;
  const rawUnits = SESSION_FRAMES * mods.toolEff * mods.toolEffMultiplier;
  const rawXp = gatheringFrameXpTotal(xpPerLog, mods.toolEff * mods.toolEffMultiplier, mods.petBoostPct);
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
    yieldBreakdown: withBaseRow('Base Yield', SESSION_FRAMES, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES),
      ...mods.yieldModifiers,
    ]),
    xpBreakdown: withBaseRow('Base XP', SESSION_FRAMES * xpPerLog, [
      ...toolEfficiencyRows(mods, SESSION_FRAMES * xpPerLog),
      ...(mods.petBoostPct > 0
        ? [
            {
              label: 'Pet XP Boost',
              value: `+${mods.petBoostPct}%`,
              info: `This can be higher due to your prestige skill tree${mods.petBoostNodeLabel ? ` (${mods.petBoostNodeLabel})` : ''}.`,
            },
          ]
        : []),
      ...mods.xpModifiers,
    ]),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
  };
}
