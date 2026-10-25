/**
 * What unlocks each lore-only dungeon (`lore_unlock_only` in dungeons.json). The game keeps
 * this in its skilling dungeon (Expedition) files, `unlock_dungeon`, which aren't vendored,
 * plus the magic bean beanstalk in FarmingRepository.kt for Cloud Kingdom.
 * Pulled from game 1.16.0 (`37317af66ee2478aa9eaea43e137e941951c45a4`).
 */
const LORE_UNLOCKS: Record<string, string> = {
  collapsed_mine: 'Expedition - Copper Caverns',
  ancient_forge: 'Expedition - Dwarven Depths',
  shadow_den: 'Expedition - Crumbling Watchtower',
  arcane_ruins: 'Expedition - Shattered Spire',
  drowned_temple: 'Expedition - Sunken Grotto',
  abyssal_ruins: 'Expedition - Abyssal Lagoon',
  rogue_sanctum: "Expedition - Thieves' Den",
  guild_of_shadows: 'Expedition - Shadow Vault',
  ancient_forest_ruins: 'Expedition - Whispering Grove',
  corrupted_sanctum: 'Expedition - Corrupted Canopy',
  cloud_kingdom: 'Magic bean - climb the beanstalk',
};

/** A dungeon added by a later game update falls back to a generic label. */
export const loreUnlockLabel = (dungeonId: string) => LORE_UNLOCKS[dungeonId] ?? 'Lore unlock';
