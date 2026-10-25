import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { ChevronDown } from 'lucide-react';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getDungeons, type DungeonEntry } from '@/lib/progress/game-data';
import { ELDER_ISLE_DUNGEON_IDS } from '@/lib/game/elder-isle';
import { humanize } from '@/lib/utils/humanize';
import { fmt, pct } from '@/lib/utils/format-number';
import {
  collectionContext,
  defaultSelections,
  displayNames,
  dungeonTarget,
  loadSimData,
  resolveCombat,
  sessionMs,
  type Selections,
  type SimData,
} from '@/lib/simulator/resolve-inputs';
import type { SimulationJob } from '@/lib/simulator/run-simulation';
import { LoadingScreen } from '@/components/loading-screen';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CombatInputsSection } from './combat-inputs-section';
import { SimulationResultsSection } from './simulation-results-section';
import { SimulatorNotFound } from './simulator-not-found';
import { SimulatorHeader } from './simulator-header';
import { StatRows, type StatRow } from './stat-rows';

export function SimulatorDungeonDetailPage() {
  const { dungeonId } = useParams<{ dungeonId: string }>();
  const playerState = usePlayerState();
  // undefined while loading, null when the id matches no dungeon.
  const [dungeon, setDungeon] = useState<DungeonEntry | null | undefined>(undefined);
  const [data, setData] = useState<SimData | null>(null);
  const [edited, setSel] = useSessionStorage<Selections | null>(`simulator:dungeon:${dungeonId}`, null);

  useEffect(() => {
    void getDungeons().then((all) => setDungeon((dungeonId && all[dungeonId]) || null));
  }, [dungeonId]);

  useEffect(() => {
    void loadSimData().then(setData);
  }, []);

  const isle = !!dungeon && ELDER_ISLE_DUNGEON_IDS.has(dungeon.name);
  const defaults = useMemo(
    () => (playerState && data ? defaultSelections(playerState, data, isle) : null),
    [playerState, data, isle],
  );
  const sel = edited ?? defaults;
  const names = useMemo(() => (data ? displayNames(data) : {}), [data]);
  const hidden = useMemo(
    () => new Set([...(data ? Object.keys(data.pets) : []), ...(dungeon?.rare_drops ?? []).map((r) => r.item)]),
    [data, dungeon],
  );

  if (dungeon === null) {
    return <SimulatorNotFound title="Dungeon not found" backLabel="Back to dungeons" backPath="/simulator/dungeon" />;
  }
  if (!playerState || !dungeon || !data || !sel) return <LoadingScreen />;

  const resolved = resolveCombat(playerState, data, sel, isle);
  const totalWeight = dungeon.enemy_spawns.reduce((n, s) => n + s.weight, 0);
  const spawns = dungeon.enemy_spawns
    .map((s) => ({ ...s, enemy: data.enemies[s.enemy], key: s.enemy }))
    .filter((s) => !!s.enemy);

  const spawnRows: StatRow[] = spawns.map((s) => ({
    label: s.enemy.display_name,
    value: pct(s.weight / totalWeight),
    hint: `${fmt(s.enemy.hp)} HP, ${fmt(s.enemy.xp_drops.combat ?? 0)} XP`,
  }));
  const rareRows: StatRow[] = (dungeon.rare_drops ?? []).map((r) => ({
    label: names[r.item] ?? humanize(r.item),
    value: pct(r.chance, r.chance < 0.01 ? 2 : 1),
    hint: 'Once per run you survive',
  }));

  const buildJob = (samples: number): SimulationJob => ({
    kind: 'dungeon',
    inputs: resolved.inputs,
    usesPotion: !!sel.potionKey,
    eatOrder: sel.eatOrder,
    dungeon: dungeonTarget(dungeon, data),
    collection: collectionContext(playerState, data, 'dungeon', isle),
    sessionMs: sessionMs(playerState, data, isle),
    samples,
    seed: 1,
    bossWinsToday: 0,
  });

  return (
    <div className="flex flex-col gap-3 p-4">
      <SimulatorHeader
        title={dungeon.display_name}
        backLabel="Back to dungeons"
        backPath="/simulator/dungeon"
        badge={`Lv ${dungeon.recommended_level}`}
      />

      <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
          <span className="h3">Dungeon</span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4">
          <StatRows title="Spawns" rows={spawnRows} />
          <StatRows title="Rare drops" rows={rareRows} />
        </CollapsibleContent>
      </Collapsible>

      <CombatInputsSection
        playerState={playerState}
        data={data}
        sel={sel}
        onChange={setSel}
        resolved={resolved}
        combatStyleInfo={
          isle
            ? 'Elder Isle: uses your Elder levels, XP goes to your Elder skills, and dying keeps all XP and loot.'
            : undefined
        }
      />

      <SimulationResultsSection
        buildJob={buildJob}
        kind="dungeon"
        storageKey={`simulator:dungeon:${dungeonId}`}
        names={names}
        hidden={hidden}
        disabledReason={
          resolved.style === 'magic' && !resolved.spell ? 'Pick a spell first.' : (resolved.invalid ?? undefined)
        }
      />
    </div>
  );
}
