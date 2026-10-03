import { CHARACTER_TITLES, type PlayerState } from '@/lib/save-source/types';
import {
  ALL_GUILDS,
  CATEGORY_ORDER,
  GUILD_DAILIES_REQUIRED_PER_TIER,
  GUILD_MAX_LEVEL,
  guildLabel,
  SKILL_IDS,
  SKILLS,
} from '@/lib/game/skills';
import { skillIcon } from '@/lib/game/skill-icons';
import { humanize } from '@/lib/utils/humanize';
import { formatNumber } from '@/lib/utils/format-number';
import { warnOnDrift } from '@/lib/utils/warn-on-drift';
import {
  ELDER_ISLE_BOSS_IDS,
  ELDER_ISLE_DUNGEON_IDS,
  ELDER_ISLE_ENEMY_IDS,
  ELDER_ISLE_IDS,
  ELDER_ISLE_PET_IDS,
  ELDER_QUEST_CHAIN,
  ELDER_LORE_FRAGMENTS,
  ELDER_SKILL_IDS,
} from '@/lib/game/elder-isle';
import { getIncludeElderIsle } from '@/lib/app/preferences';
import { computeAchievements } from './achievements';
import {
  getBones,
  getBosses,
  sortBossesForDisplay,
  getBuildings,
  getCrops,
  getDungeons,
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
  type DungeonEntry,
  type EquipmentEntry,
} from './game-data';
import { EXPEDITION_KEYS } from './expeditions-data.generated';
import type { ProgressCategory, ProgressItem } from './types';
import { levelForXp, MAX_ITEM_LEVEL_XP } from '@/lib/utils/xp-table';

function pct(points: number, max: number) {
  return max > 0 ? Math.min(1, points / max) : 0;
}

function elderQuestsCompleted(ps: PlayerState): Set<string> {
  return new Set((ps.raw.flags.elder_quests_completed as string[] | undefined) ?? []);
}

function elderQuestItems(ps: PlayerState): ProgressItem[] {
  const completed = elderQuestsCompleted(ps);
  return ELDER_QUEST_CHAIN.map((q) => ({ id: q.id, label: q.title, done: completed.has(q.id), detail: q.act }));
}

async function computeQuests(ps: PlayerState): Promise<ProgressCategory> {
  const quests = await getQuests();
  const completedIds = new Set(ps.raw.questProgress.filter((q) => q.completed).map((q) => q.questId));
  const items: ProgressItem[] = Object.values(quests)
    .filter((q) => !q.requires_previous || completedIds.has(q.requires_previous) || completedIds.has(q.id))
    .map((q) => ({
      id: q.id,
      label: q.name,
      done: completedIds.has(q.id),
      detail: q.description,
    }));
  if (getIncludeElderIsle()) items.push(...elderQuestItems(ps));
  return {
    id: 'quests',
    label: 'Quests',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

const GUILD_CATEGORY_OVERRIDES: Record<string, (typeof CATEGORY_ORDER)[number]> = {
  warriors: 'Combat',
  archers: 'Combat',
  mages: 'Combat',
};

async function computeGuilds(ps: PlayerState): Promise<ProgressCategory> {
  const guildQuests = await getGuildQuests();
  const tierCounts = (ps.raw.flags.guild_daily_tier_counts ?? {}) as Record<string, number>;
  const completedQuestIds = new Set(ps.raw.questProgress.filter((q) => q.completed).map((q) => q.questId));
  const stepQuestByGuildTier = new Map<string, string>();
  for (const gq of Object.values(guildQuests))
    stepQuestByGuildTier.set(`${gq.guild}:${gq.guild_level_required}`, gq.id);

  const levelByGuild = new Map<string, number>();
  const items: ProgressItem[] = ALL_GUILDS.map((guild) => {
    let level = 0;
    for (let tier = 0; tier < GUILD_MAX_LEVEL; tier++) {
      const dailiesOk = (tierCounts[`${guild}:${tier}`] ?? 0) >= GUILD_DAILIES_REQUIRED_PER_TIER[tier];
      const stepQuestId = stepQuestByGuildTier.get(`${guild}:${tier}`);
      const questOk = !!stepQuestId && completedQuestIds.has(stepQuestId);
      if (!dailiesOk || !questOk) break;
      level = tier + 1;
    }
    levelByGuild.set(guild, level);
    const done = level >= GUILD_MAX_LEVEL;
    return {
      id: guild,
      label: guildLabel(guild),
      done,
      detail: `${level}/${GUILD_MAX_LEVEL}${done ? ' (Max)' : ''}`,
      section: GUILD_CATEGORY_OVERRIDES[guild] ?? SKILLS.find((s) => s.id === guild)?.category ?? 'Other',
      icon: skillIcon(guild),
      level,
      current: level,
      cap: GUILD_MAX_LEVEL,
    };
  }).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.section as (typeof CATEGORY_ORDER)[number]) -
      CATEGORY_ORDER.indexOf(b.section as (typeof CATEGORY_ORDER)[number]),
  );

  const points = [...levelByGuild.values()].reduce((sum, level) => sum + level, 0);
  return {
    id: 'guilds',
    label: 'Guilds',
    points,
    max: ALL_GUILDS.length * GUILD_MAX_LEVEL,
    hasDrilldown: true,
    items,
  };
}

