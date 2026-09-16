import { loadJson as load } from '@/lib/utils/fetch-json-cache';

export type EquipmentEntry = {
  id?: string;
  name?: string;
  display_name?: string;
  slot?: string;
  description?: string;
  heirloom_skill?: string | null;
  two_handed?: boolean;
  requirements?: Record<string, number>;
  cape_skill?: string;
  cape_bonus?: number;
  [key: string]: unknown;
};
export const getEquipment = () => load<Record<string, EquipmentEntry>>('equipment.json');

export type QuestEntry = {
  id: string;
  name: string;
  skill?: string;
  tier?: number;
  description?: string;
  amount?: number;
};
export const getQuests = () => load<Record<string, QuestEntry>>('quests.json');

export type BossEntry = {
  id: string;
  display_name: string;
  emoji?: string;
  raid?: boolean;
  description?: string;
  combat_level_required?: number;
  duration_minutes?: number;
  hp?: number;
  combat_stats?: Record<string, number>;
  defensive_stats?: Record<string, number>;
  xp_rewards?: Record<string, number>;
  rare_drops?: { item: string; chance?: number; comment?: string }[];
  common_loot?: { coins_min?: number; coins_max?: number; items?: Record<string, { min: number; max: number }> };
};
export const getBosses = () => load<Record<string, BossEntry>>('raid_bosses.json');

export type PrestigePathNode = { id: string; cost: number; effect?: string; value?: number };
export type PrestigePath = { key: string; auto: boolean; nodes: PrestigePathNode[] };
export type PrestigeSkillPaths = { skill: string; paths: PrestigePath[] };
export const getPrestigePaths = () => load<PrestigeSkillPaths[]>('prestige_paths.json');

export type GuildQuestEntry = { id: string; guild: string; guild_level_required: number; name: string };
export const getGuildQuests = () => load<Record<string, GuildQuestEntry>>('guild_quests.json');

export type PetEntry = {
  id: string;
  display_name: string;
  emoji?: string;
  source?: string;
  description?: string;
  effect_type?: string;
  boosted_skill?: string;
  boost_percent?: number;
};
export const getPets = () => load<Record<string, PetEntry>>('pets.json');

export type BuildingTier = { construction_level_required?: number; coin_cost?: number };
export type BuildingEntry = { key: string; tiers: BuildingTier[] };
export const getBuildings = () => load<Record<string, BuildingEntry>>('buildings.json');

export type SeasonalEventEntry = { id?: string; display_name?: string; [key: string]: unknown };
export const getSeasonalEvents = () => load<Record<string, SeasonalEventEntry>>('seasonal_events.json');

export type EnemyEntry = {
  name: string;
  display_name: string;
  drop_table?: { item: string }[];
  always_drops?: { item: string }[];
};
export const getEnemies = () => load<Record<string, EnemyEntry>>('enemies.json');

export type FishEntry = { id?: string; display_name?: string; [key: string]: unknown };
export const getFish = () => load<Record<string, FishEntry>>('fish.json');

export type MarketplaceCategory = {
  category_name?: string;
  description?: string;
  items: Record<string, { display_name?: string; description?: string; price?: number; stock?: string | number }>;
};
export const getMarketplace = () => load<Record<string, MarketplaceCategory>>('marketplace.json');

export type ResourceEntry = { display_name?: string; [key: string]: unknown };
export const getGems = () => load<Record<string, ResourceEntry>>('gems.json');
export const getOres = () => load<Record<string, ResourceEntry>>('ores.json');
export const getLogs = () => load<Record<string, ResourceEntry>>('logs.json');
export const getCrops = () => load<Record<string, ResourceEntry>>('crops.json');
export const getBones = () => load<Record<string, ResourceEntry>>('bones.json');
export const getRunes = () => load<Record<string, ResourceEntry>>('runes.json');
