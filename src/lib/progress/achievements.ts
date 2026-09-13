import type { PlayerState } from '@/lib/save-source';
import { SKILL_IDS } from '@/lib/game/skills';
import type { ProgressCategory } from './types';

export function computeAchievements(
  playerState: PlayerState,
  totalQuests: number,
  totalPets: number,
): ProgressCategory {
  const { raw, totalLevel, combatLevel, questsCompleted } = playerState;
  const levels = raw.skillLevels;
  const prestige = (raw.flags.skill_prestige ?? {}) as Record<string, number>;
  const petsOwned = raw.pets.length;
  const townTiers = (raw.flags.town_building_tiers ?? {}) as Record<string, number>;
  const towerBestFloor = Number(raw.flags.tower_best_floor ?? 0);
  const towerMilestones = (raw.flags.tower_milestones as unknown[] | undefined) ?? [];
  const prestigeNodes = (raw.flags.prestige_nodes ?? {}) as Record<string, string[]>;
  const anyNodeOwned = Object.values(prestigeNodes).some((v) => v.length > 0);
  const townKeys = [
    'inn',
    'guild_hall',
    'church',
    'fairgrounds',
    'garden',
    'queue_master',
    'cape_rack',
    'artisans_workshop',
    'chronos_spire',
  ];

  const bestSkillLevel = Math.max(0, ...SKILL_IDS.map((s) => levels[s] ?? 1));
  const skillsAt99 = SKILL_IDS.filter((s) => (levels[s] ?? 1) >= 99).length;
  const skillsPrestigedOnce = SKILL_IDS.filter((s) => (prestige[s] ?? 0) >= 1).length;
  const skillsPrestiged3x = SKILL_IDS.filter((s) => (prestige[s] ?? 0) >= 3).length;
  const nodesOwned = Object.values(prestigeNodes).reduce((sum, v) => sum + v.length, 0);
  const townsUpgraded = townKeys.filter((k) => (townTiers[k] ?? 0) >= 1).length;
  const townsMaxed = townKeys.filter((k) => (townTiers[k] ?? 0) >= 3).length;

  const achievements: { id: string; label: string; done: boolean; detail?: string }[] = [
    { id: 'total_50', label: 'Reach total level 50', done: (totalLevel ?? 0) >= 50, detail: `${totalLevel ?? 0} / 50` },
    {
      id: 'total_100',
      label: 'Reach total level 100',
      done: (totalLevel ?? 0) >= 100,
      detail: `${totalLevel ?? 0} / 100`,
    },
    {
      id: 'total_250',
      label: 'Reach total level 250',
      done: (totalLevel ?? 0) >= 250,
      detail: `${totalLevel ?? 0} / 250`,
    },
    {
      id: 'total_500',
      label: 'Reach total level 500',
      done: (totalLevel ?? 0) >= 500,
      detail: `${totalLevel ?? 0} / 500`,
    },
    {
      id: 'total_750',
      label: 'Reach total level 750',
      done: (totalLevel ?? 0) >= 750,
      detail: `${totalLevel ?? 0} / 750`,
    },
    {
      id: 'total_1000',
      label: 'Reach total level 1000',
      done: (totalLevel ?? 0) >= 1000,
      detail: `${totalLevel ?? 0} / 1000`,
    },
    {
      id: 'total_1500',
      label: 'Reach total level 1500',
      done: (totalLevel ?? 0) >= 1500,
      detail: `${totalLevel ?? 0} / 1500`,
    },
    {
      id: 'skill_99',
      label: 'Reach level 99 in a skill',
      done: bestSkillLevel >= 99 || Object.values(prestige).some((p) => p >= 1),
      detail: `${bestSkillLevel} / 99`,
    },
    {
      id: 'all_99',
      label: 'Reach level 99 in every skill',
      done: skillsAt99 >= SKILL_IDS.length,
      detail: `${skillsAt99} / ${SKILL_IDS.length}`,
    },
    {
      id: 'combat_10',
      label: 'Reach combat level 10',
      done: (combatLevel ?? 0) >= 10,
      detail: `${combatLevel ?? 0} / 10`,
    },
    {
      id: 'combat_30',
      label: 'Reach combat level 30',
      done: (combatLevel ?? 0) >= 30,
      detail: `${combatLevel ?? 0} / 30`,
    },
    {
      id: 'combat_50',
      label: 'Reach combat level 50',
      done: (combatLevel ?? 0) >= 50,
      detail: `${combatLevel ?? 0} / 50`,
    },
    {
      id: 'combat_75',
      label: 'Reach combat level 75',
      done: (combatLevel ?? 0) >= 75,
      detail: `${combatLevel ?? 0} / 75`,
    },
    {
      id: 'combat_99',
      label: 'Reach combat level 99',
      done: (combatLevel ?? 0) >= 99,
      detail: `${combatLevel ?? 0} / 99`,
    },
    {
      id: 'combat_113',
      label: 'Reach combat level 113',
      done: (combatLevel ?? 0) >= 113,
      detail: `${combatLevel ?? 0} / 113`,
    },
    { id: 'quest_1', label: 'Complete 1 quest', done: questsCompleted >= 1, detail: `${questsCompleted} / 1` },
    { id: 'quest_5', label: 'Complete 5 quests', done: questsCompleted >= 5, detail: `${questsCompleted} / 5` },
    { id: 'quest_25', label: 'Complete 25 quests', done: questsCompleted >= 25, detail: `${questsCompleted} / 25` },
    { id: 'quest_50', label: 'Complete 50 quests', done: questsCompleted >= 50, detail: `${questsCompleted} / 50` },
    {
      id: 'quest_all',
      label: 'Complete every quest',
      done: questsCompleted >= totalQuests,
      detail: `${questsCompleted} / ${totalQuests}`,
    },
    { id: 'pet_first', label: 'Obtain your first pet', done: petsOwned > 0, detail: `${petsOwned} / 1` },
    {
      id: 'pet_all',
      label: 'Obtain every pet',
      done: petsOwned >= totalPets,
      detail: `${petsOwned} / ${totalPets}`,
    },
    {
      id: 'prestige_first',
      label: 'Prestige a skill for the first time',
      done: skillsPrestigedOnce >= 1,
      detail: `${skillsPrestigedOnce} skill(s) prestiged`,
    },
    {
      id: 'prestige_node_first',
      label: 'Purchase your first prestige node',
      done: anyNodeOwned,
      detail: `${nodesOwned} node(s) purchased`,
    },
    {
      id: 'prestige_path_complete',
      label: 'Complete a prestige path',
      done: false,
      detail: 'Not yet tracked',
    },
    {
      id: 'prestige_all_1',
      label: 'Prestige every skill at least once',
      done: skillsPrestigedOnce >= SKILL_IDS.length,
      detail: `${skillsPrestigedOnce} / ${SKILL_IDS.length}`,
    },
    { id: 'prestige_tree_one', label: 'Max a skill’s prestige tree', done: false, detail: 'Not yet tracked' },
    {
      id: 'prestige_all_3',
      label: 'Prestige every skill 3 times',
      done: skillsPrestiged3x >= SKILL_IDS.length,
      detail: `${skillsPrestiged3x} / ${SKILL_IDS.length}`,
    },
    {
      id: 'town_first_upgrade',
      label: 'Upgrade a town building',
      done: townsUpgraded >= 1,
      detail: `${townsUpgraded} building(s) upgraded`,
    },
    {
      id: 'town_all_tier1',
      label: 'Upgrade every town building at least once',
      done: townsUpgraded >= townKeys.length,
      detail: `${townsUpgraded} / ${townKeys.length}`,
    },
    {
      id: 'town_one_maxed',
      label: 'Max a town building',
      done: townsMaxed >= 1,
      detail: `${townsMaxed} building(s) maxed`,
    },
    {
      id: 'town_all_maxed',
      label: 'Max every town building',
      done: townsMaxed >= townKeys.length,
      detail: `${townsMaxed} / ${townKeys.length}`,
    },
    {
      id: 'tower_first_floor',
      label: 'Reach Infinity Tower floor 1',
      done: towerBestFloor >= 1,
      detail: `${towerBestFloor} / 1`,
    },
    {
      id: 'tower_floor_10',
      label: 'Reach Infinity Tower floor 10',
      done: towerBestFloor >= 10,
      detail: `${towerBestFloor} / 10`,
    },
    {
      id: 'tower_floor_50',
      label: 'Reach Infinity Tower floor 50',
      done: towerBestFloor >= 50,
      detail: `${towerBestFloor} / 50`,
    },
    {
      id: 'tower_floor_100',
      label: 'Reach Infinity Tower floor 100',
      done: towerBestFloor >= 100,
      detail: `${towerBestFloor} / 100`,
    },
    {
      id: 'tower_floor_250',
      label: 'Reach Infinity Tower floor 250',
      done: towerBestFloor >= 250,
      detail: `${towerBestFloor} / 250`,
    },
    {
      id: 'tower_all_milestones',
      label: 'Claim every Infinity Tower milestone',
      done: towerMilestones.length >= 25,
      detail: `${towerMilestones.length} / 25`,
    },
  ];

  return {
    id: 'achievements',
    label: 'Achievements',
    points: achievements.filter((i) => i.done).length,
    max: achievements.length,
    hasDrilldown: true,
    items: achievements,
  };
}
