import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getDungeons, getSeasonalEvents, type DungeonEntry, type SeasonalEventEntry } from '@/lib/progress/game-data';
import { ELDER_ISLE_DUNGEON_IDS } from '@/lib/game/elder-isle';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { combatLevelFor, DUNGEON_LEVEL_GRACE } from '@/lib/simulator/resolve-inputs';
import { humanize } from '@/lib/utils/humanize';
import { LoadingScreen } from '@/components/loading-screen';

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
  const tags = [eventName ? `Seasonal - ${eventName}` : null, dungeon.lore_unlock_only ? 'Lore unlock' : null].filter(
    Boolean,
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-card"
    >
      <span className="flex flex-1 flex-col">
        <span className="body">{dungeon.display_name}</span>
        {/* Always rendered so every row is the same height, tagged or not. */}
        <span className="body text-xs text-text-secondary">{tags.length > 0 ? tags.join(' · ') : '\u00a0'}</span>
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

  useEffect(() => {
    void getDungeons().then(setDungeons);
    void getSeasonalEvents().then(setEvents);
  }, []);

  if (!dungeons || !events || !playerState) return <LoadingScreen />;
  const eventName = (key?: string) => (key ? (events[key]?.display_name ?? humanize(key)) : null);

  const sorted = Object.values(dungeons).sort(
    (a, b) => a.recommended_level - b.recommended_level || a.display_name.localeCompare(b.display_name),
  );
  const level = { mainland: combatLevelFor(playerState, false), isle: combatLevelFor(playerState, true) };
  const sections = [
    { title: 'Mainland', isle: false, list: sorted.filter((d) => !ELDER_ISLE_DUNGEON_IDS.has(d.name)) },
    ...(includeElderIsle
      ? [{ title: 'Elder Isle', isle: true, list: sorted.filter((d) => ELDER_ISLE_DUNGEON_IDS.has(d.name)) }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="h1">Dungeons</h1>
      {sections.map(({ title, isle, list }) => (
        <div key={title} className="flex flex-col gap-1">
          <h2 className="h3">{title}</h2>
          {isle && <p className="body text-sm text-text-secondary">Unlock levels use your Elder levels.</p>}
          {list.map((d) => (
            <DungeonRow
              key={d.name}
              dungeon={d}
              eventName={eventName(d.event_key)}
              locked={(isle ? level.isle : level.mainland) < d.recommended_level - DUNGEON_LEVEL_GRACE}
              onSelect={() => navigate(`/simulator/dungeon/${d.name}`)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
