import type { PlayerState } from '@/lib/save-source/types';
import { SKILLS, type SkillCategory } from '@/lib/game/skills';
import { getEquipment, getPets } from '@/lib/progress/game-data';
import { activeNodesForSkill, allEffectTotals, effectTotal, loadPrestigeTreeMap } from './prestige';
import { resolveCapeBonus } from './cape';
import { petXpPctForSkill } from './pets';
import { describeEffect, formatEffectValue } from './effect-copy';

export type BonusSource = { label: string; pct: number };
export type OtherBonus = { effect: string; label: string; valueLabel: string };

export type SkillBonus = {
  id: string;
  label: string;
  category: SkillCategory;
  level: number;
  xpPct: number;
  xpSources: BonusSource[];
  yieldPct: number;
  yieldSources: BonusSource[];
  combatStatFlat: number;
  otherBonuses: OtherBonus[];
};

export async function resolveAllSkillBonuses(playerState: PlayerState): Promise<SkillBonus[]> {
  const [trees, equipment, pets] = await Promise.all([loadPrestigeTreeMap(), getEquipment(), getPets()]);

  return SKILLS.map(({ id, label, category }) => {
    const activeNodes = activeNodesForSkill(playerState, trees.get(id));
    const prestigeXpPct = effectTotal(activeNodes, 'xp_pct');
    const prestigeYieldPct = effectTotal(activeNodes, 'yield_pct');
    const combatStatFlat = effectTotal(activeNodes, 'combat_stat_flat');
    const capeScaling = effectTotal(activeNodes, 'cape_scaling') || 1;

    const petXpPct = petXpPctForSkill(playerState, id, pets);
    const cape = resolveCapeBonus(playerState, id, category, equipment, capeScaling);
    const capePct = Math.round(cape.multiplier * 100);

    const xpSources: BonusSource[] = [];
    if (petXpPct > 0) xpSources.push({ label: 'Pets', pct: petXpPct });
    if (prestigeXpPct > 0) xpSources.push({ label: 'Prestige', pct: prestigeXpPct });
    if (cape.appliesToXp && capePct > 0) xpSources.push({ label: cape.capeName ?? 'Cape', pct: capePct });

    const yieldSources: BonusSource[] = [];
    if (!cape.appliesToXp && capePct > 0) yieldSources.push({ label: cape.capeName ?? 'Cape', pct: capePct });
    if (prestigeYieldPct > 0) yieldSources.push({ label: 'Prestige', pct: prestigeYieldPct });

    const otherBonuses: OtherBonus[] = allEffectTotals(activeNodes)
      .filter(({ effect }) => !['xp_pct', 'yield_pct', 'combat_stat_flat', 'cape_scaling'].includes(effect))
      .map(({ effect, value }) => ({
        effect,
        label: describeEffect(effect, value),
        valueLabel: formatEffectValue(effect, value),
      }));

    return {
      id,
      label,
      category,
      level: playerState.raw.skillLevels[id] ?? 1,
      xpPct: xpSources.reduce((sum, s) => sum + s.pct, 0),
      xpSources,
      yieldPct: yieldSources.reduce((sum, s) => sum + s.pct, 0),
      yieldSources,
      combatStatFlat,
      otherBonuses,
    };
  });
}
