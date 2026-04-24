import { useEffect, useRef } from 'react';
import { loadTabsState, saveTabsState } from '../lib/db';
import { useTabsStore } from './tabsStore';

export function useTabsPersistence() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      const persisted = await loadTabsState();
      if (persisted && persisted.tabs.length > 0) {
        useTabsStore.getState().hydrate(
          persisted.tabs.map((t) => ({
            id: t.id,
            draft: t.draft,
            originId: t.originId,
            originSnapshot: t.originSnapshot,
            status: 'idle' as const,
          })),
          persisted.activeId,
        );
      } else {
        useTabsStore.setState({ hydrated: true });
      }
    })();
  }, []);

  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsub = useTabsStore.subscribe((state) => {
      if (!state.hydrated) return;
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        saveTabsState({
          tabs: state.tabs.map((t) => ({
            id: t.id,
            originId: t.originId,
            originSnapshot: t.originSnapshot,
            draft: t.draft,
          })),
          activeId: state.activeId,
        });
      }, 250);
    });
    return () => {
      if (pending) clearTimeout(pending);
      unsub();
    };
  }, []);
}
