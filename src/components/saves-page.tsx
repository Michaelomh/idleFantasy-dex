import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, FolderOpen, FolderSync, RefreshCw, Trash2, Upload, File } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import {
  deleteCachedSave,
  getAllCachedSaves,
  getDirectoryHandle,
  humanAge,
  ingestManualUpload,
  pickBackupDir,
  scanBackupDir,
  staleness,
  supportsDirectoryHandle,
  type CachedSave,
  type IngestOutcome,
} from '@/lib/save-source';
import { clearExplore, getSelectedSlot, setSelectedSlot } from '@/lib/app/boot-state.ts';

export function SavesPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<Record<string, CachedSave>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([refresh(), refreshFolder()]).finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setSlots(await getAllCachedSaves());
  }

  async function refreshFolder() {
    const handle = await getDirectoryHandle();
    setFolderName(handle?.name ?? null);
  }

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function acceptedIdentity(outcome: IngestOutcome): string | null {
    return outcome.kind === 'accepted' || outcome.kind === 'kept-cached' ? outcome.identity : null;
  }

  function handleView(identity: string) {
    setSelectedSlot(identity);
    clearExplore();
    navigate('/');
  }

  async function confirmRemove() {
    const identity = pendingRemove;
    if (!identity) return;
    setPendingRemove(null);

    setBusy(true);
    try {
      await deleteCachedSave(identity);
      const remaining = await getAllCachedSaves();
      const remainingIds = Object.keys(remaining);

      if (remainingIds.length === 0) {
        navigate('/no-save');
        return;
      }

      if (identity === getSelectedSlot()) {
        const newest = remainingIds
          .map((id) => [id, remaining[id]] as const)
          .sort(([, a], [, b]) => (b.playerState.exportedAt ?? 0) - (a.playerState.exportedAt ?? 0))[0][0];
        setSelectedSlot(newest);
        flashToast(`Switched to ${newest}`);
      }

      setSlots(remaining);
    } finally {
      setBusy(false);
    }
  }

  async function handleResync() {
    setError(null);
    setBusy(true);
    try {
      const result = await scanBackupDir({ userGesture: true });
      if (result.kind !== 'scanned') {
        setError('Could not reach that folder — check its permission and try again.');
        return;
      }
      const identity = result.outcomes.map(acceptedIdentity).find((id): id is string => !!id);
      if (!identity) {
        setError('Re-sync found nothing new in that folder.');
        return;
      }
      setSelectedSlot(identity);
      clearExplore();
      await refresh();
      flashToast('Synced.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePickFolder() {
    setError(null);
    setBusy(true);
    try {
      await pickBackupDir();
      await refreshFolder();
    } catch {
      setError('Could not read that folder.');
      setBusy(false);
      return;
    }
    setBusy(false);
    await handleResync();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const outcome = await ingestManualUpload(file);
      const identity = acceptedIdentity(outcome);
      if (!identity) {
        setError(outcome.kind === 'rejected' ? outcome.reason : 'Could not read that file.');
        return;
      }
      setSelectedSlot(identity);
      clearExplore();
      await refresh();
      flashToast('Synced.');
    } finally {
      setBusy(false);
    }
  }

  const identities = Object.keys(slots);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="h1">Saves</h1>

      {toast && <p className="body text-text-secondary">{toast}</p>}
      {error && <p className="body text-destructive">{error}</p>}
      {busy && <p className="body text-text-secondary">Working…</p>}

      {loading ? (
        <p className="body text-text-secondary">Loading…</p>
      ) : identities.length === 0 ? (
        <p className="body text-text-secondary">No characters loaded.</p>
      ) : (
        identities.map((identity) => {
          const { playerState, arrival } = slots[identity];
          const stale = staleness(playerState.exportedAt);
          const viewing = identity === getSelectedSlot();
          return (
            <div key={identity} className="flex items-center gap-2 rounded-md border border-border p-3">
              <div className="flex-1">
                <p className="body">
                  {playerState.character ?? identity}
                  {viewing ? ' (viewing)' : ''}
                </p>
                <p className="label flex items-center gap-1 text-text-secondary">
                  <Tooltip
                    open={openTooltip === identity}
                    onOpenChange={(open) => setOpenTooltip(open ? identity : null)}
                  >
                    <TooltipTrigger onClick={() => setOpenTooltip((cur) => (cur === identity ? null : identity))}>
                      {arrival.source === 'directory' ? (
                        <FolderSync className="size-3.5" />
                      ) : (
                        <File className="size-3.5" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {arrival.source === 'directory' ? 'Synced from folder' : 'Manual upload'}
                    </TooltipContent>
                  </Tooltip>
                  {stale.label} ({humanAge(stale.ageMs)})
                </p>
              </div>
              {!viewing && (
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => handleView(identity)}
                  aria-label="View"
                  disabled={busy}
                >
                  <Eye className="size-4" />
                </Button>
              )}
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => setPendingRemove(identity)}
                aria-label="Remove"
                disabled={busy}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })
      )}

      {folderName && <p className="body text-text-secondary">Backup folder: {folderName}</p>}
      <Button variant="secondary" onClick={handleResync} disabled={busy || !folderName}>
        <RefreshCw /> Re-sync folder
      </Button>
      <Button variant="secondary" onClick={handlePickFolder} disabled={busy || !supportsDirectoryHandle}>
        <FolderOpen /> {folderName ? 'Change backup folder' : 'Set backup folder'}
      </Button>
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
        <Upload /> Upload a save file
      </Button>
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleFileChange} />

      <AlertDialog open={pendingRemove !== null} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingRemove ? (slots[pendingRemove]?.playerState.character ?? pendingRemove) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {Object.keys(slots).length === 1
                ? "It's your last character — you'll be sent to reconnect a save."
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmRemove()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
