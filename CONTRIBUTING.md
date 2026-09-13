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

### Testing the PWA on Android

Since this is mobile-only, use Chrome's USB port forwarding to test full PWA behavior
(service worker, install prompt) on a real Android phone during dev — no HTTPS tunnel
needed, since Chrome treats forwarded `localhost` as a secure context.

1. On your phone: Settings → About phone → tap "Build number" 7 times to unlock Developer
   Options.
2. Settings → Developer Options → enable **USB debugging**.
3. Plug the phone into your computer via USB, and tap "Allow" on the phone's prompt.
4. On your computer, open Chrome and go to `chrome://inspect#devices`.
5. Confirm the device shows up under "Devices" (accept any fingerprint prompt on the phone).
6. Click **"Port forwarding..."**, add a rule mapping a local port (e.g. `3000`) to the
   same port on the device, and enable it.
7. Start the dev server (`pnpm dev`).
8. On the phone, open Chrome and go to `http://localhost:3000`.

Use "inspect" under the device's tab on `chrome://inspect#devices` for full remote
DevTools (console, network, elements) on the phone's page.

**If the phone doesn't show up under `chrome://inspect#devices`:**

- Brave and Chrome each bundle their own DevTools/adb client, and only one can hold the
  USB debugging session at a time. Fully quit Brave (`Cmd+Q`, not just close the window)
  before debugging in Chrome.
- Confirm "Discover USB devices" is checked at the top of `chrome://inspect#devices`.

## How work is tracked

If you want to work on something:

- **Small, obvious fixes** (typos, a broken link, a clear bug with a clear fix) — just open
  a PR directly.
- **Anything bigger** (new behavior, a design decision, something that touches the Save
  Source or Ledger model) — open a GitHub issue first using the appropriate template so we
  can agree on direction before code gets written. It'll get folded into a longer-lived
  spec from there if needed.

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
