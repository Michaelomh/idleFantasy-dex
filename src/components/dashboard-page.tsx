import { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { resolveAllSkillBonuses, type SkillBonus } from '@/lib/bonuses';
import { computeAllCategories, rollUp } from '@/lib/progress';
import { CATEGORY_ORDER } from '@/lib/game/skills';
import { SkillBonusRow } from '@/components/skill-bonus-row';
import { CharacterSwitcherSheet } from '@/components/character-switcher-sheet';
import { Banner } from '@/components/banner.tsx';
import { Button } from '@/components/ui/button.tsx';
import { CircularProgress } from '@/components/ui/circular-progress.tsx';
import { formatNumber } from '@/lib/utils/format-number';
import { LoadingScreen } from '@/components/loading-screen';
import { useHideExperimental } from '@/lib/hooks/use-hide-experimental';
import { humanize } from '@/lib/utils/humanize';
import {
  getCachedSave,
  getDirectoryHandle,
  humanAge,
  scanBackupDir,
  staleness,
  type PlayerState,
  type StalenessType,
} from '@/lib/save-source';
import { clearExplore, getSelectedSlot, setSelectedSlot } from '@/lib/app/boot-state.ts';

const MAX_COMBAT_LEVEL = 113;

const STATUS_COLORS: Record<StalenessType, { dot: string; text: string }> = {
  fresh: { dot: 'bg-fresh', text: 'text-fresh' },
  aging: { dot: 'bg-aging', text: 'text-aging' },
  stale: { dot: 'bg-stale', text: 'text-stale' },
  future: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  unknown: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
};

export function DashboardPage() {
  const [hideExperimental] = useHideExperimental();
  const playerState = usePlayerState();
  const [override, setOverride] = useState<PlayerState | null>(null);
  const [skillBonuses, setSkillBonuses] = useState<SkillBonus[] | null>(null);
  const [hasHandle, setHasHandle] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<number | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

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

  useEffect(() => {
    if (!effectivePlayerState) return;
    let cancelled = false;
    void computeAllCategories(effectivePlayerState).then((categories) => {
      if (!cancelled) setCompletion(rollUp(categories) * 100);
    });
    return () => {
      cancelled = true;
    };
  }, [effectivePlayerState]);

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

  async function handleSwitchCharacter(identity: string) {
    setSelectedSlot(identity);
    clearExplore();
    const cached = await getCachedSave(identity);
    if (cached) setOverride(cached.playerState);
    setSwitcherOpen(false);
  }

  if (!effectivePlayerState) return <LoadingScreen />;

  const playerStateForRender = effectivePlayerState;
  const stale = staleness(playerStateForRender.exportedAt);
  const statusColor = STATUS_COLORS[stale.type];
  const showStaleBanner = hasHandle && (stale.type === 'aging' || stale.type === 'stale');
  const staleDays = stale.ageMs != null ? Math.round(stale.ageMs / (24 * 60 * 60 * 1000)) : 0;

  const chips = [humanize(playerStateForRender.race), playerStateForRender.gender].filter(Boolean) as string[];
  if (playerStateForRender.ironman) chips.push('Ironman');

  const bottomStats: { label: string; value: string | null }[] = [
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

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', statusColor.dot)} />
          <span className={cn('label', statusColor.text)}>
            {stale.label} (updated {humanAge(stale.ageMs)} ago)
          </span>
        </div>
        {hasHandle && !showStaleBanner && (
          <Button
            variant="secondary"
            size="icon-sm"
            className="rounded-full"
            onClick={() => void handleSync()}
            disabled={syncing}
            aria-label="Sync"
          >
            <RefreshCw className={syncing ? 'animate-spin' : ''} />
          </Button>
        )}
      </div>

      {showStaleBanner && (
        <Banner
          tone={stale.type as 'aging' | 'stale'}
          className="mx-0 my-0"
          title={`Save is ${staleDays} ${staleDays === 1 ? 'day' : 'days'} old`}
          description="These numbers can differ from your game."
          action={
            <Button variant="primary" onClick={() => void handleSync()} disabled={syncing}>
              <RefreshCw className={syncing ? 'animate-spin' : ''} /> Sync now
            </Button>
          }
        />
      )}

      {syncError && <p className="label text-destructive">{syncError}</p>}

      <CircularProgress value={completion ?? 0} size={280} strokeWidth={18} className="self-center">
        <span className="num-xl">{completion != null ? `${completion.toFixed(1)}%` : '—'}</span>
        <span className="label mt-1 text-text-secondary">Completion</span>
      </CircularProgress>

      <div className="flex flex-col items-center gap-1 text-center">
        <button type="button" onClick={() => setSwitcherOpen(true)} className="flex items-center gap-1">
          <span className="h1">{playerStateForRender.character ?? 'Adventurer'}</span>
          <ChevronDown className="size-5 text-text-secondary" />
        </button>
        <p className="body text-text-secondary">{humanize(playerStateForRender.title) || 'No title yet'}</p>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {chips.map((chip) => (
              <span key={chip} className="label rounded-full border border-border px-3 py-1 text-text-secondary">
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-card p-4">
          <p className="label text-text-secondary">Combat</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="data text-3xl">{playerStateForRender.combatLevel ?? '-'}</span>
            {playerStateForRender.combatLevel != null && (
              <span className="data text-text-secondary">/ {MAX_COMBAT_LEVEL}</span>
            )}
          </p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="label text-text-secondary">Total</p>
          <p className="data mt-1 text-3xl">
            {playerStateForRender.totalLevel != null ? playerStateForRender.totalLevel.toLocaleString() : '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {bottomStats.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-0.5 rounded-card border border-border p-3 text-left"
          >
            <p className="data text-sm">{value ?? '-'}</p>
            <p className="label whitespace-normal text-text-secondary">{label}</p>
          </div>
        ))}
      </div>

      {!hideExperimental &&
        (!skillBonuses ? (
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
        ))}

      <CharacterSwitcherSheet
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
        currentIdentity={getSelectedSlot()}
        onSelect={(identity) => void handleSwitchCharacter(identity)}
      />
    </div>
  );
}
