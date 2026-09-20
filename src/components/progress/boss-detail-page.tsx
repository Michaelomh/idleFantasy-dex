import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getBosses, type BossEntry } from '@/lib/progress/game-data';
import { LoadingScreen } from '@/components/loading-screen';
import { BossStatsPanel } from '@/components/progress/boss-stats-panel';

export function BossDetailPage() {
  const { bossId } = useParams<{ bossId: string }>();
  const playerState = usePlayerState();
  const [boss, setBoss] = useState<BossEntry | null>(null);

  useEffect(() => {
    void getBosses().then((all) => setBoss((bossId && all[bossId]) || null));
  }, [bossId]);

  if (!playerState || !boss || !bossId) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{boss.emoji}</span>
        <span className="h1">{boss.display_name}</span>
        <span className="label rounded-full border border-border px-2 py-0.5 text-text-secondary">
          {boss.raid ? 'Raid' : 'Solo'}
        </span>
      </div>
      <BossStatsPanel boss={boss} playerState={playerState} />
    </div>
  );
}
