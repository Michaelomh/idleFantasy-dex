import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';

import { Progress } from '@/components/ui/progress';
import { StatusNotice } from '@/components/status-notice';

export function GoalCard({
  name,
  current,
  total,
  info,
  status,
  onClick,
  className,
  progressLabel,
}: {
  name: string;
  current: number;
  total: number;
  info?: string;
  status?: 'wip' | 'unvalidated' | 'unconfident' | 'info';
  onClick?: () => void;
  className?: string;
  progressLabel?: string;
}) {
  const complete = total > 0 && current >= total;
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 rounded-card border bg-card p-4',
        complete ? 'border-primary' : 'border-border',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h3 truncate">{name}</span>
          {status && (
            <span onClick={(e) => e.stopPropagation()}>
              <StatusNotice variant={status} message={info} className="size-3.5" />
            </span>
          )}
        </div>
        {onClick && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
      </div>

      <div className="flex items-baseline justify-between gap-1.5">
        <span className={cn('data', complete && 'text-primary')}>{progressLabel ?? `${current} / ${total}`}</span>
        <span className={cn('label', complete && 'text-primary')}>
          {complete ? 'COMPLETE' : `· ${total - current} LEFT`}
        </span>
      </div>

      <Progress value={percent} max={100} className="w-full" complete={complete} />
    </div>
  );
}
