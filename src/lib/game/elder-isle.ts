/**
 * Elder Isle shipped in game 1.15.0 as a second region. Its resources, recipes and
 * dungeons are merged into the same vendored JSON files as mainland content with no
 * region field, so we hide them by explicit ID list (mirrors the game's own
 * ElderContent.kt / CombatViewModel.kt) rather than by a naming convention.
 */
export const ELDER_ISLE_IDS = new Set([
  // ores.json
  'mythrite_ore',
  'abyssal_ore',
  'voidsteel_ore',
  'starforged_ore',
  // trees.json
  'coastal_pine',
  'grove_oak',
  'abyssal_tree',
  'starwood_tree',
  // fish.json
  'raw_tidepool_crab',
  'raw_grove_bass',
  'raw_lavafin',
  'raw_deepwater_ray',
  // logs.json
  'coastal_pine_log',
  'grove_oak_log',
  'abyssal_log',
  'starwood_log',
  // agility_courses.json
  'elder_coastal_run',
  'elder_grove_traverse',
  'elder_volcano_scramble',
  'elder_abyssal_ascent',
  // recipes/smithing.json
  'mythrite_bar',
  'abyssal_bar',
  'voidsteel_bar',
  'starforged_bar',
  'coastal_helm',
  'coastal_platebody',
  'coastal_platelegs',
  'coastal_boots',
  'grove_helm',
  'grove_platebody',
  'grove_platelegs',
  'grove_boots',
  'volcanic_helm',
  'volcanic_platebody',
  'volcanic_platelegs',
  'volcanic_boots',
  'elder_helm',
  'elder_platebody',
  'elder_platelegs',
  'elder_boots',
  'elder_cape',
  'elder_shield',
  'elder_signet_ring',
  'elder_amulet',
  // recipes/cooking.json
  'tidepool_crab',
  'grove_bass',
  'lavafin',
  'deepwater_ray',
  // equipment.json (elder_* and ancient_signet drop from Elder-only sources; the rest are
  // the same IDs as the smithing recipes above)
  'ancient_signet',
]);

export const ELDER_ISLE_DUNGEON_IDS = new Set(['beach_and_cliffs', 'ancient_forest', 'volcano_peak', 'abyssal_depths']);

/** raid_bosses.json entries tied to Elder Isle. sea_serpent guards the passage there and counts as Elder Isle content even though it's fought on the mainland. */
export const ELDER_ISLE_BOSS_IDS = new Set(['sea_serpent', 'last_elder']);

/** enemies.json entries only spawned in the four isle dungeons. */
export const ELDER_ISLE_ENEMY_IDS = new Set([
  'abyssal_horror',
  'void_seraph',
  'grove_stalker',
  'grove_dryad',
  'beach_marauder',
  'beach_leviathan',
  'ash_beast',
  'lava_wraith',
]);

/** pets.json entries only obtainable from Elder Isle content. */
export const ELDER_ISLE_PET_IDS = new Set([
  'abyss_wisp',
  'ancient_turtle',
  'cinder_hawk',
  'deepwater_serpent',
  'elder_familiar',
  'grove_fawn',
  'magma_salamander',
  'tidal_sprite',
]);

/**
 * The Elder Isle main quest chain - not part of any vendored JSON file. It's a hardcoded
 * 12-quest, 4-act story chain in the game's own source (data/model/ElderQuests.kt), tracked
 * against flags.elder_quests_completed. The game only ever marks a quest complete in this
 * exact order, so a save's completed set is always a prefix of this list - no need to
 * replicate the game's own progress predicates (dungeon-clear counts, inventory thresholds,
 * armor-piece ownership) just to know what's done vs. locked.
 */
