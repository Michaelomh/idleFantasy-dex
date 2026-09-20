export type ProgressItem = {
  id: string;
  label: string;
  done: boolean;
  detail?: string;
  section?: string;
  icon?: string;
  locked?: boolean;
  requirements?: string;
  stats?: string;
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
