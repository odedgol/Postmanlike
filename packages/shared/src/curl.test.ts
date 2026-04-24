import { describe, it, expect } from 'vitest';
import { parseCurl, tokenizeCurl } from './curl.js';

describe('tokenizeCurl', () => {
  it('honours single and double quotes', () => {
    expect(tokenizeCurl(`curl -H 'X-A: 1' -H "X-B: 2" https://x.test`)).toEqual([
      'curl',
      '-H',
      'X-A: 1',
      '-H',
      'X-B: 2',
      'https://x.test',
    ]);
  });

  it('merges lines joined with backslash', () => {
    expect(
      tokenizeCurl(`curl https://x.test \\\n  -H "X: 1" \\\n  -H "Y: 2"`),
    ).toEqual(['curl', 'https://x.test', '-H', 'X: 1', '-H', 'Y: 2']);
  });
});

describe('parseCurl', () => {
  it('parses a GET with headers and query', () => {
    const d = parseCurl(`curl -H 'Accept: application/json' https://api.example.com/users?q=abc`);
    expect(d.method).toBe('GET');
    expect(d.url).toBe('https://api.example.com/users');
    expect(d.params).toEqual([{ key: 'q', value: 'abc', enabled: true }]);
    expect(d.headers).toEqual([{ key: 'Accept', value: 'application/json', enabled: true }]);
    expect(d.bodyMode).toBe('none');
  });

  it('infers POST when --data is supplied', () => {
    const d = parseCurl(
      `curl -H "Content-Type: application/json" --data '{"a":1}' https://x.test/thing`,
    );
    expect(d.method).toBe('POST');
    expect(d.bodyMode).toBe('raw-json');
    expect(d.bodyRaw).toBe('{"a":1}');
  });

  it('keeps non-JSON data as raw-text', () => {
    const d = parseCurl(`curl --data 'hello=world' https://x.test`);
    expect(d.bodyMode).toBe('raw-text');
    expect(d.bodyRaw).toBe('hello=world');
  });

  it('respects an explicit -X method', () => {
    const d = parseCurl(`curl -X DELETE https://x.test/u/1`);
    expect(d.method).toBe('DELETE');
  });

  it('converts -u user:pass into a Basic Authorization header', () => {
    const d = parseCurl(`curl -u alice:s3cret https://x.test`);
    const auth = d.headers.find((h) => h.key.toLowerCase() === 'authorization');
    expect(auth?.value).toMatch(/^Basic /);
  });

  it('throws when no URL is present', () => {
    expect(() => parseCurl('curl -X GET')).toThrow(/URL/);
  });
});
