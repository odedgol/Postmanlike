import { describe, it, expect } from 'vitest';
import { exportPostmanCollection, parsePostmanCollection } from './postman.js';
import type { Collection, Folder, RequestDraft, SavedRequest } from './types.js';

describe('parsePostmanCollection', () => {
  it('parses a minimal collection with one request', () => {
    const { collection, folders, requests } = parsePostmanCollection({
      info: { name: 'API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Ping',
          request: {
            method: 'GET',
            url: 'https://api.example.com/ping',
            header: [{ key: 'Accept', value: 'application/json' }],
          },
        },
      ],
    });
    expect(collection.name).toBe('API');
    expect(folders).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0].draft.name).toBe('Ping');
    expect(requests[0].draft.method).toBe('GET');
    expect(requests[0].draft.headers[0]).toMatchObject({ key: 'Accept', value: 'application/json' });
  });

  it('recurses into folders and preserves parent linkage via _folderKey', () => {
    const { folders, requests } = parsePostmanCollection({
      info: { name: 'C' },
      item: [
        {
          name: 'Outer',
          item: [
            {
              name: 'GetThing',
              request: { method: 'GET', url: 'https://x.test/1' },
            },
            {
              name: 'Inner',
              item: [{ name: 'GetOther', request: { method: 'GET', url: 'https://x.test/2' } }],
            },
          ],
        },
      ],
    });
    expect(folders.map((f) => f.name)).toEqual(['Outer', 'Inner']);
    expect(requests).toHaveLength(2);
    // Request under Inner references the Inner folder's _key.
    const innerKey = folders.find((f) => f.name === 'Inner')!._key;
    expect(requests[1]._folderKey).toBe(innerKey);
  });

  it('maps raw/json, raw/text, and urlencoded bodies', () => {
    const { requests } = parsePostmanCollection({
      info: { name: 'C' },
      item: [
        {
          name: 'A',
          request: {
            method: 'POST',
            url: 'https://x.test',
            body: { mode: 'raw', raw: '{}', options: { raw: { language: 'json' } } },
          },
        },
        {
          name: 'B',
          request: { method: 'POST', url: 'https://x.test', body: { mode: 'raw', raw: 'hi' } },
        },
        {
          name: 'C',
          request: {
            method: 'POST',
            url: 'https://x.test',
            body: { mode: 'urlencoded', urlencoded: [{ key: 'a', value: '1' }] },
          },
        },
      ],
    });
    expect(requests[0].draft.bodyMode).toBe('raw-json');
    expect(requests[1].draft.bodyMode).toBe('raw-text');
    expect(requests[2].draft.bodyMode).toBe('form-url');
    expect(requests[2].draft.bodyForm[0]).toMatchObject({ key: 'a', value: '1', enabled: true });
  });

  it('imports pre-request and test scripts', () => {
    const { requests } = parsePostmanCollection({
      info: { name: 'C' },
      item: [
        {
          name: 'A',
          request: { method: 'GET', url: 'https://x.test' },
          event: [
            { listen: 'prerequest', script: { exec: ['console.log("pre")'] } },
            { listen: 'test', script: { exec: 'console.log("post")' } },
          ],
        },
      ],
    });
    expect(requests[0].draft.preScript).toBe('console.log("pre")');
    expect(requests[0].draft.testScript).toBe('console.log("post")');
  });

  it('throws on missing info.name', () => {
    expect(() => parsePostmanCollection({ item: [] })).toThrow(/info.name/);
  });
});

describe('exportPostmanCollection', () => {
  const baseCollection = (over: Partial<Collection> = {}): Collection => ({
    id: 'c1',
    name: 'My API',
    description: '',
    order: 0,
    ...over,
  });

  const baseDraft = (over: Partial<RequestDraft> = {}): RequestDraft => ({
    id: 'r',
    name: 'Req',
    method: 'GET',
    url: 'https://x.test',
    params: [],
    headers: [],
    bodyMode: 'none',
    bodyRaw: '',
    bodyForm: [],
    ...over,
  });

  it('exports a flat collection to v2.1 shape', () => {
    const out = exportPostmanCollection({
      collection: baseCollection(),
      folders: [],
      requests: [
        {
          id: 'r1',
          collectionId: 'c1',
          folderId: null,
          order: 0,
          draft: baseDraft({ name: 'Ping', method: 'GET' }),
        } satisfies SavedRequest,
      ],
    });
    expect(out.info?.name).toBe('My API');
    expect(out.info?.schema).toContain('v2.1.0');
    expect(out.item?.[0].name).toBe('Ping');
    expect(out.item?.[0].request?.method).toBe('GET');
  });

  it('round-trips a request with headers, json body, and scripts', () => {
    const exported = exportPostmanCollection({
      collection: baseCollection(),
      folders: [],
      requests: [
        {
          id: 'r1',
          collectionId: 'c1',
          folderId: null,
          order: 0,
          draft: baseDraft({
            name: 'Create',
            method: 'POST',
            headers: [{ key: 'Authorization', value: 'Bearer x', enabled: true }],
            bodyMode: 'raw-json',
            bodyRaw: '{"a":1}',
            preScript: 'console.log(1)',
            testScript: 'pm.test("ok", () => {})',
          }),
        } satisfies SavedRequest,
      ],
    });
    const { requests } = parsePostmanCollection(exported);
    expect(requests[0].draft.method).toBe('POST');
    expect(requests[0].draft.bodyMode).toBe('raw-json');
    expect(requests[0].draft.bodyRaw).toBe('{"a":1}');
    expect(requests[0].draft.preScript).toContain('console.log(1)');
    expect(requests[0].draft.testScript).toContain('pm.test');
    expect(requests[0].draft.headers[0]).toMatchObject({ key: 'Authorization', enabled: true });
  });

  it('nests folders and preserves order', () => {
    const folders: Folder[] = [
      { id: 'f1', collectionId: 'c1', parentId: null, name: 'Outer', order: 0 },
      { id: 'f2', collectionId: 'c1', parentId: 'f1', name: 'Inner', order: 0 },
    ];
    const out = exportPostmanCollection({
      collection: baseCollection(),
      folders,
      requests: [
        {
          id: 'r',
          collectionId: 'c1',
          folderId: 'f2',
          order: 0,
          draft: baseDraft({ name: 'Leaf' }),
        },
      ],
    });
    const outer = out.item?.[0];
    expect(outer?.name).toBe('Outer');
    const inner = outer?.item?.[0];
    expect(inner?.name).toBe('Inner');
    expect(inner?.item?.[0].name).toBe('Leaf');
  });
});
