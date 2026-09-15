export type ModifierRow = { label: string; value: string };

export type BonusItem = {
  key: string;
  label: string;
  /** Expected count per Session. */
  expected: number;
  /** P(≥1) per Session, 0-1. */
  chanceAtLeastOne: number;
  /** Typical per-Session count range — the 5th-95th percentile, not the absolute min/max. */
  rangeMin: number;
  rangeMax: number;
};

export type XpResult = {
  value: number;
  min?: number;
  max?: number;
};

export type GuaranteedItem = {
  key: string;
  label: string;
  qty?: number;
  qtyMin?: number;
  qtyMax?: number;
};

export type SessionResult = {
  xp: XpResult;
  guaranteedItems: GuaranteedItem[];
  bonusItems: BonusItem[];
  /** Base yield + what affects it. Empty when the skill has no guaranteed item (agility, thieving). */
  yieldBreakdown: ModifierRow[];
  xpBreakdown: ModifierRow[];
  sessionMinutes: number;
  sessionBreakdown: ModifierRow[];
  /** Success-chance breakdown (only set for skills with a success roll, e.g. agility). */
  successBreakdown?: ModifierRow[];
  /** Resolved success chance, 0-1 (only set alongside successBreakdown). */
  successRate?: number;
  /** Materials consumed to run this Session, scaled by qty. Only set for recipe-based skills. */
  materialsRequired?: { key: string; label: string; qty: number; owned: number }[];
};

export type CalculatorInputs = {
  targetKey: string;
  qty?: number;
  cropCount?: number;
  ashCatalystKey?: string | null;
  timedBoostsEnabled: boolean;
};

export type TargetOption = {
  key: string;
  label: string;
  levelRequired: number;
  locked: boolean;
};
