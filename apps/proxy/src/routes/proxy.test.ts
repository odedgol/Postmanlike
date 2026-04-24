import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server.js';

describe('POST /proxy', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      new Response('{"pong":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns 400 without url', async () => {
    const res = await request(createApp()).post('/proxy').send({ method: 'GET' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/);
  });

  it('returns 400 without method', async () => {
    const res = await request(createApp()).post('/proxy').send({ url: 'https://x.test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/method/);
  });

  it('forwards a GET and returns parsed proxy response', async () => {
    const res = await request(createApp())
      .post('/proxy')
      .send({ method: 'GET', url: 'https://x.test/api' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(res.body.bodyEncoding).toBe('utf-8');
    expect(JSON.parse(res.body.body)).toEqual({ pong: true });
  });

  it('health endpoint reports ok', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
