import { ChevronDown, Info, X } from 'lucide-react';
import { InstallSteps } from './install-notice.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useInstallPrompt } from '@/lib/hooks/use-install-prompt';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

const DISMISSED_KEY = 'idlefantasy-dex:install-banner-dismissed';

export function InstallBanner() {
  const install = useInstallPrompt();
  const [dismissed, setDismissed] = useLocalStorage(DISMISSED_KEY, 'false');

  if (!install || dismissed === 'true') return null;

  return (
    <Collapsible className="mx-4 my-2 flex flex-col gap-2 rounded-card border border-notice-border bg-notice-bg p-4 text-notice-text first:mt-4">
      <div className="flex items-center gap-3">
        <CollapsibleTrigger className="group/trigger flex min-w-0 flex-1 items-center gap-3 text-left">
          <Info className="size-4 shrink-0 text-primary" />
          <span className="body min-w-0 flex-1 font-bold text-white">Install IdleFantasy-Dex as an app.</span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-open/trigger:rotate-180" />
        </CollapsibleTrigger>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed('true')}
          className="shrink-0 text-notice-text/80 hover:text-notice-text"
        >
          <X className="size-4" />
        </button>
      </div>
      <CollapsibleContent>
        <InstallSteps />
      </CollapsibleContent>
    </Collapsible>
  );
}
