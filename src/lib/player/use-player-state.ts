import { useEffect, useState } from 'react';
import { getCachedSave, type PlayerState } from '@/lib/save-source';
import { isExploring, getSelectedSlot } from '@/lib/app/boot-state.ts';
import { MOCK_PLAYER_STATE } from '@/lib/player/explore-fixtures.ts';

export function usePlayerState(): PlayerState | null {
  const [playerState, setPlayerState] = useState<PlayerState | null>(() => (isExploring() ? MOCK_PLAYER_STATE : null));

  useEffect(() => {
    if (isExploring()) return;

    const identity = getSelectedSlot();
    if (!identity) return;

    let cancelled = false;
    void getCachedSave(identity).then((cached) => {
      if (!cancelled) setPlayerState(cached?.playerState ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return playerState;
}
