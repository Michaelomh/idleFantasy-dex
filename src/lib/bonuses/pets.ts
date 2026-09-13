import type { PlayerState } from '@/lib/save-source/types';
import type { PetEntry } from '@/lib/progress/game-data';

export function petXpPctForSkill(playerState: PlayerState, skillId: string, pets: Record<string, PetEntry>): number {
  const ownedIds = new Set(playerState.raw.pets.map((p) => p.id));
  let total = 0;
  for (const id of ownedIds) {
    const pet = pets[id];
    if (!pet || pet.effect_type !== 'xp_boost' || !pet.boost_percent) continue;
    if (pet.boosted_skill === 'all' || pet.boosted_skill === skillId) total += pet.boost_percent;
  }
  return total;
}
