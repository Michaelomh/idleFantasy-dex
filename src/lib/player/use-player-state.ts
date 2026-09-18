import { useEffect, useState } from 'react';
import { getCachedSave, peekCachedSave, type PlayerState } from '@/lib/save-source';
import { isExploring, getSelectedSlot } from '@/lib/app/boot-state.ts';
import { MOCK_PLAYER_STATE } from '@/lib/player/explore-fixtures.ts';

export function usePlayerState(): PlayerState | null {
  const [playerState, setPlayerState] = useState<PlayerState | null>(() => {
    if (isExploring()) return MOCK_PLAYER_STATE;
    const identity = getSelectedSlot();
    return identity ? (peekCachedSave(identity)?.playerState ?? null) : null;
  });

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
