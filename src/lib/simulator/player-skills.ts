import type { PlayerState } from '@/lib/save-source/types';

export function getSkillLevel(playerState: PlayerState, skill: string): number {
  return playerState.raw.skillLevels[skill] ?? 0;
}
