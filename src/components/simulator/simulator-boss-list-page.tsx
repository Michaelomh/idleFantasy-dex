import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getBosses, type BossEntry } from '@/lib/progress/game-data';
import { LoadingScreen } from '@/components/loading-screen';

export function SimulatorBossListPage() {
  const navigate = useNavigate();
  const [bosses, setBosses] = useState<Record<string, BossEntry> | null>(null);

  useEffect(() => {
    void getBosses().then(setBosses);
  }, []);

  if (!bosses) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="h1">Bosses</h1>
      <div className="flex flex-col gap-1">
        {Object.values(bosses).map((boss) => (
          <button
            key={boss.id}
            type="button"
            onClick={() => navigate(`/simulator/bosses/${boss.id}`)}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-card"
          >
            <span className="text-xl">{boss.emoji}</span>
            <span className="body flex-1">{boss.display_name}</span>
            <span className="label rounded-full border border-border px-2 py-0.5 text-text-secondary">
              {boss.raid ? 'Raid' : 'Solo'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
