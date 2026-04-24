import { describe, it, expect } from 'vitest';
import { runPreRequest, runTests } from './runner.js';
import type { ProxyResponsePayload, RequestDraft } from '@postmanlike/shared';

const draft = (overrides: Partial<RequestDraft> = {}): RequestDraft => ({
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
});

const okResponse = (overrides: Partial<ProxyResponsePayload> = {}): ProxyResponsePayload => ({
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ hello: 'world' }),
  bodyEncoding: 'utf-8',
  timingMs: 42,
  sizeBytes: 120,
  url: 'https://x.test',
  ...overrides,
});

describe('runPreRequest', () => {
  it('returns empty patches for an empty script', () => {
    const outcome = runPreRequest(draft(), { environment: {}, globals: {} });
    expect(outcome.envPatch).toEqual({});
    expect(outcome.globalsPatch).toEqual({});
    expect(outcome.consoleEntries).toEqual([]);
    expect(outcome.error).toBeUndefined();
  });

  it('captures pm.environment.set into envPatch', () => {
    const outcome = runPreRequest(
      draft({ preScript: 'pm.environment.set("token", "abc")' }),
      { environment: {}, globals: {} },
    );
    expect(outcome.envPatch).toEqual({ token: 'abc' });
  });

  it('captures pm.globals.set into globalsPatch', () => {
    const outcome = runPreRequest(
      draft({ preScript: 'pm.globals.set("traceId", "t-1")' }),
      { environment: {}, globals: {} },
    );
    expect(outcome.globalsPatch).toEqual({ traceId: 't-1' });
  });

  it('exposes pm.variables.get for reading any scope', () => {
    const outcome = runPreRequest(
      draft({ preScript: 'pm.environment.set("out", pm.variables.get("in"))' }),
      { environment: { in: 'hello' }, globals: {} },
    );
    expect(outcome.envPatch).toEqual({ out: 'hello' });
  });

  it('captures console.log output', () => {
    const outcome = runPreRequest(
      draft({ preScript: 'console.log("before", { x: 1 })' }),
      { environment: {}, globals: {} },
    );
    expect(outcome.consoleEntries).toHaveLength(1);
    expect(outcome.consoleEntries[0].args).toEqual(['before', '{"x":1}']);
    expect(outcome.consoleEntries[0].phase).toBe('pre-request');
  });

  it('reports script errors without losing prior patches', () => {
    const outcome = runPreRequest(
      draft({
        preScript: 'pm.environment.set("a", "1"); throw new Error("boom")',
      }),
      { environment: {}, globals: {} },
    );
    expect(outcome.envPatch).toEqual({ a: '1' });
    expect(outcome.error?.message).toBe('boom');
  });
});

describe('runTests', () => {
  it('returns empty tests for an empty script', () => {
    const outcome = runTests(draft(), okResponse(), { environment: {}, globals: {} });
    expect(outcome.tests).toEqual([]);
    expect(outcome.error).toBeUndefined();
  });

  it('runs pm.test with passing assertions', () => {
    const outcome = runTests(
      draft({
        testScript: `
          pm.test("status ok", () => pm.expect(pm.response.status).toBe(200));
          pm.test("body ok", () => pm.expect(pm.response.json().hello).toBe("world"));
        `,
      }),
      okResponse(),
      { environment: {}, globals: {} },
    );
    expect(outcome.tests.map((t) => [t.name, t.pass])).toEqual([
      ['status ok', true],
      ['body ok', true],
    ]);
  });

  it('records a failure with the assertion message', () => {
    const outcome = runTests(
      draft({
        testScript: 'pm.test("bad", () => pm.expect(pm.response.status).toBe(404))',
      }),
      okResponse(),
      { environment: {}, globals: {} },
    );
    expect(outcome.tests).toHaveLength(1);
    expect(outcome.tests[0].pass).toBe(false);
    expect(outcome.tests[0].message).toMatch(/expected 200 to be 404/);
  });

  it('script-level throw is reported as an error; prior tests preserved', () => {
    const outcome = runTests(
      draft({
        testScript: `
          pm.test("ok", () => pm.expect(1).toBe(1));
          throw new Error("fatal");
        `,
      }),
      okResponse(),
      { environment: {}, globals: {} },
    );
    expect(outcome.tests).toEqual([{ name: 'ok', pass: true }]);
    expect(outcome.error?.message).toBe('fatal');
  });

  it('pm.expect supports not, toEqual, toInclude, toBeTruthy', () => {
    const outcome = runTests(
      draft({
        testScript: `
          pm.test("not", () => pm.expect(1).not.toBe(2));
          pm.test("equal", () => pm.expect([1,2]).toEqual([1,2]));
          pm.test("include", () => pm.expect("hello world").toInclude("world"));
          pm.test("truthy", () => pm.expect("x").toBeTruthy());
        `,
      }),
      okResponse(),
      { environment: {}, globals: {} },
    );
    expect(outcome.tests.every((t) => t.pass)).toBe(true);
  });
});
