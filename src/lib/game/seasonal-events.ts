import { getBosses, getDungeons, getSeasonalEvents } from '@/lib/progress/game-data';

export type SeasonalIds = {
  bosses: Set<string>;
  enemies: Set<string>;
  pets: Set<string>;
  items: Set<string>;
};

/**
 * Seasonal content, derived from the vendored JSON instead of a hand-copied list so a new
 * event is picked up on the next game-data sync: bosses and dungeons carry an `event_key`,
 * enemies are whatever those dungeons spawn, and pets/items come from the event bosses'
 * pet drops plus each event's reward tiers and night market.
 */
export async function getSeasonalIds(): Promise<SeasonalIds> {
  const [events, dungeons, bosses] = await Promise.all([getSeasonalEvents(), getDungeons(), getBosses()]);
  const eventBosses = Object.values(bosses).filter((b) => b.event_key);
  const rewards = Object.values(events).flatMap((e) => [...(e.reward_tiers ?? []), ...(e.night_market ?? [])]);
  return {
    bosses: new Set(eventBosses.map((b) => b.id)),
    enemies: new Set(
      Object.values(dungeons)
        .filter((d) => d.event_key)
        .flatMap((d) => d.enemy_spawns.map((s) => s.enemy)),
    ),
    pets: new Set([
      ...eventBosses.flatMap((b) => (b.pet ? [b.pet.id] : [])),
      ...rewards.flatMap((r) => (r.pet_id ? [r.pet_id] : [])),
    ]),
    items: new Set(rewards.flatMap((r) => Object.keys(r.items ?? {}))),
  };
}

export function isSeasonalItem(ids: SeasonalIds, categoryId: string, itemId: string): boolean {
  switch (categoryId) {
    case 'bosses':
      return ids.bosses.has(itemId);
    case 'bestiary':
      return ids.enemies.has(itemId);
    case 'pets':
      return ids.pets.has(itemId);
    case 'armoury':
    case 'inventory':
      return ids.items.has(itemId);
    case 'titles':
      return itemId.startsWith('seasonal_');
    default:
      return false;
  }
}
