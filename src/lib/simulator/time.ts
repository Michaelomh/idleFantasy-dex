// Real-time length of a combat run. Ports SkillSimulator.sessionDurationMs /
// elderSessionDurationMs and CombatSimulator.deathAlarmOffsetMs / bossEndAlarmOffsetMs.
import { DUNGEON_FRAMES, TICKS_PER_FRAME, type RunResult } from './combat-engine';

const END_BUFFER_MS = 2_000;

export function mainlandSessionMs(agilityLevel: number, floorReductionMin: number, chronosMultiplier: number): number {
  const fraction = Math.min(98, Math.max(0, agilityLevel - 1)) / 98;
  const maxReduction = 20 + Math.min(10, Math.max(0, floorReductionMin));
  const minutes = (60 - maxReduction * fraction) * Math.min(1, Math.max(0.5, chronosMultiplier));
  return Math.max(60_000, Math.round(minutes * 60_000));
}

export function elderSessionMs(elderAgilityLevel: number): number {
  const fraction = Math.min(98, Math.max(0, elderAgilityLevel - 1)) / 98;
  return Math.max(45 * 60_000, Math.round((60 - 15 * fraction) * 60_000));
}

/** Offset of the deciding tick inside a partially recorded frame, plus the 2 s buffer. */
function partialEndMs(r: RunResult, frameMs: number): number {
  const tickMs = Math.max(1, Math.floor(frameMs / Math.max(TICKS_PER_FRAME, r.maxFrameTicks)));
  const lastFrameMs = r.lastFrameTicks > 0 ? Math.min(frameMs, r.lastFrameTicks * tickMs) : frameMs;
  return Math.max(0, r.frames - 1) * frameMs + lastFrameMs + END_BUFFER_MS;
}

/** A dungeon or tower run lasts the whole session unless the player dies. */
export function dungeonRunMs(r: RunResult, sessionMs: number): number {
  const frameMs = Math.floor(sessionMs / DUNGEON_FRAMES);
  return r.died ? partialEndMs(r, frameMs) : sessionMs;
}

/** A boss fight lasts `duration_minutes` frames, each one session-minute long, unless decided early. */
export function bossRunMs(r: RunResult, durationMinutes: number, sessionMs: number): number {
  const frameMs = Math.floor(sessionMs / DUNGEON_FRAMES);
  if (r.frames >= durationMinutes) return durationMinutes * frameMs;
  return partialEndMs(r, frameMs);
}
