import Dexie, { type Table } from 'dexie';
import type {
  ActiveEnvRow,
  Collection,
  Environment,
  Flow,
  Folder,
  GlobalsRow,
  HistoryEntry,
  PersistedTabsState,
  SavedRequest,
} from '@postmanlike/shared';

export class PostmanlikeDB extends Dexie {
  history!: Table<HistoryEntry, string>;
  collections!: Table<Collection, string>;
  folders!: Table<Folder, string>;
  savedRequests!: Table<SavedRequest, string>;
  tabsState!: Table<PersistedTabsState, 'default'>;
  environments!: Table<Environment, string>;
  globals!: Table<GlobalsRow, 'default'>;
  activeEnv!: Table<ActiveEnvRow, 'default'>;
  flows!: Table<Flow, string>;

  constructor() {
    super('postmanlike');
    this.version(1).stores({
      history: 'id, timestamp',
    });
    this.version(2).stores({
      history: 'id, timestamp',
      collections: 'id, order',
      folders: 'id, collectionId, parentId, order',
      savedRequests: 'id, collectionId, folderId, order',
      tabsState: 'key',
    });
    this.version(3).stores({
      history: 'id, timestamp',
      collections: 'id, order',
      folders: 'id, collectionId, parentId, order',
      savedRequests: 'id, collectionId, folderId, order',
      tabsState: 'key',
      environments: 'id, order',
      globals: 'key',
      activeEnv: 'key',
    });
    this.version(4).stores({
      history: 'id, timestamp',
      collections: 'id, order',
      folders: 'id, collectionId, parentId, order',
      savedRequests: 'id, collectionId, folderId, order',
      tabsState: 'key',
      environments: 'id, order',
      globals: 'key',
      activeEnv: 'key',
      flows: 'id, order',
    });
  }
}

export const db = new PostmanlikeDB();

const HISTORY_CAP = 200;

export async function recordHistory(entry: HistoryEntry) {
  await db.history.put(entry);
  const count = await db.history.count();
  if (count > HISTORY_CAP) {
    const excess = count - HISTORY_CAP;
    const oldest = await db.history.orderBy('timestamp').limit(excess).toArray();
    await db.history.bulkDelete(oldest.map((e) => e.id));
  }
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return db.history.orderBy('timestamp').reverse().toArray();
}

export async function clearHistory() {
  await db.history.clear();
}

// Collections

export async function listCollections(): Promise<Collection[]> {
  return db.collections.orderBy('order').toArray();
}

export async function createCollection(name: string): Promise<Collection> {
  const existing = await db.collections.count();
  const entry: Collection = {
    id: `col-${crypto.randomUUID()}`,
    name: name.trim() || 'New Collection',
    description: '',
    order: existing,
  };
  await db.collections.add(entry);
  return entry;
}

export async function renameCollection(id: string, name: string) {
  await db.collections.update(id, { name: name.trim() || 'Untitled' });
}

export async function deleteCollection(id: string) {
  await db.transaction('rw', db.collections, db.folders, db.savedRequests, async () => {
    await db.collections.delete(id);
    const folders = await db.folders.where('collectionId').equals(id).toArray();
    await db.folders.bulkDelete(folders.map((f) => f.id));
    const requests = await db.savedRequests.where('collectionId').equals(id).toArray();
    await db.savedRequests.bulkDelete(requests.map((r) => r.id));
  });
}

// Folders

export async function listFolders(collectionId: string): Promise<Folder[]> {
  return db.folders.where('collectionId').equals(collectionId).sortBy('order');
}

export async function createFolder(
  collectionId: string,
  parentId: string | null,
  name: string,
): Promise<Folder> {
  const siblings = await db.folders
    .where('collectionId')
    .equals(collectionId)
    .and((f) => f.parentId === parentId)
    .count();
  const entry: Folder = {
    id: `fol-${crypto.randomUUID()}`,
    collectionId,
    parentId,
    name: name.trim() || 'New Folder',
    order: siblings,
  };
  await db.folders.add(entry);
  return entry;
}

export async function renameFolder(id: string, name: string) {
  await db.folders.update(id, { name: name.trim() || 'Untitled' });
}

export async function deleteFolder(id: string) {
  await db.transaction('rw', db.folders, db.savedRequests, async () => {
    const descendants = await collectFolderDescendants(id);
    const all = [id, ...descendants];
    await db.folders.bulkDelete(all);
    const requests = await db.savedRequests.where('folderId').anyOf(all).toArray();
    await db.savedRequests.bulkDelete(requests.map((r) => r.id));
  });
}

async function collectFolderDescendants(rootId: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = await db.folders.where('parentId').equals(current).toArray();
    for (const child of children) {
      out.push(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

// Saved requests

export async function listSavedRequests(collectionId: string): Promise<SavedRequest[]> {
  return db.savedRequests.where('collectionId').equals(collectionId).sortBy('order');
}

export async function saveRequest(entry: SavedRequest) {
  await db.savedRequests.put(entry);
}

export async function deleteSavedRequest(id: string) {
  await db.savedRequests.delete(id);
}

export async function getSavedRequest(id: string): Promise<SavedRequest | undefined> {
  return db.savedRequests.get(id);
}

// Tabs persistence

export async function loadTabsState(): Promise<PersistedTabsState | undefined> {
  return db.tabsState.get('default');
}

export async function saveTabsState(state: Omit<PersistedTabsState, 'key'>) {
  await db.tabsState.put({ ...state, key: 'default' });
}

// Environments + globals + active env

export async function listEnvironments(): Promise<Environment[]> {
  return db.environments.orderBy('order').toArray();
}

export async function createEnvironment(name: string): Promise<Environment> {
  const existing = await db.environments.count();
  const entry: Environment = {
    id: `env-${crypto.randomUUID()}`,
    name: name.trim() || 'New Environment',
    order: existing,
    values: [],
  };
  await db.environments.add(entry);
  return entry;
}

export async function updateEnvironment(env: Environment) {
  await db.environments.put(env);
}

export async function deleteEnvironment(id: string) {
  await db.environments.delete(id);
  const active = await db.activeEnv.get('default');
  if (active?.environmentId === id) {
    await db.activeEnv.put({ key: 'default', environmentId: null });
  }
}

export async function getGlobals(): Promise<GlobalsRow> {
  const row = await db.globals.get('default');
  return row ?? { key: 'default', values: [] };
}

export async function setGlobals(values: GlobalsRow['values']) {
  await db.globals.put({ key: 'default', values });
}

export async function getActiveEnvId(): Promise<string | null> {
  const row = await db.activeEnv.get('default');
  return row?.environmentId ?? null;
}

export async function setActiveEnvId(environmentId: string | null) {
  await db.activeEnv.put({ key: 'default', environmentId });
}

// Flows

export async function listFlows(): Promise<Flow[]> {
  return db.flows.orderBy('order').toArray();
}

export async function createFlow(name: string): Promise<Flow> {
  const existing = await db.flows.count();
  const flow: Flow = {
    id: `flow-${crypto.randomUUID()}`,
    name: name.trim() || 'New Flow',
    order: existing,
    steps: [],
  };
  await db.flows.add(flow);
  return flow;
}

export async function updateFlow(flow: Flow) {
  await db.flows.put(flow);
}

export async function deleteFlow(id: string) {
  await db.flows.delete(id);
}
