import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { usePlayerState } from '@/lib/player/use-player-state';
import { matchRoute } from '@/lib/app/routes';
import { SKILLS } from '@/lib/game/skills';
import {
  SESSION_CALCULATORS,
  targetsForSkill,
  ashCatalystOptions,
  skillInputConfig,
  totalPatchCount,
  hasCropRotationBonus,
  formatMinSec,
  targetFilterGroupsForSkill,
  applyTargetFilters,
  type SessionResult,
  type TargetOption,
  type CalculatorInputs,
  type ModifierRow,
} from '@/lib/calculator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { formatNumber } from '@/lib/utils/format-number';
import { LoadingScreen } from '@/components/loading-screen';
import { Separator } from '@/components/ui/separator';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatusNotice } from '@/components/status-notice';

function defaultTarget(targets: TargetOption[]): string {
  const unlocked = targets.filter((t) => !t.locked);
  const pool = unlocked.length > 0 ? unlocked : targets;
  return pool.reduce((best, t) => (t.levelRequired > best.levelRequired ? t : best), pool[0])?.key ?? '';
}

type SectionId = 'yield' | 'xp' | 'session';
const DEFAULT_SECTION_ORDER: SectionId[] = ['yield', 'xp', 'session'];

const MATERIAL_SAVE_PRESTIGE_PATH: Partial<Record<string, { name: string; percent: number }>> = {
  smithing: { name: 'Thrift', percent: 30 },
  crafting: { name: 'Thrift', percent: 30 },
  construction: { name: 'Halfling race', percent: 15 },
};

const MATERIAL_SAVE_SKILLS = ['smithing', 'crafting', 'construction', 'fletching', 'herblore', 'cooking'];

function materialSaveInfo(skillId: string): string | undefined {
  if (!MATERIAL_SAVE_SKILLS.includes(skillId)) return undefined;
  const prestige = MATERIAL_SAVE_PRESTIGE_PATH[skillId];
  return (
    "Materials required can be lower due to Artisan's Workshop (secondary materials, up to 15%)" +
    (prestige ? ` or the ${prestige.name} prestige path (all materials, up to ${prestige.percent}%)` : '') +
    '.'
  );
}

type PersistedCalculatorInputs = {
  targetKey?: string;
  qty?: string;
  cropCount?: number;
  ashCatalystKey?: string | null;
  cropRotated?: boolean;
  timedBoostsEnabled?: boolean;
};

