import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Compass, Search, SunSnow } from 'lucide-react';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getDungeons, getSeasonalEvents, type DungeonEntry, type SeasonalEventEntry } from '@/lib/progress/game-data';
import { ELDER_ISLE_DUNGEON_IDS } from '@/lib/game/elder-isle';
import { loreUnlockLabel } from '@/lib/game/lore-unlocks';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { combatLevelFor, DUNGEON_LEVEL_GRACE } from '@/lib/simulator/resolve-inputs';
import { humanize } from '@/lib/utils/humanize';
import { LoadingScreen } from '@/components/loading-screen';
import { ContentBadge } from '@/components/content-badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-card"
    >
      <span className="flex flex-1 items-center gap-1.5">
        <span className="body">{dungeon.display_name}</span>
        {eventName && <ContentBadge variant="seasonal" label={`Seasonal - ${eventName}`} />}
        {dungeon.lore_unlock_only && <ContentBadge variant="lore-unlock" label={loreUnlockLabel(dungeon.name)} />}
      </span>
      <span className={`label ${locked ? 'text-text-secondary' : ''}`}>Lv {dungeon.recommended_level}</span>
    </button>
  );
}

export function SimulatorDungeonListPage() {
  const navigate = useNavigate();
  const playerState = usePlayerState();
  const [includeElderIsle] = useIncludeElderIsle();
  const [dungeons, setDungeons] = useState<Record<string, DungeonEntry> | null>(null);
  const [events, setEvents] = useState<Record<string, SeasonalEventEntry> | null>(null);
  const [storedRegion, setRegion] = useSessionStorage<'mainland' | 'elder'>('simulator:dungeon:region', 'mainland');
  const [query, setQuery] = useState('');
  const [showSeasonal, setShowSeasonal] = useSessionStorage('simulator:dungeon:show-seasonal', true);
  const [showLore, setShowLore] = useSessionStorage('simulator:dungeon:show-lore', true);
  const isle = includeElderIsle && storedRegion === 'elder';

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
      <h1 className="h1">Dungeons</h1>

      {includeElderIsle && (
        <Tabs value={isle ? 'elder' : 'mainland'} onValueChange={(value) => setRegion(value as 'mainland' | 'elder')}>
          <TabsList className="h-10 w-full">
            <TabsTrigger value="mainland">Mainland</TabsTrigger>
            <TabsTrigger value="elder">Elder Isle</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

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
        <div className="flex gap-1.5">
          {[
            { label: 'Seasonal', icon: SunSnow, on: showSeasonal, set: setShowSeasonal },
            { label: 'Expedition', icon: Compass, on: showLore, set: setShowLore },
          ].map(({ label, icon: Icon, on, set }) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => set(!on)}
              className={cn(
                'label inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-text-secondary',
                on && 'border-primary bg-primary/10 text-primary',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {list.length === 0 && <p className="body text-sm text-text-secondary">No dungeons match.</p>}
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
