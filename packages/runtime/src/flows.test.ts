import { describe, it, expect, vi } from 'vitest';
import { runFlow } from './flows.js';
import type { FlowStep, RequestDraft } from '@postmanlike/shared';

function req(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    id: 'r',
    name: 'R',
    method: 'GET',
    url: 'https://x.test',
    params: [],
    headers: [],
    bodyMode: 'none',
    bodyRaw: '',
    bodyForm: [],
    ...overrides,
  };
}

const okJson = (data: unknown) =>
  ({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    bodyEncoding: 'utf-8' as const,
    timingMs: 5,
    sizeBytes: 20,
    url: 'https://x.test',
  });

describe('runFlow', () => {
  it('delay step sleeps (and returns a step result)', async () => {
    const { results } = await runFlow(
      [{ id: 's1', kind: 'delay', ms: 1 }],
      { send: vi.fn() as never },
    );
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('delay');
  });

  it('request step resolves variables and stores the output under outputName', async () => {
    const send = vi.fn(async (_p: unknown) => okJson({ token: 't-1' }));
    const steps: FlowStep[] = [
      { id: 's1', kind: 'request', outputName: 'login', draft: req({ url: '{{host}}/login' }) },
      {
        id: 's2',
        kind: 'evaluate',
        outputName: 'bearer',
        expression: '"Bearer " + login.body.token',
      },
    ];
    const { results, context } = await runFlow(steps, {
      send: send as never,
      environment: { host: 'https://api.example' },
    });
    expect(send).toHaveBeenCalledTimes(1);
    const called = send.mock.calls[0][0] as { url: string };
    expect(called.url).toBe('https://api.example/login');
    expect(results.map((r) => r.kind)).toEqual(['request', 'evaluate']);
    expect(context.bearer).toBe('Bearer t-1');
  });

  it('aborts on first error and reports the error', async () => {
    const send = vi.fn(async (_p: unknown) => okJson({ a: 1 }));
    const steps: FlowStep[] = [
      { id: 's1', kind: 'request', outputName: 'first', draft: req() },
      { id: 's2', kind: 'evaluate', outputName: 'x', expression: 'first.body.notHere.nope' },
      { id: 's3', kind: 'request', outputName: 'never', draft: req() },
    ];
    const { results } = await runFlow(steps, { send: send as never });
    expect(results).toHaveLength(2);
    expect(results[1].error).toMatch(/notHere|undefined/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('evaluate with no outputName still returns the computed output in the step result', async () => {
    const { results } = await runFlow(
      [{ id: 's', kind: 'evaluate', outputName: '', expression: '1 + 2' }],
      { send: vi.fn() as never },
    );
    expect(results[0].output).toBe(3);
  });
});
