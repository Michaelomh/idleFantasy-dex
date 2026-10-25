import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getBosses, getSeasonalEvents, type BossEntry, type SeasonalEventEntry } from '@/lib/progress';
import { LoadingScreen } from '@/components/loading-screen';
import { RAID_FULL_PARTY } from '@/lib/simulator/combat-engine';
import {
  bossTarget,
  bossWinsToday,
  collectionContext,
  defaultSelections,
  displayNames,
  ISLE_BOSS_IDS,
  loadSimData,
  resolveCombat,
  sessionMs,
  type Selections,
  type SimData,
} from '@/lib/simulator/resolve-inputs';
import type { SimulationJob } from '@/lib/simulator/run-simulation';
import { BossInfoSection } from './boss-info-section';
import { CombatInputsSection } from './combat-inputs-section';
import { SimulationResultsSection } from './simulation-results-section';
import { SimulatorNotFound } from './simulator-not-found';
import { PageHeader } from '@/components/page-header';
import { MAX_MERCENARIES, MercenaryPicker } from './mercenary-picker';

export function SimulatorBossDetailPage() {
  const { bossId } = useParams<{ bossId: string }>();
  const playerState = usePlayerState();
  const [boss, setBoss] = useState<BossEntry | null | undefined>(undefined);
  const [data, setData] = useState<SimData | null>(null);
  const [edited, setSel] = useSessionStorage<Selections | null>(`simulator:boss:${bossId}`, null);
  const [events, setEvents] = useState<Record<string, SeasonalEventEntry>>({});

  useEffect(() => {
    void getBosses().then((all) => setBoss((bossId && all[bossId]) || null));
  }, [bossId]);

  useEffect(() => {
    void loadSimData().then(setData);
    void getSeasonalEvents().then(setEvents);
  }, []);

  const isle = !!boss && ISLE_BOSS_IDS.has(boss.id);
  const defaults = useMemo(() => {
    if (!playerState || !data) return null;
    const d = defaultSelections(playerState, data, isle);
    return { ...d, mercIds: d.mercIds.slice(0, MAX_MERCENARIES) };
  }, [playerState, data, isle]);
  // Merge over the defaults so a stored object from an older Selections shape still has every field.
  const sel = edited && defaults ? { ...defaults, ...edited } : defaults;

  const names = useMemo(() => (data ? displayNames(data) : {}), [data]);
  const hidden = useMemo(
    () =>
      new Set([
        ...(data ? Object.keys(data.pets) : []),
        ...(boss?.rare_drops ?? []).map((r) => r.item),
        ...(boss?.pet ? [boss.pet.id] : []),
      ]),
    [data, boss],
  );

  if (boss === null) {
    return <SimulatorNotFound title="Boss not found" backLabel="Back to bosses" backPath="/simulator/bosses" />;
  }
  if (!playerState || !boss || !data || !sel) return <LoadingScreen />;

  const resolved = resolveCombat(playerState, data, sel, isle);
  const mercCount = boss.raid ? sel.mercIds.length : 0;
  const partyScale = boss.raid ? RAID_FULL_PARTY / (1 + mercCount) : 1;

  const runSessionMs = sessionMs(playerState, data, isle);

  const buildJob = (samples: number): SimulationJob => ({
    kind: 'boss',
    inputs: resolved.inputs,
    usesPotion: !!sel.potionKey,
    eatOrder: sel.eatOrder,
    boss: bossTarget(playerState, data, boss, sel.mercIds),
    collection: collectionContext(playerState, data, 'boss', isle),
    sessionMs: runSessionMs,
    samples,
    seed: 1,
    bossWinsToday: isle ? 0 : bossWinsToday(playerState, boss.id),
  });

  const magicWithoutSpell = resolved.style === 'magic' && !resolved.spell;

  return (
    <div className="flex flex-col gap-3 p-4">
      <PageHeader
        // "Sol Invictus, the Sundered Flame" -> "Sol Invictus": the title after the comma is too long for the header.
        title={boss.display_name.split(',')[0]}
        backLabel="Back to bosses"
        backPath="/simulator/bosses"
        badge={boss.raid ? 'Raid' : 'Solo'}
      />

      <BossInfoSection
        boss={boss}
        playerState={playerState}
        events={events}
        partyScale={partyScale}
        mercCount={mercCount}
        names={names}
      />

      <CombatInputsSection
        playerState={playerState}
        data={data}
        sel={sel}
        onChange={setSel}
        resolved={resolved}
        combatStyleInfo={isle ? 'Elder Isle: uses your Elder levels, and XP goes to your Elder skills.' : undefined}
      />

      {boss.raid && (
        <MercenaryPicker
          mercenaries={data.mercenaries}
          selectedIds={sel.mercIds}
          onChange={(mercIds) => setSel({ ...sel, mercIds })}
        />
      )}

      <SimulationResultsSection
        buildJob={buildJob}
        kind="boss"
        storageKey={`simulator:boss:${bossId}`}
        names={names}
        hidden={hidden}
        disabledReason={magicWithoutSpell ? 'Pick a spell first.' : (resolved.invalid ?? undefined)}
      />
    </div>
  );
}
