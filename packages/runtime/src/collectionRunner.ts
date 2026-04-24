import type {
  ProxyRequestPayload,
  ProxyResponsePayload,
  RequestDraft,
  TestResult,
} from '@postmanlike/shared';
import { buildProxyPayload, resolveDraft } from '@postmanlike/shared';
import { runPreRequest, runTests } from './runner.js';

export interface RunnerRequestResult {
  requestId: string;
  name: string;
  status?: number;
  timingMs?: number;
  tests: TestResult[];
  error?: string;
}

export interface RunnerSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  durationMs: number;
  results: RunnerRequestResult[];
}

export interface RunCollectionOptions {
  iterations?: number;
  delayMs?: number;
  stopOnFail?: boolean;
  onProgress?: (result: RunnerRequestResult, iteration: number) => void;
  send: (payload: ProxyRequestPayload) => Promise<ProxyResponsePayload>;
  readScopes: () => Promise<{ environment: Record<string, string>; globals: Record<string, string> }>;
  writeEnvPatch: (patch: Record<string, string>) => Promise<void>;
  writeGlobalsPatch: (patch: Record<string, string>) => Promise<void>;
}

export interface CollectionRequestItem {
  id: string;
  draft: RequestDraft;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export async function runCollection(
  items: CollectionRequestItem[],
  opts: RunCollectionOptions,
): Promise<RunnerSummary> {
  const started = Date.now();
  const iterations = Math.max(1, opts.iterations ?? 1);
  const delayMs = opts.delayMs ?? 0;
  const results: RunnerRequestResult[] = [];

  outer: for (let i = 0; i < iterations; i++) {
    for (const item of items) {
      const scopes = await opts.readScopes();
      const pre = runPreRequest(item.draft, scopes);
      if (Object.keys(pre.envPatch).length > 0) await opts.writeEnvPatch(pre.envPatch);
      if (Object.keys(pre.globalsPatch).length > 0) await opts.writeGlobalsPatch(pre.globalsPatch);
      if (pre.error) {
        const r: RunnerRequestResult = {
          requestId: item.id,
          name: item.draft.name,
          tests: [],
          error: `pre-request: ${pre.error.message}`,
        };
        results.push(r);
        opts.onProgress?.(r, i);
        if (opts.stopOnFail) break outer;
        continue;
      }

      const fresh = await opts.readScopes();
      const { draft: resolved } = resolveDraft(item.draft, {
        environment: fresh.environment,
        global: fresh.globals,
      });
      const payload = buildProxyPayload(resolved);

      let response: ProxyResponsePayload | null = null;
      let error: string | undefined;
      try {
        response = await opts.send(payload);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      let tests: TestResult[] = [];
      if (response) {
        const testOutcome = runTests(item.draft, response, {
          environment: fresh.environment,
          globals: fresh.globals,
        });
        tests = testOutcome.tests;
        if (testOutcome.error) {
          error = `test-script: ${testOutcome.error.message}`;
        }
      }

      const result: RunnerRequestResult = {
        requestId: item.id,
        name: item.draft.name,
        status: response?.status,
        timingMs: response?.timingMs,
        tests,
        error,
      };
      results.push(result);
      opts.onProgress?.(result, i);

      if (opts.stopOnFail && (error || tests.some((t) => !t.pass))) break outer;
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  const passed = results.reduce((n, r) => n + r.tests.filter((t) => t.pass).length, 0);
  const failed = results.reduce((n, r) => n + r.tests.filter((t) => !t.pass).length, 0);
  const errors = results.filter((r) => !!r.error).length;

  return {
    total: results.length,
    passed,
    failed,
    errors,
    durationMs: Date.now() - started,
    results,
  };
}
