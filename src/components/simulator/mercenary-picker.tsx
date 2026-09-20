import { cn } from 'cn';
import type { MercenaryEntry } from '@/lib/progress/game-data';
import { humanize } from '@/lib/utils/humanize';
import { Label } from '@/components/ui/label';

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
    <div className="flex flex-col gap-1.5">
      <Label>
        Mercenaries ({selectedIds.length} / {MAX_MERCENARIES})
      </Label>
      <div className="flex flex-col gap-1">
        {mercenaries.map((m) => {
          const selected = selectedIds.includes(m.id);
          const tierFull = !selected && (selectedTierCounts[m.tier] ?? 0) >= MAX_PER_TIER;
          const disabled = !selected && (selectedIds.length >= MAX_MERCENARIES || tierFull);
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(m.id)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left',
                selected ? 'border-primary bg-primary/10' : 'border-border',
                disabled && 'opacity-50',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span>{m.emoji}</span>
                <span className="body min-w-0 truncate">{m.display_name}</span>
              </span>
              <span className="label flex shrink-0 items-center gap-2 text-text-secondary">
                {TIER_LABELS[m.tier]}
                <span>{humanize(m.combat_style)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
