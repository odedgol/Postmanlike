import {
  buildProxyPayload,
  resolveDraft,
  type FlowStep,
  type ProxyRequestPayload,
  type ProxyResponsePayload,
} from '@postmanlike/shared';

export interface FlowStepResult {
  id: string;
  kind: FlowStep['kind'];
  status?: number;
  timingMs?: number;
  output?: unknown;
  error?: string;
}

export interface FlowRunResult {
  results: FlowStepResult[];
  context: Record<string, unknown>;
  durationMs: number;
}

export interface RunFlowOptions {
  send: (payload: ProxyRequestPayload) => Promise<ProxyResponsePayload>;
  initialContext?: Record<string, unknown>;
  environment?: Record<string, string>;
  globals?: Record<string, string>;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function evalExpression(expression: string, context: Record<string, unknown>): unknown {
  const names = Object.keys(context);
  const values = names.map((n) => context[n]);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const fn = new Function(...names, 'ctx', `"use strict"; return (${expression});`);
  return fn(...values, context);
}

export async function runFlow(
  steps: FlowStep[],
  opts: RunFlowOptions,
): Promise<FlowRunResult> {
  const started = Date.now();
  const context: Record<string, unknown> = { ...(opts.initialContext ?? {}) };
  const results: FlowStepResult[] = [];

  for (const step of steps) {
    const started = Date.now();
    try {
      switch (step.kind) {
        case 'delay': {
          await sleep(step.ms);
          results.push({ id: step.id, kind: 'delay', timingMs: Date.now() - started });
          break;
        }
        case 'evaluate': {
          const output = evalExpression(step.expression, context);
          if (step.outputName) context[step.outputName] = output;
          results.push({
            id: step.id,
            kind: 'evaluate',
            output,
            timingMs: Date.now() - started,
          });
          break;
        }
        case 'request': {
          const { draft } = resolveDraft(step.draft, {
            environment: opts.environment ?? {},
            global: opts.globals ?? {},
          });
          const payload = buildProxyPayload(draft);
          const response = await opts.send(payload);
          let parsed: unknown = response.body;
          if (response.bodyEncoding === 'utf-8') {
            try {
              parsed = JSON.parse(response.body);
            } catch {
              parsed = response.body;
            }
          }
          const output = {
            status: response.status,
            body: parsed,
            headers: response.headers,
          };
          if (step.outputName) context[step.outputName] = output;
          results.push({
            id: step.id,
            kind: 'request',
            status: response.status,
            timingMs: response.timingMs,
            output,
          });
          break;
        }
      }
    } catch (err) {
      results.push({
        id: step.id,
        kind: step.kind,
        timingMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      break; // abort on first error
    }
  }

  return { results, context, durationMs: Date.now() - started };
}
