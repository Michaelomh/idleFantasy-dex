import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Check, Lock, Search } from 'lucide-react';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeCategory, type ProgressCategory } from '@/lib/progress';
import { matchRoute } from '@/lib/app/routes';
import { getDefaultFilter, type Filter } from '@/lib/app/preferences';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { LoadingScreen } from '@/components/loading-screen';

const EMPTY_MESSAGES: Partial<Record<Filter, string>> = {
  done: 'Nothing done yet. 😢',
  missing: "You've got everything here. 🥳",
};

function emptyMessage(filter: Filter, query: string): string {
  return query ? 'No matches found.' : (EMPTY_MESSAGES[filter] ?? 'Nothing here yet.');
}

export function ProgressCategoryPage() {
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

  return (
    <div className="flex flex-col gap-3 p-4">
      <span className="data text-lg">
        {Math.floor(category.points)} / {category.max}
      </span>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {(['all', 'done', 'missing'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'label rounded-md border border-border px-2 py-1.5 capitalize',
              filter === f && 'border-primary bg-primary/10 text-primary',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {filteredItems.map((item, i) => (
          <div key={item.id} className="contents">
            {item.section && item.section !== filteredItems[i - 1]?.section && (
              <span className="label mt-2 text-text-secondary">{item.section}</span>
            )}
            <div
              onClick={category.id === 'bosses' ? () => navigate(`/progress/bosses/${item.id}`) : undefined}
              className={cn(
                'flex flex-col gap-1 rounded-md border border-border px-3 py-2',
                category.id === 'bosses' && 'cursor-pointer',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                {category.id === 'armoury' ? (
                  <>
                    <span className="body min-w-0 flex-1 truncate">{item.label}</span>
                    {item.requirements && (
                      <span className="label shrink-0 text-text-secondary">{item.requirements}</span>
                    )}
                  </>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {item.icon && <img src={item.icon} alt="" className="size-4 shrink-0" />}
                    <div className="flex min-w-0 flex-col">
                      <span className="body">{item.label}</span>
                      {item.detail && <span className="body text-sm text-text-secondary">{item.detail}</span>}
                    </div>
                  </div>
                )}
                {item.locked ? (
                  <Lock className="mt-1 size-4 shrink-0 text-text-secondary" />
                ) : (
                  item.done && <Check className="mt-1 size-4 shrink-0 text-fresh" />
                )}
              </div>
              {item.stats && <span className="label text-text-secondary">{item.stats}</span>}
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="body py-6 text-center text-text-secondary">{emptyMessage(filter, query)}</p>
        )}
      </div>
    </div>
  );
}
