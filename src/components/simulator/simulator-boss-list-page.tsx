import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getBosses, sortBossesForDisplay, type BossEntry } from '@/lib/progress/game-data';
import { LoadingScreen } from '@/components/loading-screen';
import { ELDER_ISLE_BOSS_IDS } from '@/lib/game/elder-isle';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { ElderIsleBadge } from '@/components/elder-isle-badge';

function BossRow({ boss, onSelect }: { boss: BossEntry; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-card"
    >
      <span className="body flex-1">{boss.display_name}</span>
      {ELDER_ISLE_BOSS_IDS.has(boss.id) && <ElderIsleBadge label="Elder Isle Boss" />}
    </button>
  );
}

export function SimulatorBossListPage() {
  const navigate = useNavigate();
  const [includeElderIsle] = useIncludeElderIsle();
  const [bosses, setBosses] = useState<Record<string, BossEntry> | null>(null);

  useEffect(() => {
    void getBosses().then(setBosses);
  }, []);

  if (!bosses) {
    return <LoadingScreen />;
  }

  const visibleBosses = sortBossesForDisplay(Object.values(bosses)).filter(
    (boss) => includeElderIsle || !ELDER_ISLE_BOSS_IDS.has(boss.id),
  );
  const sections = [
    { title: 'Solo', list: visibleBosses.filter((boss) => !boss.raid) },
    { title: 'Raid', list: visibleBosses.filter((boss) => boss.raid) },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="h1">Bosses</h1>
      {sections.map(({ title, list }) => (
        <div key={title} className="flex flex-col gap-1">
          <h2 className="h3">{title}</h2>
          {list.map((boss) => (
            <BossRow key={boss.id} boss={boss} onSelect={() => navigate(`/simulator/bosses/${boss.id}`)} />
          ))}
        </div>
      ))}
    </div>
  );
}
