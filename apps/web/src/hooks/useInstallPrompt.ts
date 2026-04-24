import { useCallback, useEffect, useState } from 'react';
import { isIosSafariUA, isStandalone } from './isIosSafari';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallPromptState {
  canInstall: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function useInstallPrompt(): InstallPromptState {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setEvent(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return 'unavailable' as const;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    return choice.outcome;
  }, [event]);

  const iosSafari = typeof navigator !== 'undefined' ? isIosSafariUA(navigator.userAgent) : false;

  return {
    canInstall: event != null && !standalone,
    isStandalone: standalone,
    isIosSafari: iosSafari && !standalone,
    install,
  };
}
