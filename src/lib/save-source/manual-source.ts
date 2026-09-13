import { ingest } from './ingest';
import type { IngestOutcome } from './types';

// Universal baseline — unconditional, works in every browser on every platform.
export async function ingestManualUpload(file: File): Promise<IngestOutcome> {
  const text = await file.text();
  return ingest({
    text,
    fileName: file.name,
    fileType: file.type || '(none)',
    source: 'file',
  });
}
