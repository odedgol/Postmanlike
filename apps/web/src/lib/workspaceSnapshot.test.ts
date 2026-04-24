import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCollection,
  createFolder,
  createEnvironment,
  updateEnvironment,
  saveRequest,
  setGlobals,
  createFlow,
  db,
} from './db';
import {
  clearLocalWorkspace,
  emptySnapshot,
  readLocalSnapshot,
  snapshotsEqual,
  writeLocalSnapshot,
} from './workspaceSnapshot';
import { newRequestDraft } from './factories';

async function clean() {
  await db.collections.clear();
  await db.folders.clear();
  await db.savedRequests.clear();
  await db.environments.clear();
  await db.globals.clear();
  await db.flows.clear();
  await db.activeEnv.clear();
}

describe('workspaceSnapshot', () => {
  beforeEach(clean);

  it('readLocalSnapshot returns an empty-shaped snapshot when everything is empty', async () => {
    const snap = await readLocalSnapshot();
    expect(snap).toEqual({
      collections: [],
      folders: [],
      savedRequests: [],
      environments: [],
      globals: null,
      flows: [],
    });
  });

  it('readLocalSnapshot captures every synced table', async () => {
    const col = await createCollection('Work');
    const folder = await createFolder(col.id, null, 'API');
    await saveRequest({
      id: 'r1',
      collectionId: col.id,
      folderId: folder.id,
      order: 0,
      draft: newRequestDraft({ name: 'Ping' }),
    });
    const env = await createEnvironment('Dev');
    await updateEnvironment({
      ...env,
      values: [{ key: 'host', value: 'https://api.example', enabled: true }],
    });
    await setGlobals([{ key: 'traceId', value: 'x', enabled: true }]);
    await createFlow('Chain');

    const snap = await readLocalSnapshot();
    expect(snap.collections).toHaveLength(1);
    expect(snap.folders).toHaveLength(1);
    expect(snap.savedRequests).toHaveLength(1);
    expect(snap.environments[0].values[0].key).toBe('host');
    expect(snap.globals?.values[0].key).toBe('traceId');
    expect(snap.flows).toHaveLength(1);
  });

  it('writeLocalSnapshot wipes existing rows and replaces them', async () => {
    await createCollection('Before');
    await writeLocalSnapshot({
      collections: [
        {
          id: 'c1',
          name: 'After',
          description: '',
          order: 0,
        },
      ],
      folders: [],
      savedRequests: [],
      environments: [],
      globals: { key: 'default', values: [] },
      flows: [],
    });
    const snap = await readLocalSnapshot();
    expect(snap.collections).toHaveLength(1);
    expect(snap.collections[0].name).toBe('After');
  });

  it('read then write then read is a fixed point', async () => {
    await createCollection('A');
    const a = await readLocalSnapshot();
    await writeLocalSnapshot(a);
    const b = await readLocalSnapshot();
    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it('clearLocalWorkspace empties every synced table', async () => {
    await createCollection('X');
    await createEnvironment('Y');
    await clearLocalWorkspace();
    expect(await readLocalSnapshot()).toEqual(emptySnapshot());
  });
});
