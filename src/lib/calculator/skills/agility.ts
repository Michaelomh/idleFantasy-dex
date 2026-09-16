import type { PlayerState } from '@/lib/save-source/types';
import { getAgilityCourses } from '../game-data';
import { resolveModifiers, applyXpMultipliers, withBaseRow, toolEfficiencyRows } from '../modifiers';
import { binomialRange, SESSION_FRAMES } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

export async function agility(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const courses = await getAgilityCourses();
  const course = courses[inputs.targetKey];
  const req = course?.level_required ?? 1;
  const mods = await resolveModifiers(playerState, 'agility', inputs.timedBoostsEnabled, req);
  const levelDiff = mods.level - req;
  const levelBonusPct = levelDiff * 2;
  const success = Math.min(0.95, 0.8 + levelDiff * 0.02);

  const successBreakdown = [
    { label: 'Initial probability', value: '80.0%' },
    { label: 'Level difference (yours − course)', value: `${levelDiff >= 0 ? '+' : ''}${levelDiff}` },
    { label: 'Per-level bonus', value: '+2%/lvl' },
    { label: 'Level bonus (total)', value: `${levelBonusPct >= 0 ? '+' : ''}${levelBonusPct.toFixed(1)}%` },
    { label: 'Cap', value: '95.0%' },
  ];

  const lapsPerMinute = Math.max(1, Math.round(2 * mods.toolEff));
  const totalLaps = SESSION_FRAMES * lapsPerMinute;
  const xpPerSuccess = course?.xp_per_success ?? 0;
  const rawXp = totalLaps * success * xpPerSuccess;
  const baseXp = rawXp;
  const [lapsLow, lapsHigh] = binomialRange(Math.round(totalLaps), success, 0.1, 0.9);

  return {
    xp: {
      value: applyXpMultipliers(rawXp, mods),
      min: applyXpMultipliers(lapsLow * xpPerSuccess, mods),
      max: applyXpMultipliers(lapsHigh * xpPerSuccess, mods),
    },
    guaranteedItems: [],
    bonusItems: [],
    yieldBreakdown: [],
    xpBreakdown: withBaseRow('Base XP', baseXp, [...toolEfficiencyRows(mods, baseXp), ...mods.xpModifiers]),
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
    successBreakdown,
    successRate: success,
  };
}
