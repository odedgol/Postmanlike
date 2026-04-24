import { describe, it, expect } from 'vitest';
import { draftsEqual } from './equal.js';
import type { RequestDraft } from './types.js';

const base: RequestDraft = {
  id: 'a',
  name: 'R',
  method: 'GET',
  url: 'https://x.test',
  params: [],
  headers: [],
  bodyMode: 'none',
  bodyRaw: '',
  bodyForm: [],
};

describe('draftsEqual', () => {
  it('treats two structurally identical drafts as equal (id irrelevant)', () => {
    expect(draftsEqual(base, { ...base, id: 'b' })).toBe(true);
  });

  it('is false when method differs', () => {
    expect(draftsEqual(base, { ...base, method: 'POST' })).toBe(false);
  });

  it('is false when url differs', () => {
    expect(draftsEqual(base, { ...base, url: 'https://y.test' })).toBe(false);
  });

  it('ignores trailing empty key/value rows', () => {
    const withTrailing: RequestDraft = {
      ...base,
      headers: [
        { key: 'x', value: '1', enabled: true },
        { key: '', value: '', enabled: true },
      ],
    };
    const without: RequestDraft = {
      ...base,
      headers: [{ key: 'x', value: '1', enabled: true }],
    };
    expect(draftsEqual(withTrailing, without)).toBe(true);
  });

  it('detects a meaningful header change', () => {
    expect(
      draftsEqual(
        { ...base, headers: [{ key: 'a', value: '1', enabled: true }] },
        { ...base, headers: [{ key: 'a', value: '2', enabled: true }] },
      ),
    ).toBe(false);
  });

  it('detects body-mode or body-raw change', () => {
    expect(
      draftsEqual(
        { ...base, bodyMode: 'raw-json', bodyRaw: '{}' },
        { ...base, bodyMode: 'raw-json', bodyRaw: '{"a":1}' },
      ),
    ).toBe(false);
  });
});
