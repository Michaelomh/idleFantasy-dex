import { CHARACTER_TITLES, type PlayerState } from '@/lib/save-source/types';
import { ALL_GUILDS, GUILD_DAILIES_REQUIRED_PER_TIER, GUILD_MAX_LEVEL, guildLabel, SKILL_IDS } from '@/lib/game/skills';
import { humanize } from '@/lib/utils/humanize';
import { formatNumber } from '@/lib/utils/format-number';
import { warnOnDrift } from '@/lib/utils/warn-on-drift';
import { computeAchievements } from './achievements';
import {
  getBones,
  getBosses,
  getBuildings,
  getCrops,
  getEnemies,
  getEquipment,
  getGems,
  getGuildQuests,
  getLogs,
  getMarketplace,
  getOres,
  getPets,
  getPrestigePaths,
  getQuests,
  getRunes,
  getSeasonalEvents,
} from './game-data';
import { EXPEDITION_KEYS } from './expeditions-data.generated';
import type { ProgressCategory, ProgressItem } from './types';
import { MAX_ITEM_LEVEL_XP } from '@/lib/utils/xp-table';

function pct(points: number, max: number) {
  return max > 0 ? Math.min(1, points / max) : 0;
}

async function computeQuests(ps: PlayerState): Promise<ProgressCategory> {
  const quests = await getQuests();
  const completedIds = new Set(ps.raw.questProgress.filter((q) => q.completed).map((q) => q.questId));
  const progressByQuest = new Map(ps.raw.questProgress.map((q) => [q.questId, q.progress ?? 0]));
  const items: ProgressItem[] = Object.values(quests).map((q) => {
    const done = completedIds.has(q.id);
    const progress = progressByQuest.get(q.id) ?? 0;
    const progressLine = q.amount !== undefined ? `${Math.min(progress, q.amount)} / ${q.amount}` : undefined;
    return {
      id: q.id,
      label: q.name,
      done,
      detail: progressLine ?? q.description,
    };
  });
  return {
    id: 'quests',
    label: 'Quests',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

async function computeGuilds(ps: PlayerState): Promise<ProgressCategory> {
  const guildQuests = await getGuildQuests();
  const tierCounts = (ps.raw.flags.guild_daily_tier_counts ?? {}) as Record<string, number>;
  const completedQuestIds = new Set(ps.raw.questProgress.filter((q) => q.completed).map((q) => q.questId));
  const stepQuestByGuildTier = new Map<string, string>();
  for (const gq of Object.values(guildQuests))
    stepQuestByGuildTier.set(`${gq.guild}:${gq.guild_level_required}`, gq.id);

  const items: ProgressItem[] = ALL_GUILDS.map((guild) => {
    let level = 0;
    for (let tier = 0; tier < GUILD_MAX_LEVEL; tier++) {
      const dailiesOk = (tierCounts[`${guild}:${tier}`] ?? 0) >= GUILD_DAILIES_REQUIRED_PER_TIER[tier];
      const stepQuestId = stepQuestByGuildTier.get(`${guild}:${tier}`);
      const questOk = !!stepQuestId && completedQuestIds.has(stepQuestId);
      if (!dailiesOk || !questOk) break;
      level = tier + 1;
    }
    return {
      id: guild,
      label: guildLabel(guild),
      done: level >= GUILD_MAX_LEVEL,
      detail: `${level} / ${GUILD_MAX_LEVEL}`,
    };
  });

  const points = ALL_GUILDS.reduce((sum, _guild, i) => sum + Number(items[i].detail!.split(' / ')[0]), 0);
  return {
    id: 'guilds',
    label: 'Guilds',
    points,
    max: ALL_GUILDS.length * GUILD_MAX_LEVEL,
    hasDrilldown: true,
    items,
  };
}

async function computeBosses(ps: PlayerState): Promise<ProgressCategory> {
  const bosses = await getBosses();
  const enemyKills = (ps.raw.flags.enemy_kills ?? {}) as Record<string, number>;
  const seenItems = new Set((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []);

  let points = 0;
  let max = 0;
  const items: ProgressItem[] = Object.values(bosses).map((boss) => {
    const kills = enemyKills[boss.id] ?? 0;
    const drops = boss.rare_drops ?? [];
    const dropsOwned = drops.filter((d) => seenItems.has(d.item)).length;
    max += 1 + drops.length;
    points += (kills > 0 ? 1 : 0) + dropsOwned;
    return {
      id: boss.id,
      label: boss.display_name,
      done: kills > 0 && dropsOwned >= drops.length,
      detail: `${boss.raid ? 'Raid' : 'Solo'} · ${formatNumber(kills)} kills · ${dropsOwned}/${drops.length} drops`,
    };
  });

  return { id: 'bosses', label: 'Bosses', points, max, hasDrilldown: true, items };
}

async function computeArmoury(ps: PlayerState): Promise<ProgressCategory> {
  const equipment = await getEquipment();
  const seenItems = new Set((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []);
  const items: ProgressItem[] = Object.entries(equipment).map(([key, eq]) => ({
    id: key,
    label: eq.display_name ?? humanize(key),
    done: seenItems.has(key),
    detail: eq.slot,
  }));
  return {
    id: 'armoury',
    label: 'Armoury',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

async function computeLevelsAndPrestige(ps: PlayerState): Promise<ProgressCategory> {
  const paths = await getPrestigePaths();
  const prestige = (ps.raw.flags.skill_prestige ?? {}) as Record<string, number>;
  const orderedPaths = [...paths].sort((a, b) => SKILL_IDS.indexOf(a.skill) - SKILL_IDS.indexOf(b.skill));

  const items: ProgressItem[] = orderedPaths.map((skillPaths) => {
    const nonXpCost = skillPaths.paths
      .filter((p) => !p.auto)
      .flatMap((p) => p.nodes)
      .reduce((sum, n) => sum + n.cost, 0);
    const cap = Math.ceil(nonXpCost / 3);
    const owned = Math.min(prestige[skillPaths.skill] ?? 0, cap);
    const level = ps.raw.skillLevels[skillPaths.skill] ?? 1;
    return {
      id: skillPaths.skill,
      label: humanize(skillPaths.skill),
      done: owned >= cap && cap > 0,
      detail: `${owned} / ${cap} prestiges · level ${level}`,
    };
  });

  return {
    id: 'levels',
    label: 'Levels & Prestige',
    points: items.reduce((sum, i) => sum + Number(i.detail!.split(' / ')[0]), 0),
    max: items.reduce((sum, i) => sum + Number(i.detail!.split(' / ')[1].split(' ')[0]), 0),
    hasDrilldown: true,
    items,
  };
}

async function computePets(ps: PlayerState): Promise<ProgressCategory> {
  const pets = await getPets();
  const owned = new Set(ps.raw.pets.map((p) => p.id));
  const items: ProgressItem[] = Object.values(pets).map((pet) => ({
    id: pet.id,
    label: pet.display_name,
    done: owned.has(pet.id),
    detail: pet.source,
  }));
  return {
    id: 'pets',
    label: 'Pets',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

function computeTitles(ps: PlayerState): ProgressCategory {
  const unlocked = (ps.raw.flags.unlocked_titles as string[] | undefined) ?? [];
  for (const id of unlocked) {
    if (!id.startsWith('seasonal_')) warnOnDrift('unlocked title', id, CHARACTER_TITLES);
  }
  const unlockedSet = new Set(unlocked);
  const items: ProgressItem[] = CHARACTER_TITLES.map((id) => ({
    id,
    label: humanize(id),
    done: unlockedSet.has(id),
  }));

  // Seasonal-event titles (e.g. "seasonal_sunspire_solstice_2026") are a new one per event,
  // unbounded and not in the hand-copied CHARACTER_TITLES catalogue. Shown for visibility,
  // excluded from both numerator and denominator rather than silently dropped or miscounted.
  const seasonalTitles = unlocked.filter((id) => id.startsWith('seasonal_'));
  for (const id of seasonalTitles) {
    items.push({ id, label: humanize(id), done: true, detail: 'Seasonal - not counted' });
  }

  return {
    id: 'titles',
    label: 'Titles',
    points: items.filter((i) => i.done && !i.id.startsWith('seasonal_')).length,
    max: CHARACTER_TITLES.length,
    hasDrilldown: true,
    items,
    info: 'Might not work properly with seasonal titles',
  };
}

async function computeSeasonalEvents(ps: PlayerState): Promise<ProgressCategory> {
  const events = await getSeasonalEvents();
  const earned = (ps.raw.flags.seasonal_banners_earned as { event_id: string; event_display_name: string }[]) ?? [];
  const max = Math.max(Object.keys(events).length, earned.length);
  return {
    id: 'seasonal-events',
    label: 'Seasonal Events',
    points: earned.length,
    max,
    hasDrilldown: false,
    items: [],
  };
}

async function computeBuilderWorkshop(ps: PlayerState): Promise<ProgressCategory> {
  const buildings = await getBuildings();
  const tiers = (ps.raw.flags.town_building_tiers ?? {}) as Record<string, number>;
  let points = 0;
  let max = 0;
  for (const b of Object.values(buildings)) {
    max += b.tiers.length;
    points += Math.min(tiers[b.key] ?? 0, b.tiers.length);
  }
  return { id: 'builders-workshop', label: 'Builder’s Workshop', points, max, hasDrilldown: false, items: [] };
}

function computeGrandMonument(ps: PlayerState): ProgressCategory {
  const tier = Number(ps.raw.flags.monument_tier ?? 0);
  const fund = Number(ps.raw.flags.monument_fund ?? 0);
  const FLAME_GOAL = 1_000_000_000;
  const points = tier <= 3 ? tier : tier === 4 ? 4 + Math.min(fund / FLAME_GOAL, 1) : 5;
  return {
    id: 'grand-monument',
    label: 'Grand Monument',
    points,
    max: 5,
    hasDrilldown: false,
    items: [],
    progressLabel:
      tier === 4 ? `${formatNumber(fund)} / 1,000M (${((fund / FLAME_GOAL) * 100).toFixed(1)}%)` : undefined,
  };
}

/** Every expedition completes at 5 notes - enforced at sync time, see scripts/sync-game-data.js. */
const EXPEDITION_NOTE_THRESHOLD = 5;

function computeExpeditions(ps: PlayerState): ProgressCategory {
  const notes = (ps.raw.flags.skilling_dungeon_notes ?? {}) as Record<string, number>;
  const items: ProgressItem[] = EXPEDITION_KEYS.map((key) => {
    const found = notes[key] ?? 0;
    return {
      id: key,
      label: humanize(key),
      done: found >= EXPEDITION_NOTE_THRESHOLD,
      detail: `${Math.min(found, EXPEDITION_NOTE_THRESHOLD)} / ${EXPEDITION_NOTE_THRESHOLD} notes`,
    };
  });
  return {
    id: 'expeditions',
    label: 'Expeditions',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

async function computeBestiary(ps: PlayerState): Promise<ProgressCategory> {
  const enemies = await getEnemies();
  const kills = (ps.raw.flags.enemy_kills ?? {}) as Record<string, number>;
  const items: ProgressItem[] = Object.values(enemies).map((e) => ({
    id: e.name,
    label: e.display_name,
    done: (kills[e.name] ?? 0) > 0,
    detail: `${kills[e.name] ?? 0} killed`,
  }));
  return {
    id: 'bestiary',
    label: 'Bestiary',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

async function computeInventory(ps: PlayerState): Promise<ProgressCategory> {
  const [equipment, enemies, marketplace, gems, ores, logs, crops, bones, runes] = await Promise.all([
    getEquipment(),
    getEnemies(),
    getMarketplace(),
    getGems(),
    getOres(),
    getLogs(),
    getCrops(),
    getBones(),
    getRunes(),
  ]);
  const universe = new Set<string>(Object.keys(equipment));
  for (const e of Object.values(enemies)) {
    for (const d of e.drop_table ?? []) universe.add(d.item);
    for (const d of e.always_drops ?? []) universe.add(d.item);
  }
  for (const category of Object.values(marketplace)) for (const key of Object.keys(category.items)) universe.add(key);
  for (const resource of [gems, ores, logs, crops, bones, runes])
    for (const key of Object.keys(resource)) universe.add(key);
  const seen = new Set<string>([
    ...((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []),
    ...Object.keys(ps.raw.inventory),
  ]);
  for (const k of seen) universe.add(k);
  const owned = [...universe].filter((k) => seen.has(k));
  return {
    id: 'inventory',
    label: 'Inventory',
    points: owned.length,
    max: universe.size,
    info: 'Built from armoury items, monster drops, and your own save - not an official item list, and not fully accurate.',
    hasDrilldown: true,
    items: [...universe].map((k) => ({ id: k, label: humanize(k), done: seen.has(k) })),
  };
}

async function computeHeirloomTools(ps: PlayerState): Promise<ProgressCategory> {
  const equipment = await getEquipment();
  const seen = new Set((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []);
  const heirloomXp = (ps.raw.flags.heirloom_xp ?? {}) as Record<string, number>;
  const heirlooms = Object.entries(equipment).filter(([, eq]) => !!eq.heirloom_skill);

  const items: ProgressItem[] = [];
  let points = 0;
  for (const [key, eq] of heirlooms) {
    const owned = seen.has(key);
    const maxed = (heirloomXp[key] ?? 0) >= MAX_ITEM_LEVEL_XP;
    points += (owned ? 1 : 0) + (maxed ? 1 : 0);
    items.push({
      id: key,
      label: eq.display_name ?? humanize(key),
      done: owned && maxed,
      detail: `${owned ? 'Obtained' : 'Not obtained'} · ${maxed ? 'Max level' : 'Not maxed'}`,
    });
  }

  return {
    id: 'heirloom-tools',
    label: 'Heirloom Tools',
    points,
    max: heirlooms.length * 2,
    hasDrilldown: true,
    items,
  };
}

function computeInfinityTower(ps: PlayerState): ProgressCategory {
  const best = Number(ps.raw.flags.tower_best_floor ?? 0);
  const CAP = 250;
  return {
    id: 'infinity-tower',
    label: 'Infinity Tower',
    points: Math.min(best, CAP),
    max: CAP,
    hasDrilldown: false,
    items: [],
  };
}

export const CATEGORY_IDS = [
  'quests',
  'guilds',
  'bosses',
  'armoury',
  'levels',
  'pets',
  'titles',
  'seasonal-events',
  'builders-workshop',
  'grand-monument',
  'expeditions',
  'achievements',
  'bestiary',
  'infinity-tower',
  'inventory',
  'heirloom-tools',
] as const;

export const PROGRESS_SECTIONS: { label: string; categoryIds: (typeof CATEGORY_IDS)[number][] }[] = [
  { label: 'Skilling', categoryIds: ['levels', 'guilds'] },
  { label: 'Combat', categoryIds: ['bosses', 'bestiary', 'infinity-tower'] },
  { label: 'Collection', categoryIds: ['armoury', 'inventory', 'pets', 'heirloom-tools', 'expeditions'] },
  { label: 'Awards', categoryIds: ['quests', 'achievements', 'titles'] },
  { label: 'Other', categoryIds: ['builders-workshop', 'grand-monument', 'seasonal-events'] },
];

export async function computeAllCategories(ps: PlayerState): Promise<ProgressCategory[]> {
  const [quests, pets] = await Promise.all([getQuests(), getPets()]);
  const totalQuests = Object.keys(quests).length;
  const totalPets = Object.keys(pets).length;

  const results = await Promise.all([
    computeQuests(ps),
    computeGuilds(ps),
    computeBosses(ps),
    computeArmoury(ps),
    computeLevelsAndPrestige(ps),
    computePets(ps),
    Promise.resolve(computeTitles(ps)),
    computeSeasonalEvents(ps),
    computeBuilderWorkshop(ps),
    Promise.resolve(computeGrandMonument(ps)),
    Promise.resolve(computeExpeditions(ps)),
    computeAchievements(ps, totalQuests, totalPets),
    computeBestiary(ps),
    Promise.resolve(computeInfinityTower(ps)),
    computeInventory(ps),
    computeHeirloomTools(ps),
  ]);
  return results;
}

export async function computeCategory(id: string, ps: PlayerState): Promise<ProgressCategory | undefined> {
  const all = await computeAllCategories(ps);
  return all.find((c) => c.id === id);
}

export function rollUp(categories: ProgressCategory[]): number {
  if (categories.length === 0) return 0;
  return categories.reduce((sum, c) => sum + pct(c.points, c.max), 0) / categories.length;
}
