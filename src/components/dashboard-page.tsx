import { useEffect, useState } from 'react';
import { getCachedSave, type PlayerState } from '@/lib/save-source';
import { isExploring, getSelectedSlot } from '@/lib/app/boot-state.ts';
import { MOCK_PLAYER_STATE } from '@/lib/player/explore-fixtures.ts';

export function DashboardPage() {
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

  if (!playerState) return null;

  const stats: { label: string; value: string | number | null }[] = [
    { label: 'Combat level', value: playerState.combatLevel },
    { label: 'Total level', value: playerState.totalLevel },
    { label: 'Coins', value: playerState.coins?.toLocaleString() ?? null },
    { label: 'Carnival tickets', value: playerState.carnivalTickets },
    { label: 'Slayer points', value: playerState.slayerPoints },
  ];

  const identity = [playerState.title, playerState.race, playerState.gender].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="h1">{playerState.character ?? 'Adventurer'}</h1>
        <p className="body text-text-secondary">{identity || 'No character details yet'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="label text-text-secondary">{label}</p>
            <p className="data text-lg">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
