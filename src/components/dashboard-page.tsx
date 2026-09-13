import { useEffect, useMemo, useState } from 'react';
import { usePlayerState } from '@/lib/player/use-player-state';
import { resolveAllSkillBonuses, computeActiveBoosts, type SkillBonus } from '@/lib/bonuses';
import { CATEGORY_ORDER } from '@/lib/game/skills';
import { SkillBonusRow } from '@/components/skill-bonus-row';
import { ActiveBoostsSection } from '@/components/active-boosts-section';
import { formatNumber } from '@/lib/format-number';
import { LoadingScreen } from '@/components/loading-screen';
import { humanize } from '@/lib/humanize';

export function DashboardPage() {
  const playerState = usePlayerState();
  const [skillBonuses, setSkillBonuses] = useState<SkillBonus[] | null>(null);

  useEffect(() => {
    if (!playerState) return;
    let cancelled = false;
    void resolveAllSkillBonuses(playerState).then((result) => {
      if (!cancelled) setSkillBonuses(result);
    });
    return () => {
      cancelled = true;
    };
  }, [playerState]);

  const activeBoosts = useMemo(() => (playerState ? computeActiveBoosts(playerState) : []), [playerState]);

  if (!playerState) return <LoadingScreen />;

  const stats: { label: string; value: string | number | null }[] = [
    { label: 'Combat level', value: playerState.combatLevel },
    { label: 'Total level', value: playerState.totalLevel },
    { label: 'Coins', value: playerState.coins != null ? formatNumber(playerState.coins) : null },
    {
      label: 'Carnival tickets',
      value: playerState.carnivalTickets != null ? formatNumber(playerState.carnivalTickets) : null,
    },
    { label: 'Slayer points', value: playerState.slayerPoints != null ? formatNumber(playerState.slayerPoints) : null },
  ];

  const identity = [humanize(playerState.title), humanize(playerState.race), playerState.gender]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="h1">{playerState.character ?? 'Adventurer'}</h1>
          {playerState.ironman && (
            <span className="label inline-flex w-fit items-center rounded-md border border-border px-2 py-1 text-text-secondary">
              IRONMAN
            </span>
          )}
        </div>
        <p className="body text-text-secondary">{identity || 'No character details yet'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="label text-text-secondary">{label}</p>
            <p className="data text-lg">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <ActiveBoostsSection boosts={activeBoosts} />

      {!skillBonuses ? (
        <p className="body text-text-secondary">Loading bonuses…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((category) => {
            const skillsInCategory = skillBonuses.filter((s) => s.category === category);
            if (skillsInCategory.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
                <span className="h3">{category}</span>
                <div className="flex flex-col">
                  {skillsInCategory.map((skill) => (
                    <SkillBonusRow key={skill.id} skill={skill} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
