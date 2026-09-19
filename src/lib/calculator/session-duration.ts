import type { PlayerState } from '@/lib/save-source/types';
import { getBuildings, getPrestigePaths } from '@/lib/progress/game-data';
import { activeNodesForSkill, effectTotal } from '@/lib/bonuses/prestige';
import { formatMinSec } from '@/lib/utils/duration';
import type { ModifierRow } from './types';

export type SessionLength = { minutes: number; breakdown: ModifierRow[] };

async function chronosMultiplier(playerState: PlayerState): Promise<{ mult: number; tierCount: number }> {
  const buildings = await getBuildings();
  const chronosSpire = buildings.chronos_spire;
  if (!chronosSpire) return { mult: 1, tierCount: 0 };

  const tierCount =
    ((playerState.raw.flags.town_building_tiers as Record<string, number> | undefined) ?? {}).chronos_spire ?? 0;
  const currentTier = chronosSpire.tiers[Math.min(tierCount, chronosSpire.tiers.length) - 1] as
    { bonuses?: Record<string, number> } | undefined;
  const reduction = currentTier?.bonuses?.player_session_speed_reduction ?? 0;
  return { mult: Math.max(0.5, 1 - reduction), tierCount };
}

export async function sessionLength(playerState: PlayerState): Promise<SessionLength> {
  const trees = await getPrestigePaths();
  const agilityTree = trees.find((t) => t.skill === 'agility');
  const agilityNodes = activeNodesForSkill(playerState, agilityTree);
  const sessionFloorMin = Math.min(effectTotal(agilityNodes, 'session_floor_min'), 10);

  const agilityLevel = playerState.raw.skillLevels.agility ?? 1;
  const { mult: chronosMult, tierCount } = await chronosMultiplier(playerState);

  const baseMinutes = 60;
  const preChronos = baseMinutes - (20 + sessionFloorMin) * ((agilityLevel - 1) / 98);
  const minutes = preChronos * chronosMult;
  const agilityReduction = baseMinutes - preChronos;

  const breakdown: ModifierRow[] = [{ label: 'Base session length', value: formatMinSec(baseMinutes) }];
  if (agilityReduction > 0) {
    breakdown.push({
      label: `Agility Level (${agilityLevel}) + Endurance Floor (${sessionFloorMin} min)`,
      value: `-${formatMinSec(agilityReduction)}`,
    });
  }
  if (chronosMult !== 1) {
    breakdown.push({ label: `Chronos Spire (Tier ${tierCount})`, value: `x${chronosMult.toFixed(2)}` });
  }

  return { minutes, breakdown };
}

export function craftActionDuration(
  qty: number,
  sessionMinutes: number,
  toolEff = 1,
): { minutes: number; breakdown: ModifierRow[] } {
  const ratio = sessionMinutes / 60;
  const baseMinutes = qty;
  const minutes = (baseMinutes * ratio) / toolEff;

  const breakdown: ModifierRow[] = [{ label: `Base craft time (${qty} x 60s)`, value: formatMinSec(baseMinutes) }];
  if (ratio !== 1) {
    breakdown.push({ label: 'Agility + Chronos Spire', value: `x${ratio.toFixed(2)}` });
  }
  if (toolEff !== 1) {
    breakdown.push({
      label: 'Tool efficiency',
      value: `÷${toolEff.toFixed(3)}`,
      info: 'The higher your equipped tool is compared to the target, the higher the efficiency bonus.',
    });
  }

  return { minutes, breakdown };
}
