import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeCategory, type ProgressCategory, type ProgressItem } from '@/lib/progress';
import { matchRoute } from '@/lib/app/routes';
import { getDefaultFilter, type Filter } from '@/lib/app/preferences';
import { isElderIsleItem } from '@/lib/game/elder-isle';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { LoadingScreen } from '@/components/loading-screen';
import { ProgressCategoryHeader } from '@/components/progress/progress-category-header';
import { CollectionRow } from '@/components/progress/collection-row';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const EMPTY_MESSAGES: Partial<Record<Filter, string>> = {
  done: 'Nothing done yet. 😢',
  missing: "You've got everything here. 🥳",
};

function emptyMessage(filter: Filter, query: string): string {
  return query ? 'No matches found.' : (EMPTY_MESSAGES[filter] ?? 'Nothing here yet.');
}

const ALL_GROUPS = 'All';

const FRACTION_CAPTIONS: Record<string, string> = { expeditions: 'Notes' };

export function ProgressCategoryCollectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const categoryId = match?.path.replace('/progress/', '') ?? '';
  const playerState = usePlayerState();
  const [includeElderIsle] = useIncludeElderIsle();
  const [category, setCategory] = useState<ProgressCategory | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(getDefaultFilter);
  const [group, setGroup] = useState(ALL_GROUPS);

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
      if (group !== ALL_GROUPS && item.group !== group) return false;
      if (query && !item.label.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [category, filter, query, group]);

  const groups = useMemo(() => {
    if (!category) return [];
    return [...new Set(category.items.map((i) => i.group).filter((g): g is string => !!g))];
  }, [category]);

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
      remaining: items.filter((i) => !i.done).length,
    }));
  }, [filteredItems]);

  useScrollRestoration(category?.id ?? null, !!category);

  if (!playerState || !category) {
    return <LoadingScreen />;
  }

  const parent = match?.parent ? matchRoute(match.parent) : undefined;

  // Greyed out only when obtaining the item isn't the end of its progress (fraction still at 0).
  const renderRow = (item: ProgressItem) => (
    <CollectionRow
      key={item.id}
      label={item.label}
      detail={item.detail}
      current={item.current}
      cap={item.cap}
      caption={FRACTION_CAPTIONS[category.id]}
      done={item.done}
      muted={item.cap != null && (item.current ?? 0) === 0}
      elderIsle={isElderIsleItem(category.id, item.id)}
    />
  );

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
      >
        {groups.length > 0 && (
          <ToggleGroup
            value={[group]}
            onValueChange={(values) => {
              const next = values[0];
              if (next) setGroup(next);
            }}
            className="-mx-4 w-auto scrollbar-none justify-start gap-1 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden"
          >
            {[ALL_GROUPS, ...groups].map((g) => (
              <ToggleGroupItem
                key={g}
                value={g}
                size="sm"
                className="h-8 shrink-0 rounded-full border border-border px-3 font-bold text-text-secondary data-pressed:bg-primary data-pressed:text-primary-foreground"
              >
                {g}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </ProgressCategoryHeader>

      <div className="flex flex-col gap-6 p-4">
        {category.id === 'armoury' ? (
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
              {items.map(renderRow)}
            </div>
          ))
        ) : (
          <div className="flex flex-col">{filteredItems.map(renderRow)}</div>
        )}
        {filteredItems.length === 0 && (
          <p className="body py-6 text-center text-text-secondary">{emptyMessage(filter, query)}</p>
        )}
      </div>
    </div>
  );
}
