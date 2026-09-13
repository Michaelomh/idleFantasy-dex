export type SkillCategory = 'Gathering' | 'Crafting' | 'Support' | 'Combat';

export const SKILLS: { id: string; label: string; category: SkillCategory }[] = [
  { id: 'mining', label: 'Mining', category: 'Gathering' },
  { id: 'fishing', label: 'Fishing', category: 'Gathering' },
  { id: 'woodcutting', label: 'Woodcutting', category: 'Gathering' },
  { id: 'farming', label: 'Farming', category: 'Gathering' },
  { id: 'thieving', label: 'Thieving', category: 'Gathering' },
  { id: 'firemaking', label: 'Firemaking', category: 'Crafting' },
  { id: 'smithing', label: 'Smithing', category: 'Crafting' },
  { id: 'cooking', label: 'Cooking', category: 'Crafting' },
  { id: 'fletching', label: 'Fletching', category: 'Crafting' },
  { id: 'crafting', label: 'Crafting', category: 'Crafting' },
  { id: 'runecrafting', label: 'Runecrafting', category: 'Crafting' },
  { id: 'herblore', label: 'Herblore', category: 'Crafting' },
  { id: 'construction', label: 'Construction', category: 'Crafting' },
  { id: 'agility', label: 'Agility', category: 'Support' },
  { id: 'mercantile', label: 'Mercantile', category: 'Support' },
  { id: 'prayer', label: 'Prayer', category: 'Support' },
  { id: 'attack', label: 'Attack', category: 'Combat' },
  { id: 'strength', label: 'Strength', category: 'Combat' },
  { id: 'defense', label: 'Defense', category: 'Combat' },
  { id: 'ranged', label: 'Ranged', category: 'Combat' },
  { id: 'magic', label: 'Magic', category: 'Combat' },
  { id: 'hitpoints', label: 'Hitpoints', category: 'Combat' },
  { id: 'slayer', label: 'Slayer', category: 'Combat' },
];

export const SKILL_IDS = SKILLS.map((s) => s.id);

export const ALL_GUILDS = [
  'mining',
  'fishing',
  'woodcutting',
  'farming',
  'thieving',
  'firemaking',
  'agility',
  'smithing',
  'cooking',
  'fletching',
  'crafting',
  'runecrafting',
  'herblore',
  'construction',
  'warriors',
  'archers',
  'mages',
  'slayer',
  'prayer',
  'mercantile',
];

const GUILD_LABELS: Record<string, string> = {
  warriors: 'Warriors Guild',
  archers: 'Archers Guild',
  mages: 'Mages Guild',
};

export function guildLabel(guild: string): string {
  return GUILD_LABELS[guild] ?? `${guild.charAt(0).toUpperCase()}${guild.slice(1)} Guild`;
}

/** Guild dailies required to pass each tier (index = tier 0-9), from GuildRepository.DAILIES_REQUIRED_PER_TIER. */
export const GUILD_DAILIES_REQUIRED_PER_TIER = [2, 3, 4, 5, 7, 9, 12, 15, 20, 25];
export const GUILD_MAX_LEVEL = 10;
