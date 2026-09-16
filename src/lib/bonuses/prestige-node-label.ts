// Derived from the game data, manual process to link prestige_paths.json to the name of the skill tree

import { humanize } from '@/lib/utils/humanize';
import { warnOnDrift } from '@/lib/utils/warn-on-drift';

const PRESTIGE_PATH_LABELS: Record<string, Record<string, string>> = {
  mining: {
    yield: 'Purer Ore',
    gem: 'Gem Hunter',
    race_human: 'Resourceful',
  },
  fishing: {
    yield: 'More Fish',
    rod: 'Sturdy Rod',
    race_halfling: 'Patient Angler',
    race_gnome: 'Clever Lures',
    race_human: 'Resourceful',
  },
  woodcutting: {
    yield: 'Sharper Axe',
    axe: 'Honed Edge',
    race_halfling: 'Forest Kin',
    race_human: 'Resourceful',
  },
  farming: {
    rotation: 'Crop Rotation',
    race_halfling: 'Bountiful Harvest',
  },
  thieving: {
    yield: 'Faster Picking',
    coin: 'Silver Tongue',
    race_elf: 'Shadow Step',
  },
  agility: {
    endurance: 'Endurance',
  },
  smithing: {
    flow: 'Flow State',
    thrift: 'Careful Smith',
  },
  cooking: {
    flow: 'Flow State',
    hearty: 'Hearty Meals',
    race_halfling: 'Home Cook',
  },
  fletching: {
    flow: 'Flow State',
    race_gnome: "Tinker's Touch",
  },
  crafting: {
    flow: 'Flow State',
    thrift: 'Steady Hands',
  },
  firemaking: {
    flow: 'Flow State',
    race_dwarf: 'Ember Heart',
    race_gnome: 'Spark Wright',
  },
  runecrafting: {
    flow: 'Flow State',
    runethrift: 'Essence Bond',
  },
  herblore: {
    flow: 'Flow State',
    potency: 'Potent Potions',
  },
  construction: {
    flow: 'Flow State',
    efficient: 'Efficient Builder',
    race_halfling: 'Cozy Builder',
    race_gnome: 'Gadget Works',
  },
};

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function prestigeNodeLabel(skillId: string, pathKey: string, rank: number): string {
  const knownPaths = Object.keys(PRESTIGE_PATH_LABELS[skillId] ?? {});
  warnOnDrift(`${skillId} prestige path`, pathKey, knownPaths);
  const base = PRESTIGE_PATH_LABELS[skillId]?.[pathKey] ?? humanize(pathKey);
  return `${base} ${ROMAN_NUMERALS[rank - 1] ?? rank}`;
}
