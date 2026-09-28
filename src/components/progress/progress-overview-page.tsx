import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Progress } from '@/components/ui/progress';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeAllCategories, rollUp, PROGRESS_SECTIONS, type ProgressCategory } from '@/lib/progress';
import type { PlayerState } from '@/lib/save-source';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { LoadingScreen } from '@/components/loading-screen';
import { ProgressRing } from './progress-ring';
import { ProgressRow } from './progress-row';

const CATEGORY_STATUS: Partial<Record<string, 'wip' | 'unvalidated' | 'unconfident' | 'info'>> = {
  titles: 'unvalidated',
  inventory: 'info',
};

let categoriesCache: { playerState: PlayerState; includeElderIsle: boolean; categories: ProgressCategory[] } | null =
  null;

export function ProgressOverviewPage() {
  const playerState = usePlayerState();
  const [includeElderIsle] = useIncludeElderIsle();
  const [categories, setCategories] = useState<ProgressCategory[] | null>(() =>
    playerState && categoriesCache?.playerState === playerState && categoriesCache.includeElderIsle === includeElderIsle
      ? categoriesCache.categories
      : null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    void computeAllCategories(playerState).then((result) => {
      categoriesCache = { playerState, includeElderIsle, categories: result };
      if (!cancelled) setCategories(result);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState, includeElderIsle]);

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
    };
  }).filter((s) => s.categories.length > 0);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col">
        <h1 className="h1">Progress</h1>
        <div className="mt-2 grid grid-cols-2 items-center gap-5 rounded-card border border-border bg-card p-5">
          <ProgressRing value={overall} />
          <div className="flex flex-col gap-2">
            {sections.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-text-secondary">{s.label}</span>
                  <span className="data text-xs font-bold">{s.pct.toFixed(1)}%</span>
                </div>
                <Progress value={s.pct} max={100} trackClassName="h-1" indicatorClassName="bg-primary" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {sections.map((s) => (
        <div key={s.label} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <span className="label font-bold text-foreground">{s.label}</span>
            <span className="data text-xs">
              <span className="text-muted-foreground">
                {s.points}/{s.max}
              </span>
              <span className="font-bold text-foreground"> ({s.pct.toFixed(2)}%)</span>
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
