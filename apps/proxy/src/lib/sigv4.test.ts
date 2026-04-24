import { describe, it, expect } from 'vitest';
import { signRequest } from './sigv4.js';

describe('signRequest (AWS SigV4)', () => {
  const auth = {
    type: 'aws-sigv4' as const,
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
    service: 'service',
  };

  it('produces a canonical SigV4 Authorization header', () => {
    const result = signRequest(
      { method: 'GET', url: 'https://example.amazonaws.com/path/to/thing', headers: {} },
      auth,
      new Date('2020-01-02T03:04:05Z'),
    );
    expect(result.headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20200102\/us-east-1\/service\/aws4_request, SignedHeaders=[^,]+, Signature=[0-9a-f]{64}$/,
    );
    expect(result.headers['X-Amz-Date']).toBe('20200102T030405Z');
    expect(result.headers['X-Amz-Content-Sha256']).toMatch(/^[0-9a-f]{64}$/);
    expect(result.headers.Host).toBe('example.amazonaws.com');
  });

  it('includes session token in signed headers when provided', () => {
    const result = signRequest(
      { method: 'GET', url: 'https://example.amazonaws.com/', headers: {} },
      { ...auth, sessionToken: 'tok' },
      new Date('2020-01-02T03:04:05Z'),
    );
    expect(result.headers['X-Amz-Security-Token']).toBe('tok');
    expect(result.headers.Authorization).toContain('x-amz-security-token');
  });

  it('signs the body hash so modifying the body invalidates the signature', () => {
    const a = signRequest(
      { method: 'POST', url: 'https://x.amazonaws.com/', headers: {}, body: 'a' },
      auth,
      new Date('2020-01-02T03:04:05Z'),
    );
    const b = signRequest(
      { method: 'POST', url: 'https://x.amazonaws.com/', headers: {}, body: 'b' },
      auth,
      new Date('2020-01-02T03:04:05Z'),
    );
    expect(a.headers.Authorization).not.toBe(b.headers.Authorization);
  });

  it('is deterministic for a fixed instant and input', () => {
    const fixed = new Date('2020-01-02T03:04:05Z');
    const a = signRequest({ method: 'GET', url: 'https://x.amazonaws.com/y', headers: {} }, auth, fixed);
    const b = signRequest({ method: 'GET', url: 'https://x.amazonaws.com/y', headers: {} }, auth, fixed);
    expect(a.headers.Authorization).toBe(b.headers.Authorization);
  });
});
