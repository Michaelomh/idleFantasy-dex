# idleFantasy-dex

A companion planner for [Idle Fantasy](https://github.com/tristinbaker/IdleFantasy), an
offline Android idle RPG. It reads a player's own progress and the game's published data,
and projects how far they are from the things they're trying to finish.

## Language

**Goal**:
A finishable objective a player is aiming at, such as "99 Fishing" or "all 189 quests".
The unit the app reasons about: projections are always projections _of a goal_.
_Avoid_: Target, objective, milestone

**Completion**:
How far a Goal has progressed toward finished, expressed as a fraction of that Goal.
Measured against everything that exists in the game - including content no longer
obtainable, and content added after the player's own game version. A missed seasonal item
leaves a Goal permanently short, and a monster the player's install does not have yet counts
as not-yet-killed. Both are correct: the denominator is the game, not the player's copy of it.
Overall completion is a roll-up across tracked Goals, never a figure in its own right.
_Avoid_: Progress, percentage, done-ness

**Player State**:
The snapshot of one character's progress: skill levels and XP, inventory, equipment,
quest progress, farming patches. The input to every projection.
_Avoid_: Save data, player data, profile

**Save Export**:
The JSON document Idle Fantasy itself writes via Settings → Export save and its scheduled
backups (the game's `PlayerExport`). The app's source of Player State.
_Avoid_: Save file, backup, dump

**Game Data**:
The game's own published static content: items, enemies, quests, XP tables, drop rates.
Identical for every player, and distinct from Player State.
_Avoid_: Static data, assets, content

**Projection**:
A forward estimate for a Goal derived from Player State plus Game Data - time to
completion, expected items per hour, XP rates.
_Avoid_: Estimate, forecast, calculation, prediction

**Ledger**:
The set of things a player has not yet obtained or finished, in a category - Game Data
minus Player State. One engine, applied per category: monsters, quests, boss drops, items.
_Avoid_: Checklist, backlog, missing list

**Dashboard**:
The single screen that renders Completion for every tracked Goal at once - one bar per
Goal, plus the overall roll-up as a header. The v1 product is the Dashboard and nothing
else. Distinct from a Ledger: a Ledger is the set of unfinished things in one category, the
Dashboard is how all of them are shown together.
_Avoid_: Home, overview, summary, report

**Save Source**:
A means of getting a Save Export into the app: a manual file upload, a persistent handle
to a synced backup folder, or later an Android reader. Interchangeable by design.
_Avoid_: Importer, connector, adapter

**Character Slot**:
One character's cached Player State, keyed by the character's name (falling back to the
game's numbered slot, then "unidentified"). Every ingest lands in its own Character Slot;
the app views one at a time. UI wording is just "character".
_Avoid_: Save slot (the game's own number, not our key), profile, account

**Explore**:
Using the app with no real Save Export loaded, on either a **fresh** (all-zero) or **mock**
(mid-game fixture) Player State. Not a Character Slot; it ends the moment a real one exists.
_Avoid_: Demo, sandbox, trial

**Session**:
A queued skilling activity that runs for a set duration, as the game itself uses the word
(`SkillSessionExport`). Never the stretch of wall-clock time a player spends in the app.
_Avoid_: Run, activity

**Play Window**:
The wall-clock stretch between a player opening and closing the game. Distinct from a
Session, and named separately so the two never blur.
_Avoid_: Session, playtime

**Modifiers**:
The values derived from Player State that scale a Projection's output - equipped tool
efficiency, pet boost percentages, prestige nodes, active XP Boosts. Scattered across the
Save Export by source; resolved into one set before any Projection runs.
_Avoid_: Boosts (the game uses that for its timed XP purchase specifically), buffs, multipliers

## Skills

23 skills, split across four categories. The category grouping matters beyond flavor - it's
why the V3 per-skill simulators cover only 13 skills (Gathering + Crafting): Support and
Combat skills aren't session-based item production, so they don't get a skill simulator of
their own - Combat is covered instead by the separate dungeon/boss simulators.

| Skill        | Category  | Description                                                                                                                                                                 |
| ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mining       | Gathering | Extract valuable ores and gems from the earth.                                                                                                                              |
| Fishing      | Gathering | Catch fish and aquatic treasures from the waters.                                                                                                                           |
| Woodcutting  | Gathering | Chop trees and gather various types of wood.                                                                                                                                |
| Farming      | Gathering | Plant and harvest crops from your farming patches.                                                                                                                          |
| Thieving     | Gathering | Pickpocket NPCs each session. Success chance depends on your level vs the target. Failed attempts stun you for a frame. Higher tiers drop rare items and large coin purses. |
| Firemaking   | Crafting  | Burn logs from your inventory to gain Firemaking XP. Each log burned also produces ashes, which can be scattered in the Prayer skill for bonus Prayer XP.                   |
| Smithing     | Crafting  | Smelt ores into bars and forge powerful metal equipment.                                                                                                                    |
| Cooking      | Crafting  | Cook raw ingredients into food that restores HP in combat.                                                                                                                  |
| Fletching    | Crafting  | Craft bows and arrows from logs and metal components.                                                                                                                       |
| Crafting     | Crafting  | Create jewellery and other crafted items from precious materials.                                                                                                           |
| Runecrafting | Crafting  | Craft magical runes from rune essence for use in spellcasting.                                                                                                              |
| Herblore     | Crafting  | Brew potions from farming herbs and dungeon reagents to boost your combat stats.                                                                                            |
| Construction | Crafting  | Build furniture using planks and nails to gain XP. Higher Construction levels let you upgrade the town's buildings for permanent bonuses.                                   |
| Agility      | Support   | Train Agility to reduce session times across all skills. Level 99 cuts 20 minutes off the hour (60 min → 40 min), with a smooth linear reduction as you level up.           |
| Mercantile   | Support   | Dispatch trade caravans along routes for coins and XP. Higher levels improve shop buy and sell prices and unlock exclusive Merchants Guild goods.                           |
| Prayer       | Support   | Bury bones dropped from combat to earn Prayer XP. Higher levels unlock stronger Church blessings.                                                                           |
| Attack       | Combat    | Improves your melee accuracy, increasing your chance to hit.                                                                                                                |
| Strength     | Combat    | Increases your maximum melee damage per hit.                                                                                                                                |
| Defense      | Combat    | Reduces the damage you take from enemy attacks.                                                                                                                             |
| Ranged       | Combat    | Attack enemies from a safe distance using a bow and arrows.                                                                                                                 |
| Magic        | Combat    | Cast powerful spells using runes. Higher levels unlock stronger spells.                                                                                                     |
| Hitpoints    | Combat    | Your total health. Higher levels let you survive longer in combat.                                                                                                          |
| Slayer       | Combat    | Receive tasks from the Slayer Master in Town.                                                                                                                               |
