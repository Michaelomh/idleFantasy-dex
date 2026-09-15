export type SkillInputConfig = {
  showQty: boolean;
  showCropCount: boolean;
  showAshCatalyst: boolean;
};

const QTY_SKILLS = new Set([
  'smithing',
  'cooking',
  'fletching',
  'crafting',
  'construction',
  'herblore',
  'firemaking',
  'runecrafting',
]);

export function skillInputConfig(skillId: string): SkillInputConfig {
  return {
    showQty: QTY_SKILLS.has(skillId),
    showCropCount: skillId === 'farming',
    showAshCatalyst: skillId === 'runecrafting' || skillId === 'herblore' || skillId === 'farming',
  };
}
