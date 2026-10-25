import { useEffect, useMemo, useState } from 'react';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { Minus, Plus } from 'lucide-react';
import { usePlayerState } from '@/lib/player/use-player-state';
import { pct } from '@/lib/utils/format-number';
import { parseQty } from '@/lib/utils/parse-qty';
import {
  collectionContext,
  defaultSelections,
  displayNames,
  loadSimData,
  resolveCombat,
  sessionMs,
  type Selections,
  type SimData,
} from '@/lib/simulator/resolve-inputs';
import { towerFloorTarget, towerHpMult, towerStatMult, towerTierFor } from '@/lib/simulator/tower';
import type { SimulationJob } from '@/lib/simulator/run-simulation';
import { LoadingScreen } from '@/components/loading-screen';
import { Button } from '@/components/ui/button';
import { CombatInputsSection } from './combat-inputs-section';
import { QtyInput } from '@/components/qty-input';
import { SimulationResultsSection } from './simulation-results-section';
import { SimulatorHeader } from './simulator-header';
import { StatRows } from './stat-rows';

/** Enemy scaling past floor 100, as short rows; nothing below that. */
function combatModifiers(floor: number) {
  const hp = towerHpMult(floor);
  if (hp <= 1) return [{ label: 'Enemy scaling', value: 'None' }];
  // The game's chip reads the last cleared floor (TowerViewModel), so it lags the floor being fought by one.
  const strength = Math.round((towerHpMult(floor - 1) - 1) * 100);
  return [
    ...(strength > 0 ? [{ label: 'Enemy strength', value: `+${strength}%` }] : []),
    { label: 'Enemy HP', value: `×${hp.toFixed(2)}` },
    { label: 'Enemy attack and defence', value: `+${Math.round((towerStatMult(floor) - 1) * 100)}%` },
  ];
}

export function SimulatorTowerPage() {
  const playerState = usePlayerState();
  const [data, setData] = useState<SimData | null>(null);
  const [edited, setSel] = useSessionStorage<Selections | null>('simulator:tower', null);
  const [floorText, setFloorText] = useSessionStorage<string | null>('simulator:tower:floor', null);

  useEffect(() => {
    void loadSimData().then(setData);
  }, []);

  const defaults = useMemo(
    () => (playerState && data ? defaultSelections(playerState, data) : null),
    [playerState, data],
  );
  const sel = edited ?? defaults;
  const names = useMemo(() => (data ? displayNames(data) : {}), [data]);
  const hidden = useMemo(() => new Set(data ? Object.keys(data.pets) : []), [data]);

  if (!playerState || !data || !sel) return <LoadingScreen />;

  const nextFloor = Number(playerState.raw.flags.tower_current_floor ?? 0) + 1;
  const text = floorText ?? String(nextFloor);
  const typedFloor = parseQty(text, 1);
  // While the field is empty or invalid, the spawns keep showing your next floor and the run is blocked.
  const floor = typedFloor ?? nextFloor;
  const step = (by: number) => setFloorText(String(Math.max(1, floor + by)));

  const resolved = resolveCombat(playerState, data, sel, false);

  const target = towerFloorTarget(floor, data.enemies);
  const tier = towerTierFor(floor);
  const totalWeight = tier.spawns.reduce((n, s) => n + s.weight, 0);

  const buildJob = (samples: number): SimulationJob => ({
    kind: 'tower',
    inputs: resolved.inputs,
    usesPotion: !!sel.potionKey,
    eatOrder: sel.eatOrder,
    dungeon: target,
    collection: collectionContext(playerState, data, 'tower', false),
    sessionMs: sessionMs(playerState, data, false),
    samples,
    seed: 1,
    bossWinsToday: 0,
  });

  return (
    <div className="flex flex-col gap-3 p-4">
      <SimulatorHeader title="Infinity Tower" backLabel="Back to simulator" backPath="/simulator" />

      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-4">
        <span className="h3">Tower</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" aria-label="Previous floor" onClick={() => step(-1)}>
            <Minus className="size-4" />
          </Button>
          <QtyInput
            value={text}
            onChange={setFloorText}
            className="h-12 w-auto min-w-0 flex-1 text-center text-lg"
            aria-label="Floor"
          />
          <Button variant="secondary" size="icon" aria-label="Next floor" onClick={() => step(1)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <StatRows
          rows={[
            ...tier.spawns.map((s) => ({
              label: target.enemies[s.key]?.display_name ?? s.key,
              value: pct(s.weight / totalWeight, 0),
            })),
            ...combatModifiers(floor),
          ]}
        />
      </div>

      <CombatInputsSection playerState={playerState} data={data} sel={sel} onChange={setSel} resolved={resolved} />

      <SimulationResultsSection
        buildJob={buildJob}
        kind="tower"
        storageKey="simulator:tower"
        names={names}
        hidden={hidden}
        disabledReason={
          typedFloor === null
            ? 'Enter a floor number.'
            : resolved.style === 'magic' && !resolved.spell
              ? 'Pick a spell first.'
              : (resolved.invalid ?? undefined)
        }
      />
    </div>
  );
}
