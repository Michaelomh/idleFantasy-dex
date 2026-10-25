import type { CombatStyle } from '@/lib/simulator/combat-engine';
import { IconToggleGroup } from '@/components/icon-toggle-group';

const STYLE_OPTIONS: { value: CombatStyle; label: string }[] = [
  { value: 'attack', label: 'Attack' },
  { value: 'strength', label: 'Strength' },
  { value: 'ranged', label: 'Ranged' },
  { value: 'magic', label: 'Magic' },
];

export function CombatStyleTabs({ style, onChange }: { style: CombatStyle; onChange: (style: CombatStyle) => void }) {
  return (
    <div role="group" aria-label="Combat style">
      <IconToggleGroup
        value={style}
        onValueChange={onChange}
        options={STYLE_OPTIONS}
        showLabel="always"
        className="w-full *:flex-1"
      />
    </div>
  );
}
