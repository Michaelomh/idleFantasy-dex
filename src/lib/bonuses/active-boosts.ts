import type { PlayerState } from '@/lib/save-source/types';
import { SKILL_IDS, SKILLS } from '@/lib/game/skills';
import { formatDurationMs } from '@/lib/utils/duration';
import { getBlessings } from '@/lib/progress/game-data';
import { resolveActiveBlessing } from './blessings';

export type ActiveBoostRow = { id: string; name: string; pct: string; scope: string; detail: string };

const skillLabel = (id: string) => SKILLS.find((s) => s.id === id)?.label ?? id;

export async function computeActiveBoosts(playerState: PlayerState, now = Date.now()): Promise<ActiveBoostRow[]> {
  const rows: ActiveBoostRow[] = [];
  const flags = playerState.raw.flags;

  const globalExpiresAt = Number(flags.xp_boost_expires_at ?? 0);
  if (globalExpiresAt > now) {
    rows.push({
      id: 'xp_boost',
      name: 'XP Boost',
      pct: '+100%',
      scope: 'All skills',
      detail: `Expires in ${formatDurationMs(globalExpiresAt - now)}`,
    });
  }

  const blessings = await getBlessings();
  const blessing = resolveActiveBlessing(
    'XP',
    (flags.active_blessing_key as string | undefined) ?? '',
    Number(flags.active_blessing_expires_at ?? 0),
    blessings,
    now,
  );
  if (blessing) {
    const xpPct = Math.round((blessing.magnitude - 1) * 1000) / 10;
    rows.push({
      id: `blessing_${blessing.key}`,
      name: blessing.label,
      pct: `+${xpPct}%`,
      scope: 'All skills',
      detail: `Expires in ${formatDurationMs(Number(flags.active_blessing_expires_at) - now)}`,
    });
  }

  const prestigeBoosts = (flags.prestige_xp_boosts as Record<string, number> | undefined) ?? {};
  for (const skillId of SKILL_IDS) {
    const expiresAt = prestigeBoosts[skillId];
    if (!expiresAt || expiresAt <= now) continue;
    rows.push({
      id: `prestige_xp_boost_${skillId}`,
      name: 'Prestige XP Boost',
      pct: '+100%',
      scope: skillLabel(skillId),
      detail: `Expires in ${formatDurationMs(expiresAt - now)}`,
    });
  }

  return rows;
}
