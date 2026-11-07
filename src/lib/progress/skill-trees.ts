import type { PlayerState } from '@/lib/save-source/types';
import { SKILL_IDS, SKILLS } from '@/lib/game/skills';
import { skillIcon } from '@/lib/game/skill-icons';
import { humanize } from '@/lib/utils/humanize';
import { getPrestigePaths, type PrestigePathNode } from './game-data';
import type { ProgressCategory, ProgressItem, ProgressPath, ProgressPathSegment } from './types';

// Ported from the game's strings.xml (prestige_path_*), game version 1.16.0. Skill-specific names
// win over shared ones, as in GameStrings.kt's prestigePathName.
const PATH_NAMES: Record<string, string> = {
  fishing_rod: 'Sturdy Rod',
  woodcutting_axe: 'Honed Edge',
  cooking_hearty: 'Hearty Meals',
  smithing_thrift: 'Careful Smith',
  crafting_thrift: 'Steady Hands',
  herblore_potency: 'Potent Potions',
  runecrafting_runethrift: 'Essence Bond',
  magic_runethrift: 'Rune Thrift',
  construction_efficient: 'Efficient Builder',
  prayer_devotion: 'Devotion',
  mercantile_trade: 'Trade Baron',
  slayer_bounty: 'Bounty Hunter',
  ranged_quiver: 'Quiver Care',
  defense_laststand: 'Last Stand',
  hitpoints_constitution: 'Constitution',
  strength_double_hit: 'Double Hit',
  ranged_bows: 'Better Bows',
  slayer_foresight: 'Foresight',
  yield: 'Yield',
  flow: 'Flow-state',
  endurance: 'Endurance',
  gem: 'Gem Hunter',
  rotation: 'Crop Rotation',
  mining_yield: 'Purer Ore',
  fishing_yield: 'More Fish',
  woodcutting_yield: 'Sharper Axe',
  thieving_yield: 'Faster Picking',
  slayer_yield: "Hunter's Instinct",
  attack_prowess: 'Precision',
  strength_prowess: 'Might',
  defense_prowess: 'Bulwark',
  ranged_prowess: 'Deadeye',
  magic_prowess: 'Attunement',
  hitpoints_prowess: 'Vitality',
  thieving_coin: 'Silver Tongue',
  mercantile_coin: 'Haggler',
  race_human: 'Resourceful',
  thieving_race_elf: 'Shadow Step',
  firemaking_race_dwarf: 'Ember Heart',
  fishing_race_halfling: 'Patient Angler',
  woodcutting_race_halfling: 'Forest Kin',
  farming_race_halfling: 'Bountiful Harvest',
  cooking_race_halfling: 'Home Cook',
  construction_race_halfling: 'Cozy Builder',
  fishing_race_gnome: 'Clever Lures',
  fletching_race_gnome: "Tinker's Touch",
  firemaking_race_gnome: 'Spark Wright',
  construction_race_gnome: 'Gadget Works',
  prayer_race_gnome: "Trickster's Favor",
  hitpoints_race_orc: 'Thick Hide',
};

const pathName = (skill: string, key: string) => PATH_NAMES[`${skill}_${key}`] ?? PATH_NAMES[key] ?? humanize(key);

// Mirrors PrestigeBoosts.kt (game 1.16.0): race changes keep purchased nodes, so regular characters
// can own every race's nodes. Ironman race is fixed, so other races' nodes are unreachable. A blank
// race means human.
export function isReachable(node: PrestigePathNode, ps: PlayerState): boolean {
  return !ps.ironman || !node.races || node.races.includes(ps.race?.toLowerCase() || 'human');
}

// A path can open to every race and then lock its later tiers, so runs of nodes with the same race
// lock become separate segments.
function toSegments(nodes: PrestigePathNode[], owned: Set<string>): ProgressPathSegment[] {
  const segments: ProgressPathSegment[] = [];
  for (const node of nodes) {
    const races = node.races ?? [];
    let segment = segments.at(-1);
    if (segment?.races.join() !== races.join()) {
      segment = { races, current: 0, cap: 0 };
      segments.push(segment);
    }
    segment.cap += 1;
    if (owned.has(node.id)) segment.current += 1;
  }
  return segments;
}

// Not its own Progress category: these points and maxes are added to Levels & Prestige.
export async function computeSkillTrees(ps: PlayerState): Promise<ProgressCategory> {
  const trees = await getPrestigePaths();
  const ownedBySkill = (ps.raw.flags.prestige_nodes ?? {}) as Record<string, string[]>;
  const orderedTrees = [...trees].sort((a, b) => SKILL_IDS.indexOf(a.skill) - SKILL_IDS.indexOf(b.skill));

  const items: ProgressItem[] = orderedTrees.map(({ skill, paths }) => {
    const owned = new Set(ownedBySkill[skill] ?? []);
    const treePaths: ProgressPath[] = paths
      .filter((path) => !path.auto)
      .flatMap((path) => {
        const nodes = path.nodes.filter((node) => isReachable(node, ps));
        if (nodes.length === 0) return [];
        return [
          {
            id: path.key,
            label: pathName(skill, path.key),
            current: nodes.filter((node) => owned.has(node.id)).length,
            cap: nodes.length,
            segments: toSegments(nodes, owned),
          },
        ];
      });
    const current = treePaths.reduce((sum, path) => sum + path.current, 0);
    const cap = treePaths.reduce((sum, path) => sum + path.cap, 0);
    return {
      id: skill,
      label: SKILLS.find((s) => s.id === skill)?.label ?? humanize(skill),
      done: current === cap,
      icon: skillIcon(skill),
      current,
      cap,
      paths: treePaths,
    };
  });

  return {
    id: 'skill-trees',
    label: 'Skill Trees',
    points: items.reduce((sum, item) => sum + (item.current ?? 0), 0),
    max: items.reduce((sum, item) => sum + (item.cap ?? 0), 0),
    hasDrilldown: false,
    items,
  };
}
