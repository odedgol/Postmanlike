import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeProxyRequest } from './execute.js';

describe('executeProxyRequest', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('rejects an invalid URL with a descriptive error', async () => {
    await expect(
      executeProxyRequest({ method: 'GET', url: 'not-a-url' }),
    ).rejects.toThrow(/Invalid URL/);
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(
      executeProxyRequest({ method: 'GET', url: 'ftp://example.com' }),
    ).rejects.toThrow(/Unsupported protocol/);
  });

  it('passes through method, headers, and JSON body, and returns utf-8 text', async () => {
    const captured: { url?: string; init?: RequestInit } = {};
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      captured.url = url;
      captured.init = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const result = await executeProxyRequest({
      method: 'post',
      url: 'https://example.com/api',
      headers: { 'x-test': '1', authorization: 'Bearer t' },
      body: { hello: 'world' },
    });

    expect(captured.url).toBe('https://example.com/api');
    expect(captured.init?.method).toBe('POST');
    const h = captured.init?.headers as Headers;
    expect(h.get('x-test')).toBe('1');
    expect(h.get('authorization')).toBe('Bearer t');
    expect(captured.init?.body).toBe('{"hello":"world"}');

    expect(result.status).toBe(201);
    expect(result.statusText).toBe('Created');
    expect(result.bodyEncoding).toBe('utf-8');
    expect(JSON.parse(result.body)).toEqual({ ok: true });
    expect(result.headers['content-type']).toBe('application/json');
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.timingMs).toBeGreaterThanOrEqual(0);
  });

  it('base64-encodes binary responses', async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 255, 254]);
    globalThis.fetch = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    ) as unknown as typeof fetch;

    const result = await executeProxyRequest({ method: 'GET', url: 'https://x.test/img.png' });
    expect(result.bodyEncoding).toBe('base64');
    expect(Buffer.from(result.body, 'base64')).toEqual(Buffer.from(bytes));
  });

  it('omits body on GET and HEAD even if body is supplied', async () => {
    let seenBody: BodyInit | null | undefined;
    globalThis.fetch = vi.fn(async (_url, init) => {
      seenBody = init?.body;
      return new Response('ok', { status: 200 });
    }) as unknown as typeof fetch;

    await executeProxyRequest({
      method: 'GET',
      url: 'https://x.test',
      body: 'should-not-be-sent',
    });
    expect(seenBody).toBeUndefined();
  });
});
