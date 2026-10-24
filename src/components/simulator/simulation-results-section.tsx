import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from 'cn';
import { humanize } from '@/lib/utils/humanize';
import { formatMinSec } from '@/lib/utils/duration';
import { useSimulation } from '@/lib/hooks/use-simulation';
import type { SimulationJob, SimulationSummary } from '@/lib/simulator/run-simulation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    ...Object.entries(summary.food).map(([k, v]) => ({ label: name(k), value: fmt(v, 1) })),
    ...Object.entries(summary.arrows).map(([k, v]) => ({
      label: name(k),
      value: fmt(v),
      hint: `You get ${fmt(summary.arrowsReclaimed[k] ?? 0)} back`,
    })),
    ...(summary.runes > 0
      ? [{ label: 'Runes', value: fmt(summary.runes), hint: `You get ${fmt(summary.runesReclaimed)} back` }]
      : []),
    ...(summary.potions > 0 ? [{ label: 'Potion', value: '1' }] : []),
  ];
  const xpBySkill: CompactRow[] = Object.keys(summary.xp)
    .sort((a, b) => SKILL_ORDER.indexOf(a) - SKILL_ORDER.indexOf(b))
    .map((s) => ({ label: skillLabel(s), ...ranged(summary.xp[s], compact) }));
  const outcomes: CompactRow[] = [
    ...(isBoss ? [{ label: 'Death chance', value: pct(summary.deathRate) }] : []),
    ...(isBoss && summary.timeoutRate > 0
      ? [
          {
            label: 'Out of time',
            value: pct(summary.timeoutRate),
            hint: 'The winner is decided by the HP each side has left',
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="body text-sm text-text-secondary">
        Averages over {fmt(summary.samples)} simulated runs. The range in brackets is where 90% of runs land.
      </p>
      <CompactRows title="Loot" rows={loot} />
      {!isBoss && <CompactRows title="Kills" rows={kills} />}
      <CompactRows title="Used" rows={used} />
      <div className="flex flex-col gap-2">
        <HeadlineRow label="XP" {...ranged(summary.xpTotal, compact)} />
        <CompactRows rows={xpBySkill} />
      </div>
      <div className="flex flex-col gap-2">
        <HeadlineRow label={isBoss ? 'Win chance' : 'Survival chance'} value={pct(summary.successRate)} />
        <CompactRows rows={outcomes} />
      </div>
      <HeadlineRow label="Real time" {...ranged(summary.minutes, formatMinSec)} />
    </div>
  );
}

export function SimulationResultsSection({
  buildJob,
  kind,
  names,
  hidden,
  disabledReason,
}: {
  buildJob: (samples: number) => SimulationJob;
  kind: SimulationJob['kind'];
  names: Record<string, string>;
  /** Rare drops and pets, left out of the results. */
  hidden: Set<string>;
  disabledReason?: string;
}) {
  const [samples, setSamples] = useState(2000);
  const { summary, isRunning, run } = useSimulation();

  return (
    <Collapsible defaultOpen className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span className="h3">Simulation</span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Runs to simulate</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSamples(preset)}
                className={cn(
                  'label rounded-md border border-border px-2.5 py-1.5',
                  samples === preset && 'border-primary bg-primary/10 text-primary',
                )}
              >
                {fmt(preset)}
              </button>
            ))}
          </div>
          <p className="body text-sm text-text-secondary">More runs give steadier numbers but take longer.</p>
        </div>
        <Button onClick={() => run(buildJob(samples))} disabled={isRunning || !!disabledReason}>
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : 'Start simulation'}
        </Button>
        {disabledReason && <p className="body text-sm text-text-secondary">{disabledReason}</p>}
        {summary && <Results summary={summary} kind={kind} names={names} hidden={hidden} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
