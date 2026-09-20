# Vendored Game Data - third-party, do not edit

These JSON files are a pinned snapshot of Idle Fantasy's static game data, copied
**unmodified** from [tristinbaker/IdleFantasy](https://github.com/tristinbaker/IdleFantasy)
(`app/src/main/assets/data/`) and redistributed under GPL-3.0, the same terms the game
publishes them under.

They live in `public/` so Vite serves and ships them byte-for-byte with no copy step.
The app fetches them lazily at runtime; they are never bundled and never block first paint.

## Pinned version

| | |
| --- | --- |
| Game version | 1.14.13 (`version_code` 149004) |
| Upstream commit | `4b3e1f5bd3111beab2889257a0aa4add8d7d9fbe` |

`manifest.json` is the source of truth: it records the version, the upstream commit, and a
sha256 for every file.

`dungeons.json` is the one exception: the game has no single dungeons file - it discovers
combat dungeons by listing its `dungeons/*.json` directory at runtime. `sync-game-data.js`
mirrors that scan and writes one merged file here (not hash-verified, regenerated each sync,
review its diff like any other refresh).

## Refreshing

Run `pnpm sync-game-data --source <local IdleFantasy checkout>` by hand, then review the
diff before committing. `pnpm verify-game-data` re-hashes these files against the manifest
(no checkout, no network) and is safe to run in CI. Tooling may *report* drift; it must
never update this snapshot automatically - refreshing is always a deliberate, by-hand
maintainer action.
