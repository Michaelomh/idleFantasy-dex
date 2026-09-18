import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment, getPrestigePaths, getBuildings } from '@/lib/progress/game-data';
import { resolveAllSkillBonuses, type SkillBonus } from '@/lib/bonuses';
import { activeNodesForSkill, effectTotal } from '@/lib/bonuses/prestige';
import { resolveActiveXpBlessing } from '@/lib/bonuses/blessings';
import { resolveCapeBonus } from '@/lib/bonuses/cape';
import { toolEfficiency } from './tool-efficiency';
import { sessionLength } from './session-duration';
import { prestigeNodeLabel } from '@/lib/bonuses/prestige-node-label';
import type { ActiveNode } from '@/lib/bonuses/prestige';
import type { ModifierRow } from './types';

export type ResolvedModifiers = {
  level: number;
  toolEff: number;
  toolEffMultiplier: number;
  gemChanceMult: number;
  thievingSuccessBonus: number;
  thievingCoinPct: number;
  xpBoostFactor: number;
  blessingMultiplier: number;
  xpPct: number;
  petBoostPct: number;
  /** Cape's own XP bonus for XP-cape skills (e.g. Agility) - applied as its own factor
   * separate from prestige xp_pct, not summed with it (HomeViewModel.kt's effectiveXp). */
  xpCapeMultiplier: number;
  yieldPct: number;
  yieldMultiplier: number;
  ironman: boolean;
  sessionMinutes: number;
  sessionBreakdown: ModifierRow[];
  yieldModifiers: ModifierRow[];
  gemModifiers: ModifierRow[];
  xpModifiers: ModifierRow[];
  secondaryMaterialSaveChance: number;
  inputSavePct: number;
  petBoostNodeLabel: string | null;
};

