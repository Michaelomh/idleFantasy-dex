import type { ReactNode } from 'react';
import { cn } from 'cn';

/** [sub] is a smaller second line under the value. */
export type StatRow = { label: string; value: ReactNode; sub?: string; hint?: string };

/**
 * Bordered label / value list. [plain] renders values as body text that may wrap, for names
 * (gear) rather than numbers; numbers never wrap.
 */
export function StatRows({ rows, title, plain = false }: { rows: StatRow[]; title?: string; plain?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {title && <span className="label text-text-secondary">{title}</span>}
      <div className="flex flex-col rounded-md border border-border">
        {rows.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className={cn('flex items-start justify-between gap-4 px-3 py-2.5', i > 0 && 'border-t border-border')}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="body text-sm">{r.label}</span>
              {r.hint && <span className="body text-xs text-text-secondary">{r.hint}</span>}
            </span>
            <span className={cn('flex flex-col items-end gap-0.5 text-right', plain ? 'max-w-[65%]' : 'shrink-0')}>
              <span className={plain ? 'body text-sm' : 'data whitespace-nowrap'}>{r.value}</span>
              {r.sub && <span className="data text-xs whitespace-nowrap text-text-secondary">{r.sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A value with its 5th to 95th percentile range in lighter text beside it. */
export type RangedValue = { value: string; range?: string; valueClassName?: string };

function Ranged({ value, range, valueClassName }: RangedValue) {
  return (
    <span className="whitespace-nowrap">
      <span className={cn('data font-semibold', valueClassName)}>{value}</span>
      {range && <span className="body text-text-secondary"> ({range})</span>}
    </span>
  );
}

export type CompactRow = RangedValue & { label: string; hint?: string };

/** Borderless summary list: label on the left, value and range on the right. */
export function CompactRows({ rows, title }: { rows: CompactRow[]; title?: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {title && <span className="label text-text-secondary">{title}</span>}
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="flex items-baseline justify-between gap-4">
          <span className="flex min-w-0 flex-col">
            <span className="body">{r.label}</span>
            {r.hint && <span className="body text-xs text-text-secondary">{r.hint}</span>}
          </span>
          <Ranged value={r.value} range={r.range} valueClassName={r.valueClassName} />
        </div>
      ))}
    </div>
  );
}

/** A large headline row (XP, success chance, real time). */
export function HeadlineRow({ label, ...value }: RangedValue & { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="h3">{label}</span>
      <span className="text-lg">
        <Ranged {...value} />
      </span>
    </div>
  );
}
