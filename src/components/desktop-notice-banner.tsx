import { X } from 'lucide-react';
import { Banner } from './banner.tsx';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

const DISMISSED_KEY = 'desktop-notice-dismissed';

export function DesktopNoticeBanner() {
  const [dismissed, setDismissed] = useLocalStorage(DISMISSED_KEY, 'false');

  if (dismissed === 'true') return null;

  return (
    <Banner
      className="hidden md:flex"
      title="This app works best on mobile screens."
      action={
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed('true')}
          className="text-notice-text/80 hover:text-notice-text"
        >
          <X className="size-4" />
        </button>
      }
    />
  );
}
