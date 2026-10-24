import type { PlayerState } from '@/lib/save-source/types';
import { getGems } from '@/lib/progress/game-data';
import { humanize } from '@/lib/utils/humanize';
import { formatNumber } from '@/lib/utils/format-number';
import {
  getOreEntries,
  getTrees,
  getFishEntries,
  getFishingSkillData,
  getAgilityCourses,
  getRecipes,
} from '../game-data';
import { binomialRange, expectedAndChance, SESSION_FRAMES } from '../frame-roll';
import { elderLevel, applyElderXp, elderXpRows, elderSessionLength, artisanSaveChance } from '../elder-isle';
import { tierFor } from './fishing';
import { sigilMultiplier } from '@/lib/bonuses/sigils';
import { sigilRows } from '../modifiers';
import type { BonusItem, CalculatorInputs, SessionResult } from '../types';

type ElderCalculator = (playerState: PlayerState, inputs: CalculatorInputs) => Promise<SessionResult>;

function sigils(playerState: PlayerState) {
  return {
    sapphire: sigilMultiplier(playerState.raw.flags, 'elder_sapphire'),
    emerald: sigilMultiplier(playerState.raw.flags, 'elder_emerald'),
  };
}

const emeraldRows = (emerald: number) => sigilRows(emerald, 'Yield Bonus (Emerald Sigil)');

/** Isle gathering: exactly one item and one flat XP grant per frame, 60 frames. */
function gatheringResult(
  playerState: PlayerState,
  skillId: string,
  xpPerAction: number,
  item: { key: string; label: string },
  bonusItems: BonusItem[] = [],
): SessionResult {
  const level = elderLevel(playerState, skillId);
  const { sapphire, emerald } = sigils(playerState);
  const rawXp = SESSION_FRAMES * xpPerAction;
  const { minutes, breakdown } = elderSessionLength(playerState);
  return {
    xp: { value: applyElderXp(rawXp, level, sapphire) },
    guaranteedItems: [{ ...item, qty: Math.round(SESSION_FRAMES * emerald) }],
    bonusItems: bonusItems.map((b) => ({
      ...b,
      expected: b.expected * emerald,
      rangeMin: Math.round(b.rangeMin * emerald),
      rangeMax: Math.round(b.rangeMax * emerald),
    })),
    yieldBreakdown: emeraldRows(emerald),
    xpBreakdown: elderXpRows(rawXp, level, sapphire),
    sessionMinutes: minutes,
    sessionBreakdown: breakdown,
  };
}

const elderMining: ElderCalculator = async (playerState, inputs) => {
  const [ores, gems] = await Promise.all([getOreEntries(), getGems()]);
  const ore = ores[inputs.targetKey];
  // Mainland gems still roll on the isle, once per ore at their base rate.
  const bonusItems = Object.entries(gems)
    .map(([key, gem]) => ({
      key,
      label: gem.display_name ?? humanize(key),
      ...expectedAndChance(SESSION_FRAMES, (gem.drop_rate as number | undefined) ?? 0),
    }))
    .filter((g) => g.expected > 0);
  return gatheringResult(
    playerState,
    'mining',
    (ore?.xp_per_ore as number | undefined) ?? 0,
    { key: inputs.targetKey, label: ore?.display_name ?? humanize(inputs.targetKey) },
    bonusItems,
  );
};

const elderWoodcutting: ElderCalculator = async (playerState, inputs) => {
  const tree = (await getTrees())[inputs.targetKey];
  return gatheringResult(playerState, 'woodcutting', tree?.xp_per_log ?? 0, {
    key: tree?.log_name ?? inputs.targetKey,
    label: tree?.log_display_name ?? humanize(inputs.targetKey),
  });
};

const elderFishing: ElderCalculator = async (playerState, inputs) => {
  const [fish, skillData] = await Promise.all([getFishEntries(), getFishingSkillData()]);
  const target = fish[inputs.targetKey];
  // The mainland bonus table still rolls on the isle, tiered by the Elder Fishing level.
  const rows = skillData.drop_tables[tierFor(elderLevel(playerState, 'fishing'), skillData.drop_tables)] ?? [];
  const bonusItems = rows
    .filter((r) => r.chance > 0)
    .map((r) => ({ key: r.item, label: humanize(r.item), ...expectedAndChance(SESSION_FRAMES, 0.2 * r.chance) }));
  return {
    ...gatheringResult(
      playerState,
      'fishing',
      (target?.xp_per_catch as number | undefined) ?? 0,
      { key: inputs.targetKey, label: target?.display_name ?? humanize(inputs.targetKey) },
      bonusItems,
    ),
    yieldBreakdown: [
      ...emeraldRows(sigils(playerState).emerald),
      {
        label: 'Bonus Roll Rate',
        value: '20.0%',
        info: 'Each minute has a chance to roll the bonus table on top of your chosen fish. Each item in the table then rolls its own chance.',
      },
    ],
  };
};

