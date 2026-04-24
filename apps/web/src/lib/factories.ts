import { nanoid } from 'nanoid';
import type { RequestDraft, KeyValue } from '@postmanlike/shared';

export function emptyRow(): KeyValue {
  return { key: '', value: '', enabled: true };
}

export function newRequestDraft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    id: nanoid(8),
    name: 'Untitled Request',
    method: 'GET',
    url: 'https://httpbin.org/get',
    params: [emptyRow()],
    headers: [emptyRow()],
    bodyMode: 'none',
    bodyRaw: '',
    bodyForm: [emptyRow()],
    ...overrides,
  };
}
