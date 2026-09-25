import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, FolderOpen, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  getAllCachedSaves,
  getDirectoryHandle,
  ingestManualUpload,
  pickBackupDir,
  scanBackupDir,
  supportsDirectoryHandle,
  type IngestOutcome,
} from '@/lib/save-source';
import { clearExplore, clearSelectedSlot, getSelectedSlot, setSelectedSlot } from '@/lib/app/boot-state.ts';

export function NoSavePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [otherSlots, setOtherSlots] = useState<string[]>([]);
  const [hasHandle, setHasHandle] = useState(false);

  useEffect(() => {
    const missing = getSelectedSlot();
    void getAllCachedSaves().then((slots) => setOtherSlots(Object.keys(slots).filter((id) => id !== missing)));
    void refreshHandle();
  }, []);

  async function refreshHandle() {
    setHasHandle(!!(await getDirectoryHandle()));
  }

  function enterSlot(identity: string) {
    setSelectedSlot(identity);
    clearExplore();
    navigate('/', { replace: true });
  }

  function acceptedIdentity(outcome: IngestOutcome): string | null {
    return outcome.kind === 'accepted' || outcome.kind === 'kept-cached' ? outcome.identity : null;
  }

  async function handleResync() {
    setError(null);
    const result = await scanBackupDir({ userGesture: true });
    if (result.kind !== 'scanned') {
      setError('Could not reach that folder - check its permission and try again.');
      return;
    }
    const identity = result.outcomes.map(acceptedIdentity).find((id): id is string => !!id);
    if (!identity) {
      setError('Re-sync found nothing new in that folder.');
      return;
    }
    enterSlot(identity);
  }

  function handleStartFresh() {
    clearSelectedSlot();
    navigate('/onboarding');
  }

  async function handlePickFolder() {
    setError(null);
    try {
      await pickBackupDir();
      await refreshHandle();
      await handleResync();
    } catch {
      setError('Could not read that folder.');
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    const outcome = await ingestManualUpload(file);
    const identity = acceptedIdentity(outcome);
    if (!identity) {
      setError(outcome.kind === 'rejected' ? outcome.reason : 'Could not read that file.');
      return;
    }
    enterSlot(identity);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between px-6 pt-4 text-center">
      <div className="flex flex-col items-center gap-2 pt-32">
        <h1 className="h1">No save found</h1>
        <p className="body text-text-secondary">Your cached save data is gone. Reconnect below.</p>
        {error && <p className="body text-destructive">{error}</p>}
      </div>

      <div className="flex w-full flex-col gap-3">
        {otherSlots.map((identity) => (
          <Button key={identity} variant="primary" onClick={() => enterSlot(identity)}>
            Switch to {identity}
          </Button>
        ))}

        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
          <Upload /> Upload a save file
        </Button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleFileChange} />

        {hasHandle && (
          <Button variant="secondary" onClick={handleResync}>
            <RefreshCw /> Re-sync folder
          </Button>
        )}
        <Button variant="secondary" onClick={handlePickFolder} disabled={!supportsDirectoryHandle}>
          <FolderOpen /> {hasHandle ? 'Change Backup Folder' : 'Connect Backup Folder'}
        </Button>

        <Button variant="text" onClick={handleStartFresh}>
          Or start fresh instead <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
