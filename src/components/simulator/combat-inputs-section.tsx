import { ChevronDown, Info } from 'lucide-react';
import type { PlayerState } from '@/lib/save-source/types';
import { humanize } from '@/lib/utils/humanize';
import { FOOD_EAT_CAP, playerAttackRoll, type CombatStyle, type EngineInputs } from '@/lib/simulator/combat-engine';
import { KNOWN_ARROWS } from '@/lib/simulator/combat-tables';
import { ARMOR_SLOTS } from '@/lib/simulator/loadout';
import { foodHealValues, type ResolvedCombat, type Selections, type SimData } from '@/lib/simulator/resolve-inputs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { CombatStyleTabs } from './combat-style-tabs';
import { QtyInput } from '@/components/qty-input';
import { StatRows } from './stat-rows';

const EAT_THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

const EAT_ORDERS = [
  { key: 'descending', label: 'Highest heal first' },
  { key: 'ascending', label: 'Lowest heal first' },
  { key: 'least_quantity', label: 'Smallest stack first' },
];

function finalStats(p: EngineInputs) {
  const str =
    p.style === 'ranged'
      ? p.ranged + p.rangedStrengthBonus
      : p.style === 'magic'
        ? p.spellMaxHit
        : p.strength + p.strengthBonus;
  return [
    { label: 'ATK', value: playerAttackRoll(p) },
    { label: 'STR', value: str },
    { label: 'DEF', value: p.defence },
  ];
}

/** [htmlFor] is the id of the select or input the label names. [info] adds an info icon with a popover. */
function Field({
  label,
  htmlFor,
  info,
  children,
}: {
  label: string;
  htmlFor?: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {info && (
          <Popover>
            <PopoverTrigger className="inline-flex cursor-pointer text-text-secondary" aria-label={`About ${label}`}>
              <Info className="size-4" />
            </PopoverTrigger>
            <PopoverContent>{info}</PopoverContent>
          </Popover>
        )}
      </span>
      {children}
    </div>
  );
}

