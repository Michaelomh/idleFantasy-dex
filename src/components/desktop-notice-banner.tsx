import { X } from 'lucide-react';
import { Banner } from './banner.tsx';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

const DISMISSED_KEY = 'desktop-notice-dismissed';

export function DesktopNoticeBanner() {
  const [dismissed, setDismissed] = useLocalStorage(DISMISSED_KEY, 'false');

  if (dismissed === 'true') return null;

  return (
    <Banner className="hidden md:flex">
      <span className="body flex-1 text-white">This app is optimized for mobile screens.</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed('true')}
        className="text-white/80 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </Banner>
  );
}
