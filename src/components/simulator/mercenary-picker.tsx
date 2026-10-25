import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';
import type { MercenaryEntry } from '@/lib/progress/game-data';
import { humanize } from '@/lib/utils/humanize';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const MAX_MERCENARIES = 3;
const MAX_PER_TIER = 2;

const TIER_LABELS: Record<MercenaryEntry['tier'], string> = {
  cheap: 'Sellsword',
  seasoned: 'Veteran',
  elite: 'Champion',
};

export function MercenaryPicker({
  mercenaries,
  selectedIds,
  onChange,
}: {
  mercenaries: MercenaryEntry[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const byId = new Map(mercenaries.map((m) => [m.id, m]));
  const selectedTierCounts = selectedIds.reduce<Partial<Record<MercenaryEntry['tier'], number>>>((acc, id) => {
    const tier = byId.get(id)?.tier;
    if (tier) acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
      return;
    }
    if (selectedIds.length >= MAX_MERCENARIES) return;
    const tier = byId.get(id)?.tier;
    if (tier && (selectedTierCounts[tier] ?? 0) >= MAX_PER_TIER) return;
    onChange([...selectedIds, id]);
  }

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span id="sim-mercenaries" className="h3">
          Mercenaries ({selectedIds.length}/{MAX_MERCENARIES})
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent role="group" aria-labelledby="sim-mercenaries" className="flex flex-col gap-1">
        {mercenaries.map((m) => {
          const selected = selectedIds.includes(m.id);
          const tierFull = !selected && (selectedTierCounts[m.tier] ?? 0) >= MAX_PER_TIER;
          // Blocked picks stay clickable so the popover can say why.
          const blockedReason = selected
            ? null
            : selectedIds.length >= MAX_MERCENARIES
              ? `Your party is full. Remove a mercenary to add another.`
              : tierFull
                ? `You can only bring ${MAX_PER_TIER} ${TIER_LABELS[m.tier]} mercenaries.`
                : null;
          const className = cn(
            'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left',
            selected ? 'border-primary bg-primary/10' : 'border-border',
            blockedReason && 'opacity-50',
          );
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <span>{m.emoji}</span>
                <span className="body min-w-0 truncate">{m.display_name}</span>
              </span>
              <span className="label flex shrink-0 items-center gap-2 text-text-secondary">
                {TIER_LABELS[m.tier]}
                <span>{humanize(m.combat_style)}</span>
              </span>
            </>
          );
          if (blockedReason) {
            return (
              <Popover key={m.id}>
                <PopoverTrigger aria-disabled aria-pressed={false} className={className}>
                  {content}
                </PopoverTrigger>
                <PopoverContent>{blockedReason}</PopoverContent>
              </Popover>
            );
          }
          return (
            <button key={m.id} type="button" aria-pressed={selected} onClick={() => toggle(m.id)} className={className}>
              {content}
            </button>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
