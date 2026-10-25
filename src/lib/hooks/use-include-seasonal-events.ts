import { useSyncExternalStore } from 'react';
import {
  getIncludeSeasonalEvents,
  setIncludeSeasonalEvents,
  subscribeIncludeSeasonalEvents,
} from '@/lib/app/preferences';

export function useIncludeSeasonalEvents() {
  const include = useSyncExternalStore(subscribeIncludeSeasonalEvents, getIncludeSeasonalEvents, () => true);
  return [include, setIncludeSeasonalEvents] as const;
}
