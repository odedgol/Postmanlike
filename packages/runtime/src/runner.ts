import type {
  ConsoleEntry,
  PreScriptOutcome,
  ProxyResponsePayload,
  RequestDraft,
  TestScriptOutcome,
} from '@postmanlike/shared';
import { createPm } from './pm.js';

const BLANK = (s: string | undefined) => !s || s.trim().length === 0;

function compile(source: string): (pm: unknown, console: unknown) => void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  return new Function('pm', 'console', `"use strict";\n${source}\n`) as (
    pm: unknown,
    console: unknown,
  ) => void;
}

function errorObject(err: unknown) {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return { message: String(err) };
}

export function runPreRequest(
  draft: RequestDraft,
  scopes: { environment: Record<string, string>; globals: Record<string, string> },
): PreScriptOutcome {
  if (BLANK(draft.preScript)) {
    return { envPatch: {}, globalsPatch: {}, consoleEntries: [] };
  }
  const runtime = createPm({
    environment: scopes.environment,
    globals: scopes.globals,
    request: draft,
  });
  const scriptConsole = runtime.consoleCapture.makeConsole('pre-request');
  try {
    compile(draft.preScript!)(runtime.pm, scriptConsole);
    return {
      envPatch: runtime.environmentPatch,
      globalsPatch: runtime.globalsPatch,
      consoleEntries: runtime.consoleCapture.entries,
    };
  } catch (err) {
    return {
      envPatch: runtime.environmentPatch,
      globalsPatch: runtime.globalsPatch,
      consoleEntries: runtime.consoleCapture.entries,
      error: errorObject(err),
    };
  }
}

export function runTests(
  draft: RequestDraft,
  response: ProxyResponsePayload,
  scopes: { environment: Record<string, string>; globals: Record<string, string> },
): TestScriptOutcome {
  if (BLANK(draft.testScript)) {
    return { tests: [], consoleEntries: [] };
  }
  const runtime = createPm({
    environment: scopes.environment,
    globals: scopes.globals,
    request: draft,
    response,
  });
  const scriptConsole = runtime.consoleCapture.makeConsole('test');
  try {
    compile(draft.testScript!)(runtime.pm, scriptConsole);
    return { tests: runtime.tests, consoleEntries: runtime.consoleCapture.entries };
  } catch (err) {
    return {
      tests: runtime.tests,
      consoleEntries: runtime.consoleCapture.entries,
      error: errorObject(err),
    };
  }
}

export function combineConsole(...lists: ConsoleEntry[][]): ConsoleEntry[] {
  return ([] as ConsoleEntry[]).concat(...lists).sort((a, b) => a.timestamp - b.timestamp);
}
