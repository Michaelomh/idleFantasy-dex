import type { CSSProperties } from 'react';
import { Award, ChevronRight } from 'lucide-react';
import { cn } from 'cn';

import { Progress } from '@/components/ui/progress';

export function GoalCard({
  name,
  current,
  total,
  onClick,
  className,
}: {
  name: string;
  current: number;
  total: number;
  onClick?: () => void;
  className?: string;
}) {
  const complete = total > 0 && current >= total;
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 rounded-card border border-(--border-hairline) bg-(--bg-elevated) p-4',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="h3">{name}</span>
        <ChevronRight className="size-3.5 shrink-0 text-(--text-muted)" />
      </div>

      {complete ? (
        <div className="flex items-center gap-1.5 text-(--gold)">
          <Award className="size-4" />
          <span className="label text-(--gold)">COMPLETE</span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="data">
            {current} / {total}
          </span>
          <span className="label">· {total - current} LEFT</span>
        </div>
      )}

      <Progress
        value={percent}
        max={100}
        className="w-full"
        style={complete ? ({ '--accent': 'var(--gold)', '--accent-track': 'var(--gold)' } as CSSProperties) : undefined}
      />
    </div>
  );
}
