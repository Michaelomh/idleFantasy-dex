import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { computeCategory, computeSkillTrees, type ProgressCategory, type ProgressItem } from '@/lib/progress';
import { matchRoute } from '@/lib/app/routes';
import {
  getDefaultFilter,
  LEVELS_VIEW_OPTIONS,
  REGION_OPTIONS,
  type Filter,
  type LevelsView,
} from '@/lib/app/preferences';
import { useScrollRestoration } from '@/lib/hooks/use-scroll-restoration';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { LoadingScreen } from '@/components/loading-screen';
import { ProgressCategoryHeader } from '@/components/progress/progress-category-header';
import { SkillLevelRow } from '@/components/progress/skill-level-row';
import { SkillTreeRow } from '@/components/progress/skill-tree-row';

const EMPTY_MESSAGES: Partial<Record<Filter, string>> = {
  done: 'Nothing done yet. 😢',
  missing: "You've got everything here. 🥳",
};

function emptyMessage(filter: Filter, query: string): string {
  return query ? 'No matches found.' : (EMPTY_MESSAGES[filter] ?? 'Nothing here yet.');
}

export function ProgressCategorySkillPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const categoryId = match?.path.replace('/progress/', '') ?? '';
  const playerState = usePlayerState();
  const [includeElderIsle] = useIncludeElderIsle();
  const [pageCategory, setPageCategory] = useState<ProgressCategory | null>(null);
  const [skillTrees, setSkillTrees] = useState<ProgressCategory | null>(null);
  const [view, setView] = useState<LevelsView>('levels');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(getDefaultFilter);
  const [realm, setRealm] = useState<'mainland' | 'elder'>('mainland');

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    void computeCategory(categoryId, playerState).then((result) => {
      if (!cancelled) setPageCategory(result ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState, categoryId, includeElderIsle]);

  useEffect(() => {
    if (!playerState || categoryId !== 'levels') return;
    let cancelled = false;
    void computeSkillTrees(playerState).then((result) => {
      if (!cancelled) setSkillTrees(result);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState, categoryId]);

  const isLevelsPage = pageCategory?.id === 'levels';
  const category = isLevelsPage && view === 'skill-trees' ? skillTrees : pageCategory;

  const filteredItems = useMemo(() => {
    if (!category) return [];
    return category.items.filter((item) => {
      if (category.id === 'levels' && (item.realm ?? 'mainland') !== realm) return false;
      if (filter === 'done' && !item.done) return false;
      if (filter === 'missing' && item.done) return false;
      if (query && !item.label.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [category, filter, query, realm]);

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
      remaining: items.reduce((sum, i) => sum + Math.max(0, (i.cap ?? 0) - (i.current ?? 0)), 0),
    }));
  }, [filteredItems]);

  useScrollRestoration(categoryId, pageCategory?.id === categoryId);

  if (!playerState || !pageCategory || !category) {
    return <LoadingScreen />;
  }

  const isSkillTrees = category.id === 'skill-trees';
  const parent = match?.parent ? matchRoute(match.parent) : undefined;

  return (
    <div className="flex flex-col">
      <ProgressCategoryHeader
        category={pageCategory}
        parentTitle={parent?.title}
        onBack={parent ? () => navigate(parent.path) : undefined}
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        viewValue={isLevelsPage ? view : undefined}
        onViewValueChange={(value) => setView(value as LevelsView)}
        viewOptions={LEVELS_VIEW_OPTIONS.map((option) => ({
          ...option,
          disabled: option.value === 'skill-trees' && realm === 'elder',
        }))}
        showTabs={isLevelsPage && includeElderIsle}
        tabValue={realm}
        onTabValueChange={(value) => {
          setRealm(value as 'mainland' | 'elder');
          if (value === 'elder') setView('levels');
        }}
        tabOptions={REGION_OPTIONS}
      />

      <div className="flex flex-col gap-6 p-4">
        {isSkillTrees && filteredItems.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
            {filteredItems.map((item) => (
              <SkillTreeRow key={item.id} item={item} />
            ))}
          </div>
        )}
        {!isSkillTrees &&
          sectionGroups.map(({ section, items, remaining }) => (
            <div key={section} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="subheading">{section}</span>
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
                <SkillLevelRow
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  level={item.level}
                  current={item.current ?? 0}
                  cap={item.cap ?? 0}
                  done={item.done}
                  showFraction={item.realm !== 'elder'}
                />
              ))}
            </div>
          ))}
        {filteredItems.length === 0 && (
          <p className="body py-6 text-center text-text-secondary">{emptyMessage(filter, query)}</p>
        )}
      </div>
    </div>
  );
}
