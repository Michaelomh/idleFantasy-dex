# Roadmap

Companion planner for [Idle Fantasy](https://github.com/tristinbaker/IdleFantasy).

## Project infrastructure

- [x] Vite + React + TS + Tailwind + shadcn + pnpm scaffold
- [x] `vite-plugin-pwa` service worker, offline-first
- [x] GitHub Pages deploy (`deploy.yml`), CI runs typecheck + lint + `format:check`
- [ ] Hash routing for deep links (`/#/progress/bosses/123`) — GitHub Pages has no
      server-side rewrites, so path-based routing 404s on direct load/refresh of any
      non-root URL; hash routing avoids that with no `404.html` fallback hack needed

## Open source project health

- [x] CONTRIBUTING.md, issue templates
- [x] `README.md` past "early planning"

## Save ingestion (Save Source)

- [x] Save Source abstraction: manual upload (baseline) + persisted directory handle (Chrome/Edge)
- [x] `PlayerExport` → Player State parser
- [x] Multi-character ingestion — every ingest resolves to its own character slot; dashboard switches which one is in view
- [ ] onboarding screen when first start (see `/onboarding` in Navigation)
- [ ] screen for no-cached-save state (see `/no-save` in Navigation) — kept as a separate
      screen from onboarding rather than merged, since it targets a returning user who
      needs a quick reconnect, not first-time guidance

## Design system

- [x] Foundation tokens (`src/index.css`) — colour, type scale, spacing, radius, motion
- [x] Planned components: Button, Progress, Sheet, Badge, Goal card, Banner, Headers, Skill row
- [x] Theme resolution + manual light/dark toggle
- [x] Dev-only live reference pages: `/ds/foundations`, `/ds/components`
- [x] Recolored the foundation to a navy/gold palette (dark and light) matching in-game
      reference screenshots, replacing the original green-accent draft
- [x] Two-state Progress colour — blue while in progress, gold on completion — distinguished
      from open-ended XP bars, which stay gold
- [x] Cleaned up raw `var(--token)` usages in components, mapped onto shadcn's semantic
      Tailwind utilities (`bg-card`, `text-foreground`, etc.) wherever a mapping exists
- [ ] Dashboard visual layout (screens haven't been assembled yet)

## Navigation

Full navigation of the application

- [ ] `/onboarding` — first-time-only screen, shown when no save has ever been loaded;
      heavier guidance for a user new to the app. Hosts save-source selection (directory/
      manual upload), loading and error states, multi-character selection, and two
      explore options that don't require a real save: **explore with a fresh account**
      and **explore with a mock account**
- [ ] `/no-save` — shown to a returning user whose current save is missing (cache cleared,
      directory handle revoked, etc.); lower-guidance, quicker reconnect flow. Covers
      syncing the save directory and re-uploading a file — functionality `/onboarding`
      doesn't need since a first-time user has nothing to reconnect to yet
- [ ] `/` — dashboard, same screen as the dock bar's Overview tab; default landing once a
      save is loaded, skipping onboarding; entry point into each skill's detail view
      (`/skill/:skillId`)
- [ ] `/skill/:skillId` — per-skill view reachable only from the dashboard; shows bonus XP
      and any other benefits tied to that skill. Distinct from `/progress/levels`, which
      tracks prestige completion progress rather than skill bonuses
- [ ] Floating dock/nav bar, five tabs, visible once a save is loaded:
  - [ ] Overview — routes to `/` (dashboard), not a separate path
  - [ ] `/progress` — current character's completion progress; steps toward finishing the
        game. Category names and points match the Completion dashboard section.
        **Seasonal events, Builder's Workshop, Grand Monument, and Infinity Tower** have
        no drill-down, so they render as plain entries on this page, not separate routes
        (Infinity Tower also has a distinct, combat-focused screen at
        `/simulator/infinity-tower`). Categories with a drill-down each get their own
        route:
    - [ ] `/progress/quests`
    - [ ] `/progress/guilds`
    - [ ] `/progress/bosses`
    - [ ] `/progress/bosses/:bossId` — stats and unique drops for that boss
    - [ ] `/progress/armoury`
    - [ ] `/progress/levels` — prestige completion progress (see `/skill/:skillId` above
          for the separate per-skill bonus screen)
    - [ ] `/progress/pets`
    - [ ] `/progress/titles`
    - [ ] `/progress/expeditions`
    - [ ] `/progress/achievements`
    - [ ] `/progress/bestiary`
    - [ ] `/progress/inventory`
    - [ ] `/progress/heirloom-tools`
  - [ ] `/simulator` — current loadout, lets you swap gear to see resulting final stats
        and whether that loadout survives a boss attack
    - [ ] `/simulator/solo` — solo bosses list, drills down into each fight's win
          probability
      - [ ] `/simulator/solo/:bossId`
    - [ ] `/simulator/raid` — raid bosses list, drills down into each fight's win
          probability
      - [ ] `/simulator/raid/:bossId`
    - [ ] `/simulator/infinity-tower`
    - [ ] `/simulator/dungeon/:dungeonId` — per-dungeon simulation, floor by floor up to
          the boss
  - [ ] `/calculator` — overview of every calculable skill, drilling into each:
    - [ ] `/calculator/mining`
    - [ ] `/calculator/fishing`
    - [ ] `/calculator/woodcutting`
    - [ ] `/calculator/farming`
    - [ ] `/calculator/thieving`
    - [ ] `/calculator/smithing`
    - [ ] `/calculator/cooking`
    - [ ] `/calculator/fletching`
    - [ ] `/calculator/crafting`
    - [ ] `/calculator/firemaking`
    - [ ] `/calculator/runecrafting`
    - [ ] `/calculator/herblore`
    - [ ] `/calculator/construction`
    - [ ] `/calculator/workers` — optional, undecided; XP and items from inn workers, per
          skill, same 13 skills as above
      - [ ] `/calculator/workers/:skillId`
  - [ ] `/settings` — global app settings and future settings, plus an about section;
        links out to `/saves`
- [ ] `/saves` — standalone screen (outside the dock bar), reached from Settings; lists
      loaded characters/saves, lets you remove one, sync the save directory, upload a new
      save file, and shows every save-source state (loading, error, empty, synced, etc.)

## Character summary / home screen

This is the `/` dashboard / dock bar Overview tab from the Navigation section.

- [ ] Character identity: name, title, race, gender
- [ ] Combat level, total level, coins
- [ ] Quick-launch shortcuts to game locations (Shop, Inn, Guild Hall, Church, Builder's
      Workshop, Slayer Master, Carnival, Grand Monument, My House) — read-only links out;
      none of these locations are simulated or tracked by the app itself
- [ ] Character switcher entry point (for multi-character saves — see Save ingestion)

## Completion dashboard

This is the `/progress` section from Navigation — same category names and routes.

- [ ] **Quests** — one point per completed quest, **excludes daily and weekly quests**; drill-down lists completed/uncompleted with filter, sort, search (`quests.json`, 189)
- [ ] **Guilds** — drill-down shows every guild hall's queue and current level
- [ ] **Bosses** — solo and raid combined; one point per boss killed at least once, **plus** one point per unique drop; drill-down lists all bosses and remaining drops
- [ ] **Armoury** — one point per armour piece owned; drill-down filters/sorts/searches, shows where to obtain each piece and its stats (`equipment.json` 358 ∩ `seen_item_keys`)
- [ ] **Levels** — one point per prestige; drill-down shows every skill's current level/XP and how much more prestige is needed to reach the next point
- [ ] **Pets** — one point per pet owned; drill-down shows how to obtain each and its stat
      bonus (25 pets)
- [ ] **Titles** — one point per title owned; drill-down shows how to obtain each
- [ ] **Seasonal events** — one point per event; no drill-down
- [ ] **Builder's Workshop** — one point per unlock; no drill-down
- [ ] **Grand Monument** — one point each for the first four buildings, then switches to
      progress-toward-1-billion-coins for the rest; no drill-down
- [ ] **Expeditions** — one point per fully completed expedition; drill-down shows notes
      remaining per expedition and whether its special gear has been obtained
- [ ] **Achievements** — one point per achievement; drill-down shows which are missing
- [ ] **Bestiary** — one point per monster killed at least once; drill-down shows kill count
      and where to find it (`enemies.json`, ~73, `flags.enemy_kills`)
- [ ] **Infinity Tower** — one point per floor completed; no drill-down (250 floors)
- [ ] **Inventory** — one point per item ever owned; drill-down filters/sorts/searches
- [ ] **Heirloom tools** — two points per tool: one for owning it, one for reaching max
      level; drill-down shows obtained status and current level

## Calculator

This is the `/calculator` section from Navigation — same skills and routes.

Per-skill: calculates items gathered/created and XP gained for a skill, based on current
active bonuses and other Modifiers. One bullet per skill, the 13 Gathering + Crafting
skills. Combat and Support skills aren't session-based item production.

- [ ] Expected XP and items from skill
  - [ ] Mining
  - [ ] Fishing
  - [ ] Woodcutting
  - [ ] Farming
  - [ ] Thieving
  - [ ] Smithing
  - [ ] Cooking
  - [ ] Fletching
  - [ ] Crafting
  - [ ] Firemaking
  - [ ] Runecrafting
  - [ ] Herblore
  - [ ] Construction
- [ ] Expected XP and items from inn workers — optional, undecided; same 13 skills as
      above (`/calculator/workers`)

## Simulators

This is the `/simulator` section from Navigation — same categories and routes.

- [ ] Combat simulators
  - [ ] Dungeons
  - [ ] Solo bosses
  - [ ] Raid bosses
  - [ ] Infinity Tower
