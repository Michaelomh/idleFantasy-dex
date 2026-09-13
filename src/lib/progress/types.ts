export type ProgressItem = {
  id: string;
  label: string;
  done: boolean;
  /** Extra context shown in the drill-down row, e.g. "7 / 10", a source hint, a kill count. */
  detail?: string;
};

export type ProgressCategory = {
  id: string;
  label: string;
  points: number;
  max: number;
  info?: string;
  hasDrilldown: boolean;
  items: ProgressItem[];
};
