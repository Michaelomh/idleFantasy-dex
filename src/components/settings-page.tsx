import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { cn } from 'cn';
import {
  ExternalLink,
  Monitor,
  Sun,
  Moon,
  Code2,
  ScrollText,
  Gamepad2,
  FolderOpen,
  RefreshCw,
  Trash2,
  Upload,
  User,
  Palette,
  ListFilter,
  FlaskConical,
  ListChecks,
  CircleCheck,
  CircleDashed,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/lib/hooks/use-theme';
import { useHideExperimental } from '@/lib/hooks/use-hide-experimental';
import type { Theme } from '@/lib/app/theme';
import { getDefaultFilter, setDefaultFilter, type Filter } from '@/lib/app/preferences';
import { IconToggleGroup } from '@/components/icon-toggle-group.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Separator } from '@/components/ui/separator.tsx';
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
  type StalenessType,
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

const DEFAULT_FILTER_OPTIONS: { value: Filter; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'done', label: 'Done', icon: CircleCheck },
  { value: 'missing', label: 'Missing', icon: CircleDashed },
];

const DEFAULT_FILTER_DESCRIPTIONS: Record<Filter, string> = {
  all: 'Showing all items',
  done: 'Showing only completed items',
  missing: 'Showing only missing items',
};

const STALE_DOT: Record<StalenessType, string> = {
  fresh: 'bg-fresh',
  aging: 'bg-aging',
  stale: 'bg-stale',
  future: 'bg-aging',
  unknown: 'bg-text-secondary',
};

const STALE_TEXT: Record<StalenessType, string> = {
  fresh: 'text-fresh',
  aging: 'text-aging',
  stale: 'text-stale',
  future: 'text-aging',
  unknown: 'text-text-secondary',
};

function SectionHeading({ children }: { children: ReactNode }) {
  return <span className="label text-text-secondary uppercase">{children}</span>;
}

function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" />
        <div className="flex min-w-0 flex-col">
          <span className="body">{title}</span>
          <span className="label whitespace-normal! text-text-secondary">{description}</span>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
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
  const [hideExperimental, setHideExperimental] = useHideExperimental();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<Record<string, CachedSave>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

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

  function confirmSwitch() {
    if (!pendingSwitch) return;
    handleView(pendingSwitch);
    setPendingSwitch(null);
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
      <h1 className="h1">Settings</h1>
      <div className="flex flex-col gap-2">
        <SectionHeading>Preferences</SectionHeading>

        <div className="flex flex-col rounded-card border border-border bg-card">
          <PreferenceRow icon={Palette} title="Theme" description="App color theme">
            <IconToggleGroup value={theme} onValueChange={setTheme} options={THEME_OPTIONS} showLabel="selected" />
          </PreferenceRow>

          <Separator />

          <PreferenceRow
            icon={ListFilter}
            title="Default Filter"
            description={DEFAULT_FILTER_DESCRIPTIONS[defaultFilter]}
          >
            <IconToggleGroup
              value={defaultFilter}
              onValueChange={(next) => {
                setDefaultFilterState(next);
                setDefaultFilter(next);
              }}
              options={DEFAULT_FILTER_OPTIONS}
              showLabel="selected"
            />
          </PreferenceRow>

          <Separator />

          <PreferenceRow
            icon={FlaskConical}
            title="Hide Experimental Features"
            description={
              hideExperimental
                ? 'Hiding active boosts, skill overview, calculator, and simulator'
                : 'Showing active boosts, skill overview, calculator, and simulator'
            }
          >
            <Switch id="hide-experimental" size="lg" checked={hideExperimental} onCheckedChange={setHideExperimental} />
          </PreferenceRow>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>Save Data</SectionHeading>

        {toast && <p className="body text-text-secondary">{toast}</p>}
        {error && <p className="body text-destructive">{error}</p>}
        {busy && <p className="body text-text-secondary">Working…</p>}

        <div className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
          {loading ? (
            <p className="body p-4 text-text-secondary">Loading…</p>
          ) : identities.length === 0 ? (
            <p className="body p-4 text-text-secondary">No characters loaded.</p>
          ) : (
            identities.map((identity, index) => {
              const { playerState } = slots[identity];
              const stale = staleness(playerState.exportedAt);
              const viewing = identity === getSelectedSlot();
              return (
                <Fragment key={identity}>
                  {index > 0 && <Separator />}
                  <div
                    role={viewing ? undefined : 'button'}
                    tabIndex={viewing ? undefined : 0}
                    onClick={() => !viewing && setPendingSwitch(identity)}
                    onKeyDown={(e) => {
                      if (!viewing && (e.key === 'Enter' || e.key === ' ')) setPendingSwitch(identity);
                    }}
                    className={cn(
                      'flex items-center gap-2 p-4',
                      !viewing && 'cursor-pointer',
                      viewing && 'bg-primary/5',
                    )}
                  >
                    <div className="flex-1">
                      <p className="body flex items-center gap-2 font-bold">
                        {playerState.character ?? identity}
                        {viewing && <span className="label text-primary">CURRENT</span>}
                      </p>
                      <p className="label flex items-center gap-1.5 text-text-secondary">
                        <span className={cn('size-1.5 shrink-0 rounded-full', STALE_DOT[stale.type])} />
                        <span className={STALE_TEXT[stale.type]}>{stale.label}</span> · Updated {humanAge(stale.ageMs)}{' '}
                        ago
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingRemove(identity);
                      }}
                      aria-label="Remove"
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Fragment>
              );
            })
          )}

          <Separator />

          <div className="flex flex-col items-center gap-2 p-4">
            {folderName && <p className="body text-text-secondary">Backup folder: {folderName}</p>}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              <Upload /> Upload a save file
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handlePickFolder}
              disabled={busy || !supportsDirectoryHandle}
            >
              <FolderOpen /> {folderName ? 'Change backup folder' : 'Connect backup folder'}
            </Button>
            {folderName && (
              <Button variant="secondary" className="w-full" onClick={handleResync} disabled={busy}>
                <RefreshCw /> Re-sync folder
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleFileChange} />
          </div>
        </div>

        <Sheet open={pendingRemove !== null} onOpenChange={(open) => !open && setPendingRemove(null)}>
          <SheetContent side="bottom">
            <SheetHeader className="flex-row items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-card border border-destructive/40 bg-destructive/10 text-destructive">
                <Trash2 />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <SheetTitle>
                  Remove {pendingRemove ? (slots[pendingRemove]?.playerState.character ?? pendingRemove) : ''}?
                </SheetTitle>
                <SheetDescription>
                  {Object.keys(slots).length === 1
                    ? "It's your last character - you'll be sent to reconnect a save."
                    : "This can't be undone."}
                </SheetDescription>
              </div>
            </SheetHeader>
            <SheetFooter className="flex-row">
              <Button variant="secondary" className="flex-1" onClick={() => setPendingRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => void confirmRemove()}>
                Remove
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet open={pendingSwitch !== null} onOpenChange={(open) => !open && setPendingSwitch(null)}>
          <SheetContent side="bottom">
            <SheetHeader className="flex-row items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-card border border-primary/40 bg-primary/10 text-primary">
                <User />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <SheetTitle>
                  Switch to {pendingSwitch ? (slots[pendingSwitch]?.playerState.character ?? pendingSwitch) : ''}?
                </SheetTitle>
                <SheetDescription>You'll start viewing this character's data instead.</SheetDescription>
              </div>
            </SheetHeader>
            <SheetFooter className="flex-row">
              <Button variant="secondary" className="flex-1" onClick={() => setPendingSwitch(null)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={confirmSwitch}>
                Switch
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
