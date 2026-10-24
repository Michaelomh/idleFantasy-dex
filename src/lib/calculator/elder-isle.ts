import type { PlayerState } from '@/lib/save-source/types';
import { getBuildings } from '@/lib/progress/game-data';
import { formatMinSec } from '@/lib/utils/duration';
import { sigilRows } from './modifiers';
import type { ModifierRow } from './types';

/**
 * Elder Isle sessions ignore every mainland modifier (tools, pets, capes, blessings, prestige,
 * 2x XP, Chronos Spire, mainland Agility). Only the Elder skill levels matter - mirrors the game's
 * SkillSimulator.elderSessionDurationMs and PlayerRepository.isleXpMult (game 1.15.8, 28b97c6f).
 * Sapphire and Emerald Sigil stones still apply (game 37317af6); the other stones only touch
 * combat drops or coins, so they don't show up here.
 */
export function elderLevel(playerState: PlayerState, skillId: string): number {
  const levels = (playerState.raw.flags.elder_skill_levels ?? {}) as Record<string, number>;
  return levels[skillId] ?? 1;
}

function elderSessionMs(agilityLevel: number): number {
  const fraction = Math.min(Math.max(agilityLevel - 1, 0), 98) / 98;
  return Math.max(Math.round((60 - 15 * fraction) * 60000), 45 * 60000);
}

export function elderXpMultiplier(level: number): number {
  return 1 + (Math.max(level, 1) - 1) * 0.05;
}

export function applyElderXp(rawXp: number, level: number, sapphire: number): number {
  return Math.floor(rawXp * elderXpMultiplier(level) * sapphire);
}

export function elderXpRows(rawXp: number, level: number, sapphire: number): ModifierRow[] {
  return [
    { label: 'Base XP', value: Math.round(rawXp).toLocaleString() },
    {
      label: `Elder Level (${level})`,
      value: `x${elderXpMultiplier(level).toFixed(2)}`,
      info: 'On Elder Isle, XP gets +5% per Elder level above 1, using your level when the session is collected. Mainland boosts (pets, capes, blessings, prestige, 2x XP) do not apply.',
    },
    ...sigilRows(sapphire, 'XP bonus (Sapphire Sigil)'),
  ];
}

export function elderSessionLength(
  playerState: PlayerState,
  qty?: number,
): { minutes: number; breakdown: ModifierRow[] } {
  const agilityLevel = elderLevel(playerState, 'agility');
  const sessionMs = elderSessionMs(agilityLevel);
  const reduction: ModifierRow[] =
    sessionMs < 3_600_000
      ? [{ label: `Elder Agility Level (${agilityLevel})`, value: `-${formatMinSec((3_600_000 - sessionMs) / 60000)}` }]
      : [];

  if (qty === undefined) {
    return { minutes: sessionMs / 60000, breakdown: [{ label: 'Base session length', value: '60m' }, ...reduction] };
  }

  const perItemMs = Math.floor(sessionMs / 60);
  return {
    minutes: (qty * perItemMs) / 60000,
    breakdown: [
      { label: `Base craft time (${qty} x 60s)`, value: formatMinSec(qty) },
      ...(perItemMs < 60000
        ? [{ label: `Elder Agility Level (${agilityLevel})`, value: `x${(perItemMs / 60000).toFixed(2)}` }]
        : []),
    ],
  };
}

/** Artisan's Workshop still runs on the isle; the game only applies it to materials after the first one in the recipe. */
export async function artisanSaveChance(playerState: PlayerState): Promise<number> {
  const buildings = await getBuildings();
  const tier =
    ((playerState.raw.flags.town_building_tiers as Record<string, number> | undefined) ?? {}).artisans_workshop ?? 0;
  const tierData = buildings.artisans_workshop?.tiers[tier - 1] as { bonuses?: Record<string, number> } | undefined;
  return tierData?.bonuses?.secondary_material_save_chance ?? 0;
}
