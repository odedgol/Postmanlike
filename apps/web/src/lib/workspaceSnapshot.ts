import type {
  Collection,
  Environment,
  Flow,
  Folder,
  GlobalsRow,
  SavedRequest,
} from '@postmanlike/shared';
import { db } from './db';

// Shape the server stores (as opaque JSON). Keep as plain data so we can
// swap storage backends later without breaking existing snapshots.
export interface WorkspaceSnapshotData {
  collections: Collection[];
  folders: Folder[];
  savedRequests: SavedRequest[];
  environments: Environment[];
  globals: GlobalsRow | null;
  flows: Flow[];
}

export function emptySnapshot(): WorkspaceSnapshotData {
  return {
    collections: [],
    folders: [],
    savedRequests: [],
    environments: [],
    globals: null,
    flows: [],
  };
}

// Read everything user-owned from Dexie into a snapshot. Does not touch
// history / cookies / tabs / activeEnv — those are ephemeral per-device.
export async function readLocalSnapshot(): Promise<WorkspaceSnapshotData> {
  const [collections, folders, savedRequests, environments, globals, flows] =
    await Promise.all([
      db.collections.toArray(),
      db.folders.toArray(),
      db.savedRequests.toArray(),
      db.environments.toArray(),
      db.globals.get('default'),
      db.flows.toArray(),
    ]);
  return {
    collections,
    folders,
    savedRequests,
    environments,
    globals: globals ?? null,
    flows,
  };
}

// Replace all user-owned local data with the given snapshot. Wrapped in a
// single Dexie transaction so a concurrent read never sees a half-written
// workspace.
export async function writeLocalSnapshot(snapshot: WorkspaceSnapshotData): Promise<void> {
  const tables = [
    db.collections,
    db.folders,
    db.savedRequests,
    db.environments,
    db.globals,
    db.flows,
  ];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.collections.bulkAdd(snapshot.collections);
    await db.folders.bulkAdd(snapshot.folders);
    await db.savedRequests.bulkAdd(snapshot.savedRequests);
    await db.environments.bulkAdd(snapshot.environments);
    if (snapshot.globals) {
      await db.globals.put(snapshot.globals);
    }
    await db.flows.bulkAdd(snapshot.flows);
  });
}

// Used when signing out: wipe everything that was scoped to the previous user.
export async function clearLocalWorkspace(): Promise<void> {
  await writeLocalSnapshot(emptySnapshot());
  // Also clear the active environment preference so signing out doesn't
  // leave a pointer at a deleted env.
  await db.activeEnv.clear();
}

export function snapshotsEqual(a: WorkspaceSnapshotData, b: WorkspaceSnapshotData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
