import type { PlayerState } from '@/lib/save-source/types';
import type { CalculatorInputs, SessionResult } from '../types';
import { mining } from './mining';
import { woodcutting } from './woodcutting';
import { fishing } from './fishing';
import { thieving } from './thieving';
import { agility } from './agility';
import { smithing } from './smithing';
import { cooking } from './cooking';
import { fletching } from './fletching';
import { crafting } from './crafting';
import { construction } from './construction';
import { herblore } from './herblore';
import { firemaking } from './firemaking';
import { runecrafting } from './runecrafting';
import { farming } from './farming';

export {
  mining,
  woodcutting,
  fishing,
  thieving,
  agility,
  smithing,
  cooking,
  fletching,
  crafting,
  construction,
  herblore,
  firemaking,
  runecrafting,
  farming,
};
export { patchCountForLevel, totalPatchCount, hasCropRotationBonus } from './farming';

type SessionCalculator = (playerState: PlayerState, inputs: CalculatorInputs) => Promise<SessionResult>;

export const SESSION_CALCULATORS: Record<string, SessionCalculator> = {
  mining,
  woodcutting,
  fishing,
  thieving,
  agility,
  smithing,
  cooking,
  fletching,
  crafting,
  construction,
  herblore,
  firemaking,
  runecrafting,
  farming,
};
