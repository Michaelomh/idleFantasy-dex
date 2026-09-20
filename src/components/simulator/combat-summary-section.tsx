import { ChevronDown } from 'lucide-react';
import type { PlayerState } from '@/lib/save-source/types';
import type { BlessingEntry, EquipmentEntry, MercenaryEntry } from '@/lib/progress/game-data';
import type { RecipeEntry } from '@/lib/calculator/game-data';
import type { CombatStyle } from '@/lib/simulator/combat-engine';
import {
  buildPlayerCombatProfile,
  listFoodOptions,
  listPotionOptions,
  resolveCombatInputs,
  type PrestigeActiveNodesBySkill,
} from '@/lib/simulator/combat-profile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { CombatStyleTabs } from './combat-style-tabs';
import { MercenaryPicker } from './mercenary-picker';

export function CombatSummarySection({
  playerState,
  equipment,
  herblore,
  cooking,
  blessings,
  activeNodesBySkill,
  style,
  onStyleChange,
  arrowKey,
  spellKey,
  potionKey,
  onPotionKeyChange,
  foodKey,
  onFoodKeyChange,
  isRaid,
  mercenaryRoster,
  selectedMercIds,
  onSelectedMercIdsChange,
}: {
  playerState: PlayerState;
  equipment: Record<string, EquipmentEntry>;
  herblore: Record<string, RecipeEntry>;
  cooking: Record<string, RecipeEntry>;
  blessings: BlessingEntry[];
  activeNodesBySkill: PrestigeActiveNodesBySkill;
  style: CombatStyle;
  onStyleChange: (style: CombatStyle) => void;
  arrowKey: string | null;
  spellKey: string | null;
  potionKey: string | null;
  onPotionKeyChange: (key: string | null) => void;
  foodKey: string | null;
  onFoodKeyChange: (key: string | null) => void;
  isRaid: boolean;
  mercenaryRoster: MercenaryEntry[];
  selectedMercIds: string[];
  onSelectedMercIdsChange: (ids: string[]) => void;
}) {
  const resolved = resolveCombatInputs({
    playerState,
    equipment,
    herblore,
    cooking,
    blessings,
    style,
    potionKey,
    foodKey,
  });

  const { effective } = buildPlayerCombatProfile({
    playerState,
    style,
    arrowKey,
    spellKey,
    activeNodesBySkill,
    ...resolved,
  });

  const potionOptions = listPotionOptions(herblore);
  const foodOptions = listFoodOptions(cooking);

  const statRows: { label: string; value: number }[] = [
    { label: 'Attack', value: effective.attack },
    { label: 'Strength', value: effective.strength },
    { label: 'Ranged', value: effective.ranged },
    { label: 'Magic', value: effective.magic },
    { label: 'Defense', value: effective.defense },
  ];

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span className="h3">Combat summary</span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">
        <CombatStyleTabs style={style} onChange={onStyleChange} />

        <div className="flex flex-col gap-1.5">
          <Label>Potion</Label>
          <NativeSelect value={potionKey ?? ''} onChange={(e) => onPotionKeyChange(e.target.value || null)}>
            <NativeSelectOption value="">None</NativeSelectOption>
            {potionOptions.map((p) => (
              <NativeSelectOption key={p.key} value={p.key}>
                {p.displayName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Food</Label>
          <NativeSelect value={foodKey ?? ''} onChange={(e) => onFoodKeyChange(e.target.value || null)}>
            <NativeSelectOption value="">None</NativeSelectOption>
            {foodOptions.map((f) => (
              <NativeSelectOption key={f.key} value={f.key}>
                {f.displayName} (+{f.healingValue} HP)
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <span className="label text-text-secondary">Active blessing</span>
          <span className="data">
            {resolved.defenseBlessingBonus > 0 ? `+${resolved.defenseBlessingBonus} Defense` : 'None'}
          </span>
        </div>

        {isRaid && (
          <MercenaryPicker
            mercenaries={mercenaryRoster}
            selectedIds={selectedMercIds}
            onChange={onSelectedMercIdsChange}
          />
        )}

        <div className="flex flex-col rounded-md border border-border">
          {statRows.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <span className="label text-text-secondary">{s.label}</span>
              <span className="data">{s.value}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
