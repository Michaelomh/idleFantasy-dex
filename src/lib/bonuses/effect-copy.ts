// Ported from the game's strings.xml (prestige_effect_<key>) and
// BonusesTab.kt's prestigeEffectValueLabel, game version 1.14.11.
// xp_pct / yield_pct / combat_stat_flat get their own dedicated columns
// upstream and never reach this table.

export const KNOWN_PRESTIGE_EFFECTS = [
  'xp_pct',
  'yield_pct',
  'flow_rate',
  'flow_interval_reduction',
  'combat_stat_flat',
  'session_floor_min',
  'cape_scaling',
  'bonus_roll_pct',
  'coin_pct',
  'crop_rotation_pct',
  'crop_rotation_always',
  'tool_eff_pct',
  'per_level_bonus',
  'success_chance_pct',
  'reclaim_pct',
  'heal_pct',
  'death_keep_pct',
  'queue_slot',
  'pet_boost_pct',
  'blessing_duration_pct',
  'blessing_cost_pct',
  'potion_bonus_flat',
  'input_save_pct',
  'builder_discount_pct',
  'sell_price_pct',
  'slayer_points_pct',
  'double_hit_pct',
  'second_chance',
  'foretell_slots',
  'slayer_multi_task',
  'unlock_recipe',
] as const;

type KnownEffect = (typeof KNOWN_PRESTIGE_EFFECTS)[number] | (string & {});

const EFFECT_DESCRIPTIONS: Partial<Record<string, (value: number) => string>> = {
  flow_rate: (v) => `Flow-state: +${v}% yield per interval of continuous activity, up to +100%.`,
  flow_interval_reduction: (v) => `Flow-state interval shortened by ${v} minutes.`,
  session_floor_min: (v) => `Sessions up to ${v} minutes shorter at level 99.`,
  cape_scaling: (v) => `Cape bonuses for this skill multiplied ×${v}.`,
  bonus_roll_pct: (v) => `+${v}% gem find chance while mining.`,
  coin_pct: (v) => `+${v}% coins from this skill.`,
  crop_rotation_pct: (v) => `+${v}% yield when planting a different crop than the last harvest.`,
  crop_rotation_always: () => `The rotation bonus applies to every crop, no rotation needed.`,
  tool_eff_pct: (v) => `Tool efficiency +${v}%.`,
  per_level_bonus: (v) => `+${v} tool or combat bonus per level of this skill.`,
  success_chance_pct: (v) => `Pickpocket success chance +${v}%.`,
  reclaim_pct: (v) => `+${v}% chance to recover spent arrows and runes after combat.`,
  heal_pct: (v) => `Food heals +${v}% more in combat.`,
  death_keep_pct: (v) => `Keep an extra ${v}% of XP and loot when defeated.`,
  queue_slot: (v) => `+${v} session queue slot.`,
  pet_boost_pct: (v) => `Pet boosts for this skill are ${v}% stronger.`,
  blessing_duration_pct: (v) => `Church blessings last ${v}% longer.`,
  blessing_cost_pct: (v) => `Church blessings cost ${v}% fewer bones.`,
  potion_bonus_flat: (v) => `Combat potions grant +${v} more to their stats.`,
  input_save_pct: (v) => `${v}% of crafting materials are refunded.`,
  builder_discount_pct: (v) => `Town building upgrades cost ${v}% less.`,
  sell_price_pct: (v) => `Shop sell prices +${v}%.`,
  slayer_points_pct: (v) => `Slayer task points +${v}%.`,
  double_hit_pct: (v) => `${v}% chance to strike a second melee hit.`,
  second_chance: () => `Missed melee attacks are rerolled once.`,
  foretell_slots: (v) => `+${v} foretold slayer task slots.`,
  slayer_multi_task: () => `Dungeon kills also count toward matching foretold tasks.`,
  unlock_recipe: () => `Unlocks a fletching recipe.`,
};

const FLAT_PLUS_EFFECTS = new Set(['potion_bonus_flat', 'queue_slot']);
const NEGATIVE_PCT_EFFECTS = new Set(['blessing_cost_pct', 'builder_discount_pct', 'input_save_pct']);

export function formatEffectValue(effect: KnownEffect, value: number): string {
  const trimmed = Number.isInteger(value) ? value.toString() : value.toString();
  if (FLAT_PLUS_EFFECTS.has(effect)) return `+${trimmed}`;
  if (NEGATIVE_PCT_EFFECTS.has(effect)) return `-${trimmed}%`;
  if (effect === 'flow_interval_reduction') return `-${trimmed}m`;
  return `+${trimmed}%`;
}

export function describeEffect(effect: KnownEffect, value: number): string {
  const describe = EFFECT_DESCRIPTIONS[effect];
  return describe ? describe(value) : `${effect}: ${formatEffectValue(effect, value)}`;
}
