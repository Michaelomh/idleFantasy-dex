import { Check } from 'lucide-react';
import { cn } from 'cn';
import { ElderIsleBadge } from '@/components/elder-isle-badge';

export function CollectionRow({
  label,
  detail,
  current,
  cap,
  caption,
  done,
  muted,
  elderIsle,
}: {
  label: string;
  detail?: string;
  current?: number;
  cap?: number;
  caption?: string;
  done: boolean;
  muted?: boolean;
  elderIsle?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-border py-3 last:border-b-0', muted && 'opacity-50')}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="body truncate leading-tight font-normal text-white">{label}</span>
          {elderIsle && <ElderIsleBadge />}
        </span>
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
              {caption && (
                <span className="label text-[10px] tracking-wider text-muted-foreground uppercase">{caption}</span>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
