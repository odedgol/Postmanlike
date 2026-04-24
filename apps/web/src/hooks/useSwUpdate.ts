import { useCallback, useEffect, useRef, useState } from 'react';
import { Workbox } from 'workbox-window';

export interface SwUpdateState {
  needsUpdate: boolean;
  reload: () => void;
  registered: boolean;
}

const SW_URL = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';

export function useSwUpdate(): SwUpdateState {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [registered, setRegistered] = useState(false);
  const wbRef = useRef<Workbox | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const wb = new Workbox(SW_URL, import.meta.env.DEV ? { type: 'module' } : undefined);
    wbRef.current = wb;

    const onWaiting = () => setNeedsUpdate(true);
    const onControlling = () => {
      // After the user accepts the update, the page reloads to pick it up.
      window.location.reload();
    };

    wb.addEventListener('waiting', onWaiting);
    wb.addEventListener('controlling', onControlling);

    wb.register()
      .then(() => setRegistered(true))
      .catch(() => {
        // SW registration can fail in dev or unsupported browsers. We swallow
        // to keep the app functional; install + update features just stay off.
      });

    return () => {
      wb.removeEventListener('waiting', onWaiting);
      wb.removeEventListener('controlling', onControlling);
    };
  }, []);

  const reload = useCallback(() => {
    const wb = wbRef.current;
    if (!wb) return;
    // Tell the waiting SW to take over; the 'controlling' listener above
    // then reloads the page.
    wb.messageSkipWaiting();
  }, []);

  return { needsUpdate, reload, registered };
}
