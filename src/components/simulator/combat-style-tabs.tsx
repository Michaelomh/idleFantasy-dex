import { cn } from 'cn';
import type { CombatStyle } from '@/lib/simulator/combat-engine';

const STYLE_LABELS: Record<CombatStyle, string> = {
  attack: 'Attack',
  strength: 'Strength',
  ranged: 'Ranged',
  magic: 'Magic',
};

export function CombatStyleTabs({ style, onChange }: { style: CombatStyle; onChange: (style: CombatStyle) => void }) {
  return (
    <div className="flex gap-1 rounded-md border border-border p-1">
      {(Object.keys(STYLE_LABELS) as CombatStyle[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            'label flex-1 rounded-sm px-2 py-1.5 text-center transition-colors',
            s === style ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-card',
          )}
        >
          {STYLE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
