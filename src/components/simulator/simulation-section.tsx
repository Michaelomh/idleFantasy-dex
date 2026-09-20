import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from 'cn';
import type { BossCombatProfile, MercCombatant, PlayerCombatProfile } from '@/lib/simulator/combat-engine';
import { runSimulation, type SimulationSummary } from '@/lib/simulator/run-simulation';
import { formatMinSec } from '@/lib/utils/duration';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RUN_PRESETS = [50, 100, 200, 500];
const MAX_RUNS = 500;

function formatRange(range: { mean: number; p5: number; p95: number }, format: (v: number) => string): string {
  return `${format(range.mean)} (${format(range.p5)} - ${format(range.p95)})`;
}

export function SimulationSection({
  player,
  boss,
  mercenaries = [],
}: {
  player: PlayerCombatProfile;
  boss: BossCombatProfile;
  mercenaries?: MercCombatant[];
}) {
  const [runs, setRuns] = useState(100);
  const [customRuns, setCustomRuns] = useState('');
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  function handleRunsInput(value: string) {
    setCustomRuns(value);
    const parsed = Math.round(Number(value));
    if (Number.isFinite(parsed) && parsed > 0) {
      setRuns(Math.min(MAX_RUNS, parsed));
    }
  }

  function handleStart() {
    if (isRunning) return;
    setIsRunning(true);
    requestAnimationFrame(() => {
      setSummary(runSimulation(player, boss, runs, mercenaries));
      setIsRunning(false);
    });
  }

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span className="h3">Simulation</span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Number of simulated fights</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {RUN_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setRuns(preset);
                  setCustomRuns('');
                }}
                className={cn(
                  'label rounded-md border border-border px-2.5 py-1.5',
                  runs === preset && !customRuns && 'border-primary bg-primary/10 text-primary',
                )}
              >
                {preset}
              </button>
            ))}
            <Input
              type="number"
              min={1}
              max={MAX_RUNS}
              placeholder="Custom"
              value={customRuns}
              onChange={(e) => handleRunsInput(e.target.value)}
              className="w-24"
            />
          </div>
          <p className="body text-sm text-text-secondary">Capped at {MAX_RUNS} runs.</p>
        </div>

        <Button onClick={handleStart} disabled={isRunning}>
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : 'Start simulation'}
        </Button>

        {summary && (
          <div className="flex flex-col rounded-md border border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="label text-text-secondary">Success rate</span>
              <span className="data">
                {(summary.successRate * 100).toFixed(1)}% ({summary.successCount} / {summary.runs})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="label text-text-secondary">Time to kill</span>
              <span className="data">
                {summary.timeToKillSeconds
                  ? formatRange(summary.timeToKillSeconds, (v) => formatMinSec(v / 60))
                  : 'No wins'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="label text-text-secondary">Food eaten</span>
              <span className="data">{formatRange(summary.foodEaten, (v) => Math.round(v).toLocaleString())}</span>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
