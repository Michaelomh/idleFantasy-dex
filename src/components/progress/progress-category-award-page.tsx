import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeCategory, type ProgressCategory } from '@/lib/progress';
import { matchRoute } from '@/lib/app/routes';
import { getDefaultFilter, type Filter } from '@/lib/app/preferences';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { isElderIsleItem } from '@/lib/game/elder-isle';
import { LoadingScreen } from '@/components/loading-screen';
import { ProgressCategoryHeader } from '@/components/progress/progress-category-header';
import { CollectionRow } from '@/components/progress/collection-row';

const EMPTY_MESSAGES: Partial<Record<Filter, string>> = {
  done: 'Nothing done yet. 😢',
  missing: "You've got everything here. 🥳",
};

function emptyMessage(filter: Filter, query: string): string {
  return query ? 'No matches found.' : (EMPTY_MESSAGES[filter] ?? 'Nothing here yet.');
}

export function ProgressCategoryAwardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const categoryId = match?.path.replace('/progress/', '') ?? '';
  const playerState = usePlayerState();
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
  }, [playerState, categoryId]);

  const filteredItems = useMemo(() => {
    if (!category) return [];
    return category.items.filter((item) => {
      if (filter === 'done' && !item.done) return false;
      if (filter === 'missing' && item.done) return false;
      if (query && !item.label.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [category, filter, query]);

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

      <div className="flex flex-col p-4">
        {filteredItems.map((item) => (
          <CollectionRow
            key={item.id}
            label={item.label}
            detail={item.detail}
            done={item.done}
            elderIsle={isElderIsleItem(category.id, item.id)}
          />
        ))}
        {filteredItems.length === 0 && (
          <p className="body py-6 text-center text-text-secondary">{emptyMessage(filter, query)}</p>
        )}
      </div>
    </div>
  );
}
