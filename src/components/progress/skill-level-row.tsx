import { Check } from 'lucide-react';
import { cn } from 'cn';
import { Progress } from '@/components/ui/progress';

export function SkillLevelRow({
  icon,
  label,
  level,
  current,
  cap,
  done,
  showFraction = true,
}: {
  icon?: string;
  label: string;
  level?: number;
  current: number;
  cap: number;
  done: boolean;
  showFraction?: boolean;
}) {
  const percent = cap > 0 ? Math.min(100, (current / cap) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-3">
      {icon && (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card">
          <img src={icon} alt="" className="size-8" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="body font-normal">{label}</span>
          {level != null && (
            <span className={cn('label rounded-sm bg-muted p-1 text-[10px] text-muted-foreground')}>LVL {level}</span>
          )}
        </div>
        <Progress value={percent} trackClassName="h-1.5" indicatorClassName="bg-primary" />
      </div>
      <div className="mt-2 flex w-10 shrink-0 items-center justify-center">
        {done ? (
          <Check className="size-5 text-primary" strokeWidth={3} />
        ) : showFraction ? (
          <span className="data font-bold text-foreground">
            <span className="text-2xl">{current}</span>
            <span className="text-xs text-muted-foreground">/{cap}</span>
          </span>
        ) : (
          <div className="flex flex-col items-center leading-tight">
            <span className="data text-xl leading-6 text-foreground *:font-bold">{Math.max(0, cap - current)}</span>
            <span className="label text-[10px] text-muted-foreground">left</span>
          </div>
        )}
      </div>
    </div>
  );
}
