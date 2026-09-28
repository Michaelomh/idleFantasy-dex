export type RouteMeta = {
  path: string;
  title: string;
  parent: string | null;
};

export const DOCK_TABS = [
  { label: 'Overview', path: '/' },
  { label: 'Progress', path: '/progress' },
  { label: 'Calculator', path: '/calculator' },
  { label: 'Simulator', path: '/simulator' },
  { label: 'Settings', path: '/settings' },
];

export const ROUTES: RouteMeta[] = [
  { path: '/', title: 'Overview', parent: null },

  { path: '/progress', title: 'Progress', parent: null },
  { path: '/progress/quests', title: 'Quests', parent: '/progress' },
  { path: '/progress/guilds', title: 'Guilds', parent: '/progress' },
  { path: '/progress/bosses', title: 'Bosses', parent: '/progress' },
  { path: '/progress/armoury', title: 'Armoury', parent: '/progress' },
  { path: '/progress/levels', title: 'Levels', parent: '/progress' },
  { path: '/progress/pets', title: 'Pets', parent: '/progress' },
  { path: '/progress/titles', title: 'Titles', parent: '/progress' },
  { path: '/progress/expeditions', title: 'Expeditions', parent: '/progress' },
  { path: '/progress/achievements', title: 'Achievements', parent: '/progress' },
  { path: '/progress/bestiary', title: 'Bestiary', parent: '/progress' },
  { path: '/progress/inventory', title: 'Inventory', parent: '/progress' },
  { path: '/progress/heirloom-tools', title: 'Heirloom Tools', parent: '/progress' },

  { path: '/simulator', title: 'Simulator', parent: null },
  { path: '/simulator/bosses', title: 'Bosses', parent: '/simulator' },
  { path: '/simulator/bosses/:bossId', title: 'Bosses', parent: '/simulator/bosses' },

  { path: '/calculator', title: 'Calculator', parent: null },
  { path: '/calculator/mining', title: 'Mining', parent: '/calculator' },
  { path: '/calculator/fishing', title: 'Fishing', parent: '/calculator' },
  { path: '/calculator/woodcutting', title: 'Woodcutting', parent: '/calculator' },
  { path: '/calculator/farming', title: 'Farming', parent: '/calculator' },
  { path: '/calculator/agility', title: 'Agility', parent: '/calculator' },
  { path: '/calculator/thieving', title: 'Thieving', parent: '/calculator' },
  { path: '/calculator/smithing', title: 'Smithing', parent: '/calculator' },
  { path: '/calculator/cooking', title: 'Cooking', parent: '/calculator' },
  { path: '/calculator/fletching', title: 'Fletching', parent: '/calculator' },
  { path: '/calculator/crafting', title: 'Crafting', parent: '/calculator' },
  { path: '/calculator/firemaking', title: 'Firemaking', parent: '/calculator' },
  { path: '/calculator/runecrafting', title: 'Runecrafting', parent: '/calculator' },
  { path: '/calculator/herblore', title: 'Herblore', parent: '/calculator' },
  { path: '/calculator/construction', title: 'Construction', parent: '/calculator' },

  { path: '/settings', title: 'Settings', parent: '/' },
  { path: '/welcome', title: 'Welcome', parent: null },
  { path: '/onboarding', title: 'Onboarding', parent: null },
  { path: '/no-save', title: 'No Save Found', parent: null },
];

export function matchRoute(pathname: string): RouteMeta | undefined {
  return ROUTES.find((route) => {
    const pattern = '^' + route.path.replace(/:[^/]+/g, '[^/]+') + '$';
    return new RegExp(pattern).test(pathname);
  });
}
