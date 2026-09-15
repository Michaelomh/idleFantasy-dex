import type { PlayerState } from '@/lib/save-source/types';
import { getEquipment, getPrestigePaths } from '@/lib/progress/game-data';
import { resolveAllSkillBonuses, type SkillBonus } from '@/lib/bonuses';
import { activeNodesForSkill, effectTotal } from '@/lib/bonuses/prestige';
import { resolveActiveXpBlessing } from '@/lib/bonuses/blessings';
import { toolEfficiency } from './tool-efficiency';
import { sessionLength } from './session-duration';
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
  yieldPct: number;
  ironman: boolean;
  sessionMinutes: number;
  sessionBreakdown: ModifierRow[];
  yieldModifiers: ModifierRow[];
  xpModifiers: ModifierRow[];
};

function pct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v}%`;
}

export async function resolveModifiers(
  playerState: PlayerState,
  skillId: string,
  timedBoostsEnabled: boolean,
): Promise<ResolvedModifiers> {
  const [allBonuses, trees, equipment] = await Promise.all([
    resolveAllSkillBonuses(playerState),
    getPrestigePaths(),
    getEquipment(),
  ]);

  const bonus = allBonuses.find((b) => b.id === skillId) as SkillBonus;
  const tree = trees.find((t) => t.skill === skillId);
  const activeNodes = activeNodesForSkill(playerState, tree);
  const level = bonus.level;
  const ironman = playerState.ironman;

  const toolEff = toolEfficiency(skillId, level, playerState, equipment);
  const toolEffPct = effectTotal(activeNodes, 'tool_eff_pct');
  const perLevelBonus = effectTotal(activeNodes, 'per_level_bonus');
  const isGatheringTool = skillId === 'mining' || skillId === 'woodcutting' || skillId === 'fishing';
  const toolEffMultiplier = isGatheringTool ? 1 + (toolEffPct + perLevelBonus * level) / 100 : 1;

  const gemChanceMult = 1 + effectTotal(activeNodes, 'bonus_roll_pct') / 100;
  const thievingSuccessBonus = effectTotal(activeNodes, 'success_chance_pct') / 100;
  const thievingCoinPct = effectTotal(activeNodes, 'coin_pct');

  const now = Date.now();
  const flags = playerState.raw.flags;
  const purchasedBoostActive = timedBoostsEnabled && !ironman && Number(flags.xp_boost_expires_at ?? 0) > now;
  const prestigeBoosts = (flags.prestige_xp_boosts as Record<string, number> | undefined) ?? {};
  const prestigeBoostActive = timedBoostsEnabled && !ironman && (prestigeBoosts[skillId] ?? 0) > now;
  const xpBoostFactor = (purchasedBoostActive ? 2 : 1) * (prestigeBoostActive ? 2 : 1);

  const blessing =
    timedBoostsEnabled && !ironman
      ? resolveActiveXpBlessing(
          (flags.active_blessing_key as string | undefined) ?? '',
          Number(flags.active_blessing_expires_at ?? 0),
          now,
        )
      : null;
  const blessingMultiplier = blessing ? 1 + blessing.xpPct / 100 : 1;

  const session = await sessionLength(playerState);

  const yieldModifiers: ModifierRow[] = [];
  if (bonus.yieldPct > 0) yieldModifiers.push({ label: 'Yield bonus (prestige/cape)', value: pct(bonus.yieldPct) });

  const flowRatePct = effectTotal(activeNodes, 'flow_rate');
  if (flowRatePct > 0) {
    // Ignoring flow-state, it's too much effort.
    yieldModifiers.push({
      label: 'Flow-state (ignored)',
      value: `up to +${flowRatePct}%`,
    });
  }

  const xpModifiers: ModifierRow[] = [];
  if (bonus.xpPct > 0) xpModifiers.push({ label: 'XP bonus (pets/prestige/cape)', value: pct(bonus.xpPct) });
  if (purchasedBoostActive) xpModifiers.push({ label: 'XP boost (purchased)', value: '×2' });
  if (prestigeBoostActive) xpModifiers.push({ label: 'XP boost (prestige)', value: '×2' });
  if (blessing) xpModifiers.push({ label: `Church blessing (${blessing.label})`, value: pct(blessing.xpPct) });

  return {
    level,
    toolEff,
    toolEffMultiplier,
    gemChanceMult,
    thievingSuccessBonus,
    thievingCoinPct,
    xpBoostFactor,
    blessingMultiplier,
    xpPct: bonus.xpPct,
    yieldPct: bonus.yieldPct,
    ironman,
    sessionMinutes: session.minutes,
    sessionBreakdown: session.breakdown,
    yieldModifiers,
    xpModifiers,
  };
}

export function applyXpMultipliers(rawXp: number, mods: ResolvedModifiers): number {
  return rawXp * (1 + mods.xpPct / 100) * mods.xpBoostFactor * mods.blessingMultiplier;
}

export function applyYieldMultiplier(rawQty: number, mods: ResolvedModifiers): number {
  return Math.max(rawQty, Math.round(rawQty * (1 + mods.yieldPct / 100)));
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
      label: 'Tool efficiency',
      value: `×${mods.toolEff.toFixed(2)} (${Math.round(running).toLocaleString()})`,
    });
  }
  if (mods.toolEffMultiplier !== 1) {
    running *= mods.toolEffMultiplier;
    rows.push({
      label: 'Prestige tool efficiency',
      value: `×${mods.toolEffMultiplier.toFixed(2)} (${Math.round(running).toLocaleString()})`,
    });
  }
  return rows;
}
