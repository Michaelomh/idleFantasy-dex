import type { PlayerState } from '@/lib/save-source/types';
import { getAgilityCourses } from '../game-data';
import { resolveModifiers, applyXpMultipliers } from '../modifiers';
import { binomialRange, binomialPmf, SESSION_FRAMES } from '../frame-roll';
import type { CalculatorInputs, SessionResult, ModifierRow } from '../types';
import { formatNumber } from '@/lib/utils/format-number';

function agilityLapsPerMinute(toolEff: number): number {
  return Math.max(1, Math.round(2 * toolEff));
}

function lapsPerMinuteRows(toolEff: number, totalLaps: number): ModifierRow[] {
  const rows: ModifierRow[] = [];
  if (toolEff !== 1) {
    rows.push({
      label: 'Grappling Hook Efficiency',
      value: `x${toolEff.toFixed(2)}`,
      info: 'A high-tier tool used on a low-level course gets a bonus: +25% efficiency for each tier bracket the tool is above the course, on top of the tool’s own base efficiency stat.',
    });
  }
  rows.push({
    label: 'Total Laps',
    value: `${Math.round(totalLaps).toLocaleString()}`,
  });
  return rows;
}

export async function agility(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const courses = await getAgilityCourses();
  const course = courses[inputs.targetKey];
  const req = course?.level_required ?? 1;
  const mods = await resolveModifiers(playerState, 'agility', inputs.timedBoostsEnabled, req);
  const levelDiff = mods.level - req;
  const levelBonusPct = levelDiff * 2;
  const success = Math.min(0.95, 0.8 + levelDiff * 0.02);
  const uncappedSuccessPct = 80 + levelBonusPct;

  const successBreakdown = [
    { label: 'Initial probability', value: '80%' },
    { label: 'Level difference (yours - course)', value: `${levelDiff} (${mods.level} - ${req})` },
    {
      label: 'Per-level bonus',
      value: `+2% / lvl (${levelBonusPct >= 0 ? '+' : ''}${levelBonusPct.toFixed(0)}%)`,
    },
    { label: 'Final probability', value: `${uncappedSuccessPct.toFixed(0)}%` },
    { label: 'Cap', value: '95%' },
  ];

  const lapsPerMinute = agilityLapsPerMinute(mods.toolEff);
  const totalLaps = SESSION_FRAMES * lapsPerMinute;
  const xpPerSuccess = course?.xp_per_success ?? 0;
  const baseXp = totalLaps * success * xpPerSuccess;

  const petMult = 1 + mods.petBoostPct / 100;
  let expectedFrameXp = 0;
  for (let k = 0; k <= lapsPerMinute; k++) {
    expectedFrameXp += binomialPmf(lapsPerMinute, k, success) * Math.floor(k * xpPerSuccess * petMult);
  }
  const rawXp = expectedFrameXp * SESSION_FRAMES;
  const [lapsLow, lapsHigh] = binomialRange(Math.round(totalLaps), success);
  const baseXpLow = lapsLow * xpPerSuccess;
  const baseXpHigh = lapsHigh * xpPerSuccess;

  return {
    xp: {
      value: applyXpMultipliers(rawXp, mods),
      min: applyXpMultipliers(lapsLow * xpPerSuccess * petMult, mods),
      max: applyXpMultipliers(lapsHigh * xpPerSuccess * petMult, mods),
    },
    guaranteedItems: [],
    bonusItems: [],
    yieldBreakdown: [],
    xpBreakdown: [
      ...lapsPerMinuteRows(mods.toolEff, totalLaps),
      {
        label: 'Base XP range',
        value: `${formatNumber(baseXp)} (${formatNumber(baseXpLow)} - ${formatNumber(baseXpHigh)})`,
      },
      ...(mods.petBoostPct > 0
        ? [
            {
              label: 'Pet XP Boost',
              value: `+${mods.petBoostPct}%`,
            },
          ]
        : []),
      ...mods.xpModifiers,
    ],
    sessionMinutes: mods.sessionMinutes,
    sessionBreakdown: mods.sessionBreakdown,
    successBreakdown,
    successRate: success,
  };
}
