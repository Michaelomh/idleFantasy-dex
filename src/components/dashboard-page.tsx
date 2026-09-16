import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePlayerState } from '@/lib/player/use-player-state';
import { resolveAllSkillBonuses, computeActiveBoosts, type SkillBonus } from '@/lib/bonuses';
import { CATEGORY_ORDER } from '@/lib/game/skills';
import { SkillBonusRow } from '@/components/skill-bonus-row';
import { ActiveBoostsSection } from '@/components/active-boosts-section';
import { Button } from '@/components/ui/button.tsx';
import { formatNumber } from '@/lib/utils/format-number';
import { LoadingScreen } from '@/components/loading-screen';
import { humanize } from '@/lib/utils/humanize';
import {
  getCachedSave,
  getDirectoryHandle,
  humanAge,
  scanBackupDir,
  staleness,
  type PlayerState,
} from '@/lib/save-source';
import { getSelectedSlot } from '@/lib/app/boot-state.ts';

export function DashboardPage() {
  const playerState = usePlayerState();
  const [override, setOverride] = useState<PlayerState | null>(null);
  const [skillBonuses, setSkillBonuses] = useState<SkillBonus[] | null>(null);
  const [hasHandle, setHasHandle] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const effectivePlayerState = override ?? playerState;

  useEffect(() => {
    void getDirectoryHandle().then((handle) => setHasHandle(!!handle));
  }, []);

  useEffect(() => {
    if (!effectivePlayerState) return;
    let cancelled = false;
    void resolveAllSkillBonuses(effectivePlayerState).then((result) => {
      if (!cancelled) setSkillBonuses(result);
    });
    return () => {
      cancelled = true;
    };
  }, [effectivePlayerState]);

  const activeBoosts = useMemo(
    () => (effectivePlayerState ? computeActiveBoosts(effectivePlayerState) : []),
    [effectivePlayerState],
  );

  async function handleSync() {
    setSyncError(null);
    setSyncing(true);
    try {
      const identity = getSelectedSlot();
      const result = await scanBackupDir({ userGesture: true });
      if (result.kind !== 'scanned') {
        setSyncError('Could not reach the backup folder - check its permission and try again.');
        return;
      }
      if (identity) {
        const cached = await getCachedSave(identity);
        if (cached) setOverride(cached.playerState);
      }
    } finally {
      setSyncing(false);
    }
  }

  if (!effectivePlayerState) return <LoadingScreen />;

  const playerStateForRender = effectivePlayerState;
  const stale = staleness(playerStateForRender.exportedAt);

  const stats: { label: string; value: string | number | null }[] = [
    { label: 'Combat level', value: playerStateForRender.combatLevel },
    { label: 'Total level', value: playerStateForRender.totalLevel },
    { label: 'Coins', value: playerStateForRender.coins != null ? formatNumber(playerStateForRender.coins) : null },
    {
      label: 'Carnival tickets',
      value: playerStateForRender.carnivalTickets != null ? formatNumber(playerStateForRender.carnivalTickets) : null,
    },
    {
      label: 'Slayer points',
      value: playerStateForRender.slayerPoints != null ? formatNumber(playerStateForRender.slayerPoints) : null,
    },
  ];

  const identity = [
    humanize(playerStateForRender.title),
    humanize(playerStateForRender.race),
    playerStateForRender.gender,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="h1">{playerStateForRender.character ?? 'Adventurer'}</h1>
          {playerStateForRender.ironman && (
            <span className="label inline-flex w-fit items-center rounded-md border border-border px-2 py-1 text-text-secondary">
              IRONMAN
            </span>
          )}
        </div>
        <p className="body text-text-secondary">{identity || 'No character details yet'}</p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <p className="label text-text-secondary">Save status</p>
          <p className="body">
            {stale.label} ({humanAge(stale.ageMs)})
          </p>
          {syncError && <p className="label text-destructive">{syncError}</p>}
        </div>
        <div className="flex items-center gap-2">
          {hasHandle && (
            <Button variant="secondary" size="sm" onClick={() => void handleSync()} disabled={syncing}>
              <RefreshCw className={syncing ? 'animate-spin' : ''} /> Sync
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="label text-text-secondary">{label}</p>
            <p className="data text-lg">{value ?? '-'}</p>
          </div>
        ))}
      </div>

      <ActiveBoostsSection boosts={activeBoosts} />

      {!skillBonuses ? (
        <p className="body text-text-secondary">Loading bonuses…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((category) => {
            const skillsInCategory = skillBonuses.filter((s) => s.category === category);
            if (skillsInCategory.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
                <span className="h3">{category}</span>
                <div className="flex flex-col">
                  {skillsInCategory.map((skill) => (
                    <SkillBonusRow key={skill.id} skill={skill} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
