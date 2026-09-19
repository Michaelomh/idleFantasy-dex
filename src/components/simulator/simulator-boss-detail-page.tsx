import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getBosses, type BossEntry } from '@/lib/progress/game-data';
import { LoadingScreen } from '@/components/loading-screen';

export function SimulatorBossDetailPage() {
  const { bossId } = useParams<{ bossId: string }>();
  const [boss, setBoss] = useState<BossEntry | null>(null);

  useEffect(() => {
    void getBosses().then((all) => setBoss((bossId && all[bossId]) || null));
  }, [bossId]);

  if (!boss) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <span className="h1">{boss.display_name}</span>
    </div>
  );
}
