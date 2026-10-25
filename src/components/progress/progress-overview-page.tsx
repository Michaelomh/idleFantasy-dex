import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { cn } from 'cn';
import { Progress } from '@/components/ui/progress';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeAllCategories, rollUp, PROGRESS_SECTIONS, type ProgressCategory } from '@/lib/progress';
import type { PlayerState } from '@/lib/save-source';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { useIncludeSeasonalEvents } from '@/lib/hooks/use-include-seasonal-events';
import { LoadingScreen } from '@/components/loading-screen';
import { ProgressRing } from './progress-ring';
import { ProgressRow } from './progress-row';

const CATEGORY_STATUS: Partial<Record<string, 'wip' | 'unvalidated' | 'unconfident' | 'info'>> = {
  titles: 'unvalidated',
  inventory: 'info',
};

let categoriesCache: {
  playerState: PlayerState;
  includeElderIsle: boolean;
  includeSeasonalEvents: boolean;
  categories: ProgressCategory[];
} | null = null;

const CompleteTick = () => <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />;

const CompleteText = () => <span className="sr-only"> (complete)</span>;

function scrollToSection(id: string) {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

export function ProgressOverviewPage() {
  const playerState = usePlayerState();
  const [includeElderIsle] = useIncludeElderIsle();
  const [includeSeasonalEvents] = useIncludeSeasonalEvents();
  const [categories, setCategories] = useState<ProgressCategory[] | null>(() =>
    playerState &&
    categoriesCache?.playerState === playerState &&
    categoriesCache.includeElderIsle === includeElderIsle &&
    categoriesCache.includeSeasonalEvents === includeSeasonalEvents
      ? categoriesCache.categories
      : null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    void computeAllCategories(playerState).then((result) => {
      categoriesCache = { playerState, includeElderIsle, includeSeasonalEvents, categories: result };
      if (!cancelled) setCategories(result);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState, includeElderIsle, includeSeasonalEvents]);

  useScrollRestoration('progress-overview', !!categories);

  if (!playerState || !categories) {
    return <LoadingScreen />;
  }

  const overall = rollUp(categories) * 100;
  const sections = PROGRESS_SECTIONS.map((section) => {
    const sectionCategories = section.categoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is ProgressCategory => !!c);
    const points = sectionCategories.reduce((sum, c) => sum + Math.floor(c.points), 0);
    const max = sectionCategories.reduce((sum, c) => sum + c.max, 0);
    return {
      label: section.label,
      categories: sectionCategories,
      points,
      max,
      pct: max > 0 ? (points / max) * 100 : 0,
      complete: max > 0 && points >= max,
      anchor: `progress-section-${section.label.toLowerCase()}`,
    };
  }).filter((s) => s.categories.length > 0);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col">
        <h1 className="sr-only">Progress</h1>
        <div className="grid grid-cols-2 items-center gap-5 rounded-card border border-border bg-card p-5">
          <ProgressRing value={overall} />
          <div className="flex flex-col gap-2">
            {sections.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => scrollToSection(s.anchor)}
                className="flex flex-col gap-1 text-left"
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn('truncate text-xs', s.complete ? 'font-bold text-primary' : 'text-text-secondary')}
                  >
                    {s.label}
                    {s.complete && <CompleteText />}
                  </span>
                  {s.complete ? (
                    // -mr-0.5 cancels the icon's built-in padding so the tick lines up with the percentages.
                    <span className="-mr-0.5 inline-flex text-primary">
                      <CompleteTick />
                    </span>
                  ) : (
                    <span className="data text-xs font-bold">{s.pct.toFixed(1)}%</span>
                  )}
                </span>
                <Progress
                  value={s.pct}
                  max={100}
                  trackClassName="h-1"
                  indicatorClassName={cn('bg-primary', s.complete && 'shadow-sm shadow-primary/60')}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {sections.map((s) => (
        <div key={s.label} id={s.anchor} className="flex scroll-mt-4 flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className={cn('subheading flex items-center gap-1.5', s.complete && 'text-primary')}>
              {s.complete && <CompleteTick />}
              {s.label}
              {s.complete && <CompleteText />}
            </span>
            <span className="data text-xs">
              <span className={s.complete ? 'text-primary' : 'text-muted-foreground'}>
                {s.points}/{s.max}
              </span>
              <span className={cn('font-bold', s.complete ? 'text-primary' : 'text-foreground')}>
                {' '}
                ({s.pct.toFixed(2)}%)
              </span>
            </span>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
            {s.categories.map((c) => (
              <ProgressRow
                key={c.id}
                name={c.label}
                current={Math.floor(c.points)}
                total={c.max}
                info={c.info}
                status={CATEGORY_STATUS[c.id]}
                progressLabel={c.progressLabel}
                onClick={c.hasDrilldown ? () => navigate(`/progress/${c.id}`) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
