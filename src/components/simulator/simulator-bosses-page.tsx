import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getBosses, type BossEntry } from '@/lib/progress/game-data';
import { LoadingScreen } from '@/components/loading-screen';

function byLevel(a: BossEntry, b: BossEntry) {
  return (a.combat_level_required ?? 0) - (b.combat_level_required ?? 0);
}

export function SimulatorBossesPage() {
  const navigate = useNavigate();
  const [bosses, setBosses] = useState<Record<string, BossEntry> | null>(null);

  useEffect(() => {
    void getBosses().then(setBosses);
  }, []);

  if (!bosses) {
    return <LoadingScreen />;
  }

  const all = Object.values(bosses);
  const solo = all.filter((b) => !b.raid).sort(byLevel);
  const raid = all.filter((b) => b.raid).sort(byLevel);

  const section = (title: string, items: BossEntry[]) => (
    <div className="flex flex-col gap-2">
      <span className="label text-text-secondary">{title.toUpperCase()}</span>
      <div className="flex flex-col gap-1">
        {items.map((boss) => (
          <div
            key={boss.id}
            onClick={() => navigate(`/simulator/bosses/${boss.id}`)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <span className="body">{boss.display_name}</span>
            <span className="label shrink-0 text-text-secondary">Lv. {boss.combat_level_required ?? '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {section('Solo Bosses', solo)}
      {section('Raid Bosses', raid)}
    </div>
  );
}
