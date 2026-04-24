import type { Collection, Folder, KeyValue, RequestDraft, SavedRequest } from './types.js';

// ---------- Import ----------

interface PmV21KV {
  key: string;
  value?: string;
  disabled?: boolean;
}

interface PmV21RawBody {
  mode: 'raw' | 'urlencoded' | 'formdata';
  raw?: string;
  urlencoded?: PmV21KV[];
  options?: { raw?: { language?: string } };
}

interface PmV21Request {
  method?: string;
  url?: string | { raw?: string; query?: PmV21KV[] };
  header?: PmV21KV[];
  body?: PmV21RawBody;
}

interface PmV21Item {
  name?: string;
  item?: PmV21Item[];
  request?: PmV21Request;
  event?: Array<{
    listen: 'test' | 'prerequest';
    script?: { exec?: string[] | string };
  }>;
}

interface PmV21Collection {
  info?: { name?: string; description?: string; _postman_id?: string; schema?: string };
  item?: PmV21Item[];
}

function kvMap(rows: PmV21KV[] | undefined): KeyValue[] {
  if (!rows) return [];
  return rows
    .filter((r) => !!r.key)
    .map((r) => ({ key: r.key, value: r.value ?? '', enabled: !r.disabled }));
}

function urlRaw(url: PmV21Request['url']): string {
  if (!url) return '';
  if (typeof url === 'string') return url;
  return url.raw ?? '';
}

function eventScript(item: PmV21Item, listen: 'test' | 'prerequest'): string | undefined {
  const evt = item.event?.find((e) => e.listen === listen);
  if (!evt?.script?.exec) return undefined;
  return Array.isArray(evt.script.exec) ? evt.script.exec.join('\n') : evt.script.exec;
}

function itemToDraft(item: PmV21Item): RequestDraft {
  const req = item.request ?? {};
  const rawUrl = urlRaw(req.url);
  const body = req.body;
  let bodyMode: RequestDraft['bodyMode'] = 'none';
  let bodyRaw = '';
  let bodyForm: KeyValue[] = [];
  if (body) {
    if (body.mode === 'raw') {
      const lang = body.options?.raw?.language;
      bodyMode = lang === 'json' ? 'raw-json' : 'raw-text';
      bodyRaw = body.raw ?? '';
    } else if (body.mode === 'urlencoded') {
      bodyMode = 'form-url';
      bodyForm = kvMap(body.urlencoded);
    }
  }
  return {
    id: `imp-${Math.random().toString(36).slice(2, 10)}`,
    name: item.name ?? 'Imported Request',
    method: (req.method ?? 'GET').toUpperCase(),
    url: rawUrl,
    params: [],
    headers: kvMap(req.header),
    bodyMode,
    bodyRaw,
    bodyForm,
    preScript: eventScript(item, 'prerequest'),
    testScript: eventScript(item, 'test'),
  };
}

export interface ImportedCollection {
  collection: Omit<Collection, 'id' | 'order'> & { id?: string; order?: number };
  folders: Array<Omit<Folder, 'id' | 'order'> & { id?: string; order?: number; _parentKey: string | null; _key: string }>;
  requests: Array<Omit<SavedRequest, 'id' | 'order'> & { id?: string; order?: number; _folderKey: string | null }>;
}

export function parsePostmanCollection(json: unknown): ImportedCollection {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid Postman collection: not an object');
  }
  const c = json as PmV21Collection;
  if (!c.info?.name) throw new Error('Invalid Postman collection: missing info.name');

  const folders: ImportedCollection['folders'] = [];
  const requests: ImportedCollection['requests'] = [];

  const walk = (items: PmV21Item[] | undefined, parentKey: string | null) => {
    if (!items) return;
    let order = 0;
    for (const item of items) {
      if (item.request) {
        requests.push({
          collectionId: '',
          folderId: null,
          _folderKey: parentKey,
          draft: itemToDraft(item),
          order: order++,
        });
      } else if (item.item) {
        const key = `${parentKey ?? 'root'}/${item.name ?? 'folder'}-${folders.length}`;
        folders.push({
          collectionId: '',
          parentId: null,
          _parentKey: parentKey,
          _key: key,
          name: item.name ?? 'Folder',
          order: order++,
        });
        walk(item.item, key);
      }
    }
  };
  walk(c.item, null);

  return {
    collection: {
      name: c.info.name,
      description: c.info.description ?? '',
    },
    folders,
    requests,
  };
}

// ---------- Export ----------

function draftToItem(draft: RequestDraft): PmV21Item {
  const headers: PmV21KV[] = draft.headers
    .filter((h) => h.key.trim().length > 0)
    .map((h) => ({ key: h.key, value: h.value, disabled: !h.enabled }));

  let body: PmV21RawBody | undefined;
  if (draft.bodyMode === 'raw-json') {
    body = { mode: 'raw', raw: draft.bodyRaw, options: { raw: { language: 'json' } } };
  } else if (draft.bodyMode === 'raw-text') {
    body = { mode: 'raw', raw: draft.bodyRaw };
  } else if (draft.bodyMode === 'form-url') {
    body = {
      mode: 'urlencoded',
      urlencoded: draft.bodyForm
        .filter((r) => r.key.length > 0)
        .map((r) => ({ key: r.key, value: r.value, disabled: !r.enabled })),
    };
  }

  const events: PmV21Item['event'] = [];
  if (draft.preScript && draft.preScript.trim().length > 0) {
    events.push({ listen: 'prerequest', script: { exec: draft.preScript.split('\n') } });
  }
  if (draft.testScript && draft.testScript.trim().length > 0) {
    events.push({ listen: 'test', script: { exec: draft.testScript.split('\n') } });
  }

  return {
    name: draft.name,
    request: {
      method: draft.method,
      url: draft.url,
      header: headers,
      body,
    },
    ...(events.length > 0 ? { event: events } : {}),
  };
}

export interface ExportInput {
  collection: Collection;
  folders: Folder[];
  requests: SavedRequest[];
}

export function exportPostmanCollection(input: ExportInput): PmV21Collection {
  const byFolder = new Map<string | null, SavedRequest[]>();
  for (const r of input.requests) {
    const key = r.folderId;
    const list = byFolder.get(key) ?? [];
    list.push(r);
    byFolder.set(key, list);
  }
  for (const list of byFolder.values()) list.sort((a, b) => a.order - b.order);

  const folderItems = new Map<string, PmV21Item>();
  for (const f of [...input.folders].sort((a, b) => a.order - b.order)) {
    folderItems.set(f.id, { name: f.name, item: [] });
  }
  // Nest folders and attach requests.
  for (const f of [...input.folders].sort((a, b) => a.order - b.order)) {
    const node = folderItems.get(f.id)!;
    const requests = (byFolder.get(f.id) ?? []).map((r) => draftToItem(r.draft));
    node.item = [...(node.item ?? []), ...requests];
    if (f.parentId) {
      const parent = folderItems.get(f.parentId);
      if (parent) parent.item = [...(parent.item ?? []), node];
    }
  }

  const rootFolders = [...input.folders]
    .filter((f) => f.parentId == null)
    .sort((a, b) => a.order - b.order)
    .map((f) => folderItems.get(f.id)!);
  const rootRequests = (byFolder.get(null) ?? []).map((r) => draftToItem(r.draft));

  return {
    info: {
      name: input.collection.name,
      description: input.collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [...rootFolders, ...rootRequests],
  };
}
