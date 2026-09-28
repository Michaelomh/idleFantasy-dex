export type ProgressItem = {
  id: string;
  label: string;
  done: boolean;
  detail?: string;
  section?: string;
  icon?: string;
  realm?: 'mainland' | 'elder';
  level?: number;
  current?: number;
  cap?: number;
  kills?: number;
};

export type ProgressCategory = {
  id: string;
  label: string;
  points: number;
  max: number;
  info?: string;
  hasDrilldown: boolean;
  items: ProgressItem[];
  progressLabel?: string;
};
