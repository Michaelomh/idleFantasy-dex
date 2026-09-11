import { Star } from 'lucide-react';
import { cn } from 'cn';

import { Progress } from '@/components/ui/progress';

type SkillRowProps = {
  skillName: string;
  meta: string;
  percent: number;
} & ({ kind: 'level'; level: number; nearCap?: boolean } | { kind: 'prestige' });

export function SkillRow(props: SkillRowProps) {
  const { skillName, meta, percent } = props;
  return (
    <div className="flex items-center gap-3 border-t border-(--border-hairline) px-3 py-5">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-(--border-hairline)"
        style={{ background: 'var(--bg-overlay)' }}
      >
        {props.kind === 'prestige' ? (
          <Star className="size-4 text-(--accent)" fill="var(--accent)" />
        ) : (
          <span
            className={cn('data', props.nearCap ? 'text-(--accent)' : 'text-(--text-primary)')}
            style={{ fontSize: '13px', fontWeight: 700 }}
          >
            {props.level}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="button-label truncate">{skillName}</span>
          <span className="label shrink-0">{meta}</span>
        </div>
        <Progress value={percent} max={100} trackClassName="h-1" />
      </div>
    </div>
  );
}
