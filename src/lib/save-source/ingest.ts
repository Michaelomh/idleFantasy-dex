import { validate } from './validate';
import { slotIdentity, isEmptySlot } from './slot-identity';
import { getCachedSave, putCachedSave } from './db';
import type { Arrival, CachedSave, IngestOutcome, PlayerState, SaveSourceKind, ValidationSuccess } from './types';

export type IngestInput = {
  text: string;
  fileName: string;
  fileType: string;
  source: SaveSourceKind;
};

export async function ingest(input: IngestInput): Promise<IngestOutcome> {
  const arrival: Arrival = {
    source: input.source,
    fileName: input.fileName,
    fileType: input.fileType,
    at: Date.now(),
  };

  const result = validate(input.text, input.fileName);
  if (!result.ok) {
    return { kind: 'rejected', reason: result.reason, arrival };
  }

  const incoming = result.playerState;
  const identity = slotIdentity(incoming.character, input.fileName);
  const cached = await getCachedSave(identity);

  if (!cached) {
    return { kind: 'accepted', identity, cached: await commit(identity, incoming, arrival, result) };
  }

  if (isEmptySlot(incoming) && !isNewerOrEqual(incoming, cached.playerState)) {
    return {
      kind: 'rejected',
      reason:
        'Looks like an empty save slot (no character name, near-zero progress) — refusing to replace the cached save',
      arrival,
    };
  }

  if (!isNewerOrEqual(incoming, cached.playerState)) {
    return {
      kind: 'kept-cached',
      identity,
      reason: 'Incoming export is older than the cached one for this character — kept cached',
      arrival,
    };
  }

  return { kind: 'accepted', identity, cached: await commit(identity, incoming, arrival, result) };
}

export function isNewerOrEqual(incoming: PlayerState, cached: PlayerState): boolean {
  if (cached.exportedAt === null || incoming.exportedAt === null) return true;
  return incoming.exportedAt >= cached.exportedAt;
}

async function commit(
  identity: string,
  playerState: PlayerState,
  arrival: Arrival,
  result: ValidationSuccess,
): Promise<CachedSave> {
  const record: CachedSave = {
    playerState,
    arrival,
    presentKeys: result.presentKeys,
    filenameHint: result.filenameHint,
    ingestedAt: Date.now(),
  };
  await putCachedSave(identity, record);
  return record;
}
