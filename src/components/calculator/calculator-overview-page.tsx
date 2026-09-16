import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { SKILLS, CATEGORY_ORDER } from '@/lib/game/skills';
import { WipNotice } from '@/components/wip-notice.tsx';
import { StatusNotice } from '@/components/status-notice';

const CALCULATOR_SKILL_IDS = new Set(
  SKILLS.filter((s) => s.category === 'Gathering' || s.category === 'Crafting').map((s) => s.id),
).add('agility');

// TEMP: would feature as more is validated.
const SKILL_STATUS: Partial<Record<string, 'wip' | 'unvalidated' | 'unconfident'>> = {
  mining: undefined,
  fishing: 'unconfident',
  woodcutting: undefined,
  farming: 'unvalidated',
  thieving: 'wip',
  smithing: 'unvalidated',
  cooking: 'unvalidated',
  fletching: 'unvalidated',
  firemaking: 'unvalidated',
  crafting: 'unvalidated',
  runecrafting: 'unvalidated',
  herblore: 'unvalidated',
  construction: 'unvalidated',
  agility: 'unvalidated',
};

export function CalculatorOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4">
      <WipNotice />
      {CATEGORY_ORDER.filter((category) => category !== 'Combat').map((category) => {
        const skills = SKILLS.filter((s) => s.category === category && CALCULATOR_SKILL_IDS.has(s.id));
        if (skills.length === 0) return null;

        return (
          <div key={category} className="flex flex-col gap-2">
            <span className="h3">{category}</span>
            <div className="flex flex-col gap-2">
              {skills.map((skill) => {
                // TEMP: would feature as more is validated.
                const status = SKILL_STATUS[skill.id];
                return (
                  <div
                    key={skill.id}
                    onClick={() => navigate(`/calculator/${skill.id}`)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <span className="body flex items-center gap-1.5">
                      {skill.label}
                      {status && <StatusNotice variant={status} className="size-3.5" />}
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
