import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, OctagonX } from 'lucide-react';
import { SKILLS, CATEGORY_ORDER } from '@/lib/game/skills';
import { skillIcon } from '@/lib/game/skill-icons';
import { usePlayerState } from '@/lib/player/use-player-state';
import { getPrestigePaths, type PrestigeSkillPaths } from '@/lib/progress/game-data';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';
import { SkillStatRow } from '@/components/skill-stat-row';
import { WIP_MESSAGE } from '@/components/status-notice';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CALCULATOR_SKILL_IDS = new Set(
  SKILLS.filter((s) => s.category === 'Gathering' || s.category === 'Crafting').map((s) => s.id),
).add('agility');

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

  useEffect(() => {
    void getPrestigePaths().then((trees) => setPrestigeTrees(new Map(trees.map((t) => [t.skill, t]))));
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="h1">Calculator</h1>

      {includeElderIsle && (
        <Tabs value="mainland">
          <TabsList className="h-10 w-full">
            <TabsTrigger value="mainland" className="capitalize">
              Mainland
            </TabsTrigger>
            {/* Not selectable yet - the fixed Tabs value keeps it inactive; tapping explains why. */}
            <Popover>
              <PopoverTrigger render={<TabsTrigger value="elder" className="capitalize opacity-50" />}>
                Elder Isle
                <OctagonX className="text-destructive" />
              </PopoverTrigger>
              <PopoverContent>{WIP_MESSAGE}</PopoverContent>
            </Popover>
          </TabsList>
        </Tabs>
      )}

      {CATEGORY_ORDER.filter((category) => category !== 'Combat').map((category) => {
        const skills = SKILLS.filter((s) => s.category === category && CALCULATOR_SKILL_IDS.has(s.id));
        if (skills.length === 0) return null;

        return (
          <div key={category} className="flex flex-col gap-2">
            <span className="h3">{category}</span>
            <div className="flex flex-col gap-2">
              {skills.map((skill) => {
                const description = skillDescription(playerState, prestigeTrees, skill.id);
                return (
                  <SkillStatRow
                    key={skill.id}
                    icon={skillIcon(skill.id)}
                    iconClassName="size-8"
                    label={skill.label}
                    description={description}
                    onClick={() => navigate(`/calculator/${skill.id}`)}
                    right={<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
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
