import { describe, it, expect } from 'vitest';
import {
  appendQueryParams,
  buildProxyPayload,
  formatBytes,
  formatMs,
  kvToRecord,
} from './serialize.js';
import type { RequestDraft } from './types.js';

const draft = (overrides: Partial<RequestDraft> = {}): RequestDraft => ({
  id: 'r1',
  name: 'Test',
  method: 'GET',
  url: 'https://example.com/api',
  params: [],
  headers: [],
  bodyMode: 'none',
  bodyRaw: '',
  bodyForm: [],
  ...overrides,
});

describe('kvToRecord', () => {
  it('skips disabled and empty-key rows', () => {
    expect(
      kvToRecord([
        { key: 'a', value: '1', enabled: true },
        { key: 'b', value: '2', enabled: false },
        { key: '', value: '3', enabled: true },
      ]),
    ).toEqual({ a: '1' });
  });
});

describe('appendQueryParams', () => {
  it('appends ? when no existing query', () => {
    expect(
      appendQueryParams('https://x.test/a', [{ key: 'q', value: 'hi', enabled: true }]),
    ).toBe('https://x.test/a?q=hi');
  });

  it('appends with & when existing query', () => {
    expect(
      appendQueryParams('https://x.test/a?x=1', [{ key: 'y', value: '2', enabled: true }]),
    ).toBe('https://x.test/a?x=1&y=2');
  });

  it('URL-encodes keys and values and preserves hash', () => {
    expect(
      appendQueryParams('https://x.test/a#section', [
        { key: 'a b', value: 'c&d', enabled: true },
      ]),
    ).toBe('https://x.test/a?a%20b=c%26d#section');
  });

  it('ignores disabled params', () => {
    expect(
      appendQueryParams('https://x.test/a', [
        { key: 'q', value: '1', enabled: false },
      ]),
    ).toBe('https://x.test/a');
  });
});

describe('buildProxyPayload', () => {
  it('auto-sets content-type for JSON body when missing', () => {
    const out = buildProxyPayload(
      draft({ method: 'POST', bodyMode: 'raw-json', bodyRaw: '{"a":1}' }),
    );
    expect(out.body).toBe('{"a":1}');
    expect(out.headers['Content-Type']).toBe('application/json');
  });

  it('does not overwrite an explicit content-type header', () => {
    const out = buildProxyPayload(
      draft({
        method: 'POST',
        bodyMode: 'raw-json',
        bodyRaw: '{}',
        headers: [{ key: 'Content-Type', value: 'application/vnd.api+json', enabled: true }],
      }),
    );
    expect(out.headers['Content-Type']).toBe('application/vnd.api+json');
  });

  it('encodes form-url body and sets content-type', () => {
    const out = buildProxyPayload(
      draft({
        method: 'POST',
        bodyMode: 'form-url',
        bodyForm: [
          { key: 'a', value: '1', enabled: true },
          { key: 'b', value: 'two words', enabled: true },
        ],
      }),
    );
    expect(out.body).toBe('a=1&b=two+words');
    expect(out.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('folds enabled query params into the URL', () => {
    const out = buildProxyPayload(
      draft({
        url: 'https://x.test/api',
        params: [
          { key: 'q', value: 'hi', enabled: true },
          { key: 'off', value: 'no', enabled: false },
        ],
      }),
    );
    expect(out.url).toBe('https://x.test/api?q=hi');
  });
});

describe('format helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });
  it('formats ms', () => {
    expect(formatMs(142)).toBe('142 ms');
    expect(formatMs(2500)).toBe('2.50 s');
  });
});
