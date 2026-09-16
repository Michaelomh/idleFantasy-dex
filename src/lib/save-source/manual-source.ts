import { ingest } from './ingest';
import type { IngestOutcome } from './types';

export async function ingestManualUpload(file: File): Promise<IngestOutcome> {
  const text = await file.text();
  return ingest({
    text,
    fileName: file.name,
    fileType: file.type || '(none)',
    source: 'file',
  });
}
