# idlefantasy-dex

Track your completion in **[Idle Fantasy](https://github.com/tristinbaker/IdleFantasy)** -
quests, guilds, drops, equipment, and prestige - and see how far every goal is from done.
Projections (time to completion, items per session, XP rates) come later; see the roadmap.

> **Status:** the Completion dashboard (all 16 goal categories), the per-skill Calculator
> (all 13 Gathering/Crafting skills plus Agility), a boss Simulator, and Settings are all
> live at
> [michaelomh.github.io/idleFantasy-dex](https://michaelomh.github.io/idleFantasy-dex/). See
> [CONTRIBUTING.md](./CONTRIBUTING.md) if you'd like to help. Alternatively, you can raise
> an issue for things that found while using the app.

## Why

Idle Fantasy is a deep, offline idle RPG (23 skills, 29 dungeons, 189 quests). Completionist
players juggle a lot of "how long until X" and "what should I train next" math by hand. This
is a companion tool to do that math from the game's own data.

## What it is

- A **mobile-only PWA**, offline-first - it reads your own Idle Fantasy save export, no account, no server.
- Compares your progress against a vendored snapshot of the game's data.
- Shows how far each completion goal is from done, measured against the whole game.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, and PR expectations.

## License

idleFantasy-dex is licensed under the **GNU General Public License v3.0**. See
[LICENSE](./LICENSE).

Idle Fantasy itself is GPL-3.0, and this project matches it deliberately: it removes any
question about whether a companion app built on the game's data is a derivative work, and
keeps everything in the same license family as the project it depends on.

### Game data

This repository vendors a snapshot of Idle Fantasy's static game data - the JSON files under
`app/src/main/assets/data/` in
[tristinbaker/IdleFantasy](https://github.com/tristinbaker/IdleFantasy) - pinned to a
specific game version and refreshed by a checked-in sync script. That data remains the work
of the Idle Fantasy authors and is redistributed here under GPL-3.0, the same terms it is
published under. Vendored files are kept unmodified so they stay traceable to their source.

This project is an independent companion app. It is not affiliated with or endorsed by the
Idle Fantasy maintainers.
