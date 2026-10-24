// Arrow strength bonuses are Kotlin constants (ARROW_STRENGTH_BONUS in the game's
// CombatViewModel / TowerViewModel, game 1.16.0, 37317af), not in any vendored JSON. Per the
// "game-sourced closed sets can drift" convention in CLAUDE.md, a known-values array plus a
// string escape hatch. Ordered worst to best. Keys match public/game-data/recipes/fletching.json.

export const KNOWN_ARROWS = [
  { key: 'bronze_arrow', displayName: 'Bronze Arrow', strengthBonus: 7 },
  { key: 'iron_arrow', displayName: 'Iron Arrow', strengthBonus: 10 },
  { key: 'steel_arrow', displayName: 'Steel Arrow', strengthBonus: 16 },
  { key: 'mithril_arrow', displayName: 'Mithril Arrow', strengthBonus: 22 },
  { key: 'adamantite_arrow', displayName: 'Adamantite Arrow', strengthBonus: 31 },
  { key: 'runite_arrow', displayName: 'Runite Arrow', strengthBonus: 49 },
] as const;
export type KnownArrowKey = (typeof KNOWN_ARROWS)[number]['key'] | (string & {});
