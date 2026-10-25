import { Loader2 } from 'lucide-react';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { cn } from 'cn';
import { humanize } from '@/lib/utils/humanize';
import { formatMinSec } from '@/lib/utils/duration';
import { useSimulation } from '@/lib/hooks/use-simulation';
import type { SimulationJob, SimulationSummary } from '@/lib/simulator/run-simulation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { fmt, formatNumber, pct } from '@/lib/utils/format-number';
import { CompactRows, HeadlineRow, type CompactRow, type RangedValue } from './stat-rows';

const SAMPLE_PRESETS = [500, 2000, 5000];

const SKILL_ORDER = ['attack', 'strength', 'ranged', 'magic', 'defense', 'hitpoints', 'prayer'];
const skillLabel = (s: string) => (s === 'defense' ? 'Defence' : humanize(s));

type Range = { mean: number; p5: number; p95: number };

/**
 * Average plus its 5th to 95th percentile. The range is left out when both ends are the same
 * (e.g. "0 - 0" when most runs get none and a few lucky ones lift the average).
 */
function ranged(r: Range, mean: (v: number) => string, bound: (v: number) => string = mean): RangedValue {
  const [lo, hi] = [bound(r.p5), bound(r.p95)];
  const value = mean(r.mean);
  return { value, range: lo === hi ? undefined : `${lo} - ${hi}` };
}

const whole = (v: number) => fmt(v);
const twoDp = (v: number) => v.toFixed(2);
/** Full numbers up to 100,000, then the short K / M form. */
const compact = (v: number) => (Math.abs(v) < 100_000 ? fmt(v) : formatNumber(Math.round(v)));

function Results({
  summary,
  kind,
  names,
  hidden,
}: {
  summary: SimulationSummary;
  kind: SimulationJob['kind'];
  names: Record<string, string>;
  /** Rare drops and pets, left out of the results. */
  hidden: Set<string>;
}) {
  const isBoss = kind === 'boss';
  const name = (k: string) => names[k] ?? humanize(k);

  const loot: CompactRow[] = [
    ...Object.entries(summary.items)
      .filter(([k]) => !hidden.has(k))
      .sort(([, a], [, b]) => b.mean - a.mean)
      .map(([k, r]) => ({ label: name(k), ...ranged(r, twoDp, whole) })),
    { label: 'Coins', ...ranged(summary.coins, whole) },
  ];
  const kills: CompactRow[] = Object.entries(summary.kills).map(([k, r]) => ({
    label: name(k),
    ...ranged(r, (v) => fmt(v, v < 1 ? 2 : v < 10 ? 1 : 0), whole),
  }));
  const used: CompactRow[] = [
    ...Object.entries(summary.arrows).map(([k, v]) => ({
      label: name(k),
      value: fmt(v),
      hint: `You get ${fmt(summary.arrowsReclaimed[k] ?? 0)} back`,
    })),
    ...(summary.runes > 0
      ? [{ label: 'Runes', value: fmt(summary.runes), hint: `You get ${fmt(summary.runesReclaimed)} back` }]
      : []),
  ];
  const xpBySkill: CompactRow[] = Object.keys(summary.xp)
    .sort((a, b) => SKILL_ORDER.indexOf(a) - SKILL_ORDER.indexOf(b))
    .map((s) => ({ label: skillLabel(s), ...ranged(summary.xp[s], compact) }));
  const food = Object.entries(summary.food)
    .map(([k, v]) => `${fmt(v, 1)}x ${name(k).replace(/^Cooked /, '')}`)
    .join(', ');
  const rate = summary.successRate;
  const overview: CompactRow[] = [
    {
      label: isBoss ? 'Win chance' : 'Survival chance',
      value: pct(rate),
      valueClassName: rate < 0.15 ? 'text-destructive' : rate < 0.5 ? 'text-aging' : undefined,
      hint:
        isBoss && summary.timeoutRate > 0
          ? `${pct(summary.timeoutRate)} run out of time. The winner is decided by the HP each side has left`
          : undefined,
    },
    { label: 'Time elapsed', ...ranged(summary.minutes, formatMinSec) },
    ...(food ? [{ label: 'Food eaten', value: food }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="h3">Results</span>
        <p className="body text-sm text-text-secondary">
          Averages over {fmt(summary.samples)} simulated runs. The range in brackets is where 90% of runs land.
        </p>
      </div>
      <CompactRows rows={overview} />
      <CompactRows title="Loot" rows={loot} />
      {!isBoss && <CompactRows title="Kills" rows={kills} />}
      <CompactRows title="Used" rows={used} />
      <div className="flex flex-col gap-2">
        <HeadlineRow label="XP" {...ranged(summary.xpTotal, compact)} />
        <CompactRows rows={xpBySkill} />
      </div>
    </div>
  );
}

export function SimulationResultsSection({
  buildJob,
  kind,
  names,
  hidden,
  disabledReason,
  storageKey,
}: {
  buildJob: (samples: number) => SimulationJob;
  kind: SimulationJob['kind'];
  names: Record<string, string>;
  /** Rare drops and pets, left out of the results. */
  hidden: Set<string>;
  disabledReason?: string;
  /** Session storage prefix for the run count and last result, e.g. simulator:boss:<id>. */
  storageKey: string;
}) {
  const [samples, setSamples] = useSessionStorage(`${storageKey}:runs`, 2000);
  const { summary, isRunning, error, run } = useSimulation(`${storageKey}:result`);
  // The setup a result was run with, to flag it once anything changes. Run count is left out.
  const [ranWith, setRanWith] = useSessionStorage<string | null>(`${storageKey}:ran-with`, null);
  const setupKey = JSON.stringify({ ...buildJob(0), samples: undefined });
  const isStale = !!summary && ranWith !== setupKey;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <span className="h3">Simulation</span>
      <div className="flex flex-col gap-4">
        <div role="group" aria-labelledby="sim-runs" className="flex flex-col gap-1.5">
          <Label id="sim-runs">Runs to simulate</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={samples === preset}
                onClick={() => setSamples(preset)}
                className={cn(
                  'label rounded-md border border-border px-2.5 py-1.5',
                  samples === preset && 'border-primary bg-primary/10 text-primary',
                )}
              >
                {fmt(preset)}
              </button>
            ))}
            <Button
              size="sm"
              className="ml-auto h-auto self-stretch py-1.5 text-xs"
              onClick={() => {
                setRanWith(setupKey);
                run(buildJob(samples));
              }}
              disabled={isRunning || !!disabledReason}
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running…
                </>
              ) : (
                'Start simulation'
              )}
            </Button>
          </div>
          {disabledReason && <p className="body text-sm text-text-secondary">{disabledReason}</p>}
        </div>
        {error && (
          <div role="alert" className="rounded-card border border-destructive bg-card p-3">
            <span className="body text-destructive">Couldn't run the simulation: {error}</span>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {isRunning
            ? 'Running simulation.'
            : summary &&
              `Simulation finished. ${kind === 'boss' ? 'Win' : 'Survival'} chance ${pct(summary.successRate)}.`}
        </p>
        {summary && (
          <>
            <hr className="border-border" />
            {isStale && (
              <p className="body rounded-md border border-notice-border bg-notice-bg px-3 py-2 text-sm text-notice-text">
                Setup changed since this run. Start the simulation again to update the results.
              </p>
            )}
            <div className={cn(isStale && 'opacity-50')}>
              <Results summary={summary} kind={kind} names={names} hidden={hidden} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
