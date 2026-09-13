// Known values as of game version 1.14.11
export const CHARACTER_RACES = ['human', 'elf', 'dwarf', 'orc', 'halfling', 'gnome'] as const;
export type CharacterRace = (typeof CHARACTER_RACES)[number] | (string & {});

export const CHARACTER_TITLES = [
  'master_smith',
  'head_chef',
  'master_miner',
  'master_angler',
  'master_woodcutter',
  'master_fletcher',
  'master_artisan',
  'runemaster',
  'master_herbalist',
  'master_builder',
  'devout',
  'master_thief',
  'flamekeeper',
  'slayer',
  'godslayer',
  'patron_of_the_realm',
  'warlord',
  'marksman',
  'archmage',
  'merchant_prince',
  'pathfinder',
  'master_farmer',
] as const;
export type CharacterTitle = (typeof CHARACTER_TITLES)[number] | (string & {});

export type PlayerState = {
  exportedAt: number | null;
  character: string | null;
  title: CharacterTitle | null;
  race: CharacterRace | null;
  gender: string | null;
  combatLevel: number | null;
  totalLevel: number | null;
  skills: number;
  questsCompleted: number;
  questRows: number;
  enemiesKilled: number;
  seenItems: number;
  sessions: number;
  coins: number | null;
  carnivalTickets: number | null;
  slayerPoints: number | null;
  flagsNote: string | null;
};

export type SaveSourceKind = 'file' | 'directory';

export type Arrival = {
  source: SaveSourceKind;
  fileName: string;
  fileType: string;
  at: number;
};

export type StalenessType = 'fresh' | 'aging' | 'stale' | 'future' | 'unknown';

export type Staleness = {
  type: StalenessType;
  label: string;
  ageMs: number | null;
};

export type ValidationSuccess = {
  ok: true;
  presentKeys: string[];
  filenameHint: string | null;
  playerState: PlayerState;
};

export type ValidationFailure = {
  ok: false;
  reason: string;
  presentKeys?: string[];
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

export type CachedSave = {
  playerState: PlayerState;
  arrival: Arrival;
  presentKeys: string[];
  filenameHint: string | null;
  ingestedAt: number;
};

export type IngestOutcome =
  | { kind: 'accepted'; identity: string; cached: CachedSave }
  | { kind: 'rejected'; reason: string; arrival: Arrival }
  | { kind: 'kept-cached'; identity: string; reason: string; arrival: Arrival };
