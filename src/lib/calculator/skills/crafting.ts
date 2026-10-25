import type { PlayerState } from '@/lib/save-source/types';
import { craftSession } from './craft-session';
import type { CalculatorInputs, SessionResult } from '@/lib/calculator/types';

export const crafting = (playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> =>
  craftSession(playerState, inputs, 'crafting', 'crafting');
