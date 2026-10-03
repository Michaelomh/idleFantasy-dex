import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from 'cn';
import type { ProgressDrop } from '@/lib/progress';

export function CombatRow({
  label,
  detail,
  current,
  cap,
  done,
  muted,
  onClick,
  drops,
  expanded,
}: {
  label: string;
  detail?: string;
  current?: number;
  cap?: number;
  done: boolean;
  muted?: boolean;
  onClick?: () => void;
  drops?: ProgressDrop[];
  expanded?: boolean;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 py-3',
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
        {drops && (
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          />
        )}
      </div>
      <AnimatePresence initial={false}>
        {drops && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col pb-3">
              {drops.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 py-1.5 pl-3">
                  <span className="body truncate">{d.label}</span>
                  <span className="data flex shrink-0 items-center gap-2 text-text-secondary">
                    {d.chance}
                    <span className="flex size-4 items-center justify-center">
                      {d.obtained && <Check className="size-4 text-fresh" />}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
