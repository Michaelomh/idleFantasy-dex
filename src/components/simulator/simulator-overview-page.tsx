import { cn } from 'cn';
import { useNavigate } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button.tsx';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { StatusNotice } from '@/components/status-notice';

const SIMULATOR_SECTIONS = [
  { path: '/simulator/bosses', title: 'Bosses', wip: false },
  { path: '/simulator/infinity-tower', title: 'Infinity Tower', wip: true },
  { path: '/simulator/dungeon', title: 'Dungeon', wip: true },
];

export function SimulatorOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="h1">Simulator</h1>
      {SIMULATOR_SECTIONS.map((section) =>
        section.wip ? (
          <Popover key={section.path}>
            <PopoverTrigger className={cn(buttonVariants({ variant: 'secondary' }), 'gap-1.5 opacity-50')}>
              {section.title}
              <StatusNotice variant="wip" className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent>Planned.</PopoverContent>
          </Popover>
        ) : (
          <Button key={section.path} variant="secondary" onClick={() => navigate(section.path)}>
            {section.title}
          </Button>
        ),
      )}
    </div>
  );
}
