import type { ActiveBoostRow } from '@/lib/bonuses';

export function ActiveBoostsSection({ boosts }: { boosts: ActiveBoostRow[] }) {
  if (boosts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
      <span className="h3">Active Boosts</span>
      <div className="flex flex-col">
        {boosts.map((boost) => (
          <div
            key={boost.id}
            className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="button-label">{boost.name}</span>
              <span className="label text-text-secondary">{boost.detail}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="data text-primary">{boost.pct}</span>
              <span className="label text-text-secondary">{boost.scope}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
