import type { ReactNode } from 'react';
import { Check, ChevronLeft, Search } from 'lucide-react';
import { cn } from 'cn';
import type { ProgressCategory } from '@/lib/progress';
import { FILTER_OPTIONS, type Filter } from '@/lib/app/preferences';
import { IconToggleGroup } from '@/components/icon-toggle-group';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ProgressCategoryTabOption = { value: string; label: string };

const COMPLETE_HEADLINES: Record<string, string> = {
  quests: 'All quests completed',
  guilds: 'Every guild maxed',
  bosses: 'All bosses slain',
  armoury: 'Armoury fully stocked',
  levels: 'All prestiges earned',
  pets: 'All pets collected',
  titles: 'All titles earned',
  expeditions: 'All notes found',
  achievements: 'All achievements unlocked',
  bestiary: 'All monsters encountered',
  inventory: 'Every item found',
  'heirloom-tools': 'All heirlooms mastered',
};

export function ProgressCategoryHeader({
  category,
  parentTitle,
  onBack,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  showTabs,
  tabValue,
  onTabValueChange,
  tabOptions,
  children,
}: {
  category: ProgressCategory;
  parentTitle?: string;
  onBack?: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  showTabs?: boolean;
  tabValue?: string;
  onTabValueChange?: (value: string) => void;
  tabOptions?: ProgressCategoryTabOption[];
  children?: ReactNode;
}) {
  const points = Math.floor(category.points);
  const percent = category.max > 0 ? Math.min(100, (category.points / category.max) * 100) : 0;
  const complete = category.max > 0 && category.points >= category.max;

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-bg-overlay p-4 backdrop-blur-md">
      {parentTitle && onBack && (
        <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-text-secondary">
          <ChevronLeft className="size-4.5" />
          <span className="body">{parentTitle}</span>
        </button>
      )}

      <div className="flex items-center gap-4">
        {complete ? (
          <div className="relative size-18 shrink-0">
            <div className="animate-glow-pulse absolute inset-0 rounded-full bg-primary/50 blur-xl motion-reduce:animate-none motion-reduce:opacity-60" />
            <div className="relative size-full rounded-full bg-primary p-1.5">
              <div className="size-full rounded-full bg-background p-1.5">
                <div className="flex size-full items-center justify-center rounded-full bg-primary">
                  <Check className="size-6 text-primary-foreground" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <CircularProgress value={percent} size={72} strokeWidth={6}>
            <span className="data text-primary">{Math.floor(percent)}%</span>
          </CircularProgress>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          {complete && (
            <span className="label text-primary">{COMPLETE_HEADLINES[category.id] ?? 'Category complete'}</span>
          )}
          <h1 className="h1 text-2xl">{category.label ?? 'Progress'}</h1>
          <span className="label text-text-secondary">
            <span className={cn(complete && 'text-primary')}>
              {points}/{category.max}
            </span>
            {' · '}
            <span className="text-primary">{(Math.floor(percent * 10) / 10).toFixed(1)}%</span>
            {' · '}
            {complete ? <span className="text-primary">Complete</span> : `${category.max - points} left`}
          </span>
        </div>
      </div>

      {showTabs && tabOptions && tabValue != null && onTabValueChange && (
        <Tabs value={tabValue} onValueChange={(value) => onTabValueChange(value as string)}>
          <TabsList className="h-10 w-full">
            {tabOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="capitalize">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {children}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search…"
          className="h-9 pl-8"
        />
      </div>
      <IconToggleGroup
        value={filter}
        onValueChange={onFilterChange}
        options={FILTER_OPTIONS}
        showLabel="always"
        className="w-full *:flex-1"
      />
    </div>
  );
}
