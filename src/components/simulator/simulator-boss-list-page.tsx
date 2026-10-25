import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getBosses, sortBossesForDisplay, type BossEntry } from '@/lib/progress';
import { LoadingScreen } from '@/components/loading-screen';
import { ELDER_ISLE_BOSS_IDS } from '@/lib/game/elder-isle';
import { ContentBadge } from '@/components/content-badge';
import { ListRow } from './list-row';
import { PageHeader } from '@/components/page-header';

function BossRow({ boss, onSelect }: { boss: BossEntry; onSelect: () => void }) {
  return (
    <ListRow name={boss.display_name} onSelect={onSelect}>
      <span className="ml-auto flex items-center gap-1.5">
        {ELDER_ISLE_BOSS_IDS.has(boss.id) && <ContentBadge variant="elder-isle" label="Elder Isle Boss" alwaysShow />}
        {boss.event_key && <ContentBadge variant="seasonal" label="Seasonal Boss" />}
      </span>
    </ListRow>
  );
}

export function SimulatorBossListPage() {
  const navigate = useNavigate();
  const [bosses, setBosses] = useState<Record<string, BossEntry> | null>(null);

  useEffect(() => {
    void getBosses().then(setBosses);
  }, []);

  if (!bosses) {
    return <LoadingScreen />;
  }

  // Include Elder Isle only covers Progress, so Elder Isle bosses are always listed here.
  const visibleBosses = sortBossesForDisplay(Object.values(bosses));
  const sections = [
    { title: 'Solo', list: visibleBosses.filter((boss) => !boss.raid) },
    { title: 'Raid', list: visibleBosses.filter((boss) => boss.raid) },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeader title="Bosses" backLabel="Back to simulator" backPath="/simulator" />
      {sections.map(({ title, list }) => (
        <div key={title} className="flex flex-col gap-2">
          <h2 className="subheading px-1">{title}</h2>
          <div className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
            {list.map((boss) => (
              <BossRow key={boss.id} boss={boss} onSelect={() => navigate(`/simulator/bosses/${boss.id}`)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