export function CombatInputsSection({
  playerState,
  data,
  sel,
  onChange,
  resolved,
  combatStyleInfo,
}: {
  playerState: PlayerState;
  data: SimData;
  sel: Selections;
  onChange: (sel: Selections) => void;
  resolved: ResolvedCombat;
  /** Shown in an info popover beside the Combat style label. */
  combatStyleInfo?: string;
}) {
  const set = <K extends keyof Selections>(key: K, value: Selections[K]) => onChange({ ...sel, [key]: value });
  const inv = (key: string) => playerState.raw.inventory[key] ?? 0;

  const potionOptions = Object.entries(data.herblore)
    .filter(([, r]) => r.effects && Object.keys(r.effects).length > 0)
    .flatMap(([key, r]) => [
      { key, name: r.display_name },
      { key: `enhanced_${key}`, name: `Enhanced ${r.display_name}` },
    ]);
  const foods = foodHealValues(data.cooking).sort((a, b) => b.heal - a.heal);
  const selectedFood = Object.keys(sel.food)[0] ?? null;
  const spells = Object.entries(data.spells).sort(([, a], [, b]) => a.magic_level_required - b.magic_level_required);

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
        <span className="h3">Setup</span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-5">
        <Field label="Combat style" info={combatStyleInfo}>
          <CombatStyleTabs style={sel.weaponSlot} onChange={(s: CombatStyle) => set('weaponSlot', s)} />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          {finalStats(resolved.inputs).map((st) => (
            <div key={st.label} className="flex flex-col items-center gap-0.5 rounded-md border border-border py-2.5">
              <span className="label text-text-secondary">{st.label}</span>
              <span className="data text-lg">{st.value}</span>
            </div>
          ))}
        </div>

        <Collapsible defaultOpen={false} className="flex flex-col gap-1.5">
          <CollapsibleTrigger className="group/gear flex items-center justify-between gap-2 text-left">
            <span className="label text-text-secondary">Gear</span>
            <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/gear:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <StatRows
              plain
              rows={[
                { label: 'Weapon', value: resolved.weapon?.item.display_name ?? 'None' },
                ...ARMOR_SLOTS.map((slot) => {
                  const g = resolved.armour.find((p) => p.slot === slot);
                  return { label: humanize(slot), value: g ? (g.item.display_name ?? humanize(g.id)) : 'None' };
                }),
              ]}
            />
          </CollapsibleContent>
        </Collapsible>

        {resolved.warnings.map((w) => (
          <p key={w} className="body rounded-md border border-border bg-primary/10 px-3 py-2 text-sm">
            {w}
          </p>
        ))}

        <Field label="Potion" htmlFor="sim-potion">
          <div>
            <NativeSelect
              id="sim-potion"
              className="w-full min-w-0"
              value={sel.potionKey ?? ''}
              onChange={(e) => {
                const key = e.target.value || null;
                onChange({ ...sel, potionKey: key });
              }}
            >
              <NativeSelectOption value="">None</NativeSelectOption>
              {potionOptions.map((p) => (
                <NativeSelectOption key={p.key} value={p.key}>
                  {p.name} ({inv(p.key)} owned)
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Eat below HP %" htmlFor="sim-eat-threshold">
            <NativeSelect
              id="sim-eat-threshold"
              className="w-full"
              value={sel.eatThresholdPct}
              onChange={(e) => set('eatThresholdPct', Number(e.target.value))}
            >
              {EAT_THRESHOLDS.map((t) => (
                <NativeSelectOption key={t} value={t}>
                  {t}%
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Eat order" htmlFor="sim-eat-order">
            <NativeSelect
              id="sim-eat-order"
              className="w-full"
              value={sel.eatOrder}
              onChange={(e) => set('eatOrder', e.target.value)}
            >
              {EAT_ORDERS.map((o) => (
                <NativeSelectOption key={o.key} value={o.key}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        {resolved.style === 'ranged' && (
          <Field label="Arrows" htmlFor="sim-arrows">
            <div className="flex gap-2">
              <NativeSelect
                id="sim-arrows"
                className="w-full min-w-0"
                value={sel.arrowKey ?? ''}
                onChange={(e) => {
                  const key = e.target.value || null;
                  onChange({ ...sel, arrowKey: key, arrowQty: String(key ? inv(key) : 0) });
                }}
              >
                <NativeSelectOption value="">None</NativeSelectOption>
                {[...KNOWN_ARROWS].reverse().map((a) => (
                  <NativeSelectOption key={a.key} value={a.key}>
                    {a.displayName} (+{a.strengthBonus}, {inv(a.key)} owned)
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {sel.arrowKey && (
                <QtyInput value={sel.arrowQty} onChange={(v) => set('arrowQty', v)} aria-label="Arrows to bring" />
              )}
            </div>
            <p className="body text-sm text-text-secondary">
              When these run out, your other arrows are used, weakest first, as in the game.
            </p>
          </Field>
        )}

        {resolved.style === 'magic' && (
          <Field label="Spell" htmlFor="sim-spell">
            <div className="flex gap-2">
              <NativeSelect
                id="sim-spell"
                className="w-full min-w-0"
                value={sel.spellKey ?? ''}
                onChange={(e) => {
                  const key = e.target.value || null;
                  onChange({ ...sel, spellKey: key });
                }}
              >
                <NativeSelectOption value="">None</NativeSelectOption>
                {spells.map(([key, s]) => (
                  <NativeSelectOption key={key} value={key}>
                    {s.display_name} (Magic {s.magic_level_required}, max hit {s.max_hit})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {resolved.spell && (
              <p className="body text-sm text-text-secondary">
                {resolved.runeKey
                  ? `Uses ${resolved.spell.rune_cost} ${humanize(resolved.runeKey)} per cast. Runes are assumed to always be enough.`
                  : 'Your staff gives you these runes for free.'}
              </p>
            )}
          </Field>
        )}

        <Field label="Food" htmlFor="sim-food">
          <NativeSelect
            id="sim-food"
            className="w-full min-w-0"
            value={selectedFood ?? ''}
            onChange={(e) => {
              const key = e.target.value;
              // A food you don't own is tested as if you had a full run's worth.
              set('food', key ? { [key]: inv(key) > 0 ? inv(key) : FOOD_EAT_CAP } : {});
            }}
          >
            <NativeSelectOption value="">None</NativeSelectOption>
            {foods.map((f) => (
              <NativeSelectOption key={f.key} value={f.key}>
                {f.name.replace(/^Cooked /, '')} (heals {resolved.foodHeal[f.key]})
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {selectedFood ? (
            <p className="body text-sm text-text-secondary">
              You can only eat a maximum of {FOOD_EAT_CAP} in a run.
              {inv(selectedFood) === 0 ? ` You own none, so ${FOOD_EAT_CAP} are assumed.` : ''}
            </p>
          ) : (
            <p className="body rounded-md border border-border bg-primary/10 px-3 py-2 text-sm">
              No food selected. You won't heal during the run.
            </p>
          )}
        </Field>
      </CollapsibleContent>
    </Collapsible>
  );
}
