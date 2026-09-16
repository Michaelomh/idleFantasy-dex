# 2. Overview dashboard data sources

### Simple stats

Read straight off `PlayerState`, already resolved by `src/lib/save-source/validate.ts` -
no Game Data involved.

| Field            | Source                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Character name   | `flags.character_name` (or legacy `flags.characterName`)                                                                             |
| Title            | `flags.equipped_title`, checked against hand-copied `CHARACTER_TITLES`                                                               |
| Race             | `flags.character_race`, checked against hand-copied `CHARACTER_RACES`                                                                |
| Gender           | `flags.character_gender`                                                                                                             |
| Combat level     | computed in `validate.ts` from `skillLevels` (attack/strength/defense/ranged/magic/hitpoints/prayer) - a formula, not a stored field |
| Total level      | sum of all `skillLevels`                                                                                                             |
| Coins            | `record.coins` - top-level in the Save Export, not under `flags`                                                                     |
| Carnival tickets | `inventory.carnival_ticket`                                                                                                          |
| Slayer points    | `flags.slayer_points`                                                                                                                |
| Ironman badge    | `flags.ironman` (boolean)                                                                                                            |

### Active boosts

Computed in `src/lib/bonuses/active-boosts.ts`, purely from save flags plus one
hardcoded lookup table. No Game Data JSON is read for this section.

| Row               | Source                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global XP Boost   | `flags.xp_boost_expires_at` - shown while `> now`; magnitude is fixed at +100%, not stored                                                                                                                                          |
| Prestige XP Boost | `flags.prestige_xp_boosts` (map of skill id → expiry) - one row per skill still active; magnitude is fixed at +100%, not stored                                                                                                     |
| Church blessing   | `flags.active_blessing_key` + `flags.active_blessing_expires_at`, resolved against `XP_BLESSING_MAGNITUDE` - a **hardcoded** table in `src/lib/bonuses/blessings.ts`, hand-transcribed from the game's `assets/data/blessings.json` |

The blessing table only contains the 11 `XP`-type blessings; the other 19 (`DEFENSE`,
`COINS` types) are omitted on purpose (see Deviations). An unrecognized or non-XP
`active_blessing_key` produces no row at all - never a placeholder.

### Bonus XP / Yield by skill

Computed in `src/lib/bonuses/resolve-skill-bonuses.ts`, combining Save data, three
vendored Game Data files, and two hand-ported rule sets from the game's own Kotlin source.
The skill universe is fixed: all 23 entries in `SKILLS` (`src/lib/game/skills.ts`),
grouped by category, regardless of whether the save has touched them.

| Contributor         | Save fields                                                                                         | Game Data             | Ruleset                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prestige nodes      | `flags.skill_prestige[skill]` (auto-tier count), `flags.prestige_nodes[skill]` (purchased node ids) | `prestige_paths.json` | `src/lib/bonuses/prestige.ts` - ported from `PrestigeBoosts.kt`: sum over paths of the max active node value per effect                                                           |
| Pets                | `pets` (owned pet ids)                                                                              | `pets.json`           | `src/lib/bonuses/pets.ts` - only `effect_type === 'xp_boost'` counts; `"combat"`-scoped pets are excluded (see Deviations)                                                        |
| Capes               | `equipped.cape`, `inventory`, `flags.town_building_tiers.cape_rack`                                 | `equipment.json`      | `src/lib/bonuses/cape.ts` - ported from `resolveCapeMultiplier` in `PlayerRepository.kt`; zeroed when `flags.ironman` is true                                                     |
| Combat stat / other | same prestige-node inputs as above                                                                  | `prestige_paths.json` | `combat_stat_flat` gets its own column; every other effect key renders via the hand-ported copy table in `src/lib/bonuses/effect-copy.ts` (sourced from the game's `strings.xml`) |

`flags.ironman` is the one flag that changes the _algorithm_, not just which row appears:
it suppresses the cape contribution while leaving prestige-node and pet contributions
untouched, matching the game's own rule that earned bonuses persist for ironman accounts
but purchased ones don't apply.

## Deviations

These are deliberate scope cuts, not gaps to "fix" later without re-checking this ADR:

- **Blessing data is hardcoded, not vendored.** Only the 11 `XP`-type blessings are
  transcribed into `blessings.ts`; the app only ever surfaces the XP modifier, so the 19
  `DEFENSE`/`COINS` blessings were never worth vendoring a full `blessings.json` for.
- **Pets scoped to `"combat"` don't attach to any individual skill.** This matches the
  shipped game's own Bonuses tab exactly - its code filters pets by exact skill id and
  never expands `"combat"` to the six stat skills either, whether or not that's
  intentional upstream.
- **No per-path breakdown for prestige progress.** The save only records an aggregate
  `flags.skill_prestige` count plus which node ids were bought (`flags.prestige_nodes`) -
  there's no way to attribute "spent points" to a specific path independent of that, so
  the dashboard resolves effects directly from owned nodes rather than reconstructing a
  spend-by-path view.
- **Ironman has no separate toggle in this app.** `flags.ironman` is read once and used
  for both the badge and the cape math - there's no scenario where those two should
  disagree.
