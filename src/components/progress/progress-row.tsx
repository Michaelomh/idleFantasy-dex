import { Check, ChevronRight } from 'lucide-react';
import { cn } from 'cn';

import { Progress } from '@/components/ui/progress';
import { StatusNotice } from '@/components/status-notice';

export function ProgressRow({
  name,
  current,
  total,
  info,
  status,
  onClick,
  progressLabel,
}: {
  name: string;
  current: number;
  total: number;
  info?: string;
  status?: 'wip' | 'unvalidated' | 'unconfident' | 'info';
  onClick?: () => void;
  progressLabel?: string;
}) {
  const complete = total > 0 && current >= total;
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  const title = (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-base">{name}</span>
      {status && (
        <span onClick={(e) => e.stopPropagation()}>
          <StatusNotice variant={status} message={info} className="size-3.5" />
        </span>
      )}
    </div>
  );

  const numbers = progressLabel ? (
    <span className="data text-sm text-muted-foreground">{progressLabel}</span>
  ) : (
    <span className={cn('data shrink-0 text-sm font-bold', complete && 'text-primary')}>
      {current}
      <span className={cn(!complete && 'font-medium text-muted-foreground')}>/{total}</span>
    </span>
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 py-3.5 pr-3 pl-5',
        complete && 'border-l-2 border-l-primary bg-linear-to-r from-primary/25 to-transparent pl-[18px]',
        onClick && 'cursor-pointer active:bg-accent/40',
      )}
    >
      {complete ? (
        <>
          <div className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary shadow-[0_0_0_5px] shadow-primary/20">
            <Check className="size-4.5 text-primary-foreground" strokeWidth={3} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {title}
            <span className="label text-primary">COMPLETE</span>
          </div>
          {numbers}
        </>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            {title}
            {numbers}
          </div>
          <Progress value={percent} max={100} className="w-full" trackClassName="h-1" indicatorClassName="bg-primary" />
        </div>
      )}

      <div className="flex w-5 shrink-0 justify-center">
        {onClick && <ChevronRight className="size-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
