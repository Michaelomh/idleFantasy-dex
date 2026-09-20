export type ModifierRow = {
  label: string;
  value: string;
  heading?: boolean;
  warning?: string;
  info?: string;
  disabled?: boolean;
};

export type BonusItem = {
  key: string;
  label: string;
  expected: number;
  chanceAtLeastOne: number;
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
  yieldBreakdown: ModifierRow[];
  xpBreakdown: ModifierRow[];
  sessionMinutes: number;
  sessionBreakdown: ModifierRow[];
  successBreakdown?: ModifierRow[];
  successRate?: number;
  materialsRequired?: { key: string; label: string; qty: number }[];
};

export type CalculatorInputs = {
  targetKey: string;
  qty?: number;
  cropCount?: number;
  ashCatalystKey?: string | null;
  timedBoostsEnabled: boolean;
  cropRotated?: boolean;
};

export type TargetOption = {
  key: string;
  label: string;
  levelRequired: number;
  locked: boolean;
  filterTags?: Record<string, string>;
};
