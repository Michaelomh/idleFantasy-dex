import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment, getBuildings, getPrestigePaths } from '@/lib/progress/game-data';
import { getCropEntries } from '../game-data';
import { humanize } from '@/lib/utils/humanize';
import { resolveModifiers, applyXpMultipliers, withBaseRow } from '../modifiers';
import { activeNodesForSkill, effectTotal } from '@/lib/bonuses/prestige';
import { resolveCapeBonus } from '@/lib/bonuses/cape';
import type { ModifierRow } from '../types';
import { toolEfficiency } from '../tool-efficiency';
import { rollSumRange } from '../frame-roll';
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

export async function hasCropRotationBonus(playerState: PlayerState): Promise<boolean> {
  const trees = await getPrestigePaths();
  const activeNodes = activeNodesForSkill(
    playerState,
    trees.find((t) => t.skill === 'farming'),
  );
  return effectTotal(activeNodes, 'crop_rotation_pct') > 0 || effectTotal(activeNodes, 'crop_rotation_always') > 0;
}

export async function farming(playerState: PlayerState, inputs: CalculatorInputs): Promise<SessionResult> {
  const [crops, equipment, trees] = await Promise.all([getCropEntries(), getEquipment(), getPrestigePaths()]);

  const crop = crops[inputs.targetKey];
  const mods = await resolveModifiers(playerState, 'farming', inputs.timedBoostsEnabled);
  const patchCount = inputs.cropCount ?? (await totalPatchCount(playerState, mods.level));
  const hoeMult = toolEfficiency('farming', playerState, equipment);
  const ashMult = inputs.ashCatalystKey ? (ASH_FARMING_MULT[inputs.ashCatalystKey] ?? 1) : 1;

  const activeNodes = activeNodesForSkill(
    playerState,
    trees.find((t) => t.skill === 'farming'),
  );
  const prestigeYieldPct = effectTotal(activeNodes, 'yield_pct');
  const prestigeYieldMult = 1 + prestigeYieldPct / 100;
  const rotationPct = effectTotal(activeNodes, 'crop_rotation_pct');
  const rotationAlways = effectTotal(activeNodes, 'crop_rotation_always') > 0;
  const rotationActive = rotationAlways || !!inputs.cropRotated;
  const rotationMult = rotationActive ? 1 + rotationPct / 100 : 1;

  const cape = resolveCapeBonus(playerState, 'farming', equipment, 1);
  const capeActive = cape.multiplier > 0;
  const capeFlatMult = capeActive ? 2 : 1;

  const rollMult = hoeMult * ashMult * prestigeYieldMult * rotationMult;

  const [rollMin, rollMax] = rollSumRange(crop?.yield_min ?? 0, crop?.yield_max ?? 0, rollMult, patchCount);
  const yieldMin = rollMin * capeFlatMult;
  const yieldMax = rollMax * capeFlatMult;
  const rollExpected = Math.round((((crop?.yield_min ?? 0) + (crop?.yield_max ?? 0)) / 2) * rollMult) * patchCount;
  const yieldExpected = rollExpected * capeFlatMult;

  const plantXp = (crop?.planting_xp ?? 0) * patchCount;
  const harvestXpPerYield = crop?.harvest_xp ?? 0;

  const baseYield = (((crop?.yield_min ?? 0) + (crop?.yield_max ?? 0)) / 2) * patchCount;
  const yieldRows: ModifierRow[] = [];
  if (hoeMult !== 1) yieldRows.push({ label: 'Hoe efficiency', value: `x${hoeMult.toFixed(2)}` });
  if (ashMult !== 1)
    yieldRows.push({
      label: `Ash catalyst (${humanize(inputs.ashCatalystKey ?? '')})`,
      value: `x${ashMult.toFixed(2)}`,
    });
  if (prestigeYieldPct > 0) yieldRows.push({ label: 'Yield Bonus (Prestige)', value: `+${prestigeYieldPct}%` });
  if (rotationActive && rotationPct > 0)
    yieldRows.push({
      label: rotationAlways ? 'Crop Rotation (always active)' : 'Crop Rotation',
      value: `+${rotationPct}%`,
      info: 'Only applies when the newly planted crop differs from the last crop harvested on this patch.',
    });
  if (capeActive)
    yieldRows.push({
      label: `Farming Cape (${cape.capeName ?? 'Cape Rack'})`,
      value: 'x2',
      info: 'Applied as a flat doubling after the base roll is rounded, not folded into the multipliers above.',
    });

  const yieldBaseRow: ModifierRow = {
    label: 'Base Yield',
    value: Math.round(baseYield).toLocaleString(),
    info: 'Farming isn’t probability-based like other skills - each harvest is a direct roll in the crop’s yield range, so the range shown is the true min/max, not a percentile window.',
  };

  return {
    xp: {
      value: plantXp + applyXpMultipliers(harvestXpPerYield * yieldExpected, mods),
      min: plantXp + applyXpMultipliers(harvestXpPerYield * yieldMin, mods),
      max: plantXp + applyXpMultipliers(harvestXpPerYield * yieldMax, mods),
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
    yieldBreakdown: [yieldBaseRow, ...yieldRows],
    xpBreakdown: withBaseRow('Base XP', plantXp + harvestXpPerYield * baseYield, [...yieldRows, ...mods.xpModifiers]),
    sessionMinutes: (crop?.growth_time_hours ?? 0) * 60,
    sessionBreakdown: [],
  };
}