function BreakdownSection({ title, rows, defaultOpen }: { title: string; rows: ModifierRow[]; defaultOpen: boolean }) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="flex flex-col gap-2 rounded-card border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger className="group/trigger flex flex-1 items-center justify-between gap-2 text-left">
          <span className="h3 min-w-0 truncate">{title}</span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="flex flex-col gap-2">
        {rows.map((row, i) =>
          row.heading ? (
            <div key={row.label}>
              {i > 0 && <Separator className="my-1.5" />}
              <span className="label text-text-secondary uppercase">{row.label}</span>
            </div>
          ) : (
            <div key={row.label}>
              {i > 0 && !rows[i - 1]?.heading && <Separator className="my-1.5" />}
              <div className={`flex items-baseline justify-between gap-2 ${row.disabled ? 'opacity-50' : ''}`}>
                <span className="body flex min-w-0 items-center gap-1.5 text-text-secondary">
                  <span className="min-w-0 truncate">{row.label}</span>
                  {row.warning && <StatusNotice variant="unvalidated" message={row.warning} />}
                  {row.info && <StatusNotice variant="info" message={row.info} />}
                </span>
                <span className="data shrink-0">{row.value}</span>
              </div>
            </div>
          ),
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CalculatorSkillPage() {
  const location = useLocation();
  const match = matchRoute(location.pathname);
  const skillId = match?.path.replace('/calculator/', '') ?? '';
  const playerState = usePlayerState();
  const [targets, setTargets] = useState<TargetOption[] | null>(null);
  const [targetKey, setTargetKey] = useState('');
  const [qty, setQty] = useState('1');
  const [cropCount, setCropCount] = useState<number | null>(null);
  const [defaultCropCount, setDefaultCropCount] = useState(3);
  const [ashCatalystKey, setAshCatalystKey] = useState<string | null>(null);
  const [cropRotated, setCropRotated] = useState(false);
  const [timedBoostsEnabled, setTimedBoostsEnabled] = useState(true);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string | undefined>>({});
  const [persistedInputs, setPersistedInputs] = useSessionStorage<PersistedCalculatorInputs>(
    `calculator:${skillId}`,
    {},
  );
  const hydrating = useRef(true);

  const config = useMemo(() => skillInputConfig(skillId), [skillId]);
  const isGathering = SKILLS.find((s) => s.id === skillId)?.category === 'Gathering';
  const filterGroups = useMemo(() => targetFilterGroupsForSkill(skillId, selectedFilters), [skillId, selectedFilters]);

  useEffect(() => {
    if (!playerState || !skillId) return;
    hydrating.current = true;
    let cancelled = false;

    Promise.all([
      targetsForSkill(skillId, playerState),
      totalPatchCount(playerState, playerState.raw.skillLevels.farming ?? 1),
      hasCropRotationBonus(playerState),
    ])
      .then(([options, patchCount, cropRotationDefault]) => {
        if (cancelled) return;
        const persistedTargetValid =
          persistedInputs.targetKey && options.some((o) => o.key === persistedInputs.targetKey);
        setTargets(options);
        setTargetKey(persistedTargetValid ? persistedInputs.targetKey! : defaultTarget(options));
        setQty(persistedInputs.qty ?? '1');
        setCropCount(persistedInputs.cropCount ?? null);
        setDefaultCropCount(patchCount);
        setAshCatalystKey(persistedInputs.ashCatalystKey ?? null);
        setCropRotated(persistedInputs.cropRotated ?? cropRotationDefault);
        setTimedBoostsEnabled(persistedInputs.timedBoostsEnabled ?? true);
        setSelectedFilters({});
        setResult(null);
        setError(null);
        setSectionOrder(DEFAULT_SECTION_ORDER);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error(`[calculator] failed to load targets for ${skillId}`, e);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) hydrating.current = false;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, playerState]);

  useEffect(() => {
    if (!skillId || hydrating.current) return;
    setPersistedInputs({
      targetKey,
      qty,
      ...(cropCount !== null ? { cropCount } : {}),
      ashCatalystKey,
      cropRotated,
      timedBoostsEnabled,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, targetKey, qty, cropCount, ashCatalystKey, cropRotated, timedBoostsEnabled]);

  const qtyValid = /^\d+$/.test(qty) && Number(qty) > 0;

  const inputs: CalculatorInputs | null = useMemo(() => {
    if (!targetKey || !playerState) return null;
    if (config.showQty && !qtyValid) return null;
    return {
      targetKey,
      qty: config.showQty ? Number(qty) : undefined,
      cropCount: config.showCropCount ? (cropCount ?? defaultCropCount) : undefined,
      ashCatalystKey: config.showAshCatalyst ? ashCatalystKey : null,
      timedBoostsEnabled,
      cropRotated: config.showCropRotation ? cropRotated : undefined,
    };
  }, [
    targetKey,
    qty,
    qtyValid,
    cropCount,
    defaultCropCount,
    ashCatalystKey,
    cropRotated,
    timedBoostsEnabled,
    config,
    playerState,
  ]);

  useEffect(() => {
    if (!playerState || !inputs) return;
    const calculate = SESSION_CALCULATORS[skillId];
    if (!calculate) return;
    let cancelled = false;
    calculate(playerState, inputs)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error(`[calculator] failed to compute session for ${skillId}`, e);
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [playerState, skillId, inputs]);

  const filteredTargets = useMemo(
    () => applyTargetFilters(targets ?? [], filterGroups, selectedFilters),
    [targets, filterGroups, selectedFilters],
  );

  function handleFilterChange(groupId: string, values: string[]) {
    const nextFilters: Record<string, string | undefined> = { ...selectedFilters, [groupId]: values[0] };
    const nextGroups = targetFilterGroupsForSkill(skillId, nextFilters);
    for (const id of Object.keys(nextFilters)) {
      const group = nextGroups.find((g) => g.id === id);
      const value = nextFilters[id];
      if (!group || (value && !group.options.includes(value))) {
        nextFilters[id] = undefined;
      }
    }
    setSelectedFilters(nextFilters);
    const nextTargets = applyTargetFilters(targets ?? [], nextGroups, nextFilters);
    if (targetKey && !nextTargets.some((t) => t.key === targetKey)) {
      setTargetKey(defaultTarget(nextTargets));
    }
  }

  if (!playerState || !targets) {
    return <LoadingScreen />;
  }

  const ashOptions = ashCatalystOptions(playerState);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="h1">{match?.title ?? 'Calculator'}</h1>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <span className="h3">Inputs</span>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="target" className="min-w-0 truncate">
            Target
          </Label>
          <NativeSelect id="target" className="w-56" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
            {filteredTargets.map((t) => (
              <NativeSelectOption key={t.key} value={t.key}>
                {t.label} {t.locked ? `(needs level ${t.levelRequired})` : ''}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {filterGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-1.5">
            <Label className="min-w-0 truncate">{group.label}</Label>
            <ToggleGroup
              value={selectedFilters[group.id] ? [selectedFilters[group.id]!] : []}
              onValueChange={(values) => handleFilterChange(group.id, values)}
              className="flex flex-wrap gap-1.5 rounded-none border-none bg-transparent p-0"
            >
              {group.options.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  variant="outline"
                  size="sm"
                  className="rounded-full data-pressed:bg-primary data-pressed:text-primary-foreground"
                >
                  {option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ))}

        {config.showQty && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="qty" className="min-w-0 truncate">
              Qty
            </Label>
            <Input
              id="qty"
              type="number"
              min={1}
              className={`w-20 ${qtyValid ? '' : 'border-destructive'}`}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
        )}

        {config.showCropCount && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="crop-count" className="min-w-0 truncate">
              Farming Patches
            </Label>
            <Input
              id="crop-count"
              type="number"
              min={1}
              className="w-20"
              value={cropCount ?? defaultCropCount}
              onChange={(e) => setCropCount(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        )}

        {config.showAshCatalyst && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ash" className="min-w-0 truncate">
              Ash catalyst
            </Label>
            <NativeSelect
              id="ash"
              className="w-56"
              value={ashCatalystKey ?? ''}
              onChange={(e) => setAshCatalystKey(e.target.value || null)}
            >
              <NativeSelectOption value="">None</NativeSelectOption>
              {ashOptions.map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {key}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}

        {config.showCropRotation && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="crop-rotation" className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="truncate">Crop Rotation</span>
              <StatusNotice
                variant="info"
                className="size-3.5"
                message="Unlocked via Farming's Rotation prestige path - each tier boosts yield when the newly planted crop differs from the last one harvested on that patch. The final tier makes the bonus always active."
              />
            </Label>
            <Switch id="crop-rotation" checked={cropRotated} onCheckedChange={setCropRotated} />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="timed-boosts" className="min-w-0 truncate">
            Timed Boosts
          </Label>
          <Switch id="timed-boosts" checked={timedBoostsEnabled} onCheckedChange={setTimedBoostsEnabled} />
        </div>

        {result?.materialsRequired && result.materialsRequired.length > 0 && (
          <div className="flex flex-col items-baseline justify-between gap-2">
            <Label className="body flex min-w-0 items-center gap-1.5 truncate text-white">
              <span className="truncate">Materials required</span>
              {materialSaveInfo(skillId) && (
                <StatusNotice variant="info" className="size-3.5" message={materialSaveInfo(skillId)} />
              )}
            </Label>
            <p className="data">
              {result.materialsRequired.map((m) => `${m.label} x${formatNumber(m.qty)}`).join(', ')}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-card border border-destructive bg-card p-3">
          <span className="body text-destructive">Couldn't compute this session: {error}</span>
        </div>
      )}

      {result && (
        <>
          <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
            <div>
              {result.guaranteedItems.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="h3">Summary</span>
                  {result.guaranteedItems.map((item) => (
                    <div key={item.key} className="flex items-baseline justify-between gap-2">
                      <span className="body min-w-0 truncate text-white!">{item.label}</span>
                      <span className="data shrink-0">
                        {formatNumber(item.qty ?? 0)}
                        {item.qtyMin !== undefined && item.qtyMax !== undefined && (
                          <span>
                            {' '}
                            ({formatNumber(item.qtyMin)} - {formatNumber(item.qtyMax)})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {result.bonusItems.length > 0 && (
                <div className={`flex flex-col gap-1 ${result.guaranteedItems.length > 0 ? 'pl-2' : ''}`}>
                  {result.guaranteedItems.length === 0 && <span className="h3">Summary</span>}
                  {result.bonusItems.map((item) => (
                    <div key={item.key} className="flex items-baseline justify-between gap-2">
                      <span
                        className={`body min-w-0 truncate ${result.guaranteedItems.length === 0 ? 'text-white!' : ''}`}
                      >
                        {item.label}
                      </span>
                      <span className="data shrink-0">
                        {item.expected.toFixed(2)}
                        <span className="body text-text-secondary">
                          {' '}
                          ({item.rangeMin} - {item.rangeMax})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="h3 min-w-0 truncate">XP</span>
              <span className="data shrink-0">
                {formatNumber(result.xp.value)}
                {result.xp.min !== undefined && result.xp.max !== undefined && (
                  <span>
                    {' '}
                    ({formatNumber(result.xp.min)} - {formatNumber(result.xp.max)})
                  </span>
                )}
              </span>
            </div>

            {result.successRate !== undefined && (
              <div className="flex items-baseline justify-between gap-2">
                <span className="h3 min-w-0 truncate">Success chance</span>
                <span className="data shrink-0">{(result.successRate * 100).toFixed(1)}%</span>
              </div>
            )}

            {result.sessionMinutes > 0 && (
              <div className="flex items-baseline justify-between gap-2">
                <span className="h3 min-w-0 truncate">Session length</span>
                <span className="data shrink-0">{formatMinSec(result.sessionMinutes)}</span>
              </div>
            )}
          </div>

          {result.successBreakdown && result.successBreakdown.length > 0 && (
            <BreakdownSection title="Probability Breakdown" rows={result.successBreakdown} defaultOpen={true} />
          )}

          {(() => {
            const sectionDefs: Record<SectionId, { title: string; rows: ModifierRow[]; defaultOpen: boolean } | null> =
              {
                yield:
                  result.yieldBreakdown.length > 0
                    ? { title: 'Yield Breakdown', rows: result.yieldBreakdown, defaultOpen: isGathering }
                    : null,
                xp:
                  result.xpBreakdown.length > 0
                    ? { title: 'XP Breakdown', rows: result.xpBreakdown, defaultOpen: false }
                    : null,
                session:
                  result.sessionBreakdown.length > 0
                    ? { title: 'Session length Breakdown', rows: result.sessionBreakdown, defaultOpen: false }
                    : null,
              };
            const visible = sectionOrder.filter((id): id is SectionId => sectionDefs[id] !== null);

            return visible.map((id) => {
              const def = sectionDefs[id];
              if (!def) return null;
              return <BreakdownSection key={id} title={def.title} rows={def.rows} defaultOpen={def.defaultOpen} />;
            });
          })()}
        </>
      )}
    </div>
  );
}
