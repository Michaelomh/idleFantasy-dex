# Coding Standards

Conventions for this repo that aren't already enforced by ESLint, Prettier, or
`tsconfig.json`. Read alongside `CONTEXT.md` (domain language) - this file only covers code
style and structure.

## TypeScript

- Use `type` aliases, not `interface`. Only reach for `interface` when the type needs
  `extends`-based inheritance or declaration merging.
- Import via the `@/*` path alias (`@/lib/...`, `@/components/...`), never relative
  `../../` paths.
- No default exports. Every module exports named bindings.

## Styling

- Don't reach for arbitrary-value syntax on a CSS custom property (`text-(--text-secondary)`,
  `bg-(--bg-elevated)`) when a real Tailwind utility already maps to it - use the semantic
  utility class instead (`text-secondary`, `bg-card`). Check the `@theme inline` block in
  `src/index.css` for the `--color-*` → custom-property mapping.
- If no utility maps to a CSS variable yet, add the `--color-*` mapping in `src/index.css`
  rather than reaching for the arbitrary-value escape hatch.
- Component variants (e.g. button, toggle) use `class-variance-authority` (`cva`), following
  `src/components/ui/button.tsx`.

## Game-sourced closed sets

Some TS union types (e.g. `CharacterRace`, `CharacterTitle` in `src/lib/save-source/types.ts`)
are hand-copied from Idle Fantasy's Kotlin source, not derived from the vendored JSON. The
game can add new values in any update, so:

- Always add an escape hatch (`| (string & {})`) instead of a closed literal type - a save
  with an unrecognized value must not fail to parse.
- Derive literal values from a real save export, not the game's UI source - they can
  disagree (e.g. `"Halfling"` in the character-creation UI vs `"halfling"` in
  `flags.character_race`).
- Export known values as a runtime array (`CHARACTER_RACES`, `CHARACTER_TITLES`) and derive
  the union from it with `(typeof ARRAY)[number] | (string & {})`, instead of writing the
  literals twice.
- Pass the parsed value through `warnOnDrift()` in `validate.ts` - a dev-only warning
  tagged `[game-data-drift]` that never fails the save, just surfaces drift. Grep for
  `[game-data-drift]` to find every place this check runs.
- When re-deriving one of these lists from a newer game checkout, note the game version it
  was pulled from as a comment above the type (format: the "Pinned version" table in
  `public/game-data/README.md`).

Other closed sets likely to drift the same way:

- Quest IDs / quest categories
- Achievement IDs
- Pet IDs and pet rarity tiers
- Equipment slot names and equipment IDs
- Boss IDs (solo, raid, infinity tower, dungeon)
- Skill IDs (`SESSION_CALCULATORS` in `src/lib/calculator/skills/index.ts`, and the
  `/calculator/*` routes in `src/lib/app/routes.ts`)
- Prestige path IDs
- Guild names/ranks
- Seasonal event IDs
- Currency types (coins, carnival tickets, slayer points, and any new ones added later)
- Flag/save-schema keys read in `src/lib/save-source/validate.ts` - a game update can rename
  or add `flags.*` keys the parser doesn't know about yet

## Comments

Default to no comments. Only write one when the WHY is non-obvious - a hidden constraint, a
workaround for a specific bug, or behavior that would surprise a reader. Don't explain WHAT
the code does; a well-named function or variable already does that.

Write a comment for:

- **Game provenance** - the Kotlin file/function a port mirrors, and the game version or commit
  it was pulled from (e.g. the header of `combat-engine.ts`). This is what you diff against on
  the next game sync.
- **Game rules the code can't show** - ordering, caps and exceptions that look arbitrary
  without the game's source (`// Death is checked before eating, so food cannot revive a
player at 0 HP.`).
- **Deliberate deviations** - where we override vendored data or skip a game mechanic on
  purpose (the farming cape's 2x in `cape.ts`, `// Ignoring flow-state` in `modifiers.ts`).
- **Platform / framework gotchas** - browser, React or storage behavior a reader wouldn't
  expect (the layout-effect timing in `use-scroll-restoration.ts`, IndexedDB eviction in
  `ingest.ts`). An empty `catch` always gets one saying why swallowing is safe.
- **A value's meaning when it's set far from where it's declared** - e.g. `runes: null` means
  unlimited, but that `null` is decided in `resolve-inputs.ts`, not next to the type.

Don't write a comment for:

- **Anything readable from the next few lines** - restating a function name
  (`/** Whether a progress item belongs to Elder Isle */` on `isElderIsleItem`), a prop that's
  plainly optional, or a tri-state like `undefined` = loading / `null` = not found when the
  initializer and the `=== null` check are on the same screen.
