// Hand-transcribed from docs/COMBAT_RANGED_CALCULATION.md and docs/COMBAT_MAGIC_CALCULATION.md,
// which read them out of the game's Kotlin source (LoadoutPickers.kt for arrows, spells.json for
// spells). Neither arrows nor spells exist in this repo's vendored public/game-data — there's no
// JSON to derive these from directly, so (per the "game-sourced closed sets can drift" convention
// in CLAUDE.md) each gets a known-values array plus a string escape hatch, since a future game
// update could add more without this app knowing.
//
// Arrow keys are confirmed against public/game-data/recipes/fletching.json (same snake_case ids).
// Spell keys are NOT independently confirmed anywhere in this repo — no spells.json is vendored —
// so they're a best-guess snake_case of the display names in the doc, following this game's
// naming convention. Display name, level req, rune type/cost, and max hit are as documented.

export const KNOWN_ARROWS = [
  { key: 'bronze_arrow', displayName: 'Bronze Arrow', strengthBonus: 7 },
  { key: 'iron_arrow', displayName: 'Iron Arrow', strengthBonus: 10 },
  { key: 'steel_arrow', displayName: 'Steel Arrow', strengthBonus: 16 },
  { key: 'mithril_arrow', displayName: 'Mithril Arrow', strengthBonus: 22 },
  { key: 'adamantite_arrow', displayName: 'Adamantite Arrow', strengthBonus: 31 },
  { key: 'runite_arrow', displayName: 'Runite Arrow', strengthBonus: 49 },
] as const;
export type KnownArrowKey = (typeof KNOWN_ARROWS)[number]['key'] | (string & {});

export const KNOWN_SPELLS = [
  { key: 'wind_strike', displayName: 'Wind Strike', levelReq: 1, runeType: 'air_rune', runeCost: 1, maxHit: 3 },
  { key: 'water_strike', displayName: 'Water Strike', levelReq: 5, runeType: 'water_rune', runeCost: 1, maxHit: 4 },
  { key: 'wind_bolt', displayName: 'Wind Bolt', levelReq: 10, runeType: 'air_rune', runeCost: 2, maxHit: 6 },
  { key: 'earth_strike', displayName: 'Earth Strike', levelReq: 10, runeType: 'earth_rune', runeCost: 1, maxHit: 4 },
  { key: 'water_bolt', displayName: 'Water Bolt', levelReq: 15, runeType: 'water_rune', runeCost: 2, maxHit: 7 },
  { key: 'fire_strike', displayName: 'Fire Strike', levelReq: 15, runeType: 'fire_rune', runeCost: 1, maxHit: 5 },
  { key: 'wind_blast', displayName: 'Wind Blast', levelReq: 20, runeType: 'air_rune', runeCost: 3, maxHit: 10 },
  { key: 'earth_bolt', displayName: 'Earth Bolt', levelReq: 20, runeType: 'earth_rune', runeCost: 2, maxHit: 8 },
  { key: 'water_blast', displayName: 'Water Blast', levelReq: 25, runeType: 'water_rune', runeCost: 3, maxHit: 11 },
  { key: 'fire_bolt', displayName: 'Fire Bolt', levelReq: 25, runeType: 'fire_rune', runeCost: 2, maxHit: 9 },
  { key: 'mind_strike', displayName: 'Mind Strike', levelReq: 25, runeType: 'mind_rune', runeCost: 1, maxHit: 6 },
  { key: 'wind_wave', displayName: 'Wind Wave', levelReq: 30, runeType: 'air_rune', runeCost: 4, maxHit: 16 },
  { key: 'earth_blast', displayName: 'Earth Blast', levelReq: 30, runeType: 'earth_rune', runeCost: 3, maxHit: 13 },
  { key: 'water_wave', displayName: 'Water Wave', levelReq: 35, runeType: 'water_rune', runeCost: 4, maxHit: 17 },
  { key: 'fire_blast', displayName: 'Fire Blast', levelReq: 35, runeType: 'fire_rune', runeCost: 3, maxHit: 15 },
  { key: 'mind_bolt', displayName: 'Mind Bolt', levelReq: 35, runeType: 'mind_rune', runeCost: 2, maxHit: 11 },
  { key: 'chaos_strike', displayName: 'Chaos Strike', levelReq: 35, runeType: 'chaos_rune', runeCost: 1, maxHit: 7 },
  { key: 'earth_wave', displayName: 'Earth Wave', levelReq: 40, runeType: 'earth_rune', runeCost: 4, maxHit: 20 },
  { key: 'fire_wave', displayName: 'Fire Wave', levelReq: 45, runeType: 'fire_rune', runeCost: 4, maxHit: 23 },
  { key: 'mind_blast', displayName: 'Mind Blast', levelReq: 45, runeType: 'mind_rune', runeCost: 3, maxHit: 18 },
  { key: 'chaos_bolt', displayName: 'Chaos Bolt', levelReq: 45, runeType: 'chaos_rune', runeCost: 2, maxHit: 13 },
  { key: 'death_strike', displayName: 'Death Strike', levelReq: 50, runeType: 'death_rune', runeCost: 1, maxHit: 8 },
  { key: 'mind_wave', displayName: 'Mind Wave', levelReq: 55, runeType: 'mind_rune', runeCost: 4, maxHit: 27 },
  { key: 'chaos_blast', displayName: 'Chaos Blast', levelReq: 55, runeType: 'chaos_rune', runeCost: 3, maxHit: 21 },
  { key: 'death_bolt', displayName: 'Death Bolt', levelReq: 60, runeType: 'death_rune', runeCost: 2, maxHit: 15 },
  { key: 'chaos_wave', displayName: 'Chaos Wave', levelReq: 65, runeType: 'chaos_rune', runeCost: 4, maxHit: 32 },
  { key: 'blood_strike', displayName: 'Blood Strike', levelReq: 65, runeType: 'blood_rune', runeCost: 1, maxHit: 9 },
  { key: 'death_blast', displayName: 'Death Blast', levelReq: 70, runeType: 'death_rune', runeCost: 3, maxHit: 25 },
  { key: 'blood_bolt', displayName: 'Blood Bolt', levelReq: 75, runeType: 'blood_rune', runeCost: 2, maxHit: 17 },
  { key: 'death_wave', displayName: 'Death Wave', levelReq: 80, runeType: 'death_rune', runeCost: 4, maxHit: 38 },
  { key: 'blood_blast', displayName: 'Blood Blast', levelReq: 85, runeType: 'blood_rune', runeCost: 3, maxHit: 28 },
  { key: 'blood_wave', displayName: 'Blood Wave', levelReq: 95, runeType: 'blood_rune', runeCost: 4, maxHit: 44 },
] as const;
export type KnownSpellKey = (typeof KNOWN_SPELLS)[number]['key'] | (string & {});
