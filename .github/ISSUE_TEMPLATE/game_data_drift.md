---
name: Game data drift
about: Idle Fantasy has shipped a new version and the vendored data snapshot may be stale
title: 'Game data drift: version <old> -> <new>'
labels: game-data
assignees: ''
---

## Versions

- Vendored snapshot version (see `public/game-data/README.md`):
- Current upstream version:

## What changed upstream

<!-- Run `pnpm sync-game-data --source <local IdleFantasy checkout>` against the new
version and describe the diff — new enemies, quests, equipment, etc. A bare version bump
with no diff isn't actionable; see the "accept drift, don't automate it" rule in
.scratch/v1-spec/issues/09-stack-and-hosting.md. -->

## Suggested action

<!-- Refreshing the snapshot is a deliberate, by-hand maintainer decision, not something
this issue should trigger automatically. -->
