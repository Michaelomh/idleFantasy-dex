import type { PlayerState } from './types';

const SLOT_TOKEN_RE = /fantasyidler_(?:auto|save)_(\d+)_/;
const EMPTY_SLOT_THRESHOLD = 3;

export function slotIdentity(character: string | null, fileName: string): string {
  if (character) return character;
  const match = SLOT_TOKEN_RE.exec(fileName);
  if (match) return `slot:${match[1]}`;
  return 'unidentified';
}

export function isEmptySlot(playerState: PlayerState): boolean {
  if (playerState.character) return false;
  const signal = playerState.questsCompleted + playerState.enemiesKilled + playerState.seenItems;
  return signal < EMPTY_SLOT_THRESHOLD;
}