const formatOneIn = (chance?: number) => (chance ? `1/${formatNumber(Math.round(1 / chance))}` : '-');

async function computeBosses(ps: PlayerState): Promise<ProgressCategory> {
  const bosses = await getBosses();
  const enemyKills = (ps.raw.flags.enemy_kills ?? {}) as Record<string, number>;
  const seenItems = new Set((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []);
  const ownedPets = new Set(ps.raw.pets.map((p) => p.id));
  const includeElderIsle = getIncludeElderIsle();

  let points = 0;
  let max = 0;
  const items: ProgressItem[] = sortBossesForDisplay(Object.values(bosses))
    .filter((boss) => includeElderIsle || !ELDER_ISLE_BOSS_IDS.has(boss.id))
    .map((boss) => {
      const kills = enemyKills[boss.id] ?? 0;
      const drops = boss.rare_drops ?? [];
      const dropsOwned = drops.filter((d) => seenItems.has(d.item)).length;
      max += 1 + drops.length;
      points += (kills > 0 ? 1 : 0) + dropsOwned;
      return {
        id: boss.id,
        label: boss.display_name,
        done: kills > 0 && dropsOwned >= drops.length,
        detail: `${formatNumber(kills)} kills`,
        section: boss.raid ? 'Raid' : 'Solo',
        kills,
        current: dropsOwned,
        cap: drops.length,
        drops: [
          ...drops.map((d) => ({
            id: d.item,
            label: humanize(d.item),
            chance: formatOneIn(d.chance),
            obtained: seenItems.has(d.item),
          })),
          ...(boss.pet
            ? [
                {
                  id: boss.pet.id,
                  label: boss.pet.display_name,
                  chance: formatOneIn(boss.pet.chance),
                  obtained: ownedPets.has(boss.pet.id),
                },
              ]
            : []),
        ],
      };
    })
    .sort((a, b) => (a.section === b.section ? 0 : a.section === 'Solo' ? -1 : 1));

  return { id: 'bosses', label: 'Bosses', points, max, hasDrilldown: true, items };
}

const ARMOURY_GROUPS: Record<string, string[]> = {
  Weapons: ['attack', 'strength', 'ranged', 'magic'],
  Armour: ['head', 'body', 'legs', 'boots', 'shield'],
  Accessories: ['cape', 'necklace', 'ring', 'signet'],
  Tools: ['pickaxe', 'axe', 'fishing_rod', 'hoe', 'hammer', 'tinderbox', 'frying_pan', 'grappling_hook', 'lockpick'],
};
const ARMOURY_GROUP_ORDER = Object.keys(ARMOURY_GROUPS);

// Weapons are split by combat style; everything else by slot. Unknown slots fall into Tools.
function armouryPlacement(eq: EquipmentEntry): { group: string; sectionKey: string } {
  const sectionKey = eq.slot === 'weapon' ? (eq.combat_style ?? 'weapon') : (eq.slot ?? 'other');
  const group = ARMOURY_GROUP_ORDER.find((g) => ARMOURY_GROUPS[g].includes(sectionKey)) ?? 'Tools';
  return { group, sectionKey };
}
const ARMOURY_STAT_LABELS: [keyof EquipmentEntry, string][] = [
  ['attack_bonus', 'ATK'],
  ['strength_bonus', 'STR'],
  ['defense_bonus', 'DEF'],
  ['ranged_attack_bonus', 'R.ATK'],
  ['ranged_strength_bonus', 'R.STR'],
  ['magic_attack_bonus', 'M.ATK'],
  ['magic_damage_bonus', 'M.DMG'],
];

function armouryStats(eq: EquipmentEntry): string | undefined {
  const parts = ARMOURY_STAT_LABELS.filter(([key]) => Number(eq[key] ?? 0) !== 0).map(
    ([key, label]) => `${label} +${eq[key]}`,
  );
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

async function computeArmoury(ps: PlayerState): Promise<ProgressCategory> {
  const equipment = await getEquipment();
  // The game counts held items too; `seen_item_keys` alone misses some owned ones.
  const seenItems = new Set([
    ...((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []),
    ...Object.entries(ps.raw.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([key]) => key),
    ...Object.values(ps.raw.equipped ?? {}).filter((v): v is string => typeof v === 'string'),
  ]);
  const includeElderIsle = getIncludeElderIsle();
  const items: ProgressItem[] = Object.entries(equipment)
    .filter(([key]) => includeElderIsle || !ELDER_ISLE_IDS.has(key))
    .map(([key, eq]) => {
      const { group, sectionKey } = armouryPlacement(eq);
      return {
        item: {
          id: key,
          label: eq.display_name ?? humanize(key),
          done: seenItems.has(key),
          detail: armouryStats(eq),
          group,
          section: humanize(sectionKey),
        } satisfies ProgressItem,
        order: ARMOURY_GROUP_ORDER.indexOf(group) * 100 + Math.max(0, ARMOURY_GROUPS[group].indexOf(sectionKey)),
      };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
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

  let points = 0;
  let max = 0;

  const mainlandItems: ProgressItem[] = orderedPaths
    .map((skillPaths) => {
      const nonXpCost = skillPaths.paths
        .filter((p) => !p.auto)
        .flatMap((p) => p.nodes)
        .reduce((sum, n) => sum + n.cost, 0);
      const cap = Math.ceil(nonXpCost / 3);
      const owned = Math.min(prestige[skillPaths.skill] ?? 0, cap);
      const level = ps.raw.skillLevels[skillPaths.skill] ?? 1;
      points += owned;
      max += cap;
      return {
        id: skillPaths.skill,
        label: humanize(skillPaths.skill),
        done: owned >= cap && cap > 0,
        detail: `${owned} / ${cap} prestiges · level ${level}`,
        section: SKILLS.find((s) => s.id === skillPaths.skill)?.category ?? 'Other',
        icon: skillIcon(skillPaths.skill),
        realm: 'mainland' as const,
        level,
        current: owned,
        cap,
      };
    })
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.section as (typeof CATEGORY_ORDER)[number]) -
        CATEGORY_ORDER.indexOf(b.section as (typeof CATEGORY_ORDER)[number]),
    );

  const items = [...mainlandItems];
  if (getIncludeElderIsle()) {
    const elderLevels = (ps.raw.flags.elder_skill_levels ?? {}) as Record<string, number>;
    const elderItems: ProgressItem[] = ELDER_SKILL_IDS.map((skillId) => {
      const level = elderLevels[skillId] ?? 1;
      const maxed = level >= 99;
      points += maxed ? 1 : 0;
      max += 1;
      return {
        id: `elder_${skillId}`,
        label: SKILLS.find((s) => s.id === skillId)?.label ?? humanize(skillId),
        done: maxed,
        detail: `Level ${level}`,
        section: SKILLS.find((s) => s.id === skillId)?.category ?? 'Other',
        icon: skillIcon(skillId),
        realm: 'elder' as const,
        level,
        current: level,
        cap: 99,
      };
    }).sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.section as (typeof CATEGORY_ORDER)[number]) -
        CATEGORY_ORDER.indexOf(b.section as (typeof CATEGORY_ORDER)[number]),
    );
    items.push(...elderItems);
  }

  return {
    id: 'levels',
    label: 'Levels & Prestige',
    points,
    max,
    hasDrilldown: true,
    items,
  };
}

async function computePets(ps: PlayerState): Promise<ProgressCategory> {
  const pets = await getPets();
  const owned = new Set(ps.raw.pets.map((p) => p.id));
  const includeElderIsle = getIncludeElderIsle();
  const items: ProgressItem[] = Object.values(pets)
    .filter((pet) => includeElderIsle || !ELDER_ISLE_PET_IDS.has(pet.id))
    .map((pet) => ({
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

// Names and unlock requirements copied from the game's res/values/strings.xml
// (title_<id>_name / title_<id>_requirement), game version 1.15.5.
const TITLE_INFO: Record<(typeof CHARACTER_TITLES)[number], { name: string; requirement: string }> = {
  master_smith: { name: 'Master Smith', requirement: 'Complete all Smithing quests' },
  head_chef: { name: 'Head Chef', requirement: 'Complete all Cooking quests' },
  master_miner: { name: 'Master Miner', requirement: 'Complete all Mining quests' },
  master_angler: { name: 'Master Angler', requirement: 'Complete all Fishing quests' },
  master_woodcutter: { name: 'Master Woodcutter', requirement: 'Complete all Woodcutting quests' },
  master_fletcher: { name: 'Master Fletcher', requirement: 'Complete all Fletching quests' },
  master_artisan: { name: 'Master Artisan', requirement: 'Complete all Crafting quests' },
  runemaster: { name: 'Runemaster', requirement: 'Complete all Runecrafting quests' },
  master_herbalist: { name: 'Master Herbalist', requirement: 'Complete all Herblore quests' },
  master_builder: { name: 'Master Builder', requirement: 'Complete all Construction quests' },
  devout: { name: 'Devout', requirement: 'Complete all Prayer quests' },
  master_thief: { name: 'Master Thief', requirement: 'Complete all Thieving quests' },
  flamekeeper: { name: 'Flamekeeper', requirement: 'Complete all Firemaking quests' },
  slayer: { name: 'Slayer', requirement: 'Complete all Slayer quests' },
  godslayer: { name: 'Godslayer', requirement: 'Defeat every boss at least once' },
  patron_of_the_realm: { name: 'Patron of the Realm', requirement: 'Complete the Grand Monument' },
  warlord: { name: 'Warlord', requirement: 'Reach max level in the Warriors Guild' },
  marksman: { name: 'Marksman', requirement: 'Reach max level in the Archers Guild' },
  archmage: { name: 'Archmage', requirement: 'Reach max level in the Mages Guild' },
  merchant_prince: { name: 'Merchant Prince', requirement: 'Reach max level in the Mercantile Guild' },
  pathfinder: { name: 'Pathfinder', requirement: 'Reach max level in the Agility Guild' },
  master_farmer: { name: 'Master Farmer', requirement: 'Reach max level in the Farming Guild' },
  isle_champion: { name: 'Champion of the Elder Isle', requirement: 'Defeat the Last Elder on Elder Isle' },
};

async function computeTitles(ps: PlayerState): Promise<ProgressCategory> {
  const events = await getSeasonalEvents();
  const unlocked = (ps.raw.flags.unlocked_titles as string[] | undefined) ?? [];
  for (const id of unlocked) {
    if (!id.startsWith('seasonal_')) warnOnDrift('unlocked title', id, CHARACTER_TITLES);
  }
  const unlockedSet = new Set(unlocked);
  const includeElderIsle = getIncludeElderIsle();
  const knownTitles = includeElderIsle ? CHARACTER_TITLES : CHARACTER_TITLES.filter((id) => id !== 'isle_champion');
  const items: ProgressItem[] = knownTitles.map((id) => ({
    id,
    label: TITLE_INFO[id].name,
    done: unlockedSet.has(id),
    detail: TITLE_INFO[id].requirement,
  }));

  // Seasonal-event titles (e.g. "seasonal_sunspire_solstice_2026") are a new one per event,
  // unbounded and not in the hand-copied CHARACTER_TITLES catalogue. Shown for visibility,
  // excluded from both numerator and denominator rather than silently dropped or miscounted.

  const banners = (ps.raw.flags.seasonal_banners_earned as { event_id: string; event_display_name?: string }[]) ?? [];
  const seasonalIds = new Set([
    ...unlocked.filter((id) => id.startsWith('seasonal_')),
    ...Object.keys(events).map((eventId) => `seasonal_${eventId}`),
  ]);
  for (const id of seasonalIds) {
    const eventId = id.slice('seasonal_'.length);
    const eventName =
      banners.find((b) => b.event_id === eventId)?.event_display_name ||
      events[eventId]?.display_name ||
      humanize(eventId);
    items.push({
      id,
      label: `Champion of ${eventName}`,
      done: unlockedSet.has(id),
      detail: `Complete the ${eventName} Seasonal Event`,
    });
  }

  return {
    id: 'titles',
    label: 'Titles',
    points: items.filter((i) => i.done && !i.id.startsWith('seasonal_')).length,
    max: knownTitles.length,
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

const EXPEDITION_NOTE_THRESHOLD = 5;

function computeExpeditions(ps: PlayerState): ProgressCategory {
  const notes = (ps.raw.flags.skilling_dungeon_notes ?? {}) as Record<string, number>;
  const items: ProgressItem[] = EXPEDITION_KEYS.map((key) => {
    const found = notes[key] ?? 0;
    return {
      id: key,
      label: humanize(key),
      done: found >= EXPEDITION_NOTE_THRESHOLD,
      current: Math.min(found, EXPEDITION_NOTE_THRESHOLD),
      cap: EXPEDITION_NOTE_THRESHOLD,
    };
  });
  const includeElderIsle = getIncludeElderIsle();
  if (includeElderIsle) {
    const completed = elderQuestsCompleted(ps);
    const discovered = ELDER_LORE_FRAGMENTS.filter(
      (f) => f.unlockedByQuest === null || completed.has(f.unlockedByQuest),
    ).length;
    items.push({
      id: 'elder_isle_lore',
      label: 'Elder Isle Lore',
      done: discovered >= ELDER_LORE_FRAGMENTS.length,
      current: discovered,
      cap: ELDER_LORE_FRAGMENTS.length,
    });
  }
  return {
    id: 'expeditions',
    label: includeElderIsle ? 'Expeditions & Lore' : 'Expeditions',
    points: items.filter((i) => i.done).length,
    max: items.length,
    hasDrilldown: true,
    items,
  };
}

function enemyDungeonNames(dungeons: Record<string, DungeonEntry>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const dungeon of Object.values(dungeons)) {
    for (const spawn of dungeon.enemy_spawns) {
      const names = map.get(spawn.enemy) ?? [];
      names.push(dungeon.display_name);
      map.set(spawn.enemy, names);
    }
  }
  for (const names of map.values()) names.sort();
  return map;
}

async function computeBestiary(ps: PlayerState): Promise<ProgressCategory> {
  const [enemies, dungeons] = await Promise.all([getEnemies(), getDungeons()]);
  const includeElderIsle = getIncludeElderIsle();
  const dungeonsByEnemy = enemyDungeonNames(
    includeElderIsle
      ? dungeons
      : Object.fromEntries(Object.entries(dungeons).filter(([key]) => !ELDER_ISLE_DUNGEON_IDS.has(key))),
  );
  const kills = (ps.raw.flags.enemy_kills ?? {}) as Record<string, number>;
  const items: ProgressItem[] = Object.values(enemies)
    .filter((e) => includeElderIsle || !ELDER_ISLE_ENEMY_IDS.has(e.name))
    .map((e) => {
      const locations = dungeonsByEnemy.get(e.name);
      if (!locations && import.meta.env.DEV) {
        console.warn(`[game-data-drift] enemy "${e.name}" isn't spawned by any known dungeon.`);
      }
      return {
        id: e.name,
        label: e.display_name,
        done: (kills[e.name] ?? 0) > 0,
        detail: `${formatNumber(kills[e.name] ?? 0)} kills · ${locations?.join(', ') ?? 'Unknown location'}`,
      };
    });
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
  const includeElderIsle = getIncludeElderIsle();
  const isElderIsleId = (k: string) => ELDER_ISLE_IDS.has(k) || ELDER_ISLE_ENEMY_IDS.has(k);

  const universe = new Set<string>(Object.keys(equipment).filter((k) => includeElderIsle || !isElderIsleId(k)));
  for (const e of Object.values(enemies)) {
    if (!includeElderIsle && ELDER_ISLE_ENEMY_IDS.has(e.name)) continue;
    for (const d of e.drop_table ?? []) universe.add(d.item);
    for (const d of e.always_drops ?? []) universe.add(d.item);
  }
  for (const category of Object.values(marketplace)) for (const key of Object.keys(category.items)) universe.add(key);
  for (const resource of [gems, ores, logs, crops, bones, runes])
    for (const key of Object.keys(resource)) if (includeElderIsle || !isElderIsleId(key)) universe.add(key);
  const seen = new Set<string>(
    [...((ps.raw.flags.seen_item_keys as string[] | undefined) ?? []), ...Object.keys(ps.raw.inventory)].filter(
      (k) => includeElderIsle || !isElderIsleId(k),
    ),
  );
  for (const k of seen) universe.add(k);
  const owned = [...universe].filter((k) => seen.has(k));
  return {
    id: 'inventory',
    label: 'Inventory',
    points: owned.length,
    max: universe.size,
    info: 'Built from armoury items, monster drops, and your own save - not an official item list, and not fully accurate.',
    hasDrilldown: true,
    items: [...universe]
      .map((k) => ({ id: k, label: humanize(k), done: seen.has(k) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
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
    const level = levelForXp(heirloomXp[key] ?? 0);
    const maxed = (heirloomXp[key] ?? 0) >= MAX_ITEM_LEVEL_XP;
    points += (owned ? 1 : 0) + (maxed ? 1 : 0);
    items.push({
      id: key,
      label: eq.display_name ?? humanize(key),
      done: owned && maxed,
      detail: owned ? 'Obtained' : 'Not obtained',
      current: owned ? level : 0,
      cap: 99,
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
  { label: 'Others', categoryIds: ['builders-workshop', 'grand-monument', 'seasonal-events'] },
];

export async function computeAllCategories(ps: PlayerState): Promise<ProgressCategory[]> {
  const [quests, pets] = await Promise.all([getQuests(), getPets()]);
  const totalQuests = Object.keys(quests).length;
  // Save rows also include guild quests; the game only counts ones in quests.json.
  const questsCompleted = ps.raw.questProgress.filter((q) => q.completed && q.questId in quests).length;
  const totalPets = Object.keys(pets).length;

  const results = await Promise.all([
    computeQuests(ps),
    computeGuilds(ps),
    computeBosses(ps),
    computeArmoury(ps),
    computeLevelsAndPrestige(ps),
    computePets(ps),
    computeTitles(ps),
    computeSeasonalEvents(ps),
    computeBuilderWorkshop(ps),
    Promise.resolve(computeGrandMonument(ps)),
    Promise.resolve(computeExpeditions(ps)),
    computeAchievements(ps, questsCompleted, totalQuests, totalPets),
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
