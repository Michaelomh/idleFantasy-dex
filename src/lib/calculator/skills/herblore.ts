import type { PlayerState } from '@/lib/save-source/types';
import { craftSession } from './craft-session';
import type { CalculatorInputs, SessionResult } from '../types';

export const herblore = (playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> =>
  craftSession(playerState, inputs, 'herblore', 'herblore');