- **Section labels** - `// PWA Loading Screen`, `/* motion */`. If a block needs a label,
  extract it into a named function or component.
- **Cross-references to other UI** - "Same icon as the Elder Isle badge", "spaced like the
  Settings rows", "the Calculator's filter pill". They don't keep anything in sync and go stale
  silently. If two things must match, share a constant instead.
- **Where something is used** - "switch on the Calculator, Progress and Dungeons pages",
  "Goal card names, Settings group titles". The list is wrong the moment a new caller is added;
  grep answers it accurately.
- **Commented-out code** - delete it; git history keeps it.

When the same comment would be needed at every call site, move it once onto the thing being
called (e.g. the `[key]` rule on `useScrollRestoration`, not each page that calls it).

## Error handling

Async UI actions (button clicks, syncs) follow the pattern in `handleSync`
(`dashboard-page.tsx`): `try { ... } finally { setLoading(false) }`, with a local error
`useState` surfaced inline in the UI. There's no error boundary, no global error store, and
no toast-on-error - an error is handled at the call site that produced it, not bubbled up.

## State & data fetching

- No data-fetching library (React Query, SWR, Apollo). Async reads are plain `lib/*`
  functions called from a `useEffect` or an event handler, writing the result into local
  `useState`.
- No global state library (Redux, Zustand, Jotai, Recoil). State is page-local; share it by
  passing props or lifting it one level, not by reaching for a store.

## Performance

Lazy-load rarely-used or dev-only routes with `lazy: () => import(...)` (see the `/ds/*`
routes in `main.tsx`) rather than bundling them into the main chunk - this is a PWA where
install size matters.

## Architecture

- Each Dashboard Goal is computed by one function in `src/lib/progress/categories.ts`. When
  adding or changing a Goal, record its numerator/denominator data sources in
  `docs/adr/0001-progress-category-data-sources.md` - see that ADR for the existing mapping
  and rationale.
- Domain terms (Goal, Completion, Player State, Save Export, Projection, Ledger, etc.) are
  defined in `CONTEXT.md`. Use them consistently; the "Avoid" list per term calls out the
  near-synonyms not to use.

## File architecture

- File names are kebab-case (`skill-bonus-row.tsx`, `use-player-state.ts`).
- Route-level components live in `src/components/` and are suffixed `-page.tsx`
  (`dashboard-page.tsx`, `settings-page.tsx`, `onboarding-page.tsx`). Non-route components
  have no suffix (`skill-bonus-row.tsx`, `loadout-section.tsx`).
- Feature areas with more than one route get their own subfolder under `src/components/`
  (`components/progress/`); a single-file feature stays flat.
- `src/components/ui/` holds shadcn-managed primitives (`button.tsx`, `sheet.tsx`,
  `tooltip.tsx`, ...). Treat these as vendored: prefer composing them over editing their
  internals, and match their existing shape (`cva` variants, `forwardRef`-free function
  components) if you add a new one.
- `src/lib/` is organized by domain area (`bonuses/`, `progress/`, `save-source/`, `game/`,
  `player/`, `app/`), not by technical layer. A subfolder with more than one internal file
  gets an `index.ts` barrel that re-exports its public surface explicitly (named, not
  `export *`, except `save-source/index.ts` re-exporting `types.ts` wholesale) - see
  `lib/bonuses/index.ts`. Today that's `bonuses/`, `calculator/`, `progress/` and
  `save-source/`.
  - Components import from the folder (`@/lib/bonuses`), never from an internal file inside it
    (`@/lib/bonuses/resolve-skill-bonuses`). If a component needs something the barrel doesn't
    export, add it to the barrel.
  - Inside `src/lib/`, a module may import another domain's internal file directly
    (`@/lib/progress/game-data`, `@/lib/save-source/types`). Going through a barrel there pulls
    in the whole folder and invites import cycles between domains.
  - Folders without a barrel (`simulator/`, `game/`, `hooks/`, `utils/`, `app/`, `player/`) are
    imported file by file.

## Testing

There is no test suite and no test framework installed in this repo (`package.json` has no
`vitest`/`playwright` dependency, and `src/` has no `*.test.*`/`*.spec.*` files).
Correctness currently rests on `pnpm typecheck`, `pnpm lint`, and manual verification. Don't
assume a testing convention that isn't here - if you introduce a framework, add its
conventions to this section rather than guessing at them in advance.

- Testing might be added in the future.
