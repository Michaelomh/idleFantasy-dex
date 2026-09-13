import { getAllCachedSaves } from '@/lib/save-source';

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
  return localStorage.getItem(EXPLORE_KEY) === '1';
}

export function setExplore(): void {
  localStorage.setItem(EXPLORE_KEY, '1');
}

export function clearExplore(): void {
  localStorage.removeItem(EXPLORE_KEY);
}

export async function resolveBootState(): Promise<BootState> {
  const slots = await getAllCachedSaves();
  const selected = getSelectedSlot();

  if (selected) return slots[selected] ? 'ok' : 'missing';
  if (Object.keys(slots).length > 0) return 'missing';
  return isExploring() ? 'explore' : 'none';
}
