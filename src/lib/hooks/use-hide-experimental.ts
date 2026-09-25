import { useSyncExternalStore } from 'react';
import { getHideExperimental, setHideExperimental, subscribeHideExperimental } from '@/lib/app/preferences';

export function useHideExperimental() {
  const hide = useSyncExternalStore(subscribeHideExperimental, getHideExperimental, () => false);
  return [hide, setHideExperimental] as const;
}
