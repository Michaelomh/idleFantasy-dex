import { validate } from './validate';
import { ingest } from './ingest';
import { getDirectoryHandle, putDirectoryHandle } from './db';
import type { IngestOutcome } from './types';

export const supportsDirectoryHandle =
  typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export type ScanResult =
  | { kind: 'no-folder' }
  | { kind: 'needs-permission'; folderName: string }
  | { kind: 'permission-denied' }
  | { kind: 'scanned'; looked: number; outcomes: IngestOutcome[] };

export async function pickBackupDir(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) throw new Error('showDirectoryPicker not supported');
  const handle = await window.showDirectoryPicker({ id: 'if-backups', mode: 'read' });
  await putDirectoryHandle(handle);
  return handle;
}

export async function scanBackupDir(opts: { userGesture: boolean }): Promise<ScanResult> {
  const handle = await getDirectoryHandle();
  if (!handle) return { kind: 'no-folder' };

  let perm = await handle.queryPermission({ mode: 'read' });
  if (perm !== 'granted') {
    // Re-permission needs a user gesture; a cold visit can only surface the button.
    if (!opts.userGesture) return { kind: 'needs-permission', folderName: handle.name };
    perm = await handle.requestPermission({ mode: 'read' });
    if (perm !== 'granted') return { kind: 'permission-denied' };
  }

  let looked = 0;
  const outcomes: IngestOutcome[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue;
    looked++;
    const file = await entry.getFile();
    if (file.size > MAX_FILE_SIZE) continue;
    const text = await file.text();
    if (!validate(text, file.name).ok) continue;
    outcomes.push(await ingest({ text, fileName: file.name, fileType: file.type || '(none)', source: 'directory' }));
  }

  return { kind: 'scanned', looked, outcomes };
}
