import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from 'cn';
import type { PlayerState } from '@/lib/save-source';
import type { BossEntry, SeasonalEventEntry } from '@/lib/progress';
import { humanize } from '@/lib/utils/humanize';
import { pct } from '@/lib/utils/format-number';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatRows } from './stat-rows';

type Requirement = { label: string; met: boolean };

function requirements(boss: BossEntry, ps: PlayerState, events: Record<string, SeasonalEventEntry>): Requirement[] {
  const flags = ps.raw.flags;
  const tiers = (flags.town_building_tiers ?? {}) as Record<string, number>;
  const out: Requirement[] = [];
  if (boss.total_level_required) {
    out.push({
      label: `Total level ${boss.total_level_required} (you: ${ps.totalLevel ?? 0})`,
      met: (ps.totalLevel ?? 0) >= boss.total_level_required,
    });
  }
  if (boss.requires_dock) out.push({ label: 'Dock built', met: (tiers.dock ?? 0) >= 1 });
  if (boss.requires_monument) {
    out.push({ label: 'Grand Monument complete', met: Number(flags.monument_tier ?? 0) >= 5 });
  }
  const eventKey = boss.event_key;
  if (eventKey) {
    out.push({
      label: `Seasonal - ${events[eventKey]?.display_name ?? humanize(eventKey)}. Only during the event`,
      met: true,
    });
  }
  return out;
}

export function BossInfoSection({
  boss,
  playerState,
  events,
  partyScale,
  mercCount,
  names,
}: {
  boss: BossEntry;
  playerState: PlayerState;
  events: Record<string, SeasonalEventEntry>;
  partyScale: number;
  mercCount: number;
  names: Record<string, string>;
}) {
  const seen = new Set((playerState.raw.flags.seen_item_keys as string[] | undefined) ?? []);
  const duration = boss.duration_minutes ?? 0;
  const drops = [
    ...(boss.rare_drops ?? []).map((d) => ({
      item: d.item,
      name: names[d.item] ?? humanize(d.item),
      chance: d.chance ?? 0,
    })),
    ...(boss.pet ? [{ item: boss.pet.id, name: `${boss.pet.display_name} (pet)`, chance: boss.pet.chance ?? 0 }] : []),
  ];
  const reqs = requirements(boss, playerState, events);
  const owned = (item: string) => seen.has(item) || playerState.raw.pets.some((p) => p.id === item);

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span className="h3">Boss</span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4">
        {reqs.length > 0 && (
          <div className="flex flex-col gap-1">
            {reqs.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                {r.met ? <Check className="size-4 text-fresh" /> : <X className="size-4 text-text-secondary" />}
                <span className={cn('body text-sm', !r.met && 'text-text-secondary')}>
                  <span className="sr-only">{r.met ? 'Met: ' : 'Not met: '}</span>
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <StatRows
          rows={[
            { label: 'HP', value: (boss.hp ?? 0).toLocaleString() },
            {
              label: 'Time limit',
              value: `${duration} min`,
            },
            ...(boss.raid
              ? [
                  {
                    label: 'Party scaling',
                    value: partyScale === 1 ? 'None' : `×${partyScale.toFixed(2)}`,
                    hint:
                      partyScale === 1
                        ? 'Full party of 3 mercenaries.'
                        : `With ${mercCount} of 3 mercenaries, the boss hits ×${partyScale.toFixed(2)} harder and more often.`,
                  },
                ]
              : []),
          ]}
        />

        {drops.length > 0 && (
          <StatRows
            title={`Rare drops (${drops.filter((d) => owned(d.item)).length} / ${drops.length} obtained)`}
            rows={drops.map((d) => ({
              label: d.name,
              value: (
                <span className="inline-flex items-center gap-1.5">
                  {owned(d.item) && <Check className="size-4 text-fresh" />}
                  {pct(d.chance, d.chance < 0.01 ? 2 : 1)}
                </span>
              ),
            }))}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
