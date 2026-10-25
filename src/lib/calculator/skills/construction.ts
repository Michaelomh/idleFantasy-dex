import type { PlayerState } from '@/lib/save-source/types';
import { craftSession } from './craft-session';
import type { CalculatorInputs, SessionResult } from '@/lib/calculator/types';

export const construction = (playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> =>
  craftSession(playerState, inputs, 'construction', 'construction');