const elderAgility: ElderCalculator = async (playerState, inputs) => {
  const course = (await getAgilityCourses())[inputs.targetKey];
  const req = course?.level_required ?? 1;
  const level = elderLevel(playerState, 'agility');
  const { sapphire } = sigils(playerState);
  const levelDiff = level - req;
  const success = Math.min(0.95, Math.max(0, 0.8 + levelDiff * 0.02));
  const totalLaps = SESSION_FRAMES * 2;
  const xpPerSuccess = course?.xp_per_success ?? 0;
  const rawXp = totalLaps * success * xpPerSuccess;
  const [lapsLow, lapsHigh] = binomialRange(totalLaps, success);
  const { minutes, breakdown } = elderSessionLength(playerState);

  return {
    xp: {
      value: applyElderXp(rawXp, level, sapphire),
      min: applyElderXp(lapsLow * xpPerSuccess, level, sapphire),
      max: applyElderXp(lapsHigh * xpPerSuccess, level, sapphire),
    },
    guaranteedItems: [],
    bonusItems: [],
    yieldBreakdown: [],
    xpBreakdown: [
      { label: 'Total Laps', value: totalLaps.toLocaleString() },
      {
        label: 'Base XP range',
        value: `${formatNumber(rawXp)} (${formatNumber(lapsLow * xpPerSuccess)} - ${formatNumber(lapsHigh * xpPerSuccess)})`,
      },
      ...elderXpRows(rawXp, level, sapphire).slice(1),
    ],
    sessionMinutes: minutes,
    sessionBreakdown: breakdown,
    successBreakdown: [
      { label: 'Initial probability', value: '80%' },
      { label: 'Level difference (yours - course)', value: `${levelDiff} (${level} - ${req})` },
      { label: 'Per-level bonus', value: `+2% / lvl (${levelDiff >= 0 ? '+' : ''}${levelDiff * 2}%)` },
      { label: 'Final probability', value: `${80 + levelDiff * 2}%` },
      { label: 'Cap', value: '95%' },
    ],
    successRate: success,
  };
};

/** Isle crafting: every craft succeeds, one output per craft, flat XP per item. */
function elderCraft(skillId: 'smithing' | 'cooking'): ElderCalculator {
  return async (playerState, inputs) => {
    const [recipes, saveChance] = await Promise.all([getRecipes(skillId), artisanSaveChance(playerState)]);
    const recipe = recipes[inputs.targetKey];
    const qty = inputs.qty ?? 1;
    const level = elderLevel(playerState, skillId);
    const { sapphire, emerald } = sigils(playerState);
    const rawXp = qty * (recipe?.xp_per_item ?? 0);
    const baseOutputQty = (recipe?.output_quantity ?? 1) * qty;
    const outputQty = Math.max(baseOutputQty, Math.round(baseOutputQty * emerald));
    const materials = recipe?.materials ?? (recipe?.raw_item ? { [recipe.raw_item]: 1 } : {});
    const { minutes, breakdown } = elderSessionLength(playerState, qty);

    return {
      xp: { value: applyElderXp(rawXp, level, sapphire) },
      guaranteedItems: [
        {
          key: recipe?.cooked_item ?? inputs.targetKey,
          label: recipe?.display_name ?? humanize(inputs.targetKey),
          qty: outputQty,
        },
      ],
      bonusItems: [],
      yieldBreakdown: [{ label: 'Base Yield', value: baseOutputQty.toLocaleString() }, ...emeraldRows(emerald)],
      xpBreakdown: elderXpRows(rawXp, level, sapphire),
      sessionMinutes: minutes,
      sessionBreakdown: breakdown,
      materialsRequired: Object.entries(materials).map(([key, perItem], i) => ({
        key,
        label: humanize(key),
        qty: Math.round(perItem * qty * (i === 0 ? 1 : 1 - saveChance)),
      })),
    };
  };
}

export const ELDER_SESSION_CALCULATORS: Record<string, ElderCalculator> = {
  mining: elderMining,
  woodcutting: elderWoodcutting,
  fishing: elderFishing,
  agility: elderAgility,
  smithing: elderCraft('smithing'),
  cooking: elderCraft('cooking'),
};
