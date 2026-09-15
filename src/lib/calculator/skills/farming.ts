import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment, getBuildings } from '@/lib/progress/game-data';
import { getCropEntries } from '../game-data';
import { humanize } from '@/lib/humanize';
import { resolveModifiers, applyXpMultipliers, withBaseRow } from '../modifiers';
import type { ModifierRow } from '../types';
import { toolEfficiency } from '../tool-efficiency';
import { uniformSumRange } from '../frame-roll';
import type { CalculatorInputs, SessionResult } from '../types';

const ASH_FARMING_MULT: Record<string, number> = {
  ashes: 1.1,
  oak_ashes: 1.2,
  willow_ashes: 1.35,
  maple_ashes: 1.5,
  yew_ashes: 1.75,
  magic_ashes: 2.0,
  redwood_ashes: 2.5,
};

export function patchCountForLevel(level: number): number {
  if (level >= 40) return 5;
  if (level >= 20) return 4;
  return 3;
}

export async function extraFarmPlots(playerState: PlayerState): Promise<number> {
  const buildings = await getBuildings();
  const gardenTier =
    ((playerState.raw.flags.town_building_tiers as Record<string, number> | undefined) ?? {}).garden ?? 0;
  const gardenTierData = buildings.garden?.tiers[gardenTier - 1] as { bonuses?: Record<string, number> } | undefined;
  const gardenPlots = gardenTierData?.bonuses?.farm_plots ?? 0;
  const monumentTier = Number(playerState.raw.flags.monument_tier ?? 0);
  return gardenPlots + (monumentTier >= 1 ? 1 : 0);
}

export async function totalPatchCount(playerState: PlayerState, level: number): Promise<number> {
  return patchCountForLevel(level) + (await extraFarmPlots(playerState));
}

export async function farming(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [crops, equipment, mods] = await Promise.all([
    getCropEntries(),
    getEquipment(),
    resolveModifiers(playerState, 'farming', inputs.timedBoostsEnabled),
  ]);

  const crop = crops[inputs.targetKey];
  const patchCount = inputs.cropCount ?? (await totalPatchCount(playerState, mods.level));
  const hoeMult = toolEfficiency('farming', mods.level, playerState, equipment);
  const ashMult = inputs.ashCatalystKey ? (ASH_FARMING_MULT[inputs.ashCatalystKey] ?? 1) : 1;
  const yieldMult = hoeMult * ashMult * (1 + mods.yieldPct / 100);

  const [yieldMin, yieldMax] = uniformSumRange(crop?.yield_min ?? 0, crop?.yield_max ?? 0, yieldMult, patchCount);
  const yieldExpected = Math.round((((crop?.yield_min ?? 0) + (crop?.yield_max ?? 0)) / 2) * yieldMult) * patchCount;

  const plantXp = (crop?.planting_xp ?? 0) * patchCount;
  const harvestXpPerYield = crop?.harvest_xp ?? 0;

  const baseYield = (((crop?.yield_min ?? 0) + (crop?.yield_max ?? 0)) / 2) * patchCount;
  const yieldRows: ModifierRow[] = [];
  if (hoeMult !== 1) yieldRows.push({ label: 'Hoe efficiency', value: `×${hoeMult.toFixed(2)}` });
  if (ashMult !== 1)
    yieldRows.push({
      label: `Ash catalyst (${humanize(inputs.ashCatalystKey ?? '')})`,
      value: `×${ashMult.toFixed(2)}`,
    });
  yieldRows.push(...mods.yieldModifiers);

  return {
    xp: {
      value: applyXpMultipliers(plantXp + harvestXpPerYield * yieldExpected, mods),
      min: applyXpMultipliers(plantXp + harvestXpPerYield * yieldMin, mods),
      max: applyXpMultipliers(plantXp + harvestXpPerYield * yieldMax, mods),
    },
    guaranteedItems: [
      {
        key: inputs.targetKey,
        label: crop?.display_name ?? humanize(inputs.targetKey),
        qty: yieldExpected,
        qtyMin: yieldMin,
        qtyMax: yieldMax,
      },
    ],
    bonusItems: [],
    yieldBreakdown: withBaseRow('Base yield', baseYield, yieldRows),
    xpBreakdown: withBaseRow('Base XP', plantXp + harvestXpPerYield * baseYield, [...yieldRows, ...mods.xpModifiers]),
    sessionMinutes: (crop?.growth_time_hours ?? 0) * 60,
    sessionBreakdown: [],
  };
}
