import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  getDirectoryHandle,
  ingestManualUpload,
  pickBackupDir,
  scanBackupDir,
  supportsDirectoryHandle,
  type IngestOutcome,
} from '@/lib/save-source';
import { clearExplore, setExplore, setSelectedSlot } from '@/lib/app/boot-state.ts';

export function OnboardingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ identity: string }[] | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);

  useEffect(() => {
    void getDirectoryHandle().then((handle) => setFolderName(handle?.name ?? null));
  }, []);

  function acceptedIdentity(outcome: IngestOutcome): string | null {
    return outcome.kind === 'accepted' || outcome.kind === 'kept-cached' ? outcome.identity : null;
  }

  function enterSlot(identity: string) {
    setSelectedSlot(identity);
    clearExplore();
    navigate('/', { replace: true });
  }

  async function handleFolderPick() {
    setError(null);
    try {
      const handle = await pickBackupDir();
      setFolderName(handle.name);
      const result = await scanBackupDir({ userGesture: true });
      if (result.kind === 'no-folder') {
        setError('No folder selected.');
        return;
      }
      if (result.kind === 'needs-permission' || result.kind === 'permission-denied') {
        setError('Permission to read that folder was denied.');
        return;
      }
      const identities = [...new Set(result.outcomes.map(acceptedIdentity).filter((id): id is string => !!id))];
      if (identities.length === 0) {
        setError('No Idle Fantasy saves found in that folder.');
        return;
      }
      if (identities.length === 1) {
        enterSlot(identities[0]);
        return;
      }
      setPicking(identities.map((identity) => ({ identity })));
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

  function handleExplore() {
    setExplore();
    navigate('/', { replace: true });
  }

  if (picking) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="h1">Pick a character</h1>
        <p className="body text-text-secondary">Found more than one character in that folder.</p>
        {picking.map(({ identity }) => (
          <Button key={identity} variant="secondary" onClick={() => enterSlot(identity)}>
            {identity}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="h1">Welcome</h1>
      <p className="body text-text-secondary">Load your Idle Fantasy save to get started</p>

      {error && <p className="body text-destructive">{error}</p>}
      {folderName && <p className="body text-text-secondary">Backup folder: {folderName}</p>}

      <Button variant="primary" onClick={handleFolderPick} disabled={!supportsDirectoryHandle}>
        <FolderOpen /> {folderName ? 'Change backup folder' : 'Pick backup folder'}
      </Button>
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
        <Upload /> Upload a save file
      </Button>
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleFileChange} />

      <div className="mt-4 flex flex-col gap-3">
        <p className="body text-text-secondary">Or explore without a save:</p>
        <Button variant="ghost" onClick={handleExplore}>
          Explore with a mock account
        </Button>
      </div>
    </div>
  );
}
