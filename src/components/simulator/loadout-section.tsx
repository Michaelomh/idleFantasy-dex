import { ChevronDown } from 'lucide-react';
import type { PlayerState } from '@/lib/save-source/types';
import type { EquipmentEntry, PrestigeSkillPaths } from '@/lib/progress/game-data';
import { activeNodesForSkill, allEffectTotals, effectTotal } from '@/lib/bonuses/prestige';
import { describeEffect } from '@/lib/bonuses/effect-copy';
import { humanize } from '@/lib/utils/humanize';
import type { CombatStyle } from '@/lib/simulator/combat-engine';
import { ARMOR_SLOTS, armorLoadoutForStyle, weaponSlotForStyle } from '@/lib/simulator/loadout';
import { KNOWN_ARROWS, KNOWN_SPELLS } from '@/lib/simulator/combat-tables';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { CombatStyleTabs } from './combat-style-tabs';

const RELEVANT_SKILLS_BY_STYLE: Record<CombatStyle, string[]> = {
  attack: ['attack', 'strength', 'defense', 'hitpoints'],
  strength: ['attack', 'strength', 'defense', 'hitpoints'],
  ranged: ['ranged', 'defense', 'hitpoints'],
  magic: ['magic', 'defense', 'hitpoints'],
};

export function LoadoutSection({
  playerState,
  equipment,
  prestigeTrees,
  style,
  onStyleChange,
  arrowKey,
  onArrowKeyChange,
  spellKey,
  onSpellKeyChange,
}: {
  playerState: PlayerState;
  equipment: Record<string, EquipmentEntry>;
  prestigeTrees: Map<string, PrestigeSkillPaths>;
  style: CombatStyle;
  onStyleChange: (style: CombatStyle) => void;
  arrowKey: string | null;
  onArrowKeyChange: (key: string | null) => void;
  spellKey: string | null;
  onSpellKeyChange: (key: string | null) => void;
}) {
  const weaponId = playerState.raw.equipped[weaponSlotForStyle(style)];
  const weapon = weaponId ? equipment[weaponId] : undefined;
  const armorLoadout = armorLoadoutForStyle(playerState, style);

  const prestigeRows = RELEVANT_SKILLS_BY_STYLE[style].flatMap((skillId) => {
    const activeNodes = activeNodesForSkill(playerState, prestigeTrees.get(skillId));
    const combatStatFlat = effectTotal(activeNodes, 'combat_stat_flat');
    const rows: string[] = [];
    if (combatStatFlat > 0) rows.push(`${humanize(skillId)}: +${combatStatFlat} effective level`);
    for (const { effect, value } of allEffectTotals(activeNodes)) {
      if (['xp_pct', 'yield_pct', 'combat_stat_flat', 'cape_scaling'].includes(effect)) continue;
      rows.push(describeEffect(effect, value));
    }
    return rows;
  });

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span className="h3">Loadout</span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">
        <CombatStyleTabs style={style} onChange={onStyleChange} />

        <div className="flex flex-col rounded-md border border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="label text-text-secondary">Weapon</span>
            <span className="data">{weapon?.display_name ?? (weaponId ? humanize(weaponId) : 'None')}</span>
          </div>
          {ARMOR_SLOTS.filter((slot) => armorLoadout[slot]).map((slot) => {
            const itemId = armorLoadout[slot];
            const item = itemId ? equipment[itemId] : undefined;
            return (
              <div key={slot} className="flex items-center justify-between border-t border-border px-3 py-2">
                <span className="label text-text-secondary">{humanize(slot)}</span>
                <span className="data">{item?.display_name ?? humanize(itemId ?? undefined)}</span>
              </div>
            );
          })}
        </div>

        {style === 'ranged' && (
          <div className="flex flex-col gap-1.5">
            <Label>Arrow</Label>
            <NativeSelect value={arrowKey ?? ''} onChange={(e) => onArrowKeyChange(e.target.value || null)}>
              <NativeSelectOption value="">None</NativeSelectOption>
              {KNOWN_ARROWS.map((a) => (
                <NativeSelectOption key={a.key} value={a.key}>
                  {a.displayName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}

        {style === 'magic' && (
          <div className="flex flex-col gap-1.5">
            <Label>Spell</Label>
            <NativeSelect value={spellKey ?? ''} onChange={(e) => onSpellKeyChange(e.target.value || null)}>
              <NativeSelectOption value="">None</NativeSelectOption>
              {KNOWN_SPELLS.map((s) => (
                <NativeSelectOption key={s.key} value={s.key}>
                  {s.displayName} (max hit {s.maxHit})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}

        {prestigeRows.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label text-text-secondary">Combat prestige bonuses</span>
            {prestigeRows.map((row) => (
              <p key={row} className="body text-sm">
                {row}
              </p>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
