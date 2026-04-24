import { describe, it, expect } from 'vitest';
import { applyAuth, defaultAuthFor, mergeDraftAuthHeaders } from './auth.js';
import { buildProxyPayload } from './serialize.js';
import type { RequestDraft } from './types.js';

const draft = (over: Partial<RequestDraft> = {}): RequestDraft => ({
  id: 'r',
  name: 'R',
  method: 'GET',
  url: 'https://x.test/api',
  params: [],
  headers: [],
  bodyMode: 'none',
  bodyRaw: '',
  bodyForm: [],
  ...over,
});

describe('applyAuth', () => {
  it('none / undefined produces empty headers and params', () => {
    expect(applyAuth(undefined)).toEqual({ headers: {}, queryParams: [] });
    expect(applyAuth({ type: 'none' })).toEqual({ headers: {}, queryParams: [] });
  });

  it('bearer sets the Authorization header', () => {
    const out = applyAuth({ type: 'bearer', token: 'abc' });
    expect(out.headers).toEqual({ Authorization: 'Bearer abc' });
  });

  it('basic base64-encodes user:password', () => {
    const out = applyAuth({ type: 'basic', username: 'alice', password: 'secret' });
    expect(out.headers.Authorization).toBe(`Basic ${Buffer.from('alice:secret').toString('base64')}`);
  });

  it('api-key (header) sets a custom header', () => {
    const out = applyAuth({ type: 'api-key', key: 'X-Api-Key', value: 'k1', location: 'header' });
    expect(out.headers).toEqual({ 'X-Api-Key': 'k1' });
    expect(out.queryParams).toEqual([]);
  });

  it('api-key (query) returns a query param', () => {
    const out = applyAuth({ type: 'api-key', key: 'token', value: 't1', location: 'query' });
    expect(out.queryParams).toEqual([{ key: 'token', value: 't1', enabled: true }]);
  });

  it('aws-sigv4 defers to the proxy via serverAuth', () => {
    const auth = defaultAuthFor('aws-sigv4');
    const out = applyAuth(auth);
    expect(out.headers).toEqual({});
    expect(out.serverAuth).toEqual(auth);
  });
});

describe('buildProxyPayload with auth', () => {
  it('adds Bearer header onto the outgoing payload', () => {
    const out = buildProxyPayload(draft({ auth: { type: 'bearer', token: 't' } }));
    expect(out.headers.Authorization).toBe('Bearer t');
  });

  it('folds api-key query into the URL', () => {
    const out = buildProxyPayload(
      draft({ auth: { type: 'api-key', key: 'k', value: 'v', location: 'query' } }),
    );
    expect(out.url).toBe('https://x.test/api?k=v');
  });

  it('attaches auth on the payload for aws-sigv4 so the proxy can sign', () => {
    const out = buildProxyPayload(
      draft({
        auth: {
          type: 'aws-sigv4',
          accessKeyId: 'AKIA',
          secretAccessKey: 'secret',
          region: 'us-east-1',
          service: 'execute-api',
        },
      }),
    );
    expect(out.auth?.type).toBe('aws-sigv4');
  });
});

describe('mergeDraftAuthHeaders', () => {
  it('lets auth-generated headers win over the header table (same name)', () => {
    const out = mergeDraftAuthHeaders(
      draft({
        headers: [{ key: 'Authorization', value: 'old', enabled: true }],
        auth: { type: 'bearer', token: 'new' },
      }),
    );
    expect(out.Authorization).toBe('Bearer new');
  });
});
