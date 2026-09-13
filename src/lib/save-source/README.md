# Save file field reference

A field-by-field breakdown of the Idle Fantasy save export this module parses, based on a
real export. Notes what each field is, what `validate.ts` already parses, and what's sitting there unused that maps to a planned page in `src/lib/app/routes.ts` (Progress, Simulator, Calculator, Settings).

## Keys actually read today

Everything else in this doc is reference for later. This is the exact, complete list of
save keys `validate.ts` reads right now, and what each one feeds:

| Key path                                                     | Feeds                                                                                                                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exported_at` (top-level)                                    | `PlayerState.exportedAt`                                                                                                                                                         |
| `coins` (top-level)                                          | `PlayerState.coins`                                                                                                                                                              |
| `questProgress` (top-level, array)                           | `PlayerState.questRows` (`.length`), `PlayerState.questsCompleted` (filtered by `.completed`)                                                                                    |
| `sessions` (top-level, array)                                | `PlayerState.sessions` (`.length` only)                                                                                                                                          |
| `skillLevels` (top-level, stringified)                       | `PlayerState.skills` (key count), `PlayerState.totalLevel` (sum), `PlayerState.combatLevel` (via `attack`, `strength`, `defense`, `ranged`, `magic`, `hitpoints`, `prayer` keys) |
| `inventory.carnival_ticket`                                  | `PlayerState.carnivalTickets`                                                                                                                                                    |
| `flags.character_name` (falls back to `flags.characterName`) | `PlayerState.character`                                                                                                                                                          |
| `flags.character_race`                                       | `PlayerState.race` (checked against `CHARACTER_RACES` for drift)                                                                                                                 |
| `flags.character_gender`                                     | `PlayerState.gender`                                                                                                                                                             |
| `flags.equipped_title`                                       | `PlayerState.title` (checked against `CHARACTER_TITLES` for drift)                                                                                                               |
| `flags.slayer_points`                                        | `PlayerState.slayerPoints`                                                                                                                                                       |
| `flags.enemy_kills` (object)                                 | `PlayerState.enemiesKilled` (key count only, not per-enemy)                                                                                                                      |
| `flags.seen_item_keys` (array)                               | `PlayerState.seenItems` (`.length` only)                                                                                                                                         |

Everything else in `flags`, `inventory`, `equipped`, `skillXp`, `pets`, and `farmingPatches`
is present in the save but not read by `validate.ts` yet — see the sections below for what
it is and which planned page it'd feed.

## Shape

The file is one JSON object with 12 top-level keys. Most of the interesting ones
(`skillLevels`, `skillXp`, `inventory`, `equipped`, `flags`, `pets`) are **stringified JSON**
— a JSON string that itself parses to an object/array — not nested objects directly. Only
`coins`, `questProgress`, `farmingPatches`, `sessions`, `exported_at`, and `sig` are native
JSON types already.

| Key              | Type on disk      | Parses to                                                                                                                             | Used today?                                                     |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `skillLevels`    | string → object   | `{ [skillId]: number }`, 23 skills                                                                                                    | Yes — `combatLevel`, `totalLevel`, `skills` count               |
| `skillXp`        | string → object   | `{ [skillId]: number }`, same 23 keys                                                                                                 | No                                                              |
| `inventory`      | string → object   | `{ [itemId]: number }`, ~300+ item keys in this save                                                                                  | Partially — only `inventory.carnival_ticket` is read            |
| `equipped`       | string → object   | `{ [slot]: itemId }`, 20 slots                                                                                                        | No                                                              |
| `flags`          | string → object   | catch-all bag, ~155 keys in this save (see below)                                                                                     | Partially — see flags table                                     |
| `pets`           | string → array    | `{ id: string; boost_percent: number }[]`                                                                                             | No                                                              |
| `coins`          | number            | —                                                                                                                                     | Yes — `PlayerState.coins`                                       |
| `questProgress`  | array             | `{ questId, progress, completed, completedAt }[]`                                                                                     | Yes — `questsCompleted`, `questRows` counts only, not per-quest |
| `farmingPatches` | array             | `{ patchNumber, cropType, plantedAt }[]`, 8 patches                                                                                   | No                                                              |
| `sessions`       | array             | in-progress/recent activity sessions, each with a `frames` field that is itself a **stringified JSON array** of per-minute breakdowns | Partially — only `.length`                                      |
| `exported_at`    | number (epoch ms) | —                                                                                                                                     | Yes — `PlayerState.exportedAt`                                  |
| `sig`            | string            | opaque signature/hash, not a save field to surface                                                                                    | No (and shouldn't be)                                           |

## `skillLevels` / `skillXp`

Same 23 keys in both: `mining, fishing, woodcutting, farming, agility, thieving, smithing,
cooking, fletching, crafting, firemaking, runecrafting, herblore, construction` (gathering/
artisan skills — matches `CALCULATOR_SKILLS` in `routes.ts`) and `attack, strength, defense,
ranged, magic, hitpoints, prayer, mercantile, slayer` (combat + mercantile). `combatLevel()`
in `validate.ts` already implements the OSRS-style formula off the combat subset.

## `inventory`

Flat `{ itemId: count }` map, item IDs are snake_case (`raw_chicken`, `runite_2h_sword`,
`amulet_of_strength`, seeds like `dragon_fruit_seed`, etc). This is the same item-ID
namespace as `equipped`, `pets` (partially), `flags.seen_item_keys`, `flags.locked_items`,
and the vendored `public/game-data/equipment.json` — worth cross-referencing item IDs
against that file rather than treating them as another closed set to hand-copy.

## `equipped`

20 slots: `weapon_atk, weapon_str, weapon_ranged, weapon_magic, head, body, legs, boots,
cape, ring, necklace, shield, pickaxe, axe, fishing_rod, hoe, hammer, tinderbox,
grappling_hook, frying_pan, lockpick`. Values are item IDs from the same namespace as
`inventory`. Feeds a "currently equipped" panel — not wired up yet.

## `pets`

Array of `{ id, boost_percent }` — 17 entries in this save. `id` values look like
`forge_imp`, `feather_drake`, `rock_golem`. Maps directly to `routes.ts`'s `/progress/pets`
page, unused so far.

## `flags` — the interesting bag

Everything that doesn't fit the other buckets lives here (~155 keys in this save). Grouped
by what it's for:

**Character identity** — `character_name`, `character_gender`, `character_race`,
`character_skin_tone`, `character_hair_style`, `character_hair_color`, `character_eye_style`,
`character_beard_style`, `character_beard_color`, `character_created_at`,
`character_setup_done`, `race_last_changed_at`, `ironman_race_locked`.

`character_race` on disk is lowercase (e.g. `"halfling"`), while the game's
character-creation UI (`CharacterSetupSheet.kt`) offers races capitalized
(`"Human", "Elf", "Dwarf", "Orc", "Halfling", "Gnome"`) — `CharacterRace` in `types.ts` uses
the lowercase, on-disk casing for this reason. See `CLAUDE.md`'s "Game-sourced closed sets
can drift" for why this kind of union always carries a `(string & {})` escape hatch and a
`CHARACTER_RACES` runtime array `validate.ts` checks against.

**Titles** — `equipped_title` (already parsed → `PlayerState.title`), `unlocked_titles`
(array, 12 entries here, e.g. `godslayer`, `devout`, plus at least one seasonal-event title,
`seasonal_sunspire_solstice_2026`, not in the `CHARACTER_TITLES` list pulled from
`TitleCatalog.kt` — a live example of the drift `warnOnDrift()` in `validate.ts` is meant to
surface).

**Progression / prestige** — `skill_prestige`, `prestige_points_earned`, `prestige_nodes`
(each an object keyed by skill id), `prestige_points_migrated`, `prestige_last_respec_at`,
`prestige_xp_boosts`. Maps to nothing in `routes.ts` yet; there's no `/progress/prestige`
route despite `prestige_paths.json` existing in vendored game data.

**Combat / slayer** — `active_slayer_task` (object: `enemy_key`, `target_kills`,
`kills_completed`, `xp_per_kill`, `task_points`), `slayer_points` (parsed already),
`foretelled_tasks`, `enemy_kills` (object keyed by enemy id, used already for the
`enemiesKilled` count but not per-enemy — that's the `/progress/bestiary` page's data
source), `active_boss_repeat_*`, `active_dungeon_repeat_*`.

**Dungeons / Infinity Tower** — `dungeon_runs` (object keyed by dungeon id, e.g.
`goblin_cave`, `spider_den`), `unlocked_dungeons` (array), `tower_current_floor`,
`tower_best_floor`, `tower_milestones`, `tower_xp_bonus_pct`, `tower_hp_bonus`,
`tower_coin_bonus_pct`, `dungeon_last_run_stats`, `skilling_dungeon_notes`. Feeds
`/simulator/infinity-tower` and `/simulator/dungeon`.

**Guild** — `guild_reputation`, `guild_daily_tier_counts`, `guild_daily_ids/progress/claimed`,
`guild_quest_reset_levels`. Feeds `/progress/guilds`.

**Quests (daily/weekly)** — `daily_quest_ids/progress/claimed/generated_at`,
`weekly_quest_ids/progress/claimed/generated_at`, `weekly_bonus_claimed`,
`hide_completed_quests`. Distinct from the main `questProgress` array at the top level.

**House / building** — `house` (object: `rooms`, `placements`, `storage`, `ground`,
`coord_scale`), `house_draft`, `house_blueprints`, `town_building_tiers`,
`collapsible_town_grid`, `town_grid_expanded`, `monument_tier`, `monument_fund`,
`monument_touch_day`. No route yet.

**Workers / mercenaries** — `hired_worker`, `hired_worker_2` (each: `tier`, `daily_name`,
`session_queue`), `hired_mercenaries` (array). Feeds `/calculator/workers`.

**Farming** — `last_crop_by_patch`, `farming_fertilizer`, `last_fertilizer_key`,
`magic_bean_planted` — companion data to the top-level `farmingPatches` array.

**Seasonal / carnival** — `seasonal_tokens_by_event`, `seasonal_bounty_*`,
`seasonal_minigame_*`, `seasonal_banners_earned`, `seasonal_reward_tiers_claimed`,
`seasonal_market_purchases`, plus a whole family of `carnival_*_cooldown_at` keys and
`carnival_difficulties`. Time-boxed content — highest-churn part of the save schema, expect
new keys every seasonal event.

**Bestiary / collection tracking** — `enemy_kills`, `seen_item_keys` (410 entries here,
already used only for `.length`), `locked_items` (e.g. `ancient_treasure`). Feeds
`/progress/bestiary` and `/progress/inventory`.

**Backup / app settings (not game state)** — `backup_folder_uri`, `backup_frequency`,
`last_backup_at`, `last_backup_ok`, `last_backup_error`, `theme_preference`, `font_scale`,
`daily_reset_hour`, `show_*` toggles, `compact_numbers`, `profile_layout`,
`last_seen_version_code` (useful — tells you which game version wrote this save, comparable
against `public/game-data/README.md`'s pinned version), `battery_prompt_shown`. Not
player-progress data; probably out of scope for a dex/dashboard.

**Misc** — `ironman` (bool), `player_notes` (free text the player wrote), `active_potion_key`,
`active_blessing_key`/`_expires_at`, `xp_boost_expires_at`/`_last_purchase_at`,
`heirloom_xp`, `heirloom_mirror_targets` (feeds `/progress/heirloom-tools`),
`armor_loadouts`, `ranged_loadout_arrow_key`, `magic_loadout_spell_name`,
`active_weapon_slot`, `equipped_arrows`, `equipped_runes`, `equipped_food`,
`food_eat_threshold_pct`, `current_hp`.

## `questProgress`

Array of `{ questId, progress, completed, completedAt }` — 370 rows in this save. Only
counted today (`questsCompleted`, `questRows`); per-quest detail (needed for
`/progress/quests`) isn't parsed out.

## `farmingPatches`

Array of `{ patchNumber, cropType, plantedAt }`, always 8 entries (8 patches). Unused.

## `sessions`

Array of recent/active activity sessions: `session_id`, `skill_name`, `activity_key`,
`started_at`, `ends_at`, `completed`, `is_worker_session`, `efficiency_multiplier`,
`worker_slot`, plus a `frames` field that is **itself a stringified JSON array** of
per-minute detail (xp gained, items produced, kills, combat hits, etc — this is the deepest
nesting in the whole file). Only `.length` is used today. Full per-minute detail is
probably too granular for a dashboard, but session-level summary (what's running, when it
ends) could back a "currently active" widget.

## When adding new parsed fields

Prefer deriving literal unions from a real save export (like this one) over the game's
Kotlin source where the two disagree — the `character_race` casing above is a live example
of why — and always keep the `(string & {})` escape hatch per `CLAUDE.md`.
