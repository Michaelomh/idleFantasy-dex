#!/usr/bin/env node
// Dev helper - writes throwaway sample Save Exports for manually testing Save Source
// ingestion (manual upload + directory handle), ported from the resolved
// prototype/save-source ticket's make-samples.py. Output is gitignored (*.local).
//
// Usage: node scripts/make-save-samples.js

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'save-samples.local');
mkdirSync(OUT, { recursive: true });

const NOW = Date.now();
const HOUR = 3600 * 1000;

function save({ character = 'Kyrasoar', hoursAgo = 1, kills = 41, seen = 120, quests = 96 } = {}) {
  return {
    skillLevels: JSON.stringify({ fishing: 71, mining: 55, woodcutting: 60 }),
    skillXp: JSON.stringify({ fishing: 814000 }),
    inventory: JSON.stringify({ raw_shark: 812 }),
    equipped: JSON.stringify({ weapon: 'rune_sword' }),
    flags: JSON.stringify({
      character_name: character,
      last_seen_version_code: 149002,
      enemy_kills: Object.fromEntries(Array.from({ length: kills }, (_, i) => [`enemy_${i}`, i + 1])),
      seen_item_keys: Array.from({ length: seen }, (_, i) => `item_${i}`),
    }),
    pets: JSON.stringify(['pet_rock']),
    coins: 1204553,
    questProgress: Array.from({ length: 189 }, (_, i) => ({
      questId: `q${i}`,
      progress: 1,
      completed: i < quests,
      completedAt: 0,
    })),
    farmingPatches: [],
    sessions: [{ skill: 'fishing', frames: 60 }],
    exported_at: NOW - hoursAgo * HOUR,
    sig: 'deadbeef',
  };
}

const groups = {
  // Single-user folder: the auto-backup trap (no extension) + the manual export path.
  'single-user': {
    fantasyidler_auto_1_Kyrasoar: save({ hoursAgo: 1 }),
    'fantasyidler_save_1_Kyrasoar.json': save({ hoursAgo: 0.5 }),
  },
  // Multi-user folder: two identified characters in different slots, to exercise the
  // "prompt once, persist the chosen one" rule.
  'multi-user': {
    fantasyidler_auto_1_Kyrasoar: save({ character: 'Kyrasoar', hoursAgo: 1, kills: 41 }),
    fantasyidler_auto_2_Bramblefoot: save({ character: 'Bramblefoot', hoursAgo: 2, kills: 12 }),
  },
  // Validation testing: rejects, an empty slot, and a same-slot older export.
  validation: {
    not_a_save: JSON.stringify({ version: 3, todos: [] }),
    stale_fantasyidler_auto_1_Kyrasoar: save({ hoursAgo: 200 }),
    fantasyidler_auto_3_unnamed: save({ character: '', hoursAgo: 1, kills: 0, seen: 0, quests: 0 }),
  },
};

for (const [group, files] of Object.entries(groups)) {
  const dir = path.join(OUT, group);
  mkdirSync(dir, { recursive: true });
  for (const [name, doc] of Object.entries(files)) {
    const text = typeof doc === 'string' ? doc : JSON.stringify(doc);
    writeFileSync(path.join(dir, name), text);
    console.log('wrote', path.join(dir, name));
  }
}

console.log(`\nSamples ready under ${OUT}`);
console.log('Use "single-user" or "multi-user" with the directory handle picker; upload');
console.log('individual files from any folder to test manual upload and validation.');
