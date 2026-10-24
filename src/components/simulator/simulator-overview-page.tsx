import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button.tsx';

const SIMULATOR_SECTIONS = [
  { path: '/simulator/bosses', title: 'Bosses' },
  { path: '/simulator/infinity-tower', title: 'Infinity Tower' },
  { path: '/simulator/dungeon', title: 'Dungeons' },
];

export function SimulatorOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="h1">Simulator</h1>
      {SIMULATOR_SECTIONS.map((section) => (
        <Button key={section.path} variant="secondary" onClick={() => navigate(section.path)}>
          {section.title}
        </Button>
      ))}
    </div>
  );
}
