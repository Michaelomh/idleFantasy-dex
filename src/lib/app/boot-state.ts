import { getCachedSaveIdentities } from '@/lib/save-source';

const SELECTED_SLOT_KEY = 'idlefantasy-dex:character';
const EXPLORE_KEY = 'idlefantasy-dex:explore';

export type BootState = 'none' | 'explore' | 'ok' | 'missing';

export function getSelectedSlot(): string | null {
  return localStorage.getItem(SELECTED_SLOT_KEY);
}

export function setSelectedSlot(identity: string): void {
  localStorage.setItem(SELECTED_SLOT_KEY, identity);
}

export function clearSelectedSlot(): void {
  localStorage.removeItem(SELECTED_SLOT_KEY);
}

export function isExploring(): boolean {
  return localStorage.getItem(EXPLORE_KEY) === 'true';
}

export function setExplore(): void {
  localStorage.setItem(EXPLORE_KEY, 'true');
}

export function clearExplore(): void {
  localStorage.removeItem(EXPLORE_KEY);
}

export async function resolveBootState(): Promise<BootState> {
  // Keys only: this runs on every navigation, and the full saves are large.
  const identities = await getCachedSaveIdentities();
  const selected = getSelectedSlot();

  if (selected) return identities.includes(selected) ? 'ok' : 'missing';
  if (identities.length > 0) return 'missing';
  return isExploring() ? 'explore' : 'none';
}
