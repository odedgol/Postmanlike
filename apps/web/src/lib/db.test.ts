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
