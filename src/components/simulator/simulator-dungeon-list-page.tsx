import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Compass, Search, SunSnow } from 'lucide-react';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getDungeons, getSeasonalEvents, type DungeonEntry, type SeasonalEventEntry } from '@/lib/progress';
import { ELDER_ISLE_DUNGEON_IDS } from '@/lib/game/elder-isle';
import { loreUnlockLabel } from '@/lib/game/lore-unlocks';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { combatLevelFor, DUNGEON_LEVEL_GRACE } from '@/lib/simulator/resolve-inputs';
import { humanize } from '@/lib/utils/humanize';
import { LoadingScreen } from '@/components/loading-screen';
import { ContentBadge } from '@/components/content-badge';
import { ListRow } from './list-row';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { IconToggleGroup } from '@/components/icon-toggle-group';
import { REGION_OPTIONS } from '@/lib/app/preferences';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const CALCULATOR_PILL = 'gap-1.5 rounded-full data-pressed:bg-primary data-pressed:text-primary-foreground';

function DungeonRow({
  dungeon,
  eventName,
  locked,
  onSelect,
}: {
  dungeon: DungeonEntry;
  eventName: string | null;
  locked: boolean;
  onSelect: () => void;
}) {
  return (
    <ListRow onSelect={onSelect} name={dungeon.display_name}>
      {eventName && <ContentBadge variant="seasonal" label={`Seasonal - ${eventName}`} />}
      {dungeon.lore_unlock_only && <ContentBadge variant="lore-unlock" label={loreUnlockLabel(dungeon.name)} />}
      <span className={`label ml-auto ${locked ? 'text-text-secondary' : ''}`}>Lv {dungeon.recommended_level}</span>
    </ListRow>
  );
}

export function SimulatorDungeonListPage() {
  const navigate = useNavigate();
  const playerState = usePlayerState();
  const [dungeons, setDungeons] = useState<Record<string, DungeonEntry> | null>(null);
  const [events, setEvents] = useState<Record<string, SeasonalEventEntry> | null>(null);
  const [storedRegion, setRegion] = useSessionStorage<'mainland' | 'elder'>('simulator:dungeon:region', 'mainland');
  const [query, setQuery] = useState('');
  const [showSeasonal, setShowSeasonal] = useSessionStorage('simulator:dungeon:show-seasonal', true);
  const [showLore, setShowLore] = useSessionStorage('simulator:dungeon:show-lore', true);
  // Include Elder Isle only covers Progress, so the Elder Isle tab is always available here.
  const isle = storedRegion === 'elder';

  useEffect(() => {
    void getDungeons().then(setDungeons);
    void getSeasonalEvents().then(setEvents);
  }, []);

  if (!dungeons || !events || !playerState) return <LoadingScreen />;
  const eventName = (key?: string) => (key ? (events[key]?.display_name ?? humanize(key)) : null);

  const sorted = Object.values(dungeons).sort(
    (a, b) => a.recommended_level - b.recommended_level || a.display_name.localeCompare(b.display_name),
  );
  const level = combatLevelFor(playerState, isle);
  const q = query.trim().toLowerCase();
  const list = sorted.filter(
    (d) =>
      ELDER_ISLE_DUNGEON_IDS.has(d.name) === isle &&
      (isle || showSeasonal || !d.event_key) &&
      (isle || showLore || !d.lore_unlock_only) &&
      d.display_name.toLowerCase().includes(q),
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Dungeons" backLabel="Back to simulator" backPath="/simulator" />

      <IconToggleGroup
        value={isle ? 'elder' : 'mainland'}
        onValueChange={setRegion}
        options={REGION_OPTIONS}
        showLabel="always"
        className="w-full *:flex-1"
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search dungeons"
          className="h-9 pl-8"
        />
      </div>

      {!isle && (
        <ToggleGroup
          multiple
          aria-label="Show dungeons"
          value={[...(showSeasonal ? ['seasonal'] : []), ...(showLore ? ['lore'] : [])]}
          onValueChange={(values) => {
            setShowSeasonal(values.includes('seasonal'));
            setShowLore(values.includes('lore'));
          }}
          className="flex flex-wrap gap-1.5"
        >
          <ToggleGroupItem value="seasonal" variant="outline" size="sm" className={CALCULATOR_PILL}>
            <SunSnow className="size-3.5" />
            Seasonal
          </ToggleGroupItem>
          <ToggleGroupItem value="lore" variant="outline" size="sm" className={CALCULATOR_PILL}>
            <Compass className="size-3.5" />
            Expedition
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {list.length === 0 && <p className="body text-sm text-text-secondary">No dungeons match.</p>}
      <div
        className={
          list.length === 0 ? 'hidden' : 'flex flex-col overflow-hidden rounded-card border border-border bg-card'
        }
      >
        {list.map((d) => (
          <DungeonRow
            key={d.name}
            dungeon={d}
            eventName={eventName(d.event_key)}
            locked={level < d.recommended_level - DUNGEON_LEVEL_GRACE}
            onSelect={() => navigate(`/simulator/dungeon/${d.name}`)}
          />
        ))}
      </div>
    </div>
  );
}
