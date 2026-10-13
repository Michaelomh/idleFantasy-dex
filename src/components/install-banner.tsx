import { X } from 'lucide-react';
import { Banner } from './banner.tsx';
import { Button } from './ui/button.tsx';
import { useInstallPrompt } from '@/lib/hooks/use-install-prompt';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

const DISMISSED_KEY = 'idlefantasy-dex:install-banner-dismissed';

export function InstallBanner() {
  const install = useInstallPrompt();
  const [dismissed, setDismissed] = useLocalStorage(DISMISSED_KEY, 'false');

  if (!install || dismissed === 'true') return null;

  return (
    <Banner
      title="Install IdleFantasy-Dex as an app."
      description="Opens in its own window and works offline."
      action={
        <div className="flex items-center gap-2">
          <Button variant="text" className="h-7" onClick={install}>
            Install
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed('true')}
            className="text-notice-text/80 hover:text-notice-text"
          >
            <X className="size-4" />
          </button>
        </div>
      }
    />
  );
}
