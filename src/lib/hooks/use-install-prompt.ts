import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Resolves to a `prompt` function only when the browser says the app is installable (Chromium) and it isn't installed yet. */
export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  return standalone || !event ? null : () => event.prompt();
}
