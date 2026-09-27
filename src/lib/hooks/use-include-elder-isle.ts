import { useSyncExternalStore } from 'react';
import { getIncludeElderIsle, setIncludeElderIsle, subscribeIncludeElderIsle } from '@/lib/app/preferences';

export function useIncludeElderIsle() {
  const include = useSyncExternalStore(subscribeIncludeElderIsle, getIncludeElderIsle, () => false);
  return [include, setIncludeElderIsle] as const;
}