function pct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v}%`;
}

export function yieldSourceNames(rows: ModifierRow[]): string {
  return rows
    .filter((r) => r.label.startsWith('Yield Bonus ('))
    .map((r) => r.label.slice('Yield Bonus ('.length, -1))
    .join(', ');
}

function prestigeBreakdownRows(
  activeNodes: ActiveNode[],
  skillId: string,
  effect: string,
  labelPrefix: string,
  valueSuffix = '',
): ModifierRow[] {
  const bestPerPath = new Map<string, ActiveNode>();
  for (const active of activeNodes) {
    if (active.node.effect !== effect || typeof active.node.value !== 'number') continue;
    const current = bestPerPath.get(active.pathKey);
    if (!current || active.node.value! > current.node.value!) bestPerPath.set(active.pathKey, active);
  }
  return [...bestPerPath.values()].map((active) => ({
    label: `${labelPrefix} (${prestigeNodeLabel(skillId, active.pathKey, active.rank)})`,
    value: `${pct(active.node.value as number)}${valueSuffix}`,
  }));
}

export async function resolveModifiers(
  playerState: PlayerState,
  skillId: string,
  timedBoostsEnabled: boolean,
  resourceLevelRequired = 0,
): Promise<ResolvedModifiers> {
  const [allBonuses, trees, equipment, buildings] = await Promise.all([
    resolveAllSkillBonuses(playerState),
    getPrestigePaths(),
    getEquipment(),
    getBuildings(),
  ]);

  const bonus = allBonuses.find((b) => b.id === skillId) as SkillBonus;
  const tree = trees.find((t) => t.skill === skillId);
  const activeNodes = activeNodesForSkill(playerState, tree);
  const level = bonus.level;
  const ironman = playerState.ironman;

  const toolEff = toolEfficiency(skillId, playerState, equipment, resourceLevelRequired);
  const toolEffPct = effectTotal(activeNodes, 'tool_eff_pct');
  const perLevelBonus = effectTotal(activeNodes, 'per_level_bonus');
  const isGatheringTool = skillId === 'mining' || skillId === 'woodcutting' || skillId === 'fishing';
  const isCraftFamily =
    skillId === 'smithing' ||
    skillId === 'cooking' ||
    skillId === 'fletching' ||
    skillId === 'crafting' ||
    skillId === 'herblore' ||
    skillId === 'construction';
  const toolEffMultiplier = isGatheringTool ? 1 + (toolEffPct + perLevelBonus * level) / 100 : 1;
  const perLevelBonusNode = isGatheringTool
    ? activeNodes.find((a) => a.node.effect === 'per_level_bonus' && typeof a.node.value === 'number')
    : undefined;

  const gemChanceMult = 1 + effectTotal(activeNodes, 'bonus_roll_pct') / 100;
  const thievingSuccessBonus = effectTotal(activeNodes, 'success_chance_pct') / 100;
  const thievingCoinPct = effectTotal(activeNodes, 'coin_pct');

  const now = Date.now();
  const flags = playerState.raw.flags;
  const artisanTier = ((flags.town_building_tiers as Record<string, number> | undefined) ?? {}).artisans_workshop ?? 0;
  const artisanTierData = buildings.artisans_workshop?.tiers[artisanTier - 1] as
    { bonuses?: Record<string, number> } | undefined;
  const secondaryMaterialSaveChance = isCraftFamily
    ? (artisanTierData?.bonuses?.secondary_material_save_chance ?? 0)
    : 0;
  const inputSavePct = isCraftFamily ? Math.min(50, effectTotal(activeNodes, 'input_save_pct')) : 0;

  const purchasedBoostActive = timedBoostsEnabled && !ironman && Number(flags.xp_boost_expires_at ?? 0) > now;
  const prestigeBoosts = (flags.prestige_xp_boosts as Record<string, number> | undefined) ?? {};
  const prestigeBoostActive = timedBoostsEnabled && !ironman && (prestigeBoosts[skillId] ?? 0) > now;
  const xpBoostFactor = (purchasedBoostActive ? 2 : 1) * (prestigeBoostActive ? 2 : 1);
  const prayerCape = resolveCapeBonus(playerState, 'prayer', equipment, 1);
  const prayerCapeMult = 1 + prayerCape.multiplier;

  const blessing =
    timedBoostsEnabled && !ironman
      ? resolveActiveXpBlessing(
          (flags.active_blessing_key as string | undefined) ?? '',
          Number(flags.active_blessing_expires_at ?? 0),
          now,
          prayerCapeMult,
        )
      : null;
  const blessingMultiplier = blessing ? 1 + blessing.xpPct / 100 : 1;

  const session = await sessionLength(playerState);
  const yieldMultiplier = bonus.yieldSources.reduce((product, s) => product * (1 + s.pct / 100), 1);
  const yieldModifiers: ModifierRow[] = [];
  const capeYieldSource = bonus.yieldSources.find((s) => s.label !== 'Prestige');
  if (capeYieldSource)
    yieldModifiers.push({ label: `Yield Bonus (${capeYieldSource.label})`, value: pct(capeYieldSource.pct) });
  yieldModifiers.push(...prestigeBreakdownRows(activeNodes, skillId, 'yield_pct', 'Yield Bonus'));
  const gemModifiers: ModifierRow[] = [
    ...prestigeBreakdownRows(activeNodes, skillId, 'bonus_roll_pct', 'Gem chance bonus', ' Gem'),
  ];
  if (yieldMultiplier > 1) {
    const sources = yieldSourceNames(yieldModifiers);
    gemModifiers.push({
      label: `Yield Bonus${sources ? ` (${sources})` : ''}`,
      value: `x${yieldMultiplier.toFixed(2)}`,
    });
  }

  // Ignoring flow-state, it's too much effort.
  const flowNodesByPath = new Map<string, ActiveNode>();
  for (const active of activeNodes) {
    if (active.node.effect !== 'flow_rate' || typeof active.node.value !== 'number') continue;
    const current = flowNodesByPath.get(active.pathKey);
    if (!current || (active.node.value as number) > (current.node.value as number)) {
      flowNodesByPath.set(active.pathKey, active);
    }
  }
  for (const active of flowNodesByPath.values()) {
    yieldModifiers.push({
      label: `Flow-state (${prestigeNodeLabel(skillId, active.pathKey, active.rank)})`,
      value: `up to +${active.node.value}%`,
      warning:
        'Flow-state ramps up yield the longer you work this skill continuously, but this calculator doesn’t model it - actual yield will run higher than shown.',
    });
  }

  if (perLevelBonusNode) {
    const contributionPct = (perLevelBonusNode.node.value as number) * level;
    yieldModifiers.push({
      label: `Included in tool efficiency (${prestigeNodeLabel(skillId, perLevelBonusNode.pathKey, perLevelBonusNode.rank)})`,
      value: pct(Math.round(contributionPct * 100) / 100),
    });
  }

  const petXpSource = bonus.xpSources.find((s) => s.label === 'Pets');
  const petBoostPct = petXpSource?.pct ?? 0;
  const petBoostNode = activeNodes
    .filter((a) => a.node.effect === 'pet_boost_pct' && typeof a.node.value === 'number')
    .reduce<ActiveNode | undefined>(
      (best, a) => (!best || (a.node.value as number) > (best.node.value as number) ? a : best),
      undefined,
    );
  const petBoostNodeLabel = petBoostNode ? prestigeNodeLabel(skillId, petBoostNode.pathKey, petBoostNode.rank) : null;
  const isAgility = skillId === 'agility';
  const excludePetFromXpPct = isGatheringTool || isCraftFamily || skillId === 'firemaking' || isAgility;

  const capeXpSource = isAgility
    ? bonus.xpSources.find((s) => s.label !== 'Pets' && s.label !== 'Prestige')
    : undefined;
  const xpCapeMultiplier = 1;

  const xpPct = excludePetFromXpPct ? bonus.xpPct - petBoostPct - (capeXpSource?.pct ?? 0) : bonus.xpPct;

  const xpModifiers: ModifierRow[] = [];
  for (const source of bonus.xpSources) {
    if (excludePetFromXpPct && source.label === 'Pets') continue;
    if (capeXpSource && source === capeXpSource) continue;
    xpModifiers.push({ label: `XP bonus (${source.label})`, value: pct(source.pct) });
  }
  if (capeXpSource) {
    xpModifiers.push({
      label: `XP bonus (${capeXpSource.label})`,
      value: pct(capeXpSource.pct),
      warning:
        'Live testing shows this doesn’t currently add XP for Agility, even though it’s implemented in the game files - not counted in the total shown.',
    });
  }
  if (purchasedBoostActive) xpModifiers.push({ label: 'XP Boost (Purchased)', value: 'x2' });
  if (prestigeBoostActive) xpModifiers.push({ label: 'XP Boost (Temporary)', value: 'x2' });
  if (blessing) {
    const blessingSource = prayerCapeMult > 1 ? `${blessing.label} + Prayer Cape` : blessing.label;
    xpModifiers.push({ label: `Church blessing (${blessingSource})`, value: pct(blessing.xpPct) });
  }

  return {
    level,
    toolEff,
    toolEffMultiplier,
    gemChanceMult,
    thievingSuccessBonus,
    thievingCoinPct,
    xpBoostFactor,
    blessingMultiplier,
    xpPct,
    petBoostPct: isGatheringTool || isCraftFamily || isAgility ? petBoostPct : 0,
    xpCapeMultiplier,
    yieldPct: bonus.yieldPct,
    yieldMultiplier,
    ironman,
    gemModifiers,
    sessionMinutes: session.minutes,
    sessionBreakdown: session.breakdown,
    yieldModifiers,
    xpModifiers,
    secondaryMaterialSaveChance,
    inputSavePct,
    petBoostNodeLabel: isGatheringTool || isCraftFamily || isAgility ? petBoostNodeLabel : null,
  };
}

export function applyXpMultipliers(rawXp: number, mods: ResolvedModifiers): number {
  return rawXp * (1 + mods.xpPct / 100) * mods.xpBoostFactor * mods.blessingMultiplier * mods.xpCapeMultiplier;
}

export function applyYieldMultiplier(rawQty: number, mods: ResolvedModifiers): number {
  return Math.max(rawQty, Math.round(rawQty * mods.yieldMultiplier));
}

export function withBaseRow(label: string, value: number, rows: ModifierRow[]): ModifierRow[] {
  return [{ label, value: Math.round(value).toLocaleString() }, ...rows];
}

export function toolEfficiencyRows(mods: ResolvedModifiers, base: number): ModifierRow[] {
  const rows: ModifierRow[] = [];
  let running = base;
  if (mods.toolEff !== 1) {
    running *= mods.toolEff;
    rows.push({
      label: 'Tool Efficiency',
      value: `x${mods.toolEff.toFixed(2)} (${Math.round(running).toLocaleString()})`,
    });
  }
  if (mods.toolEffMultiplier !== 1) {
    running *= mods.toolEffMultiplier;
    rows.push({
      label: 'Tool Efficiency Bonus (Prestige)',
      value: `x${mods.toolEffMultiplier.toFixed(2)} (${Math.round(running).toLocaleString()})`,
    });
  }
  return rows;
}
