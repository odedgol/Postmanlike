import { useCallback, useEffect, useRef, useState } from 'react';
import { Workbox } from 'workbox-window';

export interface SwUpdateState {
  needsUpdate: boolean;
  reload: () => void;
  registered: boolean;
}

const SW_URL = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';

// Fallback timeout so the user always makes forward progress even when the
// waiting SW doesn't respond to SKIP_WAITING (common in dev).
const RELOAD_FALLBACK_MS = 800;

export function useSwUpdate(): SwUpdateState {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [registered, setRegistered] = useState(false);
  const wbRef = useRef<Workbox | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const wb = new Workbox(SW_URL, import.meta.env.DEV ? { type: 'module' } : undefined);
    wbRef.current = wb;

    const onWaiting = () => setNeedsUpdate(true);
    const onControlling = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
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
    if (reloadingRef.current) return;
    const wb = wbRef.current;
    // Try the clean Workbox dance (messageSkipWaiting → new SW activates →
    // controlling event → our listener reloads). Then, as a belt-and-braces
    // guarantee, fall back to a plain reload after a short delay so the
    // user never sees the button "do nothing".
    try {
      wb?.messageSkipWaiting();
    } catch {
      // no-op; fallback reload below still runs
    }
    window.setTimeout(() => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    }, RELOAD_FALLBACK_MS);
  }, []);

  return { needsUpdate, reload, registered };
}
