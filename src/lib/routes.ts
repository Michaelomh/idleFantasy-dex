export type RouteMeta = {
  /** Absolute path, e.g. '/progress/bosses/:bossId'. */
  path: string;
  title: string;
  /** Absolute path to navigate back to, or null if this page has no back button. */
  parent: string | null;
  /** Index into DOCK_TABS if the floating dock bar should be visible on this page. */
  dockTab?: number;
};

export const DOCK_TABS = [
  { label: 'Overview', path: '/' },
  { label: 'Progress', path: '/progress' },
  { label: 'Simulator', path: '/simulator' },
  { label: 'Calculator', path: '/calculator' },
  { label: 'Settings', path: '/settings' },
];

export const ROUTES: RouteMeta[] = [
  { path: '/', title: 'Overview', parent: null, dockTab: 0 },
  { path: '/skill/:skillId', title: 'Skill', parent: '/' },

  { path: '/progress', title: 'Progress', parent: null, dockTab: 1 },
  { path: '/progress/quests', title: 'Quests', parent: '/progress', dockTab: 1 },
  { path: '/progress/guilds', title: 'Guilds', parent: '/progress', dockTab: 1 },
  { path: '/progress/bosses', title: 'Bosses', parent: '/progress', dockTab: 1 },
  { path: '/progress/armoury', title: 'Armoury', parent: '/progress', dockTab: 1 },
  { path: '/progress/levels', title: 'Levels', parent: '/progress', dockTab: 1 },
  { path: '/progress/pets', title: 'Pets', parent: '/progress', dockTab: 1 },
  { path: '/progress/titles', title: 'Titles', parent: '/progress', dockTab: 1 },
  { path: '/progress/expeditions', title: 'Expeditions', parent: '/progress', dockTab: 1 },
  { path: '/progress/achievements', title: 'Achievements', parent: '/progress', dockTab: 1 },
  { path: '/progress/bestiary', title: 'Bestiary', parent: '/progress', dockTab: 1 },
  { path: '/progress/inventory', title: 'Inventory', parent: '/progress', dockTab: 1 },
  { path: '/progress/heirloom-tools', title: 'Heirloom Tools', parent: '/progress', dockTab: 1 },
  { path: '/progress/bosses/:bossId', title: 'Boss', parent: '/progress/bosses', dockTab: 1 },

  { path: '/simulator', title: 'Simulator', parent: null, dockTab: 2 },
  { path: '/simulator/solo', title: 'Solo', parent: '/simulator', dockTab: 2 },
  { path: '/simulator/solo/:bossId', title: 'Solo Boss', parent: '/simulator/solo', dockTab: 2 },
  { path: '/simulator/raid', title: 'Raid', parent: '/simulator', dockTab: 2 },
  { path: '/simulator/raid/:bossId', title: 'Raid Boss', parent: '/simulator/raid', dockTab: 2 },
  { path: '/simulator/infinity-tower', title: 'Infinity Tower', parent: '/simulator', dockTab: 2 },
  { path: '/simulator/dungeon', title: 'Dungeon', parent: '/simulator', dockTab: 2 },
  { path: '/simulator/dungeon/:dungeonId', title: 'Dungeon', parent: '/simulator/dungeon', dockTab: 2 },

  { path: '/calculator', title: 'Calculator', parent: null, dockTab: 3 },
  { path: '/calculator/mining', title: 'Mining', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/fishing', title: 'Fishing', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/woodcutting', title: 'Woodcutting', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/farming', title: 'Farming', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/agility', title: 'Agility', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/thieving', title: 'Thieving', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/smithing', title: 'Smithing', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/cooking', title: 'Cooking', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/fletching', title: 'Fletching', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/crafting', title: 'Crafting', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/firemaking', title: 'Firemaking', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/runecrafting', title: 'Runecrafting', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/herblore', title: 'Herblore', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/construction', title: 'Construction', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/workers', title: 'Workers', parent: '/calculator', dockTab: 3 },
  { path: '/calculator/workers/:skillId', title: 'Worker Skill', parent: '/calculator/workers', dockTab: 3 },

  { path: '/settings', title: 'Settings', parent: '/', dockTab: 4 },
  { path: '/saves', title: 'Saves', parent: '/settings' },
  { path: '/onboarding', title: 'Onboarding', parent: null },
  { path: '/no-save', title: 'No Save Found', parent: null },
];

export function matchRoute(pathname: string): RouteMeta | undefined {
  return ROUTES.find((route) => {
    const pattern = '^' + route.path.replace(/:[^/]+/g, '[^/]+') + '$';
    return new RegExp(pattern).test(pathname);
  });
}

export function getChildren(path: string): RouteMeta[] {
  return ROUTES.filter((route) => route.parent === path && !route.path.includes(':'));
}
