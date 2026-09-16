# 1. Progress category data sources

## Context

The Dashboard renders Completion for every tracked Goal (see `CONTEXT.md`). Each Goal is
computed by one function in `src/lib/progress/categories.ts`, and each draws its universe
(denominator) and its owned/done count (numerator) from different places:

- **Game Data** - static JSON fetched from `public/game-data/` via `src/lib/progress/game-data.ts`.
- **Save file** - fields read off `ps.raw.*`, the parsed Save Export.
- **Hard-coded** - a constant or threshold list in the app's own source, not derived from
  either of the above per-save or per-sync.

This mapping isn't obvious from reading the Dashboard UI, and previous per-category
mistakes (wrong denominator, miscounting seasonal/unbounded content) have come from
conflating these three sources. Recording the mapping once avoids re-deriving it by reading
all of `categories.ts` every time it's questioned, and gives future categories a checklist
of which source to pick from.

## Decision

Each Goal is documented here by which source provides its owned/done count and which
provides its universe. The "Numerator source" is the save data measured; the "Denominator
source" is the data that defines what full completion means.

| Goal               | Numerator source                                                                                                                                                                                                                        | Denominator source                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Levels & Prestige  | `flags.skill_prestige`, `skillLevels`                                                                                                                                                                                                   | `prestige_paths.json`                                                                                                                                                                              |
| Guilds             | `flags.guild_daily_tier_counts`, `questProgress`                                                                                                                                                                                        | `guild_quests.json` + `ALL_GUILDS`/`GUILD_MAX_LEVEL`, hard-coded in `game/skills.ts`                                                                                                               |
| Bosses             | `flags.enemy_kills`, `flags.seen_item_keys`                                                                                                                                                                                             | `raid_bosses.json` - 8 solo bosses plus 3 raid bosses (`obsidian_colossus`, `brood_empress`, `the_world_ender`, each flagged `"raid": true`) in the same file                                      |
| Bestiary           | `flags.enemy_kills`                                                                                                                                                                                                                     | `enemies.json`                                                                                                                                                                                     |
| Infinity Tower     | `flags.tower_best_floor`                                                                                                                                                                                                                | fixed cap of 250, hard-coded                                                                                                                                                                       |
| Armoury            | `flags.seen_item_keys`                                                                                                                                                                                                                  | `equipment.json`                                                                                                                                                                                   |
| Inventory          | `inventory`, `flags.seen_item_keys`                                                                                                                                                                                                     | `equipment.json`, `enemies.json` drop tables, `marketplace.json`, `gems.json`, `ores.json`, `logs.json`, `crops.json`, `bones.json`, `runes.json`, extended with whatever the save itself contains |
| Pets               | `pets`                                                                                                                                                                                                                                  | `pets.json`                                                                                                                                                                                        |
| Heirloom Tools     | `flags.seen_item_keys`, `flags.heirloom_xp`                                                                                                                                                                                             | `equipment.json` filtered to heirloom items                                                                                                                                                        |
| Expeditions        | `flags.skilling_dungeon_notes`                                                                                                                                                                                                          | `EXPEDITION_KEYS`, generated at sync time from `expeditions-data.generated.ts`                                                                                                                     |
| Quests             | `questProgress`                                                                                                                                                                                                                         | `quests.json`                                                                                                                                                                                      |
| Achievements       | 5 save flags (`flags.skill_prestige`, `flags.town_building_tiers`, `flags.tower_best_floor`, `flags.tower_milestones`, `flags.prestige_nodes`) plus `skillLevels`, `pets`, and the derived `totalLevel`/`combatLevel`/`questsCompleted` | derived from thresholds defined in `achievements.ts`                                                                                                                                               |
| Titles             | `flags.unlocked_titles`                                                                                                                                                                                                                 | `CHARACTER_TITLES`, hand-copied from game source in `save-source/types.ts`                                                                                                                         |
| Builder's Workshop | `flags.town_building_tiers`                                                                                                                                                                                                             | `buildings.json`                                                                                                                                                                                   |
| Grand Monument     | `flags.monument_tier`, `flags.monument_fund`                                                                                                                                                                                            | fixed formula: tier cap 4 + fund goal 1B, hard-coded                                                                                                                                               |
| Seasonal Events    | `flags.seasonal_banners_earned`                                                                                                                                                                                                         | `seasonal_events.json`, but max is `max(catalogue count, earned count)`                                                                                                                            |

Two categories intentionally deviate from "denominator strictly from Game Data":

- **Inventory** extends its denominator with any item key present in the save itself
  (from `inventory` and `flags.seen_item_keys`) that isn't already covered by
  `equipment.json`, `enemies.json`'s drop tables, `marketplace.json`, or the raw resource
  catalogues (`gems.json`, `ores.json`, `logs.json`, `crops.json`, `bones.json`,
  `runes.json`). This exists because even that combined catalogue is known to be
  incomplete - without the save-derived extension, an item a player owns could be
  impossible to reach 100% on, since it would never appear in the denominator (see the
  category's `info` string in the UI).
- **Seasonal Events** takes the max of the catalogue and the earned count, since a player
  can outrun the vendored catalogue (new seasonal events ship faster than the app re-syncs
  Game Data).

One further category intentionally deviates from a plain save-file count:

- **Titles** excludes seasonal titles (`seasonal_*`) from the count - shown for
  visibility, but not counted, since they're a new unbounded value per event and not in
  the hand-copied `CHARACTER_TITLES` catalogue.
