import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { SKILLS, CATEGORY_ORDER } from '@/lib/game/skills';
import { skillIcon } from '@/lib/game/skill-icons';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getPrestigePaths, type PrestigeSkillPaths } from '@/lib/progress';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { useSessionStorage } from '@/lib/hooks/use-session-storage';
import { elderLevel } from '@/lib/calculator';
import { SkillStatRow } from '@/components/skill-stat-row';
import { IconToggleGroup } from '@/components/icon-toggle-group';
import { REGION_OPTIONS } from '@/lib/app/preferences';

const CALCULATOR_SKILL_IDS = new Set(
  SKILLS.filter((s) => s.category === 'Gathering' || s.category === 'Crafting').map((s) => s.id),
).add('agility');

/** Elder Isle's non-combat skills; the combat ones have no calculator yet. */
const ELDER_CALCULATOR_SKILL_IDS = new Set(['mining', 'fishing', 'woodcutting', 'smithing', 'cooking', 'agility']);

function skillDescription(
  playerState: ReturnType<typeof usePlayerState>,
  prestigeTrees: Map<string, PrestigeSkillPaths> | null,
  skillId: string,
): string | null {
  if (!playerState || !prestigeTrees) return null;
  const level = playerState.raw.skillLevels[skillId] ?? 1;
  const tree = prestigeTrees.get(skillId);
  if (!tree) return `Level ${level}`;

  const nonXpCost = tree.paths
    .filter((p) => !p.auto)
    .flatMap((p) => p.nodes)
    .reduce((sum, n) => sum + n.cost, 0);
  const cap = Math.ceil(nonXpCost / 3);
  if (cap <= 0) return `Level ${level}`;

  const prestige = (playerState.raw.flags.skill_prestige as Record<string, number> | undefined) ?? {};
  const owned = Math.min(prestige[skillId] ?? 0, cap);
  return `Level ${level} • ${owned}/${cap} Prestige${owned >= cap ? ' (Max)' : ''}`;
}

export function CalculatorOverviewPage() {
  const navigate = useNavigate();
  const playerState = usePlayerState();
  const [prestigeTrees, setPrestigeTrees] = useState<Map<string, PrestigeSkillPaths> | null>(null);
  const [includeElderIsle] = useIncludeElderIsle();
  const [storedRegion, setRegion] = useSessionStorage<'mainland' | 'elder'>('calculator:region', 'mainland');
  const isElder = includeElderIsle && storedRegion === 'elder';

  useEffect(() => {
    void getPrestigePaths().then((trees) => setPrestigeTrees(new Map(trees.map((t) => [t.skill, t]))));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="h1">Calculator</h1>

      {includeElderIsle && (
        <IconToggleGroup
          value={isElder ? 'elder' : 'mainland'}
          onValueChange={setRegion}
          options={REGION_OPTIONS}
          showLabel="always"
          className="w-full *:flex-1"
        />
      )}

      {CATEGORY_ORDER.filter((category) => category !== 'Combat').map((category) => {
        const skillIds = isElder ? ELDER_CALCULATOR_SKILL_IDS : CALCULATOR_SKILL_IDS;
        const skills = SKILLS.filter((s) => s.category === category && skillIds.has(s.id));
        if (skills.length === 0) return null;

        return (
          <div key={category} className="flex flex-col gap-2">
            <span className="subheading px-1">{category}</span>
            <div className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
              {skills.map((skill) => {
                const description = isElder
                  ? playerState && `Level ${elderLevel(playerState, skill.id)}`
                  : skillDescription(playerState, prestigeTrees, skill.id);
                return (
                  <SkillStatRow
                    key={skill.id}
                    icon={skillIcon(skill.id)}
                    iconClassName="size-7"
                    label={skill.label}
                    description={description}
                    onClick={() => navigate(`/calculator/${isElder ? 'elder-isle/' : ''}${skill.id}`)}
                    right={<ChevronRight className="size-4 text-muted-foreground" />}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
