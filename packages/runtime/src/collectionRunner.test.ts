import { describe, it, expect, vi } from 'vitest';
import { runCollection } from './collectionRunner.js';
import type { ProxyRequestPayload, ProxyResponsePayload, RequestDraft } from '@postmanlike/shared';

const draft = (over: Partial<RequestDraft> = {}): RequestDraft => ({
  id: 'r',
  name: 'R',
  method: 'GET',
  url: 'https://x.test',
  params: [],
  headers: [],
  bodyMode: 'none',
  bodyRaw: '',
  bodyForm: [],
  ...over,
});

function okResponse(status = 200): ProxyResponsePayload {
  return {
    status,
    statusText: 'OK',
    headers: {},
    body: '{}',
    bodyEncoding: 'utf-8',
    timingMs: 5,
    sizeBytes: 2,
    url: 'https://x.test',
  };
}

const baseOpts = (send: (p: ProxyRequestPayload) => Promise<ProxyResponsePayload>) => ({
  send,
  readScopes: async () => ({ environment: {}, globals: {} }),
  writeEnvPatch: vi.fn(async () => {}),
  writeGlobalsPatch: vi.fn(async () => {}),
});

describe('runCollection', () => {
  it('runs every request once and collects tests per request', async () => {
    const send = vi.fn(async () => okResponse(200));
    const summary = await runCollection(
      [
        {
          id: 'a',
          draft: draft({
            name: 'A',
            testScript: 'pm.test("status", () => pm.expect(pm.response.status).toBe(200))',
          }),
        },
        {
          id: 'b',
          draft: draft({
            name: 'B',
            testScript: 'pm.test("eq", () => pm.expect(1).toBe(1))',
          }),
        },
      ],
      baseOpts(send),
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.errors).toBe(0);
  });

  it('iterations repeats each request N times', async () => {
    const send = vi.fn(async () => okResponse());
    const summary = await runCollection(
      [{ id: 'a', draft: draft() }],
      { ...baseOpts(send), iterations: 3 },
    );
    expect(send).toHaveBeenCalledTimes(3);
    expect(summary.total).toBe(3);
  });

  it('stopOnFail aborts on first failing test', async () => {
    const send = vi.fn(async () => okResponse(500));
    const summary = await runCollection(
      [
        {
          id: 'a',
          draft: draft({ testScript: 'pm.test("x", () => pm.expect(pm.response.status).toBe(200))' }),
        },
        { id: 'b', draft: draft() },
      ],
      { ...baseOpts(send), stopOnFail: true },
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(summary.total).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it('pre-request patches propagate to subsequent requests via readScopes', async () => {
    const send = vi.fn(async (p: ProxyRequestPayload) => ({ ...okResponse(), url: p.url }));
    const envState: Record<string, string> = {};
    const summary = await runCollection(
      [
        {
          id: 'a',
          draft: draft({
            preScript: 'pm.environment.set("host", "https://api.example")',
          }),
        },
        {
          id: 'b',
          draft: draft({ url: '{{host}}/ping' }),
        },
      ],
      {
        send,
        readScopes: async () => ({ environment: { ...envState }, globals: {} }),
        writeEnvPatch: vi.fn(async (patch) => {
          Object.assign(envState, patch);
        }),
        writeGlobalsPatch: vi.fn(async () => {}),
      },
    );
    expect(summary.total).toBe(2);
    const secondCall = send.mock.calls[1][0];
    expect(secondCall.url).toBe('https://api.example/ping');
  });
});