export type ElderQuest = { id: string; act: string; title: string };
export const ELDER_QUEST_CHAIN: ElderQuest[] = [
  { id: 'act1_first_steps', act: 'Act I: The Landing', title: 'First Steps' },
  { id: 'act1_rowans_cache', act: 'Act I: The Landing', title: "Rowan's Cache" },
  { id: 'act1_first_cooking', act: 'Act I: The Landing', title: 'Rations for the Voyage' },
  { id: 'act2_cutting_vines', act: 'Act II: The Buried Library', title: 'Cutting the Vines' },
  { id: 'act2_library_salvage', act: 'Act II: The Buried Library', title: 'Library Salvage' },
  { id: 'act2_first_armor', act: 'Act II: The Buried Library', title: 'Match the Elders' },
  { id: 'act3_ascent', act: 'Act III: The Sealing Site', title: 'Volcano Ascent' },
  { id: 'act3_voidsteel_study', act: 'Act III: The Sealing Site', title: 'Voidsteel Study' },
  { id: 'act3_grove_gear', act: 'Act III: The Sealing Site', title: 'Grove Gear' },
  { id: 'act4_descent', act: 'Act IV: The Last Elder', title: 'Descent' },
  { id: 'act4_full_set', act: 'Act IV: The Last Elder', title: 'Assemble the Full Elder Set' },
  { id: 'act4_face_last_elder', act: 'Act IV: The Last Elder', title: 'Face the Last Elder' },
];

/**
 * Lore fragments unlocked by the Elder quest chain (game's LoreMasterScreen.kt) - one
 * prologue (always available) plus one per quest above, 13 total. Only titles are tracked
 * here; the full narrated body text isn't needed for a completion tracker.
 */
export type ElderLoreFragment = { id: string; title: string; unlockedByQuest: string | null };
export const ELDER_LORE_FRAGMENTS: ElderLoreFragment[] = [
  { id: 'lore_prologue', title: "Prologue: Rowan's Note", unlockedByQuest: null },
  { id: 'lore_1a', title: 'I.a: The Coastline Was Once Kept', unlockedByQuest: 'act1_first_steps' },
  { id: 'lore_1b', title: 'I.b: The Rock Remembers', unlockedByQuest: 'act1_rowans_cache' },
  { id: 'lore_1c', title: 'I.c: The Fish Are Old', unlockedByQuest: 'act1_first_cooking' },
  { id: 'lore_2a', title: 'II.a: The Grove Was a Garden', unlockedByQuest: 'act2_cutting_vines' },
  { id: 'lore_2b', title: 'II.b: A Ritual for Not Dying', unlockedByQuest: 'act2_library_salvage' },
  { id: 'lore_2c', title: 'II.c: The Order That Bore the Ritual', unlockedByQuest: 'act2_first_armor' },
  { id: 'lore_3a', title: 'III.a: The Peak Was Their Altar', unlockedByQuest: 'act3_ascent' },
  { id: 'lore_3b', title: 'III.b: The Alloy That Holds', unlockedByQuest: 'act3_voidsteel_study' },
  { id: 'lore_3c', title: 'III.c: The One Who Would Not Sit Down', unlockedByQuest: 'act3_grove_gear' },
  { id: 'lore_4a', title: 'IV.a: The Chamber Is Flooding', unlockedByQuest: 'act4_descent' },
  { id: 'lore_4b', title: "IV.b: The Ritual's True Cost", unlockedByQuest: 'act4_full_set' },
  { id: 'lore_4c', title: 'IV.c: Epilogue: What You Bring Back', unlockedByQuest: 'act4_face_last_elder' },
];

export const ELDER_SKILL_IDS = [
  'mining',
  'fishing',
  'woodcutting',
  'smithing',
  'cooking',
  'agility',
  'attack',
  'strength',
  'defense',
  'ranged',
  'magic',
  'hitpoints',
];

const ELDER_QUEST_IDS = new Set(ELDER_QUEST_CHAIN.map((q) => q.id));

/** Whether a progress item belongs to Elder Isle, for showing the Elder Isle badge. */
export function isElderIsleItem(categoryId: string, itemId: string): boolean {
  switch (categoryId) {
    case 'pets':
      return ELDER_ISLE_PET_IDS.has(itemId);
    case 'armoury':
    case 'inventory':
      return ELDER_ISLE_IDS.has(itemId) || ELDER_ISLE_ENEMY_IDS.has(itemId);
    case 'quests':
      return ELDER_QUEST_IDS.has(itemId);
    case 'expeditions':
      return itemId === 'elder_isle_lore';
    case 'titles':
      return itemId === 'isle_champion';
    default:
      return false;
  }
}
