import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  ExternalLink,
  Monitor,
  Sun,
  Moon,
  Code2,
  ScrollText,
  Gamepad2,
  Eye,
  FolderOpen,
  FolderSync,
  RefreshCw,
  Trash2,
  Upload,
  File,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/lib/hooks/use-theme';
import type { Theme } from '@/lib/app/theme';
import { getDefaultFilter, setDefaultFilter, type Filter } from '@/lib/app/preferences';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

const REPO_URL = 'https://github.com/Michaelomh/idleFantasy-dex';
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
const GAME_URL = 'https://github.com/tristinbaker/IdleFantasy';
const SKILL_ICONS_URL = 'https://shikashipx.itch.io/shikashis-fantasy-icons-pack';

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const DEFAULT_FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done' },
  { value: 'missing', label: 'Missing' },
];

function SectionHeading({ children }: { children: ReactNode }) {
  return <span className="label text-text-secondary uppercase">{children}</span>;
}

function AboutLink({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-2 rounded-card border border-border bg-card p-4"
    >
      <span className="body flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-text-secondary" />
        {label}
      </span>
      <span className="data flex items-center gap-1.5 text-text-secondary">
        {value}
        <ExternalLink className="size-3.5 shrink-0" />
      </span>
    </a>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const [defaultFilter, setDefaultFilterState] = useState<Filter>(getDefaultFilter);

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
        setError('Could not reach that folder - check its permission and try again.');
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
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <SectionHeading>Theme</SectionHeading>
        <ToggleGroup
          value={[theme]}
          onValueChange={(values) => values[0] && setTheme(values[0] as Theme)}
          className="w-full gap-1 rounded-full border border-border bg-card p-1"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-11 flex-1 gap-1.5 rounded-full font-bold text-text-secondary data-pressed:bg-primary data-pressed:text-primary-foreground"
            >
              <Icon className="size-4" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading>Preferences</SectionHeading>
        <p className="body text-text-secondary">Default filter for Progress category pages</p>
        <ToggleGroup
          value={[defaultFilter]}
          onValueChange={(values) => {
            const next = values[0] as Filter | undefined;
            if (!next) return;
            setDefaultFilterState(next);
            setDefaultFilter(next);
          }}
          className="w-full gap-1 rounded-full border border-border bg-card p-1"
        >
          {DEFAULT_FILTER_OPTIONS.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-11 flex-1 gap-1.5 rounded-full font-bold text-text-secondary data-pressed:bg-primary data-pressed:text-primary-foreground"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>Save Data</SectionHeading>

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
              <div key={identity} className="flex items-center gap-2 rounded-card border border-border bg-card p-4">
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
                  ? "It's your last character - you'll be sent to reconnect a save."
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

      <div className="flex flex-col gap-2">
        <SectionHeading>About</SectionHeading>
        <AboutLink icon={Gamepad2} label="Based on" value="IdleFantasy" href={GAME_URL} />
        <AboutLink icon={Code2} label="Source Code" value="Open" href={REPO_URL} />
        <AboutLink icon={ScrollText} label="License" value="GPL-3.0" href={LICENSE_URL} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading>Art Credits</SectionHeading>
        <AboutLink icon={Palette} label="Skill icons" value="Shikashi" href={SKILL_ICONS_URL} />
      </div>
    </div>
  );
}
