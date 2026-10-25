import { useNavigate } from 'react-router';
import { Castle, ChevronRight, MountainSnow, Skull, type LucideIcon } from 'lucide-react';

const SIMULATOR_SECTIONS: { path: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    path: '/simulator/bosses',
    title: 'Bosses',
    description: 'Win chance, loot and XP against bosses.',
    icon: Skull,
  },
  {
    path: '/simulator/infinity-tower',
    title: 'Infinity Tower',
    description: 'Survival chance, loot and XP on any floor.',
    icon: Castle,
  },
  {
    path: '/simulator/dungeon',
    title: 'Dungeons',
    description: 'Survival chance, kills and loot for a dungeon run.',
    icon: MountainSnow,
  },
];

export function SimulatorOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="h1">Simulator</h1>
      <div className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
        {SIMULATOR_SECTIONS.map(({ path, title, description, icon: Icon }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="flex w-full items-center gap-3 p-4 text-left active:bg-accent/40"
          >
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" />
              <span className="flex min-w-0 flex-col">
                <span className="body font-semibold">{title}</span>
                <span className="description whitespace-normal text-text-secondary">{description}</span>
              </span>
            </span>
            <span className="flex w-5 shrink-0 justify-center">
              <ChevronRight className="size-4 text-muted-foreground" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
