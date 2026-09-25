import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { GoalCard } from '@/components/goal-card';
import { Progress } from '@/components/ui/progress';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeAllCategories, rollUp, PROGRESS_SECTIONS, type ProgressCategory } from '@/lib/progress';
import type { PlayerState } from '@/lib/save-source';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { LoadingScreen } from '@/components/loading-screen';

const CATEGORY_STATUS: Partial<Record<string, 'wip' | 'unvalidated' | 'unconfident' | 'info'>> = {
  titles: 'unvalidated',
  inventory: 'info',
};

let categoriesCache: { playerState: PlayerState; categories: ProgressCategory[] } | null = null;

export function ProgressOverviewPage() {
  const playerState = usePlayerState();
  const [categories, setCategories] = useState<ProgressCategory[] | null>(() =>
    playerState && categoriesCache?.playerState === playerState ? categoriesCache.categories : null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    void computeAllCategories(playerState).then((result) => {
      categoriesCache = { playerState, categories: result };
      if (!cancelled) setCategories(result);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState]);

  useScrollRestoration('progress-overview', !!categories);

  if (!playerState || !categories) {
    return <LoadingScreen />;
  }

  const overall = rollUp(categories) * 100;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="h1">Progress</h1>
      <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="h2">Overall Completion</span>
          <span className="data text-2xl">{overall.toFixed(2)}%</span>
        </div>
        <Progress value={overall} max={100} className="w-full" complete={overall >= 100} />
      </div>

      {PROGRESS_SECTIONS.map((section) => {
        const sectionCategories = section.categoryIds
          .map((id) => categories.find((c) => c.id === id))
          .filter((c): c is ProgressCategory => !!c);
        if (sectionCategories.length === 0) return null;

        const sectionPoints = sectionCategories.reduce((sum, c) => sum + Math.floor(c.points), 0);
        const sectionMax = sectionCategories.reduce((sum, c) => sum + c.max, 0);
        const sectionPct = sectionMax > 0 ? (sectionPoints / sectionMax) * 100 : 0;

        return (
          <div key={section.label} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="h3">{section.label}</span>
              <span className="data text-text-secondary">
                {sectionPoints} / {sectionMax} ({sectionPct.toFixed(2)}%)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sectionCategories.map((c) => (
                <GoalCard
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
        );
      })}
    </div>
  );
}
