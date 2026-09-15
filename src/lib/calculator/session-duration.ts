import type { PlayerState } from '@/lib/save-source/types';
import { getBuildings, getPrestigePaths } from '@/lib/progress/game-data';
import { activeNodesForSkill, effectTotal } from '@/lib/bonuses/prestige';
import type { ModifierRow } from './types';

export type SessionLength = { minutes: number; breakdown: ModifierRow[] };

export function formatMinSec(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return `${seconds}s`;
}

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
      label: `Agility level ${agilityLevel} + Endurance floor (${sessionFloorMin} min)`,
      value: `-${formatMinSec(agilityReduction)}`,
    });
  }
  if (chronosMult !== 1) {
    breakdown.push({ label: `Chronos Spire (tier ${tierCount})`, value: `×${chronosMult.toFixed(2)}` });
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

  const breakdown: ModifierRow[] = [{ label: `Base craft time (${qty} × 60s)`, value: formatMinSec(baseMinutes) }];
  if (ratio !== 1) {
    breakdown.push({ label: 'Agility + Chronos Spire', value: `×${ratio.toFixed(2)}` });
  }
  if (toolEff !== 1) {
    breakdown.push({ label: 'Tool efficiency', value: `÷${toolEff.toFixed(2)}` });
  }

  return { minutes, breakdown };
}
