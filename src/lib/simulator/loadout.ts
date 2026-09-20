import type { PlayerState } from '@/lib/save-source/types';
import type { CombatStyle } from './combat-engine';

const WEAPON_SLOT_BY_STYLE: Record<CombatStyle, string> = {
  attack: 'weapon_atk',
  strength: 'weapon_str',
  ranged: 'weapon_ranged',
  magic: 'weapon_magic',
};

export const ARMOR_SLOTS = ['head', 'body', 'legs', 'boots', 'cape', 'ring', 'necklace', 'shield'] as const;

export function weaponSlotForStyle(style: CombatStyle): string {
  return WEAPON_SLOT_BY_STYLE[style];
}

export function styleForWeaponSlot(slot: string | undefined): CombatStyle {
  const match = (Object.entries(WEAPON_SLOT_BY_STYLE) as [CombatStyle, string][]).find(([, s]) => s === slot);
  return match?.[0] ?? 'attack';
}

export function armorLoadoutForStyle(playerState: PlayerState, style: CombatStyle): Record<string, string | null> {
  const loadouts = playerState.raw.flags.armor_loadouts as Record<string, Record<string, string | null>> | undefined;
  return loadouts?.[style] ?? {};
}

export function weaponForStyle(playerState: PlayerState, style: CombatStyle): string | null {
  return playerState.raw.equipped[weaponSlotForStyle(style)] ?? null;
}

export function savedArrowKey(playerState: PlayerState): string | null {
  return (playerState.raw.flags.ranged_loadout_arrow_key as string | undefined) ?? null;
}

export function savedSpellKey(playerState: PlayerState): string | null {
  return (playerState.raw.flags.magic_loadout_spell_name as string | undefined) ?? null;
}

export function savedActiveWeaponSlot(playerState: PlayerState): CombatStyle {
  return styleForWeaponSlot(playerState.raw.flags.active_weapon_slot as string | undefined);
}

export function savedHiredMercenaryIds(playerState: PlayerState): string[] {
  const hired = playerState.raw.flags.hired_mercenaries as { merc_id: string; expires_at: number }[] | undefined;
  if (!hired) return [];
  const now = Date.now();
  return hired.filter((h) => h.expires_at > now).map((h) => h.merc_id);
}
