import {
  CHARACTER_RACES,
  CHARACTER_TITLES,
  type CharacterRace,
  type CharacterTitle,
  type PlayerState,
  type ValidationResult,
} from './types';

const ENVELOPE_KEYS = [
  'skillLevels',
  'skillXp',
  'inventory',
  'equipped',
  'flags',
  'pets',
  'coins',
  'questProgress',
  'farmingPatches',
  'sessions',
  'exported_at',
  'sig',
];
const REQUIRED_KEYS = ['skillLevels', 'inventory', 'flags', 'questProgress', 'exported_at'];

const FILENAME_HINT_RE = /^fantasyidler_(auto|save)_/;

export function validate(text: string, fileName: string): ValidationResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (err) {
    return { ok: false, reason: 'Not JSON at all — ' + (err as Error).message };
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, reason: 'JSON, but not an object' };
  }

  const record = doc as Record<string, unknown>;
  const present = ENVELOPE_KEYS.filter((k) => k in record);
  const missing = REQUIRED_KEYS.filter((k) => !(k in record));
  if (missing.length) {
    return {
      ok: false,
      reason: 'JSON object, but not an Idle Fantasy save — missing ' + missing.join(', '),
      presentKeys: present,
    };
  }

  let flags: Record<string, unknown> = {};
  let flagsNote: string | null = null;
  try {
    flags =
      typeof record.flags === 'string'
        ? (JSON.parse(record.flags) as Record<string, unknown>)
        : ((record.flags as Record<string, unknown>) ?? {});
  } catch (err) {
    flagsNote = 'flags present but did not parse: ' + (err as Error).message;
  }

  const questProgress = Array.isArray(record.questProgress) ? record.questProgress : [];
  const skillLevels = (parseMaybeString(record.skillLevels) ?? {}) as Record<string, unknown>;
  const skillXp = (parseMaybeString(record.skillXp) ?? {}) as Record<string, unknown>;
  const inventory = (parseMaybeString(record.inventory) ?? {}) as Record<string, unknown>;
  const equipped = (parseMaybeString(record.equipped) ?? {}) as Record<string, unknown>;
  const petsRaw = (parseMaybeString(record.pets) ?? []) as unknown[];
  const enemyKills = (flags.enemy_kills ?? {}) as Record<string, unknown>;
  const seenItems = (flags.seen_item_keys ?? []) as unknown[];

  const playerState: PlayerState = {
    exportedAt: normaliseEpoch(record.exported_at),
    character: (flags.character_name as string) || (flags.characterName as string) || null,
    title: warnOnDrift('character title', flags.equipped_title as CharacterTitle, CHARACTER_TITLES),
    race: warnOnDrift('character race', flags.character_race as CharacterRace, CHARACTER_RACES),
    gender: (flags.character_gender as string) || null,
    combatLevel: combatLevel(skillLevels),
    totalLevel: totalLevel(skillLevels),
    skills: Object.keys(skillLevels).length,
    questsCompleted: questProgress.filter((q) => q && typeof q === 'object' && (q as Record<string, unknown>).completed)
      .length,
    questRows: questProgress.length,
    enemiesKilled: Object.keys(enemyKills).length,
    seenItems: seenItems.length,
    sessions: Array.isArray(record.sessions) ? record.sessions.length : 0,
    coins: typeof record.coins === 'number' ? record.coins : null,
    carnivalTickets: typeof inventory.carnival_ticket === 'number' ? inventory.carnival_ticket : null,
    slayerPoints: typeof flags.slayer_points === 'number' ? flags.slayer_points : null,
    ironman: flags.ironman === true,
    flagsNote,
    raw: {
      skillLevels: numberRecord(skillLevels),
      skillXp: numberRecord(skillXp),
      inventory: numberRecord(inventory),
      equipped: stringOrNullRecord(equipped),
      pets: petsRaw
        .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
        .map((p) => ({
          id: String(p.id ?? ''),
          boostPercent: typeof p.boost_percent === 'number' ? p.boost_percent : undefined,
        })),
      questProgress: questProgress
        .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
        .map((q) => ({ ...q, questId: String(q.questId ?? ''), completed: !!q.completed })),
      flags,
    },
  };

  return {
    ok: true,
    presentKeys: present,
    filenameHint: FILENAME_HINT_RE.test(fileName || '') ? fileName : null,
    playerState,
  };
}

export function warnOnDrift<T extends string>(
  label: string,
  value: T | '' | undefined,
  known: readonly string[],
): T | null {
  if (!value) return null;
  if (import.meta.env.DEV && !known.includes(value)) {
    console.warn(`[game-data-drift] unrecognized ${label}: "${value}" — the game may have added a new one.`);
  }
  return value;
}

function numberRecord(v: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === 'number') out[k] = val;
  return out;
}

function stringOrNullRecord(v: Record<string, unknown>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === 'string' || val === null) out[k] = val;
  return out;
}

function parseMaybeString(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function level(skillLevels: Record<string, unknown>, skill: string): number {
  const v = skillLevels[skill];
  return typeof v === 'number' ? v : 0;
}

function totalLevel(skillLevels: Record<string, unknown>): number | null {
  if (Object.keys(skillLevels).length === 0) return null;
  return Object.values(skillLevels).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0);
}

function combatLevel(skillLevels: Record<string, unknown>): number | null {
  if (Object.keys(skillLevels).length === 0) return null;
  const attack = level(skillLevels, 'attack');
  const strength = level(skillLevels, 'strength');
  const defense = level(skillLevels, 'defense');
  const ranged = level(skillLevels, 'ranged');
  const magic = level(skillLevels, 'magic');
  const hitpoints = level(skillLevels, 'hitpoints');
  const prayer = level(skillLevels, 'prayer');

  const base = 0.25 * (defense + hitpoints + Math.floor(prayer / 2));
  const melee = 0.325 * (attack + strength);
  const rangedCombat = 0.325 * Math.floor(ranged * 1.5);
  const magicCombat = 0.325 * Math.floor(magic * 1.5);

  return Math.floor(base + Math.max(melee, rangedCombat, magicCombat));
}

function normaliseEpoch(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e11 ? n * 1000 : n;
}
