import { useSyncExternalStore } from 'react';
import { getShowExperimental, setShowExperimental, subscribeShowExperimental } from '@/lib/app/preferences';

export function useShowExperimental() {
  const show = useSyncExternalStore(subscribeShowExperimental, getShowExperimental, () => false);
  return [show, setShowExperimental] as const;
}
