const ICON_MODULES = import.meta.glob<{ default: string }>('@/assets/skill_*.png', { eager: true });

const SKILL_ICONS: Record<string, string> = {};
for (const [path, mod] of Object.entries(ICON_MODULES)) {
  const id = path.match(/skill_(.+)\.png$/)?.[1];
  if (id) SKILL_ICONS[id] = mod.default;
}

export function skillIcon(id: string): string | undefined {
  return SKILL_ICONS[id];
}
