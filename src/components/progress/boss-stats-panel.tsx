import { Check } from 'lucide-react';
import { cn } from 'cn';
import type { PlayerState } from '@/lib/save-source/types';
import type { BossEntry } from '@/lib/progress/game-data';
import { humanize } from '@/lib/utils/humanize';

export function BossStatsPanel({ boss, playerState }: { boss: BossEntry; playerState: PlayerState }) {
  const seenItems = new Set((playerState.raw.flags.seen_item_keys as string[] | undefined) ?? []);
  const drops = boss.rare_drops ?? [];

  const defensiveStats = boss.defensive_stats ?? {};
  const combatStyles: { label: string; defense: number }[] = [
    {
      label: 'Melee',
      defense: Math.min(defensiveStats.attack_defense ?? Infinity, defensiveStats.strength_defense ?? Infinity),
    },
    { label: 'Ranged', defense: defensiveStats.ranged_defense ?? Infinity },
    { label: 'Magic', defense: defensiveStats.magic_defense ?? Infinity },
  ].filter((s) => Number.isFinite(s.defense));
  const bestStyle = combatStyles.reduce<{ label: string; defense: number } | null>(
    (best, s) => (!best || s.defense < best.defense ? s : best),
    null,
  );

  const statRows: { label: string; value: string | number }[] = [
    { label: 'HP', value: boss.hp ?? '-' },
    ...Object.entries(boss.combat_stats ?? {})
      .filter(([k]) => k !== 'defense_level')
      .map(([k, v]) => ({ label: humanize(k), value: v })),
    ...Object.entries(boss.defensive_stats ?? {}).map(([k, v]) => ({ label: humanize(k), value: v })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {bestStyle && (
        <div className="rounded-md border border-fresh/40 bg-fresh/10 p-3">
          <p className="label text-text-secondary">Best combat style</p>
          <p className="data text-lg text-fresh">{bestStyle.label}</p>
        </div>
      )}

      <div className="flex flex-col rounded-md border border-border">
        {statRows.map((s, i) => (
          <div
            key={s.label}
            className={cn('flex items-center justify-between px-3 py-2', i > 0 && 'border-t border-border')}
          >
            <span className="label text-text-secondary">{s.label}</span>
            <span className="data">{s.value}</span>
          </div>
        ))}
      </div>

      <span className="h3">
        Rare drops ({drops.filter((d) => seenItems.has(d.item)).length} / {drops.length})
      </span>
      <div className="flex flex-col gap-1">
        {drops.map((d) => {
          const obtained = seenItems.has(d.item);
          const chance = d.comment ?? (d.chance !== undefined ? `${(d.chance * 100).toFixed(2)}%` : '-');
          return (
            <div
              key={d.item}
              className={cn('flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2')}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="body">{humanize(d.item)}</span>
                <span className="body text-sm text-text-secondary">{chance}</span>
              </div>
              {obtained && <Check className="mt-1 size-4 shrink-0 text-fresh" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
