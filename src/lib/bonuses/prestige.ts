import type { PlayerState } from '@/lib/save-source/types';
import { getPrestigePaths, type PrestigePathNode, type PrestigeSkillPaths } from '@/lib/progress/game-data';

export type ActiveNode = { pathKey: string; node: PrestigePathNode };

export function activeNodesForSkill(playerState: PlayerState, tree: PrestigeSkillPaths | undefined): ActiveNode[] {
  if (!tree) return [];
  const owned = new Set(
    ((playerState.raw.flags.prestige_nodes as Record<string, string[]> | undefined) ?? {})[tree.skill] ?? [],
  );
  const prestige =
    ((playerState.raw.flags.skill_prestige as Record<string, number> | undefined) ?? {})[tree.skill] ?? 0;

  return tree.paths.flatMap((path) => {
    const nodes = path.auto
      ? path.nodes.slice(0, Math.min(prestige, path.nodes.length))
      : path.nodes.filter((n) => owned.has(n.id));
    return nodes.map((node) => ({ pathKey: path.key, node }));
  });
}

export function effectTotal(activeNodes: ActiveNode[], effect: string): number {
  const byPath = new Map<string, number>();
  for (const { pathKey, node } of activeNodes) {
    if (node.effect !== effect || typeof node.value !== 'number') continue;
    byPath.set(pathKey, Math.max(byPath.get(pathKey) ?? 0, node.value));
  }
  return [...byPath.values()].reduce((sum, v) => sum + v, 0);
}

export function allEffectTotals(activeNodes: ActiveNode[]): { effect: string; value: number }[] {
  const effects = new Set(activeNodes.map((n) => n.node.effect).filter((e): e is string => !!e));
  return [...effects].map((effect) => ({ effect, value: effectTotal(activeNodes, effect) })).filter((e) => e.value > 0);
}

export async function loadPrestigeTreeMap(): Promise<Map<string, PrestigeSkillPaths>> {
  const trees = await getPrestigePaths();
  return new Map(trees.map((t) => [t.skill, t]));
}
