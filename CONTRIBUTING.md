# Contributing

Thanks for taking a look at idleFantasy-dex. This is a small, early-stage project — the
notes below are here so a first contribution doesn't have to start with a round of
back-and-forth questions.

Everyone participating is expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Dev setup

- Node version is pinned in `.nvmrc` (currently 24), matching `package.json`'s `engines`
  field.
- Package manager is pnpm, pinned via `packageManager` in `package.json`. Use
  [Corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) rather than a
  separately installed pnpm, so you get the exact pinned version.

```sh
pnpm install
pnpm dev
```

Before opening a PR, all of these must pass — they're also what CI runs:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

`pnpm format` will fix most formatting issues in place.

## How work is tracked

This repo does **not** use GitHub Issues as its tracker. Specs and in-progress design
decisions live as local markdown under [`.scratch/`](.scratch/) — see
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) for the conventions if
you're curious how that's organized.

If you want to work on something:

- **Small, obvious fixes** (typos, a broken link, a clear bug with a clear fix) — just open
  a PR directly.
- **Anything bigger** (new behavior, a design decision, something that touches the Save
  Source or Ledger model) — open a GitHub issue first using the appropriate template so we
  can agree on direction before code gets written. It'll get folded into `.scratch/` from
  there if it needs a longer-lived spec.

## Game Data

`public/game-data/` is a vendored, unmodified snapshot of Idle Fantasy's own data files,
pinned to a specific game version — see `public/game-data/README.md`. Don't hand-edit
these files. If you think the snapshot is stale, open an issue rather than refreshing it
yourself; refreshing is a deliberate, by-hand maintainer action (see
`scripts/sync-game-data.js`).

## Pull requests

- `main` is branch-protected: PRs require the CI `check` status to pass before merging.
- Fill out the PR template's checklist honestly — it just restates the commands above.
- Keep PRs scoped to one change. If a fix reveals unrelated cleanup, mention it in the PR
  description instead of bundling it in.

## License

By contributing, you agree your contribution is licensed under the project's
[GPL-3.0 license](./LICENSE).
