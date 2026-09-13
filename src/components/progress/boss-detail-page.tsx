import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Check } from 'lucide-react';
import { cn } from 'cn';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getBosses, type BossEntry } from '@/lib/progress/game-data';
import { humanize } from '@/lib/humanize';

export function BossDetailPage() {
  const { bossId } = useParams<{ bossId: string }>();
  const playerState = usePlayerState();
  const [boss, setBoss] = useState<BossEntry | null>(null);

  useEffect(() => {
    void getBosses().then((all) => setBoss((bossId && all[bossId]) || null));
  }, [bossId]);

  if (!playerState || !boss || !bossId) {
    return <div className="body p-4 text-text-secondary">Loading…</div>;
  }

  const enemyKills = (playerState.raw.flags.enemy_kills ?? {}) as Record<string, number>;
  const seenItems = new Set((playerState.raw.flags.seen_item_keys as string[] | undefined) ?? []);
  const kills = enemyKills[bossId] ?? 0;
  const drops = boss.rare_drops ?? [];

  const statRows: { label: string; value: string | number }[] = [
    { label: 'HP', value: boss.hp ?? '—' },
    ...Object.entries(boss.combat_stats ?? {})
      .filter(([k]) => k !== 'defense_level')
      .map(([k, v]) => ({ label: humanize(k), value: v })),
    ...Object.entries(boss.defensive_stats ?? {}).map(([k, v]) => ({ label: humanize(k), value: v })),
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{boss.emoji}</span>
        <span className="h1">{boss.display_name}</span>
        <span className="label rounded-full border border-border px-2 py-0.5 text-text-secondary">
          {boss.raid ? 'Raid' : 'Solo'}
        </span>
      </div>
      <div className="rounded-md border border-border p-3">
        <p className="label text-text-secondary">Kills</p>
        <p className="data text-lg">{kills}</p>
      </div>

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
          const chance = d.comment ?? (d.chance !== undefined ? `${(d.chance * 100).toFixed(2)}%` : '—');
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
