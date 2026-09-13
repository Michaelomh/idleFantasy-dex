import { useState } from 'react';
import type { SkillBonus } from '@/lib/bonuses';

const OTHER_BONUSES_COLLAPSE_THRESHOLD = 3;

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="data text-primary">{value}</span>
      <span className="label text-text-secondary">{label}</span>
    </div>
  );
}

export function SkillBonusRow({ skill }: { skill: SkillBonus }) {
  const [expanded, setExpanded] = useState(false);
  const hasAnyBonus =
    skill.xpPct > 0 || skill.yieldPct > 0 || skill.combatStatFlat > 0 || skill.otherBonuses.length > 0;
  const visibleOtherBonuses = expanded
    ? skill.otherBonuses
    : skill.otherBonuses.slice(0, OTHER_BONUSES_COLLAPSE_THRESHOLD);
  const hiddenCount = skill.otherBonuses.length - visibleOtherBonuses.length;

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="button-label">{skill.label}</span>
          <span className="label text-text-secondary">Level {skill.level}</span>
        </div>
        {hasAnyBonus && (
          <div className="flex shrink-0 gap-4">
            {skill.xpPct > 0 && <StatColumn label="XP" value={`+${skill.xpPct}%`} />}
            {skill.yieldPct > 0 && <StatColumn label="Yield" value={`+${skill.yieldPct}%`} />}
            {skill.combatStatFlat > 0 && <StatColumn label="Combat" value={`+${skill.combatStatFlat}`} />}
          </div>
        )}
      </div>

      {(skill.xpSources.length > 0 || skill.yieldSources.length > 0) && (
        <p className="body text-sm">
          {[...skill.xpSources, ...skill.yieldSources].map((s) => `${s.label} +${s.pct}%`).join(' · ')}
        </p>
      )}

      {skill.otherBonuses.length > 0 && (
        <div className="flex flex-col gap-1">
          {visibleOtherBonuses.map((bonus) => (
            <div key={bonus.effect} className="flex items-start justify-between gap-2">
              <span className="body min-w-0 flex-1 text-sm">{bonus.label}</span>
              <span className="data shrink-0 text-sm">{bonus.valueLabel}</span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="label w-fit text-primary underline-offset-2 hover:underline"
            >
              Show {hiddenCount} more
            </button>
          )}
          {expanded && skill.otherBonuses.length > OTHER_BONUSES_COLLAPSE_THRESHOLD && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="label w-fit text-text-secondary underline-offset-2 hover:underline"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {!hasAnyBonus && <p className="label text-text-secondary">No active bonuses</p>}
    </div>
  );
}
