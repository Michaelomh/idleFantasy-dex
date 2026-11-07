import { Fragment } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from 'cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ProgressItem, ProgressPathSegment } from '@/lib/progress';
import { humanize } from '@/lib/utils/humanize';

function SegmentPips({ segment }: { segment: ProgressPathSegment }) {
  return (
    <span className="flex items-center gap-1.5">
      <span role="img" aria-label={`${segment.current} of ${segment.cap} owned`} className="flex gap-0.75">
        {Array.from({ length: segment.cap }, (_, i) => (
          <span
            key={i}
            className={cn(
              'size-2.5 rounded-xs border',
              i < segment.current ? 'border-primary bg-primary' : 'border-muted-foreground',
            )}
          />
        ))}
      </span>
      {segment.races.length > 0 && (
        <span className="label rounded-sm bg-background px-1.5 py-0.5 text-[10px] text-text-secondary">
          {segment.races.map(humanize).join('/')}
        </span>
      )}
    </span>
  );
}

export function SkillTreeRow({ item }: { item: ProgressItem }) {
  const paths = item.paths ?? [];

  return (
    <Collapsible>
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-3 p-2.5 text-left">
        {item.icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background">
            <img src={item.icon} alt="" className="size-7" />
          </span>
        )}
        <span className="body min-w-0 flex-1 truncate font-normal">{item.label}</span>
        {item.done ? (
          <Check className="size-5 shrink-0 text-primary" strokeWidth={3} />
        ) : (
          <span className="data font-bold text-foreground">
            <span className="text-xl">{item.current}</span>
            <span className="text-xs text-muted-foreground">/{item.cap}</span>
          </span>
        )}
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-2 pr-2.5 pb-3 pl-4">
          {paths.map((path) => (
            <li key={path.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="body font-normal text-text-secondary">{path.label}</span>
              <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                {path.segments.map((segment, i) => (
                  <Fragment key={segment.races.join()}>
                    {i > 0 && <span aria-hidden className="h-3.5 w-px bg-muted-foreground" />}
                    <SegmentPips segment={segment} />
                  </Fragment>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
