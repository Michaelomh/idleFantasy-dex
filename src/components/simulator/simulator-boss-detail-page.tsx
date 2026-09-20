import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { usePlayerState } from '@/lib/player/use-player-state';
import {
  getBosses,
  getEquipment,
  getBlessings,
  getPrestigePaths,
  getMercenaries,
  type BossEntry,
  type EquipmentEntry,
  type BlessingEntry,
  type PrestigeSkillPaths,
  type MercenaryEntry,
} from '@/lib/progress/game-data';
import { getRecipes, type RecipeEntry } from '@/lib/calculator/game-data';
import { activeNodesForSkill } from '@/lib/bonuses/prestige';
import { LoadingScreen } from '@/components/loading-screen';
import { BossStatsPanel } from '@/components/progress/boss-stats-panel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { CombatStyle } from '@/lib/simulator/combat-engine';
import { savedActiveWeaponSlot, savedArrowKey, savedHiredMercenaryIds, savedSpellKey } from '@/lib/simulator/loadout';
import {
  buildBossCombatProfile,
  buildMercCombatant,
  buildPlayerCombatProfile,
  listFoodOptions,
  resolveCombatInputs,
} from '@/lib/simulator/combat-profile';
import { LoadoutSection } from './loadout-section';
import { CombatSummarySection } from './combat-summary-section';
import { SimulationSection } from './simulation-section';
import { MAX_MERCENARIES } from './mercenary-picker';

const PRESTIGE_SKILL_IDS = ['attack', 'strength', 'defense', 'ranged', 'magic', 'hitpoints', 'herblore'];

type PageData = {
  equipment: Record<string, EquipmentEntry>;
  herblore: Record<string, RecipeEntry>;
  cooking: Record<string, RecipeEntry>;
  blessings: BlessingEntry[];
  prestigeTrees: Map<string, PrestigeSkillPaths>;
  mercenaries: MercenaryEntry[];
};

export function SimulatorBossDetailPage() {
  const { bossId } = useParams<{ bossId: string }>();
  const playerState = usePlayerState();
  const [boss, setBoss] = useState<BossEntry | null>(null);
  const [data, setData] = useState<PageData | null>(null);

  const [style, setStyle] = useState<CombatStyle>('attack');
  const [arrowKey, setArrowKey] = useState<string | null>(null);
  const [spellKey, setSpellKey] = useState<string | null>(null);
  const [potionKey, setPotionKey] = useState<string | null>(null);
  const [foodKey, setFoodKey] = useState<string | null>(null);
  const [mercIds, setMercIds] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    void getBosses().then((all) => setBoss((bossId && all[bossId]) || null));
  }, [bossId]);

  useEffect(() => {
    void Promise.all([
      getEquipment(),
      getRecipes('herblore'),
      getRecipes('cooking'),
      getBlessings(),
      getPrestigePaths(),
      getMercenaries(),
    ]).then(([equipment, herblore, cooking, blessings, prestigePaths, mercenaries]) => {
      setData({
        equipment,
        herblore,
        cooking,
        blessings,
        prestigeTrees: new Map(prestigePaths.map((t) => [t.skill, t])),
        mercenaries,
      });
    });
  }, []);

  useEffect(() => {
    if (initialized.current || !playerState || !data) return;
    initialized.current = true;
    setStyle(savedActiveWeaponSlot(playerState));
    setArrowKey(savedArrowKey(playerState));
    setSpellKey(savedSpellKey(playerState));
    const activePotionKey = (playerState.raw.flags.active_potion_key as string | undefined) ?? null;
    setPotionKey(activePotionKey);
    const equippedFoodKeys = Object.keys((playerState.raw.flags.equipped_food as Record<string, number>) ?? {});
    const foodOptions = listFoodOptions(data.cooking);
    const bestFood = foodOptions
      .filter((f) => equippedFoodKeys.includes(f.key))
      .reduce<(typeof foodOptions)[number] | null>(
        (best, f) => (!best || f.healingValue > best.healingValue ? f : best),
        null,
      );
    setFoodKey(bestFood?.key ?? null);
    setMercIds(savedHiredMercenaryIds(playerState).slice(0, MAX_MERCENARIES));
  }, [playerState, data]);

  const activeNodesBySkill = useMemo(() => {
    if (!playerState || !data) return null;
    return new Map(PRESTIGE_SKILL_IDS.map((id) => [id, activeNodesForSkill(playerState, data.prestigeTrees.get(id))]));
  }, [playerState, data]);

  if (!playerState || !boss || !bossId || !data || !activeNodesBySkill) {
    return <LoadingScreen />;
  }

  const resolvedInputs = resolveCombatInputs({
    playerState,
    equipment: data.equipment,
    herblore: data.herblore,
    cooking: data.cooking,
    blessings: data.blessings,
    style,
    potionKey,
    foodKey,
  });
  const { profile: playerProfile } = buildPlayerCombatProfile({
    playerState,
    style,
    arrowKey,
    spellKey,
    activeNodesBySkill,
    ...resolvedInputs,
  });
  const bossProfile = buildBossCombatProfile(boss);
  const mercCombatants = mercIds
    .map((id) => data.mercenaries.find((m) => m.id === id))
    .filter((m): m is MercenaryEntry => !!m)
    .map(buildMercCombatant);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{boss.emoji}</span>
        <span className="h1">{boss.display_name}</span>
        <span className="label rounded-full border border-border px-2 py-0.5 text-text-secondary">
          {boss.raid ? 'Raid' : 'Solo'}
        </span>
      </div>

      <Collapsible defaultOpen={false} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
        <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 text-left">
          <span className="h3">Boss stats</span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <BossStatsPanel boss={boss} playerState={playerState} />
        </CollapsibleContent>
      </Collapsible>

      <LoadoutSection
        playerState={playerState}
        equipment={data.equipment}
        prestigeTrees={data.prestigeTrees}
        style={style}
        onStyleChange={setStyle}
        arrowKey={arrowKey}
        onArrowKeyChange={setArrowKey}
        spellKey={spellKey}
        onSpellKeyChange={setSpellKey}
      />

      <CombatSummarySection
        playerState={playerState}
        equipment={data.equipment}
        herblore={data.herblore}
        cooking={data.cooking}
        blessings={data.blessings}
        activeNodesBySkill={activeNodesBySkill}
        style={style}
        onStyleChange={setStyle}
        arrowKey={arrowKey}
        spellKey={spellKey}
        potionKey={potionKey}
        onPotionKeyChange={setPotionKey}
        foodKey={foodKey}
        onFoodKeyChange={setFoodKey}
        isRaid={!!boss.raid}
        mercenaryRoster={data.mercenaries}
        selectedMercIds={mercIds}
        onSelectedMercIdsChange={setMercIds}
      />

      <SimulationSection player={playerProfile} boss={bossProfile} mercenaries={mercCombatants} />
    </div>
  );
}
