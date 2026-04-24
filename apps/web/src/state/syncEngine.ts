import { useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { fetchWorkspace, pushWorkspace } from '../lib/workspaceClient';
import {
  clearLocalWorkspace,
  emptySnapshot,
  readLocalSnapshot,
  snapshotsEqual,
  writeLocalSnapshot,
  type WorkspaceSnapshotData,
} from '../lib/workspaceSnapshot';
import { useAuthStore } from './authStore';

const PUSH_DEBOUNCE_MS = 600;

// Tables that participate in sync. Any mutation to one of these triggers a
// debounced push. Tabs/history/activeEnv/cookies are intentionally local.
const SYNCED_TABLES = ['collections', 'folders', 'savedRequests', 'environments', 'globals', 'flows'] as const;

type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'error';

interface SyncState {
  status: SyncStatus;
  lastPushedKey: string | null;
  activeAccountId: string | null;
  pendingTimer: ReturnType<typeof setTimeout> | null;
  // Set by the pull flow so the push initiated as a side-effect of the pull
  // (writeLocalSnapshot fires Dexie change listeners) is suppressed.
  pullInFlight: boolean;
}

function keyFor(data: WorkspaceSnapshotData): string {
  return JSON.stringify(data);
}

export function useWorkspaceSync(): void {
  const accountId = useAuthStore((s) => s.account?.id ?? null);
  const token = useAuthStore((s) => s.token);

  const stateRef = useRef<SyncState>({
    status: 'idle',
    lastPushedKey: null,
    activeAccountId: null,
    pendingTimer: null,
    pullInFlight: false,
  });

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      if (!token || !accountId) return;
      stateRef.current.pullInFlight = true;
      try {
        const snapshot = await fetchWorkspace(token);
        if (cancelled) return;
        if (snapshot) {
          await writeLocalSnapshot(snapshot.data);
          stateRef.current.lastPushedKey = keyFor(snapshot.data);
        } else {
          // First login for this account on any device. Keep whatever is
          // already local (typically empty after a fresh clear), and write
          // it to the server so future pulls work.
          const current = await readLocalSnapshot();
          await pushWorkspace(token, current, 1);
          stateRef.current.lastPushedKey = keyFor(current);
        }
      } catch {
        // Offline / server down → stay with local data, will retry on next change.
      } finally {
        stateRef.current.pullInFlight = false;
      }
    };

    const push = async () => {
      if (!token) return;
      const data = await readLocalSnapshot();
      const key = keyFor(data);
      if (key === stateRef.current.lastPushedKey) return;
      try {
        await pushWorkspace(token, data, Date.now());
        stateRef.current.lastPushedKey = key;
      } catch {
        // Swallow; next local change will retry.
      }
    };

    const schedulePush = () => {
      if (stateRef.current.pullInFlight) return;
      if (!token) return;
      if (stateRef.current.pendingTimer) clearTimeout(stateRef.current.pendingTimer);
      stateRef.current.pendingTimer = setTimeout(() => {
        stateRef.current.pendingTimer = null;
        void push();
      }, PUSH_DEBOUNCE_MS);
    };

    const dexieHook = (_event: unknown) => {
      schedulePush();
    };

    // Account changed → scrub and pull.
    const previous = stateRef.current.activeAccountId;
    stateRef.current.activeAccountId = accountId;

    const run = async () => {
      if (accountId && accountId !== previous) {
        // Another account just logged in. Wipe local data so we don't
        // accidentally push the previous session's stuff up under the new
        // identity.
        await clearLocalWorkspace();
        stateRef.current.lastPushedKey = keyFor(emptySnapshot());
        await pull();
      } else if (!accountId && previous) {
        // Signed out.
        await clearLocalWorkspace();
        stateRef.current.lastPushedKey = null;
      }
    };

    void run();

    // Subscribe to Dexie change events for each synced table.
    for (const name of SYNCED_TABLES) {
      const table = db.table(name);
      table.hook('creating', dexieHook);
      table.hook('updating', dexieHook);
      table.hook('deleting', dexieHook);
    }

    return () => {
      cancelled = true;
      if (stateRef.current.pendingTimer) {
        clearTimeout(stateRef.current.pendingTimer);
        stateRef.current.pendingTimer = null;
      }
      for (const name of SYNCED_TABLES) {
        const table = db.table(name);
        table.hook('creating').unsubscribe(dexieHook);
        table.hook('updating').unsubscribe(dexieHook);
        table.hook('deleting').unsubscribe(dexieHook);
      }
    };
  }, [accountId, token]);
}

// Exported for unit tests; wraps the dependencies so they can be mocked.
export const _sync = {
  readLocalSnapshot,
  writeLocalSnapshot,
  clearLocalWorkspace,
  snapshotsEqual,
};
