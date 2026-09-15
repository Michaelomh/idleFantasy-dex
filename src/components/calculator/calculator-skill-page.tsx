import { useEffect, useMemo, useState } from 'react';
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
  formatMinSec,
  type SessionResult,
  type TargetOption,
  type CalculatorInputs,
  type ModifierRow,
} from '@/lib/calculator';
import { formatNumber } from '@/lib/format-number';
import { LoadingScreen } from '@/components/loading-screen';
import { WipNotice } from '@/components/wip-notice';
import { Separator } from '@/components/ui/separator';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function defaultTarget(targets: TargetOption[]): string {
  const unlocked = targets.filter((t) => !t.locked);
  const pool = unlocked.length > 0 ? unlocked : targets;
  return pool.reduce((best, t) => (t.levelRequired > best.levelRequired ? t : best), pool[0])?.key ?? '';
}

type SectionId = 'yield' | 'xp' | 'session';
const DEFAULT_SECTION_ORDER: SectionId[] = ['yield', 'xp', 'session'];

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
        {rows.map((row, i) => (
          <div key={row.label}>
            {i > 0 && <Separator className="my-1.5" />}
            <div className="flex items-baseline justify-between gap-2">
              <span className="body min-w-0 truncate text-text-secondary">{row.label}</span>
              <span className="data shrink-0">{row.value}</span>
            </div>
          </div>
        ))}
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
  const [qty, setQty] = useState(1);
  const [cropCount, setCropCount] = useState<number | null>(null);
  const [defaultCropCount, setDefaultCropCount] = useState(3);
  const [ashCatalystKey, setAshCatalystKey] = useState<string | null>(null);
  const [timedBoostsEnabled, setTimedBoostsEnabled] = useState(true);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);

  const config = useMemo(() => skillInputConfig(skillId), [skillId]);
  const isGathering = SKILLS.find((s) => s.id === skillId)?.category === 'Gathering';

  useEffect(() => {
    if (!playerState || skillId !== 'farming') return;
    let cancelled = false;
    totalPatchCount(playerState, playerState.raw.skillLevels.farming ?? 1).then((count) => {
      if (!cancelled) setDefaultCropCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [skillId, playerState]);

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    targetsForSkill(skillId, playerState)
      .then((options) => {
        if (cancelled) return;
        setTargets(options);
        setTargetKey(defaultTarget(options));
        setResult(null);
        setError(null);
        setSectionOrder(DEFAULT_SECTION_ORDER);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error(`[calculator] failed to load targets for ${skillId}`, e);
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [skillId, playerState]);

  const inputs: CalculatorInputs | null = useMemo(() => {
    if (!targetKey || !playerState) return null;
    return {
      targetKey,
      qty: config.showQty ? qty : undefined,
      cropCount: config.showCropCount ? (cropCount ?? defaultCropCount) : undefined,
      ashCatalystKey: config.showAshCatalyst ? ashCatalystKey : null,
      timedBoostsEnabled,
    };
  }, [targetKey, qty, cropCount, defaultCropCount, ashCatalystKey, timedBoostsEnabled, config, playerState, skillId]);

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

  if (!playerState || !targets) {
    return <LoadingScreen />;
  }

  const ashOptions = ashCatalystOptions(playerState);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <span className="h3">Inputs</span>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="target" className="min-w-0 truncate">
            Target
          </Label>
          <NativeSelect id="target" className="w-56" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
            {targets.map((t) => (
              <NativeSelectOption key={t.key} value={t.key}>
                {t.label} {t.locked ? `(needs level ${t.levelRequired})` : ''}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {config.showQty && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="qty" className="min-w-0 truncate">
              Qty
            </Label>
            <Input
              id="qty"
              type="number"
              min={1}
              className="w-20"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        )}

        {config.showCropCount && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="crop-count" className="min-w-0 truncate">
              Crop count
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

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="timed-boosts" className="min-w-0 truncate">
            Timed boosts
          </Label>
          <Switch id="timed-boosts" checked={timedBoostsEnabled} onCheckedChange={setTimedBoostsEnabled} />
        </div>

        {result?.materialsRequired && result.materialsRequired.length > 0 && (
          <div className="flex flex-col items-baseline justify-between gap-2">
            <Label className="body text-white">Materials required</Label>
            <p className="data">
              {result.materialsRequired
                .map((m) => `${m.label} x${formatNumber(m.qty)} (${formatNumber(m.owned)})`)
                .join(', ')}
            </p>
          </div>
        )}
      </div>

      {skillId === 'thieving' && <WipNotice />}

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
                        {item.rangeMin} - {item.rangeMax}
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
            <BreakdownSection title="Probability breakdown" rows={result.successBreakdown} defaultOpen={true} />
          )}

          {(() => {
            const sectionDefs: Record<SectionId, { title: string; rows: ModifierRow[]; defaultOpen: boolean } | null> =
              {
                yield:
                  result.yieldBreakdown.length > 0
                    ? { title: 'Yield breakdown', rows: result.yieldBreakdown, defaultOpen: isGathering }
                    : null,
                xp:
                  result.xpBreakdown.length > 0
                    ? { title: 'XP breakdown', rows: result.xpBreakdown, defaultOpen: false }
                    : null,
                session:
                  result.sessionBreakdown.length > 0
                    ? { title: 'Session length breakdown', rows: result.sessionBreakdown, defaultOpen: false }
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
