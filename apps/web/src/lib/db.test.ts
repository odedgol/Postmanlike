import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  recordHistory,
  listHistory,
  clearHistory,
  createCollection,
  listCollections,
  renameCollection,
  deleteCollection,
  createFolder,
  listFolders,
  deleteFolder,
  saveRequest,
  listSavedRequests,
  getSavedRequest,
  saveTabsState,
  loadTabsState,
} from './db';
import { newRequestDraft } from './factories';

describe('history db', () => {
  beforeEach(async () => {
    await db.history.clear();
  });

  it('records and lists history newest-first', async () => {
    await recordHistory({
      id: 'a',
      timestamp: 1,
      requestSnapshot: newRequestDraft(),
      status: 200,
      timingMs: 10,
      sizeBytes: 5,
    });
    await recordHistory({
      id: 'b',
      timestamp: 2,
      requestSnapshot: newRequestDraft(),
      status: 404,
      timingMs: 20,
      sizeBytes: 10,
    });
    const rows = await listHistory();
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('trims history beyond the cap', async () => {
    for (let i = 0; i < 210; i++) {
      await recordHistory({
        id: `h${i}`,
        timestamp: i,
        requestSnapshot: newRequestDraft(),
        status: 200,
        timingMs: 1,
        sizeBytes: 1,
      });
    }
    const rows = await listHistory();
    expect(rows.length).toBe(200);
    expect(rows[rows.length - 1].timestamp).toBe(10);
  });

  it('clearHistory wipes the table', async () => {
    await recordHistory({
      id: 'x',
      timestamp: 1,
      requestSnapshot: newRequestDraft(),
      status: 200,
      timingMs: 1,
      sizeBytes: 1,
    });
    await clearHistory();
    expect((await listHistory()).length).toBe(0);
  });
});

describe('collections + folders + saved requests', () => {
  beforeEach(async () => {
    await db.savedRequests.clear();
    await db.folders.clear();
    await db.collections.clear();
  });

  it('creates collections with sequential order', async () => {
    const a = await createCollection('A');
    const b = await createCollection('B');
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    const list = await listCollections();
    expect(list.map((c) => c.name)).toEqual(['A', 'B']);
  });

  it('renames and deletes a collection; cascades to folders and requests', async () => {
    const col = await createCollection('X');
    const f = await createFolder(col.id, null, 'F');
    await saveRequest({
      id: 'r1',
      collectionId: col.id,
      folderId: f.id,
      order: 0,
      draft: newRequestDraft(),
    });
    await renameCollection(col.id, 'Renamed');
    expect((await listCollections())[0].name).toBe('Renamed');

    await deleteCollection(col.id);
    expect((await listCollections()).length).toBe(0);
    expect((await listFolders(col.id)).length).toBe(0);
    expect((await listSavedRequests(col.id)).length).toBe(0);
  });

  it('deleting a folder removes its descendants and their requests', async () => {
    const col = await createCollection('C');
    const outer = await createFolder(col.id, null, 'outer');
    const inner = await createFolder(col.id, outer.id, 'inner');
    await saveRequest({
      id: 'ri',
      collectionId: col.id,
      folderId: inner.id,
      order: 0,
      draft: newRequestDraft(),
    });
    await saveRequest({
      id: 'ro',
      collectionId: col.id,
      folderId: null,
      order: 0,
      draft: newRequestDraft(),
    });
    await deleteFolder(outer.id);
    const folders = await listFolders(col.id);
    expect(folders.map((f) => f.id)).toEqual([]);
    const requests = await listSavedRequests(col.id);
    expect(requests.map((r) => r.id)).toEqual(['ro']);
  });

  it('saveRequest upserts and getSavedRequest returns a single row', async () => {
    const col = await createCollection('C');
    await saveRequest({
      id: 'r',
      collectionId: col.id,
      folderId: null,
      order: 0,
      draft: newRequestDraft({ name: 'Original' }),
    });
    await saveRequest({
      id: 'r',
      collectionId: col.id,
      folderId: null,
      order: 0,
      draft: newRequestDraft({ name: 'Updated' }),
    });
    const fetched = await getSavedRequest('r');
    expect(fetched?.draft.name).toBe('Updated');
    const list = await listSavedRequests(col.id);
    expect(list.length).toBe(1);
  });
});

describe('environments + globals + active env', () => {
  beforeEach(async () => {
    await db.environments.clear();
    await db.globals.clear();
    await db.activeEnv.clear();
  });

  it('creates environments with monotonically increasing order', async () => {
    const { createEnvironment, listEnvironments } = await import('./db');
    const a = await createEnvironment('Dev');
    const b = await createEnvironment('Staging');
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    const list = await listEnvironments();
    expect(list.map((e) => e.name)).toEqual(['Dev', 'Staging']);
  });

  it('updateEnvironment persists variable rows', async () => {
    const { createEnvironment, updateEnvironment, listEnvironments } = await import('./db');
    const env = await createEnvironment('Dev');
    await updateEnvironment({
      ...env,
      values: [{ key: 'host', value: 'https://api.example', enabled: true }],
    });
    const fresh = (await listEnvironments())[0];
    expect(fresh.values).toEqual([
      { key: 'host', value: 'https://api.example', enabled: true },
    ]);
  });

  it('deleting the active env clears activeEnvId', async () => {
    const {
      createEnvironment,
      setActiveEnvId,
      deleteEnvironment,
      getActiveEnvId,
    } = await import('./db');
    const env = await createEnvironment('Dev');
    await setActiveEnvId(env.id);
    expect(await getActiveEnvId()).toBe(env.id);
    await deleteEnvironment(env.id);
    expect(await getActiveEnvId()).toBeNull();
  });

  it('globals get/set round-trips', async () => {
    const { getGlobals, setGlobals } = await import('./db');
    expect((await getGlobals()).values).toEqual([]);
    await setGlobals([{ key: 'company', value: 'Acme', enabled: true }]);
    expect((await getGlobals()).values[0].value).toBe('Acme');
  });
});

describe('buildScopes', () => {
  beforeEach(async () => {
    await db.environments.clear();
    await db.globals.clear();
    await db.activeEnv.clear();
  });

  it('merges active env + globals, filtering disabled and empty keys', async () => {
    const {
      createEnvironment,
      updateEnvironment,
      setActiveEnvId,
      setGlobals,
    } = await import('./db');
    const { buildScopes } = await import('./scopes');
    const env = await createEnvironment('Dev');
    await updateEnvironment({
      ...env,
      values: [
        { key: 'host', value: 'https://api.example', enabled: true },
        { key: 'ignored', value: 'x', enabled: false },
        { key: '', value: 'no-key', enabled: true },
      ],
    });
    await setActiveEnvId(env.id);
    await setGlobals([{ key: 'company', value: 'Acme', enabled: true }]);

    const scopes = await buildScopes();
    expect(scopes.environment).toEqual({ host: 'https://api.example' });
    expect(scopes.global).toEqual({ company: 'Acme' });
  });

  it('environment scope is empty when no active env is set', async () => {
    const { setGlobals } = await import('./db');
    const { buildScopes } = await import('./scopes');
    await setGlobals([{ key: 'g', value: '1', enabled: true }]);
    const scopes = await buildScopes();
    expect(scopes.environment).toEqual({});
    expect(scopes.global).toEqual({ g: '1' });
  });
});

describe('tabs state persistence', () => {
  beforeEach(async () => {
    await db.tabsState.clear();
  });

  it('persists and reloads the tabs snapshot', async () => {
    await saveTabsState({
      tabs: [
        {
          id: 't1',
          originId: null,
          originSnapshot: null,
          draft: newRequestDraft({ url: 'https://x.test' }),
        },
      ],
      activeId: 't1',
    });
    const loaded = await loadTabsState();
    expect(loaded?.tabs.length).toBe(1);
    expect(loaded?.tabs[0].draft.url).toBe('https://x.test');
    expect(loaded?.activeId).toBe('t1');
  });
});
