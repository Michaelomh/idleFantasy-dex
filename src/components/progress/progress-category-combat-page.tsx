import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeCategory, type ProgressCategory, type ProgressItem } from '@/lib/progress';
import { matchRoute } from '@/lib/app/routes';
import { getDefaultFilter, type Filter } from '@/lib/app/preferences';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { LoadingScreen } from '@/components/loading-screen';
import { ProgressCategoryHeader } from '@/components/progress/progress-category-header';
import { CombatRow } from '@/components/progress/combat-row';

const EMPTY_MESSAGES: Partial<Record<Filter, string>> = {
  done: 'Nothing done yet. 😢',
  missing: "You've got everything here. 🥳",
};

function emptyMessage(filter: Filter, query: string): string {
  return query ? 'No matches found.' : (EMPTY_MESSAGES[filter] ?? 'Nothing here yet.');
}

function bossPointsLeft(item: ProgressItem): number {
  return ((item.kills ?? 0) > 0 ? 0 : 1) + Math.max(0, (item.cap ?? 0) - (item.current ?? 0));
}

export function ProgressCategoryCombatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const categoryId = match?.path.replace('/progress/', '') ?? '';
  const playerState = usePlayerState();
  const [includeElderIsle] = useIncludeElderIsle();
  const [category, setCategory] = useState<ProgressCategory | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(getDefaultFilter);

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    void computeCategory(categoryId, playerState).then((result) => {
      if (!cancelled) setCategory(result ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState, categoryId, includeElderIsle]);

  const filteredItems = useMemo(() => {
    if (!category) return [];
    return category.items.filter((item) => {
      if (filter === 'done' && !item.done) return false;
      if (filter === 'missing' && item.done) return false;
      if (query && !item.label.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [category, filter, query]);

  const sectionGroups = useMemo(() => {
    const map = new Map<string, ProgressItem[]>();
    for (const item of filteredItems) {
      const key = item.section ?? 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()].map(([section, items]) => ({
      section,
      items,
      remaining: items.reduce((sum, i) => sum + bossPointsLeft(i), 0),
    }));
  }, [filteredItems]);

  useScrollRestoration(category?.id ?? null, !!category);

  if (!playerState || !category) {
    return <LoadingScreen />;
  }

  const parent = match?.parent ? matchRoute(match.parent) : undefined;

  return (
    <div className="flex flex-col">
      <ProgressCategoryHeader
        category={category}
        parentTitle={parent?.title}
        onBack={parent ? () => navigate(parent.path) : undefined}
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
      />

      <div className="flex flex-col gap-6 p-4">
        {category.id === 'bosses' ? (
          sectionGroups.map(({ section, items, remaining }) => (
            <div key={section} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="label tracking-wider text-text-secondary uppercase">{section}</span>
                <span
                  className={cn(
                    'label tracking-wider uppercase',
                    remaining === 0 ? 'text-primary' : 'text-text-secondary',
                  )}
                >
                  {remaining === 0 ? 'Complete' : `${remaining} left`}
                </span>
              </div>
              {items.map((item) => (
                <CombatRow
                  key={item.id}
                  label={item.label}
                  detail={item.detail}
                  current={item.current}
                  cap={item.cap}
                  done={item.done}
                  muted={(item.kills ?? 0) === 0}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col">
            {filteredItems.map((item) => (
              <CombatRow key={item.id} label={item.label} detail={item.detail} done={item.done} />
            ))}
          </div>
        )}
        {filteredItems.length === 0 && (
          <p className="body py-6 text-center text-text-secondary">{emptyMessage(filter, query)}</p>
        )}
      </div>
    </div>
  );
}
