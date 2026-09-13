import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CachedSave } from './types';

interface SaveSourceSchema extends DBSchema {
  playerState: { key: string; value: CachedSave };
  saveSource: { key: 'directoryHandle'; value: FileSystemDirectoryHandle };
}

const DB_NAME = 'idlefantasy-dex';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<SaveSourceSchema>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SaveSourceSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('playerState')) db.createObjectStore('playerState');
        if (!db.objectStoreNames.contains('saveSource')) db.createObjectStore('saveSource');
        if (oldVersion < 2) {
          void transaction.objectStore('playerState').clear();
          void transaction.objectStore('saveSource').delete('meta' as unknown as 'directoryHandle');
        }
      },
    });
  }
  return dbPromise;
}

export async function getCachedSave(identity: string): Promise<CachedSave | undefined> {
  return (await getDb()).get('playerState', identity);
}

export async function getAllCachedSaves(): Promise<Record<string, CachedSave>> {
  const db = await getDb();
  const keys = await db.getAllKeys('playerState');
  const values = await db.getAll('playerState');
  return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
}

export async function putCachedSave(identity: string, value: CachedSave): Promise<void> {
  await (await getDb()).put('playerState', value, identity);
}

export async function deleteCachedSave(identity: string): Promise<void> {
  await (await getDb()).delete('playerState', identity);
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  return (await getDb()).get('saveSource', 'directoryHandle');
}

export async function putDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await (await getDb()).put('saveSource', handle, 'directoryHandle');
}

export async function clearDirectoryHandle(): Promise<void> {
  await (await getDb()).delete('saveSource', 'directoryHandle');
}
