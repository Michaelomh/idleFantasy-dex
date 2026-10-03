import type { PlayerState } from '@/lib/save-source';
import { SKILL_IDS } from '@/lib/game/skills';
import { activeNodesForSkill } from '@/lib/bonuses/prestige';
import { getPrestigePaths, getBuildings } from './game-data';
import type { ProgressCategory } from './types';

/** Achievement display names, copied from the game's strings.xml (achievement_<id>_name). */
const ACHIEVEMENT_NAMES: Record<string, string> = {
  total_50: 'Adventurer',
  total_100: 'Journeyman',
  total_250: 'Seasoned',
  total_500: 'Veteran',
  total_750: 'Master',
  total_1000: 'Legend',
  total_1500: 'Champion',
  skill_99: 'First Mastery',
  all_99: 'Completionist',
  combat_10: 'Fighter',
  combat_30: 'Warrior',
  combat_50: 'Champion',
  combat_75: 'Elite',
  combat_99: 'Hero',
  combat_113: 'Max Combat',
  quest_1: 'Quester',
  quest_5: 'Dedicated',
  quest_25: 'Quest Hound',
  quest_50: 'Quest Master',
  quest_all: 'Quest Champion',
  pet_first: 'Animal Friend',
  pet_all: 'Menagerie',
  prestige_first: 'First Reset',
  prestige_node_first: 'Branching Out',
  prestige_path_complete: 'End of the Line',
  prestige_tree_one: 'Mastered',
  prestige_all_1: 'Clean Slate',
  prestige_all_3: 'True Prestige',
  town_first_upgrade: 'First Renovation',
  town_all_tier1: 'Town Improver',
  town_one_maxed: 'Master Builder',
  town_all_maxed: 'Town of Legend',
  tower_first_floor: 'First Step',
  tower_floor_10: 'Tower Initiate',
  tower_floor_50: 'Climbing Higher',
  tower_floor_100: 'Century Climber',
  tower_floor_250: 'Void Conqueror',
  tower_all_milestones: 'Tower Legend',
};

export async function computeAchievements(
  playerState: PlayerState,
  questsCompleted: number,
  totalQuests: number,
  totalPets: number,
): Promise<ProgressCategory> {
  const { raw, totalLevel, combatLevel } = playerState;
  const levels = raw.skillLevels;
  const prestige = (raw.flags.skill_prestige ?? {}) as Record<string, number>;
  const petsOwned = raw.pets.length;
  const townTiers = (raw.flags.town_building_tiers ?? {}) as Record<string, number>;
  const towerBestFloor = Number(raw.flags.tower_best_floor ?? 0);
  const towerMilestones = (raw.flags.tower_milestones as unknown[] | undefined) ?? [];
  const prestigeNodes = (raw.flags.prestige_nodes ?? {}) as Record<string, string[]>;
  const anyNodeOwned = Object.values(prestigeNodes).some((v) => v.length > 0);
  const buildings = Object.values(await getBuildings());

  const bestSkillLevel = Math.max(0, ...SKILL_IDS.map((s) => levels[s] ?? 1));
  const skillsAt99 = SKILL_IDS.filter((s) => (levels[s] ?? 1) >= 99).length;
  const skillsPrestigedOnce = SKILL_IDS.filter((s) => (prestige[s] ?? 0) >= 1).length;
  const skillsPrestiged3x = SKILL_IDS.filter((s) => (prestige[s] ?? 0) >= 3).length;
  const nodesOwned = Object.values(prestigeNodes).reduce((sum, v) => sum + v.length, 0);
  const townsUpgraded = buildings.filter((b) => (townTiers[b.key] ?? 0) >= 1).length;
  const townsMaxed = buildings.filter((b) => (townTiers[b.key] ?? 0) >= b.tiers.length).length;

  const prestigeTrees = await getPrestigePaths();
  const isEligiblePath = (pathKey: string) => !pathKey.startsWith('race_') || pathKey === `race_${playerState.race}`;
  const treeProgress = prestigeTrees.map((tree) => {
    const owned = activeNodesForSkill(playerState, tree);
    const ownedByPath = new Map<string, number>();
    for (const { pathKey } of owned) ownedByPath.set(pathKey, (ownedByPath.get(pathKey) ?? 0) + 1);
    const eligiblePaths = tree.paths.filter((p) => isEligiblePath(p.key) && p.nodes.length > 0);
    const pathsCompleted = eligiblePaths.filter((p) => (ownedByPath.get(p.key) ?? 0) >= p.nodes.length).length;
    const totalNodes = eligiblePaths.reduce((sum, p) => sum + p.nodes.length, 0);
    const ownedNodes = eligiblePaths.reduce((sum, p) => sum + (ownedByPath.get(p.key) ?? 0), 0);
    return {
      skill: tree.skill,
      pathsCompleted,
      totalNodes,
      ownedNodes,
      treeMaxed: totalNodes > 0 && ownedNodes >= totalNodes,
    };
  });
  const pathsCompletedTotal = treeProgress.reduce((sum, t) => sum + t.pathsCompleted, 0);
  const treesMaxed = treeProgress.filter((t) => t.treeMaxed).length;

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
      done: pathsCompletedTotal >= 1,
      detail: `${pathsCompletedTotal} path(s) completed`,
    },
    {
      id: 'prestige_all_1',
      label: 'Prestige every skill at least once',
      done: skillsPrestigedOnce >= SKILL_IDS.length,
      detail: `${skillsPrestigedOnce} / ${SKILL_IDS.length}`,
    },
    {
      id: 'prestige_tree_one',
      label: 'Max a skill’s prestige tree',
      done: treesMaxed >= 1,
      detail: `${treesMaxed} / ${SKILL_IDS.length} tree(s) maxed`,
    },
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
      done: townsUpgraded >= buildings.length,
      detail: `${townsUpgraded} / ${buildings.length}`,
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
      done: townsMaxed >= buildings.length,
      detail: `${townsMaxed} / ${buildings.length}`,
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
    items: achievements.map((a) => ({
      id: a.id,
      label: ACHIEVEMENT_NAMES[a.id] ?? a.label,
      done: a.done,
      detail: a.label,
    })),
  };
}
