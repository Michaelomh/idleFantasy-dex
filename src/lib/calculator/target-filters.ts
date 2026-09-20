import type { TargetOption } from './types';

export type TargetFilterGroup = {
  id: string;
  label: string;
  options: string[];
};

const SMITHING_FILTER_GROUPS: TargetFilterGroup[] = [
  { id: 'category', label: 'Category', options: ['Bar', 'Components', 'Armour', 'Weapon', 'Tools'] },
  {
    id: 'tier',
    label: 'Tier',
    options: ['Runite', 'Adamantite', 'Mithril', 'Steel', 'Iron', 'Bronze', 'Platinum', 'Gold', 'Silver'],
  },
];

const CONSTRUCTION_FILTER_GROUPS: TargetFilterGroup[] = [
  { id: 'tier', label: 'Tier', options: ['Redwood', 'Magic', 'Yew', 'Maple', 'Willow', 'Oak', 'Plank', 'Stone'] },
];

const CRAFTING_FILTER_GROUPS: TargetFilterGroup[] = [
  { id: 'metal', label: 'Metal', options: ['Platinum', 'Gold', 'Silver'] },
  { id: 'gem', label: 'Gem', options: ['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'None'] },
];

const HERBLORE_FILTER_GROUPS: TargetFilterGroup[] = [
  { id: 'category', label: 'Category', options: ['Brew', 'Potion', 'Super Potion'] },
];

const FLETCHING_CATEGORY_GROUP: TargetFilterGroup = {
  id: 'category',
  label: 'Category',
  options: ['Bow', 'Staff', 'Planks', 'Ammunition'],
};
const FLETCHING_WOOD_TIERS = ['Redwood', 'Magic', 'Yew', 'Maple', 'Willow', 'Oak', 'Basic'];
const FLETCHING_ORE_TIERS = ['Runite', 'Adamantite', 'Mithril', 'Steel', 'Iron', 'Bronze'];

function fletchingFilterGroups(selected: Record<string, string | undefined>): TargetFilterGroup[] {
  const groups: TargetFilterGroup[] = [FLETCHING_CATEGORY_GROUP];
  const category = selected.category;
  if (category === 'Ammunition') {
    groups.push({ id: 'tier', label: 'Tier', options: FLETCHING_ORE_TIERS });
  } else if (category === 'Bow' || category === 'Staff' || category === 'Planks') {
    groups.push({ id: 'tier', label: 'Tier', options: FLETCHING_WOOD_TIERS });
  }
  return groups;
}

export function targetFilterGroupsForSkill(
  skillId: string,
  selected: Record<string, string | undefined> = {},
): TargetFilterGroup[] {
  switch (skillId) {
    case 'smithing':
      return SMITHING_FILTER_GROUPS;
    case 'construction':
      return CONSTRUCTION_FILTER_GROUPS;
    case 'crafting':
      return CRAFTING_FILTER_GROUPS;
    case 'herblore':
      return HERBLORE_FILTER_GROUPS;
    case 'fletching':
      return fletchingFilterGroups(selected);
    default:
      return [];
  }
}

export function applyTargetFilters(
  targets: TargetOption[],
  groups: TargetFilterGroup[],
  selected: Record<string, string | undefined>,
): TargetOption[] {
  const activeGroups = groups.filter((g) => !!selected[g.id]);
  if (activeGroups.length === 0) return targets;

  return targets.filter((t) => activeGroups.every((g) => t.filterTags?.[g.id] === selected[g.id]));
}
