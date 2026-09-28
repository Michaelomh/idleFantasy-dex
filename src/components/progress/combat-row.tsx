import { Check } from 'lucide-react';
import { cn } from 'cn';

export function CombatRow({
  label,
  detail,
  current,
  cap,
  done,
  muted,
  onClick,
}: {
  label: string;
  detail?: string;
  current?: number;
  cap?: number;
  done: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 border-b border-border py-3 last:border-b-0',
        muted && 'opacity-50',
        onClick && 'cursor-pointer active:bg-accent/40',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="body truncate leading-tight font-normal text-white">{label}</span>
        {detail && <span className="description truncate leading-tight text-muted-foreground">{detail}</span>}
      </div>
      <div className="flex min-h-10 shrink-0 flex-col items-end justify-center">
        {done ? (
          <Check className="size-5 text-primary" strokeWidth={3} />
        ) : (
          cap != null && (
            <>
              <span className="data font-bold text-foreground">
                <span className="text-2xl leading-0">{current ?? 0}</span>
                <span className="text-xs text-muted-foreground">/{cap}</span>
              </span>
              <span className="label text-[10px] tracking-wider text-muted-foreground uppercase">Drops</span>
            </>
          )
        )}
      </div>
    </div>
  );
}
