# Roadmap

Companion planner for [Idle Fantasy](https://github.com/tristinbaker/IdleFantasy).

## Project infrastructure

- [x] Vite + React + TS + Tailwind + shadcn + pnpm scaffold
- [x] `vite-plugin-pwa` service worker, offline-first
- [x] GitHub Pages deploy (`deploy.yml`), CI runs typecheck + lint + `format:check`
- [x] Hash routing for deep links (`/#/progress/bosses/123`) - GitHub Pages has no
      server-side rewrites, so path-based routing 404s on direct load/refresh of any
      non-root URL; hash routing avoids that with no `404.html` fallback hack needed.

## Open source project health

- [x] CONTRIBUTING.md, issue templates
- [x] `README.md` past "early planning"

## Save ingestion (Save Source)

- [x] Save Source abstraction: manual upload (baseline) + persisted directory handle (Chrome/Edge)
- [x] `PlayerExport` → Player State parser
- [x] Multi-character ingestion - every ingest resolves to its own character slot; dashboard switches which one is in view
- [x] `/onboarding` - first-time-only screen, shown when no save has ever been loaded;
      heavier guidance for a user new to the app. Hosts save-source selection (directory/
      manual upload), loading and error states, multi-character selection, and two
      explore options that don't require a real save: **explore with a fresh account**
      and **explore with a mock account**
- [x] `/no-save` - shown to a returning user whose current save is missing (cache cleared,
      directory handle revoked, etc.); lower-guidance, quicker reconnect flow. Covers
      syncing the save directory and re-uploading a file - functionality `/onboarding`
      doesn't need since a first-time user has nothing to reconnect to yet. Kept as a
      separate screen from onboarding rather than merged, since it targets a returning
      user who needs a quick reconnect, not first-time guidance
- [ ] Background auto-sync on dashboard load - if a directory handle's permission is
      already `'granted'` from a prior visit, `scanBackupDir()` doesn't need a user
      gesture to re-scan (only _re-requesting_ revoked permission does), so re-syncing
      could happen silently instead of waiting for a manual "Re-sync folder" click.
      Needs a quiet failure path if permission was revoked meanwhile - fall back to the
      existing reconnect banner rather than interrupting the dashboard.

## Design system

- [x] Foundation tokens (`src/index.css`) - colour, type scale, spacing, radius, motion
- [x] Planned components: Button, Progress, Sheet, Badge, Goal card, Banner, Headers, Skill row
- [x] Theme resolution + manual light/dark toggle
- [x] Dev-only live reference pages: `/ds/foundations`, `/ds/components`
- [x] Recolored the foundation to a navy/gold palette (dark and light) matching in-game
      reference screenshots, replacing the original green-accent draft
- [x] Two-state Progress colour - blue while in progress, gold on completion - distinguished
      from open-ended XP bars, which stay gold
- [x] Cleaned up raw `var(--token)` usages in components, mapped onto shadcn's semantic
      Tailwind utilities (`bg-card`, `text-foreground`, etc.) wherever a mapping exists
- [ ] Dashboard visual layout (screens haven't been assembled yet)

## Navigation

- [x] Floating dock/nav bar, five tabs, visible once a save is loaded: Overview (`/`),
      `/progress`, `/simulator`, `/calculator`, `/settings`
- [ ] `/settings` - global app settings and future settings, plus an about section;
      links out to `/saves`
- [x] `/saves` - standalone screen (outside the dock bar), reached from Settings; lists
      loaded characters/saves, lets you remove one, sync the save directory, upload a new
      save file, and shows every save-source state (loading, error, empty, synced, etc.)
- [x] 404 page - wildcard route (`path: '*'`) under `AppLayout` for unmatched URLs;
      currently unmatched paths fall through to React Router's default error, not an
      in-app page

## Character summary / home screen (`/`)

Dock bar's Overview tab; default landing once a save is loaded, skipping onboarding.

- [ ] Character identity: name, title, race, gender
- [ ] Combat level, total level, coins
- [ ] `/skill/<name>` - per-skill view reachable only from the dashboard; shows bonus XP
      and any other benefits tied to that skill. Distinct from `/progress/levels`, which
      tracks prestige completion progress rather than skill bonuses.
- [ ] Add sync button if connected via folder and add the age of the save file

## Completion dashboard (`/progress`)

Dock bar's Progress tab; category names and points below match this list. **Seasonal
events, Builder's Workshop, Grand Monument, and Infinity Tower** have no drill-down, so
they render as plain entries on this page (Infinity Tower also has a separate,
combat-focused screen at `/simulator/infinity-tower`).

- [ ] Quests (`/progress/quests`) - one point per completed quest, excludes daily and weekly quests; drill-down lists completed/uncompleted with filter, sort, search (`quests.json`, 189)
- [ ] Guilds (`/progress/guilds`) - drill-down shows every guild hall's queue and current level
- [ ] Bosses (`/progress/bosses`, drill-down `/progress/bosses/:bossId`) - solo and combined; one point per boss killed at least once, plus one point per unique drop; drill-down lists all bosses and remaining drops, with stats and unique drops per boss
- [ ] Armoury (`/progress/armoury`) - one point per armour piece owned; drill-down filters/sorts/searches, shows where to obtain each piece and its stats (`equipment.json` 358 ∩ `seen_item_keys`)
- [ ] Levels (`/progress/levels`) - one point per prestige; drill-down shows every skill's current level/XP and how much more prestige is needed to reach the next point
- [ ] Pets (`/progress/pets`) - one point per pet owned; drill-down shows how to obtain each and its stat bonus (25 pets)
- [ ] Titles (`/progress/titles`) - one point per title owned; drill-down shows how to obtain each
- [ ] Seasonal events - one point per event; no drill-down
- [ ] Builder's Workshop - one point per unlock; no drill-down
- [ ] Grand Monument - one point each for the first four buildings, then switches to progress-toward-1-billion-coins for the rest; no drill-down
- [ ] Expeditions (`/progress/expeditions`) - one point per fully completed expedition; drill-down shows notes remaining per expedition and whether its special gear has been obtained
- [ ] Achievements (`/progress/achievements`) - one point per achievement; drill-down shows which are missing
- [ ] Bestiary (`/progress/bestiary`) - one point per monster killed at least once; drill-down shows kill count and where to find it (`enemies.json`, ~73, `flags.enemy_kills`)
- [ ] Infinity Tower - one point per floor completed; no drill-down (250 floors)
- [ ] Inventory (`/progress/inventory`) - one point per item ever owned; drill-down filters/sorts/searches
- [ ] Heirloom tools (`/progress/heirloom-tools`) - two points per tool: one for owning it, one for reaching max level; drill-down shows obtained status and current level

## Calculator (`/calculator`)

Dock bar's Calculator tab; overview of every calculable skill, drilling into each.
Per-skill: calculates items gathered/created and XP gained for a skill, based on current
active bonuses and other Modifiers. One bullet per skill, the 13 Gathering + Crafting
skills. Combat and Support skills aren't session-based item production.

- [ ] Expected XP and items from skill
  - [ ] Mining (`/calculator/mining`)
  - [ ] Fishing (`/calculator/fishing`)
  - [ ] Woodcutting (`/calculator/woodcutting`)
  - [ ] Farming (`/calculator/farming`)
  - [ ] Thieving (`/calculator/thieving`)
  - [ ] Smithing (`/calculator/smithing`)
  - [ ] Cooking (`/calculator/cooking`)
  - [ ] Fletching (`/calculator/fletching`)
  - [ ] Crafting (`/calculator/crafting`)
  - [ ] Firemaking (`/calculator/firemaking`)
  - [ ] Runecrafting (`/calculator/runecrafting`)
  - [ ] Herblore (`/calculator/herblore`)
  - [ ] Construction (`/calculator/construction`)
- [ ] Expected XP and items from inn workers (`/calculator/workers`, drill-down `/calculator/workers/:skillId`) - optional, undecided; same 13 skills as above

## Simulators (`/simulator`)

Dock bar's Simulator tab; current loadout, lets you swap gear to see resulting final
stats and whether that loadout survives a boss attack.

- [ ] Combat simulators
  - [ ] Dungeons (`/simulator/dungeon/:dungeonId`) - per-dungeon simulation, floor by floor up to the boss
  - [ ] Bosses (`/simulator/boss`) - list all bosses
    - [ ] Drill down (`/simulator/boss/:bossId`) - drills down into each fight's win probability
  - [ ] Infinity Tower (`/simulator/infinity-tower`)

## Settings

- [ ] Add experimental features switches (mainly for things that are not done yet)
- [ ] Credits to art and what not.
- [ ] Should we have a /saves or just put everything in settings
- [ ] Dark mode vs light mode switcher
