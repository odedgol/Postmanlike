import type {
  ConsoleEntry,
  ConsoleLevel,
  RequestDraft,
  ProxyResponsePayload,
  TestResult,
} from '@postmanlike/shared';
import { createExpect, type Expectation } from './expect.js';

export interface ScopeBag {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  unset(name: string): void;
  has(name: string): boolean;
  toObject(): Record<string, string>;
}

function makeBag(initial: Record<string, string>): ScopeBag & { patch: Record<string, string> } {
  const values: Record<string, string> = { ...initial };
  const patch: Record<string, string> = {};
  return {
    patch,
    get(name) {
      return values[name];
    },
    set(name, value) {
      values[name] = value;
      patch[name] = value;
    },
    unset(name) {
      delete values[name];
      patch[name] = '';
    },
    has(name) {
      return Object.prototype.hasOwnProperty.call(values, name);
    },
    toObject() {
      return { ...values };
    },
  };
}

export interface PmRequestView {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface PmResponseView {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timingMs: number;
  sizeBytes: number;
  text(): string;
  json<T = unknown>(): T;
}

export interface Pm {
  environment: ScopeBag;
  globals: ScopeBag;
  variables: { get(name: string): string | undefined };
  request: PmRequestView;
  response?: PmResponseView;
  test(name: string, fn: () => void): void;
  expect(actual: unknown): Expectation;
}

export interface PmRuntime {
  pm: Pm;
  environmentPatch: Record<string, string>;
  globalsPatch: Record<string, string>;
  tests: TestResult[];
  consoleCapture: ConsoleCapture;
  sandboxConsole: PmConsole;
}

export interface PmConsole {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface ConsoleCapture {
  entries: ConsoleEntry[];
  makeConsole(phase: ConsoleEntry['phase']): PmConsole;
}

function stringifyArg(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function createConsoleCapture(): ConsoleCapture {
  const entries: ConsoleEntry[] = [];
  const push = (phase: ConsoleEntry['phase'], level: ConsoleLevel, args: unknown[]) => {
    entries.push({
      id: `c${entries.length}-${Date.now()}`,
      timestamp: Date.now(),
      level,
      phase,
      args: args.map(stringifyArg),
    });
  };
  return {
    entries,
    makeConsole(phase) {
      return {
        log: (...a) => push(phase, 'log', a),
        info: (...a) => push(phase, 'info', a),
        warn: (...a) => push(phase, 'warn', a),
        error: (...a) => push(phase, 'error', a),
      };
    },
  };
}

export interface CreatePmOptions {
  environment: Record<string, string>;
  globals: Record<string, string>;
  request: RequestDraft;
  response?: ProxyResponsePayload;
}

export function createPm(opts: CreatePmOptions): PmRuntime {
  const envBag = makeBag(opts.environment);
  const globalsBag = makeBag(opts.globals);
  const tests: TestResult[] = [];

  const request: PmRequestView = {
    method: opts.request.method,
    url: opts.request.url,
    headers: keyValuesToRecord(opts.request.headers),
    body: opts.request.bodyRaw ?? '',
  };

  let response: PmResponseView | undefined;
  if (opts.response) {
    const body = opts.response.bodyEncoding === 'utf-8' ? opts.response.body : '';
    response = {
      status: opts.response.status,
      statusText: opts.response.statusText,
      headers: { ...opts.response.headers },
      timingMs: opts.response.timingMs,
      sizeBytes: opts.response.sizeBytes,
      text() {
        return body;
      },
      json<T>() {
        return JSON.parse(body) as T;
      },
    };
  }

  const pm: Pm = {
    environment: envBag,
    globals: globalsBag,
    variables: {
      get(name) {
        return envBag.get(name) ?? globalsBag.get(name);
      },
    },
    request,
    response,
    test(name: string, fn: () => void) {
      try {
        fn();
        tests.push({ name, pass: true });
      } catch (err) {
        tests.push({
          name,
          pass: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    expect(actual) {
      return createExpect(actual);
    },
  };

  const consoleCapture = createConsoleCapture();

  return {
    pm,
    environmentPatch: envBag.patch,
    globalsPatch: globalsBag.patch,
    tests,
    consoleCapture,
    sandboxConsole: consoleCapture.makeConsole('pre-request'),
  };
}

function keyValuesToRecord(rows: RequestDraft['headers']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.enabled && row.key.trim().length > 0) out[row.key] = row.value;
  }
  return out;
}
