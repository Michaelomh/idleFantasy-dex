import { loadJson as load } from '@/lib/utils/fetch-json-cache';

export type TreeEntry = {
  display_name: string;
  log_name: string;
  log_display_name: string;
  level_required: number;
  xp_per_log: number;
};
export const getTrees = () => load<Record<string, TreeEntry>>('trees.json');

export type LootEntry = { item: string; chance: number; min_qty?: number; max_qty?: number };
export type ThievingNpc = {
  key: string;
  display_name: string;
  level_required: number;
  base_xp: number;
  coins_min: number;
  coins_max: number;
  loot_table: LootEntry[];
};
export const getThievingNpcs = () => load<ThievingNpc[]>('thieving_npcs.json');

export type AgilityCourse = {
  name: string;
  display_name: string;
  level_required: number;
  xp_per_success: number;
};
export const getAgilityCourses = () => load<Record<string, AgilityCourse>>('agility_courses.json');

export type RecipeEntry = {
  display_name: string;
  level_required: number;
  materials: Record<string, number>;
  output_quantity: number;
  xp_per_item: number;
  raw_item?: string;
  cooked_item?: string;
  item_name?: string;
  effects?: Record<string, number>;
  healing_value?: number;
};
export const getRecipes = (family: 'smithing' | 'cooking' | 'fletching' | 'crafting' | 'herblore' | 'construction') =>
  load<Record<string, RecipeEntry>>(`recipes/${family}.json`);

export type ResourceEntry = { display_name: string; level_required: number; [key: string]: unknown };
export const getOreEntries = () => load<Record<string, ResourceEntry>>('ores.json');
export const getFishEntries = () => load<Record<string, ResourceEntry>>('fish.json');
export const getLogEntries = () => load<Record<string, ResourceEntry>>('logs.json');
export const getRuneEntries = () => load<Record<string, ResourceEntry>>('runes.json');

export type CropEntry = {
  id: string;
  display_name: string;
  seed_name: string;
  growth_time_hours: number;
  farming_level_required: number;
  planting_xp: number;
  harvest_xp: number;
  yield_min: number;
  yield_max: number;
};
export const getCropEntries = () => load<Record<string, CropEntry>>('crops.json');

export type FishingDropRow = { item: string; chance: number; min_qty?: number; max_qty?: number };
export type FishingSkillData = {
  xp_ranges: Record<string, { min: number; max: number }>;
  drop_tables: Record<string, FishingDropRow[]>;
};
export const getFishingSkillData = () => load<FishingSkillData>('skills/fishing.json');
