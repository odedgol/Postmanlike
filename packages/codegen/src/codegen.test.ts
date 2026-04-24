import { describe, it, expect } from 'vitest';
import { LANGUAGES, toAxios, toCurl, toFetch, toPython } from './index.js';
import type { RequestDraft } from '@postmanlike/shared';

const draft = (over: Partial<RequestDraft> = {}): RequestDraft => ({
  id: 'r',
  name: 'R',
  method: 'POST',
  url: 'https://api.example.com/users',
  params: [{ key: 'role', value: 'admin', enabled: true }],
  headers: [{ key: 'Authorization', value: 'Bearer xyz', enabled: true }],
  bodyMode: 'raw-json',
  bodyRaw: '{"name":"alice"}',
  bodyForm: [],
  ...over,
});

describe('codegen — shared normalization', () => {
  it('adds JSON body and default Content-Type when missing', () => {
    const code = toFetch(draft());
    expect(code).toContain('"Content-Type": "application/json"');
    expect(code).toContain('body: "{\\"name\\":\\"alice\\"}"');
  });

  it('folds query params into the URL before emitting', () => {
    const code = toCurl(draft());
    expect(code).toContain('role=admin');
    expect(code).not.toContain('params');
  });
});

describe('toCurl', () => {
  it('emits a multi-line cURL command with headers and --data', () => {
    const code = toCurl(draft());
    expect(code).toMatch(/curl -X POST 'https:\/\/api.example.com\/users\?role=admin'/);
    expect(code).toContain(`-H 'Authorization: Bearer xyz'`);
    expect(code).toContain(`--data '{"name":"alice"}'`);
  });

  it('omits --data for GET even when body fields are present', () => {
    const code = toCurl(draft({ method: 'GET', bodyMode: 'raw-json', bodyRaw: '{"x":1}' }));
    expect(code).not.toContain('--data');
  });
});

describe('toFetch', () => {
  it('returns valid-looking JS with fetch and body', () => {
    const code = toFetch(draft());
    expect(code).toContain('await fetch("https://api.example.com/users?role=admin"');
    expect(code).toContain('method: "POST"');
    expect(code).toContain('body: ');
  });
});

describe('toAxios', () => {
  it('uses lowercase method and data field', () => {
    const code = toAxios(draft());
    expect(code).toContain('method: "post"');
    expect(code).toContain('data: ');
  });
});

describe('toPython', () => {
  it('imports requests and calls requests.request', () => {
    const code = toPython(draft());
    expect(code).toMatch(/^import requests/);
    expect(code).toContain('requests.request(');
    expect(code).toContain('method="POST"');
  });
});

describe('LANGUAGES', () => {
  it('lists five languages, each renders to a non-empty string', () => {
    expect(LANGUAGES.map((l) => l.id)).toEqual([
      'curl',
      'fetch',
      'axios',
      'node-fetch',
      'python',
    ]);
    for (const lang of LANGUAGES) {
      expect(lang.render(draft()).length).toBeGreaterThan(20);
    }
  });
});
